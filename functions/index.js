const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()

const PRESTAMOS_COLLECTION = 'prestamos'
const ADEUDOS_COLLECTION = 'adeudosProductos'

const ESTADO_ABIERTO = 'abierto'
const ESTADO_CERRADO = 'cerrado'
const ESTADO_CERRADO_CON_ADEUDO = 'cerrado_con_adeudo'
const TIPO_PRESTAMO = 'PRESTAMO'
const TIME_ZONE = 'America/Cancun'

const AREA_LABELS = {
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  SEGUNDO_PISO: 'Segundo Piso'
}

const toNonNegativeInt = (value, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < 0) return fallback
  return number
}

const normalizeArea = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (raw === 'BODEGA') return 'BODEGA'
  if (raw === 'SEGUNDO_PISO' || raw === 'SEGUNDOPISO') return 'SEGUNDO_PISO'
  return 'OFICINA'
}

const normalizeCategoriaControl = (value) => {
  const raw = String(value || '').trim().toUpperCase()
  if (raw === 'FRACCIONABLE') return 'FRACCIONABLE'
  if (raw === 'HERRAMIENTA') return 'HERRAMIENTA'
  return 'UNIDAD'
}

const formatFechaOperativaEnZona = (date = new Date(), timeZone = TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const get = (type) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

const calcularPendienteDetalle = (item = {}) => {
  const total = Number(item.cantidad || 0)
  const devuelto = Number(item.cantidadDevuelta || 0)
  const consumido = Number(item.cantidadConsumida || 0)
  const devueltoComoEmpezado = Number(item.cantidadDevueltaComoEmpezado || 0)
  const adeudado = Number(item.cantidadAdeudada || 0)
  return Math.max(0, total - devuelto - consumido - devueltoComoEmpezado - adeudado)
}

const normalizeExistingDetalle = (item = {}) => {
  const areaOrigen = normalizeArea(item.areaOrigen)
  return {
    productoId: item.productoId || '',
    productoNombre: item.productoNombre || item.nombre || '',
    nombre: item.nombre || item.productoNombre || '',
    tipo: item.tipo === 'HERRAMIENTA' ? 'HERRAMIENTA' : 'RECURSO',
    categoriaControl: normalizeCategoriaControl(item.categoriaControl),
    areaOrigen,
    areaOrigenLabel: AREA_LABELS[areaOrigen] || areaOrigen,
    cantidad: toNonNegativeInt(item.cantidad),
    cantidadDesdeStockNuevo: toNonNegativeInt(item.cantidadDesdeStockNuevo),
    cantidadDesdeStockEmpezado: toNonNegativeInt(item.cantidadDesdeStockEmpezado),
    cantidadDevuelta: toNonNegativeInt(item.cantidadDevuelta),
    cantidadConsumida: toNonNegativeInt(item.cantidadConsumida),
    cantidadDevueltaComoEmpezado: toNonNegativeInt(item.cantidadDevueltaComoEmpezado),
    cantidadAdeudada: toNonNegativeInt(item.cantidadAdeudada),
    generaAdeudo: item.generaAdeudo !== false,
    observacion: String(item.observacion || '').trim()
  }
}

const safeDocId = (value) => String(value || 'sin-id')
  .replace(/[\/#?\[\]]+/g, '-')
  .slice(0, 240)

const buildAdeudoId = ({ prestamoId, productoId, areaOrigen }) => {
  return safeDocId(`${prestamoId}_${productoId}_${areaOrigen}`)
}

const cerrarPrestamoVencido = async (prestamoId, fechaCorte) => {
  const prestamoRef = db.collection(PRESTAMOS_COLLECTION).doc(prestamoId)
  const nowIso = new Date().toISOString()

  return db.runTransaction(async (transaction) => {
    const prestamoSnap = await transaction.get(prestamoRef)
    if (!prestamoSnap.exists) return { status: 'missing', prestamoId }

    const prestamoActual = { id: prestamoId, ...prestamoSnap.data() }

    if (prestamoActual.estado !== ESTADO_ABIERTO && prestamoActual.estado !== 'activo') {
      return { status: 'skipped_closed', prestamoId }
    }

    if (!prestamoActual.fechaOperativa || prestamoActual.fechaOperativa >= fechaCorte) {
      return { status: 'skipped_not_expired', prestamoId }
    }

    const adeudosMap = new Map()
    const historialDetalles = []
    let huboAdeudoAutomaticoPorCierre = false

    const detallesActualizados = (prestamoActual.detalles || []).map((rawItem) => {
      const item = normalizeExistingDetalle(rawItem)
      const pendiente = calcularPendienteDetalle(item)
      if (pendiente <= 0) return item

      const comentarioAdeudoAutomatico = `Adeudo generado automáticamente por caducidad del préstamo diario (${AREA_LABELS[item.areaOrigen] || item.areaOrigen}).`
      const mapKey = `${item.productoId}_${item.areaOrigen}`
      const current = adeudosMap.get(mapKey) || {
        item,
        cantidadAdeudada: 0,
        observaciones: []
      }

      current.cantidadAdeudada += pendiente
      current.observaciones.push(comentarioAdeudoAutomatico)
      adeudosMap.set(mapKey, current)

      historialDetalles.push({
        productoId: item.productoId,
        productoNombre: item.productoNombre || item.nombre,
        areaOrigen: item.areaOrigen,
        areaOrigenLabel: AREA_LABELS[item.areaOrigen] || item.areaOrigen,
        cantidadDevuelta: 0,
        comentarioDevuelto: '',
        cantidadConsumida: 0,
        comentarioConsumo: '',
        cantidadDevueltaComoEmpezado: 0,
        comentarioDevueltoComoEmpezado: '',
        cantidadAdeudada: pendiente,
        comentarioAdeudo: comentarioAdeudoAutomatico,
        generadoAutomaticamente: true,
        cierreAutomatico: true
      })

      huboAdeudoAutomaticoPorCierre = true
      return {
        ...item,
        cantidadAdeudada: Number(item.cantidadAdeudada || 0) + pendiente
      }
    })

    const adeudosAgrupados = Array.from(adeudosMap.values())
    const adeudosSnapshots = []

    // Firestore requiere que las lecturas de una transacción ocurran antes de las escrituras.
    for (const adeudo of adeudosAgrupados) {
      const adeudoId = buildAdeudoId({
        prestamoId,
        productoId: adeudo.item.productoId,
        areaOrigen: adeudo.item.areaOrigen
      })
      const adeudoRef = db.collection(ADEUDOS_COLLECTION).doc(adeudoId)
      const adeudoSnap = await transaction.get(adeudoRef)
      adeudosSnapshots.push({ adeudo, adeudoRef, adeudoSnap })
    }

    for (const { adeudo, adeudoRef, adeudoSnap } of adeudosSnapshots) {
      const observaciones = adeudo.observaciones.filter(Boolean).join('\n')
      const adeudoPayload = {
        colaboradorId: prestamoActual.colaboradorId || '',
        colaboradorNombre: prestamoActual.colaboradorNombre || '',
        productoId: adeudo.item.productoId,
        productoNombre: adeudo.item.productoNombre || adeudo.item.nombre || '',
        areaOrigen: adeudo.item.areaOrigen,
        areaOrigenLabel: AREA_LABELS[adeudo.item.areaOrigen] || adeudo.item.areaOrigen,
        prestamoId,
        fechaOperativa: prestamoActual.fechaOperativa,
        tipoOperacion: TIPO_PRESTAMO,
        origen: 'prestamo_diario'
      }

      if (adeudoSnap.exists) {
        const current = adeudoSnap.data()
        transaction.update(adeudoRef, {
          ...adeudoPayload,
          cantidadAdeudada: Number(current.cantidadAdeudada || 0) + adeudo.cantidadAdeudada,
          cantidadPendiente: Number(current.cantidadPendiente || 0) + adeudo.cantidadAdeudada,
          observaciones: [current.observaciones, observaciones].filter(Boolean).join('\n'),
          estado: 'pendiente',
          updatedAt: nowIso
        })
      } else {
        transaction.set(adeudoRef, {
          ...adeudoPayload,
          cantidadAdeudada: adeudo.cantidadAdeudada,
          cantidadSaldada: 0,
          cantidadPendiente: adeudo.cantidadAdeudada,
          observaciones,
          estado: 'pendiente',
          createdAt: nowIso,
          updatedAt: nowIso
        })
      }
    }

    const totalAdeudado = detallesActualizados.reduce((sum, item) => sum + Number(item.cantidadAdeudada || 0), 0)
    const nextEstado = totalAdeudado > 0 ? ESTADO_CERRADO_CON_ADEUDO : ESTADO_CERRADO

    transaction.update(prestamoRef, {
      detalles: detallesActualizados,
      estado: nextEstado,
      observacionCierre: huboAdeudoAutomaticoPorCierre
        ? 'Cierre definitivo: los pendientes se registraron como adeudo automáticamente.'
        : 'Cierre automático por caducidad del préstamo diario.',
      cerradoPermanentemente: true,
      cerradoAt: nowIso,
      cerradoPorUsuarioId: null,
      cerradoPorUsuarioNombre: 'Sistema',
      vencido: true,
      historialLiberaciones: [
        ...(prestamoActual.historialLiberaciones || []),
        {
          fecha: nowIso,
          usuarioId: null,
          usuarioNombre: 'Sistema',
          cierreDefinitivo: true,
          cierreAutomatico: true,
          detalles: historialDetalles
        }
      ],
      updatedAt: nowIso
    })

    return {
      status: 'closed',
      prestamoId,
      estado: nextEstado,
      adeudosGenerados: adeudosAgrupados.length
    }
  })
}

exports.cerrarPrestamosDiariosVencidos = onSchedule(
  {
    schedule: '5 0 * * *',
    timeZone: TIME_ZONE,
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB'
  },
  async () => {
    const fechaCorte = formatFechaOperativaEnZona(new Date(), TIME_ZONE)
    logger.info('Iniciando cierre automático de préstamos diarios vencidos', { fechaCorte, timeZone: TIME_ZONE })

    const snapshot = await db
      .collection(PRESTAMOS_COLLECTION)
      .where('estado', '==', ESTADO_ABIERTO)
      .get()

    const vencidos = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((prestamo) => prestamo.fechaOperativa && prestamo.fechaOperativa < fechaCorte)

    const results = {
      encontrados: vencidos.length,
      cerrados: 0,
      omitidos: 0,
      errores: 0
    }

    for (const prestamo of vencidos) {
      try {
        const result = await cerrarPrestamoVencido(prestamo.id, fechaCorte)
        if (result.status === 'closed') results.cerrados += 1
        else results.omitidos += 1
      } catch (error) {
        results.errores += 1
        logger.error('No se pudo cerrar préstamo vencido', {
          prestamoId: prestamo.id,
          message: error.message,
          stack: error.stack
        })
      }
    }

    logger.info('Cierre automático de préstamos diarios finalizado', results)
    return results
  }
)
