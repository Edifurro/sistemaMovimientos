import { ref } from 'vue'
import { db } from '../services/firebase'
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  writeBatch,
  deleteDoc
} from 'firebase/firestore'

const COLLECTION_NAME = 'conteos_colaboradores'
const INVENTARIO_COLAB = 'inventario_colaboradores'

const currentConteo = ref(null)
const scannedItems = ref([])
const loading = ref(false)
const error = ref(null)

const mapError = (err) => {
  const code = err?.code || ''
  const message = String(err?.message || '')

  if (
    code === 'permission-denied' ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('Missing or insufficient permissions')
  ) {
    return 'No tienes permisos para gestionar los conteos.'
  }

  return err?.message || 'Ocurrio un error al gestionar el conteo.'
}

export function useConteoColaborador() {
  const startConteo = async ({ colaboradorId, colaboradorNombre = '', inspectorId = '', inspectorNombre = '' } = {}) => {
    loading.value = true
    error.value = null
    try {
      // traer inventario actual del colaborador
      const invQuery = query(collection(db, INVENTARIO_COLAB), where('colaboradorId', '==', String(colaboradorId)))
      const invSnapshot = await getDocs(invQuery)
      const expectedItems = invSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

      const now = new Date().toISOString()
      const payload = {
        colaboradorId: String(colaboradorId || ''),
        colaboradorNombre: String(colaboradorNombre || ''),
        inspectorId: String(inspectorId || ''),
        inspectorNombre: String(inspectorNombre || ''),
        startedAt: now,
        finishedAt: null,
        applied: false,
        // Preserve estado and comentario so expected items render with real inventory info
        expectedItems: expectedItems.map((i) => ({ id: i.id, barcode: i.barcode || i.id, herramienta: i.herramienta || '', marca: i.marca || '', cantidad: Number(i.cantidad || 1), descripcion: i.descripcion || '', estado: i.estado || '', comentario: i.comentario || '' })),
        summary: {
          expected: expectedItems.length,
          scanned: 0,
          present: 0,
          missing: expectedItems.length,
          extras: 0
        },
        createdAt: now,
        updatedAt: now
      }

      const ref = await addDoc(collection(db, COLLECTION_NAME), payload)
      const docId = ref.id
      currentConteo.value = { id: docId, ...payload }
      scannedItems.value = []
      return docId
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getConteoById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const snap = await getDoc(doc(db, COLLECTION_NAME, String(id)))
      if (!snap.exists()) return null
      currentConteo.value = { id: snap.id, ...snap.data() }
      await getScannedItems(id)
      return currentConteo.value
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getScannedItems = async (conteoId) => {
    loading.value = true
    error.value = null
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME, String(conteoId), 'scannedItems'))
      scannedItems.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      return scannedItems.value
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const recalcSummary = async (conteoId) => {
    try {
      const conteoSnap = await getDoc(doc(db, COLLECTION_NAME, String(conteoId)))
      if (!conteoSnap.exists()) return
      const conteo = { id: conteoSnap.id, ...conteoSnap.data() }
      const expected = conteo.expectedItems || []
      const scannedSnap = await getDocs(collection(db, COLLECTION_NAME, String(conteoId), 'scannedItems'))
      const scanned = scannedSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      const presentSet = new Set()
      scanned.forEach((s) => {
        if (s.matchedItemId) presentSet.add(String(s.matchedItemId))
      })

      const present = presentSet.size
      const expectedCount = expected.length
      const missing = Math.max(0, expectedCount - present)
      const extras = scanned.filter((s) => !s.matchedItemId).length

      const summary = {
        expected: expectedCount,
        scanned: scanned.length,
        present,
        missing,
        extras
      }

      await updateDoc(doc(db, COLLECTION_NAME, String(conteoId)), { summary, updatedAt: new Date().toISOString() })
      currentConteo.value = { id: conteoId, ...conteoSnap.data(), summary }
      scannedItems.value = scanned
      return summary
    } catch (err) {
      // non-fatal
      console.warn('recalcSummary error', err)
    }
  }

  const addScannedItem = async (conteoId, item) => {
    loading.value = true
    error.value = null
    try {
      // Attach inspector info from parent conteo for auditing and rule checks
      const conteoSnap = await getDoc(doc(db, COLLECTION_NAME, String(conteoId)))
      const conteoData = conteoSnap.exists() ? conteoSnap.data() : {}
      const inspectorId = String(conteoData?.inspectorId || '')
      const inspectorNombre = String(conteoData?.inspectorNombre || '')

      const payload = {
        barcode: String(item.barcode || '').trim(),
        herramienta: String(item.herramienta || '').trim(),
        marca: String(item.marca || '').trim(),
        cantidad: Number(item.cantidad || 1),
        // preserve explicit estado or leave empty
        estado: item.estado !== undefined && item.estado !== null ? String(item.estado) : '',
        comentario: String(item.comentario || '').trim(),
        matchedItemId: item.matchedItemId ? String(item.matchedItemId) : null,
        inspectorId: inspectorId,
        inspectorNombre: inspectorNombre,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const ref = await addDoc(collection(db, COLLECTION_NAME, String(conteoId), 'scannedItems'), payload)
      await recalcSummary(conteoId)
      return { id: ref.id, ...payload }
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateScannedItem = async (conteoId, scannedItemId, updates = {}) => {
    loading.value = true
    error.value = null
    try {
      // Attach inspectorId from parent conteo when updating so rules that check it succeed
      const conteoSnap = await getDoc(doc(db, COLLECTION_NAME, String(conteoId)))
      const conteoData = conteoSnap.exists() ? conteoSnap.data() : {}
      const inspectorId = conteoData?.inspectorId ? String(conteoData.inspectorId) : null

      const upd = {
        ...updates,
        inspectorId: inspectorId,
        updatedAt: new Date().toISOString()
      }

      await updateDoc(doc(db, COLLECTION_NAME, String(conteoId), 'scannedItems', String(scannedItemId)), upd)
      await recalcSummary(conteoId)
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeScannedItem = async (conteoId, scannedItemId) => {
    loading.value = true
    error.value = null
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, String(conteoId), 'scannedItems', String(scannedItemId)))
      await recalcSummary(conteoId)
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const finalizeConteo = async (conteoId) => {
    loading.value = true
    error.value = null
    try {
      const conteoSnap = await getDoc(doc(db, COLLECTION_NAME, String(conteoId)))
      if (!conteoSnap.exists()) throw new Error('Conteo no encontrado')
      const conteo = { id: conteoSnap.id, ...conteoSnap.data() }

      const scannedSnap = await getDocs(collection(db, COLLECTION_NAME, String(conteoId), 'scannedItems'))
      const scanned = scannedSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      const expected = conteo.expectedItems || []

      // Organizar scanned por matchedItemId
      const scannedByMatched = {}
      const extras = []
      scanned.forEach((s) => {
        const q = Number(s.cantidad || 1)
        if (s.matchedItemId) {
          scannedByMatched[s.matchedItemId] = (scannedByMatched[s.matchedItemId] || 0) + q
        } else {
          extras.push(s)
        }
      })

      console.debug('finalizeConteo:', { conteoId, expectedCount: expected.length, scannedCount: scanned.length, scannedByMatched })

      const batch = writeBatch(db)
      const now = new Date().toISOString()

      // Ajustar items esperados
      for (const exp of expected) {
        const expectedQty = Number.parseInt(String(exp.cantidad || 1), 10) || 1
        const scannedQtyRaw = scannedByMatched[exp.id] || 0
        const scannedQty = Number.parseInt(String(scannedQtyRaw || 0), 10) || 0
        const invRef = doc(db, INVENTARIO_COLAB, String(exp.id))

        // If not all expected items were scanned, block applying (business rule)
        if (scannedQty < expectedQty) {
          throw new Error('No todos los items esperados fueron escaneados. Imposible aplicar.')
        }

        // If all scanned, take metadata from the scanned entries (pick the most recent scan)
        const matchingScans = scanned.filter((s) => String(s.matchedItemId) === String(exp.id))
        let chosenScan = null
        if (matchingScans.length > 0) {
          chosenScan = matchingScans.reduce((best, cur) => {
            const bestTime = new Date(best?.updatedAt || best?.createdAt || 0).getTime()
            const curTime = new Date(cur?.updatedAt || cur?.createdAt || 0).getTime()
            return curTime >= bestTime ? cur : best
          }, matchingScans[0])
        }

        const newEstado = chosenScan?.estado ? String(chosenScan.estado) : (scannedQty === 0 ? 'faltante' : scannedQty < expectedQty ? 'incompleto' : 'completo')
        const payload = { cantidad: scannedQty, estado: newEstado, colaboradorId: conteo.colaboradorId, colaboradorNombre: conteo.colaboradorNombre, updatedAt: now }

        if (chosenScan) {
          // Apply captured metadata when available, prefer scan data over stored expected values
          payload.herramienta = String(chosenScan.herramienta || exp.herramienta || '')
          payload.marca = String(chosenScan.marca || exp.marca || '')
          if (chosenScan.comentario) payload.comentario = String(chosenScan.comentario)
        } else {
          // Fallback to expected metadata
          if (exp.herramienta) payload.herramienta = exp.herramienta
          if (exp.marca) payload.marca = exp.marca
          if (exp.comentario) payload.comentario = exp.comentario
        }

        console.debug('finalizeConteo: batch.set expected', { invId: String(exp.id), payload })
        batch.set(invRef, payload, { merge: true })
      }

      // Procesar extras: crear o actualizar
      for (const ex of extras) {
        const barcode = String(ex.barcode || '').trim()
        if (!barcode) continue
        const invRef = doc(db, INVENTARIO_COLAB, barcode)
        const snap = await getDoc(invRef)
        const q = Number.parseInt(String(ex.cantidad || 1), 10) || 1
        if (snap.exists()) {
          const prev = Number.parseInt(String(snap.data().cantidad || 0), 10) || 0
          const payload = { cantidad: prev + q, colaboradorId: conteo.colaboradorId, colaboradorNombre: conteo.colaboradorNombre, updatedAt: now }
          console.debug('finalizeConteo: batch.set extra existing', { invId: barcode, payload })
          batch.set(invRef, payload, { merge: true })
        } else {
          const payload = {
            barcode,
            colaboradorId: conteo.colaboradorId,
            colaboradorNombre: conteo.colaboradorNombre,
            herramienta: ex.herramienta || '',
            marca: ex.marca || '',
            cantidad: q,
            estado: 'completo',
            activo: true,
            createdAt: now,
            updatedAt: now
          }
          console.debug('finalizeConteo: batch.set extra new', { invId: barcode, payload })
          batch.set(invRef, payload)
        }
      }

      // Commit batch (con logging de errores explícito)
      try {
        await batch.commit()
      } catch (commitErr) {
        console.error('finalizeConteo: batch.commit failed', commitErr)
        throw commitErr
      }

      // Marcar conteo como aplicado
      await updateDoc(doc(db, COLLECTION_NAME, String(conteoId)), { applied: true, finishedAt: now, updatedAt: now })
      await getConteoById(conteoId)
      return { success: true }
    } catch (err) {
      error.value = mapError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    currentConteo,
    scannedItems,
    loading,
    error,
    startConteo,
    getConteoById,
    getScannedItems,
    addScannedItem,
    updateScannedItem,
    removeScannedItem,
    finalizeConteo
  }
}
