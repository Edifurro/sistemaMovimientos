import { Capacitor, registerPlugin } from '@capacitor/core'
import { alertController } from '@ionic/vue'
import {
  bluetoothDisconnect,
  bluetoothList,
  clearSavedPrinterDeviceId,
  getDeviceId,
  getDeviceLabel,
  getSavedPrinterDeviceId,
  printTsplBarcode,
  savePrinterDeviceId
} from '../utils/bluetoothPrinter'

const BluetoothPermissions = registerPlugin('BluetoothPermissions')

const ensureBluetoothPermission = async () => {
  if (Capacitor.getPlatform() !== 'android') return
  const result = await BluetoothPermissions.requestBluetoothPermission()
  if (result?.bluetooth !== 'granted') {
    throw new Error('Autoriza el permiso Dispositivos cercanos para imprimir por Bluetooth.')
  }
}

const selectPrinter = async (devices) => {
  if (devices.length === 1) return devices[0]

  const alert = await alertController.create({
    header: 'Impresora TSPL',
    subHeader: 'Selecciona una impresora Bluetooth emparejada',
    inputs: devices.map((device, index) => ({
      type: 'radio',
      label: getDeviceLabel(device),
      value: getDeviceId(device),
      checked: index === 0
    })),
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Usar impresora', role: 'confirm' }
    ]
  })

  await alert.present()
  const result = await alert.onDidDismiss()
  if (result.role !== 'confirm' || !result.data?.values) {
    throw new Error('No se seleccionó una impresora.')
  }

  return devices.find((device) => getDeviceId(device) === result.data.values) || null
}

const resolvePrinter = async () => {
  const devices = await bluetoothList()
  if (!devices.length) {
    throw new Error('No hay impresoras Bluetooth emparejadas. Empareja la impresora desde Ajustes de Android.')
  }

  const savedDeviceId = getSavedPrinterDeviceId()
  const savedDevice = devices.find((device) => getDeviceId(device) === savedDeviceId)
  if (savedDevice) return savedDevice

  const selectedDevice = await selectPrinter(devices)
  if (!selectedDevice) throw new Error('No se seleccionó una impresora.')
  savePrinterDeviceId(getDeviceId(selectedDevice))
  return selectedDevice
}

export function useTsplPrinter() {
  const printBarcodeLabel = async (barcode) => {
    if (!Capacitor?.isNativePlatform?.()) {
      throw new Error('La impresión TSPL directa sólo está disponible en la aplicación Android.')
    }

    await ensureBluetoothPermission()
    const printer = await resolvePrinter()

    try {
      await printTsplBarcode({
        deviceId: getDeviceId(printer),
        barcode,
        copies: 1
      })
      return printer
    } catch (error) {
      clearSavedPrinterDeviceId()
      await bluetoothDisconnect().catch(() => {})
      throw error
    }
  }

  const forgetPrinter = async () => {
    clearSavedPrinterDeviceId()
    await bluetoothDisconnect().catch(() => {})
  }

  return {
    printBarcodeLabel,
    forgetPrinter
  }
}
