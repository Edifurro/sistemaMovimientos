<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="icon-only" :icon="apps"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Conteo - {{ currentConteo?.colaboradorNombre || 'Colaborador' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button color="light" @click="finalize" :disabled="finalizing || loading">
            {{ finalizing ? 'Aplicando...' : 'Finalizar y aplicar' }}
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
      <div class="page-container">
        <div class="summary-row">
          <div class="summary-chip">Esperados: {{ currentConteo?.summary?.expected ?? 0 }}</div>
          <div class="summary-chip summary-chip--active">Presentes: {{ currentConteo?.summary?.present ?? 0 }}</div>
          <div class="summary-chip summary-chip--inactive">Faltantes: {{ currentConteo?.summary?.missing ?? 0 }}</div>
          <div class="summary-chip">Extras: {{ currentConteo?.summary?.extras ?? 0 }}</div>
        </div>
        <p v-if="currentConteo && !allExpectedScanned" class="small-muted">Debes escanear todos los items esperados antes de aplicar los ajustes.</p>

        <div class="controls">
          <ion-searchbar v-model="searchQuery" placeholder="Buscar por nombre, marca o código" show-clear-button="true"></ion-searchbar>
          <div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem;">
            <ion-button expand="block" fill="outline" @click="openBarcodeScanner">
              <ion-icon slot="start" :icon="camera"></ion-icon>
              Escanear
            </ion-button>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando conteo...</p>
        </div>

        <div v-if="!loading && !currentConteo" class="empty-state">
          <p>No se encontró el conteo con el ID: <strong>{{ conteoId }}</strong></p>
          <p v-if="error" class="field-error">Error: {{ error }}</p>
          <p>Verifica que el ID exista en Firestore y que estés autenticado.</p>
        </div>

        <ion-list v-if="currentConteo?.expectedItems?.length">
          <ion-list-header>Items por escanear</ion-list-header>
          <p v-if="filteredExpectedItems.length === 0" class="small-muted">No se encontraron coincidencias.</p>
          <ion-item v-for="item in filteredExpectedItems" :key="item.id" :class="['inventory-row', getEstadoClassForExpected(item)]">
            <ion-label>
              <h2>{{ item.herramienta || item.descripcion || item.id }}</h2>
              <p>Colaborador: {{ currentConteo?.colaboradorNombre || 'Sin colaborador' }}</p>
              <p>Marca: {{ item.marca || 'Sin marca' }}</p>
              <p>Barcode: {{ item.id }}</p>
              <p>Cantidad esperada: {{ item.cantidad }}</p>
              <p class="descripcion-preview">{{ item.descripcion || '' }}</p>
            </ion-label>
            <ion-badge slot="end" :class="getEstadoBadgeClassForExpected(item)">{{ getEstadoLabelForExpected(item) }}</ion-badge>
            <ion-button slot="end" fill="clear" size="small" @click.stop="openExpectedForManual(item)">Agregar</ion-button>
          </ion-item>
        </ion-list>

        <ion-list>
          <ion-list-header>Items escaneados</ion-list-header>
          <ion-item-sliding v-for="s in scannedItems" :key="s.id">
            <ion-item button @click="openScannedModal(s)" :class="['inventory-row', getScannedRowClass(s)]">
              <ion-label>
                <h2>{{ s.herramienta || s.barcode }}</h2>
                <p>Barcode: {{ s.barcode }}</p>
                <p>Cantidad: {{ s.cantidad }}</p>
                <p v-if="s.comentario" class="descripcion-preview">Comentario: {{ s.comentario }}</p>
              </ion-label>
              <ion-badge slot="end" :class="getScannedBadgeClass(s)">{{ s.matchedItemId ? 'Coincide' : 'Extra' }}</ion-badge>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" @click="deleteScanned(s)">Eliminar</ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>
    </ion-content>

    <ion-modal :is-open="isScannedModalOpen" :backdrop-dismiss="true" @did-dismiss="closeScannedModal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>{{ isEditingScanned ? 'Editar item escaneado' : 'Nuevo item escaneado' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeScannedModal" class="close-modal-btn">
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
              <ion-label position="stacked">Barcode</ion-label>
              <ion-input v-model="scannedForm.barcode" type="text" readonly :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Herramienta</ion-label>
              <ion-input v-model="scannedForm.herramienta" type="text" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Marca</ion-label>
              <ion-input v-model="scannedForm.marca" type="text" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Cantidad</ion-label>
              <ion-input v-model.number="scannedForm.cantidad" type="number" :legacy="true"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Estado</ion-label>
              <ion-select v-model="scannedForm.estado" placeholder="Selecciona estado">
                <ion-select-option value="completo">Completo</ion-select-option>
                <ion-select-option value="incompleto">Incompleto</ion-select-option>
                <ion-select-option value="faltante">Faltante</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Comentario</ion-label>
              <ion-textarea v-model="scannedForm.comentario" rows="3" :legacy="true"></ion-textarea>
            </ion-item>
          </div>
        </div>
      </ion-content>

      <ion-footer class="modal-footer">
        <ion-toolbar>
          <ion-button expand="block" @click="saveScanned" :disabled="scannedSaving">
            {{ scannedSaving ? 'Guardando...' : isEditingScanned ? 'Actualizar' : 'Guardar' }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConteoColaborador } from '../composables/useConteoColaborador'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonModal,
  IonInput,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonFooter,
  IonSpinner,
  IonBadge,
  toastController,
  alertController
} from '@ionic/vue'
import { camera, closeOutline, apps, home, cube, swapHorizontal, clipboardOutline } from 'ionicons/icons'
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
import { Capacitor } from '@capacitor/core'

const route = useRoute()
const router = useRouter()
const {
  currentConteo,
  scannedItems,
  loading,
  error,
  getConteoById,
  addScannedItem,
  updateScannedItem,
  removeScannedItem,
  finalizeConteo
} = useConteoColaborador()

const conteoId = String(route.params.id || '')

const isScannedModalOpen = ref(false)
const isEditingScanned = ref(false)
const editingScannedId = ref('')
const scannedForm = ref({ barcode: '', herramienta: '', marca: '', cantidad: 1, estado: '', comentario: '', matchedItemId: null })
const scannedSaving = ref(false)
const isScanning = ref(false)
const scannedError = ref('')
const finalizing = ref(false)

// Búsqueda
const searchQuery = ref('')
// Modules popover
const isModulesMenuOpen = ref(false)
const openModulesMenu = () => { isModulesMenuOpen.value = true }
const navigateTo = async (path) => { isModulesMenuOpen.value = false; await router.push(path) }

const filteredExpectedItems = computed(() => {
  const list = currentConteo.value?.expectedItems || []
  const scannedMatchedIds = new Set((scannedItems.value || []).filter((s) => s.matchedItemId).map((s) => String(s.matchedItemId)))
  // Excluir items que ya fueron escaneados
  const base = list.filter((item) => !scannedMatchedIds.has(String(item.id)))
  const q = String(searchQuery.value || '').trim().toLowerCase()
  if (!q) return base
  return base.filter((item) => {
    return String(item.id || '').toLowerCase().includes(q) ||
      String(item.herramienta || '').toLowerCase().includes(q) ||
      String(item.descripcion || '').toLowerCase().includes(q) ||
      String(item.marca || '').toLowerCase().includes(q)
  })
})

const allExpectedScanned = computed(() => {
  const expected = currentConteo.value?.expectedItems || []
  if (!expected.length) return false
  for (const item of expected) {
    const totalScanned = (scannedItems.value || []).filter((s) => String(s.matchedItemId) === String(item.id)).reduce((acc, s) => acc + Number(s.cantidad || 1), 0)
    const expectedQty = Number(item.cantidad || 1)
    if (totalScanned < expectedQty) return false
  }
  return true
})

const openExpectedForManual = (item) => {
  isEditingScanned.value = false
  editingScannedId.value = ''
  scannedForm.value = {
    barcode: String(item.id || ''),
    herramienta: item.herramienta || item.descripcion || '',
    marca: item.marca || '',
    cantidad: Number(item.cantidad || 1),
    estado: item.estado || '',
    comentario: item.comentario || '',
    matchedItemId: item.id
  }
  isScannedModalOpen.value = true
}



const showToast = async (message, color = 'primary') => {
  const t = await toastController.create({ message, duration: 1800, color, position: 'top' })
  await t.present()
}

const load = async () => {
  if (!conteoId) return
  try {
    console.log('Conteo: cargando id=', conteoId)
    await getConteoById(conteoId)
    console.log('Conteo cargado', currentConteo.value)
  } catch (err) {
    await showToast(err?.message || 'No se pudo cargar el conteo', 'danger')
  }
}

onMounted(() => {
  load()
})

const openScannedModal = (scanned) => {
  isEditingScanned.value = true
  editingScannedId.value = scanned.id
  scannedForm.value = { ...scanned }
  isScannedModalOpen.value = true
}

const closeScannedModal = () => {
  isScannedModalOpen.value = false
  isEditingScanned.value = false
  editingScannedId.value = ''
  scannedForm.value = { barcode: '', herramienta: '', marca: '', cantidad: 1, estado: '', comentario: '', matchedItemId: null }
}

const saveScanned = async () => {
  scannedSaving.value = true
  try {
    const payload = { ...scannedForm.value }
    if (isEditingScanned.value && editingScannedId.value) {
      await updateScannedItem(conteoId, editingScannedId.value, payload)
      await showToast('Item actualizado', 'success')
    } else {
      await addScannedItem(conteoId, payload)
      await showToast('Item agregado', 'success')
    }
    await getConteoById(conteoId)
    closeScannedModal()
  } catch (err) {
    await showToast(err?.message || 'Error guardando item escaneado', 'danger')
  } finally {
    scannedSaving.value = false
  }
}

const deleteScanned = async (s) => {
  if (!confirm('Eliminar este item escaneado?')) return
  try {
    await removeScannedItem(conteoId, s.id)
    await showToast('Item eliminado', 'warning')
  } catch (err) {
    await showToast(err?.message || 'No se pudo eliminar', 'danger')
  }
}

const openBarcodeScanner = async () => {
  scannedError.value = ''
  if (isScanning.value) return

  if (!Capacitor?.isNativePlatform?.()) {
    scannedError.value = 'El escaneo solo funciona en la app instalada.'
    await showToast(scannedError.value, 'warning')
    return
  }

  try {
    const { supported } = await BarcodeScanner.isSupported()
    if (!supported) {
      scannedError.value = 'Este dispositivo no soporta escaneo de códigos.'
      await showToast(scannedError.value, 'warning')
      return
    }

    const permissions = await BarcodeScanner.requestPermissions()
    if (permissions.camera !== 'granted') {
      scannedError.value = 'Necesitas permitir acceso a la cámara.'
      await showToast(scannedError.value, 'warning')
      return
    }

    if (Capacitor.getPlatform() === 'android') {
      const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
      if (!moduleStatus.available) {
        scannedError.value = 'Instalando módulo de escaneo...'
        await showToast(scannedError.value, 'warning')
        await BarcodeScanner.installGoogleBarcodeScannerModule()
        // wait briefly for module to become available
        await new Promise((r) => setTimeout(r, 1200))
      }
    }

    isScanning.value = true
    const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE, BarcodeFormat.Itf] })
    const first = result?.barcodes?.[0]
    const scannedCode = (first?.rawValue || first?.displayValue || '').trim()
    if (!scannedCode) {
      scannedError.value = 'No se detectó ningún código.'
      await showToast(scannedError.value, 'warning')
      return
    }

    // Buscar coincidencia en expectedItems
    const matched = (currentConteo.value?.expectedItems || []).find((e) => String(e.id) === String(scannedCode))
    scannedForm.value = {
      barcode: scannedCode,
      herramienta: matched ? matched.herramienta : '',
      marca: matched ? matched.marca : '',
      cantidad: matched ? Number(matched.cantidad || 1) : 1,
      estado: matched ? matched.estado || '' : '',
      comentario: matched ? matched.comentario || '' : '',
      matchedItemId: matched ? matched.id : null
    }

    isEditingScanned.value = false
    editingScannedId.value = ''
    isScannedModalOpen.value = true
  } catch (err) {
    const msg = err?.message || ''
    if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('timeout')) {
      scannedError.value = err?.message || 'No se pudo iniciar el escáner.'
      await showToast(scannedError.value, 'danger')
    }
  } finally {
    isScanning.value = false
  }
}

const getEstadoColorForItem = (item) => {
  const present = (currentConteo.value?.summary?.present || 0) || 0
  // Simple color mapping: if item has a scanned match -> success, else danger
  const presentIds = new Set((scannedItems.value || []).filter((s) => s.matchedItemId).map((s) => String(s.matchedItemId)))
  if (presentIds.has(String(item.id))) return 'success'
  return 'danger'
}

const getEstadoLabelForItem = (item) => {
  const presentIds = new Set((scannedItems.value || []).filter((s) => s.matchedItemId).map((s) => String(s.matchedItemId)))
  return presentIds.has(String(item.id)) ? 'Presente' : 'Faltante'
}

// Helpers to reuse the inventory record design
const getConteoScannedQuantity = (itemId) => {
  return (scannedItems.value || []).filter((s) => String(s.matchedItemId) === String(itemId)).reduce((acc, s) => acc + Number(s.cantidad || 1), 0)
}

const getEstadoClassForExpected = (item) => {
  const scannedQty = getConteoScannedQuantity(item.id)
  const expectedQty = Number(item.cantidad || 1)
  if (scannedQty === 0) {
    const estado = String(item.estado || '').toLowerCase()
    if (estado === 'completo') return 'inventory-row--complete'
    if (estado === 'incompleto') return 'inventory-row--incomplete'
    if (estado === 'faltante') return 'inventory-row--missing'
    return 'inventory-row--incomplete'
  }
  if (scannedQty < expectedQty) return 'inventory-row--incomplete'
  return 'inventory-row--complete'
}

const getEstadoLabelForExpected = (item) => {
  const scannedQty = getConteoScannedQuantity(item.id)
  const expectedQty = Number(item.cantidad || 1)
  if (scannedQty === 0) {
    const estado = String(item.estado || '').toLowerCase()
    if (estado === 'completo') return 'Completo'
    if (estado === 'incompleto') return 'Incompleto'
    if (estado === 'faltante') return 'Faltante'
    return 'Pendiente'
  }
  if (scannedQty < expectedQty) return 'Incompleto'
  return 'Completo'
}

const getEstadoBadgeClassForExpected = (item) => {
  const cls = getEstadoClassForExpected(item)
  if (cls === 'inventory-row--missing') return 'inventory-badge--missing'
  if (cls === 'inventory-row--incomplete') return 'inventory-badge--incomplete'
  return 'inventory-badge--complete'
}

const getScannedRowClass = (s) => {
  const estado = String(s?.estado || '').toLowerCase()
  if (estado === 'completo') return 'inventory-row--complete'
  if (estado === 'incompleto') return 'inventory-row--incomplete'
  if (estado === 'faltante') return 'inventory-row--missing'
  if (s?.matchedItemId) {
    const expectedItem = currentConteo.value?.expectedItems?.find((e) => String(e.id) === String(s.matchedItemId))
    const expectedQty = Number(expectedItem?.cantidad || 1)
    const totalScanned = getConteoScannedQuantity(s.matchedItemId)
    if (totalScanned >= expectedQty) return 'inventory-row--complete'
    return 'inventory-row--incomplete'
  }
  // extras default to complete
  return 'inventory-row--complete'
}

const getScannedBadgeClass = (s) => {
  const estado = String(s?.estado || '').toLowerCase()
  if (estado === 'completo') return 'inventory-badge--complete'
  if (estado === 'incompleto') return 'inventory-badge--incomplete'
  if (estado === 'faltante') return 'inventory-badge--missing'
  if (s?.matchedItemId) {
    const expectedItem = currentConteo.value?.expectedItems?.find((e) => String(e.id) === String(s.matchedItemId))
    const expectedQty = Number(expectedItem?.cantidad || 1)
    const totalScanned = getConteoScannedQuantity(s.matchedItemId)
    if (totalScanned >= expectedQty) return 'inventory-badge--complete'
    return 'inventory-badge--incomplete'
  }
  return 'inventory-badge--complete'
}

const finalize = async () => {
  const alert = await alertController.create({
    header: 'Confirmar',
    message: 'Finalizar conteo y aplicar ajustes al inventario? Esta acción modificará el inventario del colaborador.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Aplicar',
        handler: async () => {
          finalizing.value = true
          try {
            await finalizeConteo(conteoId)
            await showToast('Ajustes aplicados correctamente', 'success')
            await router.push('/inventario-colaboradores')
          } catch (err) {
            await showToast(err?.message || 'No se pudo aplicar los ajustes', 'danger')
          } finally {
            finalizing.value = false
          }
        }
      }
    ]
  })
  await alert.present()
}


</script>

<style scoped>
.modules-trigger { --padding-start: 8px; --padding-end: 8px; --color: #ffffff; font-size: .9rem }
.modules-trigger ion-icon { color: #fff }
.page-container { padding: 1rem; }
.summary-row { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem }
.summary-chip { background:#e2e8f0; color:#334155; font-size:0.82rem; font-weight:600; border-radius:999px; padding:0.35rem 0.7rem }
.summary-chip--active { background:#dcfce7; color:#166534 }
.summary-chip--inactive { background:#fee2e2; color:#b91c1c }
.controls { margin-bottom:1rem }
.loading-state { text-align:center; padding:2rem 1rem }
.form-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:0.25rem; margin-bottom:0.9rem }
.modal-footer { --background: #ffffff; border-top: 1px solid #e2e8f0 }
:global(ion-modal) { --width: min(760px, 92vw); --height: min(82vh, 820px); --border-radius: 16px; --backdrop-opacity: 0.45 }

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
</style>
