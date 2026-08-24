import * as XLSX from 'xlsx'

const normalizeText = (value = '') => String(value ?? '').trim()

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeSheetName = (value = 'Inventario') => String(value || 'Inventario')
  .replace(/[\\/?*\[\]:]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 31) || 'Inventario'

export const buildProductosAreaWorkbook = (items = [], areaLabel = 'Segundo Piso') => {
  const orderedItems = [...items].sort((left, right) => (
    normalizeText(left.nombre).localeCompare(normalizeText(right.nombre), 'es-MX', { sensitivity: 'base' })
  ))

  const rows = [
    ['Inventario de productos', areaLabel],
    ['Fecha de exportación', new Date().toLocaleString('es-MX')],
    ['Productos', orderedItems.length],
    [],
    [
      'Código de barras',
      'Producto',
      'Forma de control',
      'Descripción',
      'Stock nuevo',
      'Stock empezado',
      'Stock disponible',
      'Stock prestado',
      'Stock total',
      'Stock mínimo',
      'Estado del stock',
      'Precio unitario',
      'ID Firebase'
    ]
  ]

  orderedItems.forEach((item) => {
    rows.push([
      normalizeText(item.codigoBarras),
      normalizeText(item.nombre),
      normalizeText(item.formaControl),
      normalizeText(item.descripcion),
      normalizeNumber(item.stockNuevo),
      normalizeNumber(item.stockEmpezado),
      normalizeNumber(item.stockDisponible),
      normalizeNumber(item.stockPrestado),
      normalizeNumber(item.stockTotal),
      normalizeNumber(item.stockMinimo),
      normalizeText(item.estadoStock),
      item.precio === null || item.precio === undefined || item.precio === ''
        ? ''
        : normalizeNumber(item.precio),
      normalizeText(item.id)
    ])
  })

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 30 },
    { wch: 24 },
    { wch: 38 },
    { wch: 13 },
    { wch: 15 },
    { wch: 16 },
    { wch: 15 },
    { wch: 12 },
    { wch: 13 },
    { wch: 17 },
    { wch: 14 },
    { wch: 28 }
  ]
  if (orderedItems.length) {
    worksheet['!autofilter'] = { ref: `A5:M${orderedItems.length + 5}` }

    for (let rowIndex = 5; rowIndex < orderedItems.length + 5; rowIndex += 1) {
      for (let columnIndex = 4; columnIndex <= 9; columnIndex += 1) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })]
        if (cell) cell.z = '#,##0.##'
      }

      const priceCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 11 })]
      if (priceCell?.t === 'n') priceCell.z = '"$"#,##0.00'
    }
  }

  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: `Inventario de productos - ${areaLabel}`,
    Subject: `Stock de productos en ${areaLabel}`
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, normalizeSheetName(areaLabel))
  return workbook
}

export const stringifyProductosAreaWorkbook = (workbook, outputType = 'array') => (
  XLSX.write(workbook, { bookType: 'xlsx', type: outputType })
)
