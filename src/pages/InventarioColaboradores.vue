<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="icon-only" :icon="apps"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Inventario de Colaboradores</ion-title>
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

    <ion-content class="inventory-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content pulling-text="Desliza para actualizar" refreshing-spinner="circles"></ion-refresher-content>
      </ion-refresher>

      <div class="page-container inventory-page">
        <section class="module-hero">
          <div class="hero-copy">
            <span class="eyebrow">Inventario</span>
            <h2>Colaboradores</h2>
            <p>Consulta, importa y actualiza herramientas asignadas por colaborador.</p>
          </div>
        </section>

        <section class="overview-grid" aria-label="Resumen de inventario de colaboradores">
          <article class="overview-card overview-card--primary">
            <span class="overview-label">Total</span>
            <strong>{{ totalCount }}</strong>
          </article>
          <article class="overview-card overview-card--success">
            <span class="overview-label">Completo</span>
            <strong>{{ completeCount }}</strong>
          </article>
          <article class="overview-card overview-card--warning">
            <span class="overview-label">Incompleto</span>
            <strong>{{ incompleteCount }}</strong>
          </article>
          <article class="overview-card overview-card--danger">
            <span class="overview-label">Faltante</span>
            <strong>{{ missingCount }}</strong>
          </article>
        </section>

        <section class="toolbar-card">
          <div class="toolbar-copy">
            <h3>Herramientas</h3>
            <p>{{ filteredInventario.length }} registros</p>
          </div>

          <div class="inventory-controls">
            <ion-searchbar
              v-model="searchText"
              placeholder="Buscar colaborador, herramienta o código"
              :debounce="200"
              show-clear-button="focus"
              inputmode="search"
              enterkeyhint="search"
              class="inventory-searchbar"
            ></ion-searchbar>

            <ion-item lines="none" class="filter-control collaborator-control">
              <ion-label>Colaborador</ion-label>
              <ion-select v-model="colaboradorFilter" placeholder="Todos" interface="popover">
                <ion-select-option value="">Todos</ion-select-option>
                <ion-select-option
                  v-for="colaborador in collaboratorFilterOptions"
                  :key="colaborador.id"
                  :value="colaborador.id"
                >
                  {{ colaborador.nombre }}
                </ion-select-option>
              </ion-select>
            </ion-item>
          </div>

          <ion-segment v-model="estadoFilter" class="modern-segment" scrollable>
            <ion-segment-button value="todos">
              <ion-label>Todos</ion-label>
            </ion-segment-button>
            <ion-segment-button value="completo">
              <ion-label>Completo</ion-label>
            </ion-segment-button>
            <ion-segment-button value="incompleto">
              <ion-label>Incompleto</ion-label>
            </ion-segment-button>
            <ion-segment-button value="faltante">
              <ion-label>Faltante</ion-label>
            </ion-segment-button>
          </ion-segment>

          <div class="action-grid">
            <ion-button expand="block" color="success" @click="openCreateModal">
              <ion-icon slot="start" :icon="add"></ion-icon>
              Nueva herramienta
            </ion-button>
            <ion-button expand="block" fill="outline" color="primary" @click="openBarcodeScanner">
              <ion-icon slot="start" :icon="camera"></ion-icon>
              Escanear
            </ion-button>
            <ion-button
              v-show="false"
              expand="block"
              fill="outline"
              class="hidden-import-action"
              aria-hidden="true"
              tabindex="-1"
              @click="triggerImportFile"
            >
              Importar Excel
            </ion-button>
            <ion-button expand="block" fill="outline" @click="exportToExcel">Exportar Excel</ion-button>
            <ion-button expand="block" fill="outline" color="tertiary" @click="startConteoForSelectedCollaborator" :disabled="!colaboradorFilter">
              <ion-icon slot="start" :icon="people"></ion-icon>
              Iniciar conteo
            </ion-button>
          </div>
        </section>

        <div v-if="composableError" class="error-message">{{ composableError }}</div>
        <div v-if="scannerError" class="error-message error-message--warning">{{ scannerError }}</div>

        <div v-if="loading && !filteredInventario.length" class="loading-state modern-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando inventario...</p>
        </div>

        <ion-list v-else-if="filteredInventario.length > 0" lines="none" class="inventory-list">
          <ion-item-sliding v-for="item in filteredInventario" :key="item.id" class="inventory-sliding">
            <ion-item button detail="false" lines="none" @click="openEditModal(item)" :class="['inventory-card', getEstadoClass(item.estado)]">
              <div class="inventory-card-content">
                <div class="inventory-topline">
                  <div class="inventory-title-block">
                    <h3>{{ item.herramienta }}</h3>
                    <p>{{ item.colaboradorNombre || 'Sin colaborador' }}</p>
                  </div>
                  <span class="ui-chip" :class="getEstadoBadgeClass(item.estado)">
                    {{ getEstadoLabel(item.estado) }}
                  </span>
                </div>

                <div class="inventory-chip-row">
                  <span class="ui-chip ui-chip--muted">{{ item.marca || 'Sin marca' }}</span>
                  <span class="ui-chip ui-chip--muted">{{ item.codigoEmpleado || 'Sin código empleado' }}</span>
                  <span v-if="item.descripcion" class="ui-chip ui-chip--muted">{{ item.descripcion }}</span>
                </div>

                <div class="inventory-metric-grid">
                  <div class="inventory-metric inventory-metric--main">
                    <span>Cantidad</span>
                    <strong>{{ item.cantidad || 1 }}</strong>
                  </div>
                  <div class="inventory-metric">
                    <span>Entrega</span>
                    <strong>{{ formatDate(item.fechaEntrega) }}</strong>
                  </div>
                  <div class="inventory-metric">
                    <span>Código</span>
                    <strong>{{ item.barcode || '—' }}</strong>
                  </div>
                </div>

                <p v-if="item.comentario" class="card-footnote">{{ item.comentario }}</p>
              </div>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="primary" @click="openEditModal(item)">
                Editar
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>

        <div v-else class="empty-state modern-state">
          <p>No hay registros para el filtro actual.</p>
          <ion-button fill="outline" @click="openCreateModal">Crear primer registro</ion-button>
        </div>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept=".xlsx,.xls"
        class="hidden-file-input"
        @change="handleImportFile"
      />
    </ion-content>

    <ion-modal
      :is-open="isModalOpen"
      :backdrop-dismiss="true"
      css-class="inventario-modal"
      @did-dismiss="closeModal"
    >
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>{{ isEditing ? 'Editar herramienta' : 'Nueva herramienta' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button v-if="!isEditing" :disabled="isGeneratingBarcode" @click="regenerateBarcode">
              <ion-icon slot="icon-only" :icon="refresh"></ion-icon>
            </ion-button>
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
            <span class="section-label">Asignación</span>
            <ion-item lines="none">
              <ion-label position="stacked">Colaborador</ion-label>
              <ion-select v-model="formData.colaboradorId" placeholder="Selecciona colaborador" interface="popover">
                <ion-select-option value="">Selecciona colaborador</ion-select-option>
                <ion-select-option
                  v-for="colaborador in colaboradores"
                  :key="colaborador.id"
                  :value="colaborador.id"
                >
                  {{ colaborador.nombre }} · {{ colaborador.codigoEmpleado || 'Sin código' }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Código de barras</ion-label>
              <ion-input v-model="formData.barcode" type="text" :legacy="true" readonly></ion-input>
            </ion-item>
            <p v-if="isGeneratingBarcode" class="field-hint">Generando código único...</p>
            <p v-else class="field-hint">El código se genera automáticamente y queda guardado.</p>

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
              {{ isPrinting ? 'Imprimiendo...' : 'Imprimir etiqueta' }}
            </ion-button>
            <ion-button
              v-if="isEditing && isNativePlatform"
              expand="block"
              fill="clear"
              size="small"
              :disabled="isPrinting"
              @click="resetTsplPrinter"
            >
              Cambiar impresora Bluetooth
            </ion-button>
            <p v-if="printError" class="field-error">{{ printError }}</p>
          </div>

          <div class="form-card">
            <span class="section-label">Datos de herramienta</span>
            <div class="form-grid">
              <ion-item lines="none">
                <ion-label position="stacked">Herramienta</ion-label>
                <ion-input v-model="formData.herramienta" type="text" :legacy="true"></ion-input>
              </ion-item>

              <ion-item lines="none">
                <ion-label position="stacked">Marca</ion-label>
                <ion-input v-model="formData.marca" type="text" :legacy="true"></ion-input>
              </ion-item>

              <ion-item lines="none">
                <ion-label position="stacked">Cantidad</ion-label>
                <ion-input v-model="formData.cantidad" type="number" min="1" step="1" :legacy="true"></ion-input>
              </ion-item>

              <ion-item lines="none">
                <ion-label position="stacked">Estado</ion-label>
                <ion-select v-model="formData.estado" placeholder="Selecciona estado" interface="popover">
                  <ion-select-option value="completo">Completo</ion-select-option>
                  <ion-select-option value="incompleto">Incompleto</ion-select-option>
                  <ion-select-option value="faltante">Faltante</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="none">
                <ion-label position="stacked">Fecha de entrega</ion-label>
                <ion-input v-model="formData.fechaEntrega" type="date" :legacy="true"></ion-input>
              </ion-item>

              <ion-item lines="none">
                <ion-label position="stacked">Descripción</ion-label>
                <ion-input v-model="formData.descripcion" type="text" :legacy="true"></ion-input>
              </ion-item>
            </div>

            <ion-item lines="none" class="textarea-item">
              <ion-label position="stacked">Comentario</ion-label>
              <ion-textarea v-model="formData.comentario" rows="3" :legacy="true"></ion-textarea>
            </ion-item>
          </div>

          <div v-if="formError" class="error-message">{{ formError }}</div>
          <div v-if="isEditing" class="modal-actions">
            <ion-button color="danger" expand="block" @click="confirmDelete">Eliminar herramienta</ion-button>
          </div>
        </div>
      </ion-content>
      <ion-footer class="modal-footer">
        <ion-toolbar>
          <ion-button expand="block" @click="saveInventario" :disabled="loading || isGeneratingBarcode">
            {{ loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar' }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <ion-modal :is-open="showImportOptionsModal" css-class="inventario-modal inventario-import-modal" @didDismiss="showImportOptionsModal = false">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Opciones de importación</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="cancelImport" class="close-modal-btn" :disabled="importInProgress">
              <ion-icon slot="start" :icon="closeOutline"></ion-icon>
              Cerrar
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form import-form">
          <div class="form-card import-summary-card">
            <span class="section-label">Resumen</span>
            <div class="inventory-metric-grid">
              <div class="inventory-metric inventory-metric--main">
                <span>Filas</span>
                <strong>{{ importRowsCount }}</strong>
              </div>
              <div class="inventory-metric">
                <span>Códigos únicos</span>
                <strong>{{ importUniqueBarcodesCount }}</strong>
              </div>
            </div>
          </div>

          <div class="form-card">
            <span class="section-label">Asignación opcional</span>
            <ion-item lines="none">
              <ion-label position="stacked">Asignar a colaborador</ion-label>
              <ion-select v-model="importAssignCollaborator" placeholder="No asignar" interface="popover">
                <ion-select-option value="">No asignar</ion-select-option>
                <ion-select-option v-for="c in collaboratorFilterOptions" :key="c.id" :value="c.id">{{ c.nombre }}</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item lines="none" class="toggle-item">
              <ion-label>Forzar asignación a todos</ion-label>
              <ion-toggle slot="end" v-model="importForceAssign"></ion-toggle>
            </ion-item>
          </div>

          <div v-if="importRowsPreview.length" class="form-card preview-card">
            <span class="section-label">Preview</span>
            <p class="field-hint">Primeras {{ importRowsPreview.length }} filas detectadas.</p>
            <ion-list lines="none" class="preview-list">
              <ion-item v-for="(r, idx) in importRowsPreview" :key="idx" lines="none" class="preview-item">
                <ion-label>
                  <h3>{{ r.herramienta || '—' }}</h3>
                  <p>Barcode: {{ r.barcode || '—' }}</p>
                  <p>Colaborador: {{ r.colaboradorNombre || '—' }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>

          <div v-if="importInProgress" class="form-card progress-card">
            <span class="section-label">Importando</span>
            <p><strong>{{ importProcessed }}</strong> / <strong>{{ importRowsCount }}</strong> (<strong>{{ Math.round(importProgress * 100) }}%</strong>)</p>
            <ion-progress-bar :value="importProgress"></ion-progress-bar>
            <p class="field-hint">Creados: {{ importCreated }} · Actualizados: {{ importUpdated }} · Omitidos: {{ importSkipped }}</p>
          </div>
        </div>
      </ion-content>
      <ion-footer class="modal-footer">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button color="medium" @click="cancelImport" :disabled="importInProgress">Cancelar</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button color="primary" @click="confirmImport" :disabled="!importRowsCount || importInProgress">{{ importInProgress ? 'Importando...' : 'Importar' }}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <ion-toast
      :is-open="showToast"
      :message="toastMessage"
      :color="toastColor"
      duration="2200"
      position="top"
      @did-dismiss="showToast = false"
    ></ion-toast>

    <ion-alert :is-open="showDeleteConfirm" header="Confirmar Eliminación" message="¿Estás seguro de que deseas eliminar este registro?" :buttons="deleteConfirmButtons"></ion-alert>
    <ion-alert :is-open="showImportResultAlert" header="Resultado de importación" :message="`Nuevos: ${importResult.created}, Actualizados: ${importResult.updated}, Omitidos: ${importResult.skipped}`" :buttons="importResultButtons"></ion-alert>
  </ion-page>
</template>


<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import JsBarcode from 'jsbarcode'
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { useColaboradores } from '../composables/useColaboradores'
import { useConteoColaborador } from '../composables/useConteoColaborador'
import { useAuth } from '../composables/useAuth'
import { useInventarioColaboradores } from '../composables/useInventarioColaboradores'
import { useTsplPrinter } from '../composables/useTsplPrinter'
import {
  buildInventarioColaboradoresWorkbook,
  parseInventarioColaboradoresWorkbook,
  stringifyInventarioColaboradoresWorkbook
} from '../utils/inventarioColaboradoresExcel'
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
  IonBadge,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonModal,
  IonInput,
  IonTextarea,
  IonFooter,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonProgressBar,
  IonToast,
  IonAlert,
  onIonViewWillLeave
} from '@ionic/vue'
import { add, apps, home, cube, people, swapHorizontal, clipboardOutline, refresh, closeOutline, print, camera } from 'ionicons/icons'

const router = useRouter()
const { colaboradores, getColaboradores } = useColaboradores()
const {
  inventarioColaboradores,
  loading,
  error: composableError,
  getNextBarcode,
  getInventarioColaboradores,
  getInventarioColaboradorById,
  createInventarioColaborador,
  updateInventarioColaborador,
  upsertInventarioDesdeExcel
  ,
  deleteInventarioColaborador
} = useInventarioColaboradores()

const { startConteo } = useConteoColaborador()
const { usuario } = useAuth()
const { printBarcodeLabel, forgetPrinter } = useTsplPrinter()
const isNativePlatform = Capacitor?.isNativePlatform?.() === true

const searchText = ref('')
const estadoFilter = ref('todos')
const colaboradorFilter = ref('')
const isModulesMenuOpen = ref(false)
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentItemId = ref('')
const isGeneratingBarcode = ref(false)
const formError = ref('')
const fileInputRef = ref(null)
const barcodeSvgRef = ref(null)
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref('success')
const showDeleteConfirm = ref(false)

const showImportResultAlert = ref(false)
const importResult = ref({ created: 0, updated: 0, skipped: 0 })
const importResultButtons = [
  {
    text: 'OK',
    role: 'cancel',
    handler: () => {
      showImportResultAlert.value = false
    }
  }
]

// Import options state
const showImportOptionsModal = ref(false)
const importRows = ref([])
const importAssignCollaborator = ref('')
const importForceAssign = ref(false)

const importRowsCount = computed(() => importRows.value.length)
const importUniqueBarcodesCount = computed(() => {
  const set = new Set(importRows.value.map((r) => String(r?.barcode || '').trim()).filter(Boolean))
  return set.size
})
const importRowsPreview = computed(() => importRows.value.slice(0, 5))

// Import progress state
const importInProgress = ref(false)
const importProcessed = ref(0)
const importCreated = ref(0)
const importUpdated = ref(0)
const importSkipped = ref(0)
const importProgress = computed(() => {
  const total = importRowsCount.value || 0
  return total ? Math.min(importProcessed.value / total, 1) : 0
})

// Scanner state
const isScanning = ref(false)
const isModalScannerBusy = ref(false)
const scannerError = ref('')

const SCANNER_TIMEOUT_MS = 15000
const DEBOUNCE_DELAY_MS = 800
const MODULE_INSTALL_TIMEOUT_MS = 20000
const MODULE_INSTALL_POLL_MS = 1000

const formData = ref({
  colaboradorId: '',
  barcode: '',
  herramienta: '',
  marca: '',
  cantidad: 1,
  descripcion: '',
  estado: 'completo',
  fechaEntrega: '',
  comentario: ''
})

const currentUserName = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.nombre || ''
  } catch {
    return ''
  }
}

const resetForm = () => {
  formError.value = ''
  formData.value = {
    colaboradorId: '',
    barcode: '',
    herramienta: '',
    marca: '',
    cantidad: 1,
    descripcion: '',
    estado: 'completo',
    fechaEntrega: new Date().toISOString().slice(0, 10),
    comentario: ''
  }
}

const collaboratorFilterOptions = computed(() => {
  return [...colaboradores.value].sort((left, right) => {
    return String(left.nombre || '').localeCompare(String(right.nombre || ''), 'es', { sensitivity: 'base' })
  })
})

const filteredInventario = computed(() => {
  const estado = String(estadoFilter.value || 'todos').trim().toLowerCase()
  const queryText = String(searchText.value || '').trim().toLowerCase()
  const collaboratorId = String(colaboradorFilter.value || '').trim()

  return inventarioColaboradores.value.filter((item) => {
    if (estado !== 'todos' && String(item.estado || '').toLowerCase() !== estado) {
      return false
    }

    if (collaboratorId && item.colaboradorId !== collaboratorId) {
      return false
    }

    if (!queryText) {
      return true
    }

    const blob = [
      item.barcode,
      item.colaboradorNombre,
      item.codigoEmpleado,
      item.herramienta,
      item.marca,
      item.descripcion,
      item.estado,
      item.comentario
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return blob.includes(queryText)
  })
})

const inventarioPorColaborador = computed(() => {
  const collaboratorId = String(colaboradorFilter.value || '').trim()
  if (!collaboratorId) return inventarioColaboradores.value
  return inventarioColaboradores.value.filter((item) => String(item.colaboradorId || '').trim() === collaboratorId)
})

const totalCount = computed(() => inventarioPorColaborador.value.length)
const completeCount = computed(() => inventarioPorColaborador.value.filter((item) => String(item.estado || '').toLowerCase() === 'completo').length)
const incompleteCount = computed(() => inventarioPorColaborador.value.filter((item) => String(item.estado || '').toLowerCase() === 'incompleto').length)
const missingCount = computed(() => inventarioPorColaborador.value.filter((item) => String(item.estado || '').toLowerCase() === 'faltante').length)

const showFeedback = async (message, color = 'success') => {
  toastMessage.value = message
  toastColor.value = color
  showToast.value = true
}

const isPrinting = ref(false)
const printError = ref('')
const notifyPrintResult = async (message, color = 'success') => {
  await showFeedback(message, color)
}

const LABEL_WIDTH_MM = 51
const LABEL_HEIGHT_MM = 25
const LABEL_WIDTH_PX = 408
const LABEL_HEIGHT_PX = 200
const LABEL_RENDER_SCALE = 2

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
  // Plantilla segura para Ctrl+P en Chrome/Edge.
  // La vista previa del navegador puede verse correcta, pero al imprimir el driver térmico
  // aplica su propio área útil. Estos márgenes evitan cortes sin reducir demasiado el barcode.
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

  const fileName = `etiqueta-${safeLabelFileName(code)}-51x25.png`
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

  if (!isEditing.value) return

  const barcode = (formData.value.barcode || '').trim()
  if (!barcode) {
    printError.value = 'El registro no tiene codigo de barras.'
    return
  }

  if (!Capacitor?.isNativePlatform?.()) {
    try {
      isPrinting.value = true
      printLabelInBrowser(barcode)
      const successMessage = `Abriendo diálogo de impresión - ${barcode}`
      await notifyPrintResult(successMessage, 'success')
    } catch (err) {
      const errorMsg = err?.message || 'No se pudo abrir la impresión del navegador.'
      printError.value = errorMsg
      await notifyPrintResult(errorMsg, 'danger')
    } finally {
      isPrinting.value = false
    }
    return
  }

  try {
    isPrinting.value = true
    const printer = await printBarcodeLabel(barcode)

    await showFeedback(`Etiqueta impresa en ${printer?.name || 'impresora TSPL'} - ${barcode}`, 'success')
  } catch (err) {
    const errorMsg = err?.message || 'No se pudo imprimir la etiqueta por Bluetooth.'
    if (!errorMsg.includes('cancel') && !errorMsg.includes('dismiss')) {
      printError.value = errorMsg
      await showFeedback(errorMsg, 'danger')
    }
  } finally {
    isPrinting.value = false
  }
}

const resetTsplPrinter = async () => {
  await forgetPrinter()
  printError.value = ''
  await showFeedback('Impresora eliminada. La próxima impresión permitirá seleccionar otra.', 'success')
}

const getEstadoClass = (estado) => {
  const normalized = String(estado || '').toLowerCase()
  if (normalized === 'faltante') return 'inventory-row--missing'
  if (normalized === 'incompleto') return 'inventory-row--incomplete'
  return 'inventory-row--complete'
}

const openModulesMenu = () => {
  isModulesMenuOpen.value = true
}

const navigateTo = async (path) => {
  isModulesMenuOpen.value = false
  await router.push(path)
}

const openBarcodeScanner = async () => {
  scannerError.value = ''
  if (isScanning.value || isModalScannerBusy.value) return

  if (!Capacitor?.isNativePlatform?.()) {
    scannerError.value = 'El escaneo solo funciona en la app instalada.'
    await showFeedback(scannerError.value, 'warning')
    return
  }

  isModalScannerBusy.value = true
  try {
    const { supported } = await BarcodeScanner.isSupported()
    if (!supported) {
      scannerError.value = 'Este dispositivo no soporta escaneo de códigos.'
      await showFeedback(scannerError.value, 'warning')
      return
    }

    const permissions = await BarcodeScanner.requestPermissions()
    if (permissions.camera !== 'granted') {
      scannerError.value = 'Necesitas permitir acceso a la cámara.'
      await showFeedback(scannerError.value, 'warning')
      return
    }

    if (Capacitor.getPlatform() === 'android') {
      const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
      if (!moduleStatus.available) {
        scannerError.value = 'Instalando módulo de escaneo...'
        await showFeedback(scannerError.value, 'warning')
        await BarcodeScanner.installGoogleBarcodeScannerModule()

        const started = Date.now()
        while (Date.now() - started < MODULE_INSTALL_TIMEOUT_MS) {
          const status = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
          if (status.available) {
            scannerError.value = ''
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
      scannerError.value = 'Tiempo de escaneo agotado (15s).'
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
      scannerError.value = 'No se detectó ningún código.'
      await showFeedback(scannerError.value, 'warning')
      return
    }

    // Buscar el item por barcode
    try {
      const found = await getInventarioColaboradorById(scannedCode)
      if (found) {
        openEditModal(found)
        await showFeedback(`Item encontrado: ${found.herramienta} · ${found.colaboradorNombre || 'Sin colaborador'}`, 'success')
      } else {
        await showFeedback(`No se encontró un item con el código ${scannedCode}.`, 'warning')
      }
    } catch (err) {
      await showFeedback(err?.message || 'Error buscando el código escaneado.', 'danger')
    }

  } catch (err) {
    const msg = err?.message || ''
    if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('timeout')) {
      scannerError.value = err?.message || 'No se pudo iniciar el escáner.'
      await showFeedback(scannerError.value, 'danger')
    }
  } finally {
    isScanning.value = false
    isModalScannerBusy.value = false
    await new Promise((r) => setTimeout(r, DEBOUNCE_DELAY_MS))
  }
}

const renderBarcode = async () => {
  await nextTick()
  const target = barcodeSvgRef.value
  const value = String(formData.value.barcode || '').trim()

  if (!target) return
  if (!value) {
    target.innerHTML = ''
    return
  }

  JsBarcode(target, value, {
    format: 'CODE128',
    width: 2,
    height: 70,
    displayValue: true,
    fontSize: 14,
    margin: 0,
    lineColor: '#0f172a'
  })
}

const regenerateBarcode = async () => {
  isGeneratingBarcode.value = true
  try {
    formData.value.barcode = await getNextBarcode()
    await renderBarcode()
  } catch (err) {
    formError.value = err?.message || 'No se pudo generar el codigo de barras.'
  } finally {
    isGeneratingBarcode.value = false
  }
}

const openCreateModal = async () => {
  isEditing.value = false
  currentItemId.value = ''
  resetForm()
  // Si hay un colaborador seleccionado en el filtro, pre-seleccionarlo en el formulario
  const selected = String(colaboradorFilter.value || '').trim()
  if (selected) {
    const exists = colaboradores.value.find((c) => String(c.id || '') === selected)
    if (exists) {
      formData.value.colaboradorId = selected
    }
  }
  isModalOpen.value = true
  await regenerateBarcode()
}

const openEditModal = async (item) => {
  isEditing.value = true
  currentItemId.value = item.id
  formError.value = ''
  formData.value = {
    colaboradorId: item.colaboradorId || '',
    barcode: item.barcode || '',
    herramienta: item.herramienta || '',
    marca: item.marca || '',
    cantidad: Number(item.cantidad || 1),
    descripcion: item.descripcion || '',
    estado: item.estado || 'completo',
    fechaEntrega: String(item.fechaEntrega || '').slice(0, 10),
    comentario: item.comentario || ''
  }
  isModalOpen.value = true
  await renderBarcode()
}

const closeModal = () => {
  isModalOpen.value = false
  isEditing.value = false
  currentItemId.value = ''
  isGeneratingBarcode.value = false
  resetForm()
}

const startConteoForSelectedCollaborator = async () => {
  try {
    const selected = String(colaboradorFilter.value || '').trim()
    if (!selected) {
      await showFeedback('Selecciona un colaborador primero', 'warning')
      return
    }
    const colaborador = colaboradores.value.find((c) => String(c.id) === selected)
    if (!colaborador) {
      await showFeedback('Colaborador no encontrado', 'warning')
      return
    }
    const inspectorId = usuario.value?.uid || ''
    const inspectorNombre = usuario.value?.nombre || ''
    const id = await startConteo({ colaboradorId: selected, colaboradorNombre: colaborador.nombre, inspectorId, inspectorNombre })
    await getInventarioColaboradores()
    await router.push(`/conteo/${id}`)
  } catch (err) {
    await showFeedback(err?.message || 'No se pudo iniciar el conteo', 'danger')
  }
}

const getEstadoColor = (estado) => {
  const normalized = String(estado || '').toLowerCase()
  if (normalized === 'faltante') return 'danger'
  if (normalized === 'incompleto') return 'warning'
  return 'success'
}

const getEstadoLabel = (estado) => {
  const normalized = String(estado || '').toLowerCase()
  if (normalized === 'faltante') return 'Faltante'
  if (normalized === 'incompleto') return 'Incompleto'
  return 'Completo'
}

const getEstadoBadgeClass = (estado) => {
  const normalized = String(estado || '').toLowerCase()
  if (normalized === 'faltante') return 'inventory-badge--missing'
  if (normalized === 'incompleto') return 'inventory-badge--incomplete'
  return 'inventory-badge--complete'
}

const formatDate = (value) => {
  if (!value) return 'Sin fecha'

  // Firestore Timestamp
  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate().toLocaleDateString('es-MX')
    } catch (e) {}
  }

  // Date object
  if (value instanceof Date) {
    return value.toLocaleDateString('es-MX')
  }

  // Numeric timestamp
  if (typeof value === 'number' || (/^\d+$/.test(String(value).trim()) && String(value).length >= 10)) {
    const dateNum = new Date(Number(value))
    if (!Number.isNaN(dateNum.getTime())) return dateNum.toLocaleDateString('es-MX')
  }

  // ISO date-only string YYYY-MM-DD -> construct local date (avoid timezone shift)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parts = value.split('-').map((p) => Number(p))
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('es-MX')
    }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-MX')
}

const validateForm = () => {
  const errors = []
  if (!String(formData.value.colaboradorId || '').trim()) {
    errors.push('Selecciona un colaborador.')
  }
  if (!String(formData.value.herramienta || '').trim()) {
    errors.push('La herramienta es obligatoria.')
  }
  const quantity = Number.parseInt(String(formData.value.cantidad || '').trim(), 10)
  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push('La cantidad debe ser un numero entero mayor o igual a 1.')
  }
  if (!String(formData.value.fechaEntrega || '').trim()) {
    errors.push('La fecha de entrega es obligatoria.')
  }
  if (!String(formData.value.barcode || '').trim()) {
    errors.push('No se pudo generar el codigo de barras.')
  }

  formError.value = errors[0] || ''
  return errors.length === 0
}

const saveInventario = async () => {
  if (!validateForm()) {
    return
  }

  const colaborador = colaboradores.value.find((item) => item.id === formData.value.colaboradorId)
  const payload = {
    ...formData.value,
    cantidad: Number.parseInt(String(formData.value.cantidad || 1), 10) || 1,
    colaboradorNombre: colaborador?.nombre || '',
    codigoEmpleado: colaborador?.codigoEmpleado || '',
    capturadoPorNombre: currentUserName()
  }

  try {
    if (isEditing.value && currentItemId.value) {
      await updateInventarioColaborador(currentItemId.value, payload)
      await showFeedback('Inventario actualizado', 'success')
    } else {
      await createInventarioColaborador(payload)
      await showFeedback('Inventario guardado', 'success')
    }

    await refreshData()
    closeModal()
  } catch (err) {
    formError.value = composableError.value || err?.message || 'No se pudo guardar el registro.'
  }
}

const confirmDelete = () => {
  showDeleteConfirm.value = true
}

const deleteConfirmButtons = [
  { text: 'Cancelar', role: 'cancel' },
  {
    text: 'Eliminar',
    role: 'destructive',
    handler: async () => {
      try {
        await deleteInventarioColaborador(currentItemId.value)
        await refreshData()
        closeModal()
        await showFeedback('Registro eliminado', 'success')
      } catch (err) {
        await showFeedback(err?.message || 'No se pudo eliminar el registro', 'danger')
      }
    }
  }
]

const triggerImportFile = () => {
  fileInputRef.value?.click()
}

const handleImportFile = async (event) => {
  const file = event?.target?.files?.[0]
  if (event?.target) {
    event.target.value = ''
  }

  if (!file) return

  try {
    const arrayBuffer = await file.arrayBuffer()
    const rows = parseInventarioColaboradoresWorkbook(arrayBuffer)
    if (!rows.length) {
      await showFeedback('El archivo no contiene filas validas.', 'warning')
      return
    }

    // Guardamos las filas y abrimos el modal de opciones para confirmar la importación
    importRows.value = rows
    importAssignCollaborator.value = String(colaboradorFilter.value || '').trim() || ''
    importForceAssign.value = false
    showImportOptionsModal.value = true
  } catch (err) {
    await showFeedback(err?.message || 'No se pudo importar el archivo.', 'danger')
  }
}

const cancelImport = () => {
  showImportOptionsModal.value = false
  importRows.value = []
  importAssignCollaborator.value = ''
  importForceAssign.value = false
}

const confirmImport = async () => {
  if (!importRows.value.length) return
  importInProgress.value = true
  importProcessed.value = 0
  importCreated.value = 0
  importUpdated.value = 0
  importSkipped.value = 0

  try {
    let rowsToImport = [...importRows.value]
    if (importAssignCollaborator.value) {
      const selected = colaboradores.value.find((c) => String(c.id || '') === String(importAssignCollaborator.value))
      const colaboradorNombre = selected?.nombre || ''
      const codigoEmpleado = selected?.codigoEmpleado || ''
      rowsToImport = rowsToImport.map((r) => {
        const copy = { ...r }
        if (importForceAssign.value || !copy.colaboradorId) {
          copy.colaboradorId = String(importAssignCollaborator.value)
          copy.colaboradorNombre = colaboradorNombre
          copy.codigoEmpleado = codigoEmpleado
        }
        return copy
      })
    }

    const progressCb = ({ index, total, created, updated, skipped }) => {
      importProcessed.value = Math.min((index || 0) + 1, total || importRowsCount.value)
      importCreated.value = created || 0
      importUpdated.value = updated || 0
      importSkipped.value = skipped || 0
    }

    const result = await upsertInventarioDesdeExcel(rowsToImport, progressCb)
    await refreshData()
    showImportOptionsModal.value = false
    importRows.value = []
    importAssignCollaborator.value = ''
    importForceAssign.value = false
    importResult.value = result
    showImportResultAlert.value = true
    await showFeedback(`Importacion lista. Nuevos: ${result.created}, actualizados: ${result.updated}, omitidos: ${result.skipped}.`, 'success')
  } catch (err) {
    await showFeedback(err?.message || 'No se pudo importar el archivo.', 'danger')
  } finally {
    importInProgress.value = false
  }
}

const exportToExcel = async () => {
  try {
    const rows = filteredInventario.value.length ? filteredInventario.value : inventarioColaboradores.value
    if (!rows.length) {
      await showFeedback('No hay registros para exportar.', 'warning')
      return
    }

    const workbook = buildInventarioColaboradoresWorkbook(rows)
    const fileName = `inventario-colaboradores-${new Date().toISOString().slice(0, 10)}.xlsx`

    if (Capacitor?.isNativePlatform?.()) {
      const base64Data = stringifyInventarioColaboradoresWorkbook(workbook, 'base64')
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true
      })

      await Share.share({
        title: 'Inventario de colaboradores',
        text: 'Archivo Excel del inventario de colaboradores',
        files: [result.uri],
        dialogTitle: 'Compartir inventario'
      })
    } else {
      const buffer = stringifyInventarioColaboradoresWorkbook(workbook, 'array')
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }

    await showFeedback('Excel exportado correctamente.', 'success')
  } catch (err) {
    await showFeedback(err?.message || 'No se pudo exportar el Excel.', 'danger')
  }
}

const refreshData = async () => {
  await Promise.all([getColaboradores(), getInventarioColaboradores()])
}

const handleRefresh = async (event) => {
  try {
    await refreshData()
  } catch (err) {
    await showFeedback(err?.message || 'No se pudo actualizar la lista.', 'danger')
  } finally {
    event?.target?.complete()
  }
}

watch(
  () => formData.value.barcode,
  async () => {
    if (isModalOpen.value) {
      await renderBarcode()
    }
  }
)

onMounted(async () => {
  resetForm()
  await refreshData()
})

onIonViewWillLeave(() => {
  closeModal()
})

onBeforeRouteLeave(() => {
  closeModal()
})
</script>

<style scoped>
.inventory-content {
  --background: #f5f7fb;
}

.page-container {
  padding: 0.75rem;
}

.inventory-page {
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

.hero-copy,
.inventory-title-block {
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
.inventory-title-block h3,
.preview-item h3 {
  margin: 0;
  color: #0f172a;
  font-weight: 850;
}

.hero-copy h2 {
  line-height: 1.18;
}

.hero-copy p,
.toolbar-copy p,
.inventory-title-block p,
.preview-item p,
.card-footnote {
  margin: 0.18rem 0 0;
  color: #64748b;
  line-height: 1.32;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.34rem;
  min-width: 132px;
  flex-shrink: 0;
}

.hero-button,
.action-grid ion-button,
.modal-footer ion-button,
.modal-actions ion-button,
.print-barcode-button,
.close-modal-btn {
  min-height: 38px;
  height: auto;
  margin: 0;
  font-weight: 780;
  line-height: 1.2;
  text-transform: none;
  white-space: normal;
  --border-radius: 12px;
  --padding-top: 0.52rem;
  --padding-bottom: 0.52rem;
  --padding-start: 0.58rem;
  --padding-end: 0.58rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.38rem;
}

.overview-card {
  padding: 0.48rem 0.52rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  min-width: 0;
}

.overview-card--primary {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.overview-card--success {
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.overview-card--warning {
  background: #fffbeb;
  border-color: #fde68a;
}

.overview-card--danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.overview-label {
  display: block;
  color: #64748b;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.1;
}

.overview-card strong {
  display: block;
  margin-top: 0.12rem;
  color: #0f172a;
  line-height: 1;
  font-weight: 900;
}

.toolbar-card,
.form-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.toolbar-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.58rem;
}

.toolbar-copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.toolbar-copy p {
  margin: 0;
  color: #64748b;
  white-space: nowrap;
}

.inventory-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(10rem, 12rem);
  align-items: center;
  gap: 0.42rem;
}

.inventory-searchbar {
  padding: 0;
  --background: #f8fafc;
  --box-shadow: none;
  --border-radius: 12px;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
  min-height: 38px;
}

.inventory-searchbar::part(container) {
  min-height: 36px;
}

.filter-control {
  --background: #f8fafc;
  --border-radius: 12px;
  --min-height: 38px;
  --padding-start: 0.48rem;
  --padding-end: 0.28rem;
  --inner-padding-end: 0;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  color: #0f172a;
  margin: 0;
}

.filter-control ion-label {
  color: #64748b;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.filter-control ion-select {
  min-height: 32px;
  font-weight: 700;
  --padding-start: 0.2rem;
  --padding-end: 0.2rem;
}

.modern-segment {
  background: #f8fafc;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  padding: 0.16rem;
}

.modern-segment ion-segment-button {
  --border-radius: 10px;
  --indicator-color: #ffffff;
  --color: #64748b;
  --color-checked: #0f172a;
  min-height: 34px;
  text-transform: none;
  font-weight: 800;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.42rem;
}

.inventory-list {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 0.54rem;
  padding: 0 0.02rem 0.6rem;
}

.inventory-sliding {
  border-radius: 14px;
  overflow: hidden;
  margin: 0;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.055);
}

.inventory-card {
  --background: #ffffff;
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
  --min-height: 0;
  --border-width: 0;
}

.inventory-card::part(native) {
  border-radius: 14px;
}

.inventory-card-content {
  width: 100%;
  padding: 0.66rem;
  border-left: 4px solid #bfdbfe;
}

.inventory-row--complete .inventory-card-content {
  border-left-color: #86efac;
}

.inventory-row--incomplete .inventory-card-content {
  border-left-color: #fcd34d;
}

.inventory-row--missing .inventory-card-content {
  border-left-color: #fca5a5;
}

.inventory-topline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.38rem;
  margin-bottom: 0.34rem;
}

.inventory-title-block h3 {
  line-height: 1.16;
  word-break: break-word;
}

.inventory-title-block p {
  line-height: 1.22;
}

.inventory-chip-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.22rem;
  margin-bottom: 0.44rem;
}

.ui-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 16px;
  padding: 0.08rem 0.34rem;
  border-radius: 999px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ui-chip--muted {
  color: #475569;
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.inventory-badge--complete {
  color: #047857;
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.inventory-badge--incomplete {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.inventory-badge--missing {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.inventory-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.28rem;
}

.inventory-metric {
  padding: 0.34rem 0.34rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  min-width: 0;
}

.inventory-metric--main {
  background: #eef6ff;
  border-color: #bfdbfe;
}

.inventory-metric span {
  display: block;
  color: #64748b;
  font-weight: 800;
  line-height: 1.05;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.inventory-metric strong {
  display: block;
  margin-top: 0.12rem;
  color: #0f172a;
  line-height: 1.1;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.card-footnote {
  margin-top: 0.48rem;
  padding-top: 0.42rem;
  border-top: 1px dashed #e2e8f0;
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

.modal-form {
  padding: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

:global(ion-modal.inventario-modal) {
  --width: min(820px, 94vw);
  --height: min(86vh, 860px);
  --border-radius: 20px;
  --box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3);
  --backdrop-opacity: 0.42;
}

:global(ion-modal.inventario-modal::part(content)) {
  overflow: hidden;
  background: #f5f7fb;
}

.modal-content {
  --background: #f5f7fb;
  --padding-bottom: 8px;
}

.form-card {
  padding: 0.56rem;
}

.form-card ion-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: 42px;
}

.form-card ion-label {
  color: #334155;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.textarea-item {
  margin-top: 0.32rem;
}

.section-label {
  font-weight: 850;
  color: #0f172a;
  display: block;
  margin: 0 0 0.45rem;
}

.print-barcode-button {
  margin-top: 0.42rem;
}

.field-hint {
  margin: 0.32rem 0 0;
  color: #64748b;
  line-height: 1.35;
}

.field-error {
  margin: 0.35rem 0 0;
  color: #b91c1c;
}

.error-message {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #7f1d1d;
  border-radius: 12px;
  padding: 0.68rem;
  border-left: 4px solid #b45757;
}

.error-message--warning {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.modal-actions {
  padding: 0.78rem 0.04rem 0.18rem;
  margin-top: 0.16rem;
  border-top: 1px solid #e5e7eb;
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

.import-form {
  padding-bottom: 1rem;
}

.import-summary-card .inventory-metric-grid {
  margin-top: 0.1rem;
}

.toggle-item {
  margin-top: 0.25rem;
}

.preview-list {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
  padding: 0;
  margin-top: 0.42rem;
}

.preview-item {
  --background: #f8fafc;
  --border-radius: 12px;
  --padding-start: 0.48rem;
  --inner-padding-end: 0.48rem;
  border: 1px solid #edf2f7;
  border-radius: 12px;
}

.progress-card ion-progress-bar {
  margin: 0.55rem 0 0.45rem;
}

.inventory-sliding ion-item-option {
  margin: 0;
  font-weight: 700;
}

.inventory-sliding ion-item-option::part(native) {
  padding-inline: 0.8rem;
}

.hidden-file-input {
  display: none;
}

ion-button {
  text-transform: none;
}

@media (max-width: 720px) {
  .inventory-controls {
    grid-template-columns: 1fr;
    gap: 0.34rem;
  }

  .action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .inventory-topline {
    flex-direction: column;
    align-items: flex-start;
  }

  .inventory-metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  :global(ion-modal.inventario-modal) {
    --width: 96vw;
    --height: 90vh;
  }

  .modal-form {
    padding: 0.7rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 430px) {
  .overview-grid,
  .inventory-metric-grid,
  .action-grid,
  .hero-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .inventory-card-content {
    padding: 0.56rem;
  }

  .toolbar-copy {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.05rem;
  }

  .toolbar-copy p {
    white-space: normal;
  }

  .ui-chip {
    padding: 0.06rem 0.28rem;
    min-height: 15px;
  }

  .filter-control,
  .inventory-searchbar {
    min-height: 34px;
  }
}

/* Escala tipográfica ÚNICA mobile-first - Inventario colaboradores
   Máximo 4 tamaños reales:
   XS = chips/metadatos · SM = textos secundarios · MD = lectura/campos/botones · LG = títulos/valores */
.inventory-content,
:global(ion-modal.inventario-modal) {
  --text-xs: 0.72rem;
  --text-sm: 0.82rem;
  --text-md: 0.92rem;
  --text-lg: 1.06rem;
}

.inventory-content,
.inventory-content ion-content,
.inventory-content ion-item,
.inventory-content ion-label,
:global(ion-modal.inventario-modal),
:global(ion-modal.inventario-modal) ion-content,
:global(ion-modal.inventario-modal) ion-item,
:global(ion-modal.inventario-modal) ion-label {
  font-size: var(--text-md) !important;
  line-height: 1.38 !important;
  text-rendering: optimizeLegibility !important;
  -webkit-font-smoothing: antialiased !important;
}

.inventory-content ion-title,
:global(ion-modal.inventario-modal) ion-title,
.hero-copy h2,
.module-hero h2,
.toolbar-copy h3,
.inventory-title-block h3,
.preview-item h3,
.section-label,
:global(ion-modal.inventario-modal) h2,
:global(ion-modal.inventario-modal) h3,
:global(ion-modal.inventario-modal) h4 {
  font-size: var(--text-lg) !important;
  line-height: 1.24 !important;
  font-weight: 850 !important;
  letter-spacing: -0.012em !important;
  overflow-wrap: anywhere !important;
}

.hero-copy p,
.module-hero p,
.toolbar-copy p,
.inventory-title-block p,
.preview-item p,
.empty-state p,
.loading-state p,
.field-hint,
.field-error,
.card-footnote,
.error-message,
:global(ion-modal.inventario-modal) p,
:global(ion-modal.inventario-modal) .field-hint,
:global(ion-modal.inventario-modal) .field-error,
:global(ion-modal.inventario-modal) .error-message {
  font-size: var(--text-sm) !important;
  line-height: 1.42 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.form-card ion-label,
.filter-control ion-label,
.hero-button,
.action-grid ion-button,
.modal-footer ion-button,
.modal-actions ion-button,
.print-barcode-button,
.close-modal-btn,
ion-button,
.inventory-sliding ion-item-option,
:global(ion-modal.inventario-modal) ion-button,
:global(ion-modal.inventario-modal) ion-label {
  font-size: var(--text-md) !important;
  line-height: 1.28 !important;
  font-weight: 780 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.form-card ion-input,
.form-card ion-select,
.form-card ion-textarea,
.filter-control ion-select,
.inventory-searchbar::part(input),
:global(ion-modal.inventario-modal) ion-input,
:global(ion-modal.inventario-modal) ion-select,
:global(ion-modal.inventario-modal) ion-textarea {
  font-size: var(--text-md) !important;
  line-height: 1.38 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.ui-chip,
.eyebrow,
.overview-label,
.inventory-metric span,
:global(ion-modal.inventario-modal) .ui-chip,
:global(ion-modal.inventario-modal) .eyebrow,
:global(ion-modal.inventario-modal) .inventory-metric span {
  font-size: var(--text-xs) !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  letter-spacing: 0.012em !important;
}

.overview-card strong,
.inventory-metric strong,
:global(ion-modal.inventario-modal) .inventory-metric strong {
  font-size: var(--text-lg) !important;
  line-height: 1.1 !important;
  font-weight: 900 !important;
  letter-spacing: -0.01em !important;
}

@media (max-width: 430px) {
  .inventory-content,
  :global(ion-modal.inventario-modal) {
    --text-xs: 0.72rem;
    --text-sm: 0.82rem;
    --text-md: 0.92rem;
    --text-lg: 1.06rem;
  }
}
</style>
