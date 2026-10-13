import { useEffect, useMemo, useRef, useState } from 'react'
import AccountLayout from '../../components/AccountLayout/AccountLayout'
import {
  getDashboardSummary,
  getProducts,
  getNotifications,
  getSalesReport,
} from '../../lib/productApi'
import {
  FiAlertCircle,
  FiArchive,
  FiBell,
  FiCheckCircle,
  FiDollarSign,
  FiPackage,
  FiPercent,
  FiRefreshCw,
  FiTrendingUp,
  FiDownload,
} from 'react-icons/fi'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'
import { createSalesReportPdf } from '../../lib/reportPdf'
import { dashboardPeriodApiParams, dashboardPeriodLabel, getDashboardPeriod, saveDashboardPeriod } from '../../lib/dashboardPeriod'
function money(value, currency, locale) {
  return `${Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || ''}`
}

function StatCard({ title, value, note, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-lg text-green-700">
          <Icon />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-400">{title}</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
          {note && (
            <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ ar, text }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
      {text || (ar ? 'لا توجد بيانات حالياً.' : 'No data available yet.')}
    </div>
  )
}

export default function SellerCenterModule({
  mode,
  language,
  currentUser,
  onToggleLanguage,
  onHome,
  onSettings,
  onOrders,
  onProducts,
  onAddProduct,
  onLogout,
}) {
  const ar = language === 'ar'
  const [page] = useState(1)
  const [pageSize] = useState(10)
  const locale = ar ? 'ar-EG' : 'en-US'
  const role = currentUser?.role || ''
  const permissions = currentUser?.permissions || {}
  const canExportReports =
    role === 'eldokan_owner' ||
    role === 'administrator' ||
    Boolean(permissions.exportReports)

  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const initialDashboardPeriod = useMemo(() => getDashboardPeriod(), [])
  const [report, setReport] = useState(null)
  const [reportPeriod, setReportPeriod] = useState(initialDashboardPeriod.period)
  const [reportFrom, setReportFrom] = useState(initialDashboardPeriod.from)
  const [reportTo, setReportTo] = useState(initialDashboardPeriod.to)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const reportRequestIdRef = useRef(0)
  const activeReportPeriodLabel = dashboardPeriodLabel(
    { period: reportPeriod, from: reportFrom, to: reportTo },
    ar
  )

  async function load() {
    setLoading(true)
    setError('')

    try {
      // Load only the dataset required by the active Seller Center section.
      // Previously every section fetched summary + up to 200 products + notifications.
      const needsSummary = ['finance', 'performance'].includes(mode)
      const needsProducts = ['inventory', 'promotions'].includes(mode)
      const needsNotifications = mode === 'notifications'

      const tasks = [
        needsSummary ? getDashboardSummary() : Promise.resolve(null),
        needsProducts ? getProducts() : Promise.resolve(null),
        needsNotifications ? getNotifications() : Promise.resolve(null),
      ]

      const [summaryResult, productResult, notificationResult] =
        await Promise.allSettled(tasks)

      if (summaryResult.status === 'fulfilled' && summaryResult.value) {
        setSummary(summaryResult.value || {})
      }

      if (productResult.status === 'fulfilled' && productResult.value) {
        setProducts(
          Array.isArray(productResult.value)
            ? productResult.value
            : []
        )
      }

      if (notificationResult.status === 'fulfilled' && notificationResult.value) {
        setNotifications(
          Array.isArray(notificationResult.value)
            ? notificationResult.value
            : Array.isArray(notificationResult.value?.notifications)
            ? notificationResult.value.notifications
            : []
        )
      }

      if (
        summaryResult.status === 'rejected' &&
        productResult.status === 'rejected' &&
        notificationResult.status === 'rejected'
      ) {
        throw summaryResult.reason
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : ar
          ? 'تعذر تحميل البيانات'
          : 'Could not load data'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadReport(nextPeriod = reportPeriod, nextFrom = reportFrom, nextTo = reportTo) {
    const requestId = ++reportRequestIdRef.current
    setReportLoading(true)
    setReportError('')
    setReport(null)
    try {
      let normalizedFrom = String(nextFrom || '').trim()
      let normalizedTo = String(nextTo || '').trim()

      if (nextPeriod === 'custom') {
        if (!normalizedFrom || !normalizedTo) {
          throw new Error(ar ? 'اختر تاريخ البداية والنهاية.' : 'Please select both From and To dates.')
        }

        if (normalizedFrom > normalizedTo) {
          ;[normalizedFrom, normalizedTo] = [normalizedTo, normalizedFrom]
          setReportFrom(normalizedFrom)
          setReportTo(normalizedTo)
        }
      }

      const saved = saveDashboardPeriod({
        period: nextPeriod,
        from: nextPeriod === 'custom' ? normalizedFrom : '',
        to: nextPeriod === 'custom' ? normalizedTo : '',
      })
      const params = dashboardPeriodApiParams(saved)
      setReportPeriod(saved.period)
      setReportFrom(saved.from)
      setReportTo(saved.to)

      const result = await getSalesReport(params)
      if (requestId !== reportRequestIdRef.current) return
      setReport(result || null)
    } catch (e) {
      if (requestId !== reportRequestIdRef.current) return
      setReportError(e instanceof Error ? e.message : (ar ? 'تعذر تحميل التقرير' : 'Could not load report'))
    } finally {
      if (requestId === reportRequestIdRef.current) {
        setReportLoading(false)
      }
    }
  }

  async function exportReportExcel() {
    if (!canExportReports) {
      setReportError(ar ? 'ليس لديك صلاحية تصدير التقارير.' : 'You do not have permission to export reports.')
      return
    }
    const rows = Array.isArray(report?.rows) ? report.rows : []
    if (!rows.length) return

    const summary = report?.summary || {}
    const daily = Array.isArray(report?.daily) ? report.daily : []
    const bestProducts = Array.isArray(report?.bestSellingProducts) ? report.bestSellingProducts : []

    // The spreadsheet library is large, so it is loaded only when exporting.
    let XLSX
    try {
      XLSX = await import('xlsx')
    } catch {
      setReportError(ar ? 'تعذر تحميل أداة التصدير. حاول مرة أخرى.' : 'Could not load the export tool. Please try again.')
      return
    }
    const wb = XLSX.utils.book_new()

    const summaryRows = [
      ['ElDokan Seller Sales Report'],
      ['From', report?.from || ''],
      ['To', report?.to || ''],
      [],
      ['Metric', 'Value'],
      ['Gross Sales', summary.grossSales ?? summary.gross ?? 0],
      ['Orders', summary.orders ?? 0],
      ['Sold Units', summary.units ?? summary.unitsSold ?? 0],
      ['Average Order Value', summary.averageOrderValue ?? summary.aov ?? 0],
      ['Discounts', summary.discounts ?? 0],
      ['Platform Commission', summary.commission ?? 0],
      ['Seller Net Proceeds', summary.net ?? summary.netEarnings ?? 0],
      ['Cancelled Orders', summary.cancelledOrders ?? summary.cancelled ?? 0],
      ['Refunded Orders', summary.refundedOrders ?? summary.refunded ?? 0],
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 24 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

    const orderRows = rows.map((r) => ({
      'Order': r.orderNumber ?? '',
      'Date': r.date ?? '',
      'Product': r.productName ?? '',
      'SKU': r.sku ?? '',
      'Qty': Number(r.quantity || 0),
      'Unit Price': Number(r.unitPrice || 0),
      'Subtotal': Number(r.subtotal || 0),
      'Discount': Number(r.discount || 0),
      'Gross': Number(r.gross || 0),
      'Commission Type': r.commissionType ?? '',
      'Commission Value': Number(r.commissionValue || 0),
      'Commission': Number(r.commission || 0),
      'Seller Net Proceeds': Number(r.net || 0),
      'Status': r.status ?? '',
      'Payment Method': r.paymentMethod ?? '',
    }))
    const wsOrders = XLSX.utils.json_to_sheet(orderRows)
    wsOrders['!cols'] = [
      {wch:14},{wch:20},{wch:34},{wch:18},{wch:10},{wch:14},{wch:14},
      {wch:14},{wch:14},{wch:18},{wch:18},{wch:14},{wch:14},{wch:16},{wch:24}
    ]
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders')

    const productMap = new Map()
    rows.forEach((r) => {
      const key = `${r.sku || ''}|${r.productName || ''}`
      const current = productMap.get(key) || {
        Product: r.productName || '',
        SKU: r.sku || '',
        'Units Sold': 0,
        'Gross Sales': 0,
        Discounts: 0,
        Commission: 0,
        'Seller Net Proceeds': 0,
      }
      current['Units Sold'] += Number(r.quantity || 0)
      current['Gross Sales'] += Number(r.gross || 0)
      current.Discounts += Number(r.discount || 0)
      current.Commission += Number(r.commission || 0)
      current['Seller Net Proceeds'] += Number(r.net || 0)
      productMap.set(key, current)
    })
    const wsProducts = XLSX.utils.json_to_sheet([...productMap.values()])
    wsProducts['!cols'] = [{wch:36},{wch:18},{wch:14},{wch:16},{wch:14},{wch:16},{wch:16}]
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products Sold')

    if (daily.length) {
      const wsDaily = XLSX.utils.json_to_sheet(daily)
      wsDaily['!cols'] = Object.keys(daily[0] || {}).map(() => ({wch:18}))
      XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Report')
    }

    if (bestProducts.length) {
      const wsBest = XLSX.utils.json_to_sheet(bestProducts)
      wsBest['!cols'] = Object.keys(bestProducts[0] || {}).map(() => ({wch:22}))
      XLSX.utils.book_append_sheet(wb, wsBest, 'Best Sellers')
    }

    const from = report?.from || 'start'
    const to = report?.to || 'end'
    const fileName = from === to
      ? `ElDokan-Sales-Report-${from}.xlsx`
      : `ElDokan-Sales-Report-${from}-${to}.xlsx`

    XLSX.writeFile(wb, fileName, { compression: true })
  }

  async function exportReportPdf() {
    try {
      setReportError('')
      if (!canExportReports) {
        throw new Error(ar ? 'ليس لديك صلاحية تصدير التقارير.' : 'You do not have permission to export reports.')
      }
      const params = dashboardPeriodApiParams({
        period: reportPeriod,
        from: reportFrom,
        to: reportTo,
      })
      const pdfReport = !report || report?.from !== params.from || report?.to !== params.to
        ? await getSalesReport(params)
        : report
      if (!pdfReport) throw new Error('Report data is not available')
      const blob = await createSalesReportPdf(pdfReport, language)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const pdfFrom = pdfReport?.from || reportFrom || 'from'
      const pdfTo = pdfReport?.to || reportTo || 'to'
      a.download = ar
        ? `تقرير-مبيعات-ElDokan-${pdfFrom}-${pdfTo}.pdf`
        : `ElDokan-Sales-Report-${pdfFrom}-${pdfTo}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setReportError(
        error instanceof Error && error.message
          ? error.message
          : ar
          ? 'تعذر إنشاء ملف PDF. حاول مرة أخرى.'
          : 'Could not generate the PDF. Please retry.'
      )
    }
  }


  useEffect(() => {
    if (mode === 'reports') {
      loadReport(reportPeriod, reportFrom, reportTo)
    }
  }, [mode])

  useEffect(() => {
    load()
  }, [mode])

  const today = new Date().toISOString().slice(0, 10)

  const inventory = useMemo(() => {
    const low = products.filter((product) => {
      const qty = Number(product.stockQuantity || 0)
      return qty > 0 && qty <= 5
    })
    const out = products.filter(
      (product) =>
        Number(product.stockQuantity || 0) <= 0 ||
        product.stockStatus === 'outofstock'
    )
    const units = products.reduce(
      (total, product) =>
        total + Math.max(0, Number(product.stockQuantity || 0)),
      0
    )
    return { low, out, units }
  }, [products])

  const promotions = useMemo(() => {
    const rows = products
      .filter(
        (product) =>
          String(product.salePrice || '').trim() !== ''
      )
      .map((product) => {
        const start = product.saleStartDate || ''
        const end = product.saleEndDate || ''
        let state = 'active'

        if (start && start > today) state = 'scheduled'
        if (end && end < today) state = 'ended'

        return { ...product, promotionState: state }
      })

    return {
      all: rows,
      active: rows.filter((item) => item.promotionState === 'active'),
      scheduled: rows.filter(
        (item) => item.promotionState === 'scheduled'
      ),
      ended: rows.filter((item) => item.promotionState === 'ended'),
    }
  }, [products, today])

  const config = {
    inventory: {
      title: ar ? 'المخزون' : 'Inventory',
      subtitle: ar
        ? 'تابع المخزون والمنتجات التي تحتاج إعادة تزويد.'
        : 'Monitor stock and products that need replenishment.',
    },
    promotions: {
      title: ar ? 'العروض والخصومات' : 'Promotions',
      subtitle: ar
        ? 'تابع الخصومات الحالية والمجدولة والمنتهية.'
        : 'Manage active, scheduled, and ended sale campaigns.',
    },
    finance: {
      title: ar ? 'المالية' : 'Finance',
      subtitle: ar
        ? 'ملخص المبيعات والمرتجعات. العمولات والتحويلات سيتم ربطها عند تحديد قواعد ElDokan المالية.'
        : 'Sales and returns summary. Commission and payouts will be connected after ElDokan finance rules are defined.',
    },
    performance: {
      title: ar ? 'الأداء' : 'Performance',
      subtitle: ar
        ? 'متابعة التزام الحساب بالتشغيل وسرعة التعامل مع الطلبات.'
        : 'Track operational compliance and seller response performance.',
    },
    reports: {
      title: ar ? 'التقارير' : 'Reports',
      subtitle: ar
        ? 'ملخص المبيعات والطلبات والمنتجات الأكثر مبيعًا.'
        : 'Sales, orders, and best-selling product reporting.',
    },
    notifications: {
      title: ar ? 'الإشعارات' : 'Notifications',
      subtitle: ar
        ? 'كل الرسائل والتنبيهات الخاصة بحساب البائع.'
        : 'All seller messages and account alerts in one place.',
    },
  }[mode]

  const counts = summary?.counts || {}
  const productPerformance = summary?.productPerformance || {}
  const sellerPerformance = summary?.sellerPerformance || {}

  const paginatedNotifications = useMemo(() => {
    const start = (page - 1) * pageSize
    return (notifications || []).slice(start, start + pageSize)
  }, [notifications, page, pageSize])


  function renderInventory() {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FiPackage} title={ar ? 'عدد المنتجات' : 'Products'} value={products.length} />
          <StatCard icon={FiArchive} title={ar ? 'وحدات المخزون' : 'Stock Units'} value={inventory.units.toLocaleString(locale)} />
          <StatCard icon={FiAlertCircle} title={ar ? 'مخزون منخفض' : 'Low Stock'} value={inventory.low.length} />
          <StatCard icon={FiAlertCircle} title={ar ? 'نفد المخزون' : 'Out of Stock'} value={inventory.out.length} />
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">{ar ? 'يحتاج انتباهك' : 'Needs Attention'}</h2>
          <div className="mt-4 space-y-2">
            {[...inventory.out, ...inventory.low].slice(0, 10).map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                <div>
                  <div className="font-black">{product.name}</div>
                  <div className="mt-1 text-xs text-slate-400">SKU: {product.sku || '—'}</div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-black ${
                  Number(product.stockQuantity || 0) <= 0
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {Number(product.stockQuantity || 0)}
                </div>
              </div>
            ))}
            {!inventory.low.length && !inventory.out.length && (
              <EmptyState ar={ar} text={ar ? 'المخزون بحالة جيدة.' : 'Stock levels look good.'} />
            )}
          </div>
        </div>
      </>
    )
  }

  function renderPromotions() {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={FiPercent} title={ar ? 'عروض فعالة' : 'Active'} value={promotions.active.length} />
          <StatCard icon={FiPercent} title={ar ? 'عروض مجدولة' : 'Scheduled'} value={promotions.scheduled.length} />
          <StatCard icon={FiPercent} title={ar ? 'عروض منتهية' : 'Ended'} value={promotions.ended.length} />
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black">{ar ? 'المنتجات المخفضة' : 'Sale Products'}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {promotions.all.map((product) => (
              <div key={product.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_130px_130px_130px] md:items-center">
                <div>
                  <div className="font-black">{product.name}</div>
                  <div className="mt-1 text-xs text-slate-400">SKU: {product.sku || '—'}</div>
                </div>
                <div className="text-sm"><span className="text-slate-400">{ar ? 'السعر:' : 'Price:'}</span> {product.regularPrice}</div>
                <div className="text-sm font-black text-green-700">{product.salePrice}</div>
                <div className="text-xs text-slate-500">
                  {product.saleStartDate || '—'} → {product.saleEndDate || '—'}
                </div>
              </div>
            ))}
            {!promotions.all.length && <div className="p-5"><EmptyState ar={ar} /></div>}
          </div>
        </div>
      </>
    )
  }

  function renderFinance() {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FiDollarSign} title={ar ? 'صافي المبيعات' : 'Gross Sales'} value={money(summary?.totalRevenue, summary?.currency, locale)} />
          <StatCard icon={FiDollarSign} title={ar ? 'مبيعات اليوم' : 'Sales Today'} value={money(summary?.salesToday, summary?.currency, locale)} />
          <StatCard icon={FiPackage} title={ar ? 'قطع مباعة' : 'Sold Units'} value={Number(summary?.totalSoldUnits || 0).toLocaleString(locale)} />
          <StatCard icon={FiPackage} title={ar ? 'قطع مرتجعة' : 'Returned Units'} value={Number(productPerformance.returnedUnits || 0).toLocaleString(locale)} />
        </div>

        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-7">
          <h2 className="text-xl font-black">{ar ? 'التسويات والتحويلات' : 'Settlements & Payouts'}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            {ar
              ? 'لم نضع أرقام عمولة أو مستحقات غير حقيقية. بعد تحديد نسبة عمولة ElDokan ودورة التحويل سنضيف: العمولة، صافي المستحقات، المبالغ قيد التحويل، وسجل الدفعات.'
              : 'No artificial commission or payout values are shown. Once ElDokan commission and payout cycles are defined, this section will show fees, net earnings, pending payouts, and payout history.'}
          </p>
        </div>
      </>
    )
  }

  function renderPerformance() {
    const rejected = Number(sellerPerformance.rejectedOrders || counts.rejected || 0)
    const over48 =
      Number(sellerPerformance.responseOver48h || 0) +
      Number(sellerPerformance.unansweredOver48h || 0)
    const late =
      Number(sellerPerformance.lateHandovers || 0) +
      Number(counts.fulfillmentOverdue || 0)

    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={rejected >= 3 ? FiAlertCircle : FiCheckCircle}
          title={ar ? 'الإلغاء والرفض' : 'Cancellations & Rejections'}
          value={rejected}
          note={ar ? '3 طلبات أو أكثر = تنبيه' : '3 or more orders triggers an alert'}
        />
        <StatCard
          icon={over48 ? FiAlertCircle : FiCheckCircle}
          title={ar ? 'تجاوز مهلة الرد' : 'Response Deadline'}
          value={over48}
          note={ar ? 'الحد الأقصى للرد: 48 ساعة' : 'Maximum response time: 48 hours'}
        />
        <StatCard
          icon={late ? FiAlertCircle : FiCheckCircle}
          title={ar ? 'التأخير مع ElDokan' : 'ElDokan Handover Delays'}
          value={late}
          note={ar ? 'تأخير التجهيز أو التسليم للدكان' : 'Late preparation or handover cases'}
        />
      </div>
    )
  }

  function renderReports() {
    const rs = report?.summary || {}
    const daily = Array.isArray(report?.daily) ? report.daily : []
    const reportRows = Array.isArray(report?.rows) ? report.rows : []
    const reportBest = Array.isArray(report?.bestSellingProducts) ? report.bestSellingProducts : []
    const currency = report?.currency || summary?.currency || 'EGP'

    const periodButton = (key, arLabel, enLabel) => (
      <button
        key={key}
        type="button"
        onClick={() => {
          setReportPeriod(key)
          if (key !== 'custom') loadReport(key, reportFrom, reportTo)
        }}
        className={`rounded-xl border px-4 py-2 text-sm font-black transition ${reportPeriod === key ? 'border-black bg-black text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
      >
        {ar ? arLabel : enLabel}
      </button>
    )

    return (
      <>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">{ar ? 'تقرير المبيعات' : 'Sales Report'}</h2>
              <p className="mt-1 text-sm text-slate-500">{ar ? 'تفاصيل فعلية من طلبات شركتك فقط.' : 'Live reporting from your company orders only.'}</p>
              <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{activeReportPeriodLabel}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportReportPdf} disabled={!canExportReports || !reportRows.length} title={!canExportReports ? (ar ? 'لا توجد صلاحية تصدير' : 'Export permission required') : undefined} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-40">
                <FiDownload /> {ar ? 'تصدير PDF' : 'Export PDF'}
              </button>
              <button type="button" onClick={exportReportExcel} disabled={!canExportReports || !reportRows.length} title={!canExportReports ? (ar ? 'لا توجد صلاحية تصدير' : 'Export permission required') : undefined} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
                <FiDownload /> {ar ? 'تصدير Excel' : 'Export Excel'}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {periodButton('today','اليوم','Today')}
            {periodButton('7d','آخر 7 أيام','Last 7 Days')}
            {periodButton('30d','آخر 30 يوم','Last 30 Days')}
            {periodButton('month','هذا الشهر','This Month')}
            {periodButton('last-month','الشهر السابق','Last Month')}
            {periodButton('custom','فترة مخصصة','Custom')}
          </div>

          {reportPeriod === 'custom' && (
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="grid gap-1 text-sm font-bold text-slate-600"><span>{ar ? 'من' : 'From'}</span><input type="date" value={reportFrom} max={reportTo || undefined} onChange={(e)=>setReportFrom(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-600"><span>{ar ? 'إلى' : 'To'}</span><input type="date" value={reportTo} min={reportFrom || undefined} onChange={(e)=>setReportTo(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" /></label>
              <button type="button" onClick={()=>loadReport('custom',reportFrom,reportTo)} disabled={!reportFrom || !reportTo} className="rounded-xl bg-green-700 px-5 py-2.5 font-black text-white disabled:opacity-40">{ar ? 'عرض التقرير' : 'Run Report'}</button>
            </div>
          )}
        </div>

        {reportError && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <span>{reportError}</span>
            <button
              type="button"
              onClick={() => loadReport(reportPeriod, reportFrom, reportTo)}
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700"
            >
              {ar ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}
        {reportLoading && <div className="mt-4 rounded-2xl bg-white p-6 text-center font-bold text-slate-400">{ar ? 'جاري تحميل التقرير...' : 'Loading report...'}</div>}

        {!reportLoading && report && (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={FiDollarSign} title={ar ? 'صافي المبيعات' : 'Net Sales'} value={money(rs.netSales ?? rs.grossSales, currency, locale)} />
              <StatCard icon={FiTrendingUp} title={ar ? 'عدد الطلبات' : 'Orders'} value={Number(rs.orders || 0).toLocaleString(locale)} />
              <StatCard icon={FiPackage} title={ar ? 'القطع المباعة' : 'Sold Units'} value={Number(rs.units || 0).toLocaleString(locale)} />
              <StatCard icon={FiDollarSign} title={ar ? 'متوسط قيمة الطلب (AOV)' : 'Average Order Value (AOV)'} value={money(rs.averageOrderValue, currency, locale)} />
              <StatCard icon={FiPercent} title={ar ? 'الخصومات' : 'Discounts'} value={money(rs.discounts, currency, locale)} />
              <StatCard icon={FiPercent} title={ar ? 'عمولة المنصة' : 'Platform Commission'} value={money(rs.commission, currency, locale)} />
              <StatCard icon={FiDollarSign} title={ar ? 'صافي مستحقات البائع' : 'Seller Net Proceeds'} value={money(rs.netEarnings, currency, locale)} />
              <StatCard icon={FiAlertCircle} title={ar ? 'إلغاء / استرداد' : 'Cancelled / Refunded'} value={`${Number(rs.cancelledOrders || 0)} / ${Number(rs.refundedOrders || 0)}`} />
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">{ar ? 'المبيعات اليومية' : 'Daily Sales'}</h2>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#111827" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="net" stroke="#16a34a" strokeWidth={2} dot={false}/></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">{ar ? 'الطلبات يوميًا' : 'Daily Orders'}</h2>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="orders" fill="#111827" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">{ar ? 'المنتجات الأكثر مبيعًا' : 'Best Selling Products'}</h2>
              <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-slate-400"><th className="p-3 text-start">#</th><th className="p-3 text-start">{ar?'المنتج':'Product'}</th><th className="p-3 text-start">SKU</th><th className="p-3 text-start">{ar?'القطع':'Units'}</th><th className="p-3 text-start">{ar?'صافي المبيعات':'Net Sales'}</th><th className="p-3 text-start">{ar?'عمولة المنصة':'Platform Commission'}</th><th className="p-3 text-start">{ar?'صافي مستحقات البائع':'Seller Net Proceeds'}</th></tr></thead><tbody>{reportBest.slice(0,10).map((p,i)=><tr key={p.id} className="border-b border-slate-100"><td className="p-3 font-black">{i+1}</td><td className="p-3 font-black">{p.name}</td><td className="p-3">{p.sku||'—'}</td><td className="p-3">{p.unitsSold}</td><td className="p-3">{money(p.sales,p.currency||currency,locale)}</td><td className="p-3">{money(p.commission,p.currency||currency,locale)}</td><td className="p-3 font-black text-green-700">{money(p.net,p.currency||currency,locale)}</td></tr>)}</tbody></table>{!reportBest.length && <EmptyState ar={ar}/>}</div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-black">{ar ? 'تفاصيل كل عملية بيع' : 'Sales Transactions'}</h2><p className="mt-1 text-sm text-slate-500">{report?.from} → {report?.to}</p></div>
              <div className="overflow-x-auto"><table className="min-w-[1250px] w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-start">Order</th><th className="p-3 text-start">{ar?'التاريخ':'Date'}</th><th className="p-3 text-start">{ar?'المنتج':'Product'}</th><th className="p-3 text-start">SKU</th><th className="p-3 text-start">Qty</th><th className="p-3 text-start">{ar?'السعر':'Price'}</th><th className="p-3 text-start">{ar?'الخصم':'Discount'}</th><th className="p-3 text-start">{ar?'قيمة بند الطلب':'Order Line Value'}</th><th className="p-3 text-start">{ar?'عمولة المنصة':'Platform Commission'}</th><th className="p-3 text-start">{ar?'صافي مستحقات البائع':'Seller Net Proceeds'}</th><th className="p-3 text-start">{ar?'الحالة':'Status'}</th><th className="p-3 text-start">{ar?'الدفع':'Payment'}</th></tr></thead><tbody>{reportRows.map((r)=><tr key={`${r.orderId}-${r.productId}-${r.sku}`} className="border-t border-slate-100"><td className="p-3 font-black">#{r.orderNumber}</td><td className="p-3">{new Date(r.date).toLocaleString(locale)}</td><td className="p-3 font-bold">{r.productName}</td><td className="p-3">{r.sku||'—'}</td><td className="p-3">{r.quantity}</td><td className="p-3">{money(r.unitPrice,currency,locale)}</td><td className="p-3">{money(r.discount,currency,locale)}</td><td className="p-3 font-bold">{money(r.gross,currency,locale)}</td><td className="p-3"><div className="font-bold">{money(r.commission,currency,locale)}</div><div className="text-xs text-slate-400">{r.commissionType==='percentage'?`${r.commissionValue}%`:r.commissionType==='fixed'?`${r.commissionValue} ${currency}`:'—'}</div></td><td className="p-3 font-black text-green-700">{money(r.net,currency,locale)}</td><td className="p-3">{r.status}</td><td className="p-3">{r.paymentMethod||'—'}</td></tr>)}</tbody></table>{!reportRows.length && <div className="p-5"><EmptyState ar={ar}/></div>}</div>
            </div>
          </>
        )}
      </>
    )
  }

  function renderNotifications() {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-black">{ar ? 'كل الإشعارات' : 'All Notifications'}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {paginatedNotifications.map((item) => (
            <div key={item.id} className="flex gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <FiBell />
              </div>
              <div>
                <div className="font-black">{item.title || (ar ? 'إشعار' : 'Notification')}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{item.message}</div>
                {item.createdAt && (
                  <div className="mt-2 text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleString(locale)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!notifications.length && <div className="p-5"><EmptyState ar={ar} /></div>}
        </div>
      </div>
    )
  }

  const content = {
    inventory: renderInventory,
    promotions: renderPromotions,
    finance: renderFinance,
    performance: renderPerformance,
    reports: renderReports,
    notifications: renderNotifications,
  }[mode]

  return (
    <AccountLayout
      language={language}
      role={role}
      permissions={permissions}
      active={mode}
      onHome={onHome}
      onSettings={onSettings}
      onOrders={onOrders}
      onProducts={onProducts}
      onAddProduct={onAddProduct}
      onLogout={onLogout}
    >
      <div dir={ar ? 'rtl' : 'ltr'} className="eldokan-page min-h-screen bg-[#f8faf9] px-5 py-6 sm:px-7">
        <div className="mx-auto max-w-[1380px]">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-green-700">Seller Center</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {config.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {config.subtitle}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onToggleLanguage}
                className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold shadow-sm"
              >
                {ar ? 'English' : 'العربية'}
              </button>
              <button
                type="button"
                onClick={load}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <FiRefreshCw />
              </button>
            </div>
          </header>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-20 text-center text-sm font-bold text-slate-400 shadow-sm">
              {ar ? 'جاري تحميل البيانات...' : 'Loading seller data...'}
            </div>
          ) : (
            content()
          )}
        </div>
      </div>
    </AccountLayout>
  )
}
