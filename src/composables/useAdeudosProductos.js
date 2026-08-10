import { ref } from 'vue'
import { auth, db } from '../services/firebase'
import { getOperationalContext } from '../services/operationalTime'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  runTransaction,
  query,
  serverTimestamp,
  where,
  orderBy
} from 'firebase/firestore'

const ADEUDOS_COLLECTION = 'adeudosProductos'
const PRODUCTS_COLLECTION = 'productos_nuevos'
const PRESTAMOS_COLLECTION = 'prestamos'

const adeudosProductos = ref([])
const loading = ref(false)
const error = ref(null)
let unsubscribeAdeudos = null

const toNonNegativeInteger = (value, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < 0) return fallback
  return number
}


const AREAS_TALLER = ['OFICINA', 'BODEGA', 'SEGUNDO_PISO']
const AREA_LABELS = {
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  SEGUNDO_PISO: 'Segundo Piso'
}

const normalizeArea = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (raw === 'SEGUNDO_PISO' || raw === 'SEGUNDOPISO') return 'SEGUNDO_PISO'
  if (raw === 'BODEGA') return 'BODEGA'
  return 'OFICINA'
}

const emptyStockPorArea = () => AREAS_TALLER.reduce((acc, area) => {
  acc[area] = { stock: 0, stockEmpezado: 0 }
  return acc
}, {})

const normalizeStockPorArea = (producto = {}) => {
  const categoriaControl = String(producto.categoriaControl || '').trim().toUpperCase()
  const result = emptyStockPorArea()
  if (producto.stockPorArea && typeof producto.stockPorArea === 'object') {
    for (const [rawArea, data] of Object.entries(producto.stockPorArea)) {
      const area = normalizeArea(rawArea)
      result[area] = {
        stock: toNonNegativeInteger(data?.stock),
        stockEmpezado: categoriaControl === 'FRACCIONABLE' ? toNonNegativeInteger(data?.stockEmpezado) : 0
      }
    }
  } else {
    result.OFICINA = {
      stock: toNonNegativeInteger(producto.stock),
      stockEmpezado: categoriaControl === 'FRACCIONABLE' ? toNonNegativeInteger(producto.stockEmpezado) : 0
    }
  }
  if (categoriaControl !== 'FRACCIONABLE') {
    for (const area of AREAS_TALLER) result[area].stockEmpezado = 0
  }
  return result
}

const getTotalsFromStockPorArea = (stockPorArea = {}) => AREAS_TALLER.reduce((totals, area) => {
  totals.stock += toNonNegativeInteger(stockPorArea?.[area]?.stock)
  totals.stockEmpezado += toNonNegativeInteger(stockPorArea?.[area]?.stockEmpezado)
  return totals
}, { stock: 0, stockEmpezado: 0 })

const syncPrestamoDebtDetail = (
  prestamo = {},
  adeudo = {},
  cantidadPendiente = 0,
  accionResolucion = 'SIN_MOVIMIENTO_STOCK'
) => {
  const targetProductId = String(adeudo.productoId || '').trim()
  const targetArea = normalizeArea(adeudo.areaOrigen)
  let pendientePorAsignar = toNonNegativeInteger(cantidadPendiente)
  let matched = false

  const detalles = (prestamo.detalles || []).map((item) => {
    if (
      String(item.productoId || '').trim() !== targetProductId ||
      normalizeArea(item.areaOrigen) !== targetArea
    ) {
      return item
    }

    matched = true
    const cantidad = toNonNegativeInteger(item.cantidad)
    const resueltoSinAdeudo =
      toNonNegativeInteger(item.cantidadDevuelta) +
      toNonNegativeInteger(item.cantidadConsumida) +
      toNonNegativeInteger(item.cantidadDevueltaComoEmpezado) +
      toNonNegativeInteger(item.cantidadAdeudoResueltaSinStock)
    const capacidadAdeudo = Math.max(0, cantidad - resueltoSinAdeudo)
    const cantidadAdeudada = Math.min(capacidadAdeudo, pendientePorAsignar)
    pendientePorAsignar -= cantidadAdeudada

    const deudaAnterior = toNonNegativeInteger(item.cantidadAdeudada)
    const cantidadResuelta = Math.max(0, deudaAnterior - cantidadAdeudada)
    const detalleActualizado = {
      ...item,
      cantidadAdeudada
    }

    if (cantidadResuelta > 0) {
      if (accionResolucion === 'REINGRESAR_STOCK') {
        detalleActualizado.cantidadDevuelta = toNonNegativeInteger(item.cantidadDevuelta) + cantidadResuelta
      } else if (accionResolucion === 'REINGRESAR_STOCK_EMPEZADO') {
        detalleActualizado.cantidadDevueltaComoEmpezado = toNonNegativeInteger(item.cantidadDevueltaComoEmpezado) + cantidadResuelta
      } else {
        detalleActualizado.cantidadAdeudoResueltaSinStock =
          toNonNegativeInteger(item.cantidadAdeudoResueltaSinStock) + cantidadResuelta
      }
    }

    return detalleActualizado
  })

  if (!matched) {
    throw new Error('El producto del adeudo no coincide con el préstamo de origen.')
  }
  if (pendientePorAsignar > 0) {
    throw new Error('El adeudo pendiente no coincide con las cantidades del préstamo de origen.')
  }

  const totalAdeudado = detalles.reduce(
    (sum, item) => sum + toNonNegativeInteger(item.cantidadAdeudada),
    0
  )

  return { detalles, totalAdeudado }
}

const toIsoDate = (value) => value?.toDate ? value.toDate().toISOString() : value
const mapDoc = (document) => {
  const data = document.data()
  return {
    id: document.id,
    ...data,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt)
  }
}

const sortByCreatedDesc = (items) => [...items].sort((a, b) => (
  new Date(b.createdAt || b.updatedAt || 0).getTime() -
  new Date(a.createdAt || a.updatedAt || 0).getTime()
))

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

export function useAdeudosProductos() {
  const buildPendingQuery = () => query(
    collection(db, ADEUDOS_COLLECTION),
    where('estado', '==', 'pendiente'),
    orderBy('createdAt', 'desc')
  )

  const stopAdeudosPendientesListener = () => {
    if (unsubscribeAdeudos) unsubscribeAdeudos()
    unsubscribeAdeudos = null
  }

  const startAdeudosPendientesListener = async () => {
    stopAdeudosPendientesListener()
    loading.value = true
    error.value = null

    return new Promise((resolve, reject) => {
      let settled = false
      unsubscribeAdeudos = onSnapshot(
        buildPendingQuery(),
        (snapshot) => {
          adeudosProductos.value = sortByCreatedDesc(snapshot.docs.map(mapDoc))
          loading.value = false
          if (!settled) {
            settled = true
            resolve(adeudosProductos.value)
          }
        },
        (err) => {
          error.value = err?.message || 'No se pudieron sincronizar los adeudos.'
          loading.value = false
          if (!settled) {
            settled = true
            reject(err)
          }
        }
      )
    })
  }

  const getAdeudosPendientes = async () => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(buildPendingQuery())
      adeudosProductos.value = sortByCreatedDesc(snapshot.docs.map(mapDoc))
      return adeudosProductos.value
    } catch (err) {
      error.value = err?.message || 'No se pudieron obtener los adeudos.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getAdeudosByColaborador = async (colaboradorId, soloPendientes = true) => {
    loading.value = true
    error.value = null
    try {
      const constraints = [where('colaboradorId', '==', colaboradorId)]
      if (soloPendientes) constraints.push(where('estado', '==', 'pendiente'))
      const q = query(collection(db, ADEUDOS_COLLECTION), ...constraints)
      const snapshot = await getDocs(q)
      return sortByCreatedDesc(snapshot.docs.map(mapDoc))
    } catch (err) {
      error.value = err?.message || 'No se pudieron obtener los adeudos del colaborador.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const saldarAdeudoProducto = async ({ adeudoId, cantidadSaldar, observaciones, accionInventario = 'SIN_MOVIMIENTO_STOCK' }) => {
    loading.value = true
    error.value = null
    try {
      const actor = await getAuthenticatedActor()
      const operationalContext = await getOperationalContext()
      const cantidad = toNonNegativeInteger(cantidadSaldar)
      const obs = String(observaciones || '').trim()

      if (!adeudoId) throw new Error('Adeudo invalido.')
      if (cantidad <= 0) throw new Error('La cantidad a saldar debe ser mayor a 0.')
      if (!obs) throw new Error('Las observaciones son obligatorias para saldar un adeudo.')

      await runTransaction(db, async (transaction) => {
        const nowIso = operationalContext.nowIso
        const adeudoRef = doc(db, ADEUDOS_COLLECTION, adeudoId)
        const adeudoSnap = await transaction.get(adeudoRef)
        if (!adeudoSnap.exists()) throw new Error('Adeudo no encontrado.')

        const adeudo = adeudoSnap.data()
        if (adeudo.estado !== 'pendiente') throw new Error('Este adeudo ya no esta pendiente.')

        const pendienteActual = Number(adeudo.cantidadPendiente || 0)
        const saldadaActual = Number(adeudo.cantidadSaldada || 0)
        if (cantidad > pendienteActual) throw new Error('No puedes saldar mas de lo pendiente.')

        const nuevaSaldada = saldadaActual + cantidad
        const nuevaPendiente = Math.max(0, pendienteActual - cantidad)
        const prestamoRef = adeudo.prestamoId
          ? doc(db, PRESTAMOS_COLLECTION, adeudo.prestamoId)
          : null
        const prestamoSnap = prestamoRef ? await transaction.get(prestamoRef) : null
        if (prestamoRef && !prestamoSnap?.exists()) {
          throw new Error('El préstamo de origen del adeudo ya no existe.')
        }

        let productoRef = null
        let producto = null

        if (accionInventario === 'REINGRESAR_STOCK' || accionInventario === 'REINGRESAR_STOCK_EMPEZADO') {
          productoRef = doc(db, PRODUCTS_COLLECTION, adeudo.productoId)
          const productoSnap = await transaction.get(productoRef)
          if (!productoSnap.exists()) throw new Error('Producto del adeudo no encontrado.')
          producto = productoSnap.data()

          if (accionInventario === 'REINGRESAR_STOCK_EMPEZADO' && producto.categoriaControl !== 'FRACCIONABLE') {
            throw new Error('Solo productos fraccionables pueden reingresar como empezados.')
          }
        }

        if (productoRef && producto) {
          const areaOrigen = normalizeArea(adeudo.areaOrigen)
          const stockPorArea = normalizeStockPorArea(producto)
          stockPorArea[areaOrigen] = stockPorArea[areaOrigen] || { stock: 0, stockEmpezado: 0 }
          if (accionInventario === 'REINGRESAR_STOCK') {
            stockPorArea[areaOrigen].stock += cantidad
          } else {
            stockPorArea[areaOrigen].stockEmpezado += cantidad
          }
          const totals = getTotalsFromStockPorArea(stockPorArea)
          transaction.update(productoRef, {
            stockPorArea,
            stock: totals.stock,
            stockEmpezado: producto.categoriaControl === 'FRACCIONABLE' ? totals.stockEmpezado : 0,
            updatedAt: serverTimestamp()
          })
        }

        if (prestamoRef && prestamoSnap?.exists()) {
          const prestamo = prestamoSnap.data()
          const { detalles, totalAdeudado } = syncPrestamoDebtDetail(
            prestamo,
            adeudo,
            nuevaPendiente,
            accionInventario
          )
          transaction.update(prestamoRef, {
            detalles,
            estado: totalAdeudado > 0 ? 'cerrado_con_adeudo' : 'cerrado',
            historialAdeudos: [
              ...(prestamo.historialAdeudos || []),
              {
                tipo: 'saldo',
                adeudoId,
                productoId: adeudo.productoId,
                productoNombre: adeudo.productoNombre || '',
                areaOrigen: normalizeArea(adeudo.areaOrigen),
                cantidad,
                cantidadPendiente: nuevaPendiente,
                usuarioId: actor.id,
                usuarioNombre: actor.nombre,
                fecha: nowIso
              }
            ],
            adeudosSaldadosAt: totalAdeudado <= 0 ? serverTimestamp() : (prestamo.adeudosSaldadosAt || null),
            updatedBy: actor.id,
            updatedByName: actor.nombre,
            updatedAt: serverTimestamp()
          })
        }

        transaction.update(adeudoRef, {
          cantidadSaldada: nuevaSaldada,
          cantidadPendiente: nuevaPendiente,
          estado: nuevaPendiente <= 0 ? 'saldado' : 'pendiente',
          observaciones: [adeudo.observaciones, `Saldo: ${obs}`].filter(Boolean).join('\n'),
          historial: [
            ...(adeudo.historial || []),
            {
              tipo: 'saldo',
              cantidad,
              accionInventario,
              observaciones: obs,
              usuarioId: actor.id,
              usuarioNombre: actor.nombre,
              fecha: nowIso
            }
          ],
          updatedBy: actor.id,
          updatedByName: actor.nombre,
          updatedAt: serverTimestamp()
        })
      })

      if (!unsubscribeAdeudos) await getAdeudosPendientes()
      return true
    } catch (err) {
      error.value = err?.message || 'No se pudo saldar el adeudo.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const cancelarAdeudoProducto = async ({ adeudoId, observaciones = '' }) => {
    loading.value = true
    error.value = null
    try {
      const actor = await getAuthenticatedActor()
      const operationalContext = await getOperationalContext()
      if (!adeudoId) throw new Error('Adeudo invalido.')
      const obs = String(observaciones || '').trim()
      if (!obs) throw new Error('Las observaciones son obligatorias para cancelar un adeudo.')

      await runTransaction(db, async (transaction) => {
        const nowIso = operationalContext.nowIso
        const adeudoRef = doc(db, ADEUDOS_COLLECTION, adeudoId)
        const adeudoSnap = await transaction.get(adeudoRef)
        if (!adeudoSnap.exists()) throw new Error('Adeudo no encontrado.')
        const adeudo = adeudoSnap.data()
        if (adeudo.estado !== 'pendiente') throw new Error('Este adeudo ya no esta pendiente.')

        const prestamoRef = adeudo.prestamoId
          ? doc(db, PRESTAMOS_COLLECTION, adeudo.prestamoId)
          : null
        const prestamoSnap = prestamoRef ? await transaction.get(prestamoRef) : null
        if (prestamoRef && !prestamoSnap?.exists()) {
          throw new Error('El préstamo de origen del adeudo ya no existe.')
        }

        if (prestamoRef && prestamoSnap?.exists()) {
          const prestamo = prestamoSnap.data()
          const { detalles, totalAdeudado } = syncPrestamoDebtDetail(
            prestamo,
            adeudo,
            0,
            'CANCELAR_ADEUDO'
          )
          transaction.update(prestamoRef, {
            detalles,
            estado: totalAdeudado > 0 ? 'cerrado_con_adeudo' : 'cerrado',
            historialAdeudos: [
              ...(prestamo.historialAdeudos || []),
              {
                tipo: 'cancelacion',
                adeudoId,
                productoId: adeudo.productoId,
                productoNombre: adeudo.productoNombre || '',
                areaOrigen: normalizeArea(adeudo.areaOrigen),
                cantidad: toNonNegativeInteger(adeudo.cantidadPendiente),
                cantidadPendiente: 0,
                observaciones: obs,
                usuarioId: actor.id,
                usuarioNombre: actor.nombre,
                fecha: nowIso
              }
            ],
            adeudosSaldadosAt: totalAdeudado <= 0 ? serverTimestamp() : (prestamo.adeudosSaldadosAt || null),
            updatedBy: actor.id,
            updatedByName: actor.nombre,
            updatedAt: serverTimestamp()
          })
        }

        transaction.update(adeudoRef, {
          cantidadPendiente: 0,
          estado: 'cancelado',
          observaciones: [adeudo.observaciones, `Cancelado: ${obs}`].filter(Boolean).join('\n'),
          historial: [
            ...(adeudo.historial || []),
            {
              tipo: 'cancelacion',
              observaciones: obs,
              usuarioId: actor.id,
              usuarioNombre: actor.nombre,
              fecha: nowIso
            }
          ],
          updatedBy: actor.id,
          updatedByName: actor.nombre,
          updatedAt: serverTimestamp()
        })
      })

      if (!unsubscribeAdeudos) await getAdeudosPendientes()
      return true
    } catch (err) {
      error.value = err?.message || 'No se pudo cancelar el adeudo.'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    adeudosProductos,
    loading,
    error,
    getAdeudosPendientes,
    startAdeudosPendientesListener,
    stopAdeudosPendientesListener,
    getAdeudosByColaborador,
    saldarAdeudoProducto,
    cancelarAdeudoProducto
  }
}
