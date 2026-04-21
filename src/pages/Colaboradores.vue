<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="icon-only" :icon="apps"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Colaboradores</ion-title>
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
        </ion-list>
      </ion-content>
    </ion-popover>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content pulling-text="Desliza para actualizar" refreshing-spinner="circles"></ion-refresher-content>
      </ion-refresher>

      <div class="page-container">
        <div class="page-header">
          <h2>Gestión de Colaboradores</h2>
          <p class="subtitle">Administra datos, estado activo y contacto del equipo.</p>
        </div>

        <div class="summary-row">
          <div class="summary-chip summary-chip--active">Activos: {{ activeCount }}</div>
          <div class="summary-chip summary-chip--inactive">Inactivos: {{ inactiveCount }}</div>
          <div class="summary-chip">Total: {{ colaboradores.length }}</div>
        </div>

        <div class="controls">
          <ion-searchbar
            v-model="searchText"
            placeholder="Buscar por nombre, codigo o cargo"
            :debounce="200"
          ></ion-searchbar>
          <ion-segment v-model="statusFilter">
            <ion-segment-button value="activos">
              <ion-label>Activos</ion-label>
            </ion-segment-button>
            <ion-segment-button value="inactivos">
              <ion-label>Inactivos</ion-label>
            </ion-segment-button>
            <ion-segment-button value="todos">
              <ion-label>Todos</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <div v-if="composableError" class="error-message">{{ composableError }}</div>

        <div v-if="loading && !filteredColaboradores.length" class="loading-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando colaboradores...</p>
        </div>

        <ion-list v-else-if="filteredColaboradores.length > 0">
          <ion-item-sliding v-for="colab in filteredColaboradores" :key="colab.id">
            <ion-item button @click="openDetailModal(colab)">
              <ion-label>
                <h2>{{ colab.nombre }}</h2>
                <p>Código: {{ colab.codigoEmpleado || 'Sin codigo' }}</p>
                <p>{{ colab.cargo || 'Sin cargo' }} · {{ colab.departamento || 'Sin departamento' }}</p>
                <p class="descripcion-preview">{{ colab.descripcion || 'Sin descripcion' }}</p>
                <p>Tel: {{ colab.telefono || 'Sin telefono' }}</p>
              </ion-label>
              <ion-badge slot="end" :color="colab.activo === false ? 'medium' : 'success'">
                {{ colab.activo === false ? 'Inactivo' : 'Activo' }}
              </ion-badge>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="primary" @click="openEditModal(colab)">
                Editar
              </ion-item-option>
              <ion-item-option
                :color="colab.activo === false ? 'success' : 'warning'"
                @click="toggleActivo(colab)"
              >
                {{ colab.activo === false ? 'Activar' : 'Inactivar' }}
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>

        <div v-else class="empty-state">
          <p>No hay colaboradores para el filtro actual</p>
          <ion-button fill="outline" @click="openCreateModal">Crear primer colaborador</ion-button>
        </div>
      </div>
    </ion-content>

    <ion-modal
      :is-open="isModalOpen"
      :backdrop-dismiss="true"
      css-class="colaborador-modal"
      @did-dismiss="closeModal"
    >
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="closeModal">Cancelar</ion-button>
          </ion-buttons>
          <ion-title>{{ isEditing ? 'Editar Colaborador' : 'Nuevo Colaborador' }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form">
          <div class="form-card">
            <ion-item>
              <ion-label position="stacked">Codigo Empleado</ion-label>
              <ion-input
                v-model="formData.codigoEmpleado"
                type="text"
                :legacy="true"
                readonly
              ></ion-input>
            </ion-item>
            <p v-if="isGeneratingCode" class="field-hint">Generando codigo automatico...</p>
            <p v-else class="field-hint">El codigo se asigna automaticamente, no es editable</p>
            <p v-if="validationErrors.codigoEmpleado" class="field-error">{{ validationErrors.codigoEmpleado }}</p>

            <ion-item>
              <ion-label position="stacked">Nombre</ion-label>
              <ion-input v-model="formData.nombre" type="text" :legacy="true"></ion-input>
            </ion-item>
            <p v-if="validationErrors.nombre" class="field-error">{{ validationErrors.nombre }}</p>
          </div>

          <div class="form-card">
            <ion-item>
              <ion-label position="stacked">Cargo</ion-label>
              <ion-input v-model="formData.cargo" type="text" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Departamento</ion-label>
              <ion-input v-model="formData.departamento" type="text" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Telefono</ion-label>
              <ion-input v-model="formData.telefono" type="tel" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Descripcion</ion-label>
              <ion-textarea
                v-model="formData.descripcion"
                rows="3"
                :legacy="true"
                placeholder="Ejemplo: Encargado de corte y apoyo en inventario"
              ></ion-textarea>
            </ion-item>
          </div>

          <div v-if="formError" class="error-message">{{ formError }}</div>
        </div>
      </ion-content>
      <ion-footer class="modal-footer">
        <ion-toolbar>
          <ion-button expand="block" @click="saveColaborador" :disabled="loading">
            {{ loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar' }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <ion-modal
      :is-open="isDetailModalOpen"
      :backdrop-dismiss="true"
      css-class="colaborador-modal"
      @did-dismiss="closeDetailModal"
    >
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="closeDetailModal">Cerrar</ion-button>
          </ion-buttons>
          <ion-title>Detalle del Colaborador</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form" v-if="selectedColaborador">
          <div class="form-card">
            <ion-item>
              <ion-label>
                <h3>Nombre</h3>
                <p>{{ selectedColaborador.nombre || '-' }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Código</h3>
                <p>{{ selectedColaborador.codigoEmpleado || '-' }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Cargo y Departamento</h3>
                <p>{{ selectedColaborador.cargo || 'Sin cargo' }} · {{ selectedColaborador.departamento || 'Sin departamento' }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Telefono</h3>
                <p>{{ selectedColaborador.telefono || 'Sin telefono' }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Descripcion</h3>
                <p>{{ selectedColaborador.descripcion || 'Sin descripcion registrada.' }}</p>
              </ion-label>
            </ion-item>
          </div>
        </div>
      </ion-content>
      <ion-footer class="modal-footer" v-if="selectedColaborador">
        <ion-toolbar>
          <ion-button
            v-if="selectedColaborador.activo !== false"
            expand="block"
            color="warning"
            @click="inactivateFromDetail"
            :disabled="loading"
          >
            {{ loading ? 'Procesando...' : 'Volver Inactivo' }}
          </ion-button>

          <ion-button
            v-else
            expand="block"
            color="success"
            @click="activateFromDetail"
            :disabled="loading"
          >
            {{ loading ? 'Procesando...' : 'Activar Colaborador' }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useRouter } from 'vue-router'
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
  onIonViewWillLeave,
  toastController
} from '@ionic/vue'
import { add, apps, home, cube, people, swapHorizontal } from 'ionicons/icons'

const router = useRouter()
const {
  colaboradores,
  loading,
  error: composableError,
  createColaborador,
  getNextColaboradorCode,
  updateColaborador,
  getColaboradores
} = useColaboradores()

const isModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref('')
const statusFilter = ref('activos')
const searchText = ref('')
const formError = ref('')
const validationErrors = ref({})
const isGeneratingCode = ref(false)
const isDetailModalOpen = ref(false)
const selectedColaborador = ref(null)
const isModulesMenuOpen = ref(false)

const formData = ref({
  codigoEmpleado: '',
  nombre: '',
  cargo: '',
  departamento: '',
  telefono: '',
  descripcion: ''
})

const resetForm = () => {
  formData.value = {
    codigoEmpleado: '',
    nombre: '',
    cargo: '',
    departamento: '',
    telefono: '',
    descripcion: ''
  }
  validationErrors.value = {}
  formError.value = ''
}

const filteredColaboradores = computed(() => {
  const queryText = searchText.value.trim().toLowerCase()

  return colaboradores.value.filter((colab) => {
    const activoMatch =
      statusFilter.value === 'todos'
        ? true
        : statusFilter.value === 'activos'
          ? colab.activo !== false
          : colab.activo === false

    if (!activoMatch) return false

    if (!queryText) return true

    const blob = [
      colab.nombre,
      colab.codigoEmpleado,
      colab.cargo,
      colab.departamento,
      colab.telefono,
      colab.descripcion
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return blob.includes(queryText)
  })
})

const activeCount = computed(() => colaboradores.value.filter((c) => c.activo !== false).length)
const inactiveCount = computed(() => colaboradores.value.filter((c) => c.activo === false).length)

const validateForm = () => {
  const errors = {}
  const nombre = String(formData.value.nombre || '').trim()

  const codigo = String(formData.value.codigoEmpleado || '').trim()
  if (!codigo) {
    errors.codigoEmpleado = 'No se pudo generar codigo. Intenta cerrar y abrir el formulario.'
  }
  if (!nombre) {
    errors.nombre = 'El nombre es obligatorio.'
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

const showToast = async (message, color = 'success') => {
  const toast = await toastController.create({
    message,
    duration: 1800,
    color,
    position: 'top'
  })
  await toast.present()
}

const openModulesMenu = () => {
  isModulesMenuOpen.value = true
}

const navigateTo = async (path) => {
  isModulesMenuOpen.value = false
  await router.push(path)
}

const openCreateModal = async () => {
  isEditing.value = false
  editingId.value = ''
  resetForm()
  isGeneratingCode.value = true
  isModalOpen.value = true

  try {
    formData.value.codigoEmpleado = await getNextColaboradorCode()
  } catch (err) {
    formError.value = err?.message || 'No se pudo generar el codigo de empleado.'
  } finally {
    isGeneratingCode.value = false
  }
}

const openEditModal = (colab) => {
  isEditing.value = true
  editingId.value = colab.id
  validationErrors.value = {}
  formError.value = ''
  formData.value = {
    codigoEmpleado: colab.codigoEmpleado || '',
    nombre: colab.nombre || '',
    cargo: colab.cargo || '',
    departamento: colab.departamento || '',
    telefono: colab.telefono || '',
    descripcion: colab.descripcion || ''
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  isGeneratingCode.value = false
  resetForm()
}

const resetPageUiState = () => {
  isModulesMenuOpen.value = false
  isModalOpen.value = false
  isDetailModalOpen.value = false
  selectedColaborador.value = null
  isEditing.value = false
  editingId.value = ''
  isGeneratingCode.value = false
  resetForm()
}

const saveColaborador = async () => {
  formError.value = ''
  if (!validateForm()) return

  const payload = {
    codigoEmpleado: String(formData.value.codigoEmpleado || '').trim(),
    nombre: String(formData.value.nombre || '').trim(),
    cargo: String(formData.value.cargo || '').trim(),
    departamento: String(formData.value.departamento || '').trim(),
    telefono: String(formData.value.telefono || '').trim(),
    descripcion: String(formData.value.descripcion || '').trim()
  }

  try {
    if (isEditing.value && editingId.value) {
      await updateColaborador(editingId.value, payload)
      await showToast('Colaborador actualizado', 'success')
    } else {
      await createColaborador(payload)
      await showToast('Colaborador creado', 'success')
    }

    await getColaboradores()
    closeModal()
  } catch (err) {
    formError.value = composableError.value || err?.message || 'No se pudo guardar el colaborador.'
  }
}

const toggleActivo = async (colab) => {
  const nextValue = colab.activo === false
  try {
    await updateColaborador(colab.id, { activo: nextValue })
    await getColaboradores()
    await showToast(nextValue ? 'Colaborador activado' : 'Colaborador inactivado', 'primary')
  } catch (err) {
    await showToast(err?.message || 'No se pudo actualizar el estado.', 'danger')
  }
}

const openDetailModal = (colab) => {
  selectedColaborador.value = { ...colab }
  isDetailModalOpen.value = true
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  selectedColaborador.value = null
}

const inactivateFromDetail = async () => {
  if (!selectedColaborador.value) return

  try {
    await updateColaborador(selectedColaborador.value.id, { activo: false })
    await getColaboradores()
    selectedColaborador.value = {
      ...selectedColaborador.value,
      activo: false
    }
    await showToast('Colaborador inactivado', 'warning')
  } catch (err) {
    await showToast(err?.message || 'No se pudo inactivar el colaborador.', 'danger')
  }
}

const activateFromDetail = async () => {
  if (!selectedColaborador.value) return

  try {
    await updateColaborador(selectedColaborador.value.id, { activo: true })
    await getColaboradores()
    selectedColaborador.value = {
      ...selectedColaborador.value,
      activo: true
    }
    await showToast('Colaborador activado', 'success')
  } catch (err) {
    await showToast(err?.message || 'No se pudo activar el colaborador.', 'danger')
  }
}

const handleRefresh = async (event) => {
  try {
    await getColaboradores()
  } finally {
    event?.target?.complete()
  }
}

onMounted(async () => {
  await getColaboradores()
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
  margin-bottom: 1.5rem;
}

.page-header h2 {
  margin: 0 0 0.35rem;
}

.subtitle {
  margin: 0;
  color: #64748b;
}

.controls {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.modules-trigger {
  --color: #ffffff;
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

.summary-chip--active {
  background: #dcfce7;
  color: #166534;
}

.summary-chip--inactive {
  background: #e5e7eb;
  color: #374151;
}

.active {
  color: #5f8fb8;
}

.inactive {
  color: #8ea1b0;
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

.modal-footer {
  --background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

:global(ion-modal.colaborador-modal) {
  --width: min(760px, 92vw);
  --height: min(82vh, 820px);
  --border-radius: 16px;
  --backdrop-opacity: 0.45;
}

@media (max-width: 640px) {
  :global(ion-modal.colaborador-modal) {
    --width: 96vw;
    --height: 90vh;
  }
}

.field-error {
  margin: 0.25rem 0 0.5rem;
  color: #dc2626;
  font-size: 0.85rem;
  padding: 0 0.75rem;
}

.field-hint {
  margin: 0.25rem 0 0.5rem;
  color: #64748b;
  font-size: 0.8rem;
  padding: 0 0.75rem;
}

.descripcion-preview {
  color: #334155;
  font-style: italic;
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
</style>
