<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="icon-only" :icon="apps"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Productos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-popover
      :is-open="isModulesMenuOpen"
      side="bottom"
      alignment="start"
      @didDismiss="isModulesMenuOpen = false"
    >
      <ion-content>
        <ion-list lines="none">
          <ion-item button @click="navigateTo('/dashboard')">
            <ion-icon slot="start" :icon="home"></ion-icon>
            <ion-label>Home</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/productos')">
            <ion-icon slot="start" :icon="cube"></ion-icon>
            <ion-label>Productos</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/colaboradores')">
            <ion-icon slot="start" :icon="people"></ion-icon>
            <ion-label>Colaboradores</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/prestamos')">
            <ion-icon slot="start" :icon="swapHorizontal"></ion-icon>
            <ion-label>Préstamos</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <ion-content>
      <div class="page-container">
        <div class="page-header">
          <h2>Gestión de Productos</h2>
          <ion-button color="success" @click="openNewProductModal">
            <ion-icon slot="start" :icon="add"></ion-icon>
            Nuevo Producto
          </ion-button>
          <ion-button color="tertiary" fill="outline" @click="openQuickStockScanner">
            Ajuste rápido (scanner)
          </ion-button>
        </div>

        <div v-if="loading" class="loading-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando productos...</p>
        </div>

        <ion-list v-else-if="products.length > 0">
          <ion-item-sliding v-for="product in products" :key="product.id">
            <ion-item @click="openEditProductModal(product)">
              <ion-label>
                <h2>{{ product.nombre }}</h2>
                <p>Código: {{ product.codigoBarras || 'Sin código' }}</p>
                <p>{{ product.tipo }} - Stock actual (en almacén): {{ getRealStock(product) }}</p>
                <p>
                  Prestado (fuera): {{ getLoanedStock(product.id) }} ·
                  Stock total: {{ getTotalStock(product) }} ·
                  <span :class="getRealStock(product) <= 0 ? 'stock-danger' : 'stock-ok'">
                    Disponible real: {{ getAvailableStock(product) }}
                  </span>
                </p>
                <p class="price">{{ product.precio ? '$' + product.precio : 'Sin precio' }}</p>
              </ion-label>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" @click="requestDeleteFromList(product.id)">
                Eliminar
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>

        <div v-else class="empty-state">
          <p>No hay productos registrados</p>
        </div>
      </div>
    </ion-content>

    <!-- Modal para nuevo/editar producto -->
    <ion-modal
      :is-open="isModalOpen"
      css-class="product-modal"
      @did-dismiss="closeModal"
    >
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="closeModal">Cancelar</ion-button>
          </ion-buttons>
          <ion-title>{{ isEditing ? 'Editar Producto' : 'Nuevo Producto' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="saveProduct" :color="saveButtonColor" :disabled="!isFormValid || loading">
              <ion-icon v-if="saveSuccess" slot="start" :icon="checkmarkCircle"></ion-icon>
              {{ saveButtonLabelShort }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form">
          <div class="form-card">
          <ion-item>
            <ion-label position="floating">Nombre del Producto</ion-label>
            <ion-input
              v-model="formData.nombre"
              type="text"
              :legacy="true"
              @ionBlur="setTouched('nombre')"
            ></ion-input>
          </ion-item>
          <p v-if="touched.nombre && nombreError" class="field-error">{{ nombreError }}</p>

          <ion-item>
            <ion-label position="floating">Descripción</ion-label>
            <ion-textarea v-model="formData.descripcion" rows="3" :legacy="true"></ion-textarea>
          </ion-item>

          <ion-item>
            <ion-label position="floating">Código de Barras</ion-label>
            <ion-input
              v-model="formData.codigoBarras"
              type="text"
              readonly
              disabled
              :legacy="true"
            ></ion-input>
          </ion-item>
          <p class="field-hint">El código de barras se genera automáticamente y no puede editarse.</p>
          <ion-button
            v-if="isEditing"
            expand="block"
            fill="outline"
            class="print-barcode-button"
            :disabled="isPrinting"
            color="primary"
            @click="shareLabelToTinyPrint"
          >
            <ion-icon slot="start" :icon="print"></ion-icon>
            {{ isPrinting ? 'Generando etiqueta...' : 'Imprimir en TinyPrint' }}
          </ion-button>
          <p v-if="printError" class="field-error">{{ printError }}</p>
          </div>

          <div class="form-card form-section">
            <label class="section-label">Tipo de Producto</label>
            <ion-radio-group v-model="formData.tipo">
              <ion-item>
                <ion-label>RECURSO</ion-label>
                <ion-radio slot="start" value="RECURSO"></ion-radio>
              </ion-item>
              <ion-item>
                <ion-label>HERRAMIENTA</ion-label>
                <ion-radio slot="start" value="HERRAMIENTA"></ion-radio>
              </ion-item>
            </ion-radio-group>
          </div>

          <div class="form-card form-grid">
            <div>
              <ion-item>
                <ion-label position="floating">Stock/Cantidad</ion-label>
                <ion-input
                  v-model.number="formData.stock"
                  type="number"
                  min="0"
                  :legacy="true"
                  @ionBlur="setTouched('stock')"
                ></ion-input>
              </ion-item>
              <p v-if="touched.stock && stockError" class="field-error">{{ stockError }}</p>
            </div>

            <div>
              <ion-item>
                <ion-label position="floating">Precio (Opcional)</ion-label>
                <ion-input
                  v-model.number="formData.precio"
                  type="number"
                  min="0"
                  step="0.01"
                  :legacy="true"
                  @ionBlur="setTouched('precio')"
                ></ion-input>
              </ion-item>
              <p v-if="touched.precio && precioError" class="field-error">{{ precioError }}</p>
            </div>
          </div>

          <div v-if="modalError || error" class="error-message">
            {{ modalError || error }}
          </div>

          <div v-if="isEditing" class="modal-actions">
            <ion-button expand="block" color="danger" @click="confirmDelete">
              Eliminar Producto
            </ion-button>
          </div>
        </div>
      </ion-content>
      <ion-footer class="modal-footer">
        <ion-toolbar>
          <ion-button expand="block" @click="saveProduct" :color="saveButtonColor" :disabled="!isFormValid || loading">
            <ion-icon v-if="saveSuccess" slot="start" :icon="checkmarkCircle"></ion-icon>
            {{ saveButtonLabelFull }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>


    <!-- Modal de confirmación para eliminar -->
    <ion-alert
      :is-open="showDeleteConfirm"
      header="Confirmar Eliminación"
      message="¿Estás seguro de que deseas eliminar este producto?"
      :buttons="deleteConfirmButtons"
    ></ion-alert>

    <ion-toast
      :is-open="showSaveToast"
      :message="toastMessage"
      color="success"
      position="top"
      :duration="1800"
      @did-dismiss="showSaveToast = false"
    ></ion-toast>

    <ion-toast
      :is-open="showPrintToast"
      :message="printToastMessage"
      :color="printToastColor"
      position="top"
      :duration="2000"
      @did-dismiss="showPrintToast = false"
    ></ion-toast>

    <!-- Quick stock modal -->
    <ion-modal :is-open="quickModalOpen" css-class="quick-stock-modal" @did-dismiss="() => { quickModalOpen = false }">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="quickModalOpen = false">Cerrar</ion-button>
          </ion-buttons>
          <ion-title>Ajuste rápido de stock</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-form">
          <div v-if="quickScannerError" class="error-message">{{ quickScannerError }}</div>
          <div v-if="quickProduct">
            <h3>{{ quickProduct.nombre }}</h3>
            <p>Código: {{ quickProduct.codigoBarras || '-' }}</p>
            <p>Stock actual: {{ quickProduct.stock || 0 }}</p>

            <ion-item>
              <ion-label>Tipo</ion-label>
              <ion-segment
                :value="quickAdjust"
                @ionChange="quickAdjust = $event.detail.value || 'add'"
              >
                <ion-segment-button value="add">Entrada (+)</ion-segment-button>
                <ion-segment-button value="subtract">Salida (-)</ion-segment-button>
              </ion-segment>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Cantidad</ion-label>
              <ion-input v-model.number="quickCantidad" type="number" min="1" :legacy="true"></ion-input>
            </ion-item>

            <ion-button expand="block" @click="applyQuickStockAdjustment">Confirmar ajuste</ion-button>
          </div>
          <div v-else class="empty-state">
            <p>Escanea un código para seleccionar un producto.</p>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
  </template>

  <script setup>
import { ref, onMounted, computed } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import JsBarcode from 'jsbarcode'
import { useProducts } from '../composables/useProducts'
import { useMovimientos } from '../composables/useMovimientos'
import { usePrestamos } from '../composables/usePrestamos'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonModal,
  IonFooter,
  IonInput,
  IonTextarea,
  IonRadioGroup,
  IonRadio,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonAlert,
  IonToast,
  onIonViewWillLeave
} from '@ionic/vue'
import { add, checkmarkCircle, apps, home, cube, people, swapHorizontal, print } from 'ionicons/icons'

const router = useRouter()
const { products, loading, error, createProduct, getProducts, updateProduct, deleteProduct: deleteProductAPI } = useProducts()
const { logMovimiento } = useMovimientos()
const { getPrestamos } = usePrestamos()

const isModulesMenuOpen = ref(false)
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentProductId = ref(null)
const showDeleteConfirm = ref(false)
const modalError = ref('')
const saveSuccess = ref(false)
const showSaveToast = ref(false)
const toastMessage = ref('')
const isPrinting = ref(false)
const printError = ref('')
const showPrintToast = ref(false)
const printToastMessage = ref('')
const printToastColor = ref('success')
const touched = ref({
  nombre: false,
  stock: false,
  precio: false
})
const loanedStockMap = ref({})
const sessionGeneratedCodes = ref(new Set())

const formData = ref({
  nombre: '',
  descripcion: '',
  tipo: 'RECURSO',
  stock: 0,
  precio: null,
  codigoBarras: ''
})

const LABEL_WIDTH_PX = 320
const LABEL_HEIGHT_PX = 160
const LABEL_RENDER_SCALE = 3

const generateBarcode = () => {
  // Codigo numerico de 8 digitos para mejorar lectura en escaner termico.
  // Validar unicidad contra codigos existentes en BD y en sesion actual.
  const existingCodes = new Set([
    ...sessionGeneratedCodes.value,
    ...products.value.map(p => p.codigoBarras).filter(Boolean)
  ])

  let codigo = ''
  let attempts = 0
  const maxAttempts = 20

  while (attempts < maxAttempts) {
    codigo = Math.floor(10000000 + Math.random() * 90000000).toString()
    if (!existingCodes.has(codigo)) {
      sessionGeneratedCodes.value.add(codigo)
      return codigo
    }
    attempts++
  }

  // Si fallamos 20 intentos, usar timestamp como fallback para garantizar unicidad
  codigo = Math.floor(10000000 + (Date.now() % 90000000)).toString()
  sessionGeneratedCodes.value.add(codigo)
  return codigo
}

const resetForm = () => {
  modalError.value = ''
  saveSuccess.value = false
  printError.value = ''
  touched.value = {
    nombre: false,
    stock: false,
    precio: false
  }
  formData.value = {
    nombre: '',
    descripcion: '',
    tipo: 'RECURSO',
    stock: 0,
    precio: null,
    codigoBarras: ''
  }
}

const setTouched = (field) => {
  touched.value[field] = true
}

const nombreError = computed(() => {
  return formData.value.nombre?.trim() ? '' : 'El nombre del producto es obligatorio.'
})

const stockError = computed(() => {
  const stock = Number(formData.value.stock)
  if (!Number.isFinite(stock)) {
    return 'El stock debe ser un numero.'
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return 'El stock debe ser un numero entero mayor o igual a 0.'
  }
  return ''
})

const precioError = computed(() => {
  const precioRaw = formData.value.precio
  if (precioRaw === '' || precioRaw === null || precioRaw === undefined) {
    return ''
  }
  const precio = Number(precioRaw)
  if (!Number.isFinite(precio)) {
    return 'El precio debe ser un numero valido.'
  }
  if (precio < 0) {
    return 'El precio no puede ser negativo.'
  }
  return ''
})

const isFormValid = computed(() => {
  return !nombreError.value && !stockError.value && !precioError.value
})

const saveButtonColor = computed(() => {
  return saveSuccess.value ? 'success' : 'primary'
})

const saveButtonLabelShort = computed(() => {
  if (saveSuccess.value) {
    return 'Guardado'
  }
  return loading.value ? 'Guardando...' : 'Guardar'
})

const saveButtonLabelFull = computed(() => {
  if (saveSuccess.value) {
    return 'Guardado correctamente'
  }
  return loading.value ? 'Guardando...' : 'Guardar Producto'
})

const calculateLoanedStock = (prestamosActivos = []) => {
  const map = {}

  prestamosActivos.forEach((prestamo) => {
    if (prestamo.estado !== 'activo') {
      return
    }

    ;(prestamo.detalles || []).forEach((item) => {
      const total = Number(item.cantidad || 0)
      const devuelto = Number(item.cantidadDevuelta || 0)
      const pendiente = Math.max(0, total - devuelto)

      if (!item.productoId || pendiente <= 0) {
        return
      }

      map[item.productoId] = (map[item.productoId] || 0) + pendiente
    })
  })

  loanedStockMap.value = map
}

const getLoanedStock = (productId) => {
  return Number(loanedStockMap.value[productId] || 0)
}

const getRealStock = (product) => {
  return Number(product.stock || 0)
}

const getTotalStock = (product) => {
  return getRealStock(product) + getLoanedStock(product.id)
}

const getAvailableStock = (product) => {
  // El stock real ya viene descontado al prestar desde backend.
  return getRealStock(product)
}

const refreshProductsAndLoanedStock = async () => {
  const [allProducts, allPrestamos] = await Promise.all([getProducts(), getPrestamos()])
  calculateLoanedStock(allPrestamos)
  return allProducts
}

const openModulesMenu = () => {
  isModulesMenuOpen.value = true
}

const navigateTo = async (path) => {
  isModulesMenuOpen.value = false
  await router.push(path)
}

const openNewProductModal = () => {
  isEditing.value = false
  currentProductId.value = null
  resetForm()
  formData.value.codigoBarras = generateBarcode()
  isModalOpen.value = true
}

const openEditProductModal = (product) => {
  isEditing.value = true
  currentProductId.value = product.id
  printError.value = ''
  formData.value = {
    nombre: product.nombre,
    descripcion: product.descripcion || '',
    tipo: product.tipo,
    stock: product.stock,
    precio: product.precio || null,
    codigoBarras: product.codigoBarras || ''
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  showDeleteConfirm.value = false
  resetForm()
}

const buildLabelDataUrl = (code) => {
  const canvas = document.createElement('canvas')
  canvas.width = LABEL_WIDTH_PX * LABEL_RENDER_SCALE
  canvas.height = LABEL_HEIGHT_PX * LABEL_RENDER_SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo crear el lienzo de impresion.')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const barcodeCanvas = document.createElement('canvas')
  barcodeCanvas.width = LABEL_WIDTH_PX * LABEL_RENDER_SCALE
  barcodeCanvas.height = 104 * LABEL_RENDER_SCALE
  const barcodeCtx = barcodeCanvas.getContext('2d')
  if (!barcodeCtx) {
    throw new Error('No se pudo crear el lienzo del codigo de barras.')
  }

  barcodeCtx.fillStyle = '#ffffff'
  barcodeCtx.fillRect(0, 0, barcodeCanvas.width, barcodeCanvas.height)

  JsBarcode(barcodeCanvas, code, {
    format: 'CODE128',
    displayValue: false,
    marginLeft: 34,
    marginRight: 34,
    marginTop: 8,
    marginBottom: 8,
    height: 86 * LABEL_RENDER_SCALE,
    width: 2.4,
    lineColor: '#000000',
    background: '#ffffff'
  })

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    barcodeCanvas,
    0,
    0,
    barcodeCanvas.width,
    barcodeCanvas.height,
    0,
    8 * LABEL_RENDER_SCALE,
    canvas.width,
    104 * LABEL_RENDER_SCALE
  )

  ctx.fillStyle = '#000000'
  ctx.font = '24px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(code, canvas.width / 2, canvas.height - 6)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const value = luminance < 210 ? 0 : 255
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)

  return canvas.toDataURL('image/png')
}

const buildLabelFileUri = async (code) => {
  const dataUrl = buildLabelDataUrl(code)
  const base64Data = dataUrl.split(',')[1]

  if (!base64Data) {
    throw new Error('No se pudo generar la imagen de impresión.')
  }

  const fileName = `tinyprint-${code}.png`
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Cache,
    recursive: true
  })

  return result.uri
}

const shareLabelToTinyPrint = async () => {
  printError.value = ''
  showPrintToast.value = false

  if (!isEditing.value) {
    return
  }

  const barcode = (formData.value.codigoBarras || '').trim()
  if (!barcode) {
    printError.value = 'El producto no tiene codigo de barras.'
    return
  }

  if (!Capacitor?.isNativePlatform?.()) {
    printError.value = 'La impresion solo funciona en la app instalada.'
    return
  }

  try {
    isPrinting.value = true
    const fileUri = await buildLabelFileUri(barcode)
    
    await Share.share({
      title: 'Etiqueta de producto',
      text: barcode,
      files: [fileUri],
      dialogTitle: 'Compartir etiqueta con TinyPrint'
    })
    
    // Share completado exitosamente
    printToastMessage.value = `Etiqueta enviada a TinyPrint - ${barcode}`
    printToastColor.value = 'success'
    showPrintToast.value = true
  } catch (err) {
    // Usuario canceló o error
    const errorMsg = err?.message || 'No se pudo generar la etiqueta.'
    
    // Solo mostrar toast si es un error real, no cancelación
    if (!errorMsg.includes('cancel') && !errorMsg.includes('dismiss')) {
      printError.value = errorMsg
      printToastMessage.value = errorMsg
      printToastColor.value = 'danger'
      showPrintToast.value = true
    }
  } finally {
    isPrinting.value = false
  }
}

const resetPageUiState = () => {
  isModulesMenuOpen.value = false
  isModalOpen.value = false
  showDeleteConfirm.value = false
  showSaveToast.value = false
  currentProductId.value = null
  resetForm()
}

// Quick stock scanner state
const isQuickScannerBusy = ref(false)
const isQuickScannerInstalling = ref(false)
const quickScannerError = ref('')
const quickModalOpen = ref(false)
const quickProduct = ref(null)
const quickAdjust = ref('add') // 'add' or 'subtract'
const quickCantidad = ref(1)

const SCANNER_TIMEOUT_MS = 15000
const DEBOUNCE_DELAY_MS = 800
const MODULE_INSTALL_TIMEOUT_MS = 20000
const MODULE_INSTALL_POLL_MS = 1000

const ensureGoogleScannerModuleQuick = async () => {
  const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
  if (moduleStatus.available) return true

  isQuickScannerInstalling.value = true
  quickScannerError.value = 'Instalando modulo de escaneo de Google...'
  await BarcodeScanner.installGoogleBarcodeScannerModule()

  const started = Date.now()
  while (Date.now() - started < MODULE_INSTALL_TIMEOUT_MS) {
    const status = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
    if (status.available) {
      isQuickScannerInstalling.value = false
      quickScannerError.value = ''
      return true
    }
    await new Promise((r) => setTimeout(r, MODULE_INSTALL_POLL_MS))
  }

  isQuickScannerInstalling.value = false
  quickScannerError.value = 'La instalacion del modulo sigue en progreso, intenta de nuevo en unos segundos.'
  return false
}

const handleQuickScannedBarcode = async (decodedText) => {
  quickScannerError.value = ''
  const code = String(decodedText || '').trim()
  if (!code) {
    quickScannerError.value = 'Codigo invalido detectado.'
    return
  }

  // buscar en productos por codigoBarras
  const found = products.value.find((p) => String(p.codigoBarras || '').trim() === code)
  if (!found) {
    quickScannerError.value = `No se encontro producto para el codigo ${code}`
    return
  }

  quickProduct.value = found
  quickCantidad.value = 1
  quickAdjust.value = 'add'
  quickModalOpen.value = true
}

const openQuickStockScanner = async () => {
  quickScannerError.value = ''
  if (isQuickScannerBusy.value) return

  if (!Capacitor?.isNativePlatform?.()) {
    quickScannerError.value = 'El escaneo solo funciona en la app instalada.'
    return
  }

  isQuickScannerBusy.value = true
  try {
    const { supported } = await BarcodeScanner.isSupported()
    if (!supported) {
      quickScannerError.value = 'Este dispositivo no soporta escaneo de codigos.'
      return
    }

    const permissions = await BarcodeScanner.requestPermissions()
    if (permissions.camera !== 'granted') {
      quickScannerError.value = 'Necesitas permitir acceso a la camara.'
      return
    }

    if (Capacitor.getPlatform() === 'android') {
      const moduleReady = await ensureGoogleScannerModuleQuick()
      if (!moduleReady) return
    }

    let scanTimeout = false
    let scannerTimeoutId = setTimeout(() => {
      scanTimeout = true
      BarcodeScanner.stopScan().catch(() => {})
      quickScannerError.value = 'Tiempo de escaneo agotado (15s).'
      isQuickScannerBusy.value = false
    }, SCANNER_TIMEOUT_MS)

    const result = await BarcodeScanner.scan({
      formats: [
        BarcodeFormat.Code128,
        BarcodeFormat.Code39,
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.Itf
      ]
    })

    if (scannerTimeoutId) {
      clearTimeout(scannerTimeoutId)
      scannerTimeoutId = null
    }

    if (scanTimeout) return

    const first = result?.barcodes?.[0]
    const val = first?.rawValue || first?.displayValue || ''
    if (!val) {
      quickScannerError.value = 'No se detecto ningun codigo.'
      return
    }

    await handleQuickScannedBarcode(val)
  } catch (err) {
    const msg = err?.message || ''
    if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('timeout')) {
      quickScannerError.value = err?.message || 'No se pudo iniciar el escaner.'
    }
  } finally {
    isQuickScannerBusy.value = false
    await new Promise((r) => setTimeout(r, DEBOUNCE_DELAY_MS))
  }
}

const applyQuickStockAdjustment = async () => {
  quickScannerError.value = ''
  if (!quickProduct.value) return
  const cantidad = Number(quickCantidad.value)
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    quickScannerError.value = 'La cantidad debe ser un entero mayor a 0.'
    return
  }

  const current = Number(quickProduct.value.stock || 0)
  let next = current
  if (quickAdjust.value === 'add') {
    next = current + cantidad
  } else {
    next = current - cantidad
    if (next < 0) {
      quickScannerError.value = 'Operacion invalida: el stock no puede quedar negativo.'
      return
    }
  }

  try {
    await updateProduct(quickProduct.value.id, { stock: next })
    // Registrar movimiento en la colección 'movimientos' para auditoría
    try {
      const userJSON = localStorage.getItem('user')
      const usuario = userJSON ? JSON.parse(userJSON) : null
      const usuarioId = usuario?.uid || usuario?.id || null
      const usuarioNombre = usuario?.nombre || usuario?.email || 'Usuario'
      await logMovimiento({
        productoId: quickProduct.value.id,
        productoNombre: quickProduct.value.nombre,
        cantidad: quickAdjust.value === 'add' ? cantidad : -cantidad,
        tipo: quickAdjust.value === 'add' ? 'entrada' : 'salida',
        motivo: 'Ajuste rapido',
        usuarioId,
        usuarioNombre
      })
    } catch (mErr) {
      // no bloquear la operación principal si falla el registro, pero loguear
      console.warn('No se pudo registrar movimiento:', mErr)
    }
    await refreshProductsAndLoanedStock()
    quickModalOpen.value = false
    quickProduct.value = null
    await showSaveToastFn(`Stock actualizado: ${next}`)
  } catch (err) {
    quickScannerError.value = err?.message || 'No se pudo actualizar el stock.'
  }
}

const showSaveToastFn = async (message) => {
  toastMessage.value = message
  showSaveToast.value = true
}

const normalizeProductPayload = () => {
  const nombre = formData.value.nombre?.trim() || ''
  const descripcion = formData.value.descripcion?.trim() || ''
  const tipo = formData.value.tipo === 'HERRAMIENTA' ? 'HERRAMIENTA' : 'RECURSO'
  const stock = Number(formData.value.stock)
  const precioRaw = formData.value.precio
  const precio = precioRaw === '' || precioRaw === null || precioRaw === undefined
    ? null
    : Number(precioRaw)

  return {
    nombre,
    descripcion,
    tipo,
    stock: Number.isFinite(stock) ? stock : 0,
    precio: Number.isFinite(precio) ? precio : null,
    codigoBarras: (formData.value.codigoBarras || '').trim() || generateBarcode()
  }
}

const saveProduct = async () => {
  try {
    modalError.value = ''
    saveSuccess.value = false
    touched.value = {
      nombre: true,
      stock: true,
      precio: true
    }

    if (!isFormValid.value) {
      return
    }

    const payload = normalizeProductPayload()

    if (isEditing.value) {
      await updateProduct(currentProductId.value, payload)
    } else {
      await createProduct(payload)
    }

    saveSuccess.value = true
    toastMessage.value = isEditing.value
      ? 'Producto actualizado correctamente.'
      : 'Producto creado correctamente.'
    showSaveToast.value = true

    await new Promise((resolve) => setTimeout(resolve, 500))
    await refreshProductsAndLoanedStock()
    closeModal()
  } catch (err) {
    modalError.value = 'No se pudo guardar el producto. Intenta de nuevo.'
    console.error('Error guardando producto:', err)
  }
}

const confirmDelete = () => {
  showDeleteConfirm.value = true
}

const requestDeleteFromList = (productId) => {
  currentProductId.value = productId
  showDeleteConfirm.value = true
}

const deleteConfirmButtons = [
  {
    text: 'Cancelar',
    role: 'cancel'
  },
  {
    text: 'Eliminar',
    role: 'destructive',
    handler: async () => {
      try {
        await deleteProductAPI(currentProductId.value)
        await refreshProductsAndLoanedStock()
        closeModal()
      } catch (err) {
        console.error('Error eliminando producto:', err)
      }
    }
  }
]

onMounted(async () => {
  await refreshProductsAndLoanedStock()
})

onIonViewWillLeave(() => {
  resetPageUiState()
})

onBeforeRouteLeave(() => {
  resetPageUiState()
})
</script>

<style scoped>
.page-container {
  padding: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.modules-trigger {
  --color: #ffffff;
}

.page-header h2 {
  margin: 0;
  flex: 1;
}

.empty-state,
.loading-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.price {
  font-weight: 600;
  color: #5f8fb8;
}

.stock-ok {
  color: #047857;
  font-weight: 600;
}

.stock-danger {
  color: #b91c1c;
  font-weight: 700;
}

.modal-form {
  padding: 1rem 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

:global(ion-modal.product-modal) {
  --width: min(760px, 92vw);
  --height: min(82vh, 780px);
  --border-radius: 18px;
  --box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3);
  --backdrop-opacity: 0.42;
}


:global(ion-modal.product-modal::part(content)) {
  overflow: hidden;
}

.modal-content {
  --padding-bottom: 8px;
}

.form-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.25rem 0.5rem;
}

.print-barcode-button {
  margin-top: 0.5rem;
  height: 42px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-section {
  padding-top: 0.75rem;
}

.section-label {
  font-weight: 600;
  color: #1f2937;
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.error-message {
  background-color: #fee2e2;
  color: #7f1d1d;
  padding: 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  border-left: 4px solid #b45757;
}

.field-error {
  margin: -0.5rem 0 0.25rem;
  color: #b91c1c;
  font-size: 0.8rem;
  padding: 0 0.5rem;
}

.field-hint {
  margin: 0.35rem 0 0;
  color: #6b7280;
  font-size: 0.8rem;
}

.modal-footer-actions {
  margin-top: 0.25rem;
}

.modal-footer {
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.modal-footer ion-toolbar {
  --background: #ffffff;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 10px;
  --padding-bottom: 12px;
}

.modal-actions {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .page-header ion-button {
    width: 100%;
  }

  :global(ion-modal.product-modal) {
    --width: 96vw;
    --height: 88vh;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
