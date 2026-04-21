import { ref } from 'vue'
import { db } from '../services/firebase'
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where
} from 'firebase/firestore'

const colaboradores = ref([])
const loading = ref(false)
const error = ref(null)

const mapColaboradoresError = (err) => {
  const code = err?.code || ''
  const message = String(err?.message || '')

  if (code === 'colaborador/duplicate-code') {
    return 'El codigo de empleado ya existe. Intenta guardar de nuevo para generar uno nuevo.'
  }

  if (code === 'permission-denied' || message.includes('PERMISSION_DENIED') || message.includes('Missing or insufficient permissions')) {
    return 'No tienes permisos para gestionar colaboradores. Verifica tu rol admin en Firestore.'
  }

  return err?.message || 'Ocurrio un error al gestionar colaboradores.'
}

const buildNextCode = (rows = []) => {
  let maxNumber = 0

  for (const row of rows) {
    const codeValue = String(row?.codigoEmpleado || '')
    const numericPart = codeValue.match(/(\d+)$/)
    if (!numericPart) continue

    const asNumber = Number.parseInt(numericPart[1], 10)
    if (Number.isFinite(asNumber) && asNumber > maxNumber) {
      maxNumber = asNumber
    }
  }

  const next = String(maxNumber + 1).padStart(3, '0')
  return `EMP-${next}`
}

const createDuplicateCodeError = () => {
  const err = new Error('Codigo duplicado en Firestore')
  err.code = 'colaborador/duplicate-code'
  return err
}

export function useColaboradores() {
  const getNextColaboradorCode = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'colaboradores')))
      const rows = snapshot.docs.map((item) => item.data())
      return buildNextCode(rows)
    } catch (err) {
      throw err
    }
  }

  const isCodigoEmpleadoAvailable = async (codigoEmpleado, excludeId = '') => {
    const normalizedCode = String(codigoEmpleado || '').trim()
    if (!normalizedCode) {
      return false
    }

    const q = query(collection(db, 'colaboradores'), where('codigoEmpleado', '==', normalizedCode))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return true
    }

    if (!excludeId) {
      return false
    }

    return snapshot.docs.every((item) => item.id === excludeId)
  }

  const createColaborador = async (colaboradorData) => {
    loading.value = true
    error.value = null
    try {
      let assignedCode = String(colaboradorData?.codigoEmpleado || '').trim()
      if (!assignedCode) {
        assignedCode = await getNextColaboradorCode()
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const available = await isCodigoEmpleadoAvailable(assignedCode)
        if (available) break
        assignedCode = await getNextColaboradorCode()
      }

      const finalAvailable = await isCodigoEmpleadoAvailable(assignedCode)
      if (!finalAvailable) {
        throw createDuplicateCodeError()
      }

      const docRef = await addDoc(collection(db, 'colaboradores'), {
        ...colaboradorData,
        codigoEmpleado: assignedCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activo: true
      })
      return docRef.id
    } catch (err) {
      error.value = mapColaboradoresError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getColaboradores = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      let q = query(collection(db, 'colaboradores'))
      
      if (filters.activo !== undefined) {
        q = query(collection(db, 'colaboradores'), where('activo', '==', filters.activo))
      }
      
      const snapshot = await getDocs(q)
      colaboradores.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      return colaboradores.value
    } catch (err) {
      error.value = mapColaboradoresError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getColaboradorById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const docRef = await getDoc(doc(db, 'colaboradores', id))
      if (docRef.exists()) {
        return { id: docRef.id, ...docRef.data() }
      }
      return null
    } catch (err) {
      error.value = mapColaboradoresError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateColaborador = async (id, updates) => {
    loading.value = true
    error.value = null
    try {
      if (updates?.codigoEmpleado) {
        const available = await isCodigoEmpleadoAvailable(updates.codigoEmpleado, id)
        if (!available) {
          throw createDuplicateCodeError()
        }
      }

      await updateDoc(doc(db, 'colaboradores', id), {
        ...updates,
        updatedAt: new Date().toISOString()
      })
    } catch (err) {
      error.value = mapColaboradoresError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteColaborador = async (id) => {
    loading.value = true
    error.value = null
    try {
      await updateDoc(doc(db, 'colaboradores', id), {
        activo: false,
        updatedAt: new Date().toISOString()
      })
      colaboradores.value = colaboradores.value.map(c =>
        c.id === id ? { ...c, activo: false } : c
      )
    } catch (err) {
      error.value = mapColaboradoresError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    colaboradores,
    loading,
    error,
    createColaborador,
    getNextColaboradorCode,
    isCodigoEmpleadoAvailable,
    getColaboradores,
    getColaboradorById,
    updateColaborador,
    deleteColaborador
  }
}
