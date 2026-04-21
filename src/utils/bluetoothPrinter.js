const getBluetoothSerial = () => {
  const plugin = window?.bluetoothSerial
  if (!plugin) {
    throw new Error('BluetoothSerial no esta disponible en este dispositivo.')
  }
  return plugin
}

const promisify = (fn) => new Promise((resolve, reject) => fn(resolve, reject))

export const bluetoothIsEnabled = async () => {
  const plugin = getBluetoothSerial()
  return promisify(plugin.isEnabled)
}

export const bluetoothList = async () => {
  const plugin = getBluetoothSerial()
  return promisify(plugin.list)
}

export const bluetoothConnect = async (deviceId) => {
  const plugin = getBluetoothSerial()
  return promisify((resolve, reject) => plugin.connect(deviceId, resolve, reject))
}

export const bluetoothDisconnect = async () => {
  const plugin = getBluetoothSerial()
  return promisify(plugin.disconnect)
}

export const bluetoothWrite = async (data) => {
  const plugin = getBluetoothSerial()
  return promisify((resolve, reject) => plugin.write(data, resolve, reject))
}

const toBinaryString = (bytes) => {
  let result = ''
  for (let i = 0; i < bytes.length; i += 1) {
    result += String.fromCharCode(bytes[i])
  }
  return result
}

export const buildCode128Barcode = (value) => {
  const encoder = new TextEncoder()
  const dataBytes = Array.from(encoder.encode(value))

  if (dataBytes.length === 0) {
    throw new Error('El codigo de barras esta vacio.')
  }

  if (dataBytes.length > 255) {
    throw new Error('El codigo de barras es demasiado largo para imprimir.')
  }

  const bytes = [
    0x1b, 0x40, // ESC @
    0x1d, 0x48, 0x02, // GS H 2 (HRI abajo)
    0x1d, 0x66, 0x00, // GS f 0 (fuente HRI A)
    0x1d, 0x68, 60, // GS h 60 (altura)
    0x1d, 0x77, 2, // GS w 2 (ancho)
    0x1d, 0x6b, 73, dataBytes.length, // GS k 73 n (CODE128)
    ...dataBytes,
    0x0a,
    ...dataBytes,
    0x0a, 0x0a
  ]

  return toBinaryString(bytes)
}

export const getDeviceId = (device) => {
  return device?.id || device?.address || device?.uuid || ''
}

export const getDeviceLabel = (device) => {
  return device?.name || device?.id || device?.address || 'Impresora'
}
