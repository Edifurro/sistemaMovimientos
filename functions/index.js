const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

const PRESTAMOS_COLLECTION = "prestamos";
const ADEUDOS_COLLECTION = "adeudosProductos";
const ESTADO_ABIERTO = "abierto";
const ESTADO_PENDIENTE_REVISION = "pendiente_revision";
const ESTADO_CERRADO = "cerrado";
const ESTADO_CERRADO_CON_ADEUDO = "cerrado_con_adeudo";
const TIME_ZONE = "America/Cancun";
const DIAS_REVISION = 3;

const AREA_LABELS = {
  OFICINA: "Oficina",
  BODEGA: "Bodega",
  SEGUNDO_PISO: "Segundo Piso",
};

const toNonNegativeInt = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number) ||
      !Number.isInteger(number) ||
      number < 0) {
    return fallback;
  }
  return number;
};

const normalizeArea = (value) => {
  const raw = String(value || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (raw === "BODEGA") return "BODEGA";
  if (raw === "SEGUNDO_PISO" || raw === "SEGUNDOPISO") return "SEGUNDO_PISO";
  return "OFICINA";
};

const formatFechaEnZona = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => {
    const part = parts.find((item) => item.type === type);
    return part ? part.value : undefined;
  };
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const addDaysToDateKey = (dateKey, days) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return null;
  const date = new Date(Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
  ));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const calcularPendienteDetalle = (item = {}) => {
  const total = Number(item.cantidad || 0);
  const resuelto = Number(item.cantidadDevuelta || 0) +
    Number(item.cantidadConsumida || 0) +
    Number(item.cantidadDevueltaComoEmpezado || 0) +
    Number(item.cantidadAdeudada || 0);
  return Math.max(0, total - resuelto);
};

const normalizeDetalle = (item = {}) => {
  const areaOrigen = normalizeArea(item.areaOrigen);
  return {
    ...item,
    productoId: item.productoId || "",
    productoNombre: item.productoNombre || item.nombre || "",
    nombre: item.nombre || item.productoNombre || "",
    areaOrigen,
    areaOrigenLabel: AREA_LABELS[areaOrigen] || areaOrigen,
    cantidad: toNonNegativeInt(item.cantidad),
    cantidadDevuelta: toNonNegativeInt(item.cantidadDevuelta),
    cantidadConsumida: toNonNegativeInt(item.cantidadConsumida),
    cantidadDevueltaComoEmpezado: toNonNegativeInt(
        item.cantidadDevueltaComoEmpezado,
    ),
    cantidadAdeudada: toNonNegativeInt(item.cantidadAdeudada),
  };
};

const safeDocId = (value) => String(value || "sin-id")
    .replace(/[/#?[\]]+/g, "-")
    .slice(0, 240);

const marcarPrestamoParaRevision = async (prestamoId, fechaCorte) => {
  const prestamoRef = db.collection(PRESTAMOS_COLLECTION).doc(prestamoId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(prestamoRef);
    if (!snapshot.exists) return "missing";

    const prestamo = snapshot.data();
    if (![ESTADO_ABIERTO, "activo"].includes(prestamo.estado)) {
      return "skipped";
    }
    if (!prestamo.fechaOperativa ||
        prestamo.fechaOperativa >= fechaCorte) {
      return "skipped";
    }

    const detalles = (prestamo.detalles || []).map(normalizeDetalle);
    const quedanPendientes = detalles.some(
        (item) => calcularPendienteDetalle(item) > 0,
    );
    if (!quedanPendientes) {
      const tieneAdeudo = detalles.some(
          (item) => Number(item.cantidadAdeudada || 0) > 0,
      );
      transaction.update(prestamoRef, {
        detalles,
        estado: tieneAdeudo ?
          ESTADO_CERRADO_CON_ADEUDO :
          ESTADO_CERRADO,
        requiereRevision: false,
        observacionCierre: "Préstamo comprobado y cerrado al finalizar el día.",
        cerradoPermanentemente: true,
        cerradoAt: serverTimestamp(),
        cerradoPorUsuarioId: "system",
        cerradoPorUsuarioNombre: "Sistema",
        updatedAt: serverTimestamp(),
        updatedBy: "system",
        updatedByName: "Sistema",
      });
      return tieneAdeudo ? "closed_with_debt" : "closed";
    }

    const pendienteRevisionDesde =
      addDaysToDateKey(prestamo.fechaOperativa, 1);
    transaction.update(prestamoRef, {
      estado: ESTADO_PENDIENTE_REVISION,
      requiereRevision: true,
      pendienteRevisionDesde,
      revisionVenceEn: addDaysToDateKey(
          pendienteRevisionDesde,
          DIAS_REVISION,
      ),
      marcadoRevisionAt: serverTimestamp(),
      marcadoRevisionPor: "Sistema",
      updatedAt: serverTimestamp(),
      updatedBy: "system",
      updatedByName: "Sistema",
      vencido: true,
    });
    return "marked";
  });
};

const finalizarRevisionVencida = async (prestamoId, fechaCorte) => {
  const prestamoRef = db.collection(PRESTAMOS_COLLECTION).doc(prestamoId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(prestamoRef);
    if (!snapshot.exists) return "missing";

    const prestamo = {id: prestamoId, ...snapshot.data()};
    if (prestamo.estado !== ESTADO_PENDIENTE_REVISION) return "skipped";

    const revisionDesde = prestamo.pendienteRevisionDesde ||
      addDaysToDateKey(prestamo.fechaOperativa, 1);
    const revisionVenceEn = prestamo.revisionVenceEn ||
      addDaysToDateKey(revisionDesde, DIAS_REVISION);
    if (!revisionVenceEn || revisionVenceEn > fechaCorte) return "skipped";

    const adeudosMap = new Map();
    const historialDetalles = [];
    const detalles = (prestamo.detalles || []).map((rawItem) => {
      const item = normalizeDetalle(rawItem);
      const pendiente = calcularPendienteDetalle(item);
      if (pendiente <= 0) return item;

      const key = `${item.productoId}_${item.areaOrigen}`;
      const current = adeudosMap.get(key) || {
        item,
        cantidadAdeudada: 0,
        observaciones: [],
      };
      current.cantidadAdeudada += pendiente;
      current.observaciones.push(
          `Adeudo automático tras ${DIAS_REVISION} días en revisión ` +
          `(${AREA_LABELS[item.areaOrigen] || item.areaOrigen}).`,
      );
      adeudosMap.set(key, current);

      historialDetalles.push({
        productoId: item.productoId,
        productoNombre: item.productoNombre || item.nombre,
        areaOrigen: item.areaOrigen,
        areaOrigenLabel: AREA_LABELS[item.areaOrigen] || item.areaOrigen,
        cantidadDevuelta: 0,
        cantidadConsumida: 0,
        cantidadDevueltaComoEmpezado: 0,
        cantidadAdeudada: pendiente,
        comentarioAdeudo:
          current.observaciones[current.observaciones.length - 1],
        generadoAutomaticamente: true,
      });

      return {
        ...item,
        cantidadAdeudada: item.cantidadAdeudada + pendiente,
      };
    });

    const adeudos = Array.from(adeudosMap.values());
    const debtDocuments = [];
    for (const adeudo of adeudos) {
      const id = safeDocId(
          `${prestamoId}_${adeudo.item.productoId}_${adeudo.item.areaOrigen}`,
      );
      const ref = db.collection(ADEUDOS_COLLECTION).doc(id);
      const debtSnapshot = await transaction.get(ref);
      debtDocuments.push({adeudo, ref, debtSnapshot});
    }

    const nowIso = new Date().toISOString();
    for (const {adeudo, ref, debtSnapshot} of debtDocuments) {
      const observaciones = adeudo.observaciones.join("\n");
      const base = {
        colaboradorId: prestamo.colaboradorId || "",
        colaboradorNombre: prestamo.colaboradorNombre || "",
        productoId: adeudo.item.productoId,
        productoNombre:
          adeudo.item.productoNombre || adeudo.item.nombre || "",
        areaOrigen: adeudo.item.areaOrigen,
        areaOrigenLabel:
          AREA_LABELS[adeudo.item.areaOrigen] || adeudo.item.areaOrigen,
        prestamoId,
        fechaOperativa: prestamo.fechaOperativa,
        tipoOperacion: "PRESTAMO",
        origen: "prestamo_diario",
      };

      if (debtSnapshot.exists) {
        const current = debtSnapshot.data();
        transaction.update(ref, {
          ...base,
          cantidadAdeudada:
            Number(current.cantidadAdeudada || 0) + adeudo.cantidadAdeudada,
          cantidadPendiente:
            Number(current.cantidadPendiente || 0) + adeudo.cantidadAdeudada,
          observaciones: [current.observaciones, observaciones]
              .filter(Boolean)
              .join("\n"),
          estado: "pendiente",
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(ref, {
          ...base,
          cantidadAdeudada: adeudo.cantidadAdeudada,
          cantidadSaldada: 0,
          cantidadPendiente: adeudo.cantidadAdeudada,
          observaciones,
          estado: "pendiente",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const tieneAdeudo = detalles.some(
        (item) => Number(item.cantidadAdeudada || 0) > 0,
    );
    const estado = tieneAdeudo ?
      ESTADO_CERRADO_CON_ADEUDO :
      ESTADO_CERRADO;
    transaction.update(prestamoRef, {
      detalles,
      estado,
      requiereRevision: false,
      revisionFinalizadaAt: serverTimestamp(),
      revisionFinalizadaPorUsuarioId: "system",
      revisionFinalizadaPorUsuarioNombre: "Sistema",
      observacionCierre: tieneAdeudo ?
        "Revisión vencida: artículos sin comprobar registrados como adeudo." :
        "Revisión finalizada automáticamente sin pendientes.",
      cerradoPermanentemente: true,
      cerradoAt: serverTimestamp(),
      cerradoPorUsuarioId: "system",
      cerradoPorUsuarioNombre: "Sistema",
      historialLiberaciones: adeudos.length ?
        [
          ...(prestamo.historialLiberaciones || []),
          {
            fecha: nowIso,
            usuarioId: "system",
            usuarioNombre: "Sistema",
            cierreDefinitivo: true,
            cierreAutomatico: true,
            detalles: historialDetalles,
          },
        ] :
        (prestamo.historialLiberaciones || []),
      updatedAt: serverTimestamp(),
      updatedBy: "system",
      updatedByName: "Sistema",
    });

    return tieneAdeudo ? "closed_with_debt" : "closed";
  });
};

exports.obtenerContextoOperativo = onCall(
    {region: "us-central1"},
    (request) => {
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes iniciar sesión para obtener la fecha operativa.",
        );
      }
      const now = new Date();
      return {
        fechaOperativa: formatFechaEnZona(now),
        nowIso: now.toISOString(),
        timeZone: TIME_ZONE,
      };
    },
);

exports.procesarCicloPrestamosDiarios = onSchedule(
    {
      schedule: "5 0 * * *",
      timeZone: TIME_ZONE,
      region: "us-central1",
      timeoutSeconds: 540,
      memory: "512MiB",
    },
    async () => {
      const fechaCorte = formatFechaEnZona();
      const stats = {
        abiertosEncontrados: 0,
        enviadosARevision: 0,
        revisionesEncontradas: 0,
        cerrados: 0,
        cerradosConAdeudo: 0,
        omitidos: 0,
        errores: 0,
      };

      const openSnapshot = await db
          .collection(PRESTAMOS_COLLECTION)
          .where("estado", "in", [ESTADO_ABIERTO, "activo"])
          .where("fechaOperativa", "<", fechaCorte)
          .get();
      const vencidos = openSnapshot.docs;
      stats.abiertosEncontrados = vencidos.length;

      for (const item of vencidos) {
        try {
          const result = await marcarPrestamoParaRevision(item.id, fechaCorte);
          if (result === "marked") stats.enviadosARevision += 1;
          else if (result === "closed_with_debt") stats.cerradosConAdeudo += 1;
          else if (result === "closed") stats.cerrados += 1;
          else stats.omitidos += 1;
        } catch (error) {
          stats.errores += 1;
          logger.error("No se pudo enviar el préstamo a revisión", {
            prestamoId: item.id,
            message: error.message,
            stack: error.stack,
          });
        }
      }

      const reviewSnapshot = await db
          .collection(PRESTAMOS_COLLECTION)
          .where("estado", "==", ESTADO_PENDIENTE_REVISION)
          .where("revisionVenceEn", "<=", fechaCorte)
          .get();
      const legacyReviewCutoff = addDaysToDateKey(
          fechaCorte,
          -(DIAS_REVISION + 1),
      );
      const legacyReviewSnapshot = await db
          .collection(PRESTAMOS_COLLECTION)
          .where("estado", "==", ESTADO_PENDIENTE_REVISION)
          .where("fechaOperativa", "<=", legacyReviewCutoff)
          .get();
      const reviewDocuments = new Map();
      for (const item of [
        ...reviewSnapshot.docs,
        ...legacyReviewSnapshot.docs,
      ]) {
        reviewDocuments.set(item.id, item);
      }
      const revisionesVencidas = Array.from(reviewDocuments.values());
      stats.revisionesEncontradas = revisionesVencidas.length;

      for (const item of revisionesVencidas) {
        try {
          const result = await finalizarRevisionVencida(item.id, fechaCorte);
          if (result === "closed_with_debt") stats.cerradosConAdeudo += 1;
          else if (result === "closed") stats.cerrados += 1;
          else stats.omitidos += 1;
        } catch (error) {
          stats.errores += 1;
          logger.error("No se pudo finalizar la revisión del préstamo", {
            prestamoId: item.id,
            message: error.message,
            stack: error.stack,
          });
        }
      }

      logger.info("Ciclo diario de préstamos finalizado", {
        fechaCorte,
        diasRevision: DIAS_REVISION,
        ...stats,
      });
      return stats;
    },
);
