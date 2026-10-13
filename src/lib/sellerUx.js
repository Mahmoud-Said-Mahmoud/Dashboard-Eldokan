export const PRODUCT_DRAFT_KEY = 'eldokan_product_draft'

export function saveProductDraft(scope, data) {
  try {
    localStorage.setItem(`${PRODUCT_DRAFT_KEY}:${scope}`, JSON.stringify({
      savedAt: new Date().toISOString(),
      data,
    }))
  } catch {
    // Storage full or unavailable: the draft is simply not saved.
  }
}

export function readProductDraft(scope) {
  try {
    return JSON.parse(localStorage.getItem(`${PRODUCT_DRAFT_KEY}:${scope}`) || 'null')
  } catch {
    return null
  }
}

export function clearProductDraft(scope) {
  try {
    localStorage.removeItem(`${PRODUCT_DRAFT_KEY}:${scope}`)
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

export function validateProductForReview(product = {}) {
  const errors = []
  if (!String(product.nameEn || '').trim()) errors.push('English product name is required')
  if (!String(product.nameAr || '').trim()) errors.push('Arabic product name is required')
  if (!Number(product.categoryId || product.categoryIds?.[0])) errors.push('Category is required')
  if (!(Number(product.regularPrice) > 0)) errors.push('Valid price is required')
  if (Number(product.stockQuantity) < 0) errors.push('Stock cannot be negative')

  const sale = String(product.salePrice ?? '').trim()
  if (sale) {
    if (!(Number(sale) < Number(product.regularPrice))) errors.push('Sale price must be lower than regular price')
    if (!product.saleStartDate || !product.saleEndDate) errors.push('Sale start and end dates are required')
    if (product.saleStartDate && product.saleEndDate &&
        new Date(product.saleEndDate) <= new Date(product.saleStartDate)) {
      errors.push('Sale end date must be after start date')
    }
  }
  return errors
}

export function productApprovalState(product = {}) {
  const raw = String(product.approvalStatus || product.status || '').toLowerCase()
  if (['publish','live','approved'].includes(raw)) return 'approved'
  if (['rejected','declined'].includes(raw)) return 'rejected'
  if (['pending','pending_review','review'].includes(raw)) return 'pending'
  return 'draft'
}

export function sellerHealth({ cancellations = 0, overdueOrders = 0, pendingActions = 0 } = {}) {
  if (cancellations >= 3 || overdueOrders > 0) return 'needs_attention'
  if (cancellations > 0 || pendingActions > 0) return 'average'
  return 'good'
}
