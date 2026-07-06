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

const PRODUCTS_COLLECTION = 'productos_nuevos'
const products = ref([])
const loading = ref(false)
const error = ref(null)

export const AREAS_TALLER = ['OFICINA', 'BODEGA', 'SEGUNDO_PISO']
export const AREA_LABELS = {
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  SEGUNDO_PISO: 'Segundo Piso'
}

const VALID_CATEGORIAS = ['UNIDAD', 'FRACCIONABLE', 'HERRAMIENTA']

const mapProductsErrorMessage = (err) => {
  const code = err?.code || ''
  const message = String(err?.message || '')

  if (code === 'permission-denied' || message.includes('PERMISSION_DENIED') || message.includes('Missing or insufficient permissions')) {
    return 'No tienes permisos para guardar productos. Verifica que tu documento en usuarios/{uid} tenga rol "admin" y que las reglas de Firestore esten publicadas.'
  }

  return err?.message || 'Ocurrio un error al gestionar productos.'
}

const toNonNegativeInteger = (value, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < 0) {
    return fallback
  }
  return number
}

const normalizeAreaKey = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (raw === 'SEGUNDO_PISO' || raw === 'SEGUNDOPISO') return 'SEGUNDO_PISO'
  if (raw === 'BODEGA') return 'BODEGA'
  return 'OFICINA'
}

const normalizeCategoriaControl = (categoriaRaw, legacyTipoRaw = '') => {
  const categoria = String(categoriaRaw || '').trim().toUpperCase()
  const legacyTipo = String(legacyTipoRaw || '').trim().toUpperCase()

  if (categoria === 'HERRAMIENTA' || legacyTipo === 'HERRAMIENTA') {
    return 'HERRAMIENTA'
  }

  if (categoria === 'FRACCIONABLE' || categoria === 'ENVASE') {
    return 'FRACCIONABLE'
  }

  return 'UNIDAD'
}

const getUnidadStock = (categoriaControl) => {
  if (categoriaControl === 'FRACCIONABLE') return 'ENVASE'
  if (categoriaControl === 'HERRAMIENTA') return 'UNIDAD'
  return 'PIEZA'
}

const emptyStockPorArea = () => AREAS_TALLER.reduce((acc, area) => {
  acc[area] = { stock: 0, stockEmpezado: 0 }
  return acc
}, {})

const normalizeStockPorArea = (payload = {}, categoriaControl = 'UNIDAD') => {
  const result = emptyStockPorArea()
  const source = payload.stockPorArea && typeof payload.stockPorArea === 'object'
    ? payload.stockPorArea
    : null

  if (source) {
    for (const [rawArea, data] of Object.entries(source)) {
      const area = normalizeAreaKey(rawArea)
      result[area] = {
        stock: toNonNegativeInteger(data?.stock),
        stockEmpezado: categoriaControl === 'FRACCIONABLE'
          ? toNonNegativeInteger(data?.stockEmpezado)
          : 0
      }
    }
  } else {
    // Migracion automatica: todo el stock legado pasa a Oficina.
    result.OFICINA = {
      stock: toNonNegativeInteger(payload.stock),
      stockEmpezado: categoriaControl === 'FRACCIONABLE'
        ? toNonNegativeInteger(payload.stockEmpezado)
        : 0
    }
  }

  if (categoriaControl !== 'FRACCIONABLE') {
    for (const area of AREAS_TALLER) {
      result[area].stockEmpezado = 0
    }
  }

  return result
}

const getTotalsFromStockPorArea = (stockPorArea = {}) => {
  return AREAS_TALLER.reduce((totals, area) => {
    totals.stock += toNonNegativeInteger(stockPorArea?.[area]?.stock)
    totals.stockEmpezado += toNonNegativeInteger(stockPorArea?.[area]?.stockEmpezado)
    return totals
  }, { stock: 0, stockEmpezado: 0 })
}

const normalizeProductData = (productData = {}, { partial = false } = {}) => {
  const payload = { ...productData }

  if (partial) {
    const updates = {}

    if ('nombre' in payload) updates.nombre = String(payload.nombre || '').trim()
    if ('descripcion' in payload) updates.descripcion = String(payload.descripcion || '').trim()
    if ('codigoBarras' in payload) updates.codigoBarras = String(payload.codigoBarras || '').trim()
    if ('activo' in payload) updates.activo = payload.activo !== false
    if ('generaAdeudo' in payload) updates.generaAdeudo = payload.generaAdeudo === false ? false : true
    if ('stockMinimo' in payload) updates.stockMinimo = toNonNegativeInteger(payload.stockMinimo)
    if ('precio' in payload) {
      const precio = Number(payload.precio)
      updates.precio = payload.precio === '' || payload.precio === null || payload.precio === undefined
        ? null
        : Number.isFinite(precio) && precio >= 0
          ? precio
          : null
    }

    const hasTipo = 'tipo' in payload || 'tipoActual' in payload
    const hasCategoria = 'categoriaControl' in payload || 'categoriaControlActual' in payload
    const categoriaControl = normalizeCategoriaControl(
      hasCategoria ? (payload.categoriaControl ?? payload.categoriaControlActual) : undefined,
      hasTipo ? (payload.tipo ?? payload.tipoActual) : undefined
    )

    if (hasTipo || hasCategoria) {
      updates.categoriaControl = categoriaControl
      // Compatibilidad interna: otros modulos aun pueden leer tipo, pero ya no se captura en el formulario.
      updates.tipo = categoriaControl === 'HERRAMIENTA' ? 'HERRAMIENTA' : 'RECURSO'
      updates.unidadStock = getUnidadStock(categoriaControl)
    }

    if ('stockPorArea' in payload || 'stock' in payload || 'stockEmpezado' in payload) {
      const stockPorArea = normalizeStockPorArea(payload, categoriaControl)
      const totals = getTotalsFromStockPorArea(stockPorArea)
      updates.stockPorArea = stockPorArea
      updates.stock = totals.stock
      updates.stockEmpezado = categoriaControl === 'FRACCIONABLE' ? totals.stockEmpezado : 0
    }

    return updates
  }

  const categoriaControl = normalizeCategoriaControl(payload.categoriaControl, payload.tipo)
  // Compatibilidad interna: el usuario ya no captura tipo de producto.
  const tipo = categoriaControl === 'HERRAMIENTA' ? 'HERRAMIENTA' : 'RECURSO'
  const precio = Number(payload.precio)
  const stockPorArea = normalizeStockPorArea(payload, categoriaControl)
  const totals = getTotalsFromStockPorArea(stockPorArea)

  return {
    nombre: String(payload.nombre || '').trim(),
    descripcion: String(payload.descripcion || '').trim(),
    tipo,
    categoriaControl: VALID_CATEGORIAS.includes(categoriaControl) ? categoriaControl : 'UNIDAD',
    unidadStock: getUnidadStock(categoriaControl),
    stockPorArea,
    // Campos de compatibilidad/agregado para vistas anteriores.
    stock: totals.stock,
    stockEmpezado: categoriaControl === 'FRACCIONABLE' ? totals.stockEmpezado : 0,
    stockMinimo: toNonNegativeInteger(payload.stockMinimo),
    precio: payload.precio === '' || payload.precio === null || payload.precio === undefined
      ? null
      : Number.isFinite(precio) && precio >= 0
        ? precio
        : null,
    codigoBarras: String(payload.codigoBarras || '').trim(),
    activo: payload.activo === false ? false : true,
    generaAdeudo: payload.generaAdeudo === false ? false : true
  }
}

const validateProduct = (product) => {
  if (!product.nombre) {
    throw new Error('El nombre del producto es obligatorio.')
  }

  if (!VALID_CATEGORIAS.includes(product.categoriaControl)) {
    throw new Error('Categoria de control invalida.')
  }

  const stockPorArea = normalizeStockPorArea(product, product.categoriaControl)
  for (const area of AREAS_TALLER) {
    const areaStock = stockPorArea[area]
    if (!Number.isInteger(areaStock.stock) || areaStock.stock < 0) {
      throw new Error(`El stock de ${AREA_LABELS[area]} debe ser un entero mayor o igual a 0.`)
    }
    if (!Number.isInteger(areaStock.stockEmpezado) || areaStock.stockEmpezado < 0) {
      throw new Error(`El stock empezado de ${AREA_LABELS[area]} debe ser un entero mayor o igual a 0.`)
    }
  }

  if (!Number.isInteger(product.stockMinimo) || product.stockMinimo < 0) {
    throw new Error('El minimo para alerta de stock bajo debe ser un entero mayor o igual a 0.')
  }

  if (product.precio !== null && (!Number.isFinite(Number(product.precio)) || Number(product.precio) < 0)) {
    throw new Error('El precio debe ser mayor o igual a 0.')
  }
}

const mapProductDoc = (document) => {
  const data = document.data()
  const categoriaControl = normalizeCategoriaControl(data.categoriaControl, data.tipo)
  const stockPorArea = normalizeStockPorArea(data, categoriaControl)
  const totals = getTotalsFromStockPorArea(stockPorArea)
  return {
    id: document.id,
    ...data,
    categoriaControl,
    tipo: categoriaControl === 'HERRAMIENTA' ? 'HERRAMIENTA' : 'RECURSO',
    stockPorArea,
    stock: totals.stock,
    stockEmpezado: categoriaControl === 'FRACCIONABLE' ? totals.stockEmpezado : 0,
    stockMinimo: toNonNegativeInteger(data.stockMinimo)
  }
}

export function useProducts() {
  const createProduct = async (productData) => {
    loading.value = true
    error.value = null
    try {
      const normalizedProduct = normalizeProductData(productData)
      validateProduct(normalizedProduct)

      const nowIso = new Date().toISOString()
      const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), {
        ...normalizedProduct,
        createdAt: nowIso,
        updatedAt: nowIso
      })
      return docRef.id
    } catch (err) {
      error.value = mapProductsErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }


  const migrateLegacyProductsToStockPorArea = async () => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION))
      const updates = []

      snapshot.forEach((productDoc) => {
        const data = productDoc.data()
        if (data.stockPorArea && typeof data.stockPorArea === 'object') return

        const categoriaControl = normalizeCategoriaControl(data.categoriaControl, data.tipo)
        const stockPorArea = normalizeStockPorArea(data, categoriaControl)
        const totals = getTotalsFromStockPorArea(stockPorArea)
        updates.push(updateDoc(doc(db, PRODUCTS_COLLECTION, productDoc.id), {
          stockPorArea,
          stock: totals.stock,
          stockEmpezado: categoriaControl === 'FRACCIONABLE' ? totals.stockEmpezado : 0,
          updatedAt: new Date().toISOString()
        }))
      })

      await Promise.all(updates)
      return updates.length
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
      const constraints = []
      if (filters.tipo) constraints.push(where('tipo', '==', filters.tipo))
      if (filters.categoriaControl) constraints.push(where('categoriaControl', '==', filters.categoriaControl))
      if (filters.activo !== undefined) constraints.push(where('activo', '==', filters.activo))

      const q = constraints.length
        ? query(collection(db, PRODUCTS_COLLECTION), ...constraints)
        : query(collection(db, PRODUCTS_COLLECTION))

      const snapshot = await getDocs(q)
      products.value = snapshot.docs.map(mapProductDoc)

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
      const docRef = await getDoc(doc(db, PRODUCTS_COLLECTION, id))
      if (docRef.exists()) {
        return mapProductDoc(docRef)
      }
      return null
    } catch (err) {
      error.value = mapProductsErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProduct = async (id, updates, options = {}) => {
    loading.value = true
    error.value = null
    try {
      const normalizedUpdates = normalizeProductData(updates, { partial: options.partial === true })
      if (options.partial !== true) {
        validateProduct(normalizedUpdates)
      }

      await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
        ...normalizedUpdates,
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
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, id))
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
    migrateLegacyProductsToStockPorArea,
    getProductById,
    updateProduct,
    deleteProduct,
    AREAS_TALLER,
    AREA_LABELS
  }
}
