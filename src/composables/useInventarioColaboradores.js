import { ref } from 'vue'
import { db } from '../services/firebase'
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { deleteDoc } from 'firebase/firestore'

const COLLECTION_NAME = 'inventario_colaboradores'
const ESTADO_REPOSICION_PENDIENTE = 'reposicion_pendiente'
const ESTADOS_VALIDOS = ['faltante', 'incompleto', 'completo', ESTADO_REPOSICION_PENDIENTE]

const inventarioColaboradores = ref([])
const loading = ref(false)
const error = ref(null)

const normalizeText = (value) => String(value ?? '').trim().toLowerCase()

const normalizeEstado = (value) => {
  const normalized = normalizeText(value)

  if (
    normalized === ESTADO_REPOSICION_PENDIENTE ||
    normalized === 'reposicion pendiente' ||
    normalized === 'reposición pendiente'
  ) return ESTADO_REPOSICION_PENDIENTE

  if (normalized.includes('falt')) return 'faltante'
  if (normalized.includes('incomp') || normalized.includes('parcial')) return 'incompleto'
  if (ESTADOS_VALIDOS.includes(normalized)) return normalized
  return 'completo'
}

const normalizeQuantity = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  const fallbackValue = Number.parseInt(String(fallback ?? 1).trim(), 10)
  return Number.isFinite(fallbackValue) && fallbackValue > 0 ? fallbackValue : 1
}

const mapError = (err) => {
  const code = err?.code || ''
  const message = String(err?.message || '')
  if (
    code === 'permission-denied' ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('Missing or insufficient permissions')
  ) return 'No tienes permisos para gestionar el inventario de colaboradores.'
  return err?.message || 'Ocurrio un error al gestionar el inventario de colaboradores.'
}

const buildBarcodeCandidate = () => Math.floor(1000000 + Math.random() * 9000000).toString()

const isBarcodeAvailable = async (barcode, excludeId = '') => {
  const normalizedBarcode = String(barcode || '').trim()
  if (!normalizedBarcode) return false
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, normalizedBarcode))
  if (!snapshot.exists()) return true
  if (!excludeId) return false
  return snapshot.id === excludeId
}

const ensureUniqueBarcode = async (preferredBarcode = '', excludeId = '') => {
  const normalizedPreferred = String(preferredBarcode || '').trim()
  if (normalizedPreferred && (await isBarcodeAvailable(normalizedPreferred, excludeId))) {
    return normalizedPreferred
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = buildBarcodeCandidate()
    if (await isBarcodeAvailable(candidate, excludeId)) return candidate
  }
  throw new Error('No fue posible generar un codigo de barras unico.')
}

const buildPayload = async (data = {}, excludeId = '') => {
  const barcode = await ensureUniqueBarcode(data.barcode, excludeId)
  const fechaEntrega = String(data.fechaEntrega || '').trim()
  return {
    barcode,
    colaboradorId: String(data.colaboradorId || '').trim(),
    colaboradorNombre: String(data.colaboradorNombre || '').trim(),
    codigoEmpleado: String(data.codigoEmpleado || '').trim(),
    herramienta: String(data.herramienta || '').trim(),
    marca: String(data.marca || '').trim(),
    cantidad: normalizeQuantity(data.cantidad, 1),
    descripcion: String(data.descripcion || '').trim(),
    estado: normalizeEstado(data.estado),
    comentario: String(data.comentario || '').trim(),
    fechaEntrega,
    capturadoPor: String(data.capturadoPor || '').trim(),
    capturadoPorNombre: String(data.capturadoPorNombre || '').trim(),
    updatedAt: new Date().toISOString()
  }
}

const sortByCreatedAtDesc = (rows = []) => [...rows].sort((left, right) => {
  const leftDate = new Date(left?.createdAt || 0).getTime()
  const rightDate = new Date(right?.createdAt || 0).getTime()
  return rightDate - leftDate
})

export function useInventarioColaboradores() {
  const getNextBarcode = async () => ensureUniqueBarcode('')

  const getInventarioColaboradores = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc')))
      const rows = snapshot.docs.map((item) => {
        const data = item.data()
        const rawEstado = normalizeText(data.estado)
        return {
          id: item.id,
          ...data,
          estado: rawEstado === 'cambio' ? ESTADO_REPOSICION_PENDIENTE : normalizeEstado(data.estado),
          _legacyCambio: rawEstado === 'cambio'
        }
      })

      const legacyRows = rows.filter((row) => row._legacyCambio)
      await Promise.all(legacyRows.map((row) => updateDoc(doc(db, COLLECTION_NAME, row.id), {
        estado: ESTADO_REPOSICION_PENDIENTE,
        updatedAt: new Date().toISOString()
      })))
      rows.forEach((row) => { delete row._legacyCambio })

      const filtered = rows.filter((row) => {
        if (filters.colaboradorId && row.colaboradorId !== filters.colaboradorId) return false
        if (filters.estado && normalizeEstado(row.estado) !== normalizeEstado(filters.estado)) return false
        const searchText = String(filters.searchText || '').trim().toLowerCase()
        if (!searchText) return true
        const blob = [
          row.barcode, row.colaboradorNombre, row.codigoEmpleado, row.herramienta,
          row.marca, row.cantidad, row.descripcion, row.estado, row.comentario
        ].filter(Boolean).join(' ').toLowerCase()
        return blob.includes(searchText)
      })

      inventarioColaboradores.value = sortByCreatedAtDesc(filtered)
      return inventarioColaboradores.value
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getInventarioColaboradorById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDoc(doc(db, COLLECTION_NAME, id))
      if (!snapshot.exists()) return null
      const data = snapshot.data()
      return { id: snapshot.id, ...data, estado: normalizeEstado(data.estado) }
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const createInventarioColaborador = async (data) => {
    loading.value = true
    error.value = null
    try {
      const payload = await buildPayload(data)
      const now = new Date().toISOString()
      await setDoc(doc(db, COLLECTION_NAME, payload.barcode), {
        ...payload,
        createdAt: now,
        updatedAt: now,
        activo: true
      })
      return payload.barcode
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateInventarioColaborador = async (id, updates) => {
    loading.value = true
    error.value = null
    try {
      const payload = await buildPayload(updates, id)
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        ...payload,
        barcode: id,
        updatedAt: new Date().toISOString()
      })
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteInventarioColaborador = async (id) => {
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

  const upsertInventarioDesdeExcel = async (rows = [], progressCb = null) => {
    loading.value = true
    error.value = null
    try {
      let created = 0
      let updated = 0
      let skipped = 0
      const seenBarcodes = new Set()

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]
        const herramienta = String(row?.herramienta || '').trim()
        const colaboradorNombre = String(row?.colaboradorNombre || '').trim()
        let barcode = String(row?.barcode || '').trim()

        if (!barcode && !herramienta && !colaboradorNombre) {
          skipped += 1
          if (typeof progressCb === 'function') {
            try { progressCb({ index: i, total: rows.length, created, updated, skipped }) } catch (e) {}
          }
          continue
        }

        if (!barcode) barcode = await ensureUniqueBarcode('')
        if (seenBarcodes.has(barcode)) {
          skipped += 1
          if (typeof progressCb === 'function') {
            try { progressCb({ index: i, total: rows.length, created, updated, skipped }) } catch (e) {}
          }
          continue
        }
        seenBarcodes.add(barcode)

        const payload = await buildPayload({ ...row, barcode }, barcode)
        const docRef = doc(db, COLLECTION_NAME, payload.barcode)
        const snapshot = await getDoc(docRef)
        const createdAt = snapshot.exists()
          ? snapshot.data().createdAt || new Date().toISOString()
          : new Date().toISOString()

        await setDoc(docRef, {
          ...payload,
          createdAt,
          updatedAt: new Date().toISOString(),
          activo: true
        })

        if (snapshot.exists()) updated += 1
        else created += 1

        if (typeof progressCb === 'function') {
          try { progressCb({ index: i, total: rows.length, created, updated, skipped }) } catch (e) {}
        }
      }
      return { created, updated, skipped }
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    inventarioColaboradores,
    loading,
    error,
    getNextBarcode,
    getInventarioColaboradores,
    getInventarioColaboradorById,
    createInventarioColaborador,
    updateInventarioColaborador,
    upsertInventarioDesdeExcel,
    deleteInventarioColaborador
  }
}
