import { ref } from 'vue'
import { auth, db } from '../services/firebase'
import { formatOperationalDate, getOperationalContext } from '../services/operationalTime'
import {
  collection,
  getDocs,
  getDoc,
  getCountFromServer,
  doc,
  onSnapshot,
  runTransaction,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore'

const PRESTAMOS_COLLECTION = 'prestamos'
const PRODUCTS_COLLECTION = 'productos_nuevos'

const prestamos = ref([])
const prestamosSummary = ref({ abiertos: 0, pendientes: 0, cerrados: 0 })
const trabajos = ref([])
const loading = ref(false)
const error = ref(null)
let unsubscribePrestamos = null
let summaryRefreshTimer = null

const ESTADO_ABIERTO = 'abierto'
const ESTADO_PENDIENTE_REVISION = 'pendiente_revision'
const ESTADO_CERRADO = 'cerrado'
const ESTADO_CERRADO_CON_ADEUDO = 'cerrado_con_adeudo'
const TIPO_PRESTAMO = 'PRESTAMO'
const TIPO_ENTREGA_SIN_ADEUDO = 'ENTREGA_SIN_ADEUDO'

const AREAS_TALLER = ['OFICINA', 'BODEGA', 'SEGUNDO_PISO']
const AREA_LABELS = {
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  SEGUNDO_PISO: 'Segundo Piso'
}

const formatFechaOperativa = (date = new Date()) => formatOperationalDate(date)

const formatFechaLabel = (fechaOperativa) => {
  if (!fechaOperativa) return ''
  const date = new Date(`${fechaOperativa}T00:00:00`)
  if (Number.isNaN(date.getTime())) return fechaOperativa
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: '2-digit' })
}

const getEndOfDayIso = (fechaOperativa) => {
  const date = new Date(`${fechaOperativa || formatFechaOperativa()}T23:59:59.999-05:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const toInt = (value, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number) || !Number.isInteger(number)) return fallback
  return number
}

const toNonNegativeInt = (value, fallback = 0) => {
  const number = toInt(value, fallback)
  return number < 0 ? fallback : number
}

const normalizeCategoriaControl = (value) => {
  const raw = String(value || '').trim().toUpperCase()
  if (raw === 'FRACCIONABLE') return 'FRACCIONABLE'
  if (raw === 'HERRAMIENTA') return 'HERRAMIENTA'
  return 'UNIDAD'
}

const normalizeArea = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (raw === 'SEGUNDO_PISO' || raw === 'SEGUNDOPISO') return 'SEGUNDO_PISO'
  if (raw === 'BODEGA') return 'BODEGA'
  return 'OFICINA'
}

const assertAreaPrestamos = (area) => {
  const raw = String(area || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (!raw) return 'OFICINA'
  if (!['OFICINA', 'BODEGA', 'SEGUNDO_PISO', 'SEGUNDOPISO'].includes(raw)) {
    throw new Error('Área de préstamo inválida.')
  }
  const normalized = normalizeArea(raw)
  return normalized
}

const normalizeTipoOperacion = () => TIPO_PRESTAMO

const emptyStockPorArea = () => ['OFICINA', 'BODEGA', 'SEGUNDO_PISO'].reduce((acc, area) => {
  acc[area] = { stock: 0, stockEmpezado: 0 }
  return acc
}, {})

const normalizeStockPorArea = (producto = {}) => {
  const categoriaControl = normalizeCategoriaControl(producto.categoriaControl)
  const stockPorArea = emptyStockPorArea()

  if (producto.stockPorArea && typeof producto.stockPorArea === 'object') {
    for (const [rawArea, data] of Object.entries(producto.stockPorArea)) {
      const raw = String(rawArea || '').trim().toUpperCase().replace(/\s+/g, '_')
      const area = raw === 'SEGUNDO_PISO' || raw === 'SEGUNDOPISO' ? 'SEGUNDO_PISO' : normalizeArea(raw)
      stockPorArea[area] = {
        stock: toNonNegativeInt(data?.stock),
        stockEmpezado: categoriaControl === 'FRACCIONABLE' ? toNonNegativeInt(data?.stockEmpezado) : 0
      }
    }
  } else {
    stockPorArea.OFICINA = {
      stock: toNonNegativeInt(producto.stock),
      stockEmpezado: categoriaControl === 'FRACCIONABLE' ? toNonNegativeInt(producto.stockEmpezado) : 0
    }
  }

  if (categoriaControl !== 'FRACCIONABLE') {
    for (const area of Object.keys(stockPorArea)) stockPorArea[area].stockEmpezado = 0
  }

  return stockPorArea
}

const getTotalsFromStockPorArea = (stockPorArea = {}) => Object.keys(emptyStockPorArea()).reduce((totals, area) => {
  totals.stock += toNonNegativeInt(stockPorArea?.[area]?.stock)
  totals.stockEmpezado += toNonNegativeInt(stockPorArea?.[area]?.stockEmpezado)
  return totals
}, { stock: 0, stockEmpezado: 0 })

const buildSearchKey = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const slugify = (value, fallback = 'sin-dato') => {
  const slug = buildSearchKey(value).replace(/\s+/g, '-')
  return (slug || fallback).slice(0, 80)
}

const buildPrestamoId = ({ colaboradorId, fechaOperativa }) => {
  return `${slugify(colaboradorId, 'colaborador')}_${slugify(fechaOperativa, 'fecha')}`.slice(0, 180)
}

const calcularPendienteDetalle = (item) => {
  const total = Number(item.cantidad || 0)
  const devuelto = Number(item.cantidadDevuelta || 0)
  const consumido = Number(item.cantidadConsumida || 0)
  const devueltoComoEmpezado = Number(item.cantidadDevueltaComoEmpezado || 0)
  const adeudado = Number(item.cantidadAdeudada || 0)
  return Math.max(0, total - devuelto - consumido - devueltoComoEmpezado - adeudado)
}

const buildObservationEntry = (observacion = '', usuarioNombre = 'Usuario', nowIso = new Date().toISOString()) => {
  const clean = String(observacion || '').trim()
  if (!clean) return null
  const date = new Date(nowIso)
  const fecha = date.toLocaleString('es-MX', {
    timeZone: 'America/Cancun',
    dateStyle: 'short',
    timeStyle: 'short'
  })
  return {
    observacion: clean,
    usuarioNombre: usuarioNombre || 'Usuario',
    fecha: nowIso,
    texto: `[${fecha} · ${usuarioNombre || 'Usuario'}]\n${clean}`
  }
}

const appendObservation = (current = '', entry = null) => {
  if (!entry?.texto) return current || ''
  return current ? `${current}\n\n${entry.texto}` : entry.texto
}

const getAuthenticatedActor = async () => {
  const user = auth.currentUser
  if (!user?.uid) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')

  const profileSnapshot = await getDoc(doc(db, 'usuarios', user.uid))
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : {}
  return {
    id: user.uid,
    nombre: profile.nombre || profile.displayName || user.displayName || user.email || 'Usuario'
  }
}

const normalizeDetalleEntrada = (item, productoData = {}) => {
  const categoriaControl = normalizeCategoriaControl(item.categoriaControl || productoData.categoriaControl)
  const tipo = categoriaControl === 'HERRAMIENTA' ? 'HERRAMIENTA' : 'RECURSO'
  const areaOrigen = assertAreaPrestamos(item.areaOrigen)
  const cantidadDesdeStockNuevo = categoriaControl === 'FRACCIONABLE'
    ? toNonNegativeInt(item.cantidadDesdeStockNuevo)
    : toNonNegativeInt(item.cantidad)
  const cantidadDesdeStockEmpezado = categoriaControl === 'FRACCIONABLE'
    ? toNonNegativeInt(item.cantidadDesdeStockEmpezado)
    : 0
  const cantidad = categoriaControl === 'FRACCIONABLE'
    ? cantidadDesdeStockNuevo + cantidadDesdeStockEmpezado
    : toNonNegativeInt(item.cantidad)

  return {
    productoId: item.productoId,
    productoNombre: item.productoNombre || item.nombre || productoData.nombre || '',
    nombre: item.nombre || item.productoNombre || productoData.nombre || '',
    tipo,
    categoriaControl,
    areaOrigen,
    areaOrigenLabel: AREA_LABELS[areaOrigen],
    cantidad,
    cantidadDesdeStockNuevo,
    cantidadDesdeStockEmpezado,
    cantidadDevuelta: toNonNegativeInt(item.cantidadDevuelta),
    cantidadConsumida: toNonNegativeInt(item.cantidadConsumida),
    cantidadDevueltaComoEmpezado: toNonNegativeInt(item.cantidadDevueltaComoEmpezado),
    cantidadAdeudada: toNonNegativeInt(item.cantidadAdeudada),
    observacion: String(item.observacion || item.observacionEntrega || '').trim()
  }
}

const normalizeExistingDetalle = (item = {}) => {
  const areaOrigen = assertAreaPrestamos(item.areaOrigen)
  return {
    productoId: item.productoId,
    productoNombre: item.productoNombre || item.nombre || '',
    nombre: item.nombre || item.productoNombre || '',
    tipo: item.tipo === 'HERRAMIENTA' ? 'HERRAMIENTA' : 'RECURSO',
    categoriaControl: normalizeCategoriaControl(item.categoriaControl),
    areaOrigen,
    areaOrigenLabel: AREA_LABELS[areaOrigen],
    cantidad: toNonNegativeInt(item.cantidad),
    cantidadDesdeStockNuevo: toNonNegativeInt(item.cantidadDesdeStockNuevo),
    cantidadDesdeStockEmpezado: toNonNegativeInt(item.cantidadDesdeStockEmpezado),
    cantidadDevuelta: toNonNegativeInt(item.cantidadDevuelta),
    cantidadConsumida: toNonNegativeInt(item.cantidadConsumida),
    cantidadDevueltaComoEmpezado: toNonNegativeInt(item.cantidadDevueltaComoEmpezado),
    cantidadAdeudada: toNonNegativeInt(item.cantidadAdeudada),
    observacion: String(item.observacion || '').trim()
  }
}

const mergeDetalle = (existing, addition) => ({
  ...existing,
  productoNombre: addition.productoNombre || existing.productoNombre || existing.nombre,
  nombre: addition.nombre || existing.nombre || existing.productoNombre,
  tipo: addition.tipo,
  categoriaControl: addition.categoriaControl,
  areaOrigen: addition.areaOrigen || existing.areaOrigen || 'OFICINA',
  areaOrigenLabel: AREA_LABELS[addition.areaOrigen || existing.areaOrigen || 'OFICINA'],
  cantidad: Number(existing.cantidad || 0) + Number(addition.cantidad || 0),
  cantidadDesdeStockNuevo: Number(existing.cantidadDesdeStockNuevo || 0) + Number(addition.cantidadDesdeStockNuevo || 0),
  cantidadDesdeStockEmpezado: Number(existing.cantidadDesdeStockEmpezado || 0) + Number(addition.cantidadDesdeStockEmpezado || 0),
  cantidadDevuelta: Number(existing.cantidadDevuelta || 0),
  cantidadConsumida: Number(existing.cantidadConsumida || 0),
  cantidadDevueltaComoEmpezado: Number(existing.cantidadDevueltaComoEmpezado || 0),
  cantidadAdeudada: Number(existing.cantidadAdeudada || 0),
  observacion: [existing.observacion, addition.observacion].filter(Boolean).join('\n')
})

const toIsoDate = (value) => {
  if (value?.toDate) return value.toDate().toISOString()
  return value
}
const mapPrestamoDoc = (document) => {
  const data = document.data()
  return {
    id: document.id,
    ...data,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
    cerradoAt: toIsoDate(data.cerradoAt),
    marcadoRevisionAt: toIsoDate(data.marcadoRevisionAt),
    revisionFinalizadaAt: toIsoDate(data.revisionFinalizadaAt)
  }
}
const sortByUpdatedDesc = (items) => [...items].sort((a, b) => {
  const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime()
  const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime()
  return bDate - aDate
})

const buildPrestamosQuery = (filters = {}) => {
  const constraints = []
  const estados = Array.isArray(filters.estados)
    ? filters.estados.filter(Boolean)
    : filters.estado
      ? [filters.estado]
      : []

  if (estados.length === 1) constraints.push(where('estado', '==', estados[0]))
  if (estados.length > 1) constraints.push(where('estado', 'in', estados.slice(0, 10)))

  if (filters.fechaOperativa) {
    constraints.push(where('fechaOperativa', '==', filters.fechaOperativa))
  } else {
    if (filters.fechaInicio) constraints.push(where('fechaOperativa', '>=', filters.fechaInicio))
    if (filters.fechaFin) constraints.push(where('fechaOperativa', '<=', filters.fechaFin))
  }

  return query(collection(db, PRESTAMOS_COLLECTION), ...constraints)
}

const applyLocalPrestamosFilters = (items, filters = {}) => {
  let result = items
  if (filters.colaboradorId) {
    result = result.filter((prestamo) => prestamo.colaboradorId === filters.colaboradorId)
  }
  if (filters.areaOrigen) {
    const area = normalizeArea(filters.areaOrigen)
    result = result.filter((prestamo) => (
      prestamo.detalles || []
    ).some((detalle) => normalizeArea(detalle.areaOrigen) === area))
  }
  return sortByUpdatedDesc(result)
}

export function usePrestamos() {
  const createPrestamo = async (prestamoData = {}) => {
    loading.value = true
    error.value = null
    try {
      const actor = await getAuthenticatedActor()
      const operationalContext = await getOperationalContext()
      const { colaboradorId, detalles = [] } = prestamoData
      const fechaOperativa = operationalContext.fechaOperativa
      const tipoOperacion = TIPO_PRESTAMO

      if (!colaboradorId) throw new Error('Debes seleccionar un colaborador')
      if (!Array.isArray(detalles) || !detalles.length) throw new Error('Debes agregar al menos un producto al préstamo')

      const prestamoIdFinal = buildPrestamoId({ colaboradorId, fechaOperativa })
      const prestamoRef = doc(db, PRESTAMOS_COLLECTION, prestamoIdFinal)
      const nowIso = operationalContext.nowIso
      const observationEntry = buildObservationEntry(
        prestamoData.observaciones || prestamoData.observacionGeneral,
        actor.nombre,
        nowIso
      )

      await runTransaction(db, async (transaction) => {
        const prestamoSnap = await transaction.get(prestamoRef)

        const requestedByProduct = {}
        for (const rawItem of detalles) {
          if (!rawItem.productoId) throw new Error('Hay un item sin productoId en el detalle del préstamo')
          requestedByProduct[rawItem.productoId] = requestedByProduct[rawItem.productoId] || []
          requestedByProduct[rawItem.productoId].push(rawItem)
        }

        const productosData = {}
        for (const productoId of Object.keys(requestedByProduct)) {
          const productRef = doc(db, PRODUCTS_COLLECTION, productoId)
          const productSnap = await transaction.get(productRef)
          if (!productSnap.exists()) throw new Error('Uno de los productos seleccionados ya no existe')
          productosData[productoId] = { ref: productRef, data: productSnap.data() }
        }

        const additions = []
        const productAreaDelta = {}
        const movements = []

        for (const [productoId, rawItems] of Object.entries(requestedByProduct)) {
          const productInfo = productosData[productoId]
          for (const rawItem of rawItems) {
            const item = normalizeDetalleEntrada(rawItem, productInfo.data)
            if (item.cantidad <= 0) throw new Error(`Cantidad inválida para el producto ${item.nombre || productoId}`)

            if (item.categoriaControl === 'FRACCIONABLE' && item.cantidadDesdeStockNuevo <= 0 && item.cantidadDesdeStockEmpezado <= 0) {
              throw new Error(`Debes indicar stock nuevo o empezado para ${item.nombre}`)
            }

            additions.push(item)
            const deltaKey = `${productoId}__${item.areaOrigen}`
            productAreaDelta[deltaKey] = productAreaDelta[deltaKey] || {
              productoId,
              areaOrigen: item.areaOrigen,
              stock: 0,
              stockEmpezado: 0,
              item
            }
            productAreaDelta[deltaKey].stock += item.categoriaControl === 'FRACCIONABLE' ? item.cantidadDesdeStockNuevo : item.cantidad
            productAreaDelta[deltaKey].stockEmpezado += item.categoriaControl === 'FRACCIONABLE' ? item.cantidadDesdeStockEmpezado : 0

            movements.push({
              tipo: 'entrega',
              tipoOperacion,
              productoId,
              productoNombre: item.productoNombre || item.nombre,
              areaOrigen: item.areaOrigen,
              areaOrigenLabel: AREA_LABELS[item.areaOrigen],
              cantidad: item.cantidad,
              categoriaControl: item.categoriaControl,
              cantidadDesdeStockNuevo: item.cantidadDesdeStockNuevo,
              cantidadDesdeStockEmpezado: item.cantidadDesdeStockEmpezado,
              observacion: item.observacion || '',
              usuarioId: actor.id,
              usuarioNombre: actor.nombre,
              fecha: nowIso
            })
          }
        }

        const stockPorProductoActualizado = {}
        for (const delta of Object.values(productAreaDelta)) {
          const productInfo = productosData[delta.productoId]
          const producto = productInfo.data
          const stockPorArea = stockPorProductoActualizado[delta.productoId] || normalizeStockPorArea(producto)
          const areaStock = stockPorArea[delta.areaOrigen] || { stock: 0, stockEmpezado: 0 }

          if (delta.stock > areaStock.stock) {
            throw new Error(`Stock insuficiente para ${producto.nombre} en ${AREA_LABELS[delta.areaOrigen]}. Disponible: ${areaStock.stock}`)
          }
          if (delta.stockEmpezado > areaStock.stockEmpezado) {
            throw new Error(`Stock empezado insuficiente para ${producto.nombre} en ${AREA_LABELS[delta.areaOrigen]}. Disponible: ${areaStock.stockEmpezado}`)
          }

          areaStock.stock -= delta.stock
          areaStock.stockEmpezado -= delta.stockEmpezado
          stockPorArea[delta.areaOrigen] = areaStock
          stockPorProductoActualizado[delta.productoId] = stockPorArea
        }

        let currentData = null
        if (prestamoSnap.exists()) {
          currentData = prestamoSnap.data()
          if (currentData.estado !== ESTADO_ABIERTO && currentData.estado !== 'activo') {
            throw new Error('No se pueden agregar productos a un préstamo diario cerrado.')
          }
          if (currentData.fechaOperativa !== fechaOperativa) {
            throw new Error('Este préstamo no corresponde al día actual.')
          }
        } else {
          currentData = {
            tipoOperacion,
            colaboradorId,
            colaboradorNombre: prestamoData.colaboradorNombre || '',
            fechaOperativa,
            fechaLabel: formatFechaLabel(fechaOperativa),
            venceAl: getEndOfDayIso(fechaOperativa),
            estado: ESTADO_ABIERTO,
            observacionGeneral: '',
            observacionesGeneralesHistorial: [],
            detalles: [],
            movimientosPrestamo: [],
            historialLiberaciones: [],
            observacionCierre: '',
            cerradoPermanentemente: false,
            cerradoAt: null,
            cerradoPorUsuarioId: null,
            cerradoPorUsuarioNombre: null,
            createdBy: actor.id,
            createdByName: actor.nombre,
            createdAt: serverTimestamp()
          }
        }

        const mergedDetails = (currentData.detalles || []).map(normalizeExistingDetalle)
        for (const addition of additions) {
          const index = mergedDetails.findIndex((detail) => detail.productoId === addition.productoId && normalizeArea(detail.areaOrigen) === addition.areaOrigen)
          if (index >= 0) mergedDetails[index] = mergeDetalle(mergedDetails[index], addition)
          else mergedDetails.push({ ...addition, observacion: addition.observacion || '' })
        }

        for (const [productoId, stockPorArea] of Object.entries(stockPorProductoActualizado)) {
          const productInfo = productosData[productoId]
          const totals = getTotalsFromStockPorArea(stockPorArea)
          transaction.update(productInfo.ref, {
            stockPorArea,
            stock: totals.stock,
            stockEmpezado: normalizeCategoriaControl(productInfo.data.categoriaControl) === 'FRACCIONABLE' ? totals.stockEmpezado : 0,
            updatedAt: serverTimestamp()
          })
        }

        const observationHistory = observationEntry
          ? [...(currentData.observacionesGeneralesHistorial || []), {
            observacion: observationEntry.observacion,
            usuarioNombre: observationEntry.usuarioNombre,
            fecha: observationEntry.fecha
          }]
          : (currentData.observacionesGeneralesHistorial || [])

        transaction.set(prestamoRef, {
          ...currentData,
          colaboradorNombre: prestamoData.colaboradorNombre || currentData.colaboradorNombre || '',
          tipoOperacion,
          estado: ESTADO_ABIERTO,
          fechaOperativa,
          fechaLabel: formatFechaLabel(fechaOperativa),
          venceAl: getEndOfDayIso(fechaOperativa),
          detalles: mergedDetails,
          movimientosPrestamo: [...(currentData.movimientosPrestamo || []), ...movements],
          observacionGeneral: appendObservation(currentData.observacionGeneral || '', observationEntry),
          observacionesGeneralesHistorial: observationHistory,
          updatedBy: actor.id,
          updatedByName: actor.nombre,
          updatedAt: serverTimestamp()
        }, { merge: true })
      })

      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPrestamoById = async (id) => {
    const snap = await getDoc(doc(db, PRESTAMOS_COLLECTION, id))
    return snap.exists() ? mapPrestamoDoc(snap) : null
  }

  const getTrabajos = async () => {
    trabajos.value = []
    return trabajos.value
  }

  const getPrestamosSummary = async () => {
    const collectionRef = collection(db, PRESTAMOS_COLLECTION)
    const [abiertosSnapshot, pendientesSnapshot, cerradosSnapshot] = await Promise.all([
      getCountFromServer(query(collectionRef, where('estado', 'in', [ESTADO_ABIERTO, 'activo']))),
      getCountFromServer(query(collectionRef, where('estado', '==', ESTADO_PENDIENTE_REVISION))),
      getCountFromServer(query(collectionRef, where('estado', 'in', [ESTADO_CERRADO, ESTADO_CERRADO_CON_ADEUDO])))
    ])
    prestamosSummary.value = {
      abiertos: abiertosSnapshot.data().count,
      pendientes: pendientesSnapshot.data().count,
      cerrados: cerradosSnapshot.data().count
    }
    return prestamosSummary.value
  }

  const scheduleSummaryRefresh = () => {
    if (summaryRefreshTimer) clearTimeout(summaryRefreshTimer)
    summaryRefreshTimer = setTimeout(() => {
      getPrestamosSummary().catch((err) => {
        console.warn('No se pudo actualizar el resumen de préstamos.', err)
      })
    }, 250)
  }

  const stopPrestamosListener = () => {
    if (unsubscribePrestamos) unsubscribePrestamos()
    unsubscribePrestamos = null
    if (summaryRefreshTimer) clearTimeout(summaryRefreshTimer)
    summaryRefreshTimer = null
  }

  const subscribePrestamos = async (filters = {}) => {
    stopPrestamosListener()
    loading.value = true
    error.value = null

    return new Promise((resolve, reject) => {
      let settled = false
      unsubscribePrestamos = onSnapshot(
        buildPrestamosQuery(filters),
        (snapshot) => {
          prestamos.value = applyLocalPrestamosFilters(snapshot.docs.map(mapPrestamoDoc), filters)
          loading.value = false
          scheduleSummaryRefresh()
          if (!settled) {
            settled = true
            resolve(prestamos.value)
          }
        },
        (err) => {
          error.value = err?.message || 'No se pudieron sincronizar los préstamos.'
          loading.value = false
          if (!settled) {
            settled = true
            reject(err)
          }
        }
      )
    })
  }

  const getPrestamos = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(buildPrestamosQuery(filters))
      prestamos.value = applyLocalPrestamosFilters(snapshot.docs.map(mapPrestamoDoc), filters)
      return prestamos.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPrestamosHoy = async (fechaOperativa = formatFechaOperativa()) => {
    return getPrestamos({ fechaOperativa, estados: [ESTADO_ABIERTO, 'activo'] })
  }

  const getPrestamosRevision = async (filters = {}) => {
    return getPrestamos({ ...filters, estado: ESTADO_PENDIENTE_REVISION })
  }

  const getPrestamosCerrados = async (filters = {}) => {
    return getPrestamos({ ...filters, estados: [ESTADO_CERRADO, ESTADO_CERRADO_CON_ADEUDO] })
  }

  const getPrestamosConAdeudo = async (filters = {}) => {
    return getPrestamos({ ...filters, estado: ESTADO_CERRADO_CON_ADEUDO })
  }

  const liberarPrestamoDiario = async (prestamoId, payload = {}) => {
    loading.value = true
    error.value = null
    try {
      const actor = await getAuthenticatedActor()
      const operationalContext = await getOperationalContext()
      const prestamoRef = doc(db, PRESTAMOS_COLLECTION, prestamoId)
      const nowIso = operationalContext.nowIso

      await runTransaction(db, async (transaction) => {
        const prestamoSnap = await transaction.get(prestamoRef)
        if (!prestamoSnap.exists()) throw new Error('El préstamo no existe')

        const prestamoActual = { id: prestamoId, ...prestamoSnap.data() }
        if (![ESTADO_ABIERTO, ESTADO_PENDIENTE_REVISION, 'activo'].includes(prestamoActual.estado)) {
          throw new Error('Este préstamo ya está cerrado')
        }

        const liberaciones = Array.isArray(payload.detallesLiberacion)
          ? payload.detallesLiberacion
          : []
        const cierreDefinitivo = payload.cierreDefinitivo === true

        if (cierreDefinitivo && prestamoActual.estado !== ESTADO_PENDIENTE_REVISION) {
          throw new Error('Un préstamo abierto solo puede pasar a revisión mediante el proceso automático al finalizar el día.')
        }

        const productosStockDelta = {}
        const historialDetalles = []
        let huboAccion = false

        const detallesActualizados = (prestamoActual.detalles || []).map((rawItem) => {
          const item = normalizeExistingDetalle(rawItem)
          const lib = liberaciones.find((detail) => (
            detail.productoId === item.productoId &&
            (!detail.areaOrigen || normalizeArea(detail.areaOrigen) === item.areaOrigen)
          )) || {}

          const cantidadDevuelta = toNonNegativeInt(lib.cantidadDevuelta)
          const cantidadConsumida = toNonNegativeInt(lib.cantidadConsumida)
          const cantidadDevueltaComoEmpezado = toNonNegativeInt(lib.cantidadDevueltaComoEmpezado)
          const cantidadAdeudada = toNonNegativeInt(lib.cantidadAdeudada)

          if (cantidadAdeudada > 0) {
            throw new Error('Los adeudos no pueden registrarse manualmente; se generan al vencer los 3 días de revisión.')
          }

          const suma = cantidadDevuelta + cantidadConsumida + cantidadDevueltaComoEmpezado
          if (suma <= 0) return item

          const pendiente = calcularPendienteDetalle(item)
          if (suma > pendiente) {
            throw new Error(`No puedes liberar más de lo pendiente para ${item.nombre || item.productoNombre}`)
          }
          if (cantidadDevueltaComoEmpezado > 0 && item.categoriaControl !== 'FRACCIONABLE') {
            throw new Error(`Solo los productos fraccionables pueden reingresar como empezados: ${item.nombre || item.productoNombre}`)
          }

          const comentarioConsumo = String(lib.comentarioConsumo || '').trim()
          const comentarioDevueltoComoEmpezado = String(lib.comentarioDevueltoComoEmpezado || '').trim()
          const comentarioDevuelto = String(lib.comentarioDevuelto || '').trim()

          if (cantidadConsumida > 0 && !comentarioConsumo) {
            throw new Error(`Debes agregar comentario de consumo para ${item.nombre || item.productoNombre}`)
          }
          if (cantidadDevueltaComoEmpezado > 0 && !comentarioDevueltoComoEmpezado) {
            throw new Error(`Debes agregar comentario de reingreso como empezado para ${item.nombre || item.productoNombre}`)
          }

          huboAccion = true

          if (cantidadDevuelta > 0 || cantidadDevueltaComoEmpezado > 0) {
            const key = `${item.productoId}__${item.areaOrigen}`
            productosStockDelta[key] = productosStockDelta[key] || {
              ref: doc(db, PRODUCTS_COLLECTION, item.productoId),
              areaOrigen: item.areaOrigen,
              stock: 0,
              stockEmpezado: 0
            }
            productosStockDelta[key].stock += cantidadDevuelta
            productosStockDelta[key].stockEmpezado += cantidadDevueltaComoEmpezado
          }

          historialDetalles.push({
            productoId: item.productoId,
            productoNombre: item.productoNombre || item.nombre,
            areaOrigen: item.areaOrigen,
            areaOrigenLabel: AREA_LABELS[item.areaOrigen],
            cantidadDevuelta,
            comentarioDevuelto,
            cantidadConsumida,
            comentarioConsumo,
            cantidadDevueltaComoEmpezado,
            comentarioDevueltoComoEmpezado
          })

          return {
            ...item,
            cantidadDevuelta: Number(item.cantidadDevuelta || 0) + cantidadDevuelta,
            cantidadConsumida: Number(item.cantidadConsumida || 0) + cantidadConsumida,
            cantidadDevueltaComoEmpezado: Number(item.cantidadDevueltaComoEmpezado || 0) + cantidadDevueltaComoEmpezado
          }
        })

        const pendientes = detallesActualizados.filter((item) => calcularPendienteDetalle(item) > 0)
        if (cierreDefinitivo && pendientes.length) {
          throw new Error('Debes comprobar todos los artículos antes de finalizar la revisión.')
        }
        if (!huboAccion && !cierreDefinitivo) {
          throw new Error('No hay cantidades válidas para liberar')
        }

        const productosSnapshots = {}
        for (const [key, delta] of Object.entries(productosStockDelta)) {
          const productoSnap = await transaction.get(delta.ref)
          if (!productoSnap.exists()) throw new Error('Uno de los productos a reingresar ya no existe')
          productosSnapshots[key] = { snap: productoSnap, delta }
        }

        for (const { snap: productoSnap, delta } of Object.values(productosSnapshots)) {
          const productoData = productoSnap.data()
          const stockPorArea = normalizeStockPorArea(productoData)
          stockPorArea[delta.areaOrigen] = stockPorArea[delta.areaOrigen] || {
            stock: 0,
            stockEmpezado: 0
          }
          stockPorArea[delta.areaOrigen].stock += delta.stock
          stockPorArea[delta.areaOrigen].stockEmpezado += delta.stockEmpezado
          const totals = getTotalsFromStockPorArea(stockPorArea)
          transaction.update(delta.ref, {
            stockPorArea,
            stock: totals.stock,
            stockEmpezado: normalizeCategoriaControl(productoData.categoriaControl) === 'FRACCIONABLE'
              ? totals.stockEmpezado
              : 0,
            updatedAt: serverTimestamp()
          })
        }

        const totalAdeudado = detallesActualizados.reduce(
          (sum, item) => sum + Number(item.cantidadAdeudada || 0),
          0
        )
        const updatePayload = {
          detalles: detallesActualizados,
          historialLiberaciones: huboAccion
            ? [
                ...(prestamoActual.historialLiberaciones || []),
                {
                  fecha: nowIso,
                  usuarioId: actor.id,
                  usuarioNombre: actor.nombre,
                  cierreDefinitivo,
                  cierreAutomatico: false,
                  detalles: historialDetalles
                }
              ]
            : (prestamoActual.historialLiberaciones || []),
          estado: prestamoActual.estado === ESTADO_PENDIENTE_REVISION
            ? ESTADO_PENDIENTE_REVISION
            : ESTADO_ABIERTO,
          updatedAt: serverTimestamp(),
          updatedBy: actor.id,
          updatedByName: actor.nombre
        }

        if (cierreDefinitivo) {
          updatePayload.estado = totalAdeudado > 0
            ? ESTADO_CERRADO_CON_ADEUDO
            : ESTADO_CERRADO
          updatePayload.observacionCierre = String(payload.observacionCierre || '').trim()
          updatePayload.cerradoPermanentemente = true
          updatePayload.cerradoAt = serverTimestamp()
          updatePayload.cerradoPorUsuarioId = actor.id
          updatePayload.cerradoPorUsuarioNombre = actor.nombre
          updatePayload.requiereRevision = false
          updatePayload.revisionFinalizadaAt = serverTimestamp()
          updatePayload.revisionFinalizadaPorUsuarioId = actor.id
          updatePayload.revisionFinalizadaPorUsuarioNombre = actor.nombre
        }

        transaction.update(prestamoRef, updatePayload)
      })

      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const devolverPrestamo = async (id, detallesDevolucion) => {
    const detallesLiberacion = (detallesDevolucion || []).map((item) => ({
      productoId: item.productoId,
      areaOrigen: item.areaOrigen,
      cantidadDevuelta: toNonNegativeInt(item.cantidadDevuelta),
      comentarioDevuelto: item.observacion || item.comentarioDevuelto || '',
      cantidadConsumida: toNonNegativeInt(item.cantidadConsumida),
      comentarioConsumo: item.observacion || item.comentarioConsumo || '',
      cantidadDevueltaComoEmpezado: toNonNegativeInt(item.cantidadDevueltaComoEmpezado),
      comentarioDevueltoComoEmpezado: item.observacion || item.comentarioDevueltoComoEmpezado || ''
    }))

    return liberarPrestamoDiario(id, {
      detallesLiberacion,
      cierreDefinitivo: false,
      observacionCierre: ''
    })
  }

  const getPendientes = async () => getPrestamosRevision()

  const getVencidos = async (fechaCorte = formatFechaOperativa()) => {
    const snapshot = await getDocs(query(
      collection(db, PRESTAMOS_COLLECTION),
      where('estado', '==', ESTADO_PENDIENTE_REVISION),
      where('revisionVenceEn', '<=', fechaCorte)
    ))
    return snapshot.docs.map(mapPrestamoDoc)
  }

  return {
    prestamos,
    prestamosSummary,
    trabajos,
    loading,
    error,
    createPrestamo,
    getPrestamos,
    getPrestamosSummary,
    subscribePrestamos,
    stopPrestamosListener,
    getTrabajos,
    getPrestamoById,
    getPrestamosHoy,
    getPrestamosRevision,
    getPrestamosCerrados,
    getPrestamosConAdeudo,
    liberarPrestamoDiario,
    devolverPrestamo,
    getPendientes,
    getVencidos,
    formatFechaOperativa,
    calcularPendienteDetalle,
    AREAS_TALLER,
    AREA_LABELS,
    TIPO_PRESTAMO,
    TIPO_ENTREGA_SIN_ADEUDO,
    ESTADO_ABIERTO,
    ESTADO_PENDIENTE_REVISION,
    ESTADO_CERRADO,
    ESTADO_CERRADO_CON_ADEUDO
  }
}
