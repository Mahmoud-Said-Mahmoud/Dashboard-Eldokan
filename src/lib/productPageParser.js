// Reads product data out of the HTML source of a store's product page, in
// the seller's own browser. Used when the store refuses to answer the server
// (some large stores block hosting providers): the seller copies the page
// source and pastes it, and nothing has to be fetched from that store again.
//
// The result has the same shape as the server's link import.

const MAX_IMAGES = 12

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntities(value) {
  return String(value || '').replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, code) => {
      const lower = code.toLowerCase()

      if (lower.startsWith('#x')) {
        return String.fromCodePoint(parseInt(lower.slice(2), 16) || 32)
      }
      if (lower.startsWith('#')) {
        return String.fromCodePoint(parseInt(lower.slice(1), 10) || 32)
      }
      return ENTITIES[lower] ?? match
    }
  )
}

function cleanText(value) {
  let text = String(value || '')
  if (!text) return ''

  text = text
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>|<\/(p|div|li|ul|ol|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  // Twice: structured data is often entity-encoded HTML.
  text = decodeEntities(decodeEntities(text)).replace(/<[^>]+>/g, ' ')

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function limit(text, max) {
  return text.length > max ? text.slice(0, max).trim() : text
}

function shortText(description) {
  const text = String(description || '').replace(/\s+/g, ' ').trim()
  if (text.length <= 300) return text

  const cut = text.slice(0, 300)
  const sentence = cut.match(/^(.{80,})[.!?؟]\s/s)
  if (sentence) return sentence[0].trim()

  const space = cut.lastIndexOf(' ')
  return `${(space > 0 ? cut.slice(0, space) : cut).trim()}…`
}

// "1,299.00", "1.299,00", "EGP 1299", Arabic digits -> number, or null.
function parsePrice(value) {
  if (typeof value === 'number') {
    return value > 0 ? Math.round(value * 100) / 100 : null
  }
  if (typeof value !== 'string') return null

  let text = value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',')
    .replace(/[^0-9.,]/g, '')
    .replace(/^[.,]+|[.,]+$/g, '')

  if (!text) return null

  const lastDot = text.lastIndexOf('.')
  const lastComma = text.lastIndexOf(',')

  if (lastDot !== -1 && lastComma !== -1) {
    text =
      lastDot > lastComma
        ? text.replace(/,/g, '')
        : text.replace(/\./g, '').replace(/,/g, '.')
  } else if (lastComma !== -1) {
    text = /,\d{1,2}$/.test(text)
      ? text.replace(/,/g, '.')
      : text.replace(/,/g, '')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '')
  }

  const number = Math.round(Number(text) * 100) / 100
  return Number.isFinite(number) && number > 0 ? number : null
}

function tagAttributes(tag) {
  const attributes = {}
  const pattern = /([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  let match

  while ((match = pattern.exec(tag))) {
    attributes[match[1].toLowerCase()] = decodeEntities(
      match[2] ?? match[3] ?? match[4] ?? ''
    )
  }

  return attributes
}

// key => [values] for <meta property|name|itemprop> tags, keys lowercased.
function metaMap(html) {
  const map = {}

  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attributes = tagAttributes(tag)
    const content = String(attributes.content || '').trim()
    if (!content) continue

    const key = attributes.property
      ? attributes.property.toLowerCase()
      : attributes.name
      ? attributes.name.toLowerCase()
      : attributes.itemprop
      ? `itemprop:${attributes.itemprop.toLowerCase()}`
      : ''

    if (key) (map[key] ||= []).push(content)
  }

  return map
}

function first(meta, keys) {
  for (const key of keys) {
    if (meta[key]?.[0]) return meta[key][0]
  }
  return ''
}

function findProducts(node, found, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 8) return

  if (!Array.isArray(node) && node['@type']) {
    const types = [].concat(node['@type']).map((type) => String(type).toLowerCase())
    if (types.some((type) => ['product', 'productgroup', 'individualproduct'].includes(type))) {
      found.push(node)
    }
  }

  for (const child of Object.values(node)) {
    if (child && typeof child === 'object') findProducts(child, found, depth + 1)
  }
}

function jsonLdProduct(html) {
  const found = []
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = pattern.exec(html))) {
    const raw = match[1].trim()

    // Some themes print raw line breaks inside JSON strings.
    // eslint-disable-next-line no-control-regex
    for (const candidate of [raw, raw.replace(/[\u0000-\u001f]+/g, ' ')]) {
      try {
        findProducts(JSON.parse(candidate), found)
        break
      } catch {
        // Not valid JSON as written; the cleaned copy is tried next.
      }
    }
  }

  let best = null
  let bestScore = -1

  for (const node of found) {
    const score =
      (node.offers ? 2 : 0) +
      (node.image ? 1 : 0) +
      (node.description ? 1 : 0) +
      (node.sku ? 1 : 0)

    if (node.name && score > bestScore) {
      best = node
      bestScore = score
    }
  }

  return best
}

function scalar(value) {
  let item = value
  if (Array.isArray(item)) item = item[0]
  if (item && typeof item === 'object') item = item['@value'] ?? item.name ?? ''
  return ['string', 'number'].includes(typeof item) ? String(item) : ''
}

function offerPrices(offers) {
  const result = { price: null, list: null, currency: '' }
  if (!offers || typeof offers !== 'object') return result

  for (const offer of [].concat(offers)) {
    if (!offer || typeof offer !== 'object') continue

    let price = parsePrice(offer.price ?? offer.lowPrice)
    let list = null
    let currency = typeof offer.priceCurrency === 'string' ? offer.priceCurrency : ''

    for (const spec of [].concat(offer.priceSpecification || [])) {
      if (!spec || typeof spec !== 'object' || spec.price === undefined) continue

      const specPrice = parsePrice(spec.price)
      const type = String(spec.priceType || '').toLowerCase()

      if (type.includes('listprice') || type.includes('strikethrough')) {
        list = specPrice
      } else if (price === null) {
        price = specPrice
      }

      if (!currency && typeof spec.priceCurrency === 'string') {
        currency = spec.priceCurrency
      }
    }

    if (price !== null) {
      return { price, list, currency: currency.toUpperCase() }
    }
  }

  return result
}

function absolutize(url, base) {
  const value = decodeEntities(String(url || '').trim())
  if (!value) return ''

  try {
    const resolved = new URL(value, base || undefined)
    return /^https?:$/.test(resolved.protocol) ? resolved.toString() : ''
  } catch {
    return ''
  }
}

function addImage(images, url, base) {
  const absolute = absolutize(url, base)
  if (!absolute || absolute.length > 2000) return
  if (/\.(svg|ico)(\?|$)/i.test(absolute)) return
  if (!images.includes(absolute)) images.push(absolute)
}

function collectJsonLdImages(value, images, base) {
  if (typeof value === 'string') {
    addImage(images, value, base)
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdImages(item, images, base))
  } else if (value && typeof value === 'object') {
    const src = value.contentUrl || value.url
    if (typeof src === 'string') addImage(images, src, base)
  }
}

function stripSiteName(title, siteName) {
  const site = String(siteName || '').trim()
  if (!title || !site) return title

  const quoted = site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const stripped = title
    .replace(new RegExp(`\\s*[|\\-–—:·]\\s*${quoted}\\s*$`, 'i'), '')
    .replace(new RegExp(`^\\s*${quoted}\\s*[|\\-–—:·]\\s*`, 'i'), '')
    .trim()

  return stripped || title
}

// Returns the product, or null when the text is not a product page.
export function parseProductPage(source) {
  const html = String(source || '')
  if (html.length < 200 || !/<(meta|script|html)\b/i.test(html)) return null

  const meta = metaMap(html)

  const canonicalTag = (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i) || [])[0]
  const pageUrl = absolutize(
    first(meta, ['og:url']) || (canonicalTag ? tagAttributes(canonicalTag).href : ''),
    undefined
  )

  let name = ''
  let description = ''
  let sku = ''
  let brand = ''
  let price = null
  let listPrice = null
  let currency = ''
  const images = []

  const product = jsonLdProduct(html)

  if (product) {
    name = cleanText(scalar(product.name))
    description = cleanText(scalar(product.description))
    sku = cleanText(scalar(product.sku) || scalar(product.mpn))
    brand = cleanText(scalar(product.brand))
    collectJsonLdImages(product.image, images, pageUrl)

    const prices = offerPrices(product.offers || product.hasVariant?.[0]?.offers)
    price = prices.price
    listPrice = prices.list
    currency = prices.currency
  }

  if (!name) {
    const title =
      first(meta, ['og:title', 'twitter:title']) ||
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] ||
      ''
    name = stripSiteName(cleanText(title), first(meta, ['og:site_name']))
  }

  if (!description) {
    description = cleanText(
      first(meta, ['og:description', 'description', 'twitter:description'])
    )
  }

  if (price === null) {
    price = parsePrice(
      first(meta, [
        'product:sale_price:amount',
        'product:price:amount',
        'og:price:amount',
        'itemprop:price',
      ])
    )
  }

  if (listPrice === null) {
    listPrice = parsePrice(first(meta, ['product:original_price:amount']))
  }

  if (!currency) {
    currency = first(meta, [
      'product:price:currency',
      'og:price:currency',
      'itemprop:pricecurrency',
    ]).toUpperCase()
  }

  if (!brand) brand = cleanText(first(meta, ['product:brand', 'og:brand']))
  if (!sku) sku = cleanText(first(meta, ['product:retailer_item_id', 'itemprop:sku']))

  for (const key of ['og:image:secure_url', 'og:image', 'twitter:image']) {
    for (const image of meta[key] || []) addImage(images, image, pageUrl)
  }

  const galleryPatterns = [
    /\sdata-large_image=["']([^"']+)["']/gi,
    /\sdata-zoom-image=["']([^"']+)["']/gi,
    /\sdata-old-hires=["']([^"']+)["']/gi,
    /"hiRes"\s*:\s*"(https?:[^"]+)"/gi,
  ]

  for (const pattern of galleryPatterns) {
    let match
    while ((match = pattern.exec(html))) {
      addImage(images, match[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&'), pageUrl)
    }
  }

  name = limit(name, 200)
  description = limit(description, 5000)

  // No price, no picture and no product markup: not a product page.
  if (!name || (!product && price === null && !images.length)) return null

  let regularPrice = price ?? listPrice
  let salePrice = null

  if (price !== null && listPrice !== null && listPrice > price) {
    regularPrice = listPrice
    salePrice = price
  }

  // The name and the description can be in different languages (noon's
  // Arabic pages often carry an English description), so each is filed under
  // its own language.
  const arabic = /[\u0600-\u06FF]/.test(name)
  const arabicDescription = /[\u0600-\u06FF]/.test(description)
  let sourceHost

  try {
    sourceHost = pageUrl ? new URL(pageUrl).hostname : ''
  } catch {
    sourceHost = ''
  }

  return {
    sourceUrl: pageUrl,
    sourceHost,
    detectedLanguage: arabic ? 'ar' : 'en',
    nameEn: arabic ? '' : name,
    nameAr: arabic ? name : '',
    shortDescriptionEn: arabicDescription ? '' : shortText(description),
    shortDescriptionAr: arabicDescription ? shortText(description) : '',
    longDescriptionEn: arabicDescription ? '' : description,
    longDescriptionAr: arabicDescription ? description : '',
    sku: limit(sku, 100),
    brand: limit(brand, 100),
    regularPrice,
    salePrice,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : '',
    images: images.slice(0, MAX_IMAGES).map((url) => ({ url })),
  }
}
