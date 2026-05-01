import { ref } from 'vue'
import { db } from '../services/firebase'
import { collection, addDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore'

const movimientos = ref([])
const loading = ref(false)
const error = ref(null)

export function useMovimientos() {
  const logMovimiento = async ({ productoId, productoNombre = '', cantidad, tipo, motivo = '', usuarioId = null, usuarioNombre = '' }) => {
    loading.value = true
    error.value = null
    try {
      const payload = {
        productoId,
        productoNombre: String(productoNombre || '').trim() || null,
        cantidad: Number(cantidad),
        tipo: tipo === 'salida' ? 'salida' : 'entrada',
        motivo: motivo || 'Ajuste rapido',
        usuarioId: usuarioId || null,
        usuarioNombre: String(usuarioNombre || '').trim() || null,
        createdAt: new Date().toISOString()
      }

      const colRef = collection(db, 'movimientos')
      const docRef = await addDoc(colRef, payload)
      return docRef.id
    } catch (err) {
      error.value = err?.message || 'No se pudo registrar el movimiento.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getMovimientos = async (opts = {}) => {
    loading.value = true
    error.value = null
    try {
      let q = query(collection(db, 'movimientos'), orderBy('createdAt', 'desc'))
      if (opts.limit) {
        q = query(collection(db, 'movimientos'), orderBy('createdAt', 'desc'), limit(Number(opts.limit)))
      }
      if (opts.productoId) {
        q = query(collection(db, 'movimientos'), where('productoId', '==', opts.productoId), orderBy('createdAt', 'desc'))
      }

      const snap = await getDocs(q)
      movimientos.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      return movimientos.value
    } catch (err) {
      error.value = err?.message || 'No se pudo obtener movimientos.'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    movimientos,
    loading,
    error,
    logMovimiento,
    getMovimientos
  }
}
