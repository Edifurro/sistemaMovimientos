<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button class="modules-trigger" @click="openModulesMenu">
              <ion-icon slot="start" :icon="apps"></ion-icon>
            </ion-button>

          </ion-buttons>
          <ion-title>Inventario Bodega</ion-title>
          <ion-buttons slot="end">
            <ion-button color="light" @click="openCreateModal">Nuevo</ion-button>
          </ion-buttons>
        </ion-toolbar>
    </ion-header>

    <ion-popover
      :is-open="isModulesMenuOpen"
      side="bottom"
      alignment="end"
      @didDismiss="isModulesMenuOpen = false"
    >
      <ion-content>
        <ion-list lines="none">
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
          <ion-item button @click="navigateTo('/dashboard')">
            <ion-icon slot="start" :icon="home"></ion-icon>
            <ion-label>Inicio</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <ion-content class="page-container">
      <div class="page-header">
        <h2>Inventario de Bodega</h2>
      </div>

      <ion-searchbar v-model="searchText" placeholder="Buscar" :debounce="200"></ion-searchbar>

      <div v-if="loading && !inventario.length" class="loading-state">
        <ion-spinner name="circles"></ion-spinner>
        <p>Cargando inventario...</p>
      </div>

      <ion-list v-else>
        <ion-item-sliding v-for="item in filteredInventario" :key="item.id">
          <ion-item button @click="openEditModal(item)">
            <ion-label>
              <h3>{{ item.descripcion }}</h3>
              <p>Barcode: {{ item.barcode }}</p>
              <p>{{ item.categoria || '—' }} • {{ item.ubicacion || '—' }}</p>
            </ion-label>
            <ion-badge slot="end">{{ item.cantidad }}</ion-badge>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="success" @click.stop="openMovimientoModal(item, 'entrada')">Entrada</ion-item-option>
            <ion-item-option color="danger" @click.stop="openMovimientoModal(item, 'salida')">Salida</ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-if="!inventario.length && !loading" class="empty-state">
        <p>No hay registros.</p>
        <ion-button fill="outline" @click="openCreateModal">Crear registro</ion-button>
      </div>

      <!-- Item modal -->
      <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>{{ isEditing ? 'Editar item' : 'Nuevo item' }}</ion-title>
            <ion-buttons slot="end"><ion-button v-if="!isEditing" @click="generateBarcode">Generar</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="modal-form">
            <ion-item>
                <ion-label position="stacked">Barcode</ion-label>
                <ion-input v-model="formData.barcode" readonly :legacy="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Descripcion</ion-label>
              <ion-input v-model="formData.descripcion" :legacy="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Categoria</ion-label>
              <ion-input v-model="formData.categoria" :legacy="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Cantidad</ion-label>
              <ion-input v-model.number="formData.cantidad" type="number" :legacy="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Ubicacion</ion-label>
              <ion-input v-model="formData.ubicacion" :legacy="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Costo unitario</ion-label>
              <ion-input v-model.number="formData.costoUnitario" type="number" step="0.01" :legacy="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Proveedor</ion-label>
              <ion-input v-model="formData.proveedor" :legacy="true"></ion-input>
            </ion-item>
          </div>
        </ion-content>
        <ion-footer>
          <ion-toolbar>
            <ion-button expand="block" @click="saveItem" :disabled="saving">{{ saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear' }}</ion-button>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>

      <!-- Movimiento modal -->
      <ion-modal :is-open="isMovimientoOpen" @didDismiss="closeMovimientoModal">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Registrar movimiento</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="modal-form">
            <ion-item>
              <ion-label position="stacked">Item</ion-label>
              <ion-input :value="movimientoItem.descripcion" readonly :legacy="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Cantidad</ion-label>
              <ion-input v-model.number="movimientoData.cantidad" type="number" :legacy="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Usuario</ion-label>
              <ion-input v-model="movimientoData.usuario" :legacy="true"></ion-input>
            </ion-item>
          </div>
        </ion-content>
        <ion-footer>
          <ion-toolbar>
            <ion-button expand="block" @click="submitMovimiento" :disabled="movimientoSaving">{{ movimientoSaving ? 'Procesando...' : 'Registrar' }}</ion-button>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>

      <ion-toast :is-open="showToast" :message="toastMessage" :color="toastColor" duration="2200" position="top" @did-dismiss="showToast=false"></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItemSliding,
  IonItem,
  IonLabel,
  IonBadge,
  IonItemOptions,
  IonItemOption,
  IonModal,
  IonPopover,
  IonIcon,
  IonFooter,
  IonToast,
  IonInput,
  IonSpinner
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useInventarioBodega } from '../composables/useInventarioBodega'
import { useAuth } from '../composables/useAuth'
import { useMovimientosBodega } from '../composables/useMovimientosBodega'
import { home, cube, people, swapHorizontal, apps, clipboardOutline } from 'ionicons/icons'

const { inventarioBodega, loading, getInventario, createInventarioItem, updateInventarioItem, getNextBarcode } = useInventarioBodega()
const { createMovimiento } = useMovimientosBodega()

const inventario = inventarioBodega
const searchText = ref('')

const router = useRouter()
const isModulesMenuOpen = ref(false)

const openModulesMenu = () => { isModulesMenuOpen.value = true }

const navigateTo = async (path) => { isModulesMenuOpen.value = false; await router.push(path) }

const isModalOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const formData = ref({ barcode: '', descripcion: '', categoria: '', cantidad: 0, ubicacion: '', costoUnitario: 0, proveedor: '' })

const isMovimientoOpen = ref(false)
const movimientoItem = ref({})
const movimientoData = ref({ tipo: 'entrada', cantidad: 1, usuario: '' })
const movimientoSaving = ref(false)

const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref('success')

const generateBarcode = async () => {
  try {
    formData.value.barcode = await getNextBarcode()
  } catch (err) {
    showFeedback('No se pudo generar barcode', 'danger')
  }
}

const openCreateModal = async () => {
  isEditing.value = false
  formData.value = { barcode: '', descripcion: '', categoria: '', cantidad: 0, ubicacion: '', costoUnitario: 0, proveedor: '' }
  isModalOpen.value = true
  await generateBarcode()
}

const openEditModal = async (item) => {
  isEditing.value = true
  formData.value = { ...item }
  isModalOpen.value = true
}

const closeModal = () => { isModalOpen.value = false }

const validateItemForm = () => { return !!formData.value.descripcion && !!formData.value.barcode }

const saveItem = async () => {
  if (!validateItemForm()) { showFeedback('Descripcion y barcode son requeridos', 'warning'); return }
  saving.value = true
  try {
    const payload = { ...formData.value }
    if (isEditing.value) {
      await updateInventarioItem(formData.value.barcode, payload)
      showFeedback('Item actualizado', 'success')
    } else {
      await createInventarioItem(payload)
      showFeedback('Item creado', 'success')
    }
    await refresh()
    closeModal()
  } catch (err) {
    showFeedback(err?.message || 'Error al guardar', 'danger')
  } finally { saving.value = false }
}

const openMovimientoModal = (item, tipo) => {
  movimientoItem.value = item
  movimientoData.value = { tipo, cantidad: 1, usuario: currentUserName() }
  isMovimientoOpen.value = true
}

const closeMovimientoModal = () => { isMovimientoOpen.value = false }

const submitMovimiento = async () => {
  movimientoSaving.value = true
  try {
    await createMovimiento({ inventarioId: movimientoItem.value.barcode, tipo: movimientoData.value.tipo, cantidad: movimientoData.value.cantidad, usuario: movimientoData.value.usuario })
    showFeedback('Movimiento registrado', 'success')
    await refresh()
    closeMovimientoModal()
  } catch (err) {
    showFeedback(err?.message || 'Error al registrar movimiento', 'danger')
  } finally { movimientoSaving.value = false }
}

const refresh = async () => { await getInventario() }

const filteredInventario = computed(() => {
  const q = String(searchText.value || '').trim().toLowerCase()
  if (!q) return inventario.value
  return inventario.value.filter(i => [i.barcode, i.descripcion, i.categoria, i.proveedor, i.ubicacion].filter(Boolean).join(' ').toLowerCase().includes(q))
})

const currentUserName = () => { try { return JSON.parse(localStorage.getItem('user') || 'null')?.nombre || '' } catch { return '' } }

const showFeedback = (message, color = 'success') => { toastMessage.value = message; toastColor.value = color; showToast.value = true }

const { isAuthenticated } = useAuth()

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      await refresh()
    } catch (err) {
      showFeedback(err?.message || 'No tienes permisos para ver inventario de bodega', 'danger')
      console.error('InventarioBodega init error:', err)
    }
    return
  }

  // Si no hay sesión, mostrar aviso y esperar a que el usuario inicie sesión
  showFeedback('Inicia sesión para ver el inventario de bodega', 'warning')
  const stop = watch(isAuthenticated, async (val) => {
    if (val) {
      try {
        await refresh()
      } catch (err) {
        showFeedback(err?.message || 'No tienes permisos para ver inventario de bodega', 'danger')
        console.error('InventarioBodega init error after auth:', err)
      }
      stop()
    }
  })
})
</script>

<style scoped>
.page-container { padding: 1rem }
.page-header h2 { margin: 0 0 0.5rem }
.loading-state { text-align: center; padding: 2rem }
.empty-state { text-align: center; padding: 2rem }
.modal-form { padding: 1rem }

.modules-trigger {
  --padding-start: 8px;
  --padding-end: 8px;
  --color: #ffffff;
  font-size: 0.9rem;
}

.modules-trigger ion-icon {
  color: #ffffff;
}

.modules-label {
  margin-left: 4px;
}

@media (max-width: 640px) {
  .modules-label { display: none }
}
</style>
