<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="icon-only" :icon="apps"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Conteo de colaborador</ion-title>
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

    <ion-content class="inventory-content conteo-content">
      <div class="page-container conteo-page">
        <section class="module-hero">
          <div class="hero-copy">
            <span class="eyebrow">Conteo activo</span>
            <h2>{{ currentConteo?.colaboradorNombre || 'Colaborador' }}</h2>
            <p>Escanea o registra manualmente las herramientas para aplicar los ajustes del inventario.</p>
          </div>

          <div class="hero-actions">
            <ion-button color="primary" fill="outline" class="hero-button" @click="openBarcodeScanner">
              <ion-icon slot="start" :icon="camera"></ion-icon>
              Escanear
            </ion-button>
            <ion-button color="success" class="hero-button" @click="finalize" :disabled="finalizing || loading">
              {{ finalizing ? 'Aplicando...' : 'Finalizar' }}
            </ion-button>
          </div>
        </section>

        <section class="overview-grid" aria-label="Resumen del conteo">
          <article class="overview-card overview-card--primary">
            <span class="overview-label">Esperados</span>
            <strong>{{ currentConteo?.summary?.expected ?? 0 }}</strong>
          </article>
          <article class="overview-card overview-card--success">
            <span class="overview-label">Presentes</span>
            <strong>{{ currentConteo?.summary?.present ?? 0 }}</strong>
          </article>
          <article class="overview-card overview-card--danger">
            <span class="overview-label">Faltantes</span>
            <strong>{{ currentConteo?.summary?.missing ?? 0 }}</strong>
          </article>
          <article class="overview-card overview-card--warning">
            <span class="overview-label">Extras</span>
            <strong>{{ currentConteo?.summary?.extras ?? 0 }}</strong>
          </article>
        </section>

        <div v-if="currentConteo && !allExpectedScanned" class="notice-card">
          <strong>Conteo pendiente</strong>
          <p>Debes escanear todos los items esperados antes de aplicar los ajustes.</p>
        </div>

        <section class="toolbar-card">
          <div class="toolbar-copy">
            <h3>Control de conteo</h3>
            <p>{{ filteredExpectedItems.length }} pendientes · {{ filteredScannedItems.length }} escaneados</p>
          </div>

          <div class="inventory-controls inventory-controls--single">
            <ion-searchbar
              v-model="searchQuery"
              placeholder="Buscar herramienta, marca o código"
              :debounce="200"
              show-clear-button="focus"
              inputmode="search"
              enterkeyhint="search"
              class="inventory-searchbar"
            ></ion-searchbar>
          </div>
        </section>

        <div v-if="scannedError" class="error-message error-message--warning">{{ scannedError }}</div>

        <div v-if="loading" class="loading-state modern-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando conteo...</p>
        </div>

        <div v-else-if="!currentConteo" class="empty-state modern-state">
          <p>No se encontró el conteo con el ID: <strong>{{ conteoId }}</strong></p>
          <p v-if="error" class="field-error">Error: {{ error }}</p>
          <p>Verifica que el ID exista en Firestore y que estés autenticado.</p>
        </div>

        <template v-else>
          <section class="section-card">
            <div class="section-header">
              <div>
                <span class="section-label">Pendientes</span>
                <h3>Items por escanear</h3>
              </div>
              <span class="ui-chip ui-chip--muted">{{ filteredExpectedItems.length }} registros</span>
            </div>

            <p v-if="filteredExpectedItems.length === 0" class="section-empty">No se encontraron coincidencias.</p>

            <ion-list v-else lines="none" class="inventory-list">
              <ion-item
                v-for="item in filteredExpectedItems"
                :key="item.id"
                detail="false"
                lines="none"
                :class="['inventory-card', getEstadoClassForExpected(item)]"
              >
                <div class="inventory-card-content">
                  <div class="inventory-topline">
                    <div class="inventory-title-block">
                      <h3>{{ item.herramienta || item.descripcion || item.id }}</h3>
                      <p>{{ currentConteo?.colaboradorNombre || 'Sin colaborador' }}</p>
                    </div>
                    <span class="ui-chip" :class="getEstadoBadgeClassForExpected(item)">
                      {{ getEstadoLabelForExpected(item) }}
                    </span>
                  </div>

                  <div class="inventory-chip-row">
                    <span class="ui-chip ui-chip--muted">{{ item.marca || 'Sin marca' }}</span>
                    <span class="ui-chip ui-chip--muted">{{ item.id || 'Sin código' }}</span>
                    <span v-if="item.descripcion" class="ui-chip ui-chip--muted">{{ item.descripcion }}</span>
                  </div>

                  <div class="inventory-metric-grid">
                    <div class="inventory-metric inventory-metric--main">
                      <span>Esperado</span>
                      <strong>{{ item.cantidad || 1 }}</strong>
                    </div>
                    <div class="inventory-metric">
                      <span>Escaneado</span>
                      <strong>{{ getConteoScannedQuantity(item.id) }}</strong>
                    </div>
                    <div class="inventory-metric">
                      <span>Pendiente</span>
                      <strong>{{ getExpectedPendingQuantity(item) }}</strong>
                    </div>
                  </div>

                  <ion-button expand="block" fill="outline" class="card-action-button" @click.stop="openExpectedForManual(item)">
                    Agregar manualmente
                  </ion-button>
                </div>
              </ion-item>
            </ion-list>
          </section>

          <section class="section-card">
            <div class="section-header">
              <div>
                <span class="section-label">Capturados</span>
                <h3>Items escaneados</h3>
              </div>
              <span class="ui-chip ui-chip--muted">{{ filteredScannedItems.length }} registros</span>
            </div>

            <p v-if="filteredScannedItems.length === 0" class="section-empty">Aún no hay items escaneados.</p>

            <ion-list v-else lines="none" class="inventory-list">
              <ion-item-sliding v-for="s in filteredScannedItems" :key="s.id" class="inventory-sliding">
                <ion-item button detail="false" lines="none" @click="openScannedModal(s)" :class="['inventory-card', getScannedRowClass(s)]">
                  <div class="inventory-card-content">
                    <div class="inventory-topline">
                      <div class="inventory-title-block">
                        <h3>{{ s.herramienta || s.barcode }}</h3>
                        <p>{{ s.marca || 'Sin marca' }}</p>
                      </div>
                      <span class="ui-chip" :class="getScannedBadgeClass(s)">
                        {{ s.matchedItemId ? 'Coincide' : 'Extra' }}
                      </span>
                    </div>

                    <div class="inventory-chip-row">
                      <span class="ui-chip ui-chip--muted">{{ s.barcode || 'Sin código' }}</span>
                      <span class="ui-chip ui-chip--muted">{{ s.estado || 'Sin estado' }}</span>
                    </div>

                    <div class="inventory-metric-grid">
                      <div class="inventory-metric inventory-metric--main">
                        <span>Cantidad</span>
                        <strong>{{ s.cantidad || 1 }}</strong>
                      </div>
                      <div class="inventory-metric">
                        <span>Código</span>
                        <strong>{{ s.barcode || '—' }}</strong>
                      </div>
                      <div class="inventory-metric">
                        <span>Tipo</span>
                        <strong>{{ s.matchedItemId ? 'Inventario' : 'Extra' }}</strong>
                      </div>
                    </div>

                    <p v-if="s.comentario" class="card-footnote">{{ s.comentario }}</p>
                  </div>
                </ion-item>
                <ion-item-options side="end">
                  <ion-item-option color="danger" @click="deleteScanned(s)">Eliminar</ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </ion-list>
          </section>
        </template>
      </div>
    </ion-content>

    <ion-modal
      :is-open="isScannedModalOpen"
      :backdrop-dismiss="true"
      css-class="conteo-modal"
      @did-dismiss="closeScannedModal"
    >
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
            <span class="section-label">Identificación</span>
            <ion-item lines="none">
              <ion-label position="stacked">Barcode</ion-label>
              <ion-input v-model="scannedForm.barcode" type="text" readonly :legacy="true"></ion-input>
            </ion-item>

            <div class="form-grid">
              <ion-item lines="none">
                <ion-label position="stacked">Herramienta</ion-label>
                <ion-input v-model="scannedForm.herramienta" type="text" :legacy="true"></ion-input>
              </ion-item>

              <ion-item lines="none">
                <ion-label position="stacked">Marca</ion-label>
                <ion-input v-model="scannedForm.marca" type="text" :legacy="true"></ion-input>
              </ion-item>
            </div>
          </div>

          <div class="form-card">
            <span class="section-label">Detalle del conteo</span>
            <div class="form-grid">
              <ion-item lines="none">
                <ion-label position="stacked">Cantidad</ion-label>
                <ion-input v-model.number="scannedForm.cantidad" type="number" min="1" step="1" :legacy="true"></ion-input>
              </ion-item>

              <ion-item lines="none">
                <ion-label position="stacked">Estado</ion-label>
                <ion-select v-model="scannedForm.estado" placeholder="Selecciona estado" interface="popover">
                  <ion-select-option value="completo">Completo</ion-select-option>
                  <ion-select-option value="incompleto">Incompleto</ion-select-option>
                  <ion-select-option value="faltante">Faltante</ion-select-option>
                </ion-select>
              </ion-item>
            </div>

            <ion-item lines="none" class="textarea-item">
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
  IonPopover,
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


const filteredScannedItems = computed(() => {
  const list = scannedItems.value || []
  const q = String(searchQuery.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((item) => {
    return String(item.barcode || '').toLowerCase().includes(q) ||
      String(item.herramienta || '').toLowerCase().includes(q) ||
      String(item.marca || '').toLowerCase().includes(q) ||
      String(item.estado || '').toLowerCase().includes(q) ||
      String(item.comentario || '').toLowerCase().includes(q)
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

const getExpectedPendingQuantity = (item) => {
  const expectedQty = Number(item?.cantidad || 1)
  const scannedQty = getConteoScannedQuantity(item?.id)
  return Math.max(expectedQty - scannedQty, 0)
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
.inventory-content {
  --background: #f5f7fb;
}

.page-container {
  padding: 0.75rem;
}

.conteo-page {
  display: flex;
  flex-direction: column;
  gap: 0.62rem;
}

.modules-trigger {
  --padding-start: 8px;
  --padding-end: 8px;
  --color: #ffffff;
}

.modules-trigger ion-icon {
  color: #ffffff;
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
.section-header h3,
.inventory-title-block h3 {
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
.section-empty,
.card-footnote,
.notice-card p {
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
.card-action-button,
.modal-footer ion-button,
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
.section-card,
.form-card,
.notice-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.toolbar-card,
.section-card,
.notice-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.58rem;
}

.notice-card {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
}

.notice-card strong {
  color: #92400e;
  font-weight: 850;
}

.notice-card p {
  color: #92400e;
}

.toolbar-copy,
.section-header {
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
  grid-template-columns: minmax(0, 1fr);
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

.section-header {
  align-items: flex-start;
}

.section-label {
  display: block;
  margin: 0 0 0.18rem;
  color: #2563eb;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.inventory-list {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 0.54rem;
  padding: 0;
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
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.055);
}

.inventory-sliding .inventory-card {
  box-shadow: none;
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

.card-action-button {
  margin-top: 0.5rem;
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

.section-empty {
  text-align: center;
  padding: 1rem 0.4rem;
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

.field-error {
  margin: 0.35rem 0 0;
  color: #b91c1c;
}

.modal-form {
  padding: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

:global(ion-modal.conteo-modal) {
  --width: min(820px, 94vw);
  --height: min(86vh, 860px);
  --border-radius: 20px;
  --box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3);
  --backdrop-opacity: 0.42;
}

:global(ion-modal.conteo-modal::part(content)) {
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

.inventory-sliding ion-item-option {
  margin: 0;
  font-weight: 700;
}

.inventory-sliding ion-item-option::part(native) {
  padding-inline: 0.8rem;
}

ion-button {
  text-transform: none;
}

@media (max-width: 720px) {
  .inventory-topline,
  .section-header {
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

  :global(ion-modal.conteo-modal) {
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

  .inventory-searchbar {
    min-height: 34px;
  }
}

/* Escala tipográfica ÚNICA mobile-first - Conteo colaborador
   Máximo 4 tamaños reales:
   XS = chips/metadatos · SM = textos secundarios · MD = lectura/campos/botones · LG = títulos/valores */
.inventory-content,
:global(ion-modal.conteo-modal) {
  --text-xs: 0.72rem;
  --text-sm: 0.82rem;
  --text-md: 0.92rem;
  --text-lg: 1.06rem;
}

.inventory-content,
.inventory-content ion-content,
.inventory-content ion-item,
.inventory-content ion-label,
:global(ion-modal.conteo-modal),
:global(ion-modal.conteo-modal) ion-content,
:global(ion-modal.conteo-modal) ion-item,
:global(ion-modal.conteo-modal) ion-label {
  font-size: var(--text-md) !important;
  line-height: 1.38 !important;
  text-rendering: optimizeLegibility !important;
  -webkit-font-smoothing: antialiased !important;
}

.inventory-content ion-title,
:global(ion-modal.conteo-modal) ion-title,
.hero-copy h2,
.module-hero h2,
.toolbar-copy h3,
.section-header h3,
.inventory-title-block h3,
.section-label,
:global(ion-modal.conteo-modal) h2,
:global(ion-modal.conteo-modal) h3,
:global(ion-modal.conteo-modal) h4 {
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
.empty-state p,
.loading-state p,
.section-empty,
.field-error,
.card-footnote,
.error-message,
.notice-card p,
:global(ion-modal.conteo-modal) p,
:global(ion-modal.conteo-modal) .field-error,
:global(ion-modal.conteo-modal) .error-message {
  font-size: var(--text-sm) !important;
  line-height: 1.42 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.hero-button,
.card-action-button,
.modal-footer ion-button,
.close-modal-btn,
ion-button,
.inventory-sliding ion-item-option,
.form-card ion-label,
:global(ion-modal.conteo-modal) ion-button,
:global(ion-modal.conteo-modal) ion-label {
  font-size: var(--text-md) !important;
  line-height: 1.28 !important;
  font-weight: 780 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.form-card ion-input,
.form-card ion-select,
.form-card ion-textarea,
.inventory-searchbar::part(input),
:global(ion-modal.conteo-modal) ion-input,
:global(ion-modal.conteo-modal) ion-select,
:global(ion-modal.conteo-modal) ion-textarea {
  font-size: var(--text-md) !important;
  line-height: 1.38 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.ui-chip,
.eyebrow,
.overview-label,
.inventory-metric span,
:global(ion-modal.conteo-modal) .ui-chip,
:global(ion-modal.conteo-modal) .eyebrow,
:global(ion-modal.conteo-modal) .inventory-metric span {
  font-size: var(--text-xs) !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  letter-spacing: 0.012em !important;
}

.overview-card strong,
.inventory-metric strong,
:global(ion-modal.conteo-modal) .inventory-metric strong {
  font-size: var(--text-lg) !important;
  line-height: 1.1 !important;
  font-weight: 900 !important;
  letter-spacing: -0.01em !important;
}

@media (max-width: 430px) {
  .inventory-content,
  :global(ion-modal.conteo-modal) {
    --text-xs: 0.72rem;
    --text-sm: 0.82rem;
    --text-md: 0.92rem;
    --text-lg: 1.06rem;
  }
}
</style>
