import apiClient from './apiClient'

const LIST_CACHE_TTL = 10 * 60 * 1000

// Categories and brands are the same for every page and change rarely, so
// they are kept for a few minutes per tab instead of being refetched on every
// screen. Empty answers are never cached.
async function cachedList(key, load) {
  try {
    const hit = JSON.parse(sessionStorage.getItem(key) || 'null')
    if (
      hit &&
      Array.isArray(hit.data) &&
      hit.data.length &&
      Date.now() - hit.at < LIST_CACHE_TTL
    ) {
      return hit.data
    }
  } catch {
    // Unreadable cache entry: fall through to the network.
  }

  const data = await load()

  if (data.length) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
    } catch {
      // Storage full or unavailable: the list is simply not cached.
    }
  }

  return data
}

export function getProductCategories() {
  return cachedList('eldokan_cache_categories', async () => {
    const { data } = await apiClient.get('/product-categories')
    return Array.isArray(data?.categories) ? data.categories : []
  })
}

export async function createProduct(payload) {
  const formData = new FormData()
  formData.append(
    'name',
    payload.nameEn || payload.nameAr || payload.name || ''
  )
  formData.append('nameEn', payload.nameEn || '')
  formData.append('nameAr', payload.nameAr || '')
  formData.append(
    'shortDescriptionEn',
    payload.shortDescriptionEn || ''
  )
  formData.append(
    'shortDescriptionAr',
    payload.shortDescriptionAr || ''
  )
  formData.append(
    'longDescriptionEn',
    payload.longDescriptionEn || ''
  )
  formData.append(
    'longDescriptionAr',
    payload.longDescriptionAr || ''
  )
  formData.append('categoryId', String(payload.categoryId))
  formData.append('attributes', JSON.stringify(payload.attributes || []))
  formData.append('brandId', payload.brandId || '')
  formData.append('sku', payload.sku || '')
  formData.append('regularPrice', String(payload.regularPrice || ''))
  formData.append('salePrice', String(payload.salePrice || ''))
  formData.append('saleStartDate', payload.saleStartDate || '')
  formData.append('saleEndDate', payload.saleEndDate || '')
  formData.append('stockQuantity', String(payload.stockQuantity || 0))
  formData.append('shortDescription', payload.shortDescription || '')
  formData.append('longDescription', payload.longDescription || '')
  payload.images.forEach((file) => formData.append('images[]', file))
  const { data } = await apiClient.post('/products', formData)
  return data
}


export async function getProducts() {
  const { data } = await apiClient.get('/products', { params: { view: 'list' } })
  return Array.isArray(data?.products) ? data.products : []
}

export async function getProductDetails(productId) {
  const { data } = await apiClient.get(`/products/${productId}`)
  return data?.product || null
}

export async function getLiveProductLink(productId, language = 'en') {
  const lang = language === 'ar' ? 'ar' : 'en'
  const { data } = await apiClient.get(`/products/${productId}/live-link`, {
    params: { lang },
  })
  return data?.url || ''
}

// Resolve a WordPress attachment ID to a real image URL.
// The dashboard products API currently returns thumbnailId for some products
// without returning the attachment URL itself.
export async function updateProduct(productId, payload) {
  const hasImageChanges = Array.isArray(payload.existingImageIds) || (Array.isArray(payload.images) && payload.images.length > 0)

  if (hasImageChanges) {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'images') {
        ;(value || []).forEach((file) => formData.append('images[]', file))
      } else if (key === 'existingImageIds' || key === 'attributes') {
        formData.append(key, JSON.stringify(value || []))
      } else {
        formData.append(key, value ?? '')
      }
    })
    const { data } = await apiClient.post(`/products/${productId}`, formData)
    return data
  }

  const { data } = await apiClient.patch(`/products/${productId}`, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return data
}

export async function deleteProduct(productId) {
  const { data } = await apiClient.delete(`/products/${productId}`)
  return data
}






export async function previewProductImport(excelFile, imagesZip) {
  const formData = new FormData()
  formData.append('excel', excelFile)
  formData.append('imagesZip', imagesZip)

  const { data } = await apiClient.post('/product-import/preview', formData)
  return data
}

export async function importProductsFromExcel(excelFile, imagesZip) {
  const formData = new FormData()
  formData.append('excel', excelFile)
  formData.append('imagesZip', imagesZip)

  const { data } = await apiClient.post('/product-import/import', formData)
  return data
}


// Reads a product page on another store (server side) and returns the data
// needed to prefill the Add Product form. Nothing is saved by this call.
export async function fetchProductFromUrl(url) {
  const { data } = await apiClient.post(
    '/product-import/from-url',
    { url },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000,
      eldokanToast: false,
    }
  )
  if (!data?.product || typeof data.product !== 'object') {
    throw new Error('Invalid product link response')
  }
  return data.product
}

// Whether the store has the link import add-on installed: { urlImport }.
export async function getImportCapabilities() {
  const { data } = await apiClient.get('/product-import/capabilities')
  return { urlImport: Boolean(data?.urlImport) }
}

// image: one entry of product.images returned by fetchProductFromUrl.
export async function fetchImportedImage(image) {
  const { data } = await apiClient.post(
    '/product-import/remote-image',
    { url: image.url },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
      eldokanToast: false,
    }
  )

  if (typeof data?.data !== 'string' || !data.data) {
    throw new Error('Invalid image response')
  }

  const binary = atob(data.data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type: data.mime || 'image/jpeg' })
}

export async function getProductAttributes(categoryId = 0) {
  const { data } = await apiClient.get('/product-attributes', {
    params: categoryId ? { categoryId } : {},
  })
  if (!Array.isArray(data?.attributes)) throw new Error('Invalid category attributes response')
  return data.attributes
}

export async function getProductAttributeTerms(attributeId) {
  const { data } = await apiClient.get(`/product-attributes/${attributeId}/terms`)
  if (!Array.isArray(data?.terms)) throw new Error('Invalid attribute terms response')
  return data.terms
}


export async function getOrders({
  status,
  search,
  sku,
  period,
  from,
  to,
  page = 1,
  perPage = 10,
} = {}) {
  const params = {}

  if (status) params.status = status
  if (search) params.search = search
  if (sku) params.sku = sku
  if (period) params.period = period
  if (from) params.from = from
  if (to) params.to = to

  params.page = page
  params.perPage = perPage
  params._eldokanTs = Date.now()

  const { data } = await apiClient.get('/orders', {
    params,
  })

  return data
}


export function getProductBrands() {
  return cachedList('eldokan_cache_brands', async () => {
    const { data } = await apiClient.get('/product-brands')
    return Array.isArray(data?.brands) ? data.brands : []
  })
}


export async function updateOrderStatus(orderId, status) {
  const { data } = await apiClient.patch(
    `/orders/${orderId}/status`,
    { status },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  return data
}


export async function getDashboardSummary() {
  const { data } = await apiClient.get(
    '/dashboard-summary'
  )
  return data
}

export async function getNotifications() {
  const { data } = await apiClient.get(
    '/notifications'
  )
  return data
}


export async function getOrderDetails(orderId) {
  const { data } = await apiClient.get(
    `/orders/${orderId}`
  )
  return data
}


export async function addSellerOrderReply(
  orderId,
  message
) {
  const { data } = await apiClient.post(
    `/orders/${orderId}/seller-reply`,
    { message },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  return data
}


export async function getSalesReport(params = {}) {
  const request = () =>
    apiClient.get('/reports/sales', {
      // Cache busting belongs in the query string. Do not send a Cache-Control
      // request header here: on cross-origin Seller Dashboard deployments that
      // header triggers an OPTIONS preflight and can be rejected by CORS before
      // WordPress ever sees the report request.
      params: { ...params, _eldokanTs: Date.now() },
      timeout: 60000,
    })

  try {
    const { data } = await request()
    return data
  } catch (error) {
    const retryable =
      !error?.httpStatus ||
      [502, 503, 504].includes(Number(error?.httpStatus || 0))

    if (!retryable) throw error

    // One retry is enough to absorb a transient PHP-FPM/proxy hiccup without
    // creating duplicate heavy report requests indefinitely.
    const { data } = await request()
    return data
  }
}

export async function downloadSalesReportPdf(params = {}) {
  const response = await apiClient.get('/reports/sales/pdf', {
    params: { ...params, _eldokanTs: Date.now() },
    responseType: 'blob',
    timeout: 60000,
  })
  return response.data
}


export async function markNotificationRead(notificationId) {
  const { data } = await apiClient.patch(
    `/notifications/${encodeURIComponent(notificationId)}/read`
  )
  return data
}

export async function deleteNotification(notificationId) {
  const { data } = await apiClient.delete(
    `/notifications/${encodeURIComponent(notificationId)}`
  )
  return data
}

export async function clearNotifications() {
  const { data } = await apiClient.delete('/notifications')
  return data
}

export async function getHolidayMode() {
  const { data } = await apiClient.get('/holiday-mode')
  return data
}

export async function updateHolidayMode(settings) {
  const payload =
    typeof settings === 'boolean'
      ? { enabled: settings }
      : {
          enabled: Boolean(settings?.enabled),
          startAt: settings?.startAt || '',
          endAt: settings?.endAt || '',
        }

  const { data } = await apiClient.patch(
    '/holiday-mode',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  )
  return data
}
