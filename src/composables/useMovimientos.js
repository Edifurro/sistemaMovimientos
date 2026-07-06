import { ref } from 'vue'
import { db } from '../services/firebase'
import { collection, addDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const movimientos = ref([])
const loading = ref(false)
const error = ref(null)

export function useMovimientos() {
  const logMovimiento = async ({ productoId, productoNombre = '', cantidad, tipo, motivo = '', usuarioId = null, usuarioNombre = '', areaOrigen = null, trabajoId = null, empresaTrabajo = '', unidadTrabajo = '', descripcionTrabajo = '', tipoOperacion = '' }) => {
    loading.value = true
    error.value = null
    try {
      const authUser = getAuth()?.currentUser || null
      const createdBy = usuarioId || authUser?.uid || null
      const payload = {
        productoId,
        productoNombre: String(productoNombre || '').trim() || null,
        cantidad: Number(cantidad),
        tipo: tipo === 'salida' ? 'salida' : 'entrada',
        motivo: motivo || 'Ajuste rapido',
        usuarioId: createdBy,
        usuarioNombre: String(usuarioNombre || authUser?.email || '').trim() || null,
        createdBy,
        areaOrigen: areaOrigen || null,
        trabajoId: trabajoId || null,
        empresaTrabajo: String(empresaTrabajo || '').trim() || null,
        unidadTrabajo: String(unidadTrabajo || '').trim() || null,
        descripcionTrabajo: String(descripcionTrabajo || '').trim() || null,
        tipoOperacion: String(tipoOperacion || '').trim() || null,
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
