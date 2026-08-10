const PRINTER_STORAGE_KEY = 'tsplPrinterDeviceId'
const CONNECT_TIMEOUT_MS = 12000

let connectedDeviceId = ''

const getBluetoothSerial = () => {
  const plugin = typeof window !== 'undefined' ? window.bluetoothSerial : null
  if (!plugin) {
    throw new Error('La impresión Bluetooth no está disponible. Instala nuevamente la aplicación Android actualizada.')
  }
  return plugin
}

const callbackPromise = (executor) => new Promise((resolve, reject) => {
  executor(resolve, (error) => reject(new Error(String(error || 'Error de Bluetooth.'))))
})

const withTimeout = (promise, timeoutMs, message) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  promise.then(
    (value) => {
      clearTimeout(timer)
      resolve(value)
    },
    (error) => {
      clearTimeout(timer)
      reject(error)
    }
  )
})

export const bluetoothIsEnabled = async () => {
  const plugin = getBluetoothSerial()
  try {
    return await callbackPromise((resolve, reject) => plugin.isEnabled(resolve, reject))
  } catch {
    throw new Error('Activa Bluetooth en el teléfono para poder imprimir.')
  }
}

export const bluetoothIsConnected = async () => {
  const plugin = getBluetoothSerial()
  try {
    await callbackPromise((resolve, reject) => plugin.isConnected(resolve, reject))
    return true
  } catch {
    return false
  }
}

export const bluetoothList = async () => {
  await bluetoothIsEnabled()
  const plugin = getBluetoothSerial()
  const devices = await callbackPromise((resolve, reject) => plugin.list(resolve, reject))
  return Array.isArray(devices) ? devices : []
}

export const bluetoothConnect = async (deviceId) => {
  const plugin = getBluetoothSerial()
  const normalizedDeviceId = String(deviceId || '').trim()
  if (!normalizedDeviceId) throw new Error('Selecciona una impresora Bluetooth.')

  const alreadyConnected = await bluetoothIsConnected()
  if (alreadyConnected && (!connectedDeviceId || connectedDeviceId === normalizedDeviceId)) {
    connectedDeviceId = normalizedDeviceId
    return true
  }

  if (alreadyConnected) {
    await bluetoothDisconnect()
  }

  await withTimeout(
    callbackPromise((resolve, reject) => plugin.connect(normalizedDeviceId, resolve, reject)),
    CONNECT_TIMEOUT_MS,
    'La impresora no respondió. Comprueba que esté encendida y cerca del teléfono.'
  )
  connectedDeviceId = normalizedDeviceId
  return true
}

export const bluetoothDisconnect = async () => {
  const plugin = getBluetoothSerial()
  try {
    await callbackPromise((resolve, reject) => plugin.disconnect(resolve, reject))
  } finally {
    connectedDeviceId = ''
  }
}

export const bluetoothWrite = async (data) => {
  const plugin = getBluetoothSerial()
  return callbackPromise((resolve, reject) => plugin.write(data, resolve, reject))
}

const sanitizeTsplValue = (value) => String(value || '')
  .trim()
  .replace(/["\r\n]/g, '')

export const buildTsplBarcodeLabel = (
  value,
  { widthMm = 51, heightMm = 25, copies = 1 } = {}
) => {
  const barcode = sanitizeTsplValue(value)
  if (!barcode) throw new Error('El código de barras está vacío.')
  if (barcode.length > 48) throw new Error('El código es demasiado largo para una etiqueta de 51 × 25 mm.')

  const labelWidth = Number(widthMm) || 51
  const labelHeight = Number(heightMm) || 25
  const printCopies = Math.max(1, Math.min(20, Math.trunc(Number(copies) || 1)))
  const narrowBar = barcode.length <= 12 ? 2 : 1
  const wideBar = 2

  return [
    `SIZE ${labelWidth} mm,${labelHeight} mm`,
    'GAP 2 mm,0 mm',
    'DIRECTION 1,0',
    'REFERENCE 0,0',
    'OFFSET 0 mm',
    'SPEED 3',
    'DENSITY 8',
    'CLS',
    `BARCODE 16,20,"128",155,0,0,${narrowBar},${wideBar},"${barcode}"`,
    `PRINT 1,${printCopies}`,
    ''
  ].join('\r\n')
}

export const printTsplBarcode = async ({ deviceId, barcode, copies = 1 }) => {
  await bluetoothIsEnabled()
  await bluetoothConnect(deviceId)
  const command = buildTsplBarcodeLabel(barcode, {
    widthMm: 51,
    heightMm: 25,
    copies
  })
  await bluetoothWrite(command)
  return true
}

export const getSavedPrinterDeviceId = () => {
  try {
    return String(localStorage.getItem(PRINTER_STORAGE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export const savePrinterDeviceId = (deviceId) => {
  const normalizedDeviceId = String(deviceId || '').trim()
  if (!normalizedDeviceId) return
  localStorage.setItem(PRINTER_STORAGE_KEY, normalizedDeviceId)
}

export const clearSavedPrinterDeviceId = () => {
  try {
    localStorage.removeItem(PRINTER_STORAGE_KEY)
  } catch {
    // El almacenamiento puede estar deshabilitado; no impide imprimir.
  }
}

export const getDeviceId = (device) => device?.id || device?.address || device?.uuid || ''

export const getDeviceLabel = (device) => {
  const name = String(device?.name || '').trim()
  const id = getDeviceId(device)
  return name ? `${name} · ${id}` : id || 'Impresora Bluetooth'
}
