// Shared rules for product data, so the add form, the edit form and the
// quick price/stock editor in the product list all reject the same mistakes
// before they reach the server.

export const NAME_MIN = 3
export const NAME_MAX = 150
export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/
export const PRICE_MAX = 10000000
export const STOCK_MAX = 1000000

// A plain positive number with at most two meaningful decimals. Trailing
// zeros ("1299.5000", as the store sometimes returns) are accepted.
function isMoney(value) {
  const text = String(value).trim()
  if (!/^\d+(\.\d+)?$/.test(text)) return false

  const cents = Number(text) * 100
  return Math.abs(cents - Math.round(cents)) < 1e-6
}

// Returns the first problem as a message, or '' when the values are valid.
export function pricingError(
  { regularPrice, salePrice, saleStartDate, saleEndDate, stockQuantity },
  ar
) {
  const regularText = String(regularPrice ?? '').trim()
  const regular = Number(regularText)

  if (!regularText || !isMoney(regularText) || !(regular > 0)) {
    return ar
      ? 'اكتب سعرًا صحيحًا أكبر من صفر (بحد أقصى خانتين عشريتين).'
      : 'Enter a valid price above zero (at most two decimals).'
  }

  if (regular > PRICE_MAX) {
    return ar ? 'السعر أكبر من الحد المسموح.' : 'The price is above the allowed maximum.'
  }

  const saleText = String(salePrice ?? '').trim()

  if (saleText) {
    const sale = Number(saleText)

    if (!isMoney(saleText) || !(sale > 0)) {
      return ar
        ? 'اكتب سعر خصم صحيحًا أكبر من صفر.'
        : 'Enter a valid sale price above zero.'
    }

    if (sale >= regular) {
      return ar
        ? 'سعر الخصم يجب أن يكون أقل من السعر الأساسي.'
        : 'Sale price must be lower than the regular price.'
    }

    if (!saleStartDate || !saleEndDate) {
      return ar
        ? 'حدد تاريخ بداية ونهاية الخصم.'
        : 'Select the sale start and end dates.'
    }

    if (saleEndDate < saleStartDate) {
      return ar
        ? 'تاريخ نهاية الخصم يجب أن يكون بعد أو نفس تاريخ البداية.'
        : 'Sale end date must be on or after the start date.'
    }
  }

  const stockText = String(stockQuantity ?? '').trim()

  if (stockText === '' || !/^\d+$/.test(stockText) || Number(stockText) > STOCK_MAX) {
    return ar
      ? 'المخزون رقم صحيح من صفر فأكثر.'
      : 'Stock must be a whole number, zero or more.'
  }

  return ''
}

export function nameError(value, ar, language) {
  const text = String(value || '').trim()
  const label =
    language === 'ar'
      ? ar ? 'اسم المنتج بالعربي' : 'Arabic product name'
      : ar ? 'اسم المنتج بالإنجليزي' : 'English product name'

  if (text.length < NAME_MIN) {
    return ar ? `${label} مطلوب (${NAME_MIN} أحرف على الأقل).` : `${label} is required (at least ${NAME_MIN} characters).`
  }

  if (text.length > NAME_MAX) {
    return ar ? `${label} أطول من ${NAME_MAX} حرف.` : `${label} is longer than ${NAME_MAX} characters.`
  }

  return ''
}
