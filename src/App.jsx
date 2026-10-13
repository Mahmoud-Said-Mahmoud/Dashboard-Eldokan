import { lazy, useEffect, useState } from 'react'
import Login from './components/Login/Login'
import Register from './components/Register/Register'

// Each dashboard page is its own chunk, so the login screen does not download
// charts, the spreadsheet exporter and every other page up front.
const PAGE_LOADERS = {
  Accounts: () => import('./pages/Accounts/Accounts'),
  AddAccount: () => import('./pages/AddAccount/AddAccount'),
  AddProduct: () => import('./pages/AddProduct/AddProduct'),
  Products: () => import('./pages/Products/Products'),
  Orders: () => import('./pages/Orders/Orders'),
  Home: () => import('./pages/Home/Home'),
  Settings: () => import('./pages/Settings/Settings'),
  SellerCenterModule: () => import('./pages/SellerCenter/SellerCenterModule'),
  EditProduct: () => import('./pages/EditProduct/EditProduct'),
}

const CHUNK_RELOAD_KEY = 'eldokan_chunk_reload'

// After a new build is deployed, a tab that was already open still points at
// the old page files. If one is missing, reload once to pick up the new build.
function lazyPage(name) {
  return lazy(() =>
    PAGE_LOADERS[name]().then(
      (module) => {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
        return module
      },
      (error) => {
        if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          window.location.reload()
          return new Promise(() => {})
        }
        throw error
      }
    )
  )
}

const Accounts = lazyPage('Accounts')
const AddAccount = lazyPage('AddAccount')
const AddProduct = lazyPage('AddProduct')
const Products = lazyPage('Products')
const Orders = lazyPage('Orders')
const Home = lazyPage('Home')
const Settings = lazyPage('Settings')
const SellerCenterModule = lazyPage('SellerCenterModule')
const EditProduct = lazyPage('EditProduct')

// The pages a seller opens most. They are downloaded in the background once
// the first screen is idle, so moving between them is instant.
const PRELOAD_PAGES = ['Home', 'Orders', 'Products', 'AddProduct']
import { translations } from './lib/i18n'
import { getCurrentUser } from './lib/authApi'

const APP_BASE = ''

const ROUTES = {
  login: `${APP_BASE}/login`,
  register: `${APP_BASE}/register`,
  home: '/',
  orders: `${APP_BASE}/orders`,
  products: `${APP_BASE}/products`,
  inventory: `${APP_BASE}/inventory`,
  promotions: `${APP_BASE}/promotions`,
  finance: `${APP_BASE}/finance`,
  performance: `${APP_BASE}/performance`,
  reports: `${APP_BASE}/reports`,
  notifications: `${APP_BASE}/notifications`,
  'add-product': `${APP_BASE}/products/add`,
  'import-products': `${APP_BASE}/products/import`,
  settings: `${APP_BASE}/settings`,
  accounts: `${APP_BASE}/settings/accounts`,
  'add-account': `${APP_BASE}/settings/accounts/add`,
  'no-access': `${APP_BASE}/access-denied`,
}

const PATH_TO_SCREEN = Object.fromEntries(
  Object.entries(ROUTES).map(([screen, path]) => [path, screen])
)

function screenFromPath(pathname) {
  const clean =
    pathname !== '/' && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname

  if (/^\/products\/\d+\/edit$/.test(clean)) {
    return 'edit-product'
  }

  return PATH_TO_SCREEN[clean] || null
}

function enhanceResponsiveTables() {
  const root = document.querySelector('#root')
  if (!root) return

  root.querySelectorAll('.eldokan-page table').forEach((table) => {
    table.classList.add('eldokan-stack-table')

    const headers = Array.from(
      table.querySelectorAll('thead tr:first-child th')
    ).map((cell, index) => {
      const text = (cell.textContent || '').replace(/\s+/g, ' ').trim()
      return text || cell.getAttribute('aria-label') || 'Column ' + (index + 1)
    })

    Array.from(table.querySelectorAll('tbody tr')).forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (!['TD', 'TH'].includes(cell.tagName)) return

        if (cell.hasAttribute('colspan')) {
          cell.removeAttribute('data-label')
          return
        }

        const label = headers[index] || ''
        cell.setAttribute('data-label', label)
      })
    })

    let parent = table.parentElement
    while (parent && parent !== root) {
      if (parent.classList.contains('overflow-x-auto')) {
        parent.classList.add('eldokan-table-scroll-wrapper')
      }
      parent = parent.parentElement
    }
  })
}


function App() {
  const [screen, setScreen] = useState('loading')
  const [currentUser, setCurrentUser] = useState(null)
  const [language, setLanguage] = useState(
    () => localStorage.getItem('language') || 'ar'
  )

  useEffect(() => {
    localStorage.setItem('language', language)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  function defaultScreenForUser(user) {
    return user ? 'home' : 'login'
  }

  function canOpenScreen(user, target) {
    if (!user) {
      return target === 'login' || target === 'register'
    }

    const permissions = user?.permissions || {}
    const isOwner = user?.role === 'eldokan_owner'

    switch (target) {
      case 'home':
        return isOwner || permissions.viewDashboard !== false

      case 'orders':
        return isOwner || permissions.viewOrders

      case 'products':
      case 'inventory':
      case 'promotions':
        return (
          isOwner ||
          permissions.viewProducts ||
          permissions.viewPrices
        )

      case 'performance':
        return isOwner || permissions.viewPerformance

      case 'reports':
        return isOwner || permissions.viewReports

      case 'notifications':
        return isOwner || permissions.viewNotifications

      case 'finance':
        return isOwner || permissions.viewFinance

      case 'add-product':
        return isOwner || permissions.addProducts

      case 'edit-product':
        return isOwner || permissions.editProducts || permissions.editPrices || permissions.editStock

      case 'import-products':
        return isOwner || permissions.importProducts

      case 'settings':
        return isOwner || permissions.accessSettings || permissions.manageHolidayMode

      case 'accounts':
        return isOwner || permissions.viewAccounts

      case 'add-account':
        return isOwner || permissions.createAccounts

      case 'no-access':
        return true

      default:
        return false
    }
  }

  function setBrowserRoute(target, { replace = false } = {}) {
    const path = ROUTES[target] || ROUTES.home

    if (replace) {
      window.history.replaceState({ screen: target }, '', path)
    } else if (window.location.pathname !== path) {
      window.history.pushState({ screen: target }, '', path)
    }

    setScreen(target)
  }

  function navigateToOrders() {
    if (!currentUser) {
      setBrowserRoute('login')
      return
    }

    if (!canOpenScreen(currentUser, 'orders')) {
      setBrowserRoute('no-access')
      return
    }

    // Orders navigation always opens the unfiltered All view.
    // Do not accept the React click event as a status value.
    window.history.pushState(
      { screen: 'orders' },
      '',
      ROUTES.orders
    )

    setScreen('orders')
  }

  function navigateTo(target) {
    if (target === 'login' || target === 'register') {
      setBrowserRoute(target)
      return
    }

    if (!currentUser) {
      setBrowserRoute('login')
      return
    }

    if (!canOpenScreen(currentUser, target)) {
      setBrowserRoute('no-access')
      return
    }

    setBrowserRoute(target)
  }


  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const requestedScreen = screenFromPath(window.location.pathname)

      try {
        const data = await getCurrentUser()
        const user = data?.user || null

        if (!user) {
          throw new Error('Session user not found')
        }

        if (cancelled) return

        setCurrentUser(user)

        let target = requestedScreen || defaultScreenForUser(user)

        if (target === 'login' || target === 'register') {
          target = defaultScreenForUser(user)
        }

        if (!canOpenScreen(user, target)) {
          target = 'no-access'
        }

        window.history.replaceState(
          { screen: target },
          '',
          target === 'edit-product'
            ? window.location.pathname
            : ROUTES[target] || ROUTES.home
        )

        setScreen(target)
      } catch (error) {
        // Only an actual authentication failure should close the session.
        // Gateway/server/network errors (including 502) must NOT log the seller out.
        const isUnauthorized =
          error?.httpStatus === 401 ||
          error?.status === 401 ||
          error?.code === 'rest_not_logged_in' ||
          error?.code === 'eldokan_invalid_token'

        if (isUnauthorized) {
          sessionStorage.removeItem('eldokan_session_token')
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          localStorage.removeItem('eldokan_screen')

          if (!cancelled) {
            setCurrentUser(null)
            window.history.replaceState({ screen: 'login' }, '', ROUTES.login)
            setScreen('login')
          }
          return
        }

        // For temporary backend errors use the last authenticated user saved locally.
        // This keeps refresh on the same protected route instead of closing the dashboard.
        let cachedUser
        try {
          cachedUser = JSON.parse(
            localStorage.getItem('auth_user') || 'null'
          )
        } catch {
          cachedUser = null
        }

        if (!cancelled && cachedUser) {
          setCurrentUser(cachedUser)

          let target =
            requestedScreen ||
            localStorage.getItem('eldokan_screen') ||
            defaultScreenForUser(cachedUser)

          if (
            target === 'login' ||
            target === 'register' ||
            !canOpenScreen(cachedUser, target)
          ) {
            target = defaultScreenForUser(cachedUser)
          }

          window.history.replaceState(
            { screen: target },
            '',
            target === 'edit-product'
              ? window.location.pathname
              : ROUTES[target] || ROUTES.home
          )
          setScreen(target)
          return
        }

        // Token exists but the server is temporarily unavailable.
        // Keep the token and route; never convert a 502 into a logout.
        if (!cancelled) {
          setScreen(requestedScreen || 'home')
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])


  useEffect(() => {
    if (
      currentUser &&
      screen !== 'loading' &&
      screen !== 'login' &&
      screen !== 'register'
    ) {
      localStorage.setItem('eldokan_screen', screen)
    }
  }, [screen, currentUser])

  useEffect(() => {
    if (!currentUser || navigator.connection?.saveData) return undefined

    const schedule =
      window.requestIdleCallback ||
      ((callback) => window.setTimeout(callback, 1500))
    const cancel = window.cancelIdleCallback || window.clearTimeout

    const id = schedule(() => {
      PRELOAD_PAGES.forEach((name) => {
        PAGE_LOADERS[name]().catch(() => {})
      })
    })

    return () => cancel(id)
  }, [currentUser])

  useEffect(() => {
    function handlePopState() {
      const target = screenFromPath(window.location.pathname)

      if (!target) {
        navigateTo(currentUser ? 'home' : 'login')
        return
      }

      if (target === 'login' || target === 'register') {
        if (currentUser) {
          navigateTo(defaultScreenForUser(currentUser))
        } else {
          setScreen(target)
        }
        return
      }

      if (currentUser && canOpenScreen(currentUser, target)) {
        setScreen(target)
      } else if (currentUser) {
        setScreen('no-access')
      } else {
        setScreen('login')
      }
    }

    function handleAuthExpired() {
      sessionStorage.removeItem('eldokan_session_token')
      setCurrentUser(null)
      window.history.replaceState({ screen: 'login' }, '', ROUTES.login)
      setScreen('login')
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('eldokan:auth-expired', handleAuthExpired)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('eldokan:auth-expired', handleAuthExpired)
    }
  }, [currentUser])

  useEffect(() => {
    let rafId = 0
    let debounceId = 0

    const applyResponsiveTables = () => {
      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        enhanceResponsiveTables()
      })
    }

    applyResponsiveTables()

    const observer = new MutationObserver(() => {
      window.clearTimeout(debounceId)
      debounceId = window.setTimeout(applyResponsiveTables, 40)
    })

    const root = document.querySelector('#root')
    if (root) {
      observer.observe(root, { childList: true, subtree: true })
    }

    window.addEventListener('resize', applyResponsiveTables)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(debounceId)
      observer.disconnect()
      window.removeEventListener('resize', applyResponsiveTables)
    }
  }, [screen, language, currentUser])

  const t = translations[language]

  const toggleLanguage = () =>
    setLanguage((current) => (current === 'ar' ? 'en' : 'ar'))

  function handleLoginSuccess(user) {
    setCurrentUser(user || null)

    if (user) {
      const nextScreen = defaultScreenForUser(user)
      localStorage.setItem('eldokan_screen', nextScreen)
      setBrowserRoute(nextScreen, { replace: true })
    } else {
      setScreen('login')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('eldokan_session_token')
    localStorage.removeItem('eldokan_screen')
    setCurrentUser(null)
    setBrowserRoute('login', { replace: true })
  }

  const isPublicScreen =
    screen === 'login' || screen === 'register'

  if (
    currentUser &&
    screen !== 'loading' &&
    !isPublicScreen &&
    screen !== 'no-access' &&
    !canOpenScreen(currentUser, screen)
  ) {
    return (
      <main
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="flex min-h-screen items-center justify-center bg-slate-100 p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="text-5xl font-black text-red-600">403</div>
          <h1 className="mt-4 text-2xl font-black">
            {language === 'ar' ? 'غير مسموح بالدخول' : 'Access Denied'}
          </h1>
          <p className="mt-3 text-slate-500">
            {language === 'ar'
              ? 'الحساب الحالي لا يملك صلاحية فتح هذه الصفحة.'
              : 'Your account does not have permission to open this page.'}
          </p>
          <button
            type="button"
            onClick={() => navigateTo(defaultScreenForUser(currentUser))}
            className="mt-6 rounded-xl bg-black px-5 py-3 font-bold text-white"
          >
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Dashboard'}
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'loading') {
    const ar = language === 'ar'

    return (
      <main
        dir={ar ? 'rtl' : 'ltr'}
        className="flex min-h-screen items-center justify-center bg-white"
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-black" />
          <p className="mt-4 text-sm font-bold text-slate-500">
            {ar ? 'جاري استرجاع الجلسة...' : 'Restoring session...'}
          </p>
        </div>
      </main>
    )
  }

  if (screen === 'accounts') {
    return (
      <Accounts
        language={language}
        currentUser={currentUser}
        onToggleLanguage={toggleLanguage}
        onAddAccount={() => navigateTo('add-account')}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => navigateTo('add-product')}
        onImportProducts={() => navigateTo('import-products')}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'add-account') {
    return (
      <AddAccount
        language={language}
        currentUser={currentUser}
        onToggleLanguage={toggleLanguage}
        onBack={() => navigateTo('settings')}
        onCreated={() => navigateTo('settings')}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => navigateTo('add-product')}
        onImportProducts={() => navigateTo('import-products')}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <Settings
        language={language}
        currentUser={currentUser}
        onToggleLanguage={toggleLanguage}
        onHome={() => navigateTo('home')}
        onSettings={() => {}}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => navigateTo('add-product')}
        onOrders={navigateToOrders}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'home') {
    return (
      <Home
        language={language}
        currentUser={currentUser}
        onToggleLanguage={toggleLanguage}
        onHome={() => {}}
        onSettings={() => navigateTo('settings')}
        onOrders={navigateToOrders}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => navigateTo('add-product')}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'orders') {
    return (
      <Orders
        language={language}
        currentUser={currentUser}
        onToggleLanguage={toggleLanguage}
        onHome={() => navigateTo('home')}
        onSettings={() => navigateTo('settings')}
        onOrders={() => {}}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => navigateTo('add-product')}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'edit-product') {
    const match =
      window.location.pathname.match(
        /^\/products\/(\d+)\/edit$/
      )

    const productId =
      match ? Number(match[1]) : 0

    return (
      <EditProduct
        productId={productId}
        language={language}
        currentUser={currentUser}
        onHome={() => navigateTo('home')}
        onSettings={() => navigateTo('settings')}
        onOrders={navigateToOrders}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => navigateTo('add-product')}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'products') {
    return (
      <Products
        language={language}
        currentUser={currentUser}
        onToggleLanguage={toggleLanguage}
        onAccounts={() => navigateTo('settings')}
        onAddAccount={() => navigateTo('add-account')}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => navigateTo('add-product')}
        onImportProducts={() => navigateTo('import-products')}
        onHome={() => navigateTo('home')}
        onSettings={() => navigateTo('settings')}
        onOrders={navigateToOrders}
        onEditProduct={(productId) => {
          const path = `${APP_BASE}/products/${productId}/edit`

          window.history.pushState(
            { screen: 'edit-product' },
            '',
            path
          )

          setScreen('edit-product')
        }}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'add-product') {
    return (
      <AddProduct
        language={language}
        currentUser={currentUser}
        onToggleLanguage={toggleLanguage}
        onAccounts={() => navigateTo('settings')}
        onAddAccount={() => navigateTo('add-account')}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => {}}
        onImportProducts={() => navigateTo('import-products')}
        onHome={() => navigateTo('home')}
        onSettings={() => navigateTo('settings')}
        onOrders={navigateToOrders}
        onLogout={handleLogout}
      />
    )
  }

  // Excel import lives inside Add Product; keep the old link working.
  if (screen === 'import-products') {
    window.history.replaceState(
      { screen: 'add-product' },
      '',
      ROUTES['add-product']
    )
    setScreen('add-product')
    return null
  }

  if (screen === 'reports') {
    return (
      <SellerCenterModule
        mode="reports"
        language={language}
        currentUser={currentUser}
        onToggleLanguage={toggleLanguage}
        onHome={() => navigateTo('home')}
        onSettings={() => navigateTo('settings')}
        onOrders={navigateToOrders}
        onProducts={() => navigateTo('products')}
        onAddProduct={() => navigateTo('add-product')}
        onLogout={handleLogout}
      />
    )
  }

  if (
    [
      'inventory',
      'promotions',
      'finance',
      'performance',
      'notifications',
    ].includes(screen)
  ) {
    window.history.replaceState(
      { screen: 'home' },
      '',
      ROUTES.home
    )
    setScreen('home')
    return null
  }

  if (screen === 'no-access') {
    const ar = language === 'ar'

    return (
      <main
        dir={ar ? 'rtl' : 'ltr'}
        className="flex min-h-screen items-center justify-center bg-slate-100 p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            {ar ? 'غير مسموح' : 'Access Denied'}
          </h1>

          <p className="mt-3 text-slate-500">
            {ar
              ? 'لا توجد صلاحيات مفعلة لهذا الحساب حاليًا.'
              : 'No features are currently enabled for this account.'}
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
          >
            {ar ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'register') {
    return (
      <Register
        onGoLogin={() => navigateTo('login')}
        language={language}
        t={t}
        onToggleLanguage={toggleLanguage}
      />
    )
  }

  return (
    <Login
      onGoRegister={() => navigateTo('register')}
      onLoginSuccess={handleLoginSuccess}
      language={language}
      t={t}
      onToggleLanguage={toggleLanguage}
    />
  )
}

export default App
