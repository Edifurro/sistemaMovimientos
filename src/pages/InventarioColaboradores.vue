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
        <ion-buttons slot="end">
          <ion-button color="light" @click="openCreateModal">
            <ion-icon slot="start" :icon="add"></ion-icon>
            Nuevo
          </ion-button>
        </ion-buttons>
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

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content pulling-text="Desliza para actualizar" refreshing-spinner="circles"></ion-refresher-content>
      </ion-refresher>

      <div class="page-container">
        <div class="page-header">
          <h2>Inventario de herramientas por colaborador</h2>
        </div>

        <div class="summary-row">
          <div class="summary-chip">Total: {{ totalCount }}</div>
          <div class="summary-chip summary-chip--complete">Completo: {{ completeCount }}</div>
          <div class="summary-chip summary-chip--incomplete">Incompleto: {{ incompleteCount }}</div>
          <div class="summary-chip summary-chip--missing">Faltante: {{ missingCount }}</div>
        </div>

        <div class="controls">
          <ion-searchbar
            v-model="searchText"
            placeholder="Buscar por colaborador, herramienta o codigo"
            :debounce="200"
          ></ion-searchbar>
          <ion-select v-model="colaboradorFilter" placeholder="Filtrar por colaborador">
            <ion-select-option value="">Todos los colaboradores</ion-select-option>
            <ion-select-option
              v-for="colaborador in collaboratorFilterOptions"
              :key="colaborador.id"
              :value="colaborador.id"
            >
              {{ colaborador.nombre }}
            </ion-select-option>
          </ion-select>
          <ion-segment v-model="estadoFilter">
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
          <div class="action-row">
            <ion-button expand="block" @click="openCreateModal">Nueva herramienta</ion-button>
            <ion-button expand="block" fill="outline" @click="triggerImportFile">Importar Excel</ion-button>
            <ion-button expand="block" fill="outline" @click="exportToExcel">Exportar Excel</ion-button>
          </div>
        </div>

        <div v-if="composableError" class="error-message">{{ composableError }}</div>

        <div v-if="loading && !filteredInventario.length" class="loading-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando inventario...</p>
        </div>

        <ion-list v-else-if="filteredInventario.length > 0">
          <ion-item-sliding v-for="item in filteredInventario" :key="item.id">
            <ion-item button @click="openEditModal(item)" :class="['inventory-row', getEstadoClass(item.estado)]">
              <ion-label>
                <h2>{{ item.herramienta }}</h2>
                <p>Colaborador: {{ item.colaboradorNombre || 'Sin colaborador' }}</p>
                <p>Marca: {{ item.marca || 'Sin marca' }}</p>
                <p>Codigo empleado: {{ item.codigoEmpleado || 'Sin codigo' }}</p>
                <p>Barcode: {{ item.barcode }}</p>
                <p>Cantidad: {{ item.cantidad || 1 }}</p>
                <p>Entrega: {{ formatDate(item.fechaEntrega) }}</p>
                <p class="descripcion-preview">{{ item.comentario || 'Sin comentario' }}</p>
              </ion-label>
              <ion-badge slot="end" :class="getEstadoBadgeClass(item.estado)">
                {{ getEstadoLabel(item.estado) }}
              </ion-badge>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="primary" @click="openEditModal(item)">
                Editar
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>

        <div v-else class="empty-state">
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
              <ion-label position="stacked">Colaborador</ion-label>
              <ion-select v-model="formData.colaboradorId" placeholder="Selecciona colaborador">
                <ion-select-option value="">Selecciona colaborador</ion-select-option>
                <ion-select-option
                  v-for="colaborador in colaboradores"
                  :key="colaborador.id"
                  :value="colaborador.id"
                >
                  {{ colaborador.nombre }} · {{ colaborador.codigoEmpleado || 'Sin codigo' }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Codigo de barras</ion-label>
              <ion-input v-model="formData.barcode" type="text" :legacy="true" readonly></ion-input>
            </ion-item>
            <p v-if="isGeneratingBarcode" class="field-hint">Generando codigo unico...</p>
            <p v-else class="field-hint">El codigo se genera automaticamente y queda guardado.</p>

            <div class="barcode-preview">
              <svg ref="barcodeSvgRef"></svg>
            </div>
          </div>

          <div class="form-card">
            <ion-item>
              <ion-label position="stacked">Herramienta</ion-label>
              <ion-input v-model="formData.herramienta" type="text" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Marca</ion-label>
              <ion-input v-model="formData.marca" type="text" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Cantidad</ion-label>
              <ion-input v-model="formData.cantidad" type="number" min="1" step="1" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Descripcion</ion-label>
              <ion-input v-model="formData.descripcion" type="text" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Estado</ion-label>
              <ion-select v-model="formData.estado" placeholder="Selecciona estado">
                <ion-select-option value="completo">Completo</ion-select-option>
                <ion-select-option value="incompleto">Incompleto</ion-select-option>
                <ion-select-option value="faltante">Faltante</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Fecha de entrega</ion-label>
              <ion-input v-model="formData.fechaEntrega" type="date" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Comentario</ion-label>
              <ion-textarea v-model="formData.comentario" rows="3" :legacy="true"></ion-textarea>
            </ion-item>
          </div>

          <div v-if="formError" class="error-message">{{ formError }}</div>
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

    <ion-toast
      :is-open="showToast"
      :message="toastMessage"
      :color="toastColor"
      duration="2200"
      position="top"
      @did-dismiss="showToast = false"
    ></ion-toast>
  </ion-page>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import JsBarcode from 'jsbarcode'
import { useColaboradores } from '../composables/useColaboradores'
import { useInventarioColaboradores } from '../composables/useInventarioColaboradores'
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
  IonToast,
  onIonViewWillLeave
} from '@ionic/vue'
import { add, apps, home, cube, people, swapHorizontal, clipboardOutline, refresh, closeOutline } from 'ionicons/icons'

const router = useRouter()
const { colaboradores, getColaboradores } = useColaboradores()
const {
  inventarioColaboradores,
  loading,
  error: composableError,
  getNextBarcode,
  getInventarioColaboradores,
  createInventarioColaborador,
  updateInventarioColaborador,
  upsertInventarioDesdeExcel
} = useInventarioColaboradores()

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

const totalCount = computed(() => inventarioColaboradores.value.length)
const completeCount = computed(() => inventarioColaboradores.value.filter((item) => item.estado === 'completo').length)
const incompleteCount = computed(() => inventarioColaboradores.value.filter((item) => item.estado === 'incompleto').length)
const missingCount = computed(() => inventarioColaboradores.value.filter((item) => item.estado === 'faltante').length)

const showFeedback = async (message, color = 'success') => {
  toastMessage.value = message
  toastColor.value = color
  showToast.value = true
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

    const result = await upsertInventarioDesdeExcel(rows)
    await refreshData()
    await showFeedback(`Importacion lista. Nuevos: ${result.created}, actualizados: ${result.updated}, omitidos: ${result.skipped}.`, 'success')
  } catch (err) {
    await showFeedback(err?.message || 'No se pudo importar el archivo.', 'danger')
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
.page-container {
  padding: 1rem;
}

.page-header {
  margin-bottom: 1rem;
}

.page-header h2 {
  margin: 0 0 0.35rem;
}

.subtitle {
  margin: 0;
  color: #64748b;
}

.summary-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.summary-chip {
  background: #e2e8f0;
  color: #334155;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
}

.summary-chip--complete {
  background: #dcfce7;
  color: #166534;
}

.summary-chip--incomplete {
  background: #fef3c7;
  color: #92400e;
}

.summary-chip--missing {
  background: #fee2e2;
  color: #991b1b;
}

.controls {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.inventory-row {
  --background: #f8fafc;
  --color: #0f172a;
  border-radius: 12px;
  margin-bottom: 0.5rem;
  border: 1px solid transparent;
}

.inventory-row--complete {
  --background: #ecfdf5;
  --color: #14532d;
  border-color: #bbf7d0;
}

.inventory-row--incomplete {
  --background: #fffbeb;
  --color: #92400e;
  border-color: #fde68a;
}

.inventory-row--missing {
  --background: #fef2f2;
  --color: #991b1b;
  border-color: #fecaca;
}

.action-row {
  display: grid;
  gap: 0.5rem;
}

.modules-trigger {
  --color: #ffffff;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
}

.loading-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.modal-form {
  padding: 1rem;
}

.modal-content {
  --background: #f8fafc;
}

.form-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.25rem;
  margin-bottom: 0.9rem;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.barcode-preview {
  padding: 0.75rem 0.75rem 1rem;
  overflow: hidden;
}

.modal-footer {
  --background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

:global(ion-modal.inventario-modal) {
  --width: min(860px, 94vw);
  --height: min(86vh, 900px);
  --border-radius: 16px;
  --backdrop-opacity: 0.45;
}

@media (max-width: 640px) {
  :global(ion-modal.inventario-modal) {
    --width: 96vw;
    --height: 92vh;
  }
}

.descripcion-preview {
  color: #334155;
  font-style: italic;
}

.field-hint {
  margin: 0.25rem 0 0.5rem;
  color: #64748b;
  font-size: 0.8rem;
  padding: 0 0.75rem;
}

.error-message {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 8px;
  padding: 0.75rem;
  margin: 0 0 1rem;
  border-left: 4px solid #b45757;
}

.hidden-file-input {
  display: none;
}
</style>