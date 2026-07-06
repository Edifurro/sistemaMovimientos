import { ref } from 'vue'
import { db } from '../services/firebase'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  runTransaction,
  query,
  where
} from 'firebase/firestore'

const PRESTAMOS_COLLECTION = 'prestamos'
const PRODUCTS_COLLECTION = 'productos_nuevos'
const ADEUDOS_COLLECTION = 'adeudosProductos'

const prestamos = ref([])
const trabajos = ref([])
const loading = ref(false)
const error = ref(null)

const ESTADO_ABIERTO = 'abierto'
const ESTADO_CERRADO = 'cerrado'
const ESTADO_CERRADO_CON_ADEUDO = 'cerrado_con_adeudo'
const TIPO_PRESTAMO = 'PRESTAMO'
const TIPO_ENTREGA_SIN_ADEUDO = 'ENTREGA_SIN_ADEUDO'

const AREAS_TALLER = ['OFICINA', 'BODEGA']
const AREA_LABELS = {
  OFICINA: 'Oficina',
  BODEGA: 'Bodega'
}

const formatFechaOperativa = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatFechaLabel = (fechaOperativa) => {
  if (!fechaOperativa) return ''
  const date = new Date(`${fechaOperativa}T00:00:00`)
  if (Number.isNaN(date.getTime())) return fechaOperativa
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: '2-digit' })
}

const getEndOfDayIso = (fechaOperativa) => {
  const date = new Date(`${fechaOperativa || formatFechaOperativa()}T23:59:59.999`)
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
  if (raw === 'BODEGA') return 'BODEGA'
  return 'OFICINA'
}

const assertAreaPrestamos = (area) => {
  const raw = String(area || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (raw === 'SEGUNDO_PISO' || raw === 'SEGUNDOPISO') {
    throw new Error('Este módulo solo permite préstamos desde Oficina o Bodega. El stock de Segundo Piso se manejará en otro módulo.')
  }
  const normalized = normalizeArea(raw)
  if (!AREAS_TALLER.includes(normalized)) {
    throw new Error('Este módulo solo permite préstamos desde Oficina o Bodega.')
  }
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

const buildObservationEntry = (observacion = '', usuarioNombre = 'Usuario') => {
  const clean = String(observacion || '').trim()
  if (!clean) return null
  const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
  return {
    observacion: clean,
    usuarioNombre: usuarioNombre || 'Usuario',
    fecha: new Date().toISOString(),
    texto: `[${fecha} · ${usuarioNombre || 'Usuario'}]\n${clean}`
  }
}

const appendObservation = (current = '', entry = null) => {
  if (!entry?.texto) return current || ''
  return current ? `${current}\n\n${entry.texto}` : entry.texto
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
    generaAdeudo: productoData.generaAdeudo !== false && item.generaAdeudo !== false,
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
    generaAdeudo: item.generaAdeudo !== false,
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
  generaAdeudo: addition.generaAdeudo !== false,
  cantidad: Number(existing.cantidad || 0) + Number(addition.cantidad || 0),
  cantidadDesdeStockNuevo: Number(existing.cantidadDesdeStockNuevo || 0) + Number(addition.cantidadDesdeStockNuevo || 0),
  cantidadDesdeStockEmpezado: Number(existing.cantidadDesdeStockEmpezado || 0) + Number(addition.cantidadDesdeStockEmpezado || 0),
  cantidadDevuelta: Number(existing.cantidadDevuelta || 0),
  cantidadConsumida: Number(existing.cantidadConsumida || 0),
  cantidadDevueltaComoEmpezado: Number(existing.cantidadDevueltaComoEmpezado || 0),
  cantidadAdeudada: Number(existing.cantidadAdeudada || 0),
  observacion: [existing.observacion, addition.observacion].filter(Boolean).join('\n')
})

const mapPrestamoDoc = (document) => ({ id: document.id, ...document.data() })
const sortByUpdatedDesc = (items) => [...items].sort((a, b) => {
  const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime()
  const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime()
  return bDate - aDate
})

export function usePrestamos() {
  const createPrestamo = async (prestamoData = {}) => {
    loading.value = true
    error.value = null
    try {
      const { colaboradorId, detalles = [] } = prestamoData
      const fechaOperativa = formatFechaOperativa()
      const tipoOperacion = TIPO_PRESTAMO

      if (!colaboradorId) throw new Error('Debes seleccionar un colaborador')
      if (!Array.isArray(detalles) || !detalles.length) throw new Error('Debes agregar al menos un producto al préstamo')

      const prestamoIdFinal = buildPrestamoId({ colaboradorId, fechaOperativa })
      const prestamoRef = doc(db, PRESTAMOS_COLLECTION, prestamoIdFinal)
      const nowIso = new Date().toISOString()
      const observationEntry = buildObservationEntry(prestamoData.observaciones || prestamoData.observacionGeneral, prestamoData.usuarioNombre || 'Usuario')

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
              usuarioId: prestamoData.usuarioId || null,
              usuarioNombre: prestamoData.usuarioNombre || 'Usuario',
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
            createdAt: nowIso
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
            updatedAt: nowIso
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
          updatedAt: nowIso
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

  const getPrestamos = async (filters = {}, options = {}) => {
    loading.value = true
    error.value = null
    try {
      if (options.procesarVencidos !== false) await procesarPrestamosVencidos()
      const snapshot = await getDocs(collection(db, PRESTAMOS_COLLECTION))
      let result = snapshot.docs.map(mapPrestamoDoc)

      if (filters.fechaOperativa) result = result.filter((p) => p.fechaOperativa === filters.fechaOperativa)
      if (filters.colaboradorId) result = result.filter((p) => p.colaboradorId === filters.colaboradorId)
      if (filters.estado) result = result.filter((p) => p.estado === filters.estado)
      if (filters.areaOrigen) {
        const area = normalizeArea(filters.areaOrigen)
        result = result.filter((p) => (p.detalles || []).some((d) => normalizeArea(d.areaOrigen) === area))
      }

      prestamos.value = sortByUpdatedDesc(result)
      return prestamos.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPrestamosHoy = async (fechaOperativa = formatFechaOperativa()) => {
    return getPrestamos({ fechaOperativa, estado: ESTADO_ABIERTO })
  }

  const getPrestamosRevision = async (filters = {}) => {
    return getPrestamos({ ...filters, estado: ESTADO_ABIERTO })
  }

  const getPrestamosCerrados = async (filters = {}) => {
    const result = await getPrestamos(filters)
    prestamos.value = sortByUpdatedDesc(result.filter((p) => [ESTADO_CERRADO, ESTADO_CERRADO_CON_ADEUDO].includes(p.estado)))
    return prestamos.value
  }

  const getPrestamosConAdeudo = async (filters = {}) => {
    const result = await getPrestamos(filters)
    prestamos.value = sortByUpdatedDesc(result.filter((p) => p.estado === ESTADO_CERRADO_CON_ADEUDO))
    return prestamos.value
  }

  const writeAdeudos = async (transaction, prestamoActual, adeudosAgrupados, nowIso) => {
    const adeudosSnapshots = []
    for (const adeudo of adeudosAgrupados) {
      const adeudoId = `${prestamoActual.id}_${adeudo.item.productoId}_${adeudo.item.areaOrigen}`
      const adeudoRef = doc(db, ADEUDOS_COLLECTION, adeudoId)
      const adeudoSnap = await transaction.get(adeudoRef)
      adeudosSnapshots.push({ adeudo, adeudoRef, adeudoSnap })
    }

    for (const { adeudo, adeudoRef, adeudoSnap } of adeudosSnapshots) {
      const adeudoPayload = {
        colaboradorId: prestamoActual.colaboradorId,
        colaboradorNombre: prestamoActual.colaboradorNombre || '',
        productoId: adeudo.item.productoId,
        productoNombre: adeudo.item.productoNombre || adeudo.item.nombre || '',
        areaOrigen: adeudo.item.areaOrigen,
        areaOrigenLabel: AREA_LABELS[adeudo.item.areaOrigen],
        prestamoId: prestamoActual.id,
        fechaOperativa: prestamoActual.fechaOperativa,
        tipoOperacion: TIPO_PRESTAMO,
        origen: 'prestamo_diario'
      }

      if (adeudoSnap.exists()) {
        const current = adeudoSnap.data()
        const cantidadAdeudadaTotal = Number(current.cantidadAdeudada || 0) + adeudo.cantidadAdeudada
        const cantidadPendienteTotal = Number(current.cantidadPendiente || 0) + adeudo.cantidadAdeudada
        transaction.update(adeudoRef, {
          ...adeudoPayload,
          cantidadAdeudada: cantidadAdeudadaTotal,
          cantidadPendiente: cantidadPendienteTotal,
          observaciones: [current.observaciones, adeudo.observaciones].filter(Boolean).join('\n'),
          estado: 'pendiente',
          updatedAt: nowIso
        })
      } else {
        transaction.set(adeudoRef, {
          ...adeudoPayload,
          cantidadAdeudada: adeudo.cantidadAdeudada,
          cantidadSaldada: 0,
          cantidadPendiente: adeudo.cantidadAdeudada,
          observaciones: adeudo.observaciones,
          estado: 'pendiente',
          createdAt: nowIso,
          updatedAt: nowIso
        })
      }
    }
  }

  const liberarPrestamoDiario = async (prestamoId, payload = {}) => {
    loading.value = true
    error.value = null
    try {
      const prestamoRef = doc(db, PRESTAMOS_COLLECTION, prestamoId)
      const nowIso = new Date().toISOString()

      await runTransaction(db, async (transaction) => {
        const prestamoSnap = await transaction.get(prestamoRef)
        if (!prestamoSnap.exists()) throw new Error('El préstamo no existe')

        const prestamoActual = { id: prestamoId, ...prestamoSnap.data() }
        if (prestamoActual.estado !== ESTADO_ABIERTO && prestamoActual.estado !== 'activo') {
          throw new Error('Este préstamo ya está cerrado')
        }

        const liberaciones = Array.isArray(payload.detallesLiberacion) ? payload.detallesLiberacion : []
        const cierreDefinitivo = payload.cierreDefinitivo === true
        const cierreAutomatico = payload.cierreAutomatico === true

        const productosStockDelta = {}
        const adeudosToWrite = []
        const historialDetalles = []
        let huboAccion = false
        let huboAdeudoAutomaticoPorCierre = false

        let detallesActualizados = (prestamoActual.detalles || []).map((rawItem) => {
          const item = normalizeExistingDetalle(rawItem)
          const lib = liberaciones.find((d) => d.productoId === item.productoId && (!d.areaOrigen || normalizeArea(d.areaOrigen) === item.areaOrigen)) || {}

          const cantidadDevuelta = toNonNegativeInt(lib.cantidadDevuelta)
          const cantidadConsumida = toNonNegativeInt(lib.cantidadConsumida)
          const cantidadDevueltaComoEmpezado = toNonNegativeInt(lib.cantidadDevueltaComoEmpezado)
          const cantidadAdeudada = toNonNegativeInt(lib.cantidadAdeudada)
          const suma = cantidadDevuelta + cantidadConsumida + cantidadDevueltaComoEmpezado + cantidadAdeudada

          if (suma <= 0) return item

          const pendiente = calcularPendienteDetalle(item)
          if (suma > pendiente) throw new Error(`No puedes liberar más de lo pendiente para ${item.nombre || item.productoNombre}`)
          if (cantidadDevueltaComoEmpezado > 0 && item.categoriaControl !== 'FRACCIONABLE') {
            throw new Error(`Solo los productos fraccionables pueden reingresar como empezados: ${item.nombre || item.productoNombre}`)
          }

          const comentarioConsumo = String(lib.comentarioConsumo || '').trim()
          const comentarioDevueltoComoEmpezado = String(lib.comentarioDevueltoComoEmpezado || '').trim()
          const comentarioAdeudo = String(lib.comentarioAdeudo || '').trim()
          const comentarioDevuelto = String(lib.comentarioDevuelto || '').trim()

          if (cantidadConsumida > 0 && !comentarioConsumo) throw new Error(`Debes agregar comentario de consumo para ${item.nombre || item.productoNombre}`)
          if (cantidadDevueltaComoEmpezado > 0 && !comentarioDevueltoComoEmpezado) throw new Error(`Debes agregar comentario de reingreso como empezado para ${item.nombre || item.productoNombre}`)
          if (cantidadAdeudada > 0 && !comentarioAdeudo) throw new Error(`Debes agregar comentario de adeudo para ${item.nombre || item.productoNombre}`)

          huboAccion = true

          if (cantidadDevuelta > 0 || cantidadDevueltaComoEmpezado > 0) {
            const key = `${item.productoId}__${item.areaOrigen}`
            productosStockDelta[key] = productosStockDelta[key] || {
              ref: doc(db, PRODUCTS_COLLECTION, item.productoId),
              productoId: item.productoId,
              areaOrigen: item.areaOrigen,
              stock: 0,
              stockEmpezado: 0
            }
            productosStockDelta[key].stock += cantidadDevuelta
            productosStockDelta[key].stockEmpezado += cantidadDevueltaComoEmpezado
          }

          if (cantidadAdeudada > 0) {
            adeudosToWrite.push({ item, cantidadAdeudada, observaciones: comentarioAdeudo })
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
            comentarioDevueltoComoEmpezado,
            cantidadAdeudada,
            comentarioAdeudo
          })

          return {
            ...item,
            cantidadDevuelta: Number(item.cantidadDevuelta || 0) + cantidadDevuelta,
            cantidadConsumida: Number(item.cantidadConsumida || 0) + cantidadConsumida,
            cantidadDevueltaComoEmpezado: Number(item.cantidadDevueltaComoEmpezado || 0) + cantidadDevueltaComoEmpezado,
            cantidadAdeudada: Number(item.cantidadAdeudada || 0) + cantidadAdeudada
          }
        })

        let pendientes = detallesActualizados.filter((item) => calcularPendienteDetalle(item) > 0)

        if (cierreDefinitivo && pendientes.length) {
          detallesActualizados = detallesActualizados.map((item) => {
            const pendiente = calcularPendienteDetalle(item)
            if (pendiente <= 0) return item

            const comentarioAdeudoAutomatico = cierreAutomatico
              ? `Adeudo generado automáticamente por caducidad del préstamo diario (${AREA_LABELS[item.areaOrigen] || item.areaOrigen}).`
              : `Pendiente registrado como adeudo al cierre definitivo (${AREA_LABELS[item.areaOrigen] || item.areaOrigen}).`

            adeudosToWrite.push({ item, cantidadAdeudada: pendiente, observaciones: comentarioAdeudoAutomatico })
            historialDetalles.push({
              productoId: item.productoId,
              productoNombre: item.productoNombre || item.nombre,
              areaOrigen: item.areaOrigen,
              areaOrigenLabel: AREA_LABELS[item.areaOrigen],
              cantidadDevuelta: 0,
              comentarioDevuelto: '',
              cantidadConsumida: 0,
              comentarioConsumo: '',
              cantidadDevueltaComoEmpezado: 0,
              comentarioDevueltoComoEmpezado: '',
              cantidadAdeudada: pendiente,
              comentarioAdeudo: comentarioAdeudoAutomatico,
              generadoAutomaticamente: true,
              cierreAutomatico
            })

            huboAccion = true
            huboAdeudoAutomaticoPorCierre = true

            return { ...item, cantidadAdeudada: Number(item.cantidadAdeudada || 0) + pendiente }
          })

          pendientes = detallesActualizados.filter((item) => calcularPendienteDetalle(item) > 0)
        }

        if (!huboAccion && !cierreDefinitivo) throw new Error('No hay cantidades válidas para liberar')

        const productosSnapshots = {}
        for (const [key, delta] of Object.entries(productosStockDelta)) {
          const productoSnap = await transaction.get(delta.ref)
          if (!productoSnap.exists()) throw new Error('Uno de los productos a reingresar ya no existe')
          productosSnapshots[key] = { snap: productoSnap, delta }
        }

        const adeudosAgrupados = Object.values(adeudosToWrite.reduce((acc, adeudo) => {
          const key = `${adeudo.item.productoId}_${adeudo.item.areaOrigen}`
          if (!acc[key]) acc[key] = { ...adeudo, cantidadAdeudada: 0, observaciones: '' }
          acc[key].cantidadAdeudada += Number(adeudo.cantidadAdeudada || 0)
          acc[key].observaciones = [acc[key].observaciones, adeudo.observaciones].filter(Boolean).join('\n')
          return acc
        }, {}))

        await writeAdeudos(transaction, prestamoActual, adeudosAgrupados, nowIso)

        for (const { snap: productoSnap, delta } of Object.values(productosSnapshots)) {
          const productoData = productoSnap.data()
          const stockPorArea = normalizeStockPorArea(productoData)
          stockPorArea[delta.areaOrigen] = stockPorArea[delta.areaOrigen] || { stock: 0, stockEmpezado: 0 }
          stockPorArea[delta.areaOrigen].stock += delta.stock
          stockPorArea[delta.areaOrigen].stockEmpezado += delta.stockEmpezado
          const totals = getTotalsFromStockPorArea(stockPorArea)
          transaction.update(delta.ref, {
            stockPorArea,
            stock: totals.stock,
            stockEmpezado: normalizeCategoriaControl(productoData.categoriaControl) === 'FRACCIONABLE' ? totals.stockEmpezado : 0,
            updatedAt: nowIso
          })
        }

        const totalAdeudado = detallesActualizados.reduce((sum, item) => sum + Number(item.cantidadAdeudada || 0), 0)
        let nextEstado = ESTADO_ABIERTO
        const updatePayload = {
          detalles: detallesActualizados,
          historialLiberaciones: huboAccion ? [
            ...(prestamoActual.historialLiberaciones || []),
            {
              fecha: nowIso,
              usuarioId: payload.usuarioId || null,
              usuarioNombre: payload.usuarioNombre || (cierreAutomatico ? 'Sistema' : 'Usuario'),
              cierreDefinitivo,
              cierreAutomatico,
              detalles: historialDetalles
            }
          ] : (prestamoActual.historialLiberaciones || []),
          updatedAt: nowIso
        }

        if (cierreDefinitivo) {
          if (pendientes.length) throw new Error('No se pudo cerrar el préstamo: quedan cantidades pendientes que no pudieron convertirse en adeudo.')
          nextEstado = totalAdeudado > 0 ? ESTADO_CERRADO_CON_ADEUDO : ESTADO_CERRADO
          updatePayload.estado = nextEstado
          updatePayload.observacionCierre = String(payload.observacionCierre || '').trim() || (huboAdeudoAutomaticoPorCierre ? 'Cierre definitivo: los pendientes se registraron como adeudo automáticamente.' : '')
          updatePayload.cerradoPermanentemente = true
          updatePayload.cerradoAt = nowIso
          updatePayload.cerradoPorUsuarioId = payload.usuarioId || null
          updatePayload.cerradoPorUsuarioNombre = payload.usuarioNombre || (cierreAutomatico ? 'Sistema' : 'Usuario')
          updatePayload.vencido = cierreAutomatico
        } else {
          updatePayload.estado = ESTADO_ABIERTO
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

  const procesarPrestamosVencidos = async (fechaCorte = formatFechaOperativa()) => {
    const snapshot = await getDocs(query(collection(db, PRESTAMOS_COLLECTION), where('estado', '==', ESTADO_ABIERTO)))
    const vencidos = snapshot.docs
      .map(mapPrestamoDoc)
      .filter((prestamo) => prestamo.fechaOperativa && prestamo.fechaOperativa < fechaCorte)

    for (const prestamo of vencidos) {
      try {
        await liberarPrestamoDiario(prestamo.id, {
          cierreDefinitivo: true,
          cierreAutomatico: true,
          observacionCierre: 'Cierre automático por caducidad del préstamo diario.',
          usuarioId: null,
          usuarioNombre: 'Sistema'
        })
      } catch (err) {
        console.error('No se pudo cerrar préstamo vencido', prestamo.id, err)
      }
    }

    return vencidos.length
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
      comentarioDevueltoComoEmpezado: item.observacion || item.comentarioDevueltoComoEmpezado || '',
      cantidadAdeudada: toNonNegativeInt(item.cantidadAdeudada),
      comentarioAdeudo: item.observacion || item.comentarioAdeudo || ''
    }))

    return liberarPrestamoDiario(id, {
      detallesLiberacion,
      cierreDefinitivo: false,
      observacionCierre: '',
      usuarioId: null,
      usuarioNombre: 'Usuario'
    })
  }

  const getPendientes = async () => getPrestamosRevision()

  const getVencidos = async (fechaCorte = formatFechaOperativa()) => {
    const snapshot = await getDocs(query(collection(db, PRESTAMOS_COLLECTION), where('estado', '==', ESTADO_ABIERTO)))
    return snapshot.docs.map(mapPrestamoDoc).filter((prestamo) => prestamo.fechaOperativa && prestamo.fechaOperativa < fechaCorte)
  }

  return {
    prestamos,
    trabajos,
    loading,
    error,
    createPrestamo,
    getPrestamos,
    getTrabajos,
    getPrestamoById,
    getPrestamosHoy,
    getPrestamosRevision,
    getPrestamosCerrados,
    getPrestamosConAdeudo,
    liberarPrestamoDiario,
    devolverPrestamo,
    procesarPrestamosVencidos,
    getPendientes,
    getVencidos,
    formatFechaOperativa,
    calcularPendienteDetalle,
    AREAS_TALLER,
    AREA_LABELS,
    TIPO_PRESTAMO,
    TIPO_ENTREGA_SIN_ADEUDO
  }
}
