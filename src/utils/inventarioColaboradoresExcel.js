import * as XLSX from 'xlsx'

const normalizeKey = (value = '') => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

const normalizeText = (value = '') => {
  return String(value || '').trim()
}

const normalizeQuantity = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  const fallbackValue = Number.parseInt(String(fallback ?? 1).trim(), 10)
  return Number.isFinite(fallbackValue) && fallbackValue > 0 ? fallbackValue : 1
}

const normalizeEstado = (value = '') => {
  const normalized = normalizeText(value).toLowerCase()

  if (!normalized) {
    return 'completo'
  }

  if (normalized.includes('falt')) {
    return 'faltante'
  }

  if (normalized.includes('incomp') || normalized.includes('parcial')) {
    return 'incompleto'
  }

  return 'completo'
}

const normalizeDateValue = (value = '') => {
  if (!value) {
    return ''
  }

  if (typeof value?.toDate === 'function') {
    return normalizeDateValue(value.toDate())
  }

  if (Number.isFinite(Number(value?.seconds))) {
    return normalizeDateValue(new Date(Number(value.seconds) * 1000))
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const raw = String(value).trim()
  if (!raw) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10)
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return raw
}

const formatEstadoLabel = (value = '') => {
  const estado = normalizeEstado(value)
  if (estado === 'faltante') return 'Faltante'
  if (estado === 'incompleto') return 'Incompleto'
  return 'Completo'
}

const valueFromNormalizedRow = (normalizedRow, aliases = []) => {
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias)
    if (Object.prototype.hasOwnProperty.call(normalizedRow, normalizedAlias)) {
      const value = normalizedRow[normalizedAlias]
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value
      }
    }
  }

  return ''
}

const mapRow = (row = {}) => {
  const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeKey(key)] = value
    return acc
  }, {})

  return {
    barcode: normalizeText(valueFromNormalizedRow(normalizedRow, ['barcode', 'codigo de barras', 'codigo barras', 'codigo_barra', 'codigobarras', 'codigo'])),
    colaboradorId: normalizeText(valueFromNormalizedRow(normalizedRow, ['colaboradorId', 'id colaborador', 'id del colaborador', 'idcolaborador'])),
    colaboradorNombre: normalizeText(valueFromNormalizedRow(normalizedRow, ['colaborador', 'colaborador nombre', 'nombre colaborador', 'nombre del colaborador', 'colaboradornombre'])),
    codigoEmpleado: normalizeText(valueFromNormalizedRow(normalizedRow, ['codigo empleado', 'codigo empleado', 'codigoempleado'])),
    marca: normalizeText(valueFromNormalizedRow(normalizedRow, ['marca', 'brand', 'marca herramienta', 'marca_producto'])),
    herramienta: normalizeText(valueFromNormalizedRow(normalizedRow, ['herramienta', 'nombre herramienta', 'nombre del item', 'item', 'activo'])),
    cantidad: normalizeQuantity(valueFromNormalizedRow(normalizedRow, ['cantidad', 'cant', 'qty', 'quantity']), 1),
    descripcion: normalizeText(valueFromNormalizedRow(normalizedRow, ['descripcion', 'detalle', 'observacion', 'descripción'])),
    categoria: normalizeText(valueFromNormalizedRow(normalizedRow, ['categoria', 'tipo', 'clasificacion'])),
    estado: normalizeEstado(valueFromNormalizedRow(normalizedRow, ['estado', 'estatus', 'condicion'])),
    comentario: normalizeText(valueFromNormalizedRow(normalizedRow, ['comentario', 'comentarios', 'notas', 'nota'])),
    fechaEntrega: normalizeDateValue(valueFromNormalizedRow(normalizedRow, ['fecha entrega', 'fecha de entrega', 'entrega', 'fecha'])),
    fechaCaptura: normalizeDateValue(valueFromNormalizedRow(normalizedRow, ['fecha captura', 'captura', 'created at', 'createdAt']))
  }
}

const normalizeSheetName = (value = 'Sin colaborador') => {
  const baseName = normalizeText(value) || 'Sin colaborador'
  return baseName
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || 'Sin colaborador'
}

const uniqueSheetName = (baseName, usedNames) => {
  const normalizedBase = normalizeSheetName(baseName)
  if (!usedNames.has(normalizedBase)) {
    usedNames.add(normalizedBase)
    return normalizedBase
  }

  let counter = 2
  while (counter < 100) {
    const suffix = ` ${counter}`
    const maxBaseLength = 31 - suffix.length
    const candidate = `${normalizedBase.slice(0, maxBaseLength)}${suffix}`
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate)
      return candidate
    }
    counter += 1
  }

  const fallback = `${normalizedBase.slice(0, 27)} ...`
  usedNames.add(fallback)
  return fallback
}

const buildSheetRows = (collaboratorName, collaboratorCode, items = []) => {
  const totalQuantity = items.reduce((acc, item) => acc + normalizeQuantity(item.cantidad, 1), 0)
  const rows = [
    ['Colaborador', normalizeText(collaboratorName) || 'Sin colaborador'],
    ['Codigo empleado', normalizeText(collaboratorCode)],
    ['Fecha de exportacion', new Date().toLocaleString('es-MX')],
    ['Registros', items.length],
    ['Cantidad total', totalQuantity],
    [],
    [
      'Codigo de barras',
      'Herramienta',
      'Marca',
      'Cantidad',
      'Estado',
      'Comentario',
      'Fecha de entrega',
      'Descripcion',
      'Categoria',
      'ID colaborador',
      'ID Firebase',
      'Fecha de captura'
    ]
  ]

  items.forEach((item) => {
    rows.push([
      normalizeText(item.barcode),
      normalizeText(item.herramienta),
      normalizeText(item.marca),
      normalizeQuantity(item.cantidad, 1),
      formatEstadoLabel(item.estado),
      normalizeText(item.comentario),
      normalizeDateValue(item.fechaEntrega),
      normalizeText(item.descripcion),
      normalizeText(item.categoria),
      normalizeText(item.colaboradorId),
      normalizeText(item.id),
      normalizeDateValue(item.fechaCaptura || item.createdAt)
    ])
  })

  return rows
}

const applyWorksheetLayout = (worksheet, itemCount) => {
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 11 },
    { wch: 14 },
    { wch: 34 },
    { wch: 17 },
    { wch: 36 },
    { wch: 20 },
    { wch: 28 },
    { wch: 28 },
    { wch: 18 }
  ]

  if (!itemCount) return

  worksheet['!autofilter'] = { ref: `A7:L${itemCount + 7}` }
  for (let rowIndex = 7; rowIndex < itemCount + 7; rowIndex += 1) {
    const quantityCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 3 })]
    if (quantityCell?.t === 'n') quantityCell.z = '#,##0'
  }
}

export const buildInventarioColaboradoresWorkbook = (items = []) => {
  const grouped = new Map()

  items.forEach((item) => {
    const collaboratorId = normalizeText(item.colaboradorId) || '__sin_id__'
    const collaboratorName = normalizeText(item.colaboradorNombre) || 'Sin colaborador'
    const key = `${collaboratorId}__${collaboratorName}`

    if (!grouped.has(key)) {
      grouped.set(key, {
        colaboradorNombre: collaboratorName,
        codigoEmpleado: normalizeText(item.codigoEmpleado),
        rows: []
      })
    }

    grouped.get(key).rows.push(item)
  })

  const workbook = XLSX.utils.book_new()
  const usedNames = new Set()

  const sortedGroups = [...grouped.values()].sort((left, right) => {
    return left.colaboradorNombre.localeCompare(right.colaboradorNombre, 'es', { sensitivity: 'base' })
  })

  sortedGroups.forEach((group) => {
    const sheetName = uniqueSheetName(group.colaboradorNombre, usedNames)
    const orderedItems = [...group.rows].sort((left, right) => {
      return String(left.herramienta || '').localeCompare(String(right.herramienta || ''), 'es', { sensitivity: 'base' })
    })

    const worksheet = XLSX.utils.aoa_to_sheet(buildSheetRows(group.colaboradorNombre, group.codigoEmpleado, orderedItems))
    applyWorksheetLayout(worksheet, orderedItems.length)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  })

  if (!sortedGroups.length) {
    const worksheet = XLSX.utils.aoa_to_sheet(buildSheetRows('Sin colaborador', '', []))
    applyWorksheetLayout(worksheet, 0)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sin colaborador')
  }

  workbook.Props = {
    Title: 'Inventario de colaboradores',
    Subject: 'Herramientas asignadas por colaborador'
  }

  return workbook
}

export const parseInventarioColaboradoresWorkbook = (arrayBuffer) => {
  if (!arrayBuffer) {
    return []
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const records = []

  const parseSheet = (worksheet, sheetName) => {
    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false })
    if (!matrix.length) {
      return
    }

    const headerIndex = matrix.findIndex((row) => {
      const normalized = row.map((cell) => normalizeKey(cell))
      return normalized.includes('codigodebarras') || normalized.includes('herramienta') || normalized.includes('cantidad')
    })

    const metadata = {
      colaboradorNombre: '',
      codigoEmpleado: ''
    }

    if (headerIndex > 0) {
      for (const row of matrix.slice(0, headerIndex)) {
        const key = normalizeKey(row?.[0])
        const value = normalizeText(row?.[1])
        if (!value) continue

        if (key === 'colaborador') {
          metadata.colaboradorNombre = value
        }

        if (key === 'codigoempleado') {
          metadata.codigoEmpleado = value
        }
      }
    }

    const headerRow = headerIndex >= 0 ? matrix[headerIndex] : matrix[0]
    if (!headerRow) {
      return
    }

    const headerLabels = headerRow.map((cell) => normalizeText(cell))
    const dataStartIndex = headerIndex >= 0 ? headerIndex + 1 : 1

    matrix.slice(dataStartIndex).forEach((rowValues) => {
      const rowObject = {}
      headerLabels.forEach((label, index) => {
        if (label) {
          rowObject[label] = rowValues?.[index]
        }
      })

      const mapped = mapRow(rowObject)
      mapped.colaboradorNombre = mapped.colaboradorNombre || metadata.colaboradorNombre || normalizeText(sheetName)
      mapped.codigoEmpleado = mapped.codigoEmpleado || metadata.codigoEmpleado

      if (Object.values(mapped).some((value) => String(value || '').trim() !== '')) {
        records.push(mapped)
      }
    })
  }

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      return
    }
    parseSheet(worksheet, sheetName)
  })

  return records
}

export const stringifyInventarioColaboradoresWorkbook = (workbook, outputType = 'array') => {
  return XLSX.write(workbook, { bookType: 'xlsx', type: outputType })
}
