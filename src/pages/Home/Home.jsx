import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import AccountLayout from '../../components/AccountLayout/AccountLayout'
import { getDashboardSummary, getOrders, getSalesReport } from '../../lib/productApi'
import { dashboardPeriodApiParams, dashboardPeriodLabel, getDashboardPeriod, saveDashboardPeriod } from '../../lib/dashboardPeriod'
import {
  FiAlertCircle,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiPackage,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
} from 'react-icons/fi'

function money(value, currency, locale) {
  return `${Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || ''}`
}

function KpiCard({
  icon: Icon,
  title,
  value,
  note,
  tone = 'green',
}) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    red: 'bg-red-50 text-red-700 border-red-100',
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xl ${tones[tone]}`}>
          <Icon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-500">
            {title}
          </div>
          <div className="mt-2 truncate text-3xl font-black tracking-tight text-slate-950">
            {value}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-400">
            {note}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionItem({
  icon: Icon,
  title,
  text,
  count,
  danger,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-start transition hover:-translate-y-0.5 hover:shadow-sm ${
        danger
          ? 'border-red-200 bg-red-50/70'
          : 'border-slate-200 bg-white hover:border-green-200'
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          danger
            ? 'bg-red-100 text-red-600'
            : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        <Icon />
      </div>

      <div className="min-w-0 flex-1">
        <div className={`font-black ${danger ? 'text-red-800' : 'text-slate-900'}`}>
          {title}
        </div>
        <div className="mt-1 text-xs leading-5 text-slate-500">
          {text}
        </div>
      </div>

      <div
        className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-black ${
          danger
            ? 'bg-red-600 text-white'
            : 'bg-black text-white'
        }`}
      >
        {count}
      </div>
    </button>
  )
}


function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

function normalizeOrderStatus(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/^wc-/, '')

  const aliases = {
    pending: 'processing',
    'new-order': 'processing',
    preparing: 'accepted',
    completed: 'delivered',
    'received-seller': 'received-from-seller',
    'received-from-sel': 'received-from-seller',
    'delivery_failed': 'delivery-failed',
  }

  return aliases[raw] || raw
}

export default function Home({
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
  const locale = ar ? 'ar-EG' : 'en-US'
  const role = currentUser?.role || ''
  const permissions = currentUser?.permissions || {}

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const initialDashboardPeriod = useMemo(() => getDashboardPeriod(), [])
  const [profitPeriod, setProfitPeriod] = useState(initialDashboardPeriod.period)
  const [profitFrom, setProfitFrom] = useState(initialDashboardPeriod.from)
  const [profitTo, setProfitTo] = useState(initialDashboardPeriod.to)
  const [profitData, setProfitData] = useState(null)
  const [profitLoading, setProfitLoading] = useState(false)
  const [, setProfitError] = useState('')
  const [periodOrdersData, setPeriodOrdersData] = useState(null)
  const [periodOrdersError, setPeriodOrdersError] = useState('')
  const profitRequestIdRef = useRef(0)

  async function load() {
    setLoading(true)
    setError('')

    try {
      setData(await getDashboardSummary())
    } catch (e) {
      setError(
        e?.message ||
          (ar
            ? 'تعذر تحميل لوحة التحكم'
            : 'Could not load dashboard')
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [refreshKey])

  async function loadProfitReport(nextPeriod = profitPeriod, nextFrom = profitFrom, nextTo = profitTo) {
    const requestId = ++profitRequestIdRef.current
    setProfitLoading(true)
    setProfitError('')
    setPeriodOrdersError('')
    setProfitData(null)
    setPeriodOrdersData(null)

    try {
      let normalizedFrom = String(nextFrom || '').trim()
      let normalizedTo = String(nextTo || '').trim()

      if (nextPeriod === 'custom') {
        if (!normalizedFrom || !normalizedTo) {
          throw new Error(
            ar
              ? 'اختر تاريخ البداية والنهاية.'
              : 'Please select both start and end dates.'
          )
        }

        if (normalizedFrom > normalizedTo) {
          ;[normalizedFrom, normalizedTo] = [normalizedTo, normalizedFrom]
          setProfitFrom(normalizedFrom)
          setProfitTo(normalizedTo)
        }
      }

      const normalizedPeriod = saveDashboardPeriod({
        period: nextPeriod,
        from: nextPeriod === 'custom' ? normalizedFrom : '',
        to: nextPeriod === 'custom' ? normalizedTo : '',
      })
      const params = dashboardPeriodApiParams(normalizedPeriod)
      setProfitPeriod(normalizedPeriod.period)
      setProfitFrom(normalizedPeriod.from)
      setProfitTo(normalizedPeriod.to)

      const [reportResult, ordersResult] = await Promise.allSettled([
        getSalesReport(params),
        getOrders({
          ...params,
          page: 1,
          perPage: 10,
        }),
      ])

      if (requestId !== profitRequestIdRef.current) return

      if (reportResult.status === 'fulfilled') {
        setProfitData(reportResult.value || null)
      } else {
        setProfitError(
          reportResult.reason?.message ||
            (ar
              ? 'تعذر تحميل الأرباح للفترة المحددة'
              : 'Could not load earnings for the selected period')
        )
      }

      if (ordersResult.status === 'fulfilled') {
        setPeriodOrdersData(ordersResult.value || null)
      } else {
        setPeriodOrdersError(
          ordersResult.reason?.message ||
            (ar
              ? 'تعذر تحميل الطلبات للفترة المحددة'
              : 'Could not load orders for the selected period')
        )
      }

      if (reportResult.status === 'rejected' && ordersResult.status === 'rejected') {
        throw reportResult.reason || ordersResult.reason
      }
    } catch (e) {
      if (requestId !== profitRequestIdRef.current) return
      setProfitError(
        e?.message ||
          (ar
            ? 'تعذر تحميل الأرباح للفترة المحددة'
            : 'Could not load earnings for the selected period')
      )
    } finally {
      if (requestId === profitRequestIdRef.current) {
        setProfitLoading(false)
      }
    }
  }

  useEffect(() => {
    loadProfitReport()
  }, [refreshKey])

  const counts = data?.counts || {}
  const productSummary = data?.productSummary || {}
  const productPerformance = data?.productPerformance || {}
  const sellerPerformance = data?.sellerPerformance || {}
  const holidayMode = Boolean(data?.holidayMode)

  const profitSummary = profitData?.summary || {}
  const profitPeriodLabel = dashboardPeriodLabel(
    { period: profitPeriod, from: profitFrom, to: profitTo },
    ar
  )

  const reportRows = Array.isArray(profitData?.rows) ? profitData.rows : []
  const reportDaily = Array.isArray(profitData?.daily) ? profitData.daily : []
  const periodCurrency = profitData?.currency || data?.currency

  const periodSoldUnits = Number(profitSummary.units ?? profitSummary.unitsSold ?? 0)

  const periodReturnedUnits = useMemo(
    () =>
      reportRows.reduce((sum, row) => {
        const status = normalizeOrderStatus(row?.status)
        if (status === 'returned' || status === 'refunded') {
          return sum + Number(row?.quantity || 0)
        }
        return sum
      }, 0),
    [reportRows]
  )

  const periodOrders = Array.isArray(periodOrdersData?.orders)
    ? periodOrdersData.orders
    : []
  const periodStatusCounts = periodOrdersData?.counts || {}
  const periodOrderTotal = Number(
    periodOrdersData?.pagination?.total ?? periodStatusCounts.all ?? 0
  )
  const periodRecentOrders = periodOrders.slice(0, 5)

  const periodLost = periodOrdersData?.periodMetrics?.lostSales || {
    totalValue: 0,
    totalCount: 0,
    cancelled: { count: 0, value: 0 },
    rejected: { count: 0, value: 0 },
    failed: { count: 0, value: 0 },
    'delivery-failed': { count: 0, value: 0 },
    returned: { count: 0, value: 0 },
    refunded: { count: 0, value: 0 },
  }


  const rejectedOrders = Number(
    sellerPerformance.rejectedOrders ||
      counts.rejected ||
      0
  )

  const productPieData = useMemo(
    () => [
      {
        name: ar ? 'الوحدات المباعة' : 'Sold Units',
        value: periodSoldUnits,
        color: '#16a34a',
      },
      {
        name: ar ? 'وحدات المخزون الحالي' : 'Current Stock Units',
        value: Number(productPerformance.currentStockUnits || 0),
        color: '#86efac',
      },
      {
        name: ar ? 'الوحدات المرتجعة' : 'Returned Units',
        value: periodReturnedUnits,
        color: '#f87171',
      },
    ],
    [periodSoldUnits, periodReturnedUnits, productPerformance.currentStockUnits, ar]
  )

  const salesTrend = useMemo(() => {
    return reportDaily.map((row) => ({
      ...row,
      sales: Number(row?.sales || 0),
      orders: Number(row?.orders || 0),
      label: row?.date
        ? new Date(`${row.date}T12:00:00`).toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
          })
        : '',
    }))
  }, [reportDaily, locale])

  const actions = [
    {
      key: 'new',
      icon: FiShoppingBag,
      title: ar
        ? 'طلبات جديدة تحتاج ردك'
        : 'New orders need your response',
      text: ar
        ? 'راجع الطلبات الجديدة واقبل أو ارفض الطلب.'
        : 'Review new orders and accept or reject them.',
      count: Number(counts.awaitingSeller || 0),
      onClick: onOrders,
    },
    {
      key: 'preparing',
      icon: FiClock,
      title: ar
        ? 'طلبات تحت التجهيز'
        : 'Orders being prepared',
      text: ar
        ? 'جهز المنتجات وسلمها للدكان قبل انتهاء المهلة.'
        : 'Prepare products and hand them to ElDokan before the deadline.',
      count: Number(counts.preparing || 0),
      onClick: onOrders,
    },
    {
      key: 'overdue',
      icon: FiAlertCircle,
      title: ar
        ? 'طلبات تجاوزت مهلة التجهيز'
        : 'Preparation deadline exceeded',
      text: ar
        ? 'هذه الطلبات تحتاج إجراء سريع.'
        : 'These orders need immediate action.',
      count: Number(counts.fulfillmentOverdue || 0),
      danger: true,
      onClick: onOrders,
    },
    {
      key: 'stock',
      icon: FiBox,
      title: ar
        ? 'منتجات تحتاج مراجعة المخزون'
        : 'Products need stock attention',
      text: ar
        ? 'مخزون منخفض أو منتج نفد من المخزون.'
        : 'Low-stock or out-of-stock products.',
      count:
        Number(data?.lowStockCount || 0) +
        Number(data?.outOfStockCount || 0),
      onClick: onProducts,
    },
    {
      key: 'approval',
      icon: FiPackage,
      title: ar
        ? 'منتجات في انتظار موافقة الدكان'
        : 'Products waiting for approval',
      text: ar
        ? 'تم إرسالها للدكان ولم تصبح Live بعد.'
        : 'Submitted to ElDokan and not Live yet.',
      count: Number(productSummary.pendingApproval || 0),
      onClick: onProducts,
    },
  ].filter((item) => item.count > 0)



  return (
    <AccountLayout
      language={language}
      role={role}
      permissions={permissions}
      active="home"
      onHome={onHome}
      onSettings={onSettings}
      onOrders={onOrders}
      onProducts={onProducts}
      onAddProduct={onAddProduct}
      onLogout={onLogout}
    >
      <div
        dir={ar ? 'rtl' : 'ltr'}
        className="eldokan-page eldokan-home min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Seller Center
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {ar ? 'الرئيسية' : 'Home'}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {ar
                  ? 'ملخص سريع لما يحتاج انتباهك وأداء حسابك.'
                  : 'A quick view of what needs your attention and how your account is performing.'}
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <button
                type="button"
                onClick={onToggleLanguage}
                className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold shadow-sm"
              >
                {ar ? 'English' : 'العربية'}
              </button>
              <button
                type="button"
                onClick={() => setRefreshKey((x) => x + 1)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm"
                title={ar ? 'تحديث' : 'Refresh'}
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

          {holidayMode && (
            <div className="mb-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm sm:flex-row sm:items-center sm:gap-4">
              <div>
                <div className="font-black">
                  {ar ? 'وضع الإجازة مفعل' : 'Holiday Mode is active'}
                </div>
                <div className="mt-1 text-sm font-medium text-amber-700">
                  {ar
                    ? 'الحالة محفوظة داخل ElDokan فقط ولا تغيّر WooCommerce.'
                    : 'Stored in ElDokan only and does not modify WooCommerce.'}
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black">
                {ar ? 'مفعل' : 'ON'}
              </span>
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-20 text-center text-slate-500 shadow-sm">
              {ar ? 'جاري تحميل البيانات...' : 'Loading seller data...'}
            </div>
          ) : (
            <div className="space-y-7">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeader
                  title={ar ? 'مطلوب منك الآن' : 'Action Required'}
                  subtitle={
                    ar
                      ? 'أهم المهام التي تحتاج تدخل منك.'
                      : 'The most important items that need your attention.'
                  }
                  action={
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {actions.length}
                    </div>
                  }
                />

                {actions.length ? (
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {actions.map((item) => (
                      <ActionItem
                        key={item.key}
                        {...item}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
                    <FiCheckCircle className="text-xl" />
                    <span className="font-bold">
                      {ar
                        ? 'لا توجد إجراءات عاجلة حالياً.'
                        : 'No urgent actions right now.'}
                    </span>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-emerald-600" />
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        {ar ? 'الفترة الزمنية للوحة التحكم' : 'Dashboard Period'}
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-slate-500">
                        {profitPeriodLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      ['today', ar ? 'اليوم' : 'Today'],
                      ['7d', ar ? '7 أيام' : '7 Days'],
                      ['30d', ar ? '30 يوم' : '30 Days'],
                      ['month', ar ? 'هذا الشهر' : 'This Month'],
                      ['last-month', ar ? 'الشهر السابق' : 'Last Month'],
                      ['custom', ar ? 'فترة مخصصة' : 'Custom'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setProfitPeriod(key)
                          if (key !== 'custom') {
                            loadProfitReport(key, profitFrom, profitTo)
                          }
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs font-black transition sm:px-4 ${
                          profitPeriod === key
                            ? 'border-black bg-black text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {profitPeriod === 'custom' && (
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <label className="grid gap-1 text-sm font-bold text-slate-600">
                      <span>{ar ? 'من' : 'From'}</span>
                      <input
                        type="date"
                        value={profitFrom}
                        max={profitTo || undefined}
                        onChange={(e) => setProfitFrom(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-slate-600">
                      <span>{ar ? 'إلى' : 'To'}</span>
                      <input
                        type="date"
                        value={profitTo}
                        min={profitFrom || undefined}
                        onChange={(e) => setProfitTo(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => loadProfitReport('custom', profitFrom, profitTo)}
                      disabled={!profitFrom || !profitTo}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40"
                    >
                      {ar ? 'تطبيق الفترة' : 'Apply Range'}
                    </button>
                  </div>
                )}
              </section>

              {periodOrdersError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {periodOrdersError}
                </div>
              )}

              <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  icon={FiShoppingBag}
                  title={ar ? 'إجمالي الطلبات' : 'Total Orders'}
                  value={profitLoading ? '...' : periodOrdersError ? '—' : Number(periodOrderTotal || 0).toLocaleString(locale)}
                  note={profitPeriodLabel}
                  tone="blue"
                />
                <KpiCard
                  icon={FiBox}
                  title={ar ? 'إجمالي المنتجات' : 'Total Products'}
                  value={Number(productSummary.total || 0).toLocaleString(locale)}
                  note={`${ar ? 'منتجات مباشرة' : 'Live products'}: ${Number(productSummary.liveProducts || 0).toLocaleString(locale)}`}
                  tone="green"
                />
                <KpiCard
                  icon={FiDollarSign}
                  title={ar ? 'الأرباح' : 'Earnings'}
                  value={profitLoading ? '...' : money(profitSummary.net ?? profitSummary.netEarnings, periodCurrency, locale)}
                  note={profitPeriodLabel}
                  tone="green"
                />
                <KpiCard
                  icon={FiPackage}
                  title={ar ? 'الوحدات المباعة' : 'Units Sold'}
                  value={Number(periodSoldUnits || 0).toLocaleString(locale)}
                  note={profitPeriodLabel}
                  tone="slate"
                />
                <KpiCard
                  icon={FiAlertCircle}
                  title={ar ? 'قيمة المبيعات الضائعة' : 'Lost Sales Value'}
                  value={money(periodLost.totalValue, periodCurrency, locale)}
                  note={`${Number(periodLost.totalCount || 0).toLocaleString(locale)} ${ar ? 'طلب خلال الفترة' : 'orders in period'}`}
                  tone="red"
                />
              </section>

              <section className="grid min-w-0 gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeader
                    title={ar ? 'تفاصيل الطلبات' : 'Order Breakdown'}
                    subtitle={
                      ar
                        ? 'الطلبات محسوبة حسب تاريخ إنشاء الطلب داخل الفترة المحددة.'
                        : 'Orders are counted by order creation date within the selected period.'
                    }
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      ['processing', ar ? 'طلب جديد' : 'New Order', periodStatusCounts.processing],
                      ['accepted', ar ? 'قيد التجهيز' : 'Preparing', periodStatusCounts.accepted],
                      ['received-from-seller', ar ? 'تم الاستلام من البائع' : 'Received from Seller', periodStatusCounts['received-from-seller']],
                      ['shipped', ar ? 'تم الشحن' : 'Shipped', periodStatusCounts.shipped],
                      ['delivered', ar ? 'تم التوصيل' : 'Delivered', periodStatusCounts.delivered],
                    ].map(([statusKey, label, value], index) => (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => onOrders?.(statusKey)}
                        className={`relative overflow-hidden rounded-2xl border p-4 text-start transition hover:-translate-y-0.5 hover:shadow-sm ${
                          index === 0
                            ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50'
                            : 'border-slate-200 bg-slate-50/80 hover:border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                            index === 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-2xl font-black text-slate-950">
                            {Number(value || 0).toLocaleString(locale)}
                          </span>
                        </div>
                        <div className="text-sm font-black text-slate-800">{label}</div>
                        <div className="mt-1 text-[10px] font-black text-emerald-700">
                          {ar ? 'فتح الطلبات' : 'Open orders'}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
                      {ar ? 'الحالات الاستثنائية' : 'Exception Statuses'}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                      {[
                        ['rejected', ar ? 'مرفوض' : 'Rejected', periodStatusCounts.rejected],
                        ['cancelled', ar ? 'ملغي' : 'Cancelled', periodStatusCounts.cancelled],
                        ['returned', ar ? 'مرتجع' : 'Returned', periodStatusCounts.returned],
                        ['delivery-failed', ar ? 'فشل التوصيل' : 'Delivery Failed', periodStatusCounts['delivery-failed']],
                        ['failed', ar ? 'فشل' : 'Failed', periodStatusCounts.failed],
                        ['refunded', ar ? 'مسترد' : 'Refunded', periodStatusCounts.refunded],
                      ].map(([statusKey, label, value]) => (
                        <button
                          key={`${statusKey}-${label}`}
                          type="button"
                          onClick={() => onOrders?.(statusKey)}
                          className="rounded-2xl border border-red-100 bg-red-50/40 p-3 text-start transition hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-sm"
                        >
                          <div className="text-xs font-bold text-slate-500">{label}</div>
                          <div className="mt-1 text-xl font-black text-red-700">{Number(value || 0).toLocaleString(locale)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeader
                    title={ar ? 'تفاصيل المبيعات الضائعة' : 'Lost Sales Breakdown'}
                    subtitle={
                      ar
                        ? 'قيمة الطلبات غير المكتملة خلال الفترة المحددة، حسب السبب.'
                        : 'Value of non-realized orders for the selected period, by reason.'
                    }
                    action={
                      <div className="rounded-2xl bg-red-50 px-4 py-2 text-end">
                        <div className="text-[10px] font-black uppercase tracking-wide text-red-400">
                          {ar ? 'إجمالي الفترة' : 'Period Total'}
                        </div>
                        <div className="mt-1 font-black text-red-700">
                          {money(periodLost.totalValue, periodCurrency, locale)}
                        </div>
                      </div>
                    }
                  />
                  <div className="space-y-3">
                    {[
                      ['cancelled', ar ? 'ملغي' : 'Cancelled', periodLost.cancelled],
                      ['rejected', ar ? 'مرفوض' : 'Rejected', periodLost.rejected],
                      ['failed', ar ? 'فشل' : 'Failed', periodLost.failed],
                      ['delivery-failed', ar ? 'فشل التوصيل' : 'Delivery Failed', periodLost['delivery-failed']],
                      ['returned', ar ? 'مرتجع' : 'Returned', periodLost.returned],
                      ['refunded', ar ? 'مسترد' : 'Refunded', periodLost.refunded],
                    ].map(([statusKey, label, item]) => (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => onOrders?.(statusKey)}
                        className="flex w-full items-center justify-between rounded-2xl border border-red-100 bg-red-50/50 p-4 text-start transition hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-sm"
                      >
                        <div>
                          <div className="font-black text-slate-900">{label}</div>
                          <div className="text-xs text-slate-500">{Number(item?.count || 0)} {ar ? 'طلب' : 'orders'}</div>
                        </div>
                        <div className="font-black text-red-700">
                          {money(item?.value, periodCurrency, locale)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {rejectedOrders >= 3 && (
                <section className="flex items-start gap-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-xl text-white">
                    <FiAlertCircle />
                  </div>
                  <div>
                    <div className="font-black">
                      {ar ? 'تنبيه أداء الحساب' : 'Account Performance Alert'}
                    </div>
                    <p className="mt-1 text-sm leading-6">
                      {ar
                        ? `تم رفض أو إلغاء ${rejectedOrders} طلبات. استمرار الرفض أو الإلغاء سيؤثر على تقييم الحساب.`
                        : `${rejectedOrders} orders have been rejected or cancelled. Continued cancellations will reduce the account rating.`}
                    </p>
                  </div>
                </section>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                {(() => {
                  const cancelledRejected = Number(
                    sellerPerformance.rejectedOrders ||
                      counts.rejected ||
                      0
                  )

                  const responseOver48h = Number(
                    sellerPerformance.responseOver48h || 0
                  )

                  const unansweredOver48h = Number(
                    sellerPerformance.unansweredOver48h || 0
                  )

                  const lateHandovers = Number(
                    sellerPerformance.lateHandovers || 0
                  )

                  const overduePreparation = Number(
                    counts.fulfillmentOverdue || 0
                  )

                  const cancellationHealth =
                    cancelledRejected >= 3
                      ? 'warning'
                      : cancelledRejected > 0
                      ? 'medium'
                      : 'good'

                  const responseHealth =
                    responseOver48h > 0 ||
                    unansweredOver48h > 0
                      ? 'warning'
                      : 'good'

                  const eldokanHealth =
                    lateHandovers > 0 ||
                    overduePreparation > 0
                      ? 'warning'
                      : 'good'

                  const states = [
                    cancellationHealth,
                    responseHealth,
                    eldokanHealth,
                  ]

                  const warningCount =
                    states.filter(
                      (state) =>
                        state === 'warning'
                    ).length

                  const mediumCount =
                    states.filter(
                      (state) =>
                        state === 'medium'
                    ).length

                  const overall =
                    warningCount >= 2
                      ? 'warning'
                      : warningCount === 1 ||
                        mediumCount >= 1
                      ? 'medium'
                      : 'good'

                  const overallLabel =
                    overall === 'good'
                      ? ar
                        ? 'جيد'
                        : 'Good'
                      : overall === 'medium'
                      ? ar
                        ? 'متوسط'
                        : 'Average'
                      : ar
                      ? 'يحتاج تحسين'
                      : 'Needs Improvement'

                  const ringClass =
                    overall === 'good'
                      ? 'border-green-200 bg-emerald-50 text-emerald-700'
                      : overall === 'medium'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-red-200 bg-red-50 text-red-700'

                  const dotClass = (state) =>
                    state === 'good'
                      ? 'bg-green-100 text-emerald-700'
                      : state === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'

                  const indicators = [
                    {
                      label: ar
                        ? 'الإلغاء والرفض'
                        : 'Cancellations & Rejections',
                      state: cancellationHealth,
                      detail:
                        cancelledRejected >= 3
                          ? ar
                            ? `تم الوصول إلى ${cancelledRejected} طلبات ملغاة أو مرفوضة. الحد التنبيهي هو 3 طلبات.`
                            : `${cancelledRejected} orders were cancelled or rejected. The alert threshold is 3 orders.`
                          : cancelledRejected > 0
                          ? ar
                            ? `${cancelledRejected} طلب ملغي أو مرفوض حتى الآن.`
                            : `${cancelledRejected} cancelled or rejected order(s) so far.`
                          : ar
                          ? 'لا توجد إلغاءات أو رفض مؤثر حالياً.'
                          : 'No significant cancellations or rejections.',
                    },
                    {
                      label: ar
                        ? 'استقبال والرد على الطلبات'
                        : 'Order Response Time',
                      state: responseHealth,
                      detail:
                        responseHealth === 'good'
                          ? ar
                            ? 'يتم الرد على الطلبات خلال يومين كحد أقصى.'
                            : 'Orders are answered within the 2-day maximum.'
                          : ar
                          ? `${responseOver48h + unansweredOver48h} طلب تجاوز مهلة الرد المحددة وهي يومان.`
                          : `${responseOver48h + unansweredOver48h} order(s) exceeded the 2-day response limit.`,
                    },
                    {
                      label: ar
                        ? 'امتسال  السياسات'
                        : 'Working with ElDokan',
                      state: eldokanHealth,
                      detail:
                        eldokanHealth === 'good'
                          ? ar
                            ? 'تسليم المنتجات للدكان يتم داخل المهلة المحددة.'
                            : 'Product handover to ElDokan is within the required deadline.'
                          : ar
                          ? `${lateHandovers + overduePreparation} حالة تأخير في التجهيز أو التسليم للدكان.`
                          : `${lateHandovers + overduePreparation} late preparation/handover case(s).`,
                    },
                  ]

                  return (
                    <div className="grid items-stretch gap-6 lg:grid-cols-[1.2fr_.8fr]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-slate-950">
                            {ar
                              ? 'صحة الحساب'
                              : 'Account Health'}
                          </h2>
                          <FiAlertCircle className="text-slate-400" />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {ar
                            ? 'صحة الحساب مبنية على الإلغاءات وسرعة التعامل مع الطلبات والالتزام بالتعامل مع ElDokan.'
                            : 'Account health is based on cancellations, order response time, and operational compliance with ElDokan.'}
                        </p>

                        <div className="mt-5 space-y-3">
                          {indicators.map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${dotClass(
                                  item.state
                                )}`}
                              >
                                {item.state === 'warning'
                                  ? '!'
                                  : item.state === 'medium'
                                  ? '•'
                                  : '✓'}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="font-black text-slate-900">
                                  {item.label}
                                </div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">
                                  {item.detail}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-center rounded-3xl bg-slate-50 p-6">
                        <div className="text-center">
                          <div
                            className={`mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[18px] ${ringClass}`}
                          >
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
                              <FiCheckCircle className="text-3xl" />
                            </div>
                          </div>

                          <div className="mt-5 text-xl font-black text-slate-950">
                            {overallLabel}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {ar
                              ? 'الحالة العامة للحساب'
                              : 'Overall account status'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FiTrendingUp className="text-green-600" />
                      <h2 className="text-xl font-black text-slate-950">
                        {ar ? 'أداء المبيعات' : 'Sales Performance'}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {ar
                        ? 'قيمة المبيعات وعدد الطلبات خلال نفس الفترة المحددة أعلى الصفحة.'
                        : 'Sales value and order volume across the selected period.'}
                    </p>
                  </div>

                  <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                    {profitPeriodLabel}
                  </div>
                </div>

                <div className="eldokan-home-line-chart h-[250px] sm:h-[300px] lg:h-[330px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis yAxisId="sales" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip
                        formatter={(value, name) =>
                          name === 'sales'
                            ? [money(value, periodCurrency, locale), ar ? 'المبيعات' : 'Sales']
                            : [value, ar ? 'الطلبات' : 'Orders']
                        }
                      />
                      <Legend />
                      <Line
                        yAxisId="sales"
                        type="monotone"
                        dataKey="sales"
                        name={ar ? 'المبيعات' : 'Sales'}
                        stroke="#16a34a"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="orders"
                        type="monotone"
                        dataKey="orders"
                        name={ar ? 'الطلبات' : 'Orders'}
                        stroke="#0f172a"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeader
                  title={ar ? 'أداء المنتجات' : 'Product Performance'}
                  subtitle={
                    ar
                      ? 'يعرض المخزون الحالي مع الوحدات المباعة والمرتجعة خلال الفترة المحددة.'
                      : 'Shows current inventory plus sold and returned units for the selected period.'
                  }
                  action={
                    <button
                      type="button"
                      onClick={onProducts}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                    >
                      {ar ? 'عرض كل المنتجات' : 'View All Products'}
                    </button>
                  }
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    [ar ? 'إجمالي وحدات المخزون' : 'Total Stock Units', productSummary.stockUnits, 'green'],
                    [ar ? 'منتجات متوفرة' : 'In-stock Products', productSummary.inStock, 'blue'],
                    [ar ? 'مخزون منخفض' : 'Low-stock Products', productSummary.lowStock, 'amber'],
                    [ar ? 'نفد المخزون' : 'Out-of-stock Products', productSummary.outOfStock, 'red'],
                    [ar ? 'الوحدات المرتجعة' : 'Returned Units', periodReturnedUnits, 'returned'],
                  ].map(([label, value, tone]) => (
                    <div
                      key={label}
                      className={`rounded-2xl border p-4 ${
                        tone === 'green'
                          ? 'border-emerald-100 bg-emerald-50/70'
                          : tone === 'blue'
                          ? 'border-blue-100 bg-blue-50/70'
                          : tone === 'amber'
                          ? 'border-amber-100 bg-amber-50/70'
                          : tone === 'returned'
                          ? 'border-rose-100 bg-rose-50/70'
                          : 'border-red-100 bg-red-50/70'
                      }`}
                    >
                      <div className="text-xs font-black text-slate-500">{label}</div>
                      <div className="mt-2 text-2xl font-black text-slate-950">
                        {Number(value || 0).toLocaleString(locale)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                  <div className="grid min-w-0 items-center gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
                    <div className="eldokan-home-pie-chart mx-auto flex h-[190px] w-full max-w-[190px] items-center justify-center overflow-hidden">
                      <PieChart width={190} height={190} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={productPieData}
                          dataKey="value"
                          nameKey="name"
                          cx={95}
                          cy={95}
                          outerRadius={72}
                          innerRadius={49}
                          paddingAngle={3}
                          stroke="#fff"
                          strokeWidth={3}
                        >
                          {productPieData.map((item) => (
                            <Cell
                              key={item.name}
                              fill={item.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            Number(value || 0).toLocaleString(locale),
                            name,
                          ]}
                        />
                      </PieChart>
                    </div>

                    <div className="min-w-0 space-y-2.5">
                      {productPieData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="truncate text-sm font-bold text-slate-600">
                              {item.name}
                            </span>
                          </div>

                          <span className="shrink-0 text-lg font-black text-slate-950">
                            {Number(item.value || 0).toLocaleString(locale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-3 text-xs font-medium text-slate-400">
                    {ar
                      ? 'الرسم يقارن بين وحدات المخزون الحالية والوحدات المباعة والوحدات المرتجعة.'
                      : 'Compares current stock units, sold units, and returned units.'}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-950">
                    {ar ? 'آخر الطلبات في الفترة المحددة' : 'Recent Orders in Selected Period'}
                  </h2>
                  <button
                    type="button"
                    onClick={onOrders}
                    className="text-sm font-black text-emerald-700"
                  >
                    {ar ? 'عرض الكل' : 'View all'}
                  </button>
                </div>

                <div className="space-y-2">
                  {periodRecentOrders.length ? periodRecentOrders.map((order) => (
                    <button
                      type="button"
                      key={order.id}
                      onClick={onOrders}
                      className="flex w-full flex-col items-start justify-between gap-3 rounded-2xl border border-slate-100 p-4 text-start hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div>
                        <div className="font-black text-slate-950">
                          #{order.number}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {order.statusLabel || order.status}
                        </div>
                      </div>
                      <div className="font-black text-slate-800">
                        {money(order.total, order.currency, locale)}
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                      {ar ? 'لا توجد طلبات في الفترة المحددة.' : 'No orders found in the selected period.'}
                    </div>
                  )}
                </div>
              </section>

            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  )
}
