import { useState } from 'react'
import { FiCheck, FiLink } from 'react-icons/fi'
import {
  fetchImportedImage,
  fetchProductFromUrl,
} from '../../lib/productApi'
import { normalizeImage } from '../../lib/productImage'
import { parseProductPage } from '../../lib/productPageParser'

const IMAGE_COUNT = 3

const ERROR_MESSAGES_AR = {
  invalid_url: 'اللينك غير صحيح.',
  unsafe_url: 'لا يمكن استيراد هذا اللينك.',
  source_unreachable: 'الموقع لم يرد. قد يكون يمنع القراءة الآلية؛ حاول مرة أخرى أو أضف المنتج يدويًا.',
  source_blocked: 'هذا الموقع يمنع القراءة الآلية. أضف المنتج يدويًا.',
  source_not_html: 'هذا اللينك ليس صفحة منتج.',
  product_not_found: 'لم نجد بيانات منتج في هذا اللينك. افتح صفحة المنتج نفسها وانسخ اللينك.',
  rate_limited: 'طلبات كثيرة. انتظر دقائق ثم حاول مرة أخرى.',
}

function errorMessage(error, ar, fallback) {
  if (ar && error?.code && ERROR_MESSAGES_AR[error.code]) {
    return ERROR_MESSAGES_AR[error.code]
  }
  if (!ar && error instanceof Error && error.message) return error.message

  // An unrecognised failure: keep the technical reason visible so it can be
  // reported, instead of a message that says nothing.
  const detail = error?.code || (error?.httpStatus ? `HTTP ${error.httpStatus}` : '')
  return detail ? `${fallback} (${detail})` : fallback
}

function normalizeUrl(value) {
  const raw = String(value || '').trim()
  if (!raw || /\s/.test(raw)) return ''

  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return parsed.hostname.includes('.') ? parsed.toString() : ''
  } catch {
    return ''
  }
}

export default function SmartProductImport({
  ar,
  capabilities,
  onApply,
  onManual,
}) {
  const [url, setUrl] = useState('')
  const [product, setProduct] = useState(null)
  const [selected, setSelected] = useState([])
  const [broken, setBroken] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)

  async function handleFetch(event) {
    event.preventDefault()

    const target = normalizeUrl(url)

    if (!target) {
      setError(
        ar
          ? 'اكتب لينك صفحة المنتج بشكل صحيح'
          : 'Enter a valid product page link'
      )
      return
    }

    setLoading(true)
    setError('')
    setProduct(null)
    setSelected([])
    setBroken([])

    try {
      const data = await fetchProductFromUrl(target)
      const images = Array.isArray(data.images) ? data.images : []

      setProduct({ ...data, images })
      setSelected(
        images.slice(0, IMAGE_COUNT).map((_, index) => index)
      )
    } catch (fetchError) {
      // The store refused to answer the server: offer the paste route, which
      // reads the page from the seller's own browser instead.
      if (['source_blocked', 'source_unreachable', 'product_not_found'].includes(fetchError?.code)) {
        setPasteOpen(true)
      }

      setError(
        errorMessage(
          fetchError,
          ar,
          ar
            ? 'تعذر قراءة المنتج من اللينك'
            : 'Could not read the product from this link'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  function showProduct(data) {
    const images = Array.isArray(data.images) ? data.images : []

    setProduct({ ...data, images })
    setSelected(images.slice(0, IMAGE_COUNT).map((_, index) => index))
    setBroken([])
  }

  // The pasted source is parsed here in the browser and is never put in the
  // text box: a product page is several hundred thousand characters.
  function handlePaste(event) {
    event.preventDefault()

    const data = parseProductPage(event.clipboardData?.getData('text') || '')

    if (!data) {
      setProduct(null)
      setError(
        ar
          ? 'لم نجد بيانات منتج في النص الملصوق. تأكد أنك نسخت مصدر صفحة المنتج كاملًا (Ctrl+U ثم Ctrl+A ثم Ctrl+C).'
          : 'No product data was found in the pasted text. Make sure you copied the full source of the product page (Ctrl+U, then Ctrl+A, then Ctrl+C).'
      )
      return
    }

    setError('')
    showProduct(data)
  }

  function toggleImage(index) {
    setSelected((current) => {
      if (current.includes(index)) {
        return current.filter((item) => item !== index)
      }
      if (current.length >= IMAGE_COUNT) return current
      return [...current, index]
    })
  }

  function markBroken(index) {
    setBroken((current) =>
      current.includes(index) ? current : [...current, index]
    )
    setSelected((current) => current.filter((item) => item !== index))
  }

  async function handleApply() {
    if (!product) return

    setApplying(true)

    const files = []
    let imageError = ''

    for (const index of selected) {
      try {
        const blob = await fetchImportedImage(product.images[index])
        const source = new File([blob], `imported-${index + 1}`, {
          type: blob.type || 'image/jpeg',
        })
        files.push(await normalizeImage(source))
      } catch (downloadError) {
        // A picture that cannot be downloaded is skipped; the seller can
        // upload a replacement in the form. The reason is kept so it can be
        // shown instead of the pictures silently going missing.
        imageError =
          downloadError?.code ||
          (downloadError?.httpStatus ? `HTTP ${downloadError.httpStatus}` : '') ||
          (downloadError instanceof Error ? downloadError.message : 'error')
      }
    }

    setApplying(false)
    onApply(product, files, imageError)
  }

  if (capabilities && !capabilities.urlImport) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <div className="font-black">
          {ar
            ? 'الاستيراد من لينك غير مفعّل على المتجر بعد.'
            : 'Import from link is not enabled on the store yet.'}
        </div>

        <button
          type="button"
          onClick={onManual}
          className="mt-3 rounded-xl bg-black px-5 py-2.5 text-sm font-black text-white"
        >
          {ar ? 'أضف المنتج يدويًا' : 'Add the product manually'}
        </button>
      </div>
    )
  }

  const name = product
    ? ar
      ? product.nameAr || product.nameEn
      : product.nameEn || product.nameAr
    : ''

  const hasPrice =
    product?.regularPrice !== null && product?.regularPrice !== undefined

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-xl font-black text-black">
          {ar ? 'استيراد منتج من لينك' : 'Import Product from Link'}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {ar
            ? 'الصق لينك صفحة المنتج من أي متجر إلكتروني وسنملأ الاسم والوصف والسعر والصور تلقائيًا. تراجع البيانات وتعدلها قبل الحفظ.'
            : 'Paste a product page link from any online store and the name, description, price and images are filled in for you. You review and edit everything before saving.'}
        </p>

        <form
          onSubmit={handleFetch}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <FiLink className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="url"
              dir="ltr"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://store.com/products/..."
              className="w-full rounded-xl border border-slate-200 bg-white py-4 pe-4 ps-11 outline-none transition focus:border-black focus:ring-4 focus:ring-slate-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading || applying || !url.trim()}
            className="rounded-xl bg-black px-7 py-3.5 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? ar
                ? 'جاري قراءة المنتج...'
                : 'Reading product...'
              : ar
              ? 'جلب البيانات'
              : 'Fetch Product'}
          </button>
        </form>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setPasteOpen((open) => !open)}
            aria-expanded={pasteOpen}
            className="text-sm font-black text-black underline"
          >
            {ar
              ? 'الموقع لا يُقرأ من اللينك (مثل نون)؟ الصق مصدر الصفحة'
              : 'The site cannot be read from the link (like noon)? Paste the page source'}
          </button>

          {pasteOpen && (
            <div className="mt-3">
              <ol className="list-decimal space-y-1 ps-5 text-sm leading-6 text-slate-600">
                <li>
                  {ar
                    ? 'افتح صفحة المنتج في المتصفح.'
                    : 'Open the product page in your browser.'}
                </li>
                <li>
                  {ar
                    ? 'اضغط Ctrl+U لعرض مصدر الصفحة، ثم Ctrl+A لتحديد الكل، ثم Ctrl+C للنسخ.'
                    : 'Press Ctrl+U to view the page source, then Ctrl+A to select all, then Ctrl+C to copy.'}
                </li>
                <li>
                  {ar
                    ? 'اضغط في المربع التالي ثم Ctrl+V.'
                    : 'Click in the box below and press Ctrl+V.'}
                </li>
              </ol>

              <textarea
                rows="2"
                value=""
                onChange={() => {}}
                onPaste={handlePaste}
                placeholder={ar ? 'الصق هنا (Ctrl+V)' : 'Paste here (Ctrl+V)'}
                className="mt-3 w-full rounded-xl border border-dashed border-slate-400 bg-white px-4 py-4 outline-none transition focus:border-black focus:ring-4 focus:ring-slate-200"
              />
            </div>
          )}
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          {ar
            ? 'استخدم الميزة لمنتجات تملك حق بيعها واستخدام صورها ووصفها.'
            : 'Use this for products whose images and descriptions you have the right to use.'}
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {product && (
        <div className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-500" dir="ltr">
            {product.sourceHost}
          </div>

          <h3 className="mt-1 text-lg font-black text-black">
            {name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold">
            {hasPrice ? (
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-800">
                {product.salePrice ?? product.regularPrice}{' '}
                {product.currency}
              </span>
            ) : (
              <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-800">
                {ar ? 'السعر غير متاح في الصفحة' : 'No price found on the page'}
              </span>
            )}

            {product.salePrice != null && (
              <span className="text-slate-400 line-through">
                {product.regularPrice} {product.currency}
              </span>
            )}

            {product.brand && (
              <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600">
                {product.brand}
              </span>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-black text-black">
              {ar
                ? `اختر ${IMAGE_COUNT} صور (${selected.length}/${IMAGE_COUNT}) — الأولى هي الصورة الرئيسية`
                : `Choose ${IMAGE_COUNT} images (${selected.length}/${IMAGE_COUNT}) — the first is the main image`}
            </div>

            {product.images.length ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {product.images.map((image, index) => {
                  if (broken.includes(index)) return null

                  const order = selected.indexOf(index)
                  const active = order !== -1

                  return (
                    <button
                      key={image.url}
                      type="button"
                      onClick={() => toggleImage(index)}
                      aria-pressed={active}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-white transition ${
                        active
                          ? 'border-black'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => markBroken(index)}
                        className="h-full w-full object-contain"
                      />

                      {active && (
                        <span className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-black text-white">
                          {order + 1}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {ar
                  ? 'لم نجد صورًا في الصفحة. سترفع الصور يدويًا في الخطوة التالية.'
                  : 'No images were found on the page. You will upload them manually in the next step.'}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={applying}
              onClick={handleApply}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-7 py-3.5 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiCheck />
              {applying
                ? ar
                  ? 'جاري تجهيز الصور...'
                  : 'Preparing images...'
                : ar
                ? 'استخدم البيانات وأكمل المنتج'
                : 'Use Data and Continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
