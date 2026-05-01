<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="icon-only" :icon="apps"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Préstamos</ion-title>
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
          <h2>Gestión de Préstamos</h2>
          <ion-button color="success" @click="openPrestamoModal">
            <ion-icon slot="start" :icon="add"></ion-icon>
            Nuevo Préstamo
          </ion-button>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="filters-card">
          <ion-item>
            <ion-label position="stacked">Filtrar por colaborador</ion-label>
            <ion-select v-model="listFilters.colaboradorId" placeholder="Todos los colaboradores">
              <ion-select-option value="">Todos los colaboradores</ion-select-option>
              <ion-select-option
                v-for="colaborador in colaboradoresFilterOptions"
                :key="colaborador.id"
                :value="colaborador.id"
              >
                {{ colaborador.nombre }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Fecha inicio (préstamo)</ion-label>
            <ion-input
              v-model="listFilters.fechaInicio"
              type="date"
              :legacy="true"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Fecha fin (préstamo)</ion-label>
            <ion-input
              v-model="listFilters.fechaFin"
              type="date"
              :legacy="true"
            ></ion-input>
          </ion-item>

          <ion-button
            expand="block"
            fill="clear"
            size="small"
            class="clear-filters-button"
            @click="clearListFilters"
          >
            Limpiar filtros
          </ion-button>

          <p v-if="hasInvalidDateRange" class="error-message filter-error">
            La fecha inicio no puede ser mayor que la fecha fin.
          </p>
        </div>

        <ion-segment class="prestamos-segment" v-model="selectedSegment" @ion-change="onSegmentChange" scrollable>
          <ion-segment-button value="activos">
            <ion-label>Activos</ion-label>
          </ion-segment-button>
          <ion-segment-button value="devueltos">
            <ion-label>Devueltos</ion-label>
          </ion-segment-button>
          <ion-segment-button value="vencidos">
            <ion-label>Vencidos</ion-label>
          </ion-segment-button>
        </ion-segment>

        <ion-list v-if="filteredPrestamos.length > 0" class="prestamos-list">
          <ion-item class="prestamo-item" v-for="prestamo in filteredPrestamos" :key="prestamo.id" button @click="viewPrestamo(prestamo)">
              <ion-label>
                <h2>{{ prestamo.colaboradorNombre || 'Sin colaborador' }}</h2>
                <p>{{ getPrestamoResumen(prestamo) }}</p>
                <p>Prestado: {{ formatDate(prestamo.createdAt) }}</p>
                <p>Devolución esperada: {{ formatDate(prestamo.fechaDevolucionEsperada) }}</p>
              </ion-label>
              <div slot="end" class="item-actions">
                <ion-button
                  v-if="prestamo.estado === 'activo'"
                  size="small"
                  color="primary"
                  @click.stop="openReturnModal(prestamo)"
                >
                  Devolver
                </ion-button>
                <ion-badge :color="getBadgeColor(prestamo.estado)">
                  {{ prestamo.estado }}
                </ion-badge>
                <ion-badge
                  v-if="isPrestamoVencido(prestamo)"
                  color="danger"
                  class="overdue-badge"
                >
                  Vencido
                </ion-badge>
              </div>
          </ion-item>
        </ion-list>

        <div v-else class="empty-state">
          <p>No hay préstamos en este estado</p>
        </div>
      </div>
    </ion-content>

    <ion-modal
      :is-open="isPrestamoModalOpen"
      :backdrop-dismiss="true"
      css-class="prestamo-modal"
      @did-dismiss="closePrestamoModal"
    >
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="closePrestamoModal">Cancelar</ion-button>
          </ion-buttons>
          <ion-title>Nuevo Préstamo</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-form">
          <ion-item>
            <ion-label position="stacked">Colaborador</ion-label>
            <ion-select v-model="newPrestamo.colaboradorId" placeholder="Selecciona colaborador">
              <ion-select-option v-for="colaborador in availableColaboradores" :key="colaborador.id" :value="colaborador.id">
                {{ colaborador.nombre }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <p class="field-hint">Solo se muestran colaboradores activos.</p>

          <ion-item>
            <ion-label>
              <h3>Fecha Esperada de Devolución</h3>
              <p>{{ expectedReturnLabel }}</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Observaciones</ion-label>
            <ion-textarea v-model="newPrestamo.observaciones" rows="3" :legacy="true"></ion-textarea>
          </ion-item>

          <div class="items-card">
            <h3>Agregar Producto</h3>
            <ion-item button detail @click="openProductPicker">
              <ion-label>
                <h3 class="picker-item-title">Producto</h3>
                <p>{{ selectedProductLabel }}</p>
              </ion-label>
            </ion-item>

            <ion-button
              expand="block"
              fill="outline"
              class="scan-button"
              :disabled="isScanningBarcode || isInstallingScannerModule"
              @click="openBarcodeScanner"
            >
              <ion-icon slot="start" :icon="scan"></ion-icon>
              {{ scannerButtonLabel }}
            </ion-button>
            <ion-item lines="none" class="batch-scan-toggle">
              <ion-label>Modo lote</ion-label>
              <ion-toggle v-model="isBatchScanMode"></ion-toggle>
            </ion-item>
            <p class="field-hint">
              {{ isBatchScanMode ? 'Modo lote activo: escanea y agrega productos consecutivamente.' : 'Usa la camara trasera para seleccionar producto por codigo.' }}
            </p>
            <div v-if="scannerError" class="error-message">{{ scannerError }}</div>

            <ion-item>
              <ion-label position="stacked">Cantidad</ion-label>
              <ion-input v-model.number="itemForm.cantidad" type="number" min="1" :legacy="true"></ion-input>
            </ion-item>

            <ion-button
              expand="block"
              fill="outline"
              class="add-item-button"
              :color="canAddItem ? 'primary' : 'medium'"
              @click="addItemToPrestamo"
            >
              Agregar Producto al Préstamo
            </ion-button>
            <p class="field-hint">Si agregas el mismo producto, el sistema suma cantidades automáticamente.</p>
          </div>

          <div v-if="newPrestamo.detalles.length" class="items-list">
            <h3>Productos en Préstamo</h3>
            <ion-list>
              <ion-item v-for="(item, index) in newPrestamo.detalles" :key="`${item.productoId}-${index}`">
                <ion-label>
                  <h3>{{ item.nombre }}</h3>
                  <p>{{ item.tipo }} - Cantidad: {{ item.cantidad }}</p>
                </ion-label>
                <ion-button color="danger" fill="clear" @click="removeItemFromPrestamo(index)">Quitar</ion-button>
              </ion-item>
            </ion-list>
          </div>

          <div v-if="formError" class="error-message">{{ formError }}</div>
        </div>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-button expand="block" @click="savePrestamo" :disabled="loading || !canSavePrestamo">
            {{ loading ? 'Guardando...' : 'Guardar Préstamo' }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <ion-modal
      :is-open="isProductPickerOpen"
      :backdrop-dismiss="true"
      css-class="product-picker-modal"
      @did-dismiss="closeProductPicker"
    >
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="closeProductPicker">Cerrar</ion-button>
          </ion-buttons>
          <ion-title>Seleccionar producto</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-form product-picker-content">
          <ion-searchbar
            v-model="productSearchTerm"
            placeholder="Buscar por nombre o código"
            :debounce="200"
          ></ion-searchbar>

          <ion-list v-if="filteredProductsByName.length">
            <ion-item
              button
              v-for="producto in filteredProductsByName"
              :key="producto.id"
              @click="selectProduct(producto.id)"
            >
              <ion-label>
                <h3>{{ producto.nombre }}</h3>
                <p>
                  {{ producto.tipo }} · Stock: {{ producto.stock || 0 }}
                  <span v-if="producto.codigoBarras"> · Código: {{ producto.codigoBarras }}</span>
                </p>
              </ion-label>
            </ion-item>
          </ion-list>

          <div v-else class="empty-state">
            <p>Sin coincidencias para el filtro actual</p>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <ion-modal :is-open="isReturnModalOpen" css-class="prestamo-modal" @did-dismiss="closeReturnModal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="closeReturnModal">Cancelar</ion-button>
          </ion-buttons>
          <ion-title>Registrar Devolución</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-form">
          <div v-if="selectedPrestamoForReturn">
            <h3>{{ selectedPrestamoForReturn.colaboradorNombre }}</h3>
            <ion-list>
              <ion-item v-for="item in selectedPrestamoForReturn.detalles" :key="item.productoId">
                <ion-label>
                  <h3>{{ item.nombre }}</h3>
                  <p>Pendiente: {{ getCantidadPendiente(item) }}</p>
                </ion-label>
                <ion-input
                  v-model.number="returnItems[item.productoId]"
                  type="number"
                  min="0"
                  :max="getCantidadPendiente(item)"
                  style="max-width: 100px;"
                ></ion-input>
              </ion-item>
              <ion-item v-for="item in selectedPrestamoForReturn.detalles" :key="`${item.productoId}-obs`">
                <ion-label position="stacked">Observaciones de {{ item.nombre }}</ion-label>
                <ion-textarea
                  v-model="returnObservaciones[item.productoId]"
                  :legacy="true"
                  rows="2"
                  placeholder="Estado del producto devuelto"
                ></ion-textarea>
              </ion-item>
            </ion-list>
          </div>

          <div v-if="formError" class="error-message">{{ formError }}</div>
        </div>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-button expand="block" @click="saveReturn" :disabled="loading">
            {{ loading ? 'Procesando...' : 'Confirmar Devolución' }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <ion-modal :is-open="isDetailModalOpen" css-class="prestamo-modal" @did-dismiss="closeDetailModal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="closeDetailModal">Cerrar</ion-button>
          </ion-buttons>
          <ion-title>Detalle de Préstamo</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-form" v-if="selectedPrestamoDetail">
          <ion-item>
            <ion-label>
              <h3>Colaborador</h3>
              <p>{{ selectedPrestamoDetail.colaboradorNombre || '-' }}</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-label>
              <h3>Estado</h3>
              <p>{{ selectedPrestamoDetail.estado }}</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-label>
              <h3>Fecha de Préstamo</h3>
              <p>{{ formatDate(selectedPrestamoDetail.createdAt) }}</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-label>
              <h3>Devolución Esperada</h3>
              <p>{{ formatDate(selectedPrestamoDetail.fechaDevolucionEsperada) }}</p>
            </ion-label>
          </ion-item>

          <div class="items-list">
            <h3>Productos</h3>
            <ion-list>
              <ion-item
                v-for="(item, idx) in (selectedPrestamoDetail.detalles || [])"
                :key="`${item.productoId}-${idx}`"
              >
                <ion-label>
                  <h3>{{ item.nombre }}</h3>
                  <p>Cantidad: {{ item.cantidad }} · Devuelto: {{ item.cantidadDevuelta || 0 }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <ion-toast
      :is-open="showToast"
      :message="toastMessage"
      color="success"
      :duration="1800"
      position="top"
      @did-dismiss="showToast = false"
    ></ion-toast>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { onBeforeRouteLeave } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { usePrestamos } from '../composables/usePrestamos'
import { useProducts } from '../composables/useProducts'
import { useColaboradores } from '../composables/useColaboradores'
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
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonBadge,
  IonModal,
  IonFooter,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
  IonTextarea,
  IonInput,
  IonToggle,
  IonToast,
  onIonViewWillLeave
} from '@ionic/vue'
import { add, apps, home, cube, people, swapHorizontal, scan } from 'ionicons/icons'

const router = useRouter()
const { prestamos, loading, error, createPrestamo, getPrestamos, devolverPrestamo } = usePrestamos()
const { products, getProducts } = useProducts()
const { colaboradores, getColaboradores } = useColaboradores()

const selectedSegment = ref('activos')
const isModulesMenuOpen = ref(false)
const isPrestamoModalOpen = ref(false)
const isReturnModalOpen = ref(false)
const isProductPickerOpen = ref(false)
const selectedPrestamoForReturn = ref(null)
const formError = ref('')
const showToast = ref(false)
const toastMessage = ref('')
const isDetailModalOpen = ref(false)
const selectedPrestamoDetail = ref(null)
const isScanningBarcode = ref(false)
const isInstallingScannerModule = ref(false)
const isBatchScanMode = ref(false)
const scannerError = ref('')
let scannerTimeoutId = null
let scannerDebounceActive = false

const SCANNER_TIMEOUT_MS = 15000
const DEBOUNCE_DELAY_MS = 800
const MODULE_INSTALL_TIMEOUT_MS = 20000
const MODULE_INSTALL_POLL_MS = 1000

const itemForm = ref({
  productoId: '',
  cantidad: 1
})
const productSearchTerm = ref('')

const returnItems = ref({})
const returnObservaciones = ref({})

const newPrestamo = ref({
  colaboradorId: '',
  colaboradorNombre: '',
  observaciones: '',
  detalles: []
})

const listFilters = ref({
  colaboradorId: '',
  fechaInicio: '',
  fechaFin: ''
})

const expectedReturnLabel = computed(() => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return `${date.toLocaleDateString('es-MX')} ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
})

const colaboradoresFilterOptions = computed(() => {
  return [...colaboradores.value]
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))
})

const hasInvalidDateRange = computed(() => {
  const { fechaInicio, fechaFin } = listFilters.value
  if (!fechaInicio || !fechaFin) {
    return false
  }

  const inicioTs = new Date(`${fechaInicio}T00:00:00`).getTime()
  const finTs = new Date(`${fechaFin}T23:59:59.999`).getTime()
  return inicioTs > finTs
})

const filteredPrestamos = computed(() => {
  const nowTs = Date.now()
  let resultado = []

  if (selectedSegment.value === 'activos') {
    resultado = prestamos.value.filter((p) => {
      if (p.estado !== 'activo') {
        return false
      }

      if (!p.fechaDevolucionEsperada) {
        return true
      }

      return new Date(p.fechaDevolucionEsperada).getTime() >= nowTs
    })
  } else if (selectedSegment.value === 'devueltos') {
    resultado = prestamos.value.filter((p) => p.estado === 'devuelto')
  } else {
    resultado = prestamos.value.filter((p) => {
      if (p.estado !== 'activo' || !p.fechaDevolucionEsperada) {
        return false
      }

      return new Date(p.fechaDevolucionEsperada).getTime() < nowTs
    })
  }

  const { colaboradorId, fechaInicio, fechaFin } = listFilters.value

  if (colaboradorId) {
    resultado = resultado.filter((p) => p.colaboradorId === colaboradorId)
  }

  if (hasInvalidDateRange.value) {
    return []
  }

  if (!fechaInicio && !fechaFin) {
    return resultado
  }

  const inicioTs = fechaInicio ? new Date(`${fechaInicio}T00:00:00`).getTime() : null
  const finTs = fechaFin ? new Date(`${fechaFin}T23:59:59.999`).getTime() : null

  return resultado.filter((p) => {
    const prestamoTs = new Date(p.createdAt || '').getTime()
    if (Number.isNaN(prestamoTs)) {
      return false
    }

    if (inicioTs !== null && prestamoTs < inicioTs) {
      return false
    }

    if (finTs !== null && prestamoTs > finTs) {
      return false
    }

    return true
  })
})

const clearListFilters = () => {
  listFilters.value = {
    colaboradorId: '',
    fechaInicio: '',
    fechaFin: ''
  }
}

const availableColaboradores = computed(() => {
  return colaboradores.value.filter((c) => c.activo !== false)
})

const availableProducts = computed(() => {
  return products.value.filter((p) => Number(p.stock || 0) > 0)
})

const canSavePrestamo = computed(() => {
  return Boolean(newPrestamo.value.colaboradorId) && (newPrestamo.value.detalles || []).length > 0
})

const scannerButtonLabel = computed(() => {
  if (isInstallingScannerModule.value) {
    return 'Instalando modulo de escaneo...'
  }

  if (isScanningBarcode.value) {
    return isBatchScanMode.value ? 'Escaneando en modo lote...' : 'Abriendo camara...'
  }

  return isBatchScanMode.value ? 'Iniciar escaneo en lote' : 'Escanear codigo de barras'
})

const selectedProductLabel = computed(() => {
  const producto = availableProducts.value.find((p) => p.id === itemForm.value.productoId)
  if (!producto) {
    return 'Selecciona producto'
  }

  return `${producto.nombre} (${producto.tipo}) · Stock: ${producto.stock || 0}`
})

const filteredProductsByName = computed(() => {
  const term = productSearchTerm.value.trim().toLowerCase()
  if (!term) return availableProducts.value

  return availableProducts.value.filter((p) => {
    const nombre = String(p.nombre || '').toLowerCase()
    const codigo = String(p.codigoBarras || p.codigo || '').toLowerCase()
    return nombre.includes(term) || codigo.includes(term)
  })
})

const canAddItem = computed(() => {
  const selectedId = itemForm.value.productoId
  const cantidad = Number(itemForm.value.cantidad)
  if (!selectedId || !Number.isInteger(cantidad) || cantidad <= 0) {
    return false
  }

  const producto = availableProducts.value.find((p) => p.id === selectedId)
  if (!producto) {
    return false
  }

  const cantidadYaAgregada = newPrestamo.value.detalles
    .filter((item) => item.productoId === producto.id)
    .reduce((acc, item) => acc + Number(item.cantidad || 0), 0)

  return cantidadYaAgregada + cantidad <= Number(producto.stock || 0)
})

const resetPrestamoForm = () => {
  formError.value = ''
  scannerError.value = ''
  itemForm.value = { productoId: '', cantidad: 1 }
  productSearchTerm.value = ''
  isProductPickerOpen.value = false
  isBatchScanMode.value = false
  newPrestamo.value = {
    colaboradorId: '',
    colaboradorNombre: '',
    observaciones: '',
    detalles: []
  }
}

const findProductByBarcode = (rawValue) => {
  const normalized = String(rawValue || '').trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return availableProducts.value.find((producto) => {
    const codigo = String(producto.codigoBarras || producto.codigo || '').trim().toLowerCase()
    return codigo && codigo === normalized
  }) || null
}

const handleScannedBarcode = async (decodedText) => {
  const producto = findProductByBarcode(decodedText)
  if (!producto) {
    scannerError.value = `No se encontro producto para el codigo: ${decodedText}`
    return
  }

  scannerError.value = ''
  formError.value = ''
  itemForm.value.productoId = producto.id
  if (isBatchScanMode.value) {
    addProductFromScan(producto)
    return
  }

  toastMessage.value = `Producto detectado: ${producto.nombre}`
  showToast.value = true
}

const addProductFromScan = (producto) => {
  const stockDisponible = Number(producto.stock || 0)
  const existingIndex = newPrestamo.value.detalles.findIndex((item) => item.productoId === producto.id)
  const cantidadActual = existingIndex >= 0
    ? Number(newPrestamo.value.detalles[existingIndex].cantidad || 0)
    : 0

  if (cantidadActual + 1 > stockDisponible) {
    scannerError.value = `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}`
    return false
  }

  if (existingIndex >= 0) {
    newPrestamo.value.detalles[existingIndex].cantidad = cantidadActual + 1
  } else {
    newPrestamo.value.detalles.push({
      productoId: producto.id,
      nombre: producto.nombre,
      tipo: producto.tipo,
      cantidad: 1,
      cantidadDevuelta: 0
    })
  }

  itemForm.value = { ...itemForm.value, cantidad: 1 }
  toastMessage.value = `${producto.nombre} agregado al prestamo (x1)`
  showToast.value = true
  return true
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ensureGoogleScannerModule = async () => {
  const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
  if (moduleStatus.available) {
    return true
  }

  isInstallingScannerModule.value = true
  scannerError.value = 'Instalando modulo de escaneo de Google...'
  await BarcodeScanner.installGoogleBarcodeScannerModule()

  const startedAt = Date.now()
  while (Date.now() - startedAt < MODULE_INSTALL_TIMEOUT_MS) {
    const status = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
    if (status.available) {
      scannerError.value = ''
      toastMessage.value = 'Modulo de escaneo instalado correctamente.'
      showToast.value = true
      isInstallingScannerModule.value = false
      return true
    }

    await sleep(MODULE_INSTALL_POLL_MS)
  }

  scannerError.value = 'La instalacion del modulo sigue en progreso. Intenta escanear de nuevo en unos segundos.'
  isInstallingScannerModule.value = false
  return false
}

const openBarcodeScanner = async () => {
  scannerError.value = ''

  // Prevenir múltiples clicks rápidos (debounce)
  if (isScanningBarcode.value || scannerDebounceActive || isInstallingScannerModule.value) {
    return
  }

  if (!Capacitor?.isNativePlatform?.()) {
    scannerError.value = 'El escaneo con camara solo funciona en la app instalada.'
    return
  }

  isScanningBarcode.value = true
  scannerDebounceActive = true

  try {
    const { supported } = await BarcodeScanner.isSupported()
    if (!supported) {
      scannerError.value = 'Este dispositivo no soporta escaneo de codigos.'
      return
    }

    const permissions = await BarcodeScanner.requestPermissions()
    if (permissions.camera !== 'granted') {
      scannerError.value = 'Necesitas permitir el acceso a la camara para escanear.'
      return
    }

    if (Capacitor.getPlatform() === 'android') {
      const moduleReady = await ensureGoogleScannerModule()
      if (!moduleReady) {
        return
      }
    }

    let keepScanning = true
    while (keepScanning) {
      let scanTimeout = false
      scannerTimeoutId = setTimeout(() => {
        scanTimeout = true
        BarcodeScanner.stopScan().catch(() => {})
        scannerError.value = 'Tiempo de escaneo agotado (15s). Intenta de nuevo.'
        isScanningBarcode.value = false
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

      if (scanTimeout) {
        return
      }

      const firstBarcode = result?.barcodes?.[0]
      const scannedValue = firstBarcode?.rawValue || firstBarcode?.displayValue || ''
      if (!scannedValue) {
        scannerError.value = 'No se detecto ningun codigo. Intenta de nuevo.'
        return
      }

      await handleScannedBarcode(scannedValue)

      keepScanning = isBatchScanMode.value
      if (keepScanning) {
        scannerError.value = 'Modo lote activo: listo para el siguiente escaneo.'
      }
    }
  } catch (error) {
    const errorMsg = error?.message || ''
    // No mostrar error si fue timeout o cancelación del usuario
    if (!errorMsg.includes('timeout') && !errorMsg.includes('cancel') && !errorMsg.includes('dismiss')) {
      scannerError.value = error?.message || 'No se pudo iniciar el escaner.'
    }
  } finally {
    // Limpiar timeout si aun existe
    if (scannerTimeoutId) {
      clearTimeout(scannerTimeoutId)
      scannerTimeoutId = null
    }
    isInstallingScannerModule.value = false
    isScanningBarcode.value = false

    // Aplicar debounce: no permitir nuevo escaneo durante 800ms
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY_MS))
    scannerDebounceActive = false
  }
}

const openPrestamoModal = () => {
  resetPrestamoForm()
  isPrestamoModalOpen.value = true
}

const viewPrestamo = (prestamo) => {
  selectedPrestamoDetail.value = prestamo
  isDetailModalOpen.value = true
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  selectedPrestamoDetail.value = null
}

const getBadgeColor = (estado) => {
  return estado === 'activo' ? 'warning' : estado === 'devuelto' ? 'success' : 'danger'
}

const getPrestamoResumen = (prestamo) => {
  const totalItems = (prestamo.detalles || []).length
  const totalPendiente = (prestamo.detalles || []).reduce((acc, item) => {
    const pendiente = Math.max(0, Number(item.cantidad || 0) - Number(item.cantidadDevuelta || 0))
    return acc + pendiente
  }, 0)

  return `${totalItems} producto(s) · Pendiente: ${totalPendiente}`
}

const formatDate = (value) => {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleString('es-MX')
}

const isPrestamoVencido = (prestamo) => {
  if (!prestamo || prestamo.estado !== 'activo' || !prestamo.fechaDevolucionEsperada) {
    return false
  }

  return new Date(prestamo.fechaDevolucionEsperada).getTime() < Date.now()
}

const addItemToPrestamo = () => {
  formError.value = ''
  scannerError.value = ''
  const producto = availableProducts.value.find((p) => p.id === itemForm.value.productoId)

  if (!producto) {
    formError.value = 'Selecciona un producto para agregar.'
    return
  }

  const cantidad = Number(itemForm.value.cantidad)
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    formError.value = 'La cantidad debe ser un numero entero mayor a 0.'
    return
  }

  const cantidadYaAgregada = newPrestamo.value.detalles
    .filter((item) => item.productoId === producto.id)
    .reduce((acc, item) => acc + Number(item.cantidad || 0), 0)

  const cantidadTotalSolicitada = cantidadYaAgregada + cantidad

  if (cantidadTotalSolicitada > Number(producto.stock || 0)) {
    formError.value = `Stock insuficiente. Disponible: ${producto.stock || 0}`
    return
  }

  const existingIndex = newPrestamo.value.detalles.findIndex((item) => item.productoId === producto.id)
  if (existingIndex >= 0) {
    const actual = Number(newPrestamo.value.detalles[existingIndex].cantidad || 0)
    newPrestamo.value.detalles[existingIndex].cantidad = actual + cantidad
  } else {
    newPrestamo.value.detalles.push({
      productoId: producto.id,
      nombre: producto.nombre,
      tipo: producto.tipo,
      cantidad,
      cantidadDevuelta: 0
    })
  }

  itemForm.value = { productoId: '', cantidad: 1 }
}

const removeItemFromPrestamo = (index) => {
  newPrestamo.value.detalles.splice(index, 1)
}

const savePrestamo = async () => {
  try {
    formError.value = ''

    if (!newPrestamo.value.colaboradorId) {
      formError.value = 'Selecciona un colaborador.'
      return
    }

    if (!newPrestamo.value.detalles.length) {
      formError.value = 'Agrega al menos un producto al préstamo.'
      return
    }

    const colaborador = colaboradores.value.find((c) => c.id === newPrestamo.value.colaboradorId)

    await createPrestamo({
      colaboradorId: newPrestamo.value.colaboradorId,
      colaboradorNombre: colaborador?.nombre || 'Sin nombre',
      observaciones: newPrestamo.value.observaciones || '',
      detalles: newPrestamo.value.detalles
    })

    await getPrestamos()
    isPrestamoModalOpen.value = false
    toastMessage.value = 'Préstamo registrado correctamente.'
    showToast.value = true
    resetPrestamoForm()
  } catch (err) {
    formError.value = err.message || 'No se pudo guardar el préstamo.'
  }
}

const closePrestamoModal = () => {
  isPrestamoModalOpen.value = false
  resetPrestamoForm()
}

const openProductPicker = () => {
  productSearchTerm.value = ''
  isProductPickerOpen.value = true
}

const closeProductPicker = () => {
  isProductPickerOpen.value = false
}

const selectProduct = (productoId) => {
  itemForm.value.productoId = productoId
  closeProductPicker()
}

const openReturnModal = (prestamo) => {
  formError.value = ''
  scannerError.value = ''
  selectedPrestamoForReturn.value = prestamo
  const base = {}
  const obs = {}
  ;(prestamo.detalles || []).forEach((item) => {
    base[item.productoId] = 0
    obs[item.productoId] = ''
  })
  returnItems.value = base
  returnObservaciones.value = obs
  isReturnModalOpen.value = true
}

const closeReturnModal = () => {
  isReturnModalOpen.value = false
  selectedPrestamoForReturn.value = null
  returnItems.value = {}
  returnObservaciones.value = {}
}

const openModulesMenu = () => {
  isModulesMenuOpen.value = true
}

const navigateTo = async (path) => {
  isModulesMenuOpen.value = false
  await router.push(path)
}

const resetPageUiState = () => {
  isModulesMenuOpen.value = false
  scannerError.value = ''
  closePrestamoModal()
  closeReturnModal()
  closeDetailModal()
  selectedSegment.value = 'activos'
}

const getCantidadPendiente = (item) => {
  return Math.max(0, Number(item.cantidad || 0) - Number(item.cantidadDevuelta || 0))
}

const saveReturn = async () => {
  try {
    formError.value = ''
    const prestamo = selectedPrestamoForReturn.value
    if (!prestamo) {
      return
    }

    const detallesDevolucion = (prestamo.detalles || []).map((item) => {
      const value = Math.max(0, Number(returnItems.value[item.productoId] || 0))
      return {
        productoId: item.productoId,
        cantidadDevuelta: Math.min(value, getCantidadPendiente(item)),
        observacion: returnObservaciones.value[item.productoId] || ''
      }
    })

    const anyReturn = detallesDevolucion.some((d) => d.cantidadDevuelta > 0)
    if (!anyReturn) {
      formError.value = 'Debes capturar al menos una cantidad para devolver.'
      return
    }

    await devolverPrestamo(prestamo.id, detallesDevolucion)
    await getPrestamos()
    closeReturnModal()
    toastMessage.value = 'Devolución registrada correctamente.'
    showToast.value = true
  } catch (err) {
    formError.value = err.message || 'No se pudo registrar la devolución.'
  }
}

const onSegmentChange = () => {
  // Segmento filtrado localmente
}

onMounted(async () => {
  await Promise.all([getPrestamos(), getProducts(), getColaboradores()])
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

.modules-trigger {
  --color: #ffffff;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.page-header h2 {
  margin: 0;
  flex: 1;
  font-size: 1.05rem;
}

.prestamos-segment {
  margin-top: 0.25rem;
}

.filters-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.35rem;
  margin-bottom: 0.8rem;
}

.clear-filters-button {
  margin-top: 0.35rem;
}

.filter-error {
  margin: 0.35rem 0 0.15rem;
}

.prestamos-list {
  margin-top: 1rem;
}

.prestamo-item {
  --padding-top: 10px;
  --padding-bottom: 10px;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.overdue-badge {
  font-weight: 700;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
}

.modal-form {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.items-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem;
}

.items-card h3,
.items-list h3 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #374151;
}

.modal-form h3 {
  font-size: 1.05rem;
}

.picker-item-title {
  margin: 0;
}

.items-list {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.5rem;
}

.add-item-button {
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
  height: 44px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  white-space: normal;
  text-align: center;
  line-height: 1.2;
  padding: 0.15rem 0.75rem;
}

.scan-button {
  margin-top: 0.35rem;
}

.batch-scan-toggle {
  margin-top: 0.25rem;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.error-message {
  background-color: #fee2e2;
  color: #7f1d1d;
  padding: 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  border-left: 4px solid #b45757;
}

.field-hint {
  margin: -0.35rem 0 0;
  color: #5d7182;
  font-size: 0.78rem;
}

.items-card .field-hint {
  margin: 0.2rem 0 0;
}

:global(ion-modal.prestamo-modal) {
  --width: min(760px, 92vw);
  --height: min(82vh, 820px);
  --border-radius: 16px;
}

:global(ion-modal.product-picker-modal) {
  --width: min(700px, 94vw);
  --height: min(74vh, 760px);
  --border-radius: 16px;
}

:global(ion-modal.product-picker-modal ion-title) {
  font-size: 1rem;
  text-align: center;
  white-space: nowrap;
}

.product-picker-content {
  padding: 0.75rem;
  gap: 0.75rem;
  height: 100%;
}

.product-picker-content ion-searchbar {
  --background: #f7f8fb;
  --border-radius: 10px;
  padding-inline: 0;
  width: 100%;
}

.product-picker-content ion-list {
  margin-top: 0.35rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  max-height: calc(100% - 64px);
  overflow-y: auto;
}

.product-picker-content ion-item {
  --padding-start: 0.75rem;
  --inner-padding-end: 0.75rem;
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

  .page-header h2 {
    font-size: 1.15rem;
  }

  .prestamos-segment {
    --background: #ffffff;
    border: 1px solid #d4dee6;
    border-radius: 10px;
    padding: 4px;
  }

  .prestamo-item h2 {
    font-size: 1rem;
  }

  .prestamo-item p {
    font-size: 0.83rem;
    line-height: 1.3;
  }

  .item-actions {
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
  }

  .item-actions ion-button {
    margin: 0;
  }

  :global(ion-modal.prestamo-modal) {
    --width: 96vw;
    --height: 90vh;
  }

  :global(ion-modal.product-picker-modal) {
    --width: 96vw;
    --height: 82vh;
  }
}
</style>
