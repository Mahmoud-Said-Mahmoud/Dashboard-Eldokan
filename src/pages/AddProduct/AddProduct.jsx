import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createProduct,
  getImportCapabilities,
  getProductBrands,
  getProductCategories,
} from '../../lib/productApi'
import CategoryDropdown from '../../components/Product/CategoryDropdown'
import ProductImages from '../../components/Product/ProductImages'
import ExcelProductImport from '../../components/Product/ExcelProductImport'
import SmartProductImport from '../../components/Product/SmartProductImport'
import {
  NAME_MAX,
  NAME_MIN,
  PRICE_MAX,
  SKU_PATTERN,
  STOCK_MAX,
} from '../../lib/productValidation'
import AttributeSelector from '../../components/Product/AttributeSelector'
import BrandSelector from '../../components/Product/BrandSelector'
import AccountLayout from '../../components/AccountLayout/AccountLayout'
import Breadcrumb from '../../components/Common/Breadcrumb'
import { FiPlus, FiRefreshCw, FiCalendar, FiGlobe, FiLink } from 'react-icons/fi'
import {
  clearProductDraft,
  readProductDraft,
  saveProductDraft,
} from '../../lib/sellerUx'
import { canTranslate, translateTexts } from '../../lib/translate'

const DRAFT_SCOPE = 'add'

// Images are files and cannot be stored; everything else in the form can.
const DRAFT_FIELDS = [
  'nameEn',
  'nameAr',
  'shortDescriptionEn',
  'shortDescriptionAr',
  'longDescriptionEn',
  'longDescriptionAr',
  'categoryId',
  'brandId',
  'sku',
  'regularPrice',
  'salePrice',
  'saleStartDate',
  'saleEndDate',
  'stockQuantity',
]

const DRAFT_CONTENT_FIELDS = [
  'nameEn',
  'nameAr',
  'longDescriptionEn',
  'longDescriptionAr',
]

const TRANSLATED_FIELDS = [
  ['nameEn', 'nameAr'],
  ['shortDescriptionEn', 'shortDescriptionAr'],
  ['longDescriptionEn', 'longDescriptionAr'],
]

function hasDraftContent(data) {
  return DRAFT_CONTENT_FIELDS.some((key) => String(data?.[key] || '').trim())
}

function readUsableDraft() {
  const data = readProductDraft(DRAFT_SCOPE)?.data
  return data && typeof data === 'object' && hasDraftContent(data) ? data : null
}

export default function AddProduct({
  language,
  currentUser,
  onHome,
  onSettings,
  onOrders,
  onToggleLanguage,
  onProducts,
  onAddProduct,
  onLogout,
}) {
  const ar = language === 'ar'
  const role = currentUser?.role || ''
  const permissions = currentUser?.permissions || {}
  const canAddProduct =
    role === 'eldokan_owner' || permissions.addProducts

  const [categories, setCategories] = useState([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState('')
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [addMode, setAddMode] = useState('single')
  const [importNotice, setImportNotice] = useState(null)
  const [pendingDraft, setPendingDraft] = useState(readUsableDraft)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState('')
  const [translateProgress, setTranslateProgress] = useState(null)
  const [capabilities, setCapabilities] = useState(null)

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getProductCategories()
        setCategories(Array.isArray(data) ? data : [])
      } catch (error) {
        setCategoryError(
          error instanceof Error
            ? error.message
            : ar
            ? 'تعذر تحميل التصنيفات'
            : 'Could not load categories'
        )
      } finally {
        setCategoryLoading(false)
      }
    }

    loadCategories()
  }, [ar])


  const schema = useMemo(
    () =>
      z.object({
        nameEn: z
          .string()
          .trim()
          .min(NAME_MIN, ar ? 'اسم المنتج بالإنجليزي مطلوب' : 'English product name is required')
          .max(NAME_MAX, ar ? `الاسم أطول من ${NAME_MAX} حرف` : `The name is longer than ${NAME_MAX} characters`),
        nameAr: z
          .string()
          .trim()
          .min(NAME_MIN, ar ? 'اسم المنتج بالعربي مطلوب' : 'Arabic product name is required')
          .max(NAME_MAX, ar ? `الاسم أطول من ${NAME_MAX} حرف` : `The name is longer than ${NAME_MAX} characters`),
        categoryId: z.coerce
          .number()
          .min(1, ar ? 'اختر التصنيف' : 'Select category'),
        sku: z
          .string()
          .trim()
          .refine(
            (value) => !value || SKU_PATTERN.test(value),
            ar
              ? 'الـ SKU حروف إنجليزية وأرقام و - _ . / فقط (حتى 64 حرف)'
              : 'SKU may contain only letters, digits and - _ . / (up to 64 characters)'
          )
          .optional(),
        regularPrice: z.coerce
          .number()
          .positive(ar ? 'اكتب سعر المنتج' : 'Enter the product price')
          .max(PRICE_MAX, ar ? 'السعر أكبر من الحد المسموح' : 'The price is above the allowed maximum')
          .refine(
            (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
            ar ? 'السعر بحد أقصى خانتين عشريتين' : 'The price can have at most two decimals'
          ),
        salePrice: z
          .union([z.literal(''), z.coerce.number().min(0)])
          .optional(),
        saleStartDate: z.string().optional(),
        saleEndDate: z.string().optional(),
        stockQuantity: z.coerce
          .number()
          .int(ar ? 'المخزون رقم صحيح' : 'Stock must be a whole number')
          .min(0, ar ? 'المخزون لا يقل عن صفر' : 'Stock cannot be negative')
          .max(STOCK_MAX, ar ? 'المخزون أكبر من الحد المسموح' : 'Stock is above the allowed maximum'),
        shortDescriptionEn: z.string().trim().max(500).optional(),
        shortDescriptionAr: z.string().trim().max(500).optional(),
        longDescriptionEn: z.string().trim().optional(),
        longDescriptionAr: z.string().trim().optional(),
        attributes: z.array(z.any()).optional(),
        images: z
          .array(z.instanceof(File))
          .length(
            3,
            ar
              ? 'يجب رفع 3 صور بالضبط'
              : 'Exactly 3 images are required'
          ),
      }).superRefine((values, ctx) => {
        const hasSale =
          values.salePrice !== '' &&
          values.salePrice !== undefined

        if (!hasSale) return

        if (
          Number(values.salePrice) >=
          Number(values.regularPrice)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['salePrice'],
            message: ar
              ? 'سعر التخفيض يجب أن يكون أقل من السعر الأساسي'
              : 'Sale price must be lower than the regular price',
          })
        }

        if (!values.saleStartDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['saleStartDate'],
            message: ar
              ? 'حدد تاريخ بداية الخصم'
              : 'Select the sale start date',
          })
        }

        if (!values.saleEndDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['saleEndDate'],
            message: ar
              ? 'حدد تاريخ نهاية الخصم'
              : 'Select the sale end date',
          })
        }

        if (
          values.saleStartDate &&
          values.saleEndDate &&
          values.saleEndDate <
            values.saleStartDate
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['saleEndDate'],
            message: ar
              ? 'تاريخ نهاية الخصم يجب أن يكون بعد أو نفس تاريخ البداية'
              : 'Sale end date must be on or after the start date',
          })
        }
      }),
    [ar]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      brandId: '',
      nameEn: '',
      nameAr: '',
      categoryId: 0,
      sku: '',
      regularPrice: '',
      salePrice: '',
      saleStartDate: '',
      saleEndDate: '',
      stockQuantity: 0,
      shortDescriptionEn: '',
      shortDescriptionAr: '',
      longDescriptionEn: '',
      longDescriptionAr: '',
      attributes: [],
      images: [],
    },
  })

  const watchedCategoryId =
    Number(watch('categoryId') || 0)

  const watchedSalePrice =
    watch('salePrice')

  const watchedSaleStart =
    watch('saleStartDate')

  const watchedSaleEnd =
    watch('saleEndDate')

  // Ask the store whether the link import add-on is installed.
  useEffect(() => {
    let cancelled = false

    getImportCapabilities()
      .then((data) => {
        if (!cancelled) setCapabilities(data)
      })
      .catch(() => {
        if (!cancelled) setCapabilities({ urlImport: false })
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Keep a local draft of the typed fields so a refresh, a closed tab or an
  // expired session does not lose the product. Nothing is saved while an
  // older draft is still waiting for the seller to restore or discard it.
  useEffect(() => {
    if (pendingDraft) return undefined

    let timer = 0

    const subscription = watch((values) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const data = Object.fromEntries(
          DRAFT_FIELDS.map((key) => [key, values[key] ?? ''])
        )

        if (hasDraftContent(data)) saveProductDraft(DRAFT_SCOPE, data)
      }, 700)
    })

    return () => {
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [watch, pendingDraft])

  function restoreDraft() {
    DRAFT_FIELDS.forEach((key) => {
      if (pendingDraft[key] !== undefined) setValue(key, pendingDraft[key])
    })
    setPendingDraft(null)
  }

  function discardDraft() {
    clearProductDraft(DRAFT_SCOPE)
    setPendingDraft(null)
  }

  // Fills whichever language is empty from the one the seller wrote.
  async function fillMissingLanguage() {
    setTranslateError('')

    const jobs = { en: [], ar: [] }

    TRANSLATED_FIELDS.forEach(([enField, arField]) => {
      const enText = String(getValues(enField) || '').trim()
      const arText = String(getValues(arField) || '').trim()

      if (enText && !arText) jobs.ar.push([arField, enText])
      if (arText && !enText) jobs.en.push([enField, arText])
    })

    if (!jobs.en.length && !jobs.ar.length) {
      setTranslateError(
        ar
          ? 'اكتب المحتوى بلغة واحدة أولًا، وسنكمل اللغة الأخرى.'
          : 'Write the content in one language first, and the other is filled in.'
      )
      return
    }

    setTranslating(true)
    setTranslateProgress(null)

    try {
      for (const target of ['ar', 'en']) {
        if (!jobs[target].length) continue

        const translated = await translateTexts(
          jobs[target].map(([, text]) => text),
          target === 'ar' ? 'en' : 'ar',
          target,
          setTranslateProgress
        )

        jobs[target].forEach(([field], index) => {
          const limit = field.startsWith('shortDescription') ? 500 : undefined
          setValue(field, translated[index].slice(0, limit), {
            shouldDirty: true,
            shouldValidate: true,
          })
        })
      }
    } catch {
      setTranslateError(
        ar
          ? 'تعذرت الترجمة التلقائية الآن. حاول مرة أخرى أو اكتب اللغة الأخرى يدويًا.'
          : 'Automatic translation failed. Try again or enter the other language manually.'
      )
    } finally {
      setTranslating(false)
      setTranslateProgress(null)
    }
  }

  const selectedCategory =
    categories.find(
      (item) =>
        Number(item.id) ===
        watchedCategoryId
    )

  const commissionPercent =
    Number(
      selectedCategory?.commissionPercent ||
      0
    )

  const commissionFixed =
    Number(
      selectedCategory?.feeFixed ||
      0
    )

  const commissionLabel =
    commissionPercent > 0 && commissionFixed > 0
      ? `${commissionPercent}% + ${commissionFixed} EGP`
      : commissionFixed > 0
        ? `${commissionFixed} EGP`
        : `${commissionPercent}%`

  async function submit(values) {
    setServerError('')
    setSuccess('')

    try {
      await createProduct(values)
      setSuccess(
        ar
          ? 'تمت إضافة المنتج بنجاح'
          : 'Product created successfully'
      )
      reset()
      clearProductDraft(DRAFT_SCOPE)
      setImportNotice(null)
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر إضافة المنتج'
          : 'Could not create product'
      )
    }
  }

  // Fills the form from a product read by the link import. Nothing is saved
  // here: the seller reviews the fields, picks the category and submits.
  async function applyImportedProduct(product, files, imageError = '') {
    const text = (value) => String(value || '')
    const hasPrice =
      product.regularPrice !== null && product.regularPrice !== undefined

    reset()
    setValue('nameEn', text(product.nameEn))
    setValue('nameAr', text(product.nameAr))
    setValue('shortDescriptionEn', text(product.shortDescriptionEn).slice(0, 500))
    setValue('shortDescriptionAr', text(product.shortDescriptionAr).slice(0, 500))
    setValue('longDescriptionEn', text(product.longDescriptionEn))
    setValue('longDescriptionAr', text(product.longDescriptionAr))
    setValue('sku', text(product.sku))
    setValue('regularPrice', hasPrice ? product.regularPrice : '')
    setValue('salePrice', product.salePrice ?? '')
    setValue('images', files, { shouldDirty: true })

    const todo = []
    if (!text(product.nameEn).trim()) todo.push(ar ? 'الاسم بالإنجليزي' : 'English name')
    if (!text(product.nameAr).trim()) todo.push(ar ? 'الاسم بالعربي' : 'Arabic name')
    todo.push(ar ? 'التصنيف' : 'Category')
    if (!hasPrice) todo.push(ar ? 'السعر' : 'Price')
    if (product.salePrice != null) todo.push(ar ? 'تاريخ بداية ونهاية الخصم' : 'Sale start and end dates')
    if (files.length < 3) {
      todo.push(
        ar
          ? `الصور (${files.length} من 3)`
          : `Images (${files.length} of 3)`
      )
    }

    setServerError('')
    setSuccess('')
    setImportNotice({
      host: text(product.sourceHost),
      imageError,
      todo,
      currency:
        hasPrice && product.currency && product.currency !== 'EGP'
          ? product.currency
          : '',
    })
    setPendingDraft(null)
    setAddMode('single')

    if (product.brand) {
      try {
        const wanted = text(product.brand).trim().toLowerCase()
        const brands = await getProductBrands()
        const match = brands.find(
          (brand) => String(brand.name || '').trim().toLowerCase() === wanted
        )
        if (match) setValue('brandId', Number(match.id))
      } catch {
        // Brand stays empty; the seller can pick it manually.
      }
    }
  }

  if (!canAddProduct) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white p-8 shadow">
          {ar
            ? 'ليس لديك صلاحية إضافة المنتجات'
            : 'No permission to add products'}
        </div>
      </main>
    )
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none transition focus:border-black focus:ring-4 focus:ring-slate-200'

  return (
    <AccountLayout
      language={language}
      role={role}
      permissions={currentUser?.permissions || {}}
      active="add-product"
      onHome={onHome}
      onSettings={onSettings}
      onOrders={onOrders}
      onProducts={onProducts}
      onAddProduct={onAddProduct}
      onLogout={onLogout}
    >
      <div
        dir={ar ? 'rtl' : 'ltr'}
        className="eldokan-page min-h-screen bg-white p-4 sm:p-7"
      >
        <div className="mx-auto max-w-7xl">

          <Breadcrumb
            ar={ar}
            items={[
              {
                label: ar ? 'المنتجات' : 'Products',
                onClick: onProducts,
              },
              {
                label: ar ? 'إضافة منتج' : 'Add Product',
              },
            ]}
          />
          <div className="mb-6 flex items-center justify-between">
            <div>
             

              <h1 className="mt-5 text-3xl font-black text-black">
                {ar ? 'إضافة منتج' : 'Add Product'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleLanguage}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
              >
                {ar ? 'English' : 'العربية'}
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                title={ar ? 'تحديث الصفحة' : 'Refresh Page'}
                aria-label={ar ? 'تحديث الصفحة' : 'Refresh Page'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg"
              >
                <FiRefreshCw />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="mb-7 text-2xl font-black text-black">
              {ar ? 'معلومات المنتج' : 'Product Information'}
            </h2>

            <div className="mb-8 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAddMode('smart')}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition ${
                  addMode === 'smart'
                    ? 'bg-black text-white'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <FiLink />
                {ar ? 'استيراد من لينك' : 'Import from Link'}
              </button>

              <button
                type="button"
                onClick={() => setAddMode('single')}
                className={`rounded-xl px-5 py-3 text-sm font-black transition ${
                  addMode === 'single'
                    ? 'bg-black text-white'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {ar ? 'إدخال يدوي' : 'Manual Entry'}
              </button>

              <button
                type="button"
                onClick={() => setAddMode('excel')}
                className={`rounded-xl px-5 py-3 text-sm font-black transition ${
                  addMode === 'excel'
                    ? 'bg-black text-white'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {ar ? 'رفع Excel' : 'Import Excel'}
              </button>
            </div>

            {addMode === 'excel' ? (
              <ExcelProductImport
                ar={ar}
                onViewProducts={onProducts}
              />
            ) : addMode === 'smart' ? (
              <SmartProductImport
                ar={ar}
                capabilities={capabilities}
                onApply={applyImportedProduct}
                onManual={() => setAddMode('single')}
              />
            ) : (
            <form
              onSubmit={handleSubmit(submit)}
              className="space-y-8"
            >
              {pendingDraft && (
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-black">
                      {ar ? 'لديك مسودة غير محفوظة: ' : 'You have an unsaved draft: '}
                    </span>
                    {pendingDraft.nameAr || pendingDraft.nameEn}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={restoreDraft}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-black text-white"
                    >
                      {ar ? 'استرجاع المسودة' : 'Restore Draft'}
                    </button>

                    <button
                      type="button"
                      onClick={discardDraft}
                      className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold"
                    >
                      {ar ? 'تجاهل' : 'Discard'}
                    </button>
                  </div>
                </div>
              )}

              {importNotice && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  <div className="font-black">
                    {ar
                      ? `تم ملء البيانات من ${importNotice.host}. راجعها قبل الحفظ.`
                      : `Filled from ${importNotice.host}. Review everything before saving.`}
                  </div>

                  <div className="mt-1">
                    {ar ? 'مطلوب إكماله: ' : 'Still needed: '}
                    {importNotice.todo.join(ar ? '، ' : ', ')}
                  </div>

                  {importNotice.imageError && (
                    <div className="mt-1 font-bold text-red-700">
                      {ar
                        ? `تعذر تحميل بعض الصور من المصدر (${importNotice.imageError}). ارفعها يدويًا.`
                        : `Some images could not be downloaded from the source (${importNotice.imageError}). Upload them manually.`}
                    </div>
                  )}

                  {importNotice.currency && (
                    <div className="mt-1 font-bold text-amber-800">
                      {ar
                        ? `السعر في المصدر بعملة ${importNotice.currency}. عدّله إلى الجنيه المصري.`
                        : `The source price is in ${importNotice.currency}. Change it to EGP.`}
                    </div>
                  )}
                </div>
              )}

              <Controller
                name="images"
                control={control}
                render={({ field }) => (
                  <ProductImages
                    value={field.value}
                    onChange={field.onChange}
                    ar={ar}
                  />
                )}
              />

              {errors.images && (
                <p className="text-sm font-bold text-red-600">
                  {errors.images.message}
                </p>
              )}

              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="mb-5">
                  <h3 className="text-lg font-black text-black">
                    {ar ? 'محتوى المنتج' : 'Product Content'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {ar
                      ? 'أدخل محتوى المنتج بالعربي والإنجليزي في نفس الصفحة.'
                      : 'Enter English and Arabic product content side by side.'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={translating || !canTranslate()}
                      onClick={fillMissingLanguage}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiGlobe />
                      {translating
                        ? translateProgress !== null && translateProgress < 1
                          ? ar
                            ? `تحميل الترجمة لأول مرة ${Math.round(translateProgress * 100)}%`
                            : `First-time download ${Math.round(translateProgress * 100)}%`
                          : ar
                          ? 'جاري الترجمة...'
                          : 'Translating...'
                        : ar
                        ? 'أكمل اللغة الناقصة تلقائيًا'
                        : 'Fill the missing language automatically'}
                    </button>

                    <span className="text-xs text-slate-500">
                      {canTranslate()
                        ? ar
                          ? 'اكتب بلغة واحدة ونترجم الأخرى. أول مرة تأخذ وقتًا لتحميل الترجمة على جهازك، وبعدها فورية.'
                          : 'Write in one language and the other is translated. The first use downloads the translation to your device; after that it is instant.'
                        : ar
                        ? 'الترجمة التلقائية تعمل على Chrome و Edge للكمبيوتر فقط.'
                        : 'Automatic translation works in desktop Chrome and Edge only.'}
                    </span>
                  </div>

                  {translateError && (
                    <p className="mt-2 text-sm font-bold text-red-600">
                      {translateError}
                    </p>
                  )}
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div dir="ltr" className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 text-sm font-black text-slate-900">
                      English
                    </div>

                    <label className="mb-2 block text-sm font-black text-black">
                      Product Name *
                    </label>
                    <input
                      {...register('nameEn')}
                      placeholder="Ex: Wireless Headphones"
                      className={inputClass}
                    />
                    {errors.nameEn && (
                      <p className="mt-1 text-sm font-bold text-red-600">
                        {errors.nameEn.message}
                      </p>
                    )}

                    <label className="mb-2 mt-5 block text-sm font-black text-black">
                      Short Description
                    </label>
                    <textarea
                      rows="3"
                      maxLength={500}
                      {...register('shortDescriptionEn')}
                      className={inputClass}
                    />

                    <label className="mb-2 mt-5 block text-sm font-black text-black">
                      Full Description
                    </label>
                    <textarea
                      rows="7"
                      {...register('longDescriptionEn')}
                      className={inputClass}
                    />
                  </div>

                  <div dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 text-sm font-black text-slate-900">
                      العربية
                    </div>

                    <label className="mb-2 block text-sm font-black text-black">
                      اسم المنتج *
                    </label>
                    <input
                      {...register('nameAr')}
                      placeholder="مثال: سماعة لاسلكية"
                      className={inputClass}
                    />
                    {errors.nameAr && (
                      <p className="mt-1 text-sm font-bold text-red-600">
                        {errors.nameAr.message}
                      </p>
                    )}

                    <label className="mb-2 mt-5 block text-sm font-black text-black">
                      الوصف المختصر
                    </label>
                    <textarea
                      rows="3"
                      maxLength={500}
                      {...register('shortDescriptionAr')}
                      className={inputClass}
                    />

                    <label className="mb-2 mt-5 block text-sm font-black text-black">
                      الوصف الكامل
                    </label>
                    <textarea
                      rows="7"
                      {...register('longDescriptionAr')}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-black text-black">
                    {ar ? 'التصنيف' : 'Category'} *
                  </label>

                  {categoryLoading ? (
                    <div className={`${inputClass} text-slate-400`}>
                      {ar
                        ? 'جاري تحميل التصنيفات...'
                        : 'Loading categories...'}
                    </div>
                  ) : categoryError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                      {categoryError}
                    </div>
                  ) : (
                    <Controller
                      name="categoryId"
                      control={control}
                      render={({ field }) => (
                        <CategoryDropdown
                          categories={categories}
                          value={field.value}
                          onChange={field.onChange}
                          ar={ar}
                        />
                      )}
                    />
                  )}

                  {errors.categoryId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.categoryId.message}
                    </p>
                  )}

                  {watchedCategoryId > 0 && selectedCategory && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
                      <span>
                        {ar ? 'النسبة:' : 'Rate:'}
                      </span>
                      <span className="text-emerald-700">
                        {commissionLabel}
                      </span>
                    </div>
                  )}
                </div>

                
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-black">
                    SKU
                  </label>
                  <input {...register('sku')} dir="ltr" className={inputClass} />

                  {errors.sku && (
                    <p className="mt-1 text-xs font-bold text-red-600">
                      {errors.sku.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black">
                    {ar ? 'السعر الأساسي' : 'Regular Price'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('regularPrice')}
                    className={inputClass}
                  />

                  {errors.regularPrice && (
                    <p className="mt-1 text-xs font-bold text-red-600">
                      {errors.regularPrice.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black">
                    {ar ? 'سعر الخصم' : 'Sale Price'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('salePrice')}
                    className={inputClass}
                  />

                  {errors.salePrice && (
                    <p className="mt-1 text-xs font-bold text-red-600">
                      {errors.salePrice.message}
                    </p>
                  )}

                  {String(watchedSalePrice ?? '').trim() !== '' && (
                    <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                      <div className="mb-3 flex items-center gap-2 text-xs font-black text-emerald-800">
                        <FiCalendar />
                        {ar
                          ? 'مدة سعر الخصم'
                          : 'Sale price schedule'}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="rounded-xl border border-emerald-100 bg-white p-2">
                          <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-500">
                            <FiCalendar />
                            {ar ? 'يبدأ' : 'Starts'}
                          </span>
                          <input
                            type="date"
                            {...register('saleStartDate')}
                            className="w-full bg-transparent text-xs font-black outline-none"
                          />
                        </label>

                        <label className="rounded-xl border border-emerald-100 bg-white p-2">
                          <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-500">
                            <FiCalendar />
                            {ar ? 'ينتهي' : 'Ends'}
                          </span>
                          <input
                            type="date"
                            {...register('saleEndDate')}
                            className="w-full bg-transparent text-xs font-black outline-none"
                          />
                        </label>
                      </div>

                      {(errors.saleStartDate || errors.saleEndDate) && (
                        <p className="mt-2 text-[11px] font-bold text-red-600">
                          {errors.saleStartDate?.message ||
                            errors.saleEndDate?.message}
                        </p>
                      )}

                      {watchedSaleStart && watchedSaleEnd && (
                        <div className="mt-2 text-[11px] font-bold text-emerald-700">
                          {ar
                            ? `الخصم فعال من ${watchedSaleStart} إلى ${watchedSaleEnd}`
                            : `Sale active from ${watchedSaleStart} to ${watchedSaleEnd}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black">
                    {ar ? 'المخزون' : 'Stock'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('stockQuantity')}
                    className={inputClass}
                  />

                  {errors.stockQuantity && (
                    <p className="mt-1 text-xs font-bold text-red-600">
                      {errors.stockQuantity.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-black">
                  {ar ? 'البراند' : 'Brand'}
                </label>

                <Controller
                  name="brandId"
                  control={control}
                  render={({ field }) => (
                    <BrandSelector
                      value={field.value}
                      onChange={field.onChange}
                      ar={ar}
                    />
                  )}
                />
              </div>

              <div>
                <h3 className="text-lg font-black text-black">
                  {ar ? 'خصائص المنتج' : 'Product Attributes'}
                </h3>
                <p className="mt-1 mb-3 text-sm text-slate-500">
                  {ar
                    ? 'اختار Attribute ثم اختار القيم التابعة له من ElDokan.'
                    : 'Choose an attribute, then select its ElDokan values.'}
                </p>

                <Controller
                  name="attributes"
                  control={control}
                  render={({ field }) => (
                    <AttributeSelector
                      value={field.value || []}
                      onChange={field.onChange}
                      ar={ar}
                      categoryId={watchedCategoryId}
                    />
                  )}
                />
              </div>





              {serverError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-7 py-3.5 font-black text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  <FiPlus />
                  {isSubmitting
                    ? ar
                      ? 'جاري الحفظ...'
                      : 'Saving...'
                    : ar
                    ? 'إضافة المنتج'
                    : 'Add Product'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </AccountLayout>
  )
}