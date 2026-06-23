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

      <div class="controls">
        <ion-searchbar v-model="searchText" placeholder="buscar por nombre o categoria" :debounce="200"></ion-searchbar>
        <div class="action-row">
          <ion-button expand="block" @click="openCreateModal">Nuevo</ion-button>
          <ion-button expand="block" fill="outline" @click="openBarcodeScanner">
            <ion-icon slot="start" :icon="camera"></ion-icon>
            Escanear
          </ion-button>
        </div>
      </div>

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
              <p v-if="item.proveedor || (item.costoUnitario !== undefined && item.costoUnitario !== null)">
                Proveedor: {{ item.proveedor || '—' }} • Precio: {{ (item.costoUnitario !== undefined && item.costoUnitario !== null) ? ('$' + Number(item.costoUnitario).toFixed(2)) : '—' }}
              </p>
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
            <ion-buttons slot="end">
              <ion-button v-if="!isEditing" @click="generateBarcode">Generar</ion-button>
            </ion-buttons>
            <ion-buttons slot="end">
              <ion-button class="close-modal-btn" @click="closeModal">
                <ion-icon slot="start" :icon="closeOutline"></ion-icon>
                Cerrar
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="modal-form">
            <ion-item>
                <ion-label position="stacked">Barcode</ion-label>
                <ion-input v-model="formData.barcode" readonly :legacy="true"></ion-input>
            </ion-item>
            <ion-button
              v-if="isEditing"
              expand="block"
              fill="outline"
              class="print-barcode-button"
              :disabled="isPrinting"
              color="primary"
              @click="shareLabelToTinyPrint"
            >
              <ion-icon slot="start" :icon="print"></ion-icon>
              {{ isPrinting ? 'Generando etiqueta...' : 'Imprimir etiqueta' }}
            </ion-button>
            <p v-if="printError" class="field-error">{{ printError }}</p>
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
            <div v-if="isEditing" class="modal-actions">
              <ion-button color="danger" expand="block" @click="confirmDelete">Eliminar item</ion-button>
            </div>
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

      <ion-alert :is-open="showDeleteConfirm" header="Confirmar Eliminación" message="¿Estás seguro de que deseas eliminar este item?" :buttons="deleteConfirmButtons"></ion-alert>
      <ion-toast :is-open="showToast" :message="toastMessage" :color="toastColor" duration="2200" position="top" @did-dismiss="showToast=false"></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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
  IonSpinner,
  IonAlert
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useInventarioBodega } from '../composables/useInventarioBodega'
import { useAuth } from '../composables/useAuth'
import { useMovimientosBodega } from '../composables/useMovimientosBodega'
import { home, cube, people, swapHorizontal, apps, clipboardOutline, print, camera, closeOutline } from 'ionicons/icons'
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
import JsBarcode from 'jsbarcode'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const { inventarioBodega, loading, getInventario, getInventarioById, createInventarioItem, updateInventarioItem, getNextBarcode, deleteInventarioItem } = useInventarioBodega()
const { createMovimiento } = useMovimientosBodega()

const inventario = inventarioBodega
const searchText = ref('')

// Scanner state
const isScanning = ref(false)
const isModalScannerBusy = ref(false)
const scannerError = ref('')

const SCANNER_TIMEOUT_MS = 15000
const DEBOUNCE_DELAY_MS = 800
const MODULE_INSTALL_TIMEOUT_MS = 20000
const MODULE_INSTALL_POLL_MS = 1000

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
const showDeleteConfirm = ref(false)

const generateBarcode = async () => {
  try {
    formData.value.barcode = await getNextBarcode()
  } catch (err) {
    showFeedback('No se pudo generar barcode', 'danger')
  }
}

const isPrinting = ref(false)
const printError = ref('')

const LABEL_WIDTH_PX = 320
const LABEL_HEIGHT_PX = 160
const LABEL_RENDER_SCALE = 3

const buildLabelDataUrl = (code) => {
  const canvas = document.createElement('canvas')
  canvas.width = LABEL_WIDTH_PX * LABEL_RENDER_SCALE
  canvas.height = LABEL_HEIGHT_PX * LABEL_RENDER_SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el lienzo de impresion.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const barcodeCanvas = document.createElement('canvas')
  barcodeCanvas.width = LABEL_WIDTH_PX * LABEL_RENDER_SCALE
  barcodeCanvas.height = 104 * LABEL_RENDER_SCALE
  const barcodeCtx = barcodeCanvas.getContext('2d')
  if (!barcodeCtx) throw new Error('No se pudo crear el lienzo del codigo de barras.')

  barcodeCtx.fillStyle = '#ffffff'
  barcodeCtx.fillRect(0, 0, barcodeCanvas.width, barcodeCanvas.height)

  JsBarcode(barcodeCanvas, code, {
    format: 'CODE128',
    displayValue: false,
    marginLeft: 34,
    marginRight: 34,
    marginTop: 8,
    marginBottom: 8,
    height: 86 * LABEL_RENDER_SCALE,
    width: 2.4,
    lineColor: '#000000',
    background: '#ffffff'
  })

  ctx.imageSmoothingEnabled = false
  // Añadir 1.5 cm extra de margen superior (previos 1.0cm + 0.5cm adicional)
  // y 1.0 cm extra de margen derecho (previos 0.5cm + 0.5cm adicional) para ajustar la etiqueta física.
  const extraTopMarginCm = 1.5
  const extraRightMarginCm = 0.8
  const pxPerCm = 96 / 2.54
  const extraTopMarginPx = Math.round(extraTopMarginCm * pxPerCm * LABEL_RENDER_SCALE)
  const extraRightMarginPx = Math.round(extraRightMarginCm * pxPerCm * LABEL_RENDER_SCALE)

  const destWidth = Math.max(0, canvas.width - extraRightMarginPx)

  ctx.drawImage(
    barcodeCanvas,
    0,
    0,
    barcodeCanvas.width,
    barcodeCanvas.height,
    0,
    8 * LABEL_RENDER_SCALE + extraTopMarginPx,
    destWidth,
    104 * LABEL_RENDER_SCALE
  )

  // No dibujar el texto del código debajo del barcode (sólo la imagen)

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

  return canvas.toDataURL('image/png')
}

const buildLabelFileUri = async (code) => {
  const dataUrl = buildLabelDataUrl(code)
  const base64Data = dataUrl.split(',')[1]
  if (!base64Data) throw new Error('No se pudo generar la imagen de impresión.')

  const fileName = `tinyprint-${code}.png`
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Cache,
    recursive: true
  })

  return result.uri
}

const shareLabelToTinyPrint = async () => {
  printError.value = ''
  if (!isEditing.value) return

  const barcode = (formData.value.barcode || '').trim()
  if (!barcode) {
    printError.value = 'El registro no tiene codigo de barras.'
    return
  }

  if (!Capacitor?.isNativePlatform?.()) {
    printError.value = 'La impresion solo funciona en la app instalada.'
    return
  }

  try {
    isPrinting.value = true
    const fileUri = await buildLabelFileUri(barcode)
    await Share.share({
      title: 'Etiqueta de inventario',
      text: barcode,
      files: [fileUri],
      dialogTitle: 'Compartir etiqueta con TinyPrint'
    })

    showFeedback(`Etiqueta enviada - ${barcode}`, 'success')
  } catch (err) {
    const errorMsg = err?.message || 'No se pudo generar la etiqueta.'
    if (!errorMsg.includes('cancel') && !errorMsg.includes('dismiss')) {
      printError.value = errorMsg
      showFeedback(errorMsg, 'danger')
    }
  } finally {
    isPrinting.value = false
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
        await deleteInventarioItem(formData.value.barcode)
        showFeedback('Item eliminado', 'success')
        await refresh()
        closeModal()
      } catch (err) {
        showFeedback(err?.message || 'No se pudo eliminar el item', 'danger')
      }
    }
  }
]

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
      const newId = await createInventarioItem(payload)
      // Mostrar inmediatamente el nuevo item en la lista local antes de refrescar
      try {
        inventario.value = [{ id: newId, barcode: newId, ...payload }, ...inventario.value]
      } catch (e) {
        // ignore local update errors
      }
      showFeedback('Item creado', 'success')
    }
    await refresh()
    closeModal()
  } catch (err) {
    showFeedback(err?.message || 'Error al guardar', 'danger')
  } finally { saving.value = false }
}

const openBarcodeScanner = async () => {
  scannerError.value = ''
  if (isScanning.value || isModalScannerBusy.value) return

  if (!Capacitor?.isNativePlatform?.()) {
    scannerError.value = 'El escaneo solo funciona en la app instalada.'
    showFeedback(scannerError.value, 'warning')
    return
  }

  isModalScannerBusy.value = true
  try {
    const { supported } = await BarcodeScanner.isSupported()
    if (!supported) {
      scannerError.value = 'Este dispositivo no soporta escaneo de códigos.'
      showFeedback(scannerError.value, 'warning')
      return
    }

    const permissions = await BarcodeScanner.requestPermissions()
    if (permissions.camera !== 'granted') {
      scannerError.value = 'Necesitas permitir acceso a la cámara.'
      showFeedback(scannerError.value, 'warning')
      return
    }

    if (Capacitor.getPlatform() === 'android') {
      const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
      if (!moduleStatus.available) {
        scannerError.value = 'Instalando módulo de escaneo...'
        showFeedback(scannerError.value, 'warning')
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
      showFeedback(scannerError.value, 'warning')
      return
    }

    try {
      const found = await getInventarioById(scannedCode)
      if (found) {
        openEditModal(found)
        showFeedback(`Item encontrado: ${found.descripcion || found.barcode}`, 'success')
      } else {
        showFeedback(`No se encontró un item con el código ${scannedCode}.`, 'warning')
      }
    } catch (err) {
      showFeedback(err?.message || 'Error buscando el código escaneado.', 'danger')
    }

  } catch (err) {
    const msg = err?.message || ''
    if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('timeout')) {
      scannerError.value = err?.message || 'No se pudo iniciar el escáner.'
      showFeedback(scannerError.value, 'danger')
    }
  } finally {
    isScanning.value = false
    isModalScannerBusy.value = false
    await new Promise((r) => setTimeout(r, DEBOUNCE_DELAY_MS))
  }
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
.page-header { margin-bottom: 1rem }
.page-header h2 { margin: 0 0 0.35rem }

.controls {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.action-row {
  display: grid;
  gap: 0.5rem;
}

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
