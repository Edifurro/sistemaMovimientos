import { ref } from 'vue'
import { db } from '../services/firebase'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  runTransaction,
  query,
  where,
  orderBy
} from 'firebase/firestore'

const prestamos = ref([])
const loading = ref(false)
const error = ref(null)

export function usePrestamos() {
  const createPrestamo = async (prestamoData) => {
    loading.value = true
    error.value = null
    try {
      const { colaboradorId, detalles = [] } = prestamoData
      const detallesNormalizados = detalles.map((item) => ({
        ...item,
        cantidad: Number(item.cantidad) || 0,
        cantidadDevuelta: 0
      }))

      if (!colaboradorId) {
        throw new Error('Debes seleccionar un colaborador')
      }

      if (!detallesNormalizados.length) {
        throw new Error('Debes agregar al menos un producto al prestamo')
      }

      // Nueva regla: un colaborador puede prestar varias herramientas, sean o no la misma.
      const hasHerramienta = detallesNormalizados.some(
        (item) => item.tipo === 'HERRAMIENTA' && item.cantidad > 0
      )

      const now = new Date()
      const nowIso = now.toISOString()
      const fechaEsperada = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      const prestamoRef = doc(collection(db, 'prestamos'))

      // Consolidar cantidades por producto para validar y actualizar stock correctamente
      const cantidadesPorProducto = detallesNormalizados.reduce((acc, item) => {
        const productoId = item.productoId
        if (!productoId) {
          throw new Error('Hay un item sin productoId en el detalle del prestamo')
        }
        const cantidad = Number(item.cantidad || 0)
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
          throw new Error(`Cantidad invalida para el producto ${item.nombre || productoId}`)
        }
        acc[productoId] = (acc[productoId] || 0) + cantidad
        return acc
      }, {})

      await runTransaction(db, async (transaction) => {
        const productosCache = {}

        // 1) Leer todo primero
        for (const [productoId, cantidadSolicitada] of Object.entries(cantidadesPorProducto)) {
          const productoRef = doc(db, 'productos', productoId)
          const productoSnap = await transaction.get(productoRef)

          if (!productoSnap.exists()) {
            throw new Error('Uno de los productos seleccionados ya no existe')
          }

          const productoData = productoSnap.data()
          const stockActual = Number(productoData.stock || 0)

          if (cantidadSolicitada > stockActual) {
            throw new Error(`Stock insuficiente para ${productoData.nombre}. Disponible: ${stockActual}`)
          }

          productosCache[productoId] = {
            ref: productoRef,
            stockActual,
            cantidadSolicitada
          }
        }

        // 2) Escribir despues de terminar todas las lecturas
        for (const productoId of Object.keys(productosCache)) {
          const item = productosCache[productoId]
          transaction.update(item.ref, {
            stock: item.stockActual - item.cantidadSolicitada,
            updatedAt: nowIso
          })
        }

        transaction.set(prestamoRef, {
          ...prestamoData,
          fechaDevolucionEsperada: fechaEsperada,
          detalles: detallesNormalizados,
          hasHerramienta,
          createdAt: nowIso,
          updatedAt: nowIso,
          estado: 'activo'
        })
      })

      return prestamoRef.id
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPrestamos = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      let q = query(collection(db, 'prestamos'), orderBy('createdAt', 'desc'))
      
      if (filters.estado) {
        q = query(
          collection(db, 'prestamos'),
          where('estado', '==', filters.estado),
          orderBy('createdAt', 'desc')
        )
      }
      if (filters.colaboradorId) {
        q = query(
          collection(db, 'prestamos'),
          where('colaboradorId', '==', filters.colaboradorId),
          orderBy('createdAt', 'desc')
        )
      }
      
      const snapshot = await getDocs(q)
      prestamos.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      return prestamos.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPrestamoById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const docRef = await getDoc(doc(db, 'prestamos', id))
      if (docRef.exists()) {
        return { id: docRef.id, ...docRef.data() }
      }
      return null
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const devolverPrestamo = async (id, detallesDevolucion) => {
    loading.value = true
    error.value = null
    try {
      const prestamoRef = doc(db, 'prestamos', id)

      await runTransaction(db, async (transaction) => {
        const nowIso = new Date().toISOString()
        const prestamoSnap = await transaction.get(prestamoRef)
        if (!prestamoSnap.exists()) {
          throw new Error('Prestamo no encontrado')
        }

        const prestamoActual = prestamoSnap.data()
        if (prestamoActual.estado === 'devuelto') {
          throw new Error('Este prestamo ya fue devuelto completamente')
        }

        const devoluciones = detallesDevolucion || []
        const acumuladoDevolucionPorProducto = {}

        const detallesActualizados = (prestamoActual.detalles || []).map((item) => {
          const devolucionItem = devoluciones.find((d) => d.productoId === item.productoId)
          const retorno = Math.max(0, Number(devolucionItem?.cantidadDevuelta || 0))
          const yaDevuelto = Math.max(0, Number(item.cantidadDevuelta || 0))
          const maxPendiente = Math.max(0, Number(item.cantidad || 0) - yaDevuelto)
          const devolucionAplicada = Math.min(retorno, maxPendiente)

          if (devolucionAplicada > 0) {
            acumuladoDevolucionPorProducto[item.productoId] =
              (acumuladoDevolucionPorProducto[item.productoId] || 0) + devolucionAplicada
          }

          return {
            ...item,
            cantidadDevuelta: yaDevuelto + devolucionAplicada
          }
        })

        const huboDevolucion = Object.values(acumuladoDevolucionPorProducto).some((v) => v > 0)
        if (!huboDevolucion) {
          throw new Error('No hay cantidades validas para devolver')
        }

        const productosCache = {}

        // 1) Leer primero los productos a reponer
        for (const [productoId, cantidadDevuelta] of Object.entries(acumuladoDevolucionPorProducto)) {
          const productoRef = doc(db, 'productos', productoId)
          const productoSnap = await transaction.get(productoRef)

          if (!productoSnap.exists()) {
            continue
          }

          const productoData = productoSnap.data()
          productosCache[productoId] = {
            ref: productoRef,
            stockActual: Number(productoData.stock || 0),
            cantidadDevuelta: Number(cantidadDevuelta || 0)
          }
        }

        // 2) Escribir luego de completar todas las lecturas
        for (const productoId of Object.keys(productosCache)) {
          const item = productosCache[productoId]
          transaction.update(item.ref, {
            stock: item.stockActual + item.cantidadDevuelta,
            updatedAt: nowIso
          })
        }

        const completo = detallesActualizados.every(
          (item) => Number(item.cantidadDevuelta || 0) >= Number(item.cantidad || 0)
        )

        transaction.update(prestamoRef, {
          detalles: detallesActualizados,
          estado: completo ? 'devuelto' : 'activo',
          fechaDevolucion: completo ? nowIso : null,
          detallesDevolucion,
          updatedAt: nowIso
        })
      })
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPendientes = async () => {
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, 'prestamos'),
        where('estado', '==', 'activo'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getVencidos = async () => {
    loading.value = true
    error.value = null
    try {
      // Préstamos con fecha de devolución esperada vencida
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 1)
      
      const q = query(
        collection(db, 'prestamos'),
        where('estado', '==', 'activo'),
        where('fechaDevolucionEsperada', '<', cutoffDate.toISOString()),
        orderBy('fechaDevolucionEsperada', 'asc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    prestamos,
    loading,
    error,
    createPrestamo,
    getPrestamos,
    getPrestamoById,
    devolverPrestamo,
    getPendientes,
    getVencidos
  }
}
