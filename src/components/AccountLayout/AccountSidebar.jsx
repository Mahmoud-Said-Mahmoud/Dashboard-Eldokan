import { useState } from 'react'
import { logoutUser } from '../../lib/authApi'
import {
  FiBell,
  FiHome,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
  FiShoppingBag,
  FiSettings,
  FiPlus,
  FiLogOut,
  FiBarChart2,
  FiMessageCircle,
  FiAlertTriangle,
  FiTrash2,
} from 'react-icons/fi'

export default function AccountSidebar({
  mobile = false,
  collapsed = false,
  onToggleCollapsed,
  language,
  active,
  role,
  permissions = {},
  onHome,
  onSettings,
  onOrders,
  onProducts,
  onAddProduct,
  onLogout,

  notifications,
  notificationsOpen,
  onToggleNotifications,
  onOpenNotification,
  onDeleteNotification,
  onClearNotifications,
}) {
  const ar = language === 'ar'
  const isOwner = role === 'eldokan_owner'
  const compact = !mobile && collapsed

  let signedInUser

  try {
    signedInUser = JSON.parse(localStorage.getItem('auth_user') || 'null')
  } catch {
    signedInUser = null
  }

  const signedInName =
    signedInUser?.displayName ||
    signedInUser?.display_name ||
    signedInUser?.name ||
    signedInUser?.user_login ||
    signedInUser?.email ||
    ''

  const canSettings = isOwner || permissions.accessSettings || permissions.manageHolidayMode
  const canOrders = isOwner || permissions.viewOrders
  const canProducts = isOwner || permissions.viewProducts
  const canAddProduct = isOwner || permissions.addProducts
  const canReports = isOwner || permissions.viewReports
  const canNotifications = isOwner || permissions.viewNotifications
  const canDeleteNotifications = isOwner || permissions.deleteNotifications
  const canClearNotifications = isOwner || permissions.clearNotifications

  const [productsOpen, setProductsOpen] = useState(
    active === 'products' || active === 'add-product'
  )

  async function handleLogout() {
    try {
      await logoutUser()
    } finally {
      onLogout()
    }
  }

  const itemClass = (name) =>
    compact
      ? `flex h-12 w-full items-center justify-center rounded-2xl px-2 text-xl transition ${
          active === name
            ? 'bg-green-50 text-green-700'
            : 'text-slate-700 hover:bg-slate-100'
        }`
      : `w-full rounded-2xl px-4 py-3 text-start text-sm font-bold transition ${
          active === name
            ? 'bg-green-50 text-green-700'
            : 'text-slate-700 hover:bg-slate-100'
        }`

  const labelClass = compact
    ? 'flex items-center justify-center text-xl'
    : 'inline-flex items-center gap-2'

  function notificationVisual(notification) {
    const type = notification?.type || ''

    if (type === 'seller-message' || type === 'seller-note') {
      return {
        Icon: FiMessageCircle,
        wrapper: 'bg-blue-50 text-blue-700',
        label: ar ? 'رسالة' : 'Message',
      }
    }

    if (type === 'low-stock' || type === 'out-of-stock') {
      return {
        Icon: FiPackage,
        wrapper: 'bg-amber-50 text-amber-700',
        label: ar ? 'مخزون' : 'Stock',
      }
    }

    if (type === 'seller-performance-alert' || type === 'fulfillment-overdue') {
      return {
        Icon: FiAlertTriangle,
        wrapper: 'bg-red-50 text-red-700',
        label: ar ? 'تنبيه' : 'Alert',
      }
    }

    return {
      Icon: FiShoppingBag,
      wrapper: 'bg-emerald-50 text-emerald-700',
      label: ar ? 'طلب' : 'Order',
    }
  }

  const CollapseIcon = ar
    ? collapsed
      ? FiChevronLeft
      : FiChevronRight
    : collapsed
      ? FiChevronRight
      : FiChevronLeft

  const desktopSideClass = ar ? 'right-0' : 'left-0'
  const toggleSideClass = ar ? '-left-4' : '-right-4'
  const notificationSideClass = ar
    ? compact
      ? 'right-[96px]'
      : 'right-[272px]'
    : compact
      ? 'left-[96px]'
      : 'left-[272px]'

  return (
    <aside
      dir={ar ? 'rtl' : 'ltr'}
      className={
        mobile
          ? 'flex h-full w-full flex-col bg-white'
          : `fixed inset-y-0 ${desktopSideClass} z-40 hidden h-dvh shrink-0 border-e border-slate-200 bg-white transition-[width] duration-300 lg:flex lg:flex-col ${
              compact ? 'w-20' : 'w-64'
            }`
      }
    >
      {!mobile && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={
            collapsed
              ? ar
                ? 'توسيع القائمة'
                : 'Expand sidebar'
              : ar
                ? 'تصغير القائمة'
                : 'Collapse sidebar'
          }
          aria-label={
            collapsed
              ? ar
                ? 'توسيع القائمة'
                : 'Expand sidebar'
              : ar
                ? 'تصغير القائمة'
                : 'Collapse sidebar'
          }
          className={`absolute top-24 ${toggleSideClass} z-50 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-black`}
        >
          <CollapseIcon />
        </button>
      )}

      <div
        className={`flex shrink-0 items-center justify-center border-b border-slate-200 transition-all duration-300 ${
          compact ? 'h-20 px-2 py-3' : 'px-5 py-4'
        }`}
      >
        <img
          src={compact ? '/eldokan-favicon.png' : '/eldokan-logo.png'}
          alt="ElDokan"
          className={
            compact
              ? 'h-12 w-12 object-contain'
              : 'mx-auto h-16 w-auto max-w-full object-contain'
          }
        />
      </div>

      {!compact && signedInName && (
        <div className="mx-4 mb-4 mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-[10px] font-bold text-slate-400">
            {ar ? 'مسجل الدخول' : 'Signed in as'}
          </div>
          <div className="mt-1 truncate text-sm font-black text-slate-950">
            {signedInName}
          </div>
        </div>
      )}

      {/* Sidebar Notifications */}
      {canNotifications && (
        <div className={`relative ${compact ? 'mx-2 mb-2 mt-3' : 'mx-4 mb-4'}`}>
          <button
            type="button"
            onClick={onToggleNotifications}
            title={ar ? 'الإشعارات' : 'Notifications'}
            className={
              compact
                ? `relative flex h-12 w-full items-center justify-center rounded-2xl border text-xl transition ${
                    notificationsOpen
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`
                : `flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-bold transition ${
                    notificationsOpen
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`
            }
          >
            {compact ? (
              <span className="relative flex h-9 w-9 items-center justify-center">
                <FiBell />
                {(notifications?.length || 0) > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-black text-white">
                    {notifications.length > 99 ? '99+' : notifications.length}
                  </span>
                )}
              </span>
            ) : (
              <>
                <span className="flex items-center gap-3">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-base">
                    <FiBell />
                    {canClearNotifications && (notifications?.length || 0) > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-black text-white">
                        {notifications.length}
                      </span>
                    )}
                  </span>
                  <span>{ar ? 'الإشعارات' : 'Notifications'}</span>
                </span>

                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{notifications?.length || 0}</span>
                  {notificationsOpen ? <FiChevronUp /> : <FiChevronDown />}
                </span>
              </>
            )}
          </button>

          {notificationsOpen && (
            <div
              className={
                mobile
                  ? 'fixed inset-x-3 top-24 z-[140] max-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'
                  : `fixed top-24 z-[120] w-[380px] max-w-[calc(100vw-112px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ${notificationSideClass}`
              }
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-black text-black">
                    {ar ? 'الإشعارات' : 'Notifications'}
                  </div>
                  {(notifications?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (
                          window.confirm(
                            ar
                              ? 'حذف كل الإشعارات نهائيًا؟'
                              : 'Delete all notifications permanently?'
                          )
                        ) {
                          onClearNotifications?.()
                        }
                      }}
                      className="text-xs font-black text-red-600 hover:text-red-800"
                    >
                      {ar ? 'حذف الكل' : 'Delete All'}
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {ar
                    ? 'اضغط على أي إشعار لعرض الرسالة.'
                    : 'Click a notification to open the message.'}
                </div>
              </div>

              <div className="max-h-[480px] overflow-y-auto">
                {(notifications?.length || 0) > 0 ? (
                  notifications.map((notification) => {
                    const visual = notificationVisual(notification)
                    const NotificationIcon = visual.Icon

                    return (
                      <div
                        key={notification.id}
                        className={`group relative border-b border-slate-100 transition ${
                          notification.read ? 'bg-white' : 'bg-emerald-50/30'
                        } hover:bg-slate-50`}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenNotification?.(notification)}
                          className={`flex w-full items-start gap-3 px-4 py-4 text-start ${
                            canDeleteNotifications ? 'pe-12' : ''
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.wrapper}`}
                          >
                            <NotificationIcon />
                          </span>

                          <span className="min-w-0 flex-1 overflow-hidden">
                            <span className="flex items-center gap-2">
                              <span className="block break-words font-black leading-5 text-slate-950 [overflow-wrap:anywhere]">
                                {notification.title || visual.label}
                              </span>
                              {!notification.read && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                              )}
                            </span>

                            <span className="mt-1 block line-clamp-3 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                              {notification.message}
                            </span>

                            <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400">
                              <span className="rounded-full bg-slate-100 px-2 py-1">
                                {visual.label}
                              </span>
                              {notification.orderNumber && (
                                <span>#{notification.orderNumber}</span>
                              )}
                              {notification.createdAt && (
                                <span>
                                  {new Date(notification.createdAt).toLocaleString(
                                    ar ? 'ar-EG' : 'en-GB'
                                  )}
                                </span>
                              )}
                            </span>
                          </span>
                        </button>

                        {canDeleteNotifications && (
                          <button
                            type="button"
                            title={
                              ar
                                ? 'حذف الإشعار نهائيًا'
                                : 'Delete notification permanently'
                            }
                            onClick={(event) => {
                              event.stopPropagation()
                              if (
                                window.confirm(
                                  ar
                                    ? 'حذف هذا الإشعار نهائيًا؟'
                                    : 'Delete this notification permanently?'
                                )
                              ) {
                                onDeleteNotification?.(notification.id)
                              }
                            }}
                            className={`absolute top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 ${
                              ar ? 'left-3' : 'right-3'
                            }`}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="p-8 text-center text-sm text-slate-400">
                    {ar ? 'لا توجد إشعارات' : 'No notifications'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <nav
        className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto ${
          compact ? 'px-2 py-1' : 'p-4'
        }`}
      >
        <button
          type="button"
          onClick={onHome}
          title={ar ? 'الرئيسية' : 'Home'}
          className={itemClass('home')}
        >
          <span className={labelClass}>
            <FiHome />
            {!compact && (ar ? 'الرئيسية' : 'Home')}
          </span>
        </button>

        {canOrders && (
          <button
            type="button"
            onClick={() => onOrders?.()}
            title={ar ? 'الطلبات' : 'Orders'}
            className={itemClass('orders')}
          >
            <span className={labelClass}>
              <FiShoppingBag />
              {!compact && (ar ? 'الطلبات' : 'Orders')}
            </span>
          </button>
        )}

        {canProducts && (
          <div>
            <button
              type="button"
              onClick={() => {
                if (!compact) setProductsOpen(true)
                onProducts()
              }}
              title={ar ? 'المنتجات' : 'Products'}
              className={`${itemClass('products')} ${
                compact ? '' : 'flex items-center justify-between'
              }`}
            >
              <span className={labelClass}>
                <FiPackage />
                {!compact && (ar ? 'المنتجات' : 'Products')}
              </span>

              {!compact && canAddProduct && (
                <span
                  onClick={(event) => {
                    event.stopPropagation()
                    setProductsOpen((current) => !current)
                  }}
                  className={`text-xs transition-transform ${
                    productsOpen ? 'rotate-180' : ''
                  }`}
                >
                  <FiChevronDown />
                </span>
              )}
            </button>

            {compact && canAddProduct && (
              <button
                type="button"
                onClick={onAddProduct}
                title={ar ? 'إضافة منتج' : 'Add Product'}
                className={`mt-1 flex h-11 w-full items-center justify-center rounded-2xl text-lg transition ${
                  active === 'add-product'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FiPlus />
              </button>
            )}

            {!compact && productsOpen && canAddProduct && (
              <div className="mt-1 ps-4">
                <button
                  type="button"
                  onClick={onAddProduct}
                  className={`w-full rounded-xl px-4 py-2.5 text-start text-sm font-bold ${
                    active === 'add-product'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FiPlus />
                    {ar ? 'إضافة منتج' : 'Add Product'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {canReports && (
          <button
            type="button"
            onClick={() => window.location.assign('/reports')}
            title={ar ? 'التقارير' : 'Reports'}
            className={itemClass('reports')}
          >
            <span className={labelClass}>
              <FiBarChart2 />
              {!compact && (ar ? 'التقارير' : 'Reports')}
            </span>
          </button>
        )}

        {canSettings && (
          <button
            type="button"
            onClick={onSettings}
            title={ar ? 'الإعدادات' : 'Settings'}
            className={itemClass('settings')}
          >
            <span className={labelClass}>
              <FiSettings />
              {!compact && (ar ? 'الإعدادات' : 'Settings')}
            </span>
          </button>
        )}
      </nav>

      <div className={`shrink-0 border-t border-slate-200 ${compact ? 'p-2' : 'p-4'}`}>
        <button
          type="button"
          onClick={handleLogout}
          title={ar ? 'تسجيل الخروج' : 'Logout'}
          className={
            compact
              ? 'flex h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white text-xl text-slate-700 transition hover:bg-slate-50'
              : 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50'
          }
        >
          <span className={compact ? 'flex items-center justify-center' : 'inline-flex items-center gap-2'}>
            <FiLogOut />
            {!compact && (ar ? 'تسجيل الخروج' : 'Logout')}
          </span>
        </button>
      </div>
    </aside>
  )
}
