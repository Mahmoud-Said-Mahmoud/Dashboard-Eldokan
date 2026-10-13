import apiClient from './apiClient'

const SESSION_TOKEN_KEY = 'eldokan_session_token'

export async function checkPluginStatus() {
  const { data } = await apiClient.get('/status')
  return data
}

export async function loginUser(payload) {
  const { data } = await apiClient.post('/login', payload, {
    headers: { 'Content-Type': 'application/json' },
  })

  const status = data?.user?.status

  if (status === 'pending') {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    return { ...data, blocked: true, blockReason: 'pending' }
  }

  if (status === 'rejected') {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    return { ...data, blocked: true, blockReason: 'rejected' }
  }

  // Keep the Secure HttpOnly cookie as the primary session mechanism and store
  // the returned token only in sessionStorage as a compatibility fallback.
  // This survives refreshes in the current tab but disappears with the tab.
  localStorage.removeItem('auth_token')
  if (data?.token) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, data.token)
  } else {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
  }
  if (data?.user) localStorage.setItem('auth_user', JSON.stringify(data.user))

  return data
}


export async function requestPasswordReset(email) {
  const { data } = await apiClient.post('/forgot-password', { email }, {
    headers: { 'Content-Type': 'application/json' },
  })
  return data
}

export async function completePasswordReset(payload) {
  const { data } = await apiClient.post('/reset-password', payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return data
}

export async function registerUser(payload) {
  const formData = new FormData()

  formData.append('fullName', payload.fullName)
  formData.append('email', payload.email)
  formData.append('phone', payload.phone)
  formData.append('companyName', payload.companyName)
  formData.append('companyAddress', payload.companyAddress)
  formData.append('taxNumber', payload.taxNumber)
  formData.append('password', payload.password)
  formData.append('verificationPdf', payload.verificationPdf)

  const { data } = await apiClient.post('/register', formData)
  return data
}

export async function getCurrentUser() {
  const { data } = await apiClient.get('/me')

  if (data?.user) {
    localStorage.setItem('auth_user', JSON.stringify(data.user))
  }

  return data
}

export async function logoutUser() {
  try {
    const { data } = await apiClient.post('/logout')
    return data
  } finally {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }
}

export async function getAdminUsers() {
  const { data } = await apiClient.get('/admin/users')
  return data
}

export async function changeUserStatus(userId, status) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/status`, {
    status,
  })

  return data
}

export async function getVerificationPdf(userId) {
  const response = await apiClient.get(`/admin/users/${userId}/pdf`, {
    responseType: 'blob',
  })

  return response.data
}

export async function openVerificationPdf(userId) {
  const blob = await getVerificationPdf(userId)

  const url = URL.createObjectURL(
    new Blob([blob], { type: 'application/pdf' })
  )

  window.open(url, '_blank', 'noopener,noreferrer')

  setTimeout(() => URL.revokeObjectURL(url), 60000)
}


export async function createOwnerAccount(payload) {
  const { data } = await apiClient.post('/admin/users/create', payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return data
}

export async function getOwnerTeam() {
  const { data } = await apiClient.get('/owner/team')
  return data
}


export async function deleteOwnerChildAccount(userId, password) {
  const { data } = await apiClient.delete(`/admin/users/${userId}`, {
    data: { password },
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return data
}

export async function changeAccountRole(userId, role) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/role`, {
    role,
  })

  return data
}


export async function getActivityLog(limit = 200) {
  const { data } = await apiClient.get('/activity-log', { params: { limit } })
  return Array.isArray(data?.logs) ? data.logs : []
}


export async function getRolePermissions() {
  const { data } = await apiClient.get('/role-permissions')
  return data?.roles || {}
}

export async function updateRolePermissions(role, permissions) {
  const { data } = await apiClient.patch(
    `/role-permissions/${role}`,
    { permissions },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  return data
}
