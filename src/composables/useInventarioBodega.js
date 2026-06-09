import { ref } from 'vue'
import { db } from '../services/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore'
import { ensureUniqueBarcode } from '../utils/barcode'

const COLLECTION_NAME = 'inventario_bodega'

const inventarioBodega = ref([])
const loading = ref(false)
const error = ref(null)

const normalizeText = (v) => String(v || '').trim()
const normalizeNumber = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const mapError = (err) => {
  if (!err) return 'Error desconocido en inventario bodega.'
  const message = String(err.message || err)
  if (message.includes('permission-denied')) return 'No tienes permisos para acceder a inventario bodega.'
  return message
}

export function useInventarioBodega() {
  const getNextBarcode = async () => {
    return ensureUniqueBarcode('', COLLECTION_NAME)
  }
  const getInventario = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc')))
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

      const filtered = rows.filter((r) => {
        if (filters.categoria && String(r.categoria || '').toLowerCase() !== String(filters.categoria).toLowerCase()) return false
        if (filters.ubicacion && String(r.ubicacion || '').toLowerCase() !== String(filters.ubicacion).toLowerCase()) return false
        const q = String(filters.search || '').trim().toLowerCase()
        if (!q) return true
        const blob = [r.barcode, r.descripcion, r.categoria, r.ubicacion, r.proveedor].filter(Boolean).join(' ').toLowerCase()
        return blob.includes(q)
      })

      inventarioBodega.value = filtered
      return inventarioBodega.value
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getInventarioById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDoc(doc(db, COLLECTION_NAME, String(id || '').trim()))
      if (!snapshot.exists()) return null
      return { id: snapshot.id, ...snapshot.data() }
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const createInventarioItem = async (data = {}) => {
    loading.value = true
    error.value = null
    try {
      const barcode = await ensureUniqueBarcode(String(data.barcode || '').trim(), COLLECTION_NAME)
      const payload = {
        barcode,
        descripcion: normalizeText(data.descripcion),
        categoria: normalizeText(data.categoria),
        cantidad: normalizeNumber(data.cantidad, 0),
        ubicacion: normalizeText(data.ubicacion),
        costoUnitario: normalizeNumber(data.costoUnitario, 0),
        proveedor: normalizeText(data.proveedor),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await setDoc(doc(db, COLLECTION_NAME, payload.barcode), payload)
      return payload.barcode
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateInventarioItem = async (id, updates = {}) => {
    loading.value = true
    error.value = null
    try {
      const payload = {
        ...Object.fromEntries(
          Object.entries(updates).map(([k, v]) => [k, k === 'cantidad' || k === 'costoUnitario' ? normalizeNumber(v, 0) : normalizeText(v)])
        ),
        updatedAt: new Date().toISOString()
      }
      await updateDoc(doc(db, COLLECTION_NAME, String(id)), payload)
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteInventarioItem = async (id) => {
    loading.value = true
    error.value = null
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, String(id)))
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    inventarioBodega,
    loading,
    error,
    getNextBarcode,
    getInventario,
    getInventarioById,
    createInventarioItem,
    updateInventarioItem,
    deleteInventarioItem
  }
}
