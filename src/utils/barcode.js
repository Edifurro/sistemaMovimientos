import { db } from '../services/firebase'
import { getDoc, doc } from 'firebase/firestore'

const randomChunk = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint32Array(1)
    crypto.getRandomValues(bytes)
    return bytes[0].toString(36).toUpperCase()
  }
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

export const buildBarcodeCandidate = (prefix = 'B') => {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomChunk()}`
}

export const isBarcodeAvailable = async (barcode, collectionName, excludeId = '') => {
  const normalized = String(barcode || '').trim()
  if (!normalized) return false
  const snap = await getDoc(doc(db, collectionName, normalized))
  if (!snap.exists()) return true
  if (!excludeId) return false
  return snap.id === excludeId
}

export const ensureUniqueBarcode = async (preferred = '', collectionName = '', excludeId = '') => {
  const normalizedPreferred = String(preferred || '').trim()
  if (normalizedPreferred && collectionName && (await isBarcodeAvailable(normalizedPreferred, collectionName, excludeId))) {
    return normalizedPreferred
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = buildBarcodeCandidate('B')
    if (!collectionName) return candidate
    if (await isBarcodeAvailable(candidate, collectionName, excludeId)) {
      return candidate
    }
  }

  throw new Error('No fue posible generar un codigo de barras unico.')
}
