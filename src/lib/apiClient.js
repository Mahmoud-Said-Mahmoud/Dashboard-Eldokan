import axios from 'axios'

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete'])
const SESSION_TOKEN_KEY = 'eldokan_session_token'

function isMutation(config) {
  return MUTATION_METHODS.has(String(config?.method || '').toLowerCase())
}

function dispatchMutationToast(message, type) {
  if (!message || typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('eldokan:toast', {
      detail: { message, type },
    })
  )
}

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    'https://www.eldokan.com/wp-json/eldokan/v1',
  timeout: 30000,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  // Prefer the Secure HttpOnly cookie, but keep a tab-scoped bearer fallback.
  // This avoids an immediate logout on browsers/proxies that reject or strip
  // the cross-subdomain cookie/Authorization header. The fallback disappears
  // when the browser tab/session is closed and is never persisted long-term.
  let sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY)
  const legacyToken = localStorage.getItem('auth_token')

  if (!sessionToken && legacyToken) {
    sessionToken = legacyToken
    sessionStorage.setItem(SESSION_TOKEN_KEY, legacyToken)
    localStorage.removeItem('auth_token')
  }

  if (sessionToken) {
    config.headers.Authorization = `Bearer ${sessionToken}`
    config.headers['X-ElDokan-Token'] = sessionToken
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => {
    if (isMutation(response?.config) && response?.config?.eldokanToast !== false) {
      const message =
        response?.data?.message ||
        response?.data?.data?.message ||
        'Operation completed successfully.'

      dispatchMutationToast(message, 'success')
    }

    return response
  },
  (error) => {
    const payload = error?.response?.data || {}
    const payloadIsHtml =
      typeof payload === 'string' &&
      /<\/?(?:html|body|p|a|br|div|span)\b/i.test(payload)

    const message =
      error?.response?.status === 502
        ? 'The server is temporarily unavailable (502). Your session is still active; please retry.'
        : payloadIsHtml
          ? 'The server could not complete this request. Please retry.'
          : payload?.message ||
            payload?.data?.message ||
            payload?.code ||
            error?.message ||
            'Request failed'

    const apiError = new Error(message)
    apiError.code = payload?.code
    apiError.status = payload?.status
    apiError.httpStatus = error?.response?.status

    if (isMutation(error?.config) && error?.config?.eldokanToast !== false) {
      dispatchMutationToast(message, 'error')
    }

    if (error?.response?.status === 401) {
      const requestPath = String(error?.config?.url || '')
      const isPublicAuthRequest =
        requestPath.endsWith('/login') ||
        requestPath.endsWith('/forgot-password') ||
        requestPath.endsWith('/reset-password') ||
        requestPath.endsWith('/register')

      if (!isPublicAuthRequest) {
        sessionStorage.removeItem(SESSION_TOKEN_KEY)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('eldokan_screen')

        window.dispatchEvent(
          new CustomEvent('eldokan:auth-expired')
        )
      }
    }

    return Promise.reject(apiError)
  }
)

export default apiClient
