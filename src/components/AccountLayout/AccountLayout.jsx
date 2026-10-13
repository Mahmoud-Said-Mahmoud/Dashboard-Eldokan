import { useEffect, useState } from 'react'
import { FiX, FiExternalLink, FiMenu } from 'react-icons/fi'
import AccountSidebar from './AccountSidebar'
import {
  getNotifications,
  markNotificationRead,
  deleteNotification,
  clearNotifications,
} from '../../lib/productApi'

export default function AccountLayout({
  language,
  role,
  permissions,
  active,
  onHome,
  onSettings,
  onOrders,
  onProducts,
  onAddProduct,
  onLogout,
  children,
}) {
  const ar = language === 'ar'

  const [notifications, setNotifications] = useState([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('eldokan_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderLoading] = useState(false)
  const [orderError, setOrderError] = useState('')

  async function loadNotifications() {
    try {
      const response = await getNotifications()
      setNotifications(
        Array.isArray(response?.notifications)
          ? response.notifications
          : []
      )
    } catch {
      // Keep navigation usable even if notification API is temporarily unavailable.
    }
  }

  useEffect(() => {
    loadNotifications()

    // Poll only while the tab is visible, and refresh as soon as it is shown
    // again, so background tabs do not keep hitting the API.
    const timer = setInterval(() => {
      if (!document.hidden) loadNotifications()
    }, 30000)

    function handleVisibility() {
      if (!document.hidden) loadNotifications()
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  async function openNotification(notification) {
    if (!notification) return

    setNotificationsOpen(false)

    // Mark as read immediately in both API and UI.
    if (notification.id) {
      setNotifications((current) =>
        current.map((item) =>
          String(item.id) === String(notification.id)
            ? { ...item, read: true }
            : item
        )
      )

      try {
        await markNotificationRead(
          notification.id
        )
      } catch {
        // Navigation should still work if read-state update fails.
      }
    }

    const sourceLink =
      notification.link ||
      (notification.orderId
        ? `/orders?open=${encodeURIComponent(notification.orderId)}`
        : notification.productId
        ? `/products/${encodeURIComponent(notification.productId)}/edit`
        : '/')

    window.location.assign(sourceLink)
  }

  function closeNotificationModal() {
    setSelectedNotification(null)
    setSelectedOrder(null)
    setOrderError('')
  }

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem('eldokan_sidebar_collapsed', next ? '1' : '0')
      } catch {
        // Keep the sidebar usable even when browser storage is unavailable.
      }
      return next
    })
  }

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      className="min-h-screen bg-white"
    >
      <div className="flex min-h-screen w-full items-start">
        <AccountSidebar
          language={language}
          role={role}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
          permissions={permissions}
          active={active}
          onHome={onHome}
          onSettings={onSettings}
          onOrders={onOrders}
          onProducts={onProducts}
          onAddProduct={onAddProduct}
          onLogout={onLogout}
          notifications={notifications}
          notificationsOpen={notificationsOpen}
          onToggleNotifications={() => setNotificationsOpen((value) => !value)}
          onOpenNotification={openNotification}
          onDeleteNotification={async (id) => {
            await deleteNotification(id)
            setNotifications((current) => current.filter((item) => String(item.id) !== String(id)))
          }}
          onClearNotifications={async () => {
            await clearNotifications()
            setNotifications([])
          }}
        />

        <div
          aria-hidden="true"
          className={`hidden shrink-0 transition-[width] duration-300 lg:block ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        />

        <main className="min-w-0 w-0 flex-1 overflow-x-hidden">
          <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
            <img src="/eldokan-logo.png" alt="ElDokan" className="h-10 w-auto object-contain" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-800 shadow-sm"
              aria-label={ar ? 'فتح القائمة' : 'Open menu'}
            >
              <FiMenu />
            </button>
          </div>

          <div className="eldokan-responsive-content min-w-0 w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[130] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
          />
          <div className={`absolute top-0 h-full w-[min(88vw,340px)] bg-white shadow-2xl ${ar ? 'right-0' : 'left-0'}`}>
            <div className="absolute top-3 z-[150] end-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm"
                aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
              >
                <FiX />
              </button>
            </div>
            <AccountSidebar
              mobile
              language={language}
              role={role}
              permissions={permissions}
              active={active}
              onHome={() => { setMobileMenuOpen(false); onHome?.() }}
              onSettings={() => { setMobileMenuOpen(false); onSettings?.() }}
              onOrders={() => { setMobileMenuOpen(false); onOrders?.() }}
              onProducts={() => { setMobileMenuOpen(false); onProducts?.() }}
              onAddProduct={() => { setMobileMenuOpen(false); onAddProduct?.() }}
              onLogout={() => { setMobileMenuOpen(false); onLogout?.() }}
              notifications={notifications}
              notificationsOpen={notificationsOpen}
              onToggleNotifications={() => setNotificationsOpen((value) => !value)}
              onOpenNotification={openNotification}
              onDeleteNotification={async (id) => {
                await deleteNotification(id)
                setNotifications((current) => current.filter((item) => String(item.id) !== String(id)))
              }}
              onClearNotifications={async () => {
                await clearNotifications()
                setNotifications([])
              }}
            />
          </div>
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div
            dir={ar ? 'rtl' : 'ltr'}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <h2 className="text-xl font-black text-black">
                  {selectedNotification.type ===
                  'seller-message'
                    ? ar
                      ? 'رسالة من الدكان'
                      : 'Message from ElDokan'
                    : selectedNotification.title}
                </h2>

                {selectedNotification.orderNumber && (
                  <div className="mt-1 text-sm font-bold text-slate-500">
                    {ar
                      ? 'الطلب'
                      : 'Order'} 
                    #
                    {
                      selectedNotification.orderNumber
                    }
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={closeNotificationModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
              >
                <FiX />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-slate-800">
                {selectedNotification.message}
              </div>

              {selectedNotification.createdAt && (
                <div className="mt-3 text-xs text-slate-400">
                  {new Date(
                    selectedNotification.createdAt
                  ).toLocaleString(
                    ar ? 'ar-EG' : 'en-GB'
                  )}
                </div>
              )}

              {orderLoading && (
                <div className="mt-6 rounded-xl border border-slate-200 p-5 text-center text-sm text-slate-500">
                  {ar
                    ? 'جاري تحميل الطلب...'
                    : 'Loading order...'}
                </div>
              )}

              {orderError && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                  {orderError}
                </div>
              )}

              {selectedOrder && (
                <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-bold text-slate-400">
                        {ar
                          ? 'الحالة'
                          : 'Status'}
                      </div>
                      <div className="mt-1 font-black">
                        {
                          selectedOrder.statusLabel ||
                          selectedOrder.status ||
                          '—'
                        }
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-400">
                        {ar
                          ? 'الإجمالي'
                          : 'Total'}
                      </div>
                      <div className="mt-1 font-black">
                        {Number(
                          selectedOrder.total || 0
                        ).toLocaleString()} 
                        {
                          selectedOrder.currency || ''
                        }
                      </div>
                    </div>
                  </div>

                  {onOrders && (
                    <button
                      type="button"
                      onClick={() => {
                        closeNotificationModal()
                        onOrders()
                      }}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-black text-white"
                    >
                      <FiExternalLink />
                      {ar
                        ? 'فتح الطلبات'
                        : 'Open Orders'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
