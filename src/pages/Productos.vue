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
              :legacy="true"
            ></ion-input>
          </ion-item>
          <ion-button
            v-if="isEditing"
            expand="block"
            fill="outline"
            class="print-barcode-button"
            :disabled="isPrinting"
            @click="startBarcodePrint"
          >
            {{ isPrinting ? 'Imprimiendo...' : 'Imprimir codigo de barras' }}
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

          <div class="form-card">
            <ion-item>
              <ion-label position="floating">Imagen del Producto (URL)</ion-label>
              <ion-input
                v-model="formData.imagenUrl"
                type="url"
                :legacy="true"
              ></ion-input>
            </ion-item>

            <div class="image-upload-field">
              <label class="section-label" for="product-image-file">o Seleccionar Archivo</label>
              <input
                id="product-image-file"
                type="file"
                accept="image/*"
                @change="handleImageFileChange"
              >
              <p class="field-hint">Se mostrara una vista previa local de la imagen seleccionada.</p>
            </div>

            <div v-if="selectedImagePreview || formData.imagenUrl" class="image-preview-wrap">
              <img
                :src="selectedImagePreview || formData.imagenUrl"
                alt="Vista previa de imagen"
                class="image-preview"
              >
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

    <ion-modal
      :is-open="isPrinterPickerOpen"
      css-class="printer-picker-modal"
      @did-dismiss="closePrinterPicker"
    >
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="closePrinterPicker">Cerrar</ion-button>
          </ion-buttons>
          <ion-title>Seleccionar impresora</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <ion-list v-if="printerDevices.length">
          <ion-item
            button
            v-for="device in printerDevices"
            :key="getDeviceId(device)"
            @click="selectPrinter(device)"
          >
            <ion-label>
              <h3>{{ getDeviceLabel(device) }}</h3>
              <p>{{ getDeviceId(device) }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
        <div v-else class="empty-state">
          <p>No hay impresoras emparejadas.</p>
        </div>
      </ion-content>
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
  </ion-page>
  </template>

  <script setup>
import { ref, onMounted, computed } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { useProducts } from '../composables/useProducts'
import { usePrestamos } from '../composables/usePrestamos'
import {
  bluetoothIsEnabled,
  bluetoothList,
  bluetoothConnect,
  bluetoothDisconnect,
  bluetoothWrite,
  buildCode128Barcode,
  getDeviceId,
  getDeviceLabel
} from '../utils/bluetoothPrinter'
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
  IonSpinner,
  IonAlert,
  IonToast,
  onIonViewWillLeave
} from '@ionic/vue'
import { add, checkmarkCircle, apps, home, cube, people, swapHorizontal } from 'ionicons/icons'

const router = useRouter()
const { products, loading, error, createProduct, getProducts, updateProduct, deleteProduct: deleteProductAPI } = useProducts()
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
const printerDevices = ref([])
const isPrinterPickerOpen = ref(false)
const touched = ref({
  nombre: false,
  stock: false,
  precio: false
})
const selectedImagePreview = ref('')
const loanedStockMap = ref({})

const formData = ref({
  nombre: '',
  descripcion: '',
  tipo: 'RECURSO',
  stock: 0,
  precio: null,
  codigoBarras: ''
})

const generateBarcode = () => {
  const timestamp = Date.now().toString().slice(-8)
  const randomPart = Math.floor(1000 + Math.random() * 9000)
  return `PRD-${timestamp}-${randomPart}`
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
    codigoBarras: '',
    imagenUrl: ''
  }
  selectedImagePreview.value = ''
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
    codigoBarras: product.codigoBarras || '',
    imagenUrl: product.imagenUrl || ''
  }
  selectedImagePreview.value = product.imagenUrl || ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  showDeleteConfirm.value = false
  resetForm()
}

const closePrinterPicker = () => {
  isPrinterPickerOpen.value = false
}

const openPrinterPicker = (devices) => {
  printerDevices.value = devices
  isPrinterPickerOpen.value = true
}

const printWithDevice = async (device) => {
  const barcode = (formData.value.codigoBarras || '').trim()
  if (!barcode) {
    printError.value = 'El producto no tiene codigo de barras.'
    return
  }

  const deviceId = getDeviceId(device)
  if (!deviceId) {
    printError.value = 'No se pudo identificar la impresora.'
    return
  }

  try {
    isPrinting.value = true
    await bluetoothConnect(deviceId)
    const payload = buildCode128Barcode(barcode)
    await bluetoothWrite(payload)
    localStorage.setItem('lastPrinterId', deviceId)
    printError.value = ''
  } catch (err) {
    printError.value = err?.message || 'No se pudo imprimir el codigo de barras.'
  } finally {
    try {
      await bluetoothDisconnect()
    } catch (err) {
      // Ignorar error de desconexion
    }
    isPrinting.value = false
  }
}

const selectPrinter = async (device) => {
  closePrinterPicker()
  await printWithDevice(device)
}

const startBarcodePrint = async () => {
  printError.value = ''

  if (!isEditing.value) {
    return
  }

  if (!Capacitor?.isNativePlatform?.()) {
    printError.value = 'La impresion solo funciona en la app instalada.'
    return
  }

  try {
    isPrinting.value = true
    await bluetoothIsEnabled()
    const devices = await bluetoothList()
    const deviceList = Array.isArray(devices) ? devices : []

    if (!deviceList.length) {
      printError.value = 'No hay impresoras emparejadas.'
      return
    }

    const lastPrinterId = localStorage.getItem('lastPrinterId')
    const lastMatch = lastPrinterId
      ? deviceList.find((device) => getDeviceId(device) === lastPrinterId)
      : null

    if (lastMatch) {
      await printWithDevice(lastMatch)
      return
    }

    if (deviceList.length === 1) {
      await printWithDevice(deviceList[0])
      return
    }

    openPrinterPicker(deviceList)
  } catch (err) {
    printError.value = err?.message || 'No se pudo acceder al Bluetooth.'
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
  isPrinterPickerOpen.value = false
  resetForm()
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
    codigoBarras: (formData.value.codigoBarras || '').trim() || generateBarcode(),
    imagenUrl: formData.value.imagenUrl?.trim() || ''
  }
}

const handleImageFileChange = (event) => {
  const file = event?.target?.files?.[0]
  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    modalError.value = 'El archivo seleccionado no es una imagen valida.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    selectedImagePreview.value = reader.result
    formData.value.imagenUrl = reader.result
  }
  reader.onerror = () => {
    modalError.value = 'No se pudo leer la imagen seleccionada.'
  }
  reader.readAsDataURL(file)
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

:global(ion-modal.printer-picker-modal) {
  --width: min(520px, 92vw);
  --height: min(70vh, 620px);
  --border-radius: 14px;
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

.image-upload-field {
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 0.75rem;
}

.image-upload-field input[type='file'] {
  width: 100%;
}

.image-preview-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem;
  background: #f9fafb;
}

.image-preview {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 6px;
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
