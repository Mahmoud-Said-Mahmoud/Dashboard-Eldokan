
function plainTextFromHtml(value) {
  if (value === null || value === undefined) return ''

  const raw = String(value)
  if (!raw) return ''

  // WooCommerce descriptions can contain HTML. Product list/search should
  // show readable text, while the edit form keeps the original HTML value.
  if (typeof document !== 'undefined') {
    const element = document.createElement('div')
    element.innerHTML = raw
    return (element.textContent || element.innerText || '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return raw
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<\/p\s*>/gi, ' ')
    .replace(/<\/li\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
export function productNameForLanguage(product, language = 'en') {
  if (!product) return ''

  if (language === 'ar') {
    return (
      product.nameAr ||
      product.nameEn ||
      product.name ||
      ''
    )
  }

  return (
    product.nameEn ||
    product.name ||
    product.nameAr ||
    ''
  )
}

export function productShortDescriptionForLanguage(product, language = 'en') {
  if (!product) return ''

  if (language === 'ar') {
    return plainTextFromHtml(
      product.shortDescriptionAr ||
      product.shortDescriptionEn ||
      product.shortDescription ||
      ''
    )
  }

  return plainTextFromHtml(
    product.shortDescriptionEn ||
    product.shortDescription ||
    product.shortDescriptionAr ||
    ''
  )
}

export function productLongDescriptionForLanguage(product, language = 'en') {
  if (!product) return ''

  if (language === 'ar') {
    return plainTextFromHtml(
      product.longDescriptionAr ||
      product.longDescriptionEn ||
      product.longDescription ||
      product.description ||
      ''
    )
  }

  return plainTextFromHtml(
    product.longDescriptionEn ||
    product.longDescription ||
    product.description ||
    product.longDescriptionAr ||
    ''
  )
}
