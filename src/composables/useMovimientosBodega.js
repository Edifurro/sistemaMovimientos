import { ref } from 'vue'
import { db } from '../services/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  runTransaction
} from 'firebase/firestore'

const MOVEMENTS_COLLECTION = 'movimientos_bodega'
const INVENTORY_COLLECTION = 'inventario_bodega'

const movimientos = ref([])
const loading = ref(false)
const error = ref(null)

const mapError = (err) => {
  if (!err) return 'Error desconocido en movimientos bodega.'
  const message = String(err.message || err)
  if (message.includes('permission-denied')) return 'No tienes permisos para acceder a movimientos bodega.'
  return message
}

export function useMovimientosBodega() {
  const getMovimientos = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(query(collection(db, MOVEMENTS_COLLECTION), orderBy('fecha', 'desc')))
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      const filtered = rows.filter((r) => {
        if (filters.inventarioId && String(r.inventarioId) !== String(filters.inventarioId)) return false
        if (filters.tipo && String(r.tipo) !== String(filters.tipo)) return false
        return true
      })
      movimientos.value = filtered
      return movimientos.value
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const createMovimiento = async ({ inventarioId, tipo, cantidad, usuario, fecha }) => {
    loading.value = true
    error.value = null
    try {
      if (!inventarioId) throw new Error('inventarioId es requerido')
      const invRef = doc(db, INVENTORY_COLLECTION, String(inventarioId))

      await runTransaction(db, async (transaction) => {
        const invSnap = await transaction.get(invRef)
        if (!invSnap.exists()) {
          throw new Error('El item de inventario no existe: ' + inventarioId)
        }

        const current = Number(invSnap.data().cantidad || 0)
        const qty = Number(cantidad || 0)
        if (!Number.isFinite(qty) || qty <= 0) {
          throw new Error('cantidad invalida')
        }

        let newQty = current
        const lowerTipo = String(tipo || '').toLowerCase()
        if (lowerTipo === 'entrada') {
          newQty = current + qty
        } else if (lowerTipo === 'salida') {
          newQty = current - qty
          if (newQty < 0) {
            throw new Error('No hay suficiente stock para realizar esta salida')
          }
        } else {
          throw new Error('tipo debe ser "entrada" o "salida"')
        }

        transaction.update(invRef, { cantidad: newQty, updatedAt: new Date().toISOString() })

        const movementPayload = {
          inventarioId: String(inventarioId),
          tipo: lowerTipo,
          cantidad: qty,
          saldoPrevio: current,
          saldoPosterior: newQty,
          usuario: String(usuario || ''),
          fecha: fecha ? String(fecha) : new Date().toISOString(),
          createdAt: new Date().toISOString()
        }

        const movementsColRef = collection(db, MOVEMENTS_COLLECTION)
        const movementDocId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const movementDocRef = doc(movementsColRef, movementDocId)
        transaction.set(movementDocRef, movementPayload)
      })

      return true
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    movimientos,
    loading,
    error,
    getMovimientos,
    createMovimiento
  }
}
