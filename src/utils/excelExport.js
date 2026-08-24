import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const normalizeFileName = (value = 'inventario.xlsx') => {
  const safeName = String(value || 'inventario.xlsx')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return safeName.toLowerCase().endsWith('.xlsx') ? safeName : `${safeName}.xlsx`
}

export const exportXlsxWorkbook = async ({
  workbook,
  fileName,
  title = 'Inventario',
  text = 'Archivo Excel de inventario',
  dialogTitle = 'Compartir inventario'
} = {}) => {
  if (!workbook?.SheetNames?.length) {
    throw new Error('No se pudo generar el libro de Excel.')
  }

  const normalizedFileName = normalizeFileName(fileName)

  if (Capacitor?.isNativePlatform?.()) {
    const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
    const result = await Filesystem.writeFile({
      path: normalizedFileName,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true
    })

    await Share.share({
      title,
      text,
      files: [result.uri],
      dialogTitle
    })

    return { fileName: normalizedFileName, uri: result.uri, platform: 'native' }
  }

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  try {
    link.href = url
    link.download = normalizedFileName
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return { fileName: normalizedFileName, platform: 'web' }
}
