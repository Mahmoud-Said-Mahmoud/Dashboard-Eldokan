import { useEffect, useState, useMemo, useRef } from 'react'
import {
  getOrders,
  getOrderDetails,
  addSellerOrderReply,
  updateOrderStatus,
} from '../../lib/productApi'
import AccountLayout from '../../components/AccountLayout/AccountLayout'
import { dashboardPeriodApiParams, dashboardPeriodLabel, getDashboardPeriod, saveDashboardPeriod } from '../../lib/dashboardPeriod'
import Breadcrumb from '../../components/Common/Breadcrumb'
import {
  FiX,
  FiRefreshCw,
  FiSearch,
  FiPlus,
  FiMinus,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiRotateCcw,
  FiAlertTriangle,
  FiCalendar,
} from 'react-icons/fi'
import Pagination from '../../components/Common/Pagination'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const TABS = [
  ['all', 'All', 'الكل', 'all'],
  ['processing', 'New Orders', 'طلبات جديدة', 'processing'],
  ['accepted', 'Preparing', 'قيد التجهيز', 'accepted'],
  ['received-from-seller', 'Received', 'تم الاستلام', 'received-from-seller'],
  ['shipped', 'Shipped', 'تم الشحن', 'shipped'],
  ['delivered', 'Delivered', 'تم التوصيل', 'delivered'],
  ['cancelled', 'Cancelled', 'ملغي', 'cancelled'],
  ['returned', 'Returned / Refund', 'مرتجع / Refund', 'returned'],
]

const ACTIONS = {
  accepted: {
    en: 'Accept Order',
    ar: 'استلام الطلب',
    icon: FiCheckCircle,
  },
  rejected: {
    en: 'Reject Order',
    ar: 'رفض الطلب',
    icon: FiXCircle,
  },

  'received-from-seller': {
    en: 'Received from Seller',
    ar: 'تم الاستلام من البائع',
    icon: FiCheckCircle,
  },
  shipped: {
    en: 'Mark Shipped',
    ar: 'تم الشحن',
    icon: FiTruck,
  },
  delivered: {
    en: 'Delivered',
    ar: 'تم التوصيل',
    icon: FiCheckCircle,
  },
  cancelled: {
    en: 'Cancel',
    ar: 'إلغاء',
    icon: FiXCircle,
  },
  returned: {
    en: 'Returned',
    ar: 'مرتجع',
    icon: FiRotateCcw,
  },
  'delivery-failed': {
    en: 'Delivery Failed',
    ar: 'فشل التوصيل',
    icon: FiAlertTriangle,
  },
}

function formatAge(minutes, ar) {
  const value = Math.max(0, Number(minutes || 0))

  if (value < 60) {
    return ar
      ? `منذ ${value} دقيقة`
      : `${value} min ago`
  }

  const hours = Math.floor(value / 60)

  if (hours < 24) {
    return ar
      ? `منذ ${hours} ساعة`
      : `${hours} hr ago`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  return ar
    ? `منذ ${days} يوم${remainingHours ? ` و ${remainingHours} ساعة` : ''}`
    : `${days}d${remainingHours ? ` ${remainingHours}h` : ''} ago`
}

function formatDeadline(minutesLeft, overdue, ar) {
  if (minutesLeft === null || minutesLeft === undefined) {
    return '—'
  }

  const absolute = Math.abs(Number(minutesLeft))
  const hours = Math.floor(absolute / 60)
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  const duration =
    days > 0
      ? ar
        ? `${days} يوم${remainingHours ? ` و ${remainingHours} ساعة` : ''}`
        : `${days}d ${remainingHours}h`
      : ar
      ? `${hours} ساعة`
      : `${hours}h`

  return overdue
    ? ar
      ? `متأخر ${duration}`
      : `${duration} overdue`
    : ar
    ? `متبقي ${duration}`
    : `${duration} left`
}

function orderStatusLabel(status, fallback, ar) {
  const labels = {
    processing: {
      en: 'New Order',
      ar: 'طلب جديد',
    },
    pending: {
      en: 'New Order',
      ar: 'طلب جديد',
    },
    accepted: {
      en: 'Preparing',
      ar: 'قيد التجهيز',
    },
    'received-from-seller': {
      en: 'Received from Seller',
      ar: 'تم الاستلام من البائع',
    },
    shipped: {
      en: 'Shipped',
      ar: 'تم الشحن',
    },
    delivered: {
      en: 'Delivered',
      ar: 'تم التوصيل',
    },
    rejected: {
      en: 'Rejected',
      ar: 'مرفوض',
    },
    cancelled: {
      en: 'Cancelled',
      ar: 'ملغي',
    },
    returned: {
      en: 'Returned',
      ar: 'مرتجع',
    },
    'delivery-failed': {
      en: 'Delivery Failed',
      ar: 'فشل التوصيل',
    },
    failed: {
      en: 'Failed',
      ar: 'فشل',
    },
  }

  const item = labels[status]
  return item
    ? ar
      ? item.ar
      : item.en
    : fallback || status || '—'
}

export default function Orders({
  language,
  currentUser,
  onToggleLanguage,
  onHome,
  onSettings,
  onProducts,
  onAddProduct,
  onLogout,
}) {
  const ar = language === 'ar'
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const role = currentUser?.role || ''
  const permissions = currentUser?.permissions || {}
  const isOwner =
    role === 'eldokan_owner' ||
    currentUser?.roles?.includes?.('eldokan_owner')
  const canViewOrderDetails =
    isOwner || Boolean(permissions.viewOrderDetails)
  const isEldokanAdmin =
    role === 'administrator' ||
    role === 'admin' ||
    role === 'eldokan_admin' ||
    currentUser?.roles?.includes?.('administrator') ||
    currentUser?.roles?.includes?.('admin') ||
    currentUser?.isAdministrator === true

  const [status, setStatus] = useState(() => {
    const requestedStatus =
      new URLSearchParams(window.location.search).get('status') || 'all'
    const validStatuses = new Set(TABS.map(([key]) => key))
    return validStatuses.has(requestedStatus) ? requestedStatus : 'all'
  })
  const [orderSearch, setOrderSearch] = useState('')
  const [skuSearch, setSkuSearch] = useState('')
  const [orders, setOrders] = useState([])
  const [counts, setCounts] = useState({})
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  })
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [changingOrder, setChangingOrder] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const initialDashboardPeriod = useMemo(() => getDashboardPeriod(), [])
  const [period, setPeriod] = useState(initialDashboardPeriod.period)
  const [periodFrom, setPeriodFrom] = useState(initialDashboardPeriod.from)
  const [periodTo, setPeriodTo] = useState(initialDashboardPeriod.to)
  const ordersRequestIdRef = useRef(0)
  const activePeriodLabel = dashboardPeriodLabel(
    { period, from: periodFrom, to: periodTo },
    ar
  )

  useEffect(() => {
    setPage(1)
  }, [status, period, periodFrom, periodTo])

  function selectPeriod(nextPeriod) {
    setPeriod(nextPeriod)
    setPage(1)

    if (nextPeriod !== 'custom') {
      const saved = saveDashboardPeriod({ period: nextPeriod })
      setPeriodFrom(saved.from)
      setPeriodTo(saved.to)
    }
  }

  function applyCustomPeriod() {
    let from = String(periodFrom || '').trim()
    let to = String(periodTo || '').trim()

    if (!from || !to) return

    if (from > to) {
      ;[from, to] = [to, from]
      setPeriodFrom(from)
      setPeriodTo(to)
    }

    const saved = saveDashboardPeriod({ period: 'custom', from, to })
    setPeriod(saved.period)
    setPeriodFrom(saved.from)
    setPeriodTo(saved.to)
    setPage(1)
    setRefreshKey((value) => value + 1)
  }

  function showAllOrders() {
    setStatus('all')
    setOrderSearch('')
    setSkuSearch('')
    setPage(1)
    setExpanded(null)
    setError('')

    const url = new URL(window.location.href)
    url.searchParams.delete('status')
    url.searchParams.delete('search')
    url.searchParams.delete('sku')

    window.history.replaceState(
      { ...(window.history.state || {}), screen: 'orders' },
      '',
      url.pathname
    )

    // If the view is already All, state setters above may not trigger a
    // reload. Force one so clicking Orders always refreshes the full list.
    setRefreshKey((value) => value + 1)
  }

  useEffect(() => {
    const url = new URL(window.location.href)

    if (status && status !== 'all') {
      url.searchParams.set('status', status)
    } else {
      url.searchParams.delete('status')
    }

    window.history.replaceState(
      { ...(window.history.state || {}), screen: 'orders' },
      '',
      `${url.pathname}${url.search}`
    )
  }, [status])

  async function openOrderDetails(orderId) {
    if (!canViewOrderDetails) return
    setSelectedOrderId(orderId)
    setSelectedOrder(null)
    setDetailsLoading(true)
    setDetailsError('')

    try {
      const response = await getOrderDetails(orderId)
      setSelectedOrder(response?.order || null)
    } catch {
      setDetailsError(
        ar
          ? 'تعذر تحميل تفاصيل الطلب.'
          : 'Could not load order details.'
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  useEffect(() => {
    const openId =
      Number(
        new URLSearchParams(
          window.location.search
        ).get('open') || 0
      )

    if (openId > 0) {
      openOrderDetails(openId)
    }
  }, [])

  function closeOrderDetails() {
    setSelectedOrderId(null)
    setSelectedOrder(null)
    setDetailsError('')
  }

  const [sellerReply, setSellerReply] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyError, setReplyError] = useState('')

  async function sendSellerReply() {
    const message = sellerReply.trim()

    if (!selectedOrder?.id || !message) {
      return
    }

    setReplySending(true)
    setReplyMessage('')
    setReplyError('')

    try {
      const response = await addSellerOrderReply(
        selectedOrder.id,
        message
      )

      setSelectedOrder((current) => ({
        ...current,
        sellerReplies:
          response?.sellerReplies ||
          current?.sellerReplies ||
          [],
      }))

      setSellerReply('')
      setReplyMessage(
        ar
          ? 'تم إرسال الرسالة إلى الدكان.'
          : 'Message sent to ElDokan.'
      )
    } catch {
      setReplyError(
        ar
          ? 'تعذر إرسال الرسالة.'
          : 'Could not send message.'
      )
    } finally {
      setReplySending(false)
    }
  }


  async function load() {
    const requestId = ++ordersRequestIdRef.current
    if (period === 'custom' && (!periodFrom || !periodTo)) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const maxAttempts = 3

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const data = await getOrders({
          status:
            status === 'all'
              ? undefined
              : status,
          search:
            orderSearch || undefined,
          sku:
            skuSearch || undefined,
          ...dashboardPeriodApiParams({ period, from: periodFrom, to: periodTo }),
          page,
          perPage: pageSize,
        })

        if (requestId !== ordersRequestIdRef.current) return
        setOrders(data?.orders || [])
        setCounts(data?.counts || {})
        setPagination(
          data?.pagination || {
            page,
            perPage: pageSize,
            total: data?.orders?.length || 0,
            totalPages: 1,
          }
        )
        setError('')
        setLoading(false)
        return
      } catch (e) {
        const httpStatus =
          e?.response?.status ||
          e?.status ||
          e?.cause?.response?.status

        const shouldRetry =
          httpStatus === 502 ||
          httpStatus === 503 ||
          httpStatus === 504 ||
          !httpStatus

        if (shouldRetry && attempt < maxAttempts) {
          await sleep(attempt * 900)
          continue
        }

        if (requestId !== ordersRequestIdRef.current) return

        setError(
          ar
            ? 'تعذر تحميل الطلبات مؤقتاً. حاول مرة أخرى.'
            : 'Orders could not be loaded temporarily. Please try again.'
        )

        setOrders([])
        setCounts({})
        setLoading(false)
        return
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    const timer = setTimeout(() => {
      if (!cancelled) {
        load()
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [status, refreshKey, page, pageSize, period, periodFrom, periodTo])

  function search(event) {
    event.preventDefault()
    setPage(1)

    if (page === 1) {
      load()
    }
  }

  async function changeStatus(order, nextStatus) {
    setChangingOrder(order.id)
    setError('')
    setActionMessage('')

    try {
      const response = await updateOrderStatus(order.id, nextStatus)

      // Update the clicked row immediately from the API response. The full
      // reload below then refreshes counters/pagination from the same source.
      if (response?.status || response?.effectiveStatus) {
        const savedStatus = response.effectiveStatus || response.status
        setOrders((current) =>
          current.map((item) =>
            item.id === order.id
              ? {
                  ...item,
                  status: savedStatus,
                  statusLabel: response.statusLabel || item.statusLabel,
                  availableActions: response.availableActions ?? item.availableActions,
                  acceptedAt: response.acceptedAt ?? item.acceptedAt,
                }
              : item
          )
        )
      }

      setActionMessage(
        nextStatus === 'accepted'
          ? (ar ? 'تم قبول الطلب بنجاح.' : 'Order accepted successfully.')
          : nextStatus === 'rejected'
          ? (ar ? 'تم رفض الطلب.' : 'Order rejected.')
          : (ar ? 'تم تحديث حالة الطلب.' : 'Order status updated.')
      )

      // Reload so status, actions and tab counters reflect the saved workflow.
      await load()

      if (selectedOrderId === order.id) {
        await openOrderDetails(order.id)
      }

      return response
    } catch (e) {
      setError(
        e?.message ||
          (ar
            ? 'تعذر تغيير حالة الطلب'
            : 'Could not change order status')
      )
    } finally {
      setChangingOrder(null)
    }
  }

  const money = (value, currency) =>
    `${Number(value || 0).toLocaleString(
      ar ? 'ar-EG' : 'en-US',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )} ${currency || ''}`


  return (
    <AccountLayout
      language={language}
      role={role}
      permissions={permissions}
      active="orders"
      onHome={onHome}
      onSettings={onSettings}
      onOrders={showAllOrders}
      onProducts={onProducts}
      onAddProduct={onAddProduct}
      onLogout={onLogout}
    >
      <div
        dir={ar ? 'rtl' : 'ltr'}
        className="eldokan-page min-h-screen bg-white p-4 sm:p-8"
      >
        <div className="mx-auto max-w-[1500px]">
          <Breadcrumb
            ar={ar}
            items={[
              {
                label: ar ? 'الطلبات' : 'Orders',
              },
            ]}
          />

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-black">
                {ar ? 'الطلبات' : 'Orders'}
              </h1>

              <p className="mt-2 text-slate-500">
                {ar
                  ? 'الطلب الجديد يمكن قبوله أو رفضه. بعد القبول تبدأ مهلة التجهيز وتختفي تلقائياً عندما يقوم الدكان بتأكيد استلام المنتج من البائع.'
                  : 'New orders can be accepted or rejected. After acceptance, the preparation deadline stays active until ElDokan marks the order as received from the seller.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleLanguage}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold"
              >
                {ar ? 'English' : 'العربية'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setRefreshKey((x) => x + 1)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold"
              >
                <FiRefreshCw />
                {ar ? 'تحديث الصفحة' : 'Refresh Page'}
              </button>
            </div>
          </div>

          <section className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-emerald-600" />
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {ar ? 'الفترة الزمنية للطلبات' : 'Orders Period'}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {activePeriodLabel}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-emerald-700">
                    {ar ? 'الفلترة حسب تاريخ إنشاء الطلب' : 'Filtered by order creation date'}
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
                    onClick={() => selectPeriod(key)}
                    className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                      period === key
                        ? 'border-black bg-black text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {period === 'custom' && (
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="grid gap-1 text-sm font-bold text-slate-600">
                  <span>{ar ? 'من' : 'From'}</span>
                  <input
                    type="date"
                    value={periodFrom}
                    max={periodTo || undefined}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-600">
                  <span>{ar ? 'إلى' : 'To'}</span>
                  <input
                    type="date"
                    value={periodTo}
                    min={periodFrom || undefined}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  />
                </label>
                <button
                  type="button"
                  onClick={applyCustomPeriod}
                  disabled={!periodFrom || !periodTo}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40"
                >
                  {ar ? 'تطبيق الفترة' : 'Apply Range'}
                </button>
              </div>
            )}
          </section>

          <div className="mb-5 flex flex-wrap gap-2">
            {TABS.map(([key, en, arLabel, countKey]) => {
              // The active tab must always match the exact server-side
              // result total shown in the table/pagination. Other tabs use
              // the server counters for the same account/search scope.
              const count =
                key === status
                  ? Number(pagination?.total ?? 0)
                  : key === 'all'
                    ? Number(
                        counts?.all ??
                          counts?.total ??
                          counts?.totalOrders ??
                          orders.length ??
                          0
                      )
                    : Number(counts?.[countKey] ?? 0)

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${
                    status === key
                      ? 'border-black bg-black text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-black'
                  }`}
                >
                  {ar ? arLabel : en} ({count})
                </button>
              )
            })}
          </div>

          <form
            onSubmit={search}
            className="mb-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]"
          >
            <input
              value={orderSearch}
              onChange={(e) =>
                setOrderSearch(e.target.value)
              }
              placeholder={
                ar
                  ? 'البحث برقم الطلب'
                  : 'Search by order number'
              }
              className="rounded-xl border border-slate-300 px-4 py-3.5 outline-none focus:border-black"
            />

            <input
              value={skuSearch}
              onChange={(e) =>
                setSkuSearch(e.target.value)
              }
              placeholder={
                ar
                  ? 'البحث بـ SKU'
                  : 'Search by Seller SKU'
              }
              className="rounded-xl border border-slate-300 px-4 py-3.5 outline-none focus:border-black"
            />

            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-7 py-3.5 font-black text-white">
              <FiSearch />
              {ar ? 'بحث' : 'Search'}
            </button>
          </form>

          {actionMessage && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {actionMessage}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                {ar
                  ? 'جاري تحميل الطلبات...'
                  : 'Loading orders...'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="eldokan-orders-table min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-14 px-4 py-4" />
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'رقم الطلب' : 'Order Number'}
                      </th>
                      {isEldokanAdmin && (
                        <th className="px-4 py-4 text-start text-sm font-black">
                          {ar ? 'البائع' : 'Seller'}
                        </th>
                      )}
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'التاريخ' : 'Order Date'}
                      </th>
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'الحالة' : 'Status'}
                      </th>
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'عمر الطلب' : 'Order Age'}
                      </th>
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'مهلة التجهيز' : 'Prepare Before'}
                      </th>
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'الدفع' : 'Payment'}
                      </th>
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'السعر' : 'Price'}
                      </th>
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'المنتجات' : 'Items'}
                      </th>
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'الشحن' : 'Shipping'}
                      </th>
                      <th className="px-4 py-4 text-start text-sm font-black">
                        {ar ? 'الإجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <>
                        <tr key={order.id} onClick={() => openOrderDetails(order.id)} className="cursor-pointer transition hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpanded(
                                  expanded === order.id
                                    ? null
                                    : order.id
                                )
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white font-black"
                            >
                              {expanded === order.id
                                ? <FiMinus />
                                : <FiPlus />}
                            </button>
                          </td>

                          <td className="px-4 py-4 font-black">
                            #{order.number}
                          </td>

                          {isEldokanAdmin && (
                            <td className="px-4 py-4 font-bold text-black">
                              {order.sellerName || '—'}
                            </td>
                          )}

                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {order.date
                              ? new Date(
                                  order.date
                                ).toLocaleString(
                                  ar
                                    ? 'ar-EG'
                                    : 'en-GB'
                                )
                              : '—'}
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-black">
                              {order.statusLabel}
                              {order.status ===
                                'received-from-seller' && (
                                <div className="mt-1 text-[10px] font-bold text-emerald-700">
                                  {ar
                                    ? 'استلمه الدكان من البائع'
                                    : 'Received by ElDokan'}
                                </div>
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm font-bold text-slate-700">
                            {formatAge(order.orderAgeMinutes, ar)}
                          </td>

                          <td className="px-4 py-4">
                            <div
                              className={`text-sm font-black ${
                                order.fulfillmentOverdue
                                  ? 'text-red-600'
                                  : 'text-black'
                              }`}
                            >
                              {order.status === 'accepted'
                                ? formatDeadline(
                                    order.fulfillmentMinutesLeft,
                                    order.fulfillmentOverdue,
                                    ar
                                  )
                                : '—'}
                            </div>
                            {order.status === 'accepted' && order.fulfillmentDeadline && (
                              <div className="mt-1 text-[10px] text-slate-400">
                                {new Date(
                                  order.fulfillmentDeadline
                                ).toLocaleString(
                                  ar ? 'ar-EG' : 'en-GB'
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {order.paymentMethod || '—'}
                          </td>

                          <td className="px-4 py-4 font-bold">
                            {money(
                              order.groupTotal,
                              order.currency
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {order.itemCount}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {order.shippingMethod || '—'}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              {(order.availableActions || []).map(
                                (action) => {
                                  const config =
                                    ACTIONS[action]

                                  if (!config) {
                                    return null
                                  }

                                  const Icon =
                                    config.icon

                                  return (
                                    <button
                                      key={action}
                                      type="button"
                                      disabled={
                                        changingOrder ===
                                        order.id
                                      }
                                      onClick={() =>
                                        changeStatus(
                                          order,
                                          action
                                        )
                                      }
                                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black transition disabled:opacity-50 ${
                                        action === 'accepted'
                                          ? 'border border-black bg-black text-white hover:bg-slate-800'
                                          : action === 'rejected'
                                          ? 'border border-black bg-white text-black hover:bg-slate-100'
                                          : 'border border-black bg-white text-black hover:bg-black hover:text-white'
                                      }`}
                                    >
                                      <Icon />
                                      {ar
                                        ? config.ar
                                        : config.en}
                                    </button>
                                  )
                                }
                              )}

                              {!order.availableActions?.length && (
                                <span className="text-xs text-slate-400">
                                  {ar
                                    ? 'لا توجد إجراءات'
                                    : 'No actions'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {expanded === order.id && (
                          <tr key={`${order.id}-details`}>
                            <td
                              colSpan={isEldokanAdmin ? 12 : 11}
                              className="border-t border-slate-100 bg-slate-50/70 px-5 py-4"
                            >
                              <div className="space-y-3">
                                <div className="text-sm font-black text-slate-700">
                                  {ar
                                    ? 'منتجات الطلب'
                                    : 'Order Products'}
                                </div>

                                {(order.items || []).length ? (
                                  <div className="space-y-2">
                                    {(order.items || []).map(
                                      (item) => (
                                        <div
                                          key={
                                            item.itemId ||
                                            item.id
                                          }
                                          className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3"
                                        >
                                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                            {item.image ? (
                                              <img
                                                src={item.image || item.imageUrl || item.thumbnail || item.images?.[0]?.src || ''}
                                                alt={
                                                  item.name ||
                                                  ''
                                                }
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                  e.currentTarget.style.display =
                                                    'none'
                                                }}
                                              />
                                            ) : (
                                              <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] text-slate-400">
                                                {ar
                                                  ? 'بدون صورة'
                                                  : 'No image'}
                                              </div>
                                            )}
                                          </div>

                                          <div className="min-w-[180px] flex-1">
                                            <div className="font-black text-slate-900">
                                              {item.name ||
                                                '—'}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                              SKU:{' '}
                                              {item.sku ||
                                                '—'}
                                            </div>
                                          </div>

                                          <div className="min-w-[80px]">
                                            <div className="text-[11px] font-bold text-slate-400">
                                              {ar
                                                ? 'الكمية'
                                                : 'Qty'}
                                            </div>
                                            <div className="mt-1 font-black text-slate-800">
                                              {item.quantity ||
                                                0}
                                            </div>
                                          </div>

                                          <div className="min-w-[120px]">
                                            <div className="text-[11px] font-bold text-slate-400">
                                              {ar
                                                ? 'السعر'
                                                : 'Price'}
                                            </div>
                                            <div className="mt-1 font-black text-slate-800">
                                              {money(
                                                item.total,
                                                order.currency
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-400">
                                    {ar
                                      ? 'لا توجد منتجات في هذا الطلب'
                                      : 'No products in this order'}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}

                    {!orders.length && (
                      <tr>
                        <td
                          colSpan={isEldokanAdmin ? 12 : 11}
                          className="px-4 py-12 text-center text-slate-400"
                        >
                          {ar
                            ? 'لا توجد طلبات'
                            : 'No orders found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-500">
              <span>
                {ar
                  ? `إجمالي الطلبات المطابقة: ${Number(pagination.total || 0)}`
                  : `Total matching orders: ${Number(pagination.total || 0)}`}
              </span>
              <span>
                {ar ? '10 طلبات في الصفحة' : '10 orders per page'}
              </span>
            </div>
            <Pagination
              page={pagination.page || page}
              totalItems={pagination.total || 0}
              pageSize={10}
              onPageChange={(nextPage) => {
                setPage(nextPage)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              ar={ar}
            />
          </div>
</div>

      {selectedOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div
            dir={ar ? 'rtl' : 'ltr'}
            className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-2xl font-black text-black">
                  {ar ? 'تفاصيل الطلب' : 'Order Details'}
                  {selectedOrder?.number
                    ? ` #${selectedOrder.number}`
                    : ''}
                </h2>
                {selectedOrder?.status && (
                  <div className="mt-1 text-sm font-bold text-slate-500">
                    {orderStatusLabel(
                      selectedOrder.status,
                      selectedOrder.statusLabel,
                      ar
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={closeOrderDetails}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xl hover:bg-slate-50"
              >
                <FiX />
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-16 text-center text-slate-500">
                {ar
                  ? 'جاري تحميل تفاصيل الطلب...'
                  : 'Loading order details...'}
              </div>
            ) : detailsError ? (
              <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                {detailsError}
              </div>
            ) : selectedOrder ? (
              <div className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      {ar ? 'تاريخ الطلب' : 'Order Created'}
                    </div>
                    <div className="mt-2 font-black text-black">
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleString(
                            ar ? 'ar-EG' : 'en-GB'
                          )
                        : '—'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      {ar ? 'تم القبول' : 'Accepted At'}
                    </div>
                    <div className="mt-2 font-black text-black">
                      {selectedOrder.acceptedAt
                        ? new Date(selectedOrder.acceptedAt).toLocaleString(
                            ar ? 'ar-EG' : 'en-GB'
                          )
                        : '—'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      {ar ? 'استلمه الدكان' : 'Received by ElDokan'}
                    </div>
                    <div className="mt-2 font-black text-black">
                      {selectedOrder.receivedFromSellerAt
                        ? new Date(
                            selectedOrder.receivedFromSellerAt
                          ).toLocaleString(ar ? 'ar-EG' : 'en-GB')
                        : '—'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      {ar ? 'رقم الطلب' : 'Order Number'}
                    </div>
                    <div className="mt-2 font-black text-black">
                      #{selectedOrder.number || '—'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      {ar ? 'الحالة' : 'Status'}
                    </div>
                    <div className="mt-2 font-black text-black">
                      {orderStatusLabel(selectedOrder.status, selectedOrder.statusLabel, ar)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      {ar ? 'البائع' : 'Seller'}
                    </div>
                    <div className="mt-2 font-black text-black">
                      {selectedOrder.sellerName || '—'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      {ar ? 'الدفع' : 'Payment'}
                    </div>
                    <div className="mt-2 font-black text-black">
                      {selectedOrder.paymentMethod || '—'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      {ar ? 'الإجمالي' : 'Total'}
                    </div>
                    <div className="mt-2 font-black text-black">
                      {Number(selectedOrder.total || 0).toLocaleString()}{' '}
                      {selectedOrder.currency || ''}
                    </div>
                  </div>
                </div>

                {!['rejected'].includes(selectedOrder.status) && (
                <section className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="mb-5 text-lg font-black">
                    {ar ? 'مراحل الطلب' : 'Order Process'}
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {(selectedOrder.workflowTimeline || []).map(
                      (step, index) => {
                        const exceptional =
                          step.kind === 'exception'

                        return (
                          <div
                            key={`${step.key}-${index}`}
                            className={`shrink-0 rounded-2xl border p-4 ${
                              exceptional
                                ? 'border-red-200 bg-red-50'
                                : step.current
                                ? 'border-green-300 bg-emerald-50'
                                : step.completed
                                ? 'border-emerald-100 bg-emerald-50/50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                                  exceptional
                                    ? 'bg-red-600 text-white'
                                    : step.completed
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {exceptional
                                  ? '!'
                                  : step.completed
                                  ? '✓'
                                  : index + 1}
                              </div>

                              <div
                                className={`text-sm font-black ${
                                  exceptional
                                    ? 'text-red-700'
                                    : step.completed
                                    ? 'text-emerald-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {orderStatusLabel(
                                  step.key,
                                  step.label,
                                  ar
                                )}
                              </div>
                            </div>

                            {step.timestamp && (
                              <div className="mt-3 text-[11px] text-slate-500">
                                {new Date(
                                  step.timestamp
                                ).toLocaleString(
                                  ar ? 'ar-EG' : 'en-GB'
                                )}
                              </div>
                            )}
                          </div>
                        )
                      }
                    )}
                  </div>
                </section>
                )}

                <section className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="text-lg font-black">
                      {ar ? 'المنتجات' : 'Products'}
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-start text-xs font-black">
                            {ar ? 'المنتج' : 'Product'}
                          </th>
                          <th className="px-4 py-3 text-start text-xs font-black">
                            SKU
                          </th>
                          <th className="px-4 py-3 text-start text-xs font-black">
                            {ar ? 'الكمية' : 'Qty'}
                          </th>
                          <th className="px-4 py-3 text-start text-xs font-black">
                            {ar ? 'السعر' : 'Price'}
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {(selectedOrder.items || []).map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {item.image ? (
                                  <img
                                    src={item.image || item.imageUrl || item.thumbnail || item.images?.[0]?.src || ''}
                                    alt=""
                                    className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-slate-100" />
                                )}
                                <span className="font-bold">
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {item.sku || '—'}
                            </td>
                            <td className="px-4 py-4 text-sm font-bold">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-4 text-sm font-bold">
                              {Number(item.total || 0).toLocaleString()}{' '}
                              {selectedOrder.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="mb-4 text-lg font-black">
                      {ar ? 'ملخص المبلغ' : 'Order Summary'}
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>{ar ? 'الإجمالي الفرعي' : 'Subtotal'}</span>
                        <strong>
                          {Number(selectedOrder.subtotal || 0).toLocaleString()}{' '}
                          {selectedOrder.currency}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{ar ? 'الشحن' : 'Shipping'}</span>
                        <strong>
                          {Number(selectedOrder.shippingTotal || 0).toLocaleString()}{' '}
                          {selectedOrder.currency}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{ar ? 'الخصم' : 'Discount'}</span>
                        <strong>
                          {Number(selectedOrder.discountTotal || 0).toLocaleString()}{' '}
                          {selectedOrder.currency}
                        </strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                        <span className="font-black">
                          {ar ? 'الإجمالي' : 'Total'}
                        </span>
                        <strong>
                          {Number(selectedOrder.total || 0).toLocaleString()}{' '}
                          {selectedOrder.currency}
                        </strong>
                      </div>
                    </div>
                  </section>

                                    <section className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="mb-3 text-lg font-black">
                      {ar ? 'اكتب رسالة للدكان' : 'Write a Note to ElDokan'}
                    </h3>

                    <textarea
                      value={sellerReply}
                      onChange={(e) =>
                        setSellerReply(e.target.value)
                      }
                      rows={4}
                      maxLength={2000}
                      placeholder={
                        ar
                          ? 'اكتب ملاحظتك أو رسالتك هنا...'
                          : 'Write your note or message here...'
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-black"
                    />

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={
                          replySending ||
                          !sellerReply.trim()
                        }
                        onClick={sendSellerReply}
                        className="rounded-xl bg-black px-5 py-3 text-sm font-black text-white disabled:opacity-40"
                      >
                        {replySending
                          ? ar
                            ? 'جاري الإرسال...'
                            : 'Sending...'
                          : ar
                          ? 'إرسال للدكان'
                          : 'Send to ElDokan'}
                      </button>

                      {replyMessage && (
                        <span className="text-sm font-bold text-emerald-700">
                          {replyMessage}
                        </span>
                      )}

                      {replyError && (
                        <span className="text-sm font-bold text-red-600">
                          {replyError}
                        </span>
                      )}
                    </div>

                    {!!selectedOrder.sellerReplies?.length && (
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="mb-3 text-sm font-black">
                          {ar
                            ? 'رسائلك السابقة'
                            : 'Your Previous Notes'}
                        </div>

                        <div className="space-y-2">
                          {selectedOrder.sellerReplies.map(
                            (reply) => (
                              <div
                                key={reply.id}
                                className="rounded-xl bg-slate-50 p-3"
                              >
                                <div className="text-sm text-slate-700">
                                  {reply.content}
                                </div>
                                <div className="mt-1 text-[10px] text-slate-400">
                                  {reply.date
                                    ? new Date(
                                        reply.date
                                      ).toLocaleString(
                                        ar
                                          ? 'ar-EG'
                                          : 'en-GB'
                                      )
                                    : ''}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </section>

<section className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="mb-4 text-lg font-black">
                      {ar ? 'رسائل الدكان' : 'Messages from ElDokan'}
                    </h3>

                    <div className="max-h-72 space-y-3 overflow-y-auto">
                      {(selectedOrder.notes || []).map((note) => (
                        <div
                          key={note.id}
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <div className="text-sm text-slate-700">
                            {note.content}
                          </div>
                          <div className="mt-2 text-xs text-slate-400">
                            {note.date
                              ? new Date(note.date).toLocaleString(
                                  ar ? 'ar-EG' : 'en-GB'
                                )
                              : ''}
                          </div>
                        </div>
                      ))}

                      {!selectedOrder.notes?.length && (
                        <div className="py-8 text-center text-sm text-slate-400">
                          {ar
                            ? 'لا توجد رسائل من الدكان.'
                            : 'No messages from ElDokan.'}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </div>
</div>
      )}

    </AccountLayout>
  )
}
