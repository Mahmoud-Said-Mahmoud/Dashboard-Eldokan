import { useEffect, useMemo, useState } from 'react'
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiSave,
} from 'react-icons/fi'
import AccountLayout from '../../components/AccountLayout/AccountLayout'
import UnsavedChangesGuard from '../../components/SellerUx/UnsavedChangesGuard'
import { saveProductDraft } from '../../lib/sellerUx'
import { nameError, pricingError } from '../../lib/productValidation'
import {
  getProductCategories,
  getProductDetails,
  updateProduct,
} from '../../lib/productApi'
import {
  productNameForLanguage,
  productShortDescriptionForLanguage,
  productLongDescriptionForLanguage,
} from '../../lib/productLocale'

export default function EditProduct({
  productId,
  language,
  currentUser,
  onHome,
  onSettings,
  onOrders,
  onProducts,
  onAddProduct,
  onLogout,
}) {
  const ar = language === 'ar'
  const role = currentUser?.role || ''
  const permissions = currentUser?.permissions || {}
  const canEdit =
    role === 'eldokan_owner' ||
    Boolean(permissions.editProducts) ||
    Boolean(permissions.editPrices) ||
    Boolean(permissions.editStock)

  const [product, setProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false

    function normalizeProduct(found) {
      if (!found) return null

      return {
        ...found,
        nameEn:
          found.nameEn ||
          found.name ||
          '',
        nameAr:
          found.nameAr || '',
        shortDescriptionEn:
          found.shortDescriptionEn || '',
        shortDescriptionAr:
          found.shortDescriptionAr || '',
        longDescriptionEn:
          found.longDescriptionEn || '',
        longDescriptionAr:
          found.longDescriptionAr || '',
        categoryId:
          Number(
            found.categoryIds?.[
              found.categoryIds.length - 1
            ] || found.categoryId || 0
          ),
        regularPrice:
          found.regularPrice ?? '',
        salePrice:
          found.salePrice ?? '',
        saleStartDate:
          found.saleStartDate ?? '',
        saleEndDate:
          found.saleEndDate ?? '',
        stockQuantity:
          found.stockQuantity ?? 0,
        sku: found.sku ?? '',
        brandId: found.brandId ?? '',
        attributes: Array.isArray(found.attributes) ? found.attributes : [],
      }
    }

    // First paint from the last successful Products response.
    // This means a temporary 502 cannot blank the Edit Product screen.
    try {
      const cachedProducts = JSON.parse(
        sessionStorage.getItem(
          'eldokan_products_cache'
        ) || '[]'
      )

      const cachedProduct =
        Array.isArray(cachedProducts)
          ? cachedProducts.find(
              (item) =>
                Number(item.id) ===
                Number(productId)
            )
          : null

      if (cachedProduct) {
        setProduct(
          normalizeProduct(
            cachedProduct
          )
        )
        setLoading(false)
      }
    } catch {
      // Ignore invalid browser cache.
    }

    async function loadFresh() {
      setError('')

      const [
        productResult,
        categoryResult,
      ] = await Promise.allSettled([
        getProductDetails(productId),
        getProductCategories(),
      ])

      if (cancelled) return

      if (
        productResult.status ===
        'fulfilled'
      ) {
        const found = productResult.value
        if (found) {
          setProduct(normalizeProduct(found))
        }
      }

      if (
        categoryResult.status ===
        'fulfilled'
      ) {
        const categoryRows =
          categoryResult.value

        setCategories(
          Array.isArray(categoryRows)
            ? categoryRows
            : []
        )
      }

      // Only show an error if there is no usable cached/fresh product.
      if (
        productResult.status ===
        'rejected'
      ) {
        setProduct((current) => {
          if (current) {
            return current
          }

          setError(
            ar
              ? 'تعذر تحديث بيانات المنتج من السيرفر مؤقتًا. يمكنك الرجوع للمنتجات والمحاولة مرة أخرى.'
              : 'The product could not be refreshed from the server temporarily. You can return to Products and retry.'
          )

          return current
        })
      }

      setLoading(false)
    }

    loadFresh().catch(() => {
      if (!cancelled) {
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [productId, ar])

  useEffect(() => {
    if (!dirty || !product) return
    const timer = window.setTimeout(() => {
      saveProductDraft(`edit:${productId}`, product)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [dirty, product, productId])


  const selectedCategory = useMemo(
    () =>
      categories.find(
        (item) =>
          Number(item.id) ===
          Number(product?.categoryId || 0)
      ),
    [categories, product]
  )

  const commissionPercent =
    Number(
      selectedCategory?.commissionPercent ||
      product?.commissionPercent ||
      0
    )

  const commissionFixed =
    Number(
      selectedCategory?.feeFixed ||
      product?.feeFixed ||
      0
    )

  const commissionLabel =
    commissionPercent > 0 && commissionFixed > 0
      ? `${commissionPercent}% + ${commissionFixed} EGP`
      : commissionFixed > 0
        ? `${commissionFixed} EGP`
        : `${commissionPercent}%`

  function setField(key, value) {
    setDirty(true)
    setProduct((current) => ({
      ...current,
      [key]: value,
    }))
  }


  async function save() {
    if (!canEdit || !product) return

    setError('')
    setSuccess('')

    const validationError =
      nameError(product.nameEn, ar, 'en') ||
      nameError(product.nameAr, ar, 'ar') ||
      pricingError(product, ar)

    if (validationError) {
      setError(validationError)
      return
    }

    const hasSale =
      String(product.salePrice ?? '').trim() !== ''

    setSaving(true)

    try {
      const data = await updateProduct(
        product.id,
        {
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          shortDescriptionEn:
            product.shortDescriptionEn,
          shortDescriptionAr:
            product.shortDescriptionAr,
          longDescriptionEn:
            product.longDescriptionEn,
          longDescriptionAr:
            product.longDescriptionAr,
          categoryId:
            Number(product.categoryId || 0),
          regularPrice:
            product.regularPrice,
          salePrice:
            product.salePrice,
          saleStartDate:
            hasSale
              ? product.saleStartDate
              : '',
          saleEndDate:
            hasSale
              ? product.saleEndDate
              : '',
          stockQuantity:
            product.stockQuantity,
          sku: product.sku || '',
          brandId: product.brandId || '',
          attributes: product.attributes || [],
        }
      )

      setSuccess(
        ar
          ? 'تم حفظ التعديلات.'
          : 'Changes saved.'
      )
      setDirty(false)

      if (data?.product) {
        setProduct((current) => ({
          ...current,
          ...data.product,
        }))
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : ar
          ? 'تعذر حفظ التعديلات.'
          : 'Could not save changes.'
      )
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-black focus:ring-4 focus:ring-slate-100'

  return (
    <>
      <UnsavedChangesGuard
        dirty={dirty}
        message={
          ar
            ? 'لديك تعديلات لم يتم حفظها.'
            : 'You have unsaved changes.'
        }
      />
      <AccountLayout
      language={language}
      role={role}
      permissions={permissions}
      active="products"
      onHome={onHome}
      onSettings={onSettings}
      onOrders={onOrders}
      onProducts={onProducts}
      onAddProduct={onAddProduct}
      onLogout={onLogout}
    >
      <div
        dir={ar ? 'rtl' : 'ltr'}
        className="eldokan-page min-h-screen bg-[#f7f9fc] p-4 sm:p-7"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-emerald-700">
                Seller Center
              </div>
              <h1 className="mt-1 text-3xl font-black text-slate-950">
                {ar
                  ? 'تعديل المنتج'
                  : 'Edit Product'}
              </h1>
            </div>

            <button
              type="button"
              onClick={onProducts}
              title={
                ar
                  ? 'رجوع للمنتجات'
                  : 'Back to Products'
              }
              aria-label={
                ar
                  ? 'رجوع للمنتجات'
                  : 'Back to Products'
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm hover:bg-slate-50"
            >
              {ar
                ? <FiArrowRight />
                : <FiArrowLeft />}
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center text-slate-400">
              {ar
                ? 'جاري تحميل المنتج...'
                : 'Loading product...'}
            </div>
          ) : !product ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    {ar ? 'معاينة المحتوى العربي' : 'English content preview'}
                  </div>
                  <h2
                    dir={ar ? 'rtl' : 'ltr'}
                    className="text-2xl font-black text-slate-950"
                  >
                    {productNameForLanguage(product, language) || (ar ? 'بدون اسم' : 'Untitled product')}
                  </h2>
                  {productShortDescriptionForLanguage(product, language) && (
                    <p
                      dir={ar ? 'rtl' : 'ltr'}
                      className="text-sm font-bold leading-7 text-slate-700"
                    >
                      {productShortDescriptionForLanguage(product, language)}
                    </p>
                  )}
                  {productLongDescriptionForLanguage(product, language) && (
                    <div
                      dir={ar ? 'rtl' : 'ltr'}
                      className="whitespace-pre-wrap text-sm leading-7 text-slate-600"
                    >
                      {productLongDescriptionForLanguage(product, language)}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">{ar ? 'صور المنتج' : 'Product Images'}</h2>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  {ar
                    ? 'صور المنتج مقفولة أثناء التعديل لتقليل التحميل على السيرفر. لا يمكن للتاجر حذفها أو استبدالها من صفحة التعديل.'
                    : 'Product images are locked during editing to reduce server load. Sellers cannot remove or replace images from the Edit Product page.'}
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-xl font-black">
                    {ar
                      ? 'محتوى المنتج'
                      : 'Product Content'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {ar
                      ? 'عدّل المحتوى بالعربي والإنجليزي في نفس الصفحة.'
                      : 'Edit English and Arabic content side by side.'}
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div dir="ltr" className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="mb-4 text-sm font-black text-slate-900">
                      English
                    </div>

                    <label className="mb-2 block text-sm font-black">
                      Product Name
                    </label>
                    <input
                      value={product.nameEn}
                      onChange={(event) =>
                        setField(
                          'nameEn',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <label className="mb-2 mt-5 block text-sm font-black">
                      Short Description
                    </label>
                    <textarea
                      rows="3"
                      maxLength="500"
                      value={product.shortDescriptionEn}
                      onChange={(event) =>
                        setField(
                          'shortDescriptionEn',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <label className="mb-2 mt-5 block text-sm font-black">
                      Full Description
                    </label>
                    <textarea
                      rows="7"
                      value={product.longDescriptionEn}
                      onChange={(event) =>
                        setField(
                          'longDescriptionEn',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div dir="rtl" className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="mb-4 text-sm font-black text-slate-900">
                      العربية
                    </div>

                    <label className="mb-2 block text-sm font-black">
                      اسم المنتج
                    </label>
                    <input
                      value={product.nameAr}
                      onChange={(event) =>
                        setField(
                          'nameAr',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <label className="mb-2 mt-5 block text-sm font-black">
                      الوصف المختصر
                    </label>
                    <textarea
                      rows="3"
                      maxLength="500"
                      value={product.shortDescriptionAr}
                      onChange={(event) =>
                        setField(
                          'shortDescriptionAr',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <label className="mb-2 mt-5 block text-sm font-black">
                      الوصف الكامل
                    </label>
                    <textarea
                      rows="7"
                      value={product.longDescriptionAr}
                      onChange={(event) =>
                        setField(
                          'longDescriptionAr',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">
                  {ar
                    ? 'التصنيف والتسعير'
                    : 'Category & Pricing'}
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-black">
                      {ar ? 'التصنيف' : 'Category'}
                    </label>
                    <select
                      value={product.categoryId}
                      onChange={(event) =>
                        setField(
                          'categoryId',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        {ar
                          ? 'اختر التصنيف'
                          : 'Select Category'}
                      </option>
                      {categories.map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>

                    {Number(product.categoryId || 0) > 0 && selectedCategory && (
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

                  <div>
                    <label className="mb-2 block text-sm font-black">SKU</label>
                    <input
                      value={product.sku || ''}
                      onChange={(event) => setField('sku', event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black">
                      {ar
                        ? 'السعر الأساسي'
                        : 'Regular Price'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.regularPrice}
                      onChange={(event) =>
                        setField(
                          'regularPrice',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black">
                      {ar
                        ? 'سعر الخصم'
                        : 'Sale Price'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.salePrice}
                      onChange={(event) =>
                        setField(
                          'salePrice',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />

                    {String(
                      product.salePrice ?? ''
                    ).trim() !== '' && (
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
                              {ar
                                ? 'يبدأ'
                                : 'Starts'}
                            </span>
                            <input
                              type="date"
                              value={product.saleStartDate}
                              onChange={(event) =>
                                setField(
                                  'saleStartDate',
                                  event.target.value
                                )
                              }
                              className="w-full bg-transparent text-xs font-black outline-none"
                            />
                          </label>

                          <label className="rounded-xl border border-emerald-100 bg-white p-2">
                            <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-500">
                              <FiCalendar />
                              {ar
                                ? 'ينتهي'
                                : 'Ends'}
                            </span>
                            <input
                              type="date"
                              value={product.saleEndDate}
                              onChange={(event) =>
                                setField(
                                  'saleEndDate',
                                  event.target.value
                                )
                              }
                              className="w-full bg-transparent text-xs font-black outline-none"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black">
                      {ar
                        ? 'المخزون'
                        : 'Stock'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={product.stockQuantity}
                      onChange={(event) =>
                        setField(
                          'stockQuantity',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  <FiCheck />
                  {success}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  title={
                    ar
                      ? 'حفظ التعديلات'
                      : 'Save Changes'
                  }
                  aria-label={
                    ar
                      ? 'حفظ التعديلات'
                      : 'Save Changes'
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-lg text-white shadow-sm hover:bg-slate-900 disabled:opacity-50"
                >
                  <FiSave />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
    </>
  )
}