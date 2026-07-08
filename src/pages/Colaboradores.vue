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

    <ion-content class="collaborators-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content
          pulling-text="Desliza para actualizar"
          refreshing-spinner="circles"
        ></ion-refresher-content>
      </ion-refresher>

      <div class="page-container collaborators-page">
        <section class="module-hero">
          <div class="hero-copy">
            <span class="eyebrow">Equipo</span>
            <h2>Colaboradores</h2>
            <p>Administra el directorio, los cargos y el estado de cada colaborador.</p>
          </div>

          <div class="hero-actions">
            <ion-button color="success" class="hero-button" @click="openCreateModal">
              <ion-icon slot="start" :icon="add"></ion-icon>
              Nuevo colaborador
            </ion-button>
          </div>
        </section>

        <section class="overview-grid" aria-label="Resumen de colaboradores">
          <article class="overview-card overview-card--primary">
            <span class="overview-label">Colaboradores</span>
            <strong>{{ colaboradores.length }}</strong>
          </article>

          <article class="overview-card">
            <span class="overview-label">Activos</span>
            <strong>{{ activeCount }}</strong>
          </article>

          <article class="overview-card">
            <span class="overview-label">Inactivos</span>
            <strong>{{ inactiveCount }}</strong>
          </article>

          <article class="overview-card">
            <span class="overview-label">Mostrados</span>
            <strong>{{ filteredColaboradores.length }}</strong>
          </article>
        </section>

        <section class="toolbar-card">
          <div class="toolbar-copy">
            <h3>Directorio</h3>
            <p>{{ filteredColaboradores.length }} registros</p>
          </div>

          <ion-searchbar
            v-model="searchText"
            placeholder="Buscar nombre, código o cargo"
            :debounce="200"
            show-clear-button="focus"
            inputmode="search"
            enterkeyhint="search"
            class="collaborator-searchbar"
          ></ion-searchbar>

          <ion-segment v-model="statusFilter" class="status-filter-segment">
            <ion-segment-button value="activos">Activos</ion-segment-button>
            <ion-segment-button value="inactivos">Inactivos</ion-segment-button>
            <ion-segment-button value="todos">Todos</ion-segment-button>
          </ion-segment>
        </section>

        <div v-if="composableError" class="error-message">
          {{ composableError }}
        </div>

        <div v-if="loading && !filteredColaboradores.length" class="loading-state modern-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando colaboradores...</p>
        </div>

        <ion-list
          v-else-if="filteredColaboradores.length > 0"
          lines="none"
          class="collaborators-list"
        >
          <ion-item-sliding
            v-for="colab in filteredColaboradores"
            :key="colab.id"
            class="collaborator-sliding"
          >
            <ion-item
              button
              detail="false"
              lines="none"
              class="collaborator-card"
              @click="openDetailModal(colab)"
            >
              <div class="collaborator-card-content">
                <div class="collaborator-topline">
                  <div class="collaborator-title-block">
                    <h3>{{ colab.nombre }}</h3>
                    <p>{{ colab.codigoEmpleado || 'Sin código' }}</p>
                  </div>

                  <span
                    class="ui-chip"
                    :class="colab.activo === false ? 'ui-chip--muted' : 'ui-chip--success'"
                  >
                    {{ colab.activo === false ? 'Inactivo' : 'Activo' }}
                  </span>
                </div>

                <div class="collaborator-chip-row">
                  <span class="ui-chip ui-chip--primary">
                    {{ colab.cargo || 'Sin cargo' }}
                  </span>
                  <span class="ui-chip ui-chip--muted">
                    {{ colab.departamento || 'Sin departamento' }}
                  </span>
                </div>

                <p class="collaborator-description">
                  {{ colab.descripcion || 'Sin descripción registrada.' }}
                </p>

                <div class="collaborator-contact">
                  <span>Teléfono</span>
                  <strong>{{ colab.telefono || 'Sin teléfono' }}</strong>
                </div>
              </div>
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

        <div v-else class="empty-state modern-state">
          <strong>No hay colaboradores para el filtro actual</strong>
          <p>Prueba con otro estado o registra un nuevo colaborador.</p>
          <ion-button fill="outline" @click="openCreateModal">
            Crear colaborador
          </ion-button>
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
          <ion-title>{{ isEditing ? 'Editar colaborador' : 'Nuevo colaborador' }}</ion-title>
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
          <section class="form-card">
            <div class="form-section-heading">
              <h3>Información principal</h3>
              <p>Datos de identificación del colaborador.</p>
            </div>

            <ion-item lines="none" class="modern-field">
              <ion-input
                v-model="formData.codigoEmpleado"
                type="text"
                label="Código de empleado"
                label-placement="floating"
                readonly
              ></ion-input>
            </ion-item>
            <p v-if="isGeneratingCode" class="field-hint">
              Generando código automático...
            </p>
            <p v-else class="field-hint">
              El código se asigna automáticamente y no es editable.
            </p>
            <p v-if="validationErrors.codigoEmpleado" class="field-error">
              {{ validationErrors.codigoEmpleado }}
            </p>

            <ion-item lines="none" class="modern-field">
              <ion-input
                v-model="formData.nombre"
                type="text"
                label="Nombre"
                label-placement="floating"
              ></ion-input>
            </ion-item>
            <p v-if="validationErrors.nombre" class="field-error">
              {{ validationErrors.nombre }}
            </p>
          </section>

          <section class="form-card">
            <div class="form-section-heading">
              <h3>Información laboral</h3>
              <p>Cargo, departamento y datos de contacto.</p>
            </div>

            <div class="form-grid">
              <div>
                <ion-item lines="none" class="modern-field">
                  <ion-input
                    v-model="formData.cargo"
                    type="text"
                    label="Cargo"
                    label-placement="floating"
                  ></ion-input>
                </ion-item>
                <p v-if="validationErrors.cargo" class="field-error">
                  {{ validationErrors.cargo }}
                </p>
              </div>

              <div>
                <ion-item lines="none" class="modern-field">
                  <ion-input
                    v-model="formData.departamento"
                    type="text"
                    label="Departamento"
                    label-placement="floating"
                  ></ion-input>
                </ion-item>
                <p v-if="validationErrors.departamento" class="field-error">
                  {{ validationErrors.departamento }}
                </p>
              </div>
            </div>

            <ion-item lines="none" class="modern-field">
              <ion-input
                v-model="formData.telefono"
                type="tel"
                label="Teléfono"
                label-placement="floating"
              ></ion-input>
            </ion-item>
            <p v-if="validationErrors.telefono" class="field-error">
              {{ validationErrors.telefono }}
            </p>

            <ion-item lines="none" class="modern-field">
              <ion-textarea
                v-model="formData.descripcion"
                rows="4"
                label="Descripción"
                label-placement="floating"
                placeholder="Ejemplo: Encargado de corte y apoyo en inventario"
              ></ion-textarea>
            </ion-item>
            <p v-if="validationErrors.descripcion" class="field-error">
              {{ validationErrors.descripcion }}
            </p>
          </section>

          <div v-if="formError" class="error-message">
            {{ formError }}
          </div>
        </div>
      </ion-content>

      <ion-footer class="modal-footer">
        <ion-toolbar>
          <ion-button
            expand="block"
            class="modal-primary-action"
            @click="saveColaborador"
            :disabled="loading"
          >
            {{ loading ? 'Guardando...' : isEditing ? 'Actualizar colaborador' : 'Guardar colaborador' }}
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
          <ion-title>Detalle del colaborador</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeDetailModal" class="close-modal-btn">
              <ion-icon slot="start" :icon="closeOutline"></ion-icon>
              Cerrar
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="modal-content">
        <div v-if="selectedColaborador" class="modal-form">
          <section class="detail-hero-card">
            <div>
              <span class="eyebrow">Colaborador</span>
              <h2>{{ selectedColaborador.nombre || '-' }}</h2>
              <p>{{ selectedColaborador.codigoEmpleado || 'Sin código' }}</p>
            </div>

            <span
              class="ui-chip"
              :class="selectedColaborador.activo === false ? 'ui-chip--muted' : 'ui-chip--success'"
            >
              {{ selectedColaborador.activo === false ? 'Inactivo' : 'Activo' }}
            </span>
          </section>

          <section class="form-card detail-grid">
            <div class="detail-field">
              <span>Cargo</span>
              <strong>{{ selectedColaborador.cargo || 'Sin cargo' }}</strong>
            </div>

            <div class="detail-field">
              <span>Departamento</span>
              <strong>{{ selectedColaborador.departamento || 'Sin departamento' }}</strong>
            </div>

            <div class="detail-field">
              <span>Teléfono</span>
              <strong>{{ selectedColaborador.telefono || 'Sin teléfono' }}</strong>
            </div>

            <div class="detail-field detail-field--wide">
              <span>Descripción</span>
              <strong>{{ selectedColaborador.descripcion || 'Sin descripción registrada.' }}</strong>
            </div>
          </section>
        </div>
      </ion-content>

      <ion-footer v-if="selectedColaborador" class="modal-footer">
        <ion-toolbar>
          <ion-button
            v-if="selectedColaborador.activo !== false"
            expand="block"
            color="warning"
            class="modal-primary-action"
            @click="inactivateFromDetail"
            :disabled="loading"
          >
            {{ loading ? 'Procesando...' : 'Inactivar colaborador' }}
          </ion-button>

          <ion-button
            v-else
            expand="block"
            color="success"
            class="modal-primary-action"
            @click="activateFromDetail"
            :disabled="loading"
          >
            {{ loading ? 'Procesando...' : 'Activar colaborador' }}
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
import { add, apps, home, cube, people, swapHorizontal, clipboardOutline, closeOutline } from 'ionicons/icons'

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

// conteo action moved to Inventario module

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
  const cargo = String(formData.value.cargo || '').trim()
  const departamento = String(formData.value.departamento || '').trim()
  const telefono = String(formData.value.telefono || '').trim()
  const descripcion = String(formData.value.descripcion || '').trim()

  const codigo = String(formData.value.codigoEmpleado || '').trim()
  if (!codigo) {
    errors.codigoEmpleado = 'No se pudo generar codigo. Intenta cerrar y abrir el formulario.'
  }
  if (!nombre) {
    errors.nombre = 'El nombre es obligatorio.'
  } else if (nombre.length < 3) {
    errors.nombre = 'El nombre debe tener al menos 3 caracteres.'
  } else if (nombre.length > 80) {
    errors.nombre = 'El nombre no debe exceder 80 caracteres.'
  }

  if (cargo && cargo.length > 60) {
    errors.cargo = 'El cargo no debe exceder 60 caracteres.'
  }

  if (departamento && departamento.length > 60) {
    errors.departamento = 'El departamento no debe exceder 60 caracteres.'
  }

  if (telefono) {
    const normalizedTelefono = telefono.replace(/[\s()-]/g, '')
    if (!/^[0-9+]+$/.test(normalizedTelefono)) {
      errors.telefono = 'El telefono solo puede contener numeros, espacios, +, paréntesis o guiones.'
    } else if (normalizedTelefono.length < 7 || normalizedTelefono.length > 20) {
      errors.telefono = 'El telefono debe tener entre 7 y 20 caracteres.'
    }
  }

  if (descripcion.length > 250) {
    errors.descripcion = 'La descripcion no debe exceder 250 caracteres.'
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

const confirmStatusChange = (colab) => {
  const nextValue = colab.activo === false
  const actionLabel = nextValue ? 'activar' : 'inactivar'
  return window.confirm(`¿Seguro que deseas ${actionLabel} a ${colab.nombre}?`)
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
  if (!confirmStatusChange(colab)) {
    return
  }

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

  if (!confirmStatusChange(selectedColaborador.value)) {
    return
  }

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

  if (!confirmStatusChange(selectedColaborador.value)) {
    return
  }

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
  } catch (err) {
    await showToast(err?.message || 'No se pudo actualizar la lista.', 'danger')
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
.collaborators-content {
  --background: #f5f7fb;
}

.page-container {
  padding: 0.75rem;
}

.collaborators-page {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.modules-trigger {
  --color: #ffffff;
}

.module-hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.85rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #eef7ff 100%);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  display: inline-flex;
  margin-bottom: 0.18rem;
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h2,
.toolbar-copy h3,
.form-section-heading h3,
.detail-hero-card h2 {
  margin: 0;
  color: #0f172a;
  font-weight: 850;
}

.hero-copy h2 {
  font-size: 1.35rem;
  line-height: 1.15;
}

.hero-copy p,
.toolbar-copy p,
.form-section-heading p,
.detail-hero-card p {
  margin: 0.2rem 0 0;
  color: #64748b;
  line-height: 1.35;
}

.hero-actions {
  min-width: 180px;
  display: flex;
  align-items: center;
}

.hero-button {
  width: 100%;
  min-height: 38px;
  margin: 0;
  font-weight: 800;
  text-transform: none;
  --border-radius: 12px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}

.overview-card {
  min-width: 0;
  padding: 0.58rem 0.62rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.overview-card--primary {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.overview-label {
  display: block;
  overflow: hidden;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.overview-card strong {
  display: block;
  margin-top: 0.18rem;
  color: #0f172a;
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1;
}

.toolbar-card {
  display: grid;
  gap: 0.52rem;
  padding: 0.68rem;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.toolbar-copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
}

.toolbar-copy h3 {
  font-size: 1rem;
}

.toolbar-copy p {
  font-size: 0.75rem;
  font-weight: 700;
}

.collaborator-searchbar {
  min-height: 40px;
  padding: 0;
  --background: #f8fafc;
  --box-shadow: none;
  --border-radius: 12px;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
}

.status-filter-segment {
  --background: #ffffff;
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  padding: 0.16rem;
}

.status-filter-segment ion-segment-button {
  min-height: 34px;
  --background: transparent;
  --background-checked: transparent;
  --indicator-color: #2563eb;
  --color: #475569;
  --color-checked: #475569;
  color: #475569;
  font-weight: 800;
  text-transform: none;
}

.status-filter-segment ion-segment-button::part(native) {
  color: #475569 !important;
  background: transparent !important;
}

.status-filter-segment ion-segment-button.segment-button-checked::part(native) {
  color: #475569 !important;
  background: transparent !important;
  font-weight: 900;
}

.status-filter-segment ion-segment-button::part(indicator-background) {
  background: #2563eb;
  border-radius: 999px;
}

.collaborators-list {
  display: flex;
  flex-direction: column;
  gap: 0.54rem;
  padding: 0 0.02rem 0.7rem;
  background: transparent;
}

.collaborator-sliding {
  overflow: hidden;
  margin: 0;
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.055);
}

.collaborator-card {
  --background: #ffffff;
  --border-radius: 14px;
  --inner-padding-end: 0;
  --padding-start: 0;
  --padding-end: 0;
}

.collaborator-card::part(native) {
  min-height: 0;
  border-radius: 14px;
}

.collaborator-card-content {
  width: 100%;
  min-width: 0;
  padding: 0.72rem;
}

.collaborator-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.7rem;
}

.collaborator-title-block {
  min-width: 0;
}

.collaborator-title-block h3 {
  margin: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 850;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collaborator-title-block p {
  margin: 0.18rem 0 0;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
}

.collaborator-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  margin-top: 0.55rem;
}

.ui-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0.22rem 0.52rem;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 800;
  line-height: 1;
}

.ui-chip--primary {
  background: #eff6ff;
  color: #1d4ed8;
}

.ui-chip--success {
  background: #dcfce7;
  color: #166534;
}

.ui-chip--muted {
  background: #e2e8f0;
  color: #475569;
}

.collaborator-description {
  margin: 0.58rem 0 0;
  display: -webkit-box;
  overflow: hidden;
  color: #475569;
  font-size: 0.76rem;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.collaborator-contact {
  margin-top: 0.58rem;
  padding: 0.5rem 0.58rem;
  border: 1px solid #edf2f7;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.collaborator-contact span {
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.collaborator-contact strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 0.76rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modern-state {
  min-height: 150px;
  padding: 1rem;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  background: #ffffff;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.52rem;
  color: #64748b;
  text-align: center;
}

.modern-state p,
.modern-state strong {
  margin: 0;
}

.empty-state p {
  margin: 0.2rem 0 0.7rem;
  color: #64748b;
  font-size: 0.78rem;
}

.loading-state p {
  font-weight: 700;
}

.error-message {
  padding: 0.68rem;
  border: 1px solid #fecaca;
  border-left: 4px solid #b91c1c;
  border-radius: 10px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 0.8rem;
  font-weight: 700;
}

.modal-content {
  --background: #f5f7fb;
}

.modal-form {
  padding: 0.78rem;
}

.form-card,
.detail-hero-card {
  margin-bottom: 0.7rem;
  padding: 0.68rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.form-section-heading {
  margin-bottom: 0.5rem;
}

.form-section-heading h3 {
  font-size: 0.92rem;
}

.form-section-heading p {
  font-size: 0.72rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.modern-field {
  --background: #f8fafc;
  --border-radius: 11px;
  --min-height: 54px;
  --padding-start: 0.5rem;
  --inner-padding-end: 0.45rem;
  margin-top: 0.48rem;
  border: 1px solid #e2e8f0;
  border-radius: 11px;
}

.modern-field ion-input,
.modern-field ion-textarea {
  --color: #0f172a;
  --label-color: #64748b;
  --highlight-color-focused: #2563eb;
}

.field-error,
.field-hint {
  margin: 0.24rem 0 0;
  padding: 0 0.24rem;
  font-size: 0.72rem;
}

.field-error {
  color: #dc2626;
  font-weight: 700;
}

.field-hint {
  color: #64748b;
}

.modal-footer {
  --background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.modal-footer ion-toolbar {
  --background: #ffffff;
  --padding-start: 0.72rem;
  --padding-end: 0.72rem;
  --padding-top: 0.48rem;
  --padding-bottom: 0.48rem;
}

.modal-primary-action {
  min-height: 42px;
  margin: 0;
  font-weight: 850;
  text-transform: none;
  --border-radius: 12px;
}

.detail-hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  background: linear-gradient(135deg, #ffffff 0%, #eef7ff 100%);
}

.detail-hero-card h2 {
  font-size: 1.15rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.detail-field {
  min-width: 0;
  padding: 0.58rem;
  border: 1px solid #edf2f7;
  border-radius: 11px;
  background: #f8fafc;
}

.detail-field--wide {
  grid-column: 1 / -1;
}

.detail-field span {
  display: block;
  margin-bottom: 0.22rem;
  color: #64748b;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-field strong {
  display: block;
  color: #0f172a;
  font-size: 0.8rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

:global(ion-modal.colaborador-modal) {
  --width: min(760px, 94vw);
  --height: min(86vh, 820px);
  --border-radius: 16px;
  --backdrop-opacity: 0.45;
}

@media (max-width: 760px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 540px) {
  .page-container {
    padding: 0.65rem;
  }

  .collaborators-page {
    gap: 0.52rem;
  }

  .module-hero {
    flex-direction: column;
    padding: 0.72rem;
  }

  .hero-actions {
    width: 100%;
    min-width: 0;
  }

  .hero-button {
    width: 100%;
  }

  .overview-card {
    padding: 0.52rem;
  }

  .overview-card strong {
    font-size: 1.3rem;
  }

  .toolbar-card {
    padding: 0.58rem;
  }

  .collaborator-card-content {
    padding: 0.62rem;
  }

  .status-filter-segment ion-segment-button {
    min-width: 0;
    font-size: 0.7rem;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-field--wide {
    grid-column: auto;
  }

  :global(ion-modal.colaborador-modal) {
    --width: 96vw;
    --height: 92vh;
  }
}
</style>
