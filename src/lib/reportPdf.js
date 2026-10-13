
function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function formatReportDate(dateValue, locale) {
  if (!dateValue) return ''
  const parsed = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return String(dateValue)
  return parsed.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}


function formatTableDate(dateValue) {
  if (!dateValue) return ''
  const value = String(dateValue).trim()

  // API rows may return full ISO timestamps (for example
  // 2024-05-22T20:37:22+00:00). The PDF table only needs the calendar date.
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`
}

function fmtMoney(value, currency, locale) {
  return `${Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || ''}`.trim()
}

function canvasToJpegBytes(canvas, quality = 0.94) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Could not render PDF page'))
        return
      }
      resolve(new Uint8Array(await blob.arrayBuffer()))
    }, 'image/jpeg', quality)
  })
}

function wrapText(ctx, text, maxWidth) {
  const value = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!value) return ['']
  const words = value.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function createPage(isArabic) {
  const canvas = document.createElement('canvas')
  canvas.width = 1240
  canvas.height = 1754
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.textBaseline = 'alphabetic'
  ctx.direction = isArabic ? 'rtl' : 'ltr'
  return { canvas, ctx }
}

function setFont(ctx, size, bold = false) {
  ctx.font = `${bold ? '700' : '400'} ${size}px Arial, Tahoma, "Noto Sans Arabic", sans-serif`
}

function drawText(ctx, text, x, y, { size = 28, bold = false, color = '#111827', align = 'left', direction = 'ltr' } = {}) {
  setFont(ctx, size, bold)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.direction = direction
  ctx.fillText(String(text ?? ''), x, y)
}

function roundedRect(ctx, x, y, width, height, radius = 18, fill = '#fff', stroke = '#e2e8f0') {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

function drawHeader(ctx, labels, report, isArabic, locale, pageNumber, totalPages, logoImage) {
  const direction = isArabic ? 'rtl' : 'ltr'
  const align = isArabic ? 'right' : 'left'

  // Clean white header so the existing black ElDokan logo is rendered correctly.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1240, 260)

  // Existing project logo: /public/eldokan-logo.png
  if (logoImage) {
    const maxW = 170
    const maxH = 100
    const ratio = Math.min(maxW / logoImage.width, maxH / logoImage.height)
    const logoW = logoImage.width * ratio
    const logoH = logoImage.height * ratio
    const logoX = isArabic ? 1240 - 80 - logoW : 80
    const logoY = 36
    ctx.drawImage(logoImage, logoX, logoY, logoW, logoH)
  } else {
    drawText(ctx, labels.brand, isArabic ? 1160 : 80, 88, {
      size: 28,
      bold: true,
      color: '#0f172a',
      align,
      direction,
    })
  }

  const titleX = isArabic ? 1160 : 80
  drawText(ctx, labels.title, titleX, 170, {
    size: 34,
    bold: true,
    color: '#0f172a',
    align,
    direction,
  })

  // Show only the selected report date/range. No generated timestamp and no colored date block.
  const fromDate = formatReportDate(report?.from, locale)
  const toDate = formatReportDate(report?.to, locale)
  const dateText = fromDate && toDate && fromDate !== toDate
    ? `${fromDate} — ${toDate}`
    : (fromDate || toDate)

  if (dateText) {
    drawText(ctx, dateText, titleX, 214, {
      size: 20,
      bold: false,
      color: '#64748b',
      align,
      direction: 'ltr',
    })
  }

  drawText(ctx, `${labels.page} ${pageNumber}${totalPages ? ` / ${totalPages}` : ''}`, isArabic ? 80 : 1160, 214, {
    size: 16,
    color: '#94a3b8',
    align: isArabic ? 'left' : 'right',
    direction,
  })

  ctx.fillStyle = '#10b981'
  ctx.fillRect(70, 244, 1100, 4)
}

function drawFooter(ctx, labels, pageNumber, isArabic) {
  const direction = isArabic ? 'rtl' : 'ltr'
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(70, 1686)
  ctx.lineTo(1170, 1686)
  ctx.stroke()
  drawText(ctx, labels.footer, isArabic ? 1160 : 80, 1720, {
    size: 15,
    color: '#94a3b8',
    align: isArabic ? 'right' : 'left',
    direction,
  })
  drawText(ctx, `${pageNumber}`, isArabic ? 80 : 1160, 1720, {
    size: 15,
    color: '#94a3b8',
    align: isArabic ? 'left' : 'right',
    direction: 'ltr',
  })
}

function drawMetricCard(ctx, label, value, x, y, width, isArabic, accent = false) {
  roundedRect(ctx, x, y, width, 112, 18, accent ? '#ecfdf5' : '#f8fafc', accent ? '#a7f3d0' : '#e2e8f0')
  const direction = isArabic ? 'rtl' : 'ltr'
  const align = isArabic ? 'right' : 'left'
  const tx = isArabic ? x + width - 22 : x + 22
  drawText(ctx, label, tx, y + 38, { size: 18, bold: true, color: '#64748b', align, direction })
  drawText(ctx, value, tx, y + 82, { size: 27, bold: true, color: accent ? '#047857' : '#0f172a', align, direction })
}

function drawSectionTitle(ctx, title, y, isArabic) {
  const direction = isArabic ? 'rtl' : 'ltr'
  const align = isArabic ? 'right' : 'left'
  const x = isArabic ? 1160 : 80
  drawText(ctx, title, x, y, { size: 27, bold: true, color: '#0f172a', align, direction })
  ctx.fillStyle = '#10b981'
  ctx.fillRect(isArabic ? 1110 : 80, y + 14, 50, 4)
}

function drawTableHeader(ctx, columns, y, isArabic) {
  const ordered = isArabic ? [...columns].reverse() : columns
  let x = 70
  ordered.forEach((col) => {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y, col.width, 58)
    const align = isArabic ? 'right' : 'left'
    const tx = isArabic ? x + col.width - 10 : x + 10
    drawText(ctx, col.label, tx, y + 37, {
      size: 16,
      bold: true,
      color: '#ffffff',
      align,
      direction: isArabic ? 'rtl' : 'ltr',
    })
    x += col.width
  })
  return y + 58
}

function drawTableRow(ctx, columns, row, y, isArabic, rowIndex) {
  const ordered = isArabic ? [...columns].reverse() : columns
  setFont(ctx, 14, false)
  const lineHeight = 21
  const wrapped = ordered.map((col) => wrapText(ctx, row[col.key] ?? '', col.width - 20))
  const maxLines = Math.max(1, ...wrapped.map((lines) => Math.min(lines.length, 3)))
  const height = Math.max(52, 18 + maxLines * lineHeight)
  let x = 70
  const rowFill = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
  ordered.forEach((col, idx) => {
    ctx.fillStyle = rowFill
    ctx.fillRect(x, y, col.width, height)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, col.width, height)
    const lines = wrapped[idx].slice(0, 3)
    const align = isArabic ? 'right' : 'left'
    const tx = isArabic ? x + col.width - 10 : x + 10
    lines.forEach((line, lineIdx) => {
      drawText(ctx, line, tx, y + 29 + lineIdx * lineHeight, {
        size: 14,
        color: '#1e293b',
        align,
        direction: isArabic ? 'rtl' : 'ltr',
      })
    })
    x += col.width
  })
  return height
}

function buildPdfFromJpegs(images) {
  const encoder = new TextEncoder()
  const parts = []
  const offsets = []
  let length = 0
  const pushAscii = (text) => { const bytes = encoder.encode(text); parts.push(bytes); length += bytes.length }
  const pushBytes = (bytes) => { parts.push(bytes); length += bytes.length }
  const beginObj = (id) => { offsets[id] = length; pushAscii(`${id} 0 obj\n`) }
  const endObj = () => pushAscii('endobj\n')
  pushAscii('%PDF-1.4\n')
  const pageRefs = []
  const objectInfo = []
  let nextId = 3
  images.forEach((image, index) => {
    const imageId = nextId++
    const contentId = nextId++
    const pageId = nextId++
    pageRefs.push(pageId)
    objectInfo.push({ ...image, imageId, contentId, pageId, name: `Im${index + 1}` })
  })
  beginObj(1); pushAscii('<< /Type /Catalog /Pages 2 0 R >>\n'); endObj()
  beginObj(2); pushAscii(`<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageRefs.length} >>\n`); endObj()
  for (const info of objectInfo) {
    beginObj(info.imageId)
    pushAscii(`<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${info.bytes.length} >>\nstream\n`)
    pushBytes(info.bytes); pushAscii('\nendstream\n'); endObj()
    const content = `q\n595.28 0 0 841.89 0 0 cm\n/${info.name} Do\nQ\n`
    beginObj(info.contentId); pushAscii(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\n`); endObj()
    beginObj(info.pageId); pushAscii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /${info.name} ${info.imageId} 0 R >> >> /Contents ${info.contentId} 0 R >>\n`); endObj()
  }
  const xrefOffset = length
  const maxId = nextId - 1
  pushAscii(`xref\n0 ${maxId + 1}\n`); pushAscii('0000000000 65535 f \n')
  for (let id = 1; id <= maxId; id += 1) pushAscii(`${String(offsets[id] || 0).padStart(10, '0')} 00000 n \n`)
  pushAscii(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)
  return new Blob(parts, { type: 'application/pdf' })
}

export async function createSalesReportPdf(report, language = 'en') {
  const isArabic = language === 'ar'
  const locale = isArabic ? 'ar-EG' : 'en-US'
  const currency = report?.currency || 'EGP'
  const summary = report?.summary || {}
  const rows = Array.isArray(report?.rows) ? report.rows : []

  const labels = isArabic ? {
    brand: 'ElDokan', title: 'تقرير مبيعات التاجر', period: 'الفترة', generated: 'تاريخ الإنشاء', page: 'صفحة',
    financial: 'الملخص المالي', details: 'تفاصيل المبيعات', gross: 'إجمالي قيمة الطلبات (GOV)', orders: 'عدد الطلبات', units: 'الوحدات المباعة',
    aov: 'متوسط قيمة الطلب', discounts: 'الخصومات', commission: 'عمولة المنصة', sellerNet: 'صافي مستحقات البائع',
    cancelled: 'الطلبات الملغاة', refunded: 'الطلبات المستردة', order: 'الطلب', date: 'التاريخ', product: 'المنتج', qty: 'الكمية',
    netSales: 'صافي المبيعات', fee: 'عمولة المنصة', net: 'صافي مستحقات البائع', status: 'الحالة',
    footer: 'تقرير مالي صادر من منصة ElDokan — للاستخدام المحاسبي والمراجعة', noRows: 'لا توجد مبيعات خلال الفترة المحددة',
  } : {
    brand: 'ElDokan', title: 'Seller Sales Report', period: 'Period', generated: 'Generated', page: 'Page', financial: 'Financial Summary',
    details: 'Sales Details', gross: 'Gross Order Value (GOV)', orders: 'Orders', units: 'Units Sold', aov: 'Average Order Value', discounts: 'Discounts',
    commission: 'Platform Commission', sellerNet: 'Seller Net Proceeds', cancelled: 'Cancelled Orders', refunded: 'Refunded Orders',
    order: 'Order', date: 'Date', product: 'Product', qty: 'Qty', netSales: 'Net Sales', fee: 'Platform Commission', net: 'Seller Net Proceeds', status: 'Status',
    footer: 'Financial report generated by ElDokan — for accounting and reconciliation use', noRows: 'No sales were found for the selected period',
  }

  const metrics = [
    [labels.gross, fmtMoney(summary.grossSales ?? summary.gross ?? 0, currency, locale), true],
    [labels.sellerNet, fmtMoney(summary.net ?? summary.netEarnings ?? 0, currency, locale), true],
    [labels.commission, fmtMoney(summary.commission ?? 0, currency, locale), false],
    [labels.discounts, fmtMoney(summary.discounts ?? 0, currency, locale), false],
    [labels.orders, Number(summary.orders ?? 0).toLocaleString(locale), false],
    [labels.units, Number(summary.units ?? summary.unitsSold ?? 0).toLocaleString(locale), false],
    [labels.aov, fmtMoney(summary.averageOrderValue ?? summary.aov ?? 0, currency, locale), false],
    [labels.cancelled, Number(summary.cancelledOrders ?? summary.cancelled ?? 0).toLocaleString(locale), false],
  ]

  const columns = [
    { key: 'order', label: labels.order, width: 100 },
    { key: 'date', label: labels.date, width: 115 },
    { key: 'product', label: labels.product, width: 300 },
    { key: 'qty', label: labels.qty, width: 70 },
    { key: 'sales', label: labels.netSales, width: 140 },
    { key: 'fee', label: labels.fee, width: 115 },
    { key: 'net', label: labels.net, width: 140 },
    { key: 'status', label: labels.status, width: 120 },
  ]

  const logoImage = await loadImage('/eldokan-logo.png')

  const normalizedRows = rows.map((row) => ({
    order: row.orderNumber ?? '', date: formatTableDate(row.date), product: row.productName ?? '', qty: Number(row.quantity || 0).toLocaleString(locale),
    sales: fmtMoney(row.gross ?? row.netSales ?? 0, currency, locale), fee: fmtMoney(row.commission ?? 0, currency, locale),
    net: fmtMoney(row.net ?? 0, currency, locale), status: row.status ?? '',
  }))

  // Build pages first so total page count is known before drawing headers/footers.
  const pageRows = []
  let current = []
  let usedHeight = 0
  const contentLimit = 1180
  const estimator = createPage(isArabic).ctx
  setFont(estimator, 14, false)
  normalizedRows.forEach((row) => {
    const ordered = isArabic ? [...columns].reverse() : columns
    const lineCount = Math.max(...ordered.map((col) => Math.min(3, wrapText(estimator, row[col.key], col.width - 20).length)))
    const h = Math.max(52, 18 + lineCount * 21)
    if (current.length && usedHeight + h > contentLimit) {
      pageRows.push(current)
      current = []
      usedHeight = 0
    }
    current.push(row)
    usedHeight += h
  })
  if (current.length || !normalizedRows.length) pageRows.push(current)

  const totalPages = 1 + pageRows.length
  const canvases = []

  // Summary page.
  const first = createPage(isArabic)
  drawHeader(first.ctx, labels, report, isArabic, locale, 1, totalPages, logoImage)
  drawSectionTitle(first.ctx, labels.financial, 310, isArabic)
  const cardW = 530
  const gap = 40
  const leftX = 70
  const rightX = leftX + cardW + gap
  let cardY = 355
  metrics.forEach(([label, value, accent], idx) => {
    const x = idx % 2 === 0 ? leftX : rightX
    const rowIndex = Math.floor(idx / 2)
    drawMetricCard(first.ctx, label, value, x, cardY + rowIndex * 135, cardW, isArabic, accent)
  })

  roundedRect(first.ctx, 70, 930, 1100, 170, 20, '#f8fafc', '#e2e8f0')
  const dir = isArabic ? 'rtl' : 'ltr'
  const align = isArabic ? 'right' : 'left'
  const tx = isArabic ? 1135 : 105
  drawText(first.ctx, labels.details, tx, 980, { size: 25, bold: true, color: '#0f172a', align, direction: dir })
  drawText(first.ctx, `${labels.orders}: ${Number(summary.orders ?? 0).toLocaleString(locale)}`, tx, 1025, { size: 20, color: '#475569', align, direction: dir })
  drawText(first.ctx, `${labels.refunded}: ${Number(summary.refundedOrders ?? summary.refunded ?? 0).toLocaleString(locale)}`, tx, 1065, { size: 20, color: '#475569', align, direction: dir })
  drawFooter(first.ctx, labels, 1, isArabic)
  canvases.push(first.canvas)

  pageRows.forEach((rowsForPage, pageIdx) => {
    const pageNo = pageIdx + 2
    const page = createPage(isArabic)
    drawHeader(page.ctx, labels, report, isArabic, locale, pageNo, totalPages, logoImage)
    drawSectionTitle(page.ctx, labels.details, 300, isArabic)
    let y = 335
    if (!rowsForPage.length) {
      roundedRect(page.ctx, 70, y + 20, 1100, 120, 18, '#f8fafc', '#e2e8f0')
      drawText(page.ctx, labels.noRows, isArabic ? 1140 : 100, y + 92, {
        size: 23, color: '#64748b', align: isArabic ? 'right' : 'left', direction: dir,
      })
    } else {
      y = drawTableHeader(page.ctx, columns, y, isArabic)
      rowsForPage.forEach((row, rowIdx) => {
        y += drawTableRow(page.ctx, columns, row, y, isArabic, rowIdx)
      })
    }
    drawFooter(page.ctx, labels, pageNo, isArabic)
    canvases.push(page.canvas)
  })

  const images = []
  for (const canvas of canvases) {
    images.push({ width: canvas.width, height: canvas.height, bytes: await canvasToJpegBytes(canvas) })
  }
  return buildPdfFromJpegs(images)
}
