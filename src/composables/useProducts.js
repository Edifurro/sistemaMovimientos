import { ref } from 'vue'
import { db } from '../services/firebase'
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore'

const products = ref([])
const loading = ref(false)
const error = ref(null)

const mapProductsErrorMessage = (err) => {
  const code = err?.code || ''
  const message = String(err?.message || '')

  if (code === 'permission-denied' || message.includes('PERMISSION_DENIED') || message.includes('Missing or insufficient permissions')) {
    return 'No tienes permisos para guardar productos. Verifica que tu documento en usuarios/{uid} tenga rol "admin" y que las reglas de Firestore esten publicadas.'
  }

  return err?.message || 'Ocurrio un error al gestionar productos.'
}

export function useProducts() {
  const createProduct = async (productData) => {
    loading.value = true
    error.value = null
    try {
      const docRef = await addDoc(collection(db, 'productos'), {
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activo: true
      })
      return docRef.id
    } catch (err) {
      error.value = mapProductsErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getProducts = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      let q = query(collection(db, 'productos'))
      
      if (filters.tipo) {
        q = query(collection(db, 'productos'), where('tipo', '==', filters.tipo))
      }
      if (filters.activo !== undefined) {
        q = query(collection(db, 'productos'), where('activo', '==', filters.activo))
      }
      
      const snapshot = await getDocs(q)
      products.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      return products.value
    } catch (err) {
      error.value = mapProductsErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getProductById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const docRef = await getDoc(doc(db, 'productos', id))
      if (docRef.exists()) {
        return { id: docRef.id, ...docRef.data() }
      }
      return null
    } catch (err) {
      error.value = mapProductsErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProduct = async (id, updates) => {
    loading.value = true
    error.value = null
    try {
      await updateDoc(doc(db, 'productos', id), {
        ...updates,
        updatedAt: new Date().toISOString()
      })
    } catch (err) {
      error.value = mapProductsErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteProduct = async (id) => {
    loading.value = true
    error.value = null
    try {
      await deleteDoc(doc(db, 'productos', id))
      products.value = products.value.filter(p => p.id !== id)
    } catch (err) {
      error.value = mapProductsErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    products,
    loading,
    error,
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
  }
}
