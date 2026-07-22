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
          <ion-item button @click="navigateTo('/inventario-colaboradores')">
            <ion-icon slot="start" :icon="clipboardOutline"></ion-icon>
            <ion-label>Inventario de colaboradores</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/inventario-bodega')">
            <ion-icon slot="start" :icon="cube"></ion-icon>
            <ion-label>Inventario Bodega</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <ion-content class="products-content">
      <div class="page-container products-page">
        <section class="module-hero">
          <div class="hero-copy">
            <span class="eyebrow">Inventario</span>
            <h2>Productos</h2>
            <p>Controla productos, códigos y stock por área.</p>
          </div>
          <div class="hero-actions">
            <ion-button color="success" class="hero-button" @click="openNewProductModal">
              <ion-icon slot="start" :icon="add"></ion-icon>
              Nuevo producto
            </ion-button>
            <ion-button color="primary" fill="outline" class="hero-button" @click="openQuickStockScanner">
              <ion-icon slot="start" :icon="camera"></ion-icon>
              Ajuste rápido
            </ion-button>
          </div>
        </section>

        <section class="overview-grid" aria-label="Resumen de productos">
          <article class="overview-card overview-card--primary">
            <span class="overview-label">Productos</span>
            <strong>{{ productsSummary.total }}</strong>
          </article>
          <article class="overview-card">
            <span class="overview-label">Con stock</span>
            <strong>{{ productsSummary.conStock }}</strong>
          </article>
          <article class="overview-card">
            <span class="overview-label">Stock bajo</span>
            <strong>{{ productsSummary.stockBajo }}</strong>
          </article>
          <article class="overview-card">
            <span class="overview-label">Prestados</span>
            <strong>{{ productsSummary.prestados }}</strong>
          </article>
        </section>

        <section class="toolbar-card">
          <div class="toolbar-copy">
            <h3>Catálogo</h3>
            <p>{{ filteredProducts.length }} registros</p>
          </div>

          <div class="catalog-controls">
            <ion-searchbar
              v-model="searchTerm"
              placeholder="Buscar nombre o código"
              @ionClear="searchTerm = ''"
              @ionInput="searchTerm = $event.detail.value || ''"
              show-clear-button="focus"
              inputmode="search"
              enterkeyhint="search"
              class="product-searchbar"
            ></ion-searchbar>

            <ion-item lines="none" class="sort-control">
              <ion-label>Orden</ion-label>
              <ion-select
                v-model="sortMode"
                interface="popover"
                aria-label="Ordenar productos"
              >
                <ion-select-option value="name-asc">A-Z</ion-select-option>
                <ion-select-option value="name-desc">Z-A</ion-select-option>
                <ion-select-option value="stock-desc">Mayor stock</ion-select-option>
                <ion-select-option value="stock-asc">Menor stock</ion-select-option>
              </ion-select>
            </ion-item>
          </div>

          <ion-segment
            :value="areaFilter"
            class="area-filter-segment"
            aria-label="Filtro de stock por área"
            @ionChange="areaFilter = $event.detail.value || 'TODAS'"
          >
            <ion-segment-button
              value="TODAS"
              :class="{ 'area-filter-option--selected': areaFilter === 'TODAS' }"
            >
              Todas
            </ion-segment-button>
            <ion-segment-button
              v-for="area in AREAS_TALLER"
              :key="area"
              :value="area"
              :class="{ 'area-filter-option--selected': areaFilter === area }"
            >
              {{ area === 'SEGUNDO_PISO' ? '2º Piso' : AREA_LABELS[area] }}
            </ion-segment-button>
          </ion-segment>
        </section>

        <div v-if="loading" class="loading-state modern-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando...</p>
        </div>

        <ion-list v-else-if="filteredProducts.length > 0" lines="none" class="products-list">
          <ion-item-sliding v-for="product in filteredProducts" :key="product.id" class="product-sliding">
            <ion-item class="product-card" button detail="false" lines="none" @click="openEditProductModal(product)">
              <div class="product-card-content">
                <div class="product-topline">
                  <div class="product-title-block">
                    <h3>{{ product.nombre }}</h3>
                    <p>
                      <span>{{ product.codigoBarras || 'Sin código' }}</span>
                      <span v-if="product.precio"> · ${{ product.precio }}</span>
                    </p>
                  </div>
                </div>

                <div class="product-chip-row">
                  <span class="ui-chip ui-chip--muted">{{ getControlLabel(product) }}</span>
                  <span class="ui-chip ui-chip--muted">{{ getSelectedAreaLabel() }}</span>
                  <span class="ui-chip ui-chip--muted">Mínimo: {{ getStockMinimo(product) }}</span>
                  <span class="ui-chip" :class="getStockStatusClass(product)">{{ getStockStatusLabel(product) }}</span>
                </div>

                <div class="stock-grid product-stock-grid" :class="{ 'stock-grid--fraccionable': product.categoriaControl === 'FRACCIONABLE' }">
                  <div class="stock-metric stock-metric--main">
                    <span>Stock total</span>
                    <strong>{{ getTotalStock(product, activeAreaFilter) }}</strong>
                  </div>
                  <div v-if="product.categoriaControl !== 'FRACCIONABLE'" class="stock-metric">
                    <span>Disponible</span>
                    <strong>{{ getAvailableStock(product, activeAreaFilter) }}</strong>
                  </div>
                  <div class="stock-metric">
                    <span>Prestados</span>
                    <strong>{{ getLoanedStock(product.id, activeAreaFilter) }}</strong>
                  </div>
                  <div class="stock-metric">
                    <span>Mínimo</span>
                    <strong>{{ getStockMinimo(product) }}</strong>
                  </div>
                  <template v-if="product.categoriaControl === 'FRACCIONABLE'">
                    <div class="stock-metric">
                      <span>Nuevos</span>
                      <strong>{{ getStockNuevo(product, activeAreaFilter) }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Empezados</span>
                      <strong>{{ getStockEmpezado(product, activeAreaFilter) }}</strong>
                    </div>
                  </template>
                </div>
              </div>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" @click="requestDeleteFromList(product.id)">
                Eliminar
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>

        <div v-else class="empty-state modern-state">
          <p>{{ searchTerm ? 'Sin coincidencias.' : 'No hay productos.' }}</p>
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
          <ion-title>{{ isEditing ? 'Editar producto' : 'Nuevo producto' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="saveProduct" :color="saveButtonColor" :disabled="!isFormValid || loading">
              <ion-icon v-if="saveSuccess" slot="start" :icon="checkmarkCircle"></ion-icon>
              {{ saveButtonLabelShort }}
            </ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button @click="closeModal" class="close-modal-btn">
              <ion-icon slot="start" :icon="closeOutline"></ion-icon>
              Cerrar
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form">
          <div class="form-card">
          <ion-item>
            <ion-input
              v-model="formData.nombre"
              type="text"
              label="Nombre"
              label-placement="floating"
              @ionBlur="setTouched('nombre')"
            ></ion-input>
          </ion-item>
          <p v-if="touched.nombre && nombreError" class="field-error">{{ nombreError }}</p>

          <ion-item>
            <ion-textarea
              v-model="formData.descripcion"
              rows="3"
              label="Descripción"
              label-placement="floating"
            ></ion-textarea>
          </ion-item>

          <div class="barcode-field-container">
            <ion-item>
              <ion-input
                v-model="formData.codigoBarras"
                type="text"
                label="Código de barras"
                label-placement="floating"
                readonly
                disabled
              ></ion-input>
            </ion-item>
            <div class="barcode-button-group">
              <ion-button
                v-if="!isEditing"
                expand="block"
                fill="outline"
                class="scan-barcode-button"
                :disabled="isScanning || isModalScannerBusy"
                color="primary"
                @click="openBarcodeScanner"
              >
                <ion-icon slot="start" :icon="camera"></ion-icon>
                {{ isScanning ? 'Escaneando...' : 'Escanear' }}
              </ion-button>
              <ion-button
                v-if="!isEditing"
                expand="block"
                fill="outline"
                class="generate-barcode-button"
                color="secondary"
                @click="generateNewBarcode"
              >
                <ion-icon slot="start" :icon="refresh"></ion-icon>
                Generar código
              </ion-button>
            </div>
          </div>
          <p class="field-hint">
            Escanea o genera un código nuevo.
          </p>
          <p v-if="barcodeError" class="field-error">{{ barcodeError }}</p>
          <ion-button
            v-if="isEditing"
            expand="block"
            fill="outline"
            class="print-barcode-button"
            :disabled="isPrinting"
            color="primary"
            @click="shareLabelToPrinterApp"
          >
            <ion-icon slot="start" :icon="print"></ion-icon>
            {{ isPrinting ? 'Generando...' : 'Imprimir etiqueta' }}
          </ion-button>
          <p v-if="printError" class="field-error">{{ printError }}</p>
          </div>

          <div class="form-card form-section">
            <label class="section-label">Forma de control del producto</label>
            <ion-item>
              <ion-select
                v-model="formData.categoriaControl"
                placeholder="Selecciona forma de control"
                @ionChange="setTouched('categoriaControl')"
              >
                <ion-select-option value="UNIDAD">Por pieza</ion-select-option>
                <ion-select-option value="FRACCIONABLE">Por envase / fraccionable</ion-select-option>
                <ion-select-option value="HERRAMIENTA">Herramienta retornable</ion-select-option>
              </ion-select>
            </ion-item>
            <p class="field-hint">
              Esta opción define cómo se captura el stock y cómo se comporta el producto en salidas o préstamos.
            </p>
            <p v-if="touched.categoriaControl && categoriaControlError" class="field-error">
              {{ categoriaControlError }}
            </p>

          </div>

          <div class="form-card compact-card form-section">
            <label class="section-label">Alerta de stock bajo</label>
            <div class="field-stepper-card">
              <span>Mínimo recomendado</span>
              <div class="compact-stepper">
                <ion-button fill="clear" class="stepper-btn" @click="changeStockMinimo(-1)">
                  <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                </ion-button>
                <ion-input
                  v-model.number="formData.stockMinimo"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="stepper-input"
                  aria-label="Stock mínimo recomendado"
                  @ionBlur="normalizeStockMinimo"
                ></ion-input>
                <ion-button fill="clear" class="stepper-btn" @click="changeStockMinimo(1)">
                  <ion-icon slot="icon-only" :icon="add"></ion-icon>
                </ion-button>
              </div>
            </div>
            <p class="field-hint">
              Si el disponible del producto llega a este número o menos, se marcará como stock bajo. Usa 0 para no mostrar alerta.
            </p>
            <p v-if="touched.stockMinimo && stockMinimoError" class="field-error">{{ stockMinimoError }}</p>
          </div>

          <div class="form-card compact-card form-section">
            <label class="section-label">Stock por área</label>
            <div v-if="formData.categoriaControl" class="area-stock-grid">
              <div v-for="area in AREAS_TALLER" :key="area" class="area-stock-card">
                <h4>{{ AREA_LABELS[area] }}</h4>
                <div class="field-stepper-card">
                  <span>{{ stockPrimaryLabel }}</span>
                  <div class="compact-stepper">
                    <ion-button fill="clear" class="stepper-btn" @click="changeAreaStock(area, 'stock', -1)">
                      <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                    </ion-button>
                    <ion-input
                      v-model.number="formData.stockPorArea[area].stock"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      class="stepper-input"
                      :aria-label="`${stockPrimaryLabel} en ${AREA_LABELS[area]}`"
                      @ionBlur="normalizeAreaStock(area, 'stock')"
                    ></ion-input>
                    <ion-button fill="clear" class="stepper-btn" @click="changeAreaStock(area, 'stock', 1)">
                      <ion-icon slot="icon-only" :icon="add"></ion-icon>
                    </ion-button>
                  </div>
                </div>
                <div v-if="formData.categoriaControl === 'FRACCIONABLE'" class="field-stepper-card">
                  <span>Envases empezados</span>
                  <div class="compact-stepper">
                    <ion-button fill="clear" class="stepper-btn" @click="changeAreaStock(area, 'stockEmpezado', -1)">
                      <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                    </ion-button>
                    <ion-input
                      v-model.number="formData.stockPorArea[area].stockEmpezado"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      class="stepper-input"
                      :aria-label="`Envases empezados en ${AREA_LABELS[area]}`"
                      @ionBlur="normalizeAreaStock(area, 'stockEmpezado')"
                    ></ion-input>
                    <ion-button fill="clear" class="stepper-btn" @click="changeAreaStock(area, 'stockEmpezado', 1)">
                      <ion-icon slot="icon-only" :icon="add"></ion-icon>
                    </ion-button>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="field-hint">
              Selecciona primero la forma de control para capturar el stock de cada área.
            </p>
            <p v-if="touched.stock && stockError" class="field-error">{{ stockError }}</p>
            <p v-if="touched.stockEmpezado && stockEmpezadoError" class="field-error">{{ stockEmpezadoError }}</p>
          </div>

          <div class="form-card compact-card">
            <ion-item>
              <ion-input
                v-model.number="formData.precio"
                type="number"
                min="0"
                step="0.01"
                label="Precio (opcional)"
                label-placement="floating"
                @ionBlur="setTouched('precio')"
              ></ion-input>
            </ion-item>
            <p v-if="touched.precio && precioError" class="field-error">{{ precioError }}</p>
          </div>

          <div v-if="modalError || error" class="error-message">
            {{ modalError || error }}
          </div>

          <div v-if="isEditing" class="modal-actions">
            <ion-button expand="block" color="danger" @click="confirmDelete">
              Eliminar producto
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
      header="Eliminar producto"
      message="¿Deseas eliminar este producto?"
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
          <ion-title>Ajuste rápido</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="quickModalOpen = false" class="close-modal-btn">
              <ion-icon slot="start" :icon="closeOutline"></ion-icon>
              Cerrar
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form quick-stock-form">
          <div v-if="quickScannerError" class="error-message">{{ quickScannerError }}</div>

          <div v-if="quickProduct" class="quick-panel">
            <div class="quick-product-card">
              <div>
                <span class="eyebrow">Detectado</span>
                <h3>{{ quickProduct.nombre }}</h3>
                <p>Código: {{ quickProduct.codigoBarras || '-' }}</p>
              </div>
              <div class="product-chip-row compact-chip-row">
                <span class="ui-chip ui-chip--muted">{{ getControlLabel(quickProduct) }}</span>
                <span class="ui-chip ui-chip--muted">Mínimo: {{ getStockMinimo(quickProduct) }}</span>
                <span class="ui-chip" :class="getStockStatusClass(quickProduct)">{{ getStockStatusLabel(quickProduct) }}</span>
              </div>
            </div>

            <div class="stock-grid stock-grid--quick">
              <div class="stock-metric stock-metric--main">
                <span>Stock total</span>
                <strong>{{ getTotalStock(quickProduct, quickArea) }}</strong>
              </div>
              <div v-if="quickProduct.categoriaControl !== 'FRACCIONABLE'" class="stock-metric">
                <span>Disponible</span>
                <strong>{{ getAvailableStock(quickProduct, quickArea) }}</strong>
              </div>
              <div class="stock-metric">
                <span>Prestados</span>
                <strong>{{ getLoanedStock(quickProduct.id, quickArea) }}</strong>
              </div>
              <div class="stock-metric">
                <span>Mínimo</span>
                <strong>{{ getStockMinimo(quickProduct) }}</strong>
              </div>
              <template v-if="quickProduct.categoriaControl === 'FRACCIONABLE'">
                <div class="stock-metric">
                  <span>Nuevos</span>
                  <strong>{{ getStockNuevo(quickProduct, quickArea) }}</strong>
                </div>
                <div class="stock-metric">
                  <span>Empezados</span>
                  <strong>{{ getStockEmpezado(quickProduct, quickArea) }}</strong>
                </div>
              </template>
            </div>

            <div class="form-card modern-form-card">
              <ion-item v-if="quickProduct.categoriaControl === 'FRACCIONABLE'" lines="full">
                <ion-label position="stacked">Afectar stock</ion-label>
                <ion-select v-model="quickStockTarget">
                  <ion-select-option value="stock">Envases nuevos/completos</ion-select-option>
                  <ion-select-option value="stockEmpezado">Empezados/sobrantes</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="full">
                <ion-label>Tipo de ajuste</ion-label>
                <ion-segment
                  :value="quickAdjust"
                  @ionChange="quickAdjust = $event.detail.value || 'add'"
                >
                  <ion-segment-button value="add">Entrada</ion-segment-button>
                  <ion-segment-button value="subtract">Salida</ion-segment-button>
                </ion-segment>
              </ion-item>

              <div class="field-stepper-card field-stepper-card--quick">
                <span>Cantidad</span>
                <div class="compact-stepper compact-stepper--quick">
                  <ion-button fill="clear" class="stepper-btn" @click="changeQuickCantidad(-1)">
                    <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                  </ion-button>
                  <ion-input
                    v-model.number="quickCantidad"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    class="stepper-input"
                    aria-label="Cantidad del ajuste de stock"
                    @ionBlur="normalizeQuickCantidad"
                  ></ion-input>
                  <ion-button fill="clear" class="stepper-btn" @click="changeQuickCantidad(1)">
                    <ion-icon slot="icon-only" :icon="add"></ion-icon>
                  </ion-button>
                </div>
              </div>
            </div>

            <ion-button expand="block" class="primary-action" @click="applyQuickStockAdjustment">Confirmar ajuste</ion-button>
          </div>

          <div v-else class="empty-state modern-state">
            <p>Escanea un código para seleccionar un producto.</p>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
  </template>

  <script setup>
import { ref, onMounted, computed, watch } from 'vue'
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
import { auth } from '../services/firebase'
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
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonAlert,
  IonToast,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  onIonViewWillLeave
} from '@ionic/vue'
import { add, remove, checkmarkCircle, apps, home, cube, people, swapHorizontal, print, camera, refresh, clipboardOutline, closeOutline } from 'ionicons/icons'

const router = useRouter()
const {
  products,
  loading,
  error,
  createProduct,
  getProducts,
  adjustProductStock,
  updateProduct,
  deleteProduct: deleteProductAPI
} = useProducts()
const { logMovimiento } = useMovimientos()
const { getPrestamos } = usePrestamos()

const searchTerm = ref('')
const areaFilter = ref('TODAS')
const sortMode = ref('name-asc')
const isModulesMenuOpen = ref(false)
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentProductId = ref(null)
const isScanning = ref(false)
const isModalScannerBusy = ref(false)
const barcodeError = ref('')
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
  categoriaControl: false,
  stock: false,
  stockEmpezado: false,
  stockMinimo: false,
  precio: false
})
const loanedStockMap = ref({})
const sessionGeneratedCodes = ref(new Set())

const AREAS_TALLER = ['OFICINA', 'BODEGA', 'SEGUNDO_PISO']
const AREA_LABELS = { OFICINA: 'Oficina', BODEGA: 'Bodega', SEGUNDO_PISO: 'Segundo Piso' }

const createEmptyStockPorArea = () => AREAS_TALLER.reduce((acc, area) => {
  acc[area] = { stock: 0, stockEmpezado: 0 }
  return acc
}, {})

const normalizeAreaKey = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (raw === 'SEGUNDO_PISO' || raw === 'SEGUNDOPISO') return 'SEGUNDO_PISO'
  if (raw === 'BODEGA') return 'BODEGA'
  return 'OFICINA'
}

const normalizeStockPorAreaLocal = (product = {}) => {
  const result = createEmptyStockPorArea()
  if (product.stockPorArea && typeof product.stockPorArea === 'object') {
    Object.entries(product.stockPorArea).forEach(([rawArea, data]) => {
      const area = normalizeAreaKey(rawArea)
      result[area] = {
        stock: Number(data?.stock || 0),
        stockEmpezado: product.categoriaControl === 'FRACCIONABLE' ? Number(data?.stockEmpezado || 0) : 0
      }
    })
  } else {
    result.OFICINA = {
      stock: Number(product.stock || 0),
      stockEmpezado: product.categoriaControl === 'FRACCIONABLE' ? Number(product.stockEmpezado || 0) : 0
    }
  }
  if (product.categoriaControl !== 'FRACCIONABLE') AREAS_TALLER.forEach((area) => { result[area].stockEmpezado = 0 })
  return result
}

const activeAreaFilter = computed(() => areaFilter.value)

const formData = ref({
  nombre: '',
  descripcion: '',
  categoriaControl: '',
  stockMinimo: 0,
  stock: 0,
  stockEmpezado: 0,
  stockPorArea: createEmptyStockPorArea(),
  precio: null,
  codigoBarras: ''
})

const LABEL_WIDTH_MM = 52
const LABEL_HEIGHT_MM = 25
const LABEL_WIDTH_PX = 416
const LABEL_HEIGHT_PX = 200
const LABEL_RENDER_SCALE = 2

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
  barcodeError.value = ''
  touched.value = {
    nombre: false,
    categoriaControl: false,
    stock: false,
    stockEmpezado: false,
    stockMinimo: false,
    precio: false
  }
  formData.value = {
    nombre: '',
    descripcion: '',
    categoriaControl: '',
    stockMinimo: 0,
    stock: 0,
    stockEmpezado: 0,
    stockPorArea: createEmptyStockPorArea(),
    precio: null,
    codigoBarras: ''
  }
}

const setTouched = (field) => {
  touched.value[field] = true
}

const normalizeIntegerValue = (value, min = 0, max = Number.POSITIVE_INFINITY) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

const normalizeAreaStock = (area, field) => {
  const areaKey = normalizeAreaKey(area)
  if (!formData.value.stockPorArea?.[areaKey]) return
  formData.value.stockPorArea[areaKey][field] = normalizeIntegerValue(formData.value.stockPorArea[areaKey][field], 0)
  setTouched(field === 'stockEmpezado' ? 'stockEmpezado' : 'stock')
}

const changeAreaStock = (area, field, delta) => {
  const areaKey = normalizeAreaKey(area)
  if (!formData.value.stockPorArea?.[areaKey]) return
  formData.value.stockPorArea[areaKey][field] = Number(formData.value.stockPorArea[areaKey][field] || 0) + Number(delta || 0)
  normalizeAreaStock(areaKey, field)
}

const normalizeStockMinimo = () => {
  formData.value.stockMinimo = normalizeIntegerValue(formData.value.stockMinimo, 0)
  setTouched('stockMinimo')
}

const changeStockMinimo = (delta) => {
  formData.value.stockMinimo = Number(formData.value.stockMinimo || 0) + Number(delta || 0)
  normalizeStockMinimo()
}

const normalizeQuickCantidad = () => {
  quickCantidad.value = normalizeIntegerValue(quickCantidad.value, 1)
}

const changeQuickCantidad = (delta) => {
  quickCantidad.value = Number(quickCantidad.value || 0) + Number(delta || 0)
  normalizeQuickCantidad()
}

const nombreError = computed(() => {
  return formData.value.nombre?.trim() ? '' : 'El nombre del producto es obligatorio.'
})

const stockError = computed(() => {
  for (const area of AREAS_TALLER) {
    const stock = Number(formData.value.stockPorArea?.[area]?.stock)
    if (!Number.isFinite(stock)) return `El stock de ${AREA_LABELS[area]} debe ser un numero.`
    if (!Number.isInteger(stock) || stock < 0) return `El stock de ${AREA_LABELS[area]} debe ser un entero mayor o igual a 0.`
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

const categoriaControlError = computed(() => {
  const categoria = String(formData.value.categoriaControl || '').trim().toUpperCase()
  if (!categoria) return 'Selecciona una forma de control para el producto.'
  if (!['UNIDAD', 'FRACCIONABLE', 'HERRAMIENTA'].includes(categoria)) {
    return 'La forma de control seleccionada no es válida.'
  }
  return ''
})

const stockPrimaryLabel = computed(() => {
  if (formData.value.categoriaControl === 'FRACCIONABLE') return 'Envases nuevos'
  if (formData.value.categoriaControl === 'HERRAMIENTA') return 'Herramientas disponibles'
  if (formData.value.categoriaControl === 'UNIDAD') return 'Piezas disponibles'
  return 'Cantidad disponible'
})

const stockEmpezadoError = computed(() => {
  if (formData.value.categoriaControl !== 'FRACCIONABLE') return ''
  for (const area of AREAS_TALLER) {
    const stock = Number(formData.value.stockPorArea?.[area]?.stockEmpezado)
    if (!Number.isFinite(stock)) return `El stock empezado de ${AREA_LABELS[area]} debe ser un numero.`
    if (!Number.isInteger(stock) || stock < 0) return `El stock empezado de ${AREA_LABELS[area]} debe ser un entero mayor o igual a 0.`
  }
  return ''
})

const stockMinimoError = computed(() => {
  const minimo = Number(formData.value.stockMinimo)
  if (!Number.isFinite(minimo)) return 'El mínimo recomendado debe ser un número.'
  if (!Number.isInteger(minimo) || minimo < 0) return 'El mínimo recomendado debe ser un entero mayor o igual a 0.'
  return ''
})

const isFormValid = computed(() => {
  return !nombreError.value && !categoriaControlError.value && !stockError.value && !precioError.value && !stockEmpezadoError.value && !stockMinimoError.value
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
    if (!['abierto', 'activo'].includes(prestamo.estado)) {
      return
    }

    ;(prestamo.detalles || []).forEach((item) => {
      const total = Number(item.cantidad || 0)
      const devuelto = Number(item.cantidadDevuelta || 0)
      const consumido = Number(item.cantidadConsumida || 0)
      const devueltoComoEmpezado = Number(item.cantidadDevueltaComoEmpezado || 0)
      const adeudado = Number(item.cantidadAdeudada || 0)
      const pendiente = Math.max(0, total - devuelto - consumido - devueltoComoEmpezado - adeudado)

      if (!item.productoId || pendiente <= 0) {
        return
      }

      const area = normalizeAreaKey(item.areaOrigen)
      map[item.productoId] = map[item.productoId] || {}
      map[item.productoId][area] = (map[item.productoId][area] || 0) + pendiente
    })
  })

  loanedStockMap.value = map
}

const getLoanedStock = (productId, area = 'TODAS') => {
  const byArea = loanedStockMap.value[productId] || {}
  if (area === 'TODAS') return Object.values(byArea).reduce((sum, value) => sum + Number(value || 0), 0)
  return Number(byArea[normalizeAreaKey(area)] || 0)
}

const getStockNuevo = (product, area = 'TODAS') => {
  const stockPorArea = normalizeStockPorAreaLocal(product)
  if (area === 'TODAS') return AREAS_TALLER.reduce((sum, key) => sum + Number(stockPorArea[key]?.stock || 0), 0)
  return Number(stockPorArea[normalizeAreaKey(area)]?.stock || 0)
}

const getStockEmpezado = (product, area = 'TODAS') => {
  if (product.categoriaControl !== 'FRACCIONABLE') return 0
  const stockPorArea = normalizeStockPorAreaLocal(product)
  if (area === 'TODAS') return AREAS_TALLER.reduce((sum, key) => sum + Number(stockPorArea[key]?.stockEmpezado || 0), 0)
  return Number(stockPorArea[normalizeAreaKey(area)]?.stockEmpezado || 0)
}

const getRealStock = (product, area = 'TODAS') => getStockNuevo(product, area)
const getAvailableStock = (product, area = 'TODAS') => getStockNuevo(product, area) + getStockEmpezado(product, area)
const getTotalStock = (product, area = 'TODAS') => getAvailableStock(product, area) + getLoanedStock(product.id, area)
const getStockMinimo = (product) => normalizeIntegerValue(product?.stockMinimo, 0)
const getSelectedAreaLabel = () => areaFilter.value === 'TODAS' ? 'Todas las áreas' : AREA_LABELS[normalizeAreaKey(areaFilter.value)]

const getControlLabel = (product) => {
  const categoria = String(product?.categoriaControl || 'UNIDAD').toUpperCase()
  if (categoria === 'FRACCIONABLE') return 'Por envase / fraccionable'
  if (categoria === 'HERRAMIENTA') return 'Herramienta retornable'
  return 'Por pieza'
}

const isLowStock = (product, area = activeAreaFilter.value) => {
  const available = getAvailableStock(product, area)
  const minimo = getStockMinimo(product)
  return minimo > 0 && available > 0 && available <= minimo
}

const getStockStatusLabel = (product) => {
  const available = getAvailableStock(product, activeAreaFilter.value)
  if (available <= 0) return 'Sin stock'
  return isLowStock(product) ? 'Stock bajo' : 'Con stock'
}

const getStockStatusClass = (product) => {
  const available = getAvailableStock(product, activeAreaFilter.value)
  if (available <= 0) return 'ui-chip--danger'
  return isLowStock(product) ? 'ui-chip--warning' : 'ui-chip--success'
}

const productsSummary = computed(() => {
  const list = products.value || []
  return {
    total: list.length,
    conStock: list.filter((product) => getAvailableStock(product) > 0).length,
    stockBajo: list.filter((product) => getAvailableStock(product) <= 0 || isLowStock(product, 'TODAS')).length,
    prestados: list.reduce((acc, product) => acc + getLoanedStock(product.id), 0)
  }
})

const filteredProducts = computed(() => {
  const query = searchTerm.value.toLowerCase().trim()
  const baseList = products.value.filter((product) => {
    const nombre = (product.nombre || '').toLowerCase()
    const codigo = (product.codigoBarras || '').toLowerCase()
    const matchesSearch = !query || nombre.includes(query) || codigo.includes(query)
    const matchesArea = areaFilter.value === 'TODAS' || getAvailableStock(product, areaFilter.value) > 0 || getLoanedStock(product.id, areaFilter.value) > 0
    return matchesSearch && matchesArea
  })

  const sortedList = [...baseList]
  const normalizeName = (product) => String(product.nombre || '').trim().toLocaleLowerCase('es-MX')

  sortedList.sort((a, b) => {
    if (sortMode.value === 'name-desc') {
      return normalizeName(b).localeCompare(normalizeName(a), 'es-MX', { sensitivity: 'base' })
    }

    if (sortMode.value === 'stock-desc') {
      const stockDiff = getTotalStock(b, activeAreaFilter.value) - getTotalStock(a, activeAreaFilter.value)
      return stockDiff || normalizeName(a).localeCompare(normalizeName(b), 'es-MX', { sensitivity: 'base' })
    }

    if (sortMode.value === 'stock-asc') {
      const stockDiff = getTotalStock(a, activeAreaFilter.value) - getTotalStock(b, activeAreaFilter.value)
      return stockDiff || normalizeName(a).localeCompare(normalizeName(b), 'es-MX', { sensitivity: 'base' })
    }

    return normalizeName(a).localeCompare(normalizeName(b), 'es-MX', { sensitivity: 'base' })
  })

  return sortedList
})

const isBarcodeUnique = (barcode) => {
  const trimmed = String(barcode || '').trim()
  if (!trimmed) return false
  
  // Validar contra códigos existentes en BD y en sesión actual
  const existingCodes = new Set([
    ...sessionGeneratedCodes.value,
    ...products.value.map(p => p.codigoBarras).filter(Boolean)
  ])
  
  return !existingCodes.has(trimmed)
}

const generateNewBarcode = () => {
  formData.value.codigoBarras = generateBarcode()
  barcodeError.value = ''
}

const openBarcodeScanner = async () => {
  barcodeError.value = ''
  if (isScanning.value || isModalScannerBusy.value) return
  if (isEditing.value) return // No permitir escaneo al editar

  if (!Capacitor?.isNativePlatform?.()) {
    barcodeError.value = 'El escaneo solo funciona en la app instalada.'
    return
  }

  isModalScannerBusy.value = true
  try {
    const { supported } = await BarcodeScanner.isSupported()
    if (!supported) {
      barcodeError.value = 'Este dispositivo no soporta escaneo de códigos.'
      return
    }

    const permissions = await BarcodeScanner.requestPermissions()
    if (permissions.camera !== 'granted') {
      barcodeError.value = 'Necesitas permitir acceso a la cámara.'
      return
    }

    if (Capacitor.getPlatform() === 'android') {
      const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
      if (!moduleStatus.available) {
        barcodeError.value = 'Instalando módulo de escaneo...'
        await BarcodeScanner.installGoogleBarcodeScannerModule()
        
        // Esperar a que se instale
        const started = Date.now()
        while (Date.now() - started < MODULE_INSTALL_TIMEOUT_MS) {
          const status = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
          if (status.available) {
            barcodeError.value = ''
            break
          }
          await new Promise((r) => setTimeout(r, MODULE_INSTALL_POLL_MS))
        }
      }
    }

    isScanning.value = true
    let scanTimeout = false
    let scannerTimeoutId = setTimeout(() => {
      scanTimeout = true
      BarcodeScanner.stopScan().catch(() => {})
      barcodeError.value = 'Tiempo de escaneo agotado (15s).'
      isScanning.value = false
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
    const scannedCode = (first?.rawValue || first?.displayValue || '').trim()
    
    if (!scannedCode) {
      barcodeError.value = 'No se detectó ningún código.'
      return
    }

    // Validar que el código sea único
    if (!isBarcodeUnique(scannedCode)) {
      barcodeError.value = `El código de barras ${scannedCode} ya existe.`
      return
    }

    formData.value.codigoBarras = scannedCode
    barcodeError.value = ''
  } catch (err) {
    const msg = err?.message || ''
    if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('timeout')) {
      barcodeError.value = err?.message || 'No se pudo iniciar el escáner.'
    }
  } finally {
    isScanning.value = false
    isModalScannerBusy.value = false
    await new Promise((r) => setTimeout(r, DEBOUNCE_DELAY_MS))
  }
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
  barcodeError.value = ''
  isModalOpen.value = true
}

const openEditProductModal = (product) => {
  isEditing.value = true
  currentProductId.value = product.id
  printError.value = ''
  formData.value = {
    nombre: product.nombre,
    descripcion: product.descripcion || '',
    categoriaControl: product.categoriaControl || 'UNIDAD',
    stockMinimo: normalizeIntegerValue(product.stockMinimo, 0),
    stock: Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0,
    stockEmpezado: Number.isFinite(Number(product.stockEmpezado)) ? Number(product.stockEmpezado) : 0,
    stockPorArea: normalizeStockPorAreaLocal(product),
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

const safeLabelFileName = (code) => String(code || 'etiqueta')
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'etiqueta'

const buildLabelDataUrl = (code, mimeType = 'image/png') => {
  const canvas = document.createElement('canvas')
  canvas.width = LABEL_WIDTH_PX * LABEL_RENDER_SCALE
  canvas.height = LABEL_HEIGHT_PX * LABEL_RENDER_SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el lienzo de impresion.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const barcodeCanvas = document.createElement('canvas')
  barcodeCanvas.width = canvas.width
  barcodeCanvas.height = canvas.height
  const barcodeCtx = barcodeCanvas.getContext('2d', { willReadFrequently: true })
  if (!barcodeCtx) throw new Error('No se pudo crear el lienzo del codigo de barras.')

  barcodeCtx.fillStyle = '#ffffff'
  barcodeCtx.fillRect(0, 0, barcodeCanvas.width, barcodeCanvas.height)

  const trimmedCode = String(code || '').trim()
  const codeLength = trimmedCode.length
  const barcodeWidth = codeLength <= 8
    ? 4.2
    : codeLength <= 12
      ? 3.2
      : codeLength <= 18
        ? 2.6
        : codeLength <= 24
          ? 2.1
          : 1.7

  JsBarcode(barcodeCanvas, trimmedCode, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    height: Math.round(barcodeCanvas.height * 0.96),
    width: barcodeWidth,
    lineColor: '#000000',
    background: '#ffffff'
  })

  const sourceImageData = barcodeCtx.getImageData(0, 0, barcodeCanvas.width, barcodeCanvas.height)
  const sourceData = sourceImageData.data
  let minX = barcodeCanvas.width
  let minY = barcodeCanvas.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < barcodeCanvas.height; y += 1) {
    for (let x = 0; x < barcodeCanvas.width; x += 1) {
      const index = (y * barcodeCanvas.width + x) * 4
      const luminance = 0.299 * sourceData[index] + 0.587 * sourceData[index + 1] + 0.114 * sourceData[index + 2]
      if (luminance < 245) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    minX = 0
    minY = 0
    maxX = barcodeCanvas.width - 1
    maxY = barcodeCanvas.height - 1
  }

  const sourceWidth = Math.max(1, maxX - minX + 1)
  const sourceHeight = Math.max(1, maxY - minY + 1)
  const pxPerMmX = canvas.width / LABEL_WIDTH_MM
  const pxPerMmY = canvas.height / LABEL_HEIGHT_MM
  const quietMarginX = Math.round(pxPerMmX * 1.6)
  const quietMarginTop = Math.round(pxPerMmY * 3.0)
  const quietMarginBottom = Math.round(pxPerMmY * 2.0)
  const targetX = quietMarginX
  const targetY = quietMarginTop
  const targetWidth = canvas.width - quietMarginX * 2
  const targetHeight = canvas.height - quietMarginTop - quietMarginBottom

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    barcodeCanvas,
    minX,
    minY,
    sourceWidth,
    sourceHeight,
    targetX,
    targetY,
    targetWidth,
    targetHeight
  )

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

  return canvas.toDataURL(mimeType, 1)
}

const buildBarcodeSvgMarkup = (code) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const trimmedCode = String(code || '').trim()
  const codeLength = trimmedCode.length
  const barcodeWidth = codeLength <= 8
    ? 4.2
    : codeLength <= 12
      ? 3.2
      : codeLength <= 18
        ? 2.6
        : codeLength <= 24
          ? 2.1
          : 1.7

  JsBarcode(svg, trimmedCode, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    height: 220,
    width: barcodeWidth,
    lineColor: '#000000',
    background: '#ffffff'
  })

  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('shape-rendering', 'crispEdges')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('aria-hidden', 'true')

  return new XMLSerializer().serializeToString(svg)
}

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]))

const printLabelInBrowser = (code) => {
  const svgMarkup = buildBarcodeSvgMarkup(code)
  const printWindow = window.open('', '_blank', 'width=520,height=360')
  if (!printWindow) {
    throw new Error('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para imprimir etiquetas.')
  }

  const safeCode = escapeHtml(code)
  const labelWidth = `${LABEL_WIDTH_MM}mm`
  const labelHeight = `${LABEL_HEIGHT_MM}mm`
  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Etiqueta ${safeCode}</title>
  <style>
    @page {
      size: ${labelWidth} ${labelHeight};
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html,
    body {
      width: ${labelWidth};
      min-width: ${labelWidth};
      max-width: ${labelWidth};
      height: ${labelHeight};
      min-height: ${labelHeight};
      max-height: ${labelHeight};
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: #ffffff;
    }

    body {
      position: relative;
    }

    .label {
      position: absolute;
      left: 0;
      top: 0;
      width: ${labelWidth};
      min-width: ${labelWidth};
      max-width: ${labelWidth};
      height: ${labelHeight};
      min-height: ${labelHeight};
      max-height: ${labelHeight};
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      page-break-after: avoid;
      break-after: avoid;
    }

    .barcode-safe-area {
      position: absolute;
      left: 2mm;
      top: 3.2mm;
      width: calc(${labelWidth} - 4mm);
      height: calc(${labelHeight} - 5.8mm);
      overflow: hidden;
      background: #ffffff;
    }

    .barcode-safe-area svg {
      display: block;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      shape-rendering: crispEdges;
    }

    .barcode-safe-area svg * {
      shape-rendering: crispEdges;
    }

    @media screen {
      body {
        outline: 1px dashed #94a3b8;
      }
    }

    @media print {
      html,
      body,
      .label {
        width: ${labelWidth} !important;
        height: ${labelHeight} !important;
      }

      .barcode-safe-area {
        left: 2mm !important;
        top: 3.2mm !important;
        width: calc(${labelWidth} - 4mm) !important;
        height: calc(${labelHeight} - 5.8mm) !important;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="barcode-safe-area">${svgMarkup}</div>
  </div>
  <script>
    const runPrint = () => {
      window.focus();
      window.print();
    };
    window.addEventListener('load', () => setTimeout(runPrint, 350));
  <\/script>
</body>
</html>`)
  printWindow.document.close()
}

const buildLabelPngFileUri = async (code) => {
  const pngDataUrl = buildLabelDataUrl(code, 'image/png')
  const pngBase64 = pngDataUrl.split(',')[1]
  if (!pngBase64) throw new Error('No se pudo generar la imagen de impresión.')

  const fileName = `etiqueta-${safeLabelFileName(code)}-52x25.png`
  const result = await Filesystem.writeFile({
    path: fileName,
    data: pngBase64,
    directory: Directory.Cache,
    recursive: true
  })

  return result.uri
}

const shareLabelToPrinterApp = async () => {
  printError.value = ''
  showPrintToast.value = false

  if (!isEditing.value) return

  const barcode = (formData.value.codigoBarras || '').trim()
  if (!barcode) {
    printError.value = 'El producto no tiene codigo de barras.'
    return
  }

  if (!Capacitor?.isNativePlatform?.()) {
    try {
      isPrinting.value = true
      printLabelInBrowser(barcode)
      printToastMessage.value = `Abriendo diálogo de impresión - ${barcode}`
      printToastColor.value = 'success'
      showPrintToast.value = true
    } catch (err) {
      const errorMsg = err?.message || 'No se pudo abrir la impresión del navegador.'
      printError.value = errorMsg
      printToastMessage.value = errorMsg
      printToastColor.value = 'danger'
      showPrintToast.value = true
    } finally {
      isPrinting.value = false
    }
    return
  }

  try {
    isPrinting.value = true
    const fileUri = await buildLabelPngFileUri(barcode)
    await Share.share({
      title: 'Etiqueta de producto',
      text: `Etiqueta ${barcode}. En PC se imprime con el diálogo normal; en móvil se comparte como imagen.`,
      files: [fileUri],
      dialogTitle: 'Compartir imagen de etiqueta con app de impresión'
    })

    printToastMessage.value = `Etiqueta lista para imprimir - ${barcode}`
    printToastColor.value = 'success'
    showPrintToast.value = true
  } catch (err) {
    const errorMsg = err?.message || 'No se pudo generar la etiqueta.'
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
  searchTerm.value = ''
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
const quickStockTarget = ref('stock')
const quickArea = ref('OFICINA')

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
  quickStockTarget.value = 'stock'
  quickArea.value = areaFilter.value === 'TODAS' ? 'OFICINA' : normalizeAreaKey(areaFilter.value)
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

  const isFraccionable = quickProduct.value.categoriaControl === 'FRACCIONABLE'
  const target = isFraccionable ? quickStockTarget.value : 'stock'
  const area = normalizeAreaKey(quickArea.value)
  const delta = quickAdjust.value === 'add' ? cantidad : -cantidad

  try {
    const adjustedProduct = await adjustProductStock(quickProduct.value.id, {
      area,
      stockDelta: target === 'stock' ? delta : 0,
      stockEmpezadoDelta: target === 'stockEmpezado' ? delta : 0
    })
    const next = Number(adjustedProduct.stockPorArea?.[area]?.[target] || 0)
    try {
      const usuario = auth.currentUser
      if (!usuario?.uid) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
      await logMovimiento({
        productoId: quickProduct.value.id,
        productoNombre: quickProduct.value.nombre,
        cantidad: quickAdjust.value === 'add' ? cantidad : -cantidad,
        tipo: quickAdjust.value === 'add' ? 'entrada' : 'salida',
        motivo: target === 'stockEmpezado' ? 'Ajuste rapido de stock empezado' : 'Ajuste rapido de stock nuevo',
        areaOrigen: area,
        usuarioId: usuario.uid,
        usuarioNombre: usuario.displayName || usuario.email || 'Usuario'
      })
    } catch (mErr) {
      console.warn('No se pudo registrar movimiento:', mErr)
    }
    quickModalOpen.value = false
    quickProduct.value = null
    await showSaveToastFn(`${target === 'stockEmpezado' ? 'Stock empezado' : 'Stock'} actualizado: ${next}`)
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
  const categoriaControl = String(formData.value.categoriaControl || '').trim().toUpperCase()

  // Compatibilidad interna: el usuario ya no captura tipo de producto.
  const tipo = categoriaControl === 'HERRAMIENTA' ? 'HERRAMIENTA' : 'RECURSO'
  const stockPorArea = normalizeStockPorAreaLocal({ ...formData.value, categoriaControl })
  const stock = AREAS_TALLER.reduce((sum, area) => sum + Number(stockPorArea[area]?.stock || 0), 0)
  const stockEmpezado = categoriaControl === 'FRACCIONABLE'
    ? AREAS_TALLER.reduce((sum, area) => sum + Number(stockPorArea[area]?.stockEmpezado || 0), 0)
    : 0
  const precioRaw = formData.value.precio
  const precio = precioRaw === '' || precioRaw === null || precioRaw === undefined
    ? null
    : Number(precioRaw)

  return {
    nombre,
    descripcion,
    tipo,
    categoriaControl,
    unidadStock: categoriaControl === 'FRACCIONABLE' ? 'ENVASE' : categoriaControl === 'HERRAMIENTA' ? 'UNIDAD' : 'PIEZA',
    stockMinimo: normalizeIntegerValue(formData.value.stockMinimo, 0),
    stockPorArea,
    stock: Number.isFinite(stock) ? stock : 0,
    stockEmpezado: categoriaControl === 'FRACCIONABLE'
      ? (Number.isFinite(stockEmpezado) ? stockEmpezado : 0)
      : 0,
    precio: Number.isFinite(precio) ? precio : null,
    codigoBarras: (formData.value.codigoBarras || '').trim() || generateBarcode(),
    activo: true
  }
}

const saveProduct = async () => {
  try {
    modalError.value = ''
    saveSuccess.value = false
    touched.value = {
      nombre: true,
      categoriaControl: true,
      stock: true,
      stockEmpezado: true,
      stockMinimo: true,
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


watch(() => formData.value.categoriaControl, (categoria) => {
  if (categoria !== 'FRACCIONABLE') {
    formData.value.stockEmpezado = 0
    AREAS_TALLER.forEach((area) => { formData.value.stockPorArea[area].stockEmpezado = 0 })
  }
})

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
.products-content {
  --background: #f5f7fb;
}

.page-container {
  padding: 0.75rem;
}

.products-page {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.modules-trigger {
  --color: #ffffff;
}

.module-hero {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 0.62rem;
  padding: 0.82rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #eef7ff 100%);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2563eb;
  margin-bottom: 0.18rem;
}

.hero-copy h2,
.toolbar-copy h3,
.quick-product-card h3 {
  margin: 0;
  color: #0f172a;
  font-weight: 800;
}

.hero-copy h2 {
  line-height: 1.18;
}

.hero-copy p,
.toolbar-copy p,
.quick-product-card p {
  margin: 0.18rem 0 0;
  color: #64748b;
  line-height: 1.28;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.34rem;
  min-width: 126px;
  flex-shrink: 0;
}

.hero-button {
  min-height: 36px;
  height: auto;
  margin: 0;
  font-weight: 700;
  line-height: 1.12;
  text-transform: none;
  --border-radius: 12px;
  --padding-top: 0.5rem;
  --padding-bottom: 0.5rem;
  --padding-start: 0.5rem;
  --padding-end: 0.5rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.38rem;
}

.overview-card {
  padding: 0.48rem 0.52rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.overview-card--primary {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.overview-label {
  display: block;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.1;
}

.overview-card strong {
  display: block;
  margin-top: 0.12rem;
  color: #0f172a;
  line-height: 1;
}

.toolbar-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  padding: 0.58rem;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.toolbar-copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.toolbar-copy h3 {
  margin: 0;
}

.toolbar-copy p {
  margin: 0;
  color: #64748b;
  white-space: nowrap;
}

.catalog-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(8rem, 9.6rem);
  align-items: center;
  gap: 0.42rem;
}

.area-filter-segment {
  width: 100%;
  --background: #ffffff;
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  padding: 0.16rem;
}

.area-filter-segment ion-segment-button {
  min-height: 34px;
  --background: transparent;
  --background-checked: transparent;
  --indicator-color: var(--ion-color-primary, #2563eb);
  --color: #475569;
  --color-checked: #475569;
  color: #475569;
  font-weight: 800;
  text-transform: none;
}

/* Mantiene la animación nativa del indicador deslizante de Ionic.
   El texto conserva el mismo color seleccionado o no seleccionado. */
.area-filter-segment ion-segment-button::part(native) {
  color: #475569 !important;
  background: transparent !important;
}

.area-filter-segment ion-segment-button.segment-button-checked::part(native),
.area-filter-segment ion-segment-button.area-filter-option--selected::part(native) {
  color: #475569 !important;
  background: transparent !important;
  font-weight: 900;
}

.area-filter-segment ion-segment-button::part(indicator-background) {
  background: var(--ion-color-primary, #2563eb);
  border-radius: 999px;
}

.product-searchbar {
  padding: 0;
  --background: #f8fafc;
  --box-shadow: none;
  --border-radius: 12px;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
  min-height: 38px;
}

.sort-control {
  --background: #f8fafc;
  --border-radius: 12px;
  --min-height: 36px;
  --padding-start: 0.48rem;
  --padding-end: 0.28rem;
  --inner-padding-end: 0;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  color: #0f172a;
}

.sort-control ion-label {
  color: #64748b;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.sort-control ion-select {
  min-height: 32px;
  font-weight: 700;
  --padding-start: 0.2rem;
  --padding-end: 0.2rem;
}

.products-list {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 0.54rem;
  padding: 0 0.02rem 0.6rem;
}

.product-sliding {
  border-radius: 14px;
  overflow: hidden;
  margin: 0;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.055);
}

.product-card {
  --background: #ffffff;
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
  --min-height: 0;
  --border-width: 0;
}

.product-card::part(native) {
  border-radius: 14px;
}

.product-card-content {
  width: 100%;
  padding: 0.66rem;
}

.product-topline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.28rem;
  margin-bottom: 0.28rem;
}

.product-title-block {
  min-width: 0;
}

.product-title-block h3 {
  margin: 0;
  color: #0f172a;
  font-weight: 800;
  line-height: 1.16;
  word-break: break-word;
}

.product-title-block p {
  margin: 0.14rem 0 0;
  color: #64748b;
  line-height: 1.22;
}

.product-chip-row,
.compact-chip-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.18rem;
}

.product-chip-row {
  max-width: 100%;
  justify-content: flex-start;
  margin-bottom: 0.38rem;
}

.ui-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 15px;
  padding: 0.06rem 0.28rem;
  border-radius: 999px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
}

.ui-chip--muted {
  color: #475569;
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.ui-chip--success {
  color: #047857;
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.ui-chip--danger {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.ui-chip--warning {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.stock-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.28rem;
}

.stock-grid--fraccionable {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.stock-metric {
  padding: 0.31rem 0.3rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  min-width: 0;
}

.stock-metric--main {
  background: #eef6ff;
  border-color: #bfdbfe;
}

.stock-metric span {
  display: block;
  color: #64748b;
  font-weight: 800;
  line-height: 1.05;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.stock-metric strong {
  display: block;
  margin-top: 0.12rem;
  color: #0f172a;
  line-height: 1;
}

.empty-state,
.loading-state,
.modern-state {
  text-align: center;
  padding: 1.8rem 1rem;
  color: #64748b;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 18px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.price,
.stock-ok,
.stock-danger {
  font-weight: 700;
}

.stock-ok {
  color: #047857;
}

.stock-danger {
  color: #b91c1c;
}

.modal-form {
  padding: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

:global(ion-modal.product-modal),
:global(ion-modal.quick-stock-modal) {
  --width: min(760px, 94vw);
  --height: min(86vh, 820px);
  --border-radius: 20px;
  --box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3);
  --backdrop-opacity: 0.42;
}

:global(ion-modal.product-modal::part(content)),
:global(ion-modal.quick-stock-modal::part(content)) {
  overflow: hidden;
  background: #f5f7fb;
}

.modal-content {
  --background: #f5f7fb;
  --padding-bottom: 8px;
}

.form-card,
.modern-form-card,
.quick-product-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 0.48rem;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.form-card ion-item,
.modern-form-card ion-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: 42px;
}

.form-card ion-label,
.modern-form-card ion-label {
  color: #334155;
  font-weight: 700;
}

.print-barcode-button,
.scan-barcode-button,
.generate-barcode-button,
.primary-action {
  height: 35px;
  margin: 0.35rem 0 0;
  font-weight: 700;
  text-transform: none;
  --border-radius: 12px;
}

.barcode-field-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.barcode-field-container ion-item {
  flex: 1;
}

.barcode-button-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.38rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.form-section {
  padding-top: 0.65rem;
}

.section-label {
  font-weight: 800;
  color: #0f172a;
  display: block;
  margin: 0 0 0.45rem;
}

.error-message {
  background-color: #fee2e2;
  color: #7f1d1d;
  padding: 0.68rem;
  border-radius: 12px;
  border-left: 4px solid #b45757;
}

.field-error {
  margin: -0.35rem 0 0.25rem;
  color: #b91c1c;
  padding: 0 0.35rem;
}

.field-hint {
  margin: 0.32rem 0 0;
  color: #64748b;
  line-height: 1.35;
}

.modal-footer {
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.modal-footer ion-toolbar {
  --background: #ffffff;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 8px;
  --padding-bottom: 10px;
}

.modal-actions {
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 0.5rem;
}

.quick-stock-form {
  padding-bottom: 1rem;
}

.quick-panel {
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
}

.quick-product-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.42rem;
}

.quick-product-card h3 {
}

.compact-chip-row {
  max-width: 45%;
}

.stock-grid--quick {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}



/* Armonía de controles y acciones */
.catalog-controls ion-item,
.sort-control,
.product-searchbar {
  margin: 0;
}

.product-searchbar::part(container) {
  min-height: 36px;
}

.product-searchbar::part(input) {
}

.hero-actions ion-button,
.modal-actions ion-button,
.primary-action,
.print-barcode-button,
.scan-barcode-button,
.generate-barcode-button {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.12;
}

.product-sliding ion-item-option {
  margin: 0;
  font-weight: 700;
}

.product-sliding ion-item-option::part(native) {
  padding-inline: 0.8rem;
}

.form-card + .form-card {
  margin-top: 0.08rem;
}

.modern-form-card + .primary-action,
.quick-panel .primary-action {
  margin-top: 0.55rem;
}

.modal-actions ion-button,
.modal-footer ion-button,
.quick-panel > ion-button {
  min-height: 38px;
  height: auto;
  margin: 0.12rem 0 0.18rem;
  --border-radius: 12px;
  --padding-top: 0.52rem;
  --padding-bottom: 0.52rem;
}

/* Ajuste fino de armonía visual móvil */
.module-hero,
.toolbar-card,
.overview-card,
.product-sliding,
.form-card,
.modern-form-card,
.quick-product-card {
  box-sizing: border-box;
}

.product-card-content,
.toolbar-card,
.module-hero {
  letter-spacing: 0;
}

.product-title-block p span {
  vertical-align: middle;
}

.product-stock-grid {
  align-items: stretch;
}

.product-stock-grid .stock-metric {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.product-card ion-label {
  margin: 0;
}

.quick-product-card {
  align-items: center;
}

.quick-product-card .stock-grid {
  margin-top: 0.45rem;
}

ion-button {
  text-transform: none;
}

@media (max-width: 720px) {
  .overview-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .overview-card {
    padding: 0.48rem 0.38rem;
  }

  .overview-label {
  }

  .overview-card strong {
  }

  .toolbar-card {
    gap: 0.38rem;
  }

  .catalog-controls {
    grid-template-columns: 1fr;
    gap: 0.34rem;
  }

  .area-filter-segment {
    overflow-x: auto;
  }

  .product-topline,
  .quick-product-card {
    flex-direction: column;
    align-items: stretch;
  }

  .product-chip-row,
  .compact-chip-row {
    max-width: 100%;
    justify-content: flex-start;
  }

  .stock-grid,
  .stock-grid--fraccionable,
  .stock-grid--quick {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stock-metric {
    padding: 0.3rem 0.28rem;
  }

  .stock-metric span {
  }

  .stock-metric strong {
  }
}

@media (max-width: 640px) {
  .page-container {
    padding: 0.62rem;
  }

  .module-hero {
    flex-direction: column;
    padding: 0.68rem;
  }

  .hero-actions {
    min-width: 0;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .hero-button {
    width: 100%;
    min-height: 36px;
    height: auto;
  }

  :global(ion-modal.product-modal),
  :global(ion-modal.quick-stock-modal) {
    --width: 96vw;
    --height: 90vh;
  }

  .modal-form {
    padding: 0.7rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .barcode-button-group {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 430px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stock-grid,
  .stock-grid--fraccionable,
  .stock-grid--quick {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .product-card-content {
    padding: 0.56rem;
  }

  .product-title-block h3 {
  }

  .ui-chip {
    padding: 0.05rem 0.24rem;
    min-height: 14px;
  }

  .toolbar-copy {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.05rem;
  }

  .toolbar-copy p {
    white-space: normal;
  }

  .sort-control,
  .product-searchbar {
    min-height: 34px;
  }

  .sort-control ion-select {
  }
}

/* Ajuste específico: botones con respiración dentro de cards/modales */
.form-card {
  padding-bottom: 0.64rem;
}

.barcode-button-group {
  margin-top: 0.24rem;
  margin-bottom: 0.1rem;
}

.scan-barcode-button,
.generate-barcode-button,
.print-barcode-button {
  min-height: 38px;
  height: auto;
  margin: 0.42rem 0 0.12rem;
  --padding-top: 0.48rem;
  --padding-bottom: 0.48rem;
  --padding-start: 0.5rem;
  --padding-end: 0.5rem;
}

.modal-actions {
  padding: 0.78rem 0.04rem 0.18rem;
  margin-top: 0.62rem;
}

.primary-action {
  min-height: 40px;
  height: auto;
  margin: 0.62rem 0 0.3rem;
  --padding-top: 0.56rem;
  --padding-bottom: 0.56rem;
  --padding-start: 0.65rem;
  --padding-end: 0.65rem;
}

.product-sliding {
  margin-bottom: 0.08rem;
}

@media (max-width: 430px) {
  .hero-actions {
    grid-template-columns: 1fr;
  }

  .barcode-button-group {
    gap: 0.48rem;
  }

  .scan-barcode-button,
  .generate-barcode-button,
  .print-barcode-button,
  .primary-action {
    min-height: 39px;
  }
}

/* Reestructura: stock por area */
.area-stock-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}
.area-stock-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 0.7rem;
}
.area-stock-card h4 {
  margin: 0 0 0.5rem;
  color: #111827;
}
@media (max-width: 720px) {
  .catalog-controls { grid-template-columns: 1fr; }
  .area-stock-grid { grid-template-columns: 1fr; }
}


/* Stepper táctil reutilizable para cantidades/stock */
.field-stepper-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.52rem;
  width: 100%;
  box-sizing: border-box;
  margin-top: 0.42rem;
  padding: 0.46rem 0.5rem;
  border: 1px solid #e4ebf5;
  border-radius: 12px;
  background: #ffffff;
}

.field-stepper-card > span {
  min-width: 0;
  color: #334155;
  font-weight: 820;
  line-height: 1.15;
}

.field-stepper-card--quick {
  background: #f8fafc;
}

.compact-stepper {
  display: grid;
  grid-template-columns: 30px 48px 30px;
  align-items: center;
  justify-items: center;
  justify-self: end;
  gap: 0.24rem;
}

.stepper-btn {
  width: 30px;
  height: 30px;
  min-width: 30px;
  min-height: 30px;
  max-width: 30px;
  max-height: 30px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 9px;
}

.stepper-btn::part(native) {
  width: 30px;
  height: 30px;
  min-width: 30px;
  min-height: 30px;
  max-width: 30px;
  max-height: 30px;
  display: grid;
  place-items: center;
  padding: 0;
  margin: 0;
  border: 1px solid #dbe3ee;
  border-radius: 9px;
  background: #ffffff;
  box-sizing: border-box;
}

.stepper-btn ion-icon {
  width: 14px;
  height: 14px;
  margin: 0;
  padding: 0;
}

.stepper-input {
  width: 48px;
  height: 34px;
  min-width: 48px;
  min-height: 34px;
  max-width: 48px;
  max-height: 34px;
  --background: #ffffff;
  --padding-start: 0;
  --padding-end: 0;
  border: 1px solid #dbe3ee;
  border-radius: 9px;
  overflow: hidden;
  text-align: center;
  font-weight: 850;
  box-sizing: border-box;
}

.stepper-input::part(native) {
  width: 100%;
  height: 100%;
  padding: 0;
  text-align: center;
  line-height: 34px;
}

@media (max-width: 430px) {
  .field-stepper-card {
    padding: 0.42rem 0.44rem;
  }

  .compact-stepper {
    grid-template-columns: 28px 44px 28px;
    gap: 0.2rem;
  }

  .stepper-btn,
  .stepper-btn::part(native) {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    max-width: 28px;
    max-height: 28px;
  }

  .stepper-input {
    width: 44px;
    min-width: 44px;
    max-width: 44px;
  }
}


/* Legibilidad móvil: textos claros y consistentes */
.products-page,
.modal-form,
.product-card-content,
.quick-product-card {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.product-title-block h3,
.quick-product-card h3,
.area-stock-card h4 {
  line-height: 1.22;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.hero-copy p,
.toolbar-copy p,
.product-title-block p,
.quick-product-card p,
.empty-state p,
.loading-state p,
.field-hint {
  line-height: 1.36;
}

.toolbar-copy h3,
.section-label {
  line-height: 1.24;
}

.ui-chip,
.overview-label,
.stock-metric span {
  line-height: 1.15;
  letter-spacing: 0.01em;
}

.stock-metric strong,
.overview-card strong {
  line-height: 1.05;
}

.form-card ion-label,
.modern-form-card ion-label,
.field-stepper-card > span,
.sort-control ion-label {
  line-height: 1.25;
  letter-spacing: 0;
}

.form-card ion-input,
.form-card ion-select,
.form-card ion-textarea,
.modern-form-card ion-input,
.modern-form-card ion-select,
.modern-form-card ion-textarea,
.product-searchbar::part(input) {
  line-height: 1.35;
}

.product-card-content,
.form-card,
.quick-product-card {
  padding: 0.68rem;
}

.stock-metric {
  padding: 0.42rem 0.4rem;
}

.area-stock-card {
  padding: 0.72rem;
}

.field-stepper-card {
  gap: 0.62rem;
}

.compact-stepper {
  align-items: center;
  justify-items: center;
}

.stepper-btn ion-icon {
  flex-shrink: 0;
}

@media (max-width: 430px) {
  .page-container {
    padding: 0.68rem;
  }

  .modal-form {
    padding: 0.72rem;
    gap: 0.62rem;
  }

  .module-hero p {
  }

  .stock-grid,
  .stock-grid--fraccionable,
  .stock-grid--quick {
    gap: 0.34rem;
  }

  .toolbar-copy p {
    white-space: normal;
  }
}

@media (max-width: 640px) {
  .products-page h2,
  .toolbar-copy h3,
  .product-title-block h3,
  .quick-product-card h3 {
    line-height: 1.25;
  }

  .hero-copy p,
  .toolbar-copy p,
  .product-title-block p,
  .quick-product-card p,
  .field-hint,
  .empty-state p,
  .loading-state p {
    line-height: 1.45;
  }

  .ui-chip,
  .overview-label,
  .stock-metric span,
  .field-stepper-card > span,
  .sort-control ion-label,
  .form-card ion-label,
  .modern-form-card ion-label,
  .section-label {
    line-height: 1.3;
  }

  .stock-metric strong,
  .overview-card strong {
    line-height: 1.1;
  }

  .form-card ion-input,
  .form-card ion-select,
  .form-card ion-textarea,
  .modern-form-card ion-input,
  .modern-form-card ion-select,
  .modern-form-card ion-textarea,
  .product-searchbar::part(input) {
    line-height: 1.4;
  }

  :global(ion-modal.product-modal) .modal-form,
  :global(ion-modal.product-modal) .modal-form *,
  :global(ion-modal.quick-stock-modal) .modal-form,
  :global(ion-modal.quick-stock-modal) .modal-form * {
    line-height: 1.4;
  }

  :global(ion-modal.product-modal) .modal-form h2,
  :global(ion-modal.product-modal) .modal-form h3,
  :global(ion-modal.quick-stock-modal) .modal-form h2,
  :global(ion-modal.quick-stock-modal) .modal-form h3 {
    line-height: 1.25;
  }
}

/* Escala tipográfica final mobile-first: Productos */
.products-page,
.products-page ion-label,
.modal-form,
.modal-form ion-label,
.product-card-content,
.quick-product-card {
  -webkit-font-smoothing: antialiased !important;
  text-rendering: optimizeLegibility !important;
}

.products-page ion-title,
:global(ion-modal.product-modal) ion-title,
:global(ion-modal.quick-stock-modal) ion-title {
  font-weight: 850 !important;
  line-height: 1.2 !important;
  letter-spacing: -0.01em !important;
}

.modules-trigger ion-icon,
.close-modal-btn ion-icon,
.hero-button ion-icon,
.primary-action ion-icon,
.stepper-btn ion-icon {
  flex-shrink: 0 !important;
}

.hero-copy h2 {
  line-height: 1.18 !important;
  font-weight: 900 !important;
  letter-spacing: -0.018em !important;
}

.hero-copy p,
.toolbar-copy p,
.product-title-block p,
.quick-product-card p,
.empty-state p,
.loading-state p,
.field-hint,
.field-error,
.error-message {
  line-height: 1.42 !important;
  letter-spacing: 0 !important;
}

.eyebrow,
.overview-label,
.stock-metric span,
.ui-chip,
.sort-control ion-label {
  line-height: 1.15 !important;
  letter-spacing: 0.018em !important;
}

.toolbar-copy h3,
.section-label,
.area-stock-card h4,
.quick-product-card h3 {
  line-height: 1.24 !important;
  font-weight: 900 !important;
  letter-spacing: -0.012em !important;
}

.product-title-block h3 {
  line-height: 1.26 !important;
  font-weight: 900 !important;
  letter-spacing: -0.014em !important;
  overflow-wrap: anywhere !important;
}

.overview-card strong,
.stock-metric strong {
  line-height: 1.08 !important;
  font-weight: 900 !important;
}

.form-card ion-label,
.modern-form-card ion-label,
.field-stepper-card > span,
.sort-control ion-label,
.area-stock-card label {
  line-height: 1.28 !important;
  font-weight: 800 !important;
  letter-spacing: 0 !important;
}

.form-card ion-input,
.form-card ion-select,
.form-card ion-textarea,
.modern-form-card ion-input,
.modern-form-card ion-select,
.modern-form-card ion-textarea,
.sort-control ion-select,
.product-searchbar::part(input) {
  line-height: 1.42 !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
}

.hero-button,
.primary-action,
.print-barcode-button,
.scan-barcode-button,
.generate-barcode-button,
.close-modal-btn,
.modal-actions ion-button,
ion-button,
.product-sliding ion-item-option {
  line-height: 1.2 !important;
  font-weight: 800 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.field-stepper-card > span {
  color: #334155 !important;
}

.stepper-input,
.stepper-input::part(native) {
  font-weight: 900 !important;
  line-height: 1 !important;
}

.stepper-btn ion-icon {
  width: 15px !important;
  height: 15px !important;
}

@media (max-width: 430px) {
  .hero-copy h2 {
  }

  .hero-copy p,
  .toolbar-copy p,
  .product-title-block p,
  .quick-product-card p,
  .empty-state p,
  .loading-state p,
  .field-hint,
  .field-error {
    line-height: 1.44 !important;
  }

  .toolbar-copy h3,
  .section-label,
  .area-stock-card h4,
  .quick-product-card h3 {
  }

  .product-title-block h3 {
  }

  .form-card ion-label,
  .modern-form-card ion-label,
  .field-stepper-card > span,
  .sort-control ion-label {
  }

  .form-card ion-input,
  .form-card ion-select,
  .form-card ion-textarea,
  .modern-form-card ion-input,
  .modern-form-card ion-select,
  .modern-form-card ion-textarea,
  .sort-control ion-select,
  .product-searchbar::part(input) {
  }
}


/* Ajuste final de fuentes en modales: legibilidad mobile consistente */
:global(ion-modal.product-modal),
:global(ion-modal.quick-stock-modal) {
}

:global(ion-modal.product-modal) ion-title,
:global(ion-modal.quick-stock-modal) ion-title {
  line-height: 1.18 !important;
  font-weight: 880 !important;
  letter-spacing: -0.012em !important;
}

:global(ion-modal.product-modal) .modal-form,
:global(ion-modal.quick-stock-modal) .modal-form,
:global(ion-modal.product-modal) ion-label,
:global(ion-modal.quick-stock-modal) ion-label {
  line-height: 1.36 !important;
  -webkit-font-smoothing: antialiased !important;
  text-rendering: optimizeLegibility !important;
}

:global(ion-modal.product-modal) h3,
:global(ion-modal.product-modal) h4,
:global(ion-modal.quick-stock-modal) h3,
:global(ion-modal.quick-stock-modal) h4,
:global(ion-modal.product-modal) .section-label,
:global(ion-modal.quick-stock-modal) .section-label,
:global(ion-modal.product-modal) .area-stock-card h4,
:global(ion-modal.quick-stock-modal) .quick-product-card h3 {
  line-height: 1.24 !important;
  font-weight: 900 !important;
  letter-spacing: -0.014em !important;
  overflow-wrap: anywhere !important;
}

:global(ion-modal.product-modal) p,
:global(ion-modal.quick-stock-modal) p,
:global(ion-modal.product-modal) .field-hint,
:global(ion-modal.quick-stock-modal) .field-hint,
:global(ion-modal.product-modal) .field-error,
:global(ion-modal.quick-stock-modal) .field-error,
:global(ion-modal.product-modal) .error-message,
:global(ion-modal.quick-stock-modal) .error-message {
  line-height: 1.42 !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
}

:global(ion-modal.product-modal) ion-label,
:global(ion-modal.quick-stock-modal) ion-label,
:global(ion-modal.product-modal) .field-stepper-card > span,
:global(ion-modal.quick-stock-modal) .field-stepper-card > span,
:global(ion-modal.product-modal) .section-label,
:global(ion-modal.quick-stock-modal) .section-label {
  line-height: 1.28 !important;
  font-weight: 820 !important;
  letter-spacing: 0 !important;
}

:global(ion-modal.product-modal) ion-input,
:global(ion-modal.product-modal) ion-select,
:global(ion-modal.product-modal) ion-textarea,
:global(ion-modal.quick-stock-modal) ion-input,
:global(ion-modal.quick-stock-modal) ion-select,
:global(ion-modal.quick-stock-modal) ion-textarea {
  line-height: 1.42 !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
}

:global(ion-modal.product-modal) .ui-chip,
:global(ion-modal.quick-stock-modal) .ui-chip,
:global(ion-modal.product-modal) .eyebrow,
:global(ion-modal.quick-stock-modal) .eyebrow,
:global(ion-modal.product-modal) .stock-metric span,
:global(ion-modal.quick-stock-modal) .stock-metric span {
  line-height: 1.14 !important;
  letter-spacing: 0.012em !important;
}

:global(ion-modal.product-modal) .stock-metric strong,
:global(ion-modal.quick-stock-modal) .stock-metric strong {
  line-height: 1.08 !important;
  font-weight: 900 !important;
}

:global(ion-modal.product-modal) .stepper-input,
:global(ion-modal.product-modal) .stepper-input::part(native),
:global(ion-modal.quick-stock-modal) .stepper-input,
:global(ion-modal.quick-stock-modal) .stepper-input::part(native) {
  line-height: 1 !important;
  font-weight: 900 !important;
}

:global(ion-modal.product-modal) ion-button,
:global(ion-modal.quick-stock-modal) ion-button,
:global(ion-modal.product-modal) .close-modal-btn,
:global(ion-modal.quick-stock-modal) .close-modal-btn,
:global(ion-modal.product-modal) .primary-action,
:global(ion-modal.quick-stock-modal) .primary-action,
:global(ion-modal.product-modal) .scan-barcode-button,
:global(ion-modal.product-modal) .generate-barcode-button,
:global(ion-modal.product-modal) .print-barcode-button {
  line-height: 1.22 !important;
  font-weight: 820 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  white-space: normal !important;
}

:global(ion-modal.product-modal) ion-icon,
:global(ion-modal.quick-stock-modal) ion-icon {
  flex-shrink: 0 !important;
}

@media (max-width: 430px) {
  :global(ion-modal.product-modal) .modal-form,
  :global(ion-modal.quick-stock-modal) .modal-form {
  }

  :global(ion-modal.product-modal) h3,
  :global(ion-modal.product-modal) h4,
  :global(ion-modal.quick-stock-modal) h3,
  :global(ion-modal.quick-stock-modal) h4,
  :global(ion-modal.product-modal) .section-label,
  :global(ion-modal.quick-stock-modal) .section-label,
  :global(ion-modal.product-modal) .area-stock-card h4,
  :global(ion-modal.quick-stock-modal) .quick-product-card h3 {
  }

  :global(ion-modal.product-modal) p,
  :global(ion-modal.quick-stock-modal) p,
  :global(ion-modal.product-modal) .field-hint,
  :global(ion-modal.quick-stock-modal) .field-hint,
  :global(ion-modal.product-modal) .field-error,
  :global(ion-modal.quick-stock-modal) .field-error {
    line-height: 1.44 !important;
  }

  :global(ion-modal.product-modal) ion-input,
  :global(ion-modal.product-modal) ion-select,
  :global(ion-modal.product-modal) ion-textarea,
  :global(ion-modal.quick-stock-modal) ion-input,
  :global(ion-modal.quick-stock-modal) ion-select,
  :global(ion-modal.quick-stock-modal) ion-textarea {
  }
}




/* Escala tipográfica estándar mobile - Productos
   XS: chips/meta · SM: ayuda/footnotes · MD: lectura/input · LG: títulos internos · XL: encabezado */
.products-content,
:global(ion-modal.product-modal),
:global(ion-modal.quick-stock-modal) {
}

.products-content,
.products-content ion-content,
.products-content ion-item,
.products-content ion-label,
:global(ion-modal.product-modal),
:global(ion-modal.quick-stock-modal),
:global(ion-modal.product-modal) ion-content,
:global(ion-modal.quick-stock-modal) ion-content,
:global(ion-modal.product-modal) ion-item,
:global(ion-modal.quick-stock-modal) ion-item,
:global(ion-modal.product-modal) ion-label,
:global(ion-modal.quick-stock-modal) ion-label {
  line-height: 1.38 !important;
  text-rendering: optimizeLegibility !important;
  -webkit-font-smoothing: antialiased !important;
}

.products-content ion-title,
:global(ion-modal.product-modal) ion-title,
:global(ion-modal.quick-stock-modal) ion-title {
  line-height: 1.2 !important;
  font-weight: 850 !important;
  letter-spacing: -0.01em !important;
}

.hero-copy h2,
.module-hero h2 {
  line-height: 1.16 !important;
  font-weight: 900 !important;
  letter-spacing: -0.02em !important;
}

.toolbar-copy h3,
.section-label,
.area-stock-card h4,
.quick-product-card h3,
.product-title-block h3,
:global(ion-modal.product-modal) h3,
:global(ion-modal.product-modal) h4,
:global(ion-modal.quick-stock-modal) h3,
:global(ion-modal.quick-stock-modal) h4 {
  line-height: 1.24 !important;
  font-weight: 850 !important;
  letter-spacing: -0.012em !important;
}

.hero-copy p,
.module-hero p,
.toolbar-copy p,
.product-title-block p,
.quick-product-card p,
.empty-state p,
.loading-state p,
.field-hint,
.field-error,
.card-footnote,
:global(ion-modal.product-modal) p,
:global(ion-modal.quick-stock-modal) p,
:global(ion-modal.product-modal) .field-hint,
:global(ion-modal.quick-stock-modal) .field-hint,
:global(ion-modal.product-modal) .field-error,
:global(ion-modal.quick-stock-modal) .field-error,
:global(ion-modal.product-modal) .error-message,
:global(ion-modal.quick-stock-modal) .error-message {
  line-height: 1.42 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.form-card ion-label,
.modern-form-card ion-label,
.field-stepper-card > span,
.sort-control ion-label,
:global(ion-modal.product-modal) ion-label,
:global(ion-modal.quick-stock-modal) ion-label,
:global(ion-modal.product-modal) .field-stepper-card > span,
:global(ion-modal.quick-stock-modal) .field-stepper-card > span,
:global(ion-modal.product-modal) .section-label,
:global(ion-modal.quick-stock-modal) .section-label {
  line-height: 1.28 !important;
  font-weight: 780 !important;
  letter-spacing: 0 !important;
}

.form-card ion-input,
.form-card ion-select,
.form-card ion-textarea,
.modern-form-card ion-input,
.modern-form-card ion-select,
.modern-form-card ion-textarea,
.sort-control ion-select,
.product-searchbar::part(input),
:global(ion-modal.product-modal) ion-input,
:global(ion-modal.product-modal) ion-select,
:global(ion-modal.product-modal) ion-textarea,
:global(ion-modal.quick-stock-modal) ion-input,
:global(ion-modal.quick-stock-modal) ion-select,
:global(ion-modal.quick-stock-modal) ion-textarea {
  line-height: 1.38 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.ui-chip,
.eyebrow,
.overview-label,
.stock-metric span,
:global(ion-modal.product-modal) .ui-chip,
:global(ion-modal.quick-stock-modal) .ui-chip,
:global(ion-modal.product-modal) .eyebrow,
:global(ion-modal.quick-stock-modal) .eyebrow,
:global(ion-modal.product-modal) .stock-metric span,
:global(ion-modal.quick-stock-modal) .stock-metric span {
  line-height: 1.15 !important;
  font-weight: 800 !important;
  letter-spacing: 0.012em !important;
}

.overview-card strong,
.stock-metric strong,
:global(ion-modal.product-modal) .stock-metric strong,
:global(ion-modal.quick-stock-modal) .stock-metric strong {
  line-height: 1.1 !important;
  font-weight: 900 !important;
  letter-spacing: -0.01em !important;
}

.stepper-input,
.stepper-input::part(native),
:global(ion-modal.product-modal) .stepper-input,
:global(ion-modal.product-modal) .stepper-input::part(native),
:global(ion-modal.quick-stock-modal) .stepper-input,
:global(ion-modal.quick-stock-modal) .stepper-input::part(native) {
  line-height: 1 !important;
  font-weight: 900 !important;
}

.hero-button,
.primary-action,
.print-barcode-button,
.scan-barcode-button,
.generate-barcode-button,
.close-modal-btn,
.modal-actions ion-button,
.modal-footer ion-button,
ion-button,
.product-sliding ion-item-option,
:global(ion-modal.product-modal) ion-button,
:global(ion-modal.quick-stock-modal) ion-button {
  line-height: 1.2 !important;
  font-weight: 780 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

@media (max-width: 430px) {
  .products-content,
  :global(ion-modal.product-modal),
  :global(ion-modal.quick-stock-modal) {
  }
}

/* Escala tipográfica ÚNICA mobile-first - Productos
   Máximo 4 tamaños reales:
   XS = chips/metadatos · SM = textos secundarios · MD = lectura/campos/botones · LG = títulos/valores */
.products-content,
:global(ion-modal.product-modal),
:global(ion-modal.quick-stock-modal) {
  --text-xs: 0.72rem;
  --text-sm: 0.82rem;
  --text-md: 0.92rem;
  --text-lg: 1.06rem;
}

.products-content,
.products-content ion-content,
.products-content ion-item,
.products-content ion-label,
:global(ion-modal.product-modal),
:global(ion-modal.quick-stock-modal),
:global(ion-modal.product-modal) ion-content,
:global(ion-modal.quick-stock-modal) ion-content,
:global(ion-modal.product-modal) ion-item,
:global(ion-modal.quick-stock-modal) ion-item,
:global(ion-modal.product-modal) ion-label,
:global(ion-modal.quick-stock-modal) ion-label {
  font-size: var(--text-md) !important;
  line-height: 1.38 !important;
  text-rendering: optimizeLegibility !important;
  -webkit-font-smoothing: antialiased !important;
}

.products-content ion-title,
:global(ion-modal.product-modal) ion-title,
:global(ion-modal.quick-stock-modal) ion-title,
.hero-copy h2,
.module-hero h2,
.toolbar-copy h3,
.section-label,
.area-stock-card h4,
.quick-product-card h3,
.product-title-block h3,
:global(ion-modal.product-modal) h2,
:global(ion-modal.product-modal) h3,
:global(ion-modal.product-modal) h4,
:global(ion-modal.quick-stock-modal) h2,
:global(ion-modal.quick-stock-modal) h3,
:global(ion-modal.quick-stock-modal) h4 {
  font-size: var(--text-lg) !important;
  line-height: 1.24 !important;
  font-weight: 850 !important;
  letter-spacing: -0.012em !important;
  overflow-wrap: anywhere !important;
}

.hero-copy p,
.module-hero p,
.toolbar-copy p,
.product-title-block p,
.quick-product-card p,
.empty-state p,
.loading-state p,
.field-hint,
.field-error,
.card-footnote,
:global(ion-modal.product-modal) p,
:global(ion-modal.quick-stock-modal) p,
:global(ion-modal.product-modal) .field-hint,
:global(ion-modal.quick-stock-modal) .field-hint,
:global(ion-modal.product-modal) .field-error,
:global(ion-modal.quick-stock-modal) .field-error,
:global(ion-modal.product-modal) .error-message,
:global(ion-modal.quick-stock-modal) .error-message {
  font-size: var(--text-sm) !important;
  line-height: 1.42 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.form-card ion-label,
.modern-form-card ion-label,
.field-stepper-card > span,
.sort-control ion-label,
:global(ion-modal.product-modal) ion-label,
:global(ion-modal.quick-stock-modal) ion-label,
:global(ion-modal.product-modal) .field-stepper-card > span,
:global(ion-modal.quick-stock-modal) .field-stepper-card > span,
:global(ion-modal.product-modal) .section-label,
:global(ion-modal.quick-stock-modal) .section-label,
.hero-button,
.primary-action,
.print-barcode-button,
.scan-barcode-button,
.generate-barcode-button,
.close-modal-btn,
.modal-actions ion-button,
.modal-footer ion-button,
ion-button,
.product-sliding ion-item-option,
:global(ion-modal.product-modal) ion-button,
:global(ion-modal.quick-stock-modal) ion-button {
  font-size: var(--text-md) !important;
  line-height: 1.28 !important;
  font-weight: 780 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.form-card ion-input,
.form-card ion-select,
.form-card ion-textarea,
.modern-form-card ion-input,
.modern-form-card ion-select,
.modern-form-card ion-textarea,
.sort-control ion-select,
.product-searchbar::part(input),
.stepper-input,
.stepper-input::part(native),
:global(ion-modal.product-modal) ion-input,
:global(ion-modal.product-modal) ion-select,
:global(ion-modal.product-modal) ion-textarea,
:global(ion-modal.quick-stock-modal) ion-input,
:global(ion-modal.quick-stock-modal) ion-select,
:global(ion-modal.quick-stock-modal) ion-textarea,
:global(ion-modal.product-modal) .stepper-input,
:global(ion-modal.product-modal) .stepper-input::part(native),
:global(ion-modal.quick-stock-modal) .stepper-input,
:global(ion-modal.quick-stock-modal) .stepper-input::part(native) {
  font-size: var(--text-md) !important;
  line-height: 1.38 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.ui-chip,
.eyebrow,
.overview-label,
.stock-metric span,
:global(ion-modal.product-modal) .ui-chip,
:global(ion-modal.quick-stock-modal) .ui-chip,
:global(ion-modal.product-modal) .eyebrow,
:global(ion-modal.quick-stock-modal) .eyebrow,
:global(ion-modal.product-modal) .stock-metric span,
:global(ion-modal.quick-stock-modal) .stock-metric span {
  font-size: var(--text-xs) !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  letter-spacing: 0.012em !important;
}

.overview-card strong,
.stock-metric strong,
:global(ion-modal.product-modal) .stock-metric strong,
:global(ion-modal.quick-stock-modal) .stock-metric strong {
  font-size: var(--text-lg) !important;
  line-height: 1.1 !important;
  font-weight: 900 !important;
  letter-spacing: -0.01em !important;
}

@media (max-width: 430px) {
  .products-content,
  :global(ion-modal.product-modal),
  :global(ion-modal.quick-stock-modal) {
    --text-xs: 0.72rem;
    --text-sm: 0.82rem;
    --text-md: 0.92rem;
    --text-lg: 1.06rem;
  }
}

</style>
