import { Fragment, useEffect, useState, useMemo } from 'react'
import {
  getProducts,
  getLiveProductLink,
  updateProduct,
  deleteProduct,
} from '../../lib/productApi'
import AccountLayout from '../../components/AccountLayout/AccountLayout'
import Breadcrumb from '../../components/Common/Breadcrumb'
import { pricingError } from '../../lib/productValidation'
import {
  FiPlus,
  FiRefreshCw,
  FiEdit2,
  FiEye,
  FiSave,
  FiTrash2,
  FiX,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'
import Pagination from '../../components/Common/Pagination'
import {
  productNameForLanguage,
  productShortDescriptionForLanguage,
} from '../../lib/productLocale'

export default function Products({
  language,
  currentUser,
  onHome,
  onSettings,
  onOrders,
  onToggleLanguage,
  onProducts,
  onAddProduct,
  onEditProduct,
  onLogout,
}) {
  const ar = language === 'ar'
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const role = currentUser?.role || ''

  const permissions = currentUser?.permissions || {}
  const isOwner = role === 'eldokan_owner'
  const canEditDetails = isOwner || permissions.editProducts
  const canEditPrices = isOwner || permissions.editPrices
  const canEditStock = isOwner || permissions.editStock
  const canManageSales = isOwner || permissions.manageSales
  const canEdit =
    canEditDetails ||
    canEditPrices ||
    canEditStock ||
    canManageSales
  const canDelete = isOwner || permissions.deleteProducts

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [deleteUserProduct, setDeleteUserProduct] = useState(null)
  const [quickEditId, setQuickEditId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [openingLiveId, setOpeningLiveId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  async function loadProducts() {
    setLoading(true)
    setError('')

    try {
      const data = await getProducts()

      setProducts(
        data.map((product) => ({
          ...product,
          resolvedImageUrl:
            product?.productImageUrl ||
            product?.featuredImageUrl ||
            product?.imageUrl ||
            product?.image ||
            '',
          editRegularPrice:
            product.regularPrice ?? '',
          editSalePrice:
            product.salePrice ?? '',
          editSaleStartDate:
            product.saleStartDate ?? '',
          editSaleEndDate:
            product.saleEndDate ?? '',
          editStockQuantity:
            product.stockQuantity ?? 0,
        }))
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر تحميل المنتجات'
          : 'Could not load products'
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadProducts()
  }, [])

  function changeField(productId, field, value) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? {
              ...product,
              [field]: value,
            }
          : product
      )
    )
  }

  useEffect(() => {
    try {
      if (Array.isArray(products) && products.length) {
        sessionStorage.setItem(
          'eldokan_products_cache',
          JSON.stringify(products)
        )
      }
    } catch {
      // Browser storage is only a resilience cache.
    }
  }, [products])

  async function saveProduct(product) {
    if (!canEdit) return

    const validationError = pricingError(
      {
        regularPrice: product.editRegularPrice,
        salePrice: product.editSalePrice,
        saleStartDate: product.editSaleStartDate,
        saleEndDate: product.editSaleEndDate,
        stockQuantity: product.editStockQuantity,
      },
      ar
    )

    if (validationError) {
      setError(validationError)
      return
    }

    setSavingId(product.id)
    setError('')

    try {
      await updateProduct(product.id, {
        regularPrice: product.editRegularPrice,
        salePrice: product.editSalePrice,
        saleStartDate: product.editSaleStartDate,
        saleEndDate: product.editSaleEndDate,
        stockQuantity: product.editStockQuantity,
      })

      await loadProducts()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر حفظ التعديلات'
          : 'Could not save product changes'
      )
    } finally {
      setSavingId(null)
    }
  }


  async function openLiveProduct(product) {
    if (!product?.id || openingLiveId) return

    setOpeningLiveId(product.id)
    setError('')

    try {
      const url = await getLiveProductLink(product.id, ar ? 'ar' : 'en')

      if (!url) {
        throw new Error(ar ? 'رابط المنتج غير متاح.' : 'Product URL is unavailable.')
      }

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر فتح المنتج على الموقع'
          : 'Could not open product on website'
      )
    } finally {
      setOpeningLiveId(null)
    }
  }


  async function confirmDelete() {
    if (!canDelete || !deleteUserProduct) return

    setDeletingId(deleteUserProduct.id)
    setError('')

    try {
      await deleteProduct(deleteUserProduct.id)
      setDeleteUserProduct(null)
      await loadProducts()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر حذف المنتج'
          : 'Could not delete product'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !normalizedSearch ||
      String(productNameForLanguage(product, language) || '').toLowerCase().includes(normalizedSearch) ||
      String(product.nameEn || '').toLowerCase().includes(normalizedSearch) ||
      String(product.nameAr || '').toLowerCase().includes(normalizedSearch) ||
      String(productShortDescriptionForLanguage(product, language) || '').toLowerCase().includes(normalizedSearch) ||
      String(product.sku || '').toLowerCase().includes(normalizedSearch)

    const approvalStatus =
      product.approvalStatus ||
      (product.status === 'publish' ? 'live' : 'not_live')

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'live' && approvalStatus === 'live') ||
      (statusFilter === 'pending' && approvalStatus === 'pending') ||
      (statusFilter === 'rejected' && approvalStatus === 'rejected') ||
      (statusFilter === 'not_live' &&
        !['live', 'pending', 'rejected'].includes(approvalStatus))

    return matchesSearch && matchesStatus
  })

  function normalizeImageUrl(raw) {
    if (!raw) {
      return ''
    }

    const value =
      typeof raw === 'string'
        ? raw
        : raw?.src || raw?.url || ''

    if (!value) {
      return ''
    }

    if (
      /^https?:\/\//i.test(value) ||
      value.startsWith('data:') ||
      value.startsWith('blob:')
    ) {
      return value
    }

    if (value.startsWith('/')) {
      return `https://eldokan.com${value}`
    }

    try {
      return new URL(
        value,
        'https://eldokan.com'
      ).href
    } catch {
      return value
    }
  }

  function productImageCandidates(product) {
    const rawCandidates = [
      product?.imageProxyUrl,
      product?.productImageUrl,
      product?.featuredImageUrl,
      product?.imageUrl,
      product?.image,
      product?.resolvedImageUrl,
      product?.thumbnail,
      product?.featuredImage,
      product?.featured_image,
      ...(Array.isArray(product?.imageCandidates) ? product.imageCandidates : []),
      ...(Array.isArray(product?.images)
        ? product.images.flatMap((image) => [image?.src, image?.url])
        : []),
    ]

    const urls = []

    rawCandidates.forEach((raw) => {
      const url = normalizeImageUrl(raw)

      if (!url) {
        return
      }

      urls.push(url)

      // Try both Eldokan host forms because WordPress may generate either.
      if (
        url.startsWith(
          'https://www.eldokan.com/'
        )
      ) {
        urls.push(
          url.replace(
            'https://www.eldokan.com/',
            'https://eldokan.com/'
          )
        )
      } else if (
        url.startsWith(
          'https://eldokan.com/'
        )
      ) {
        urls.push(
          url.replace(
            'https://eldokan.com/',
            'https://www.eldokan.com/'
          )
        )
      }
    })

    return [
      ...new Set(
        urls.filter(Boolean)
      ),
    ]
  }

  function productImageSrc(product) {
    return (
      productImageCandidates(product)[0] ||
      ''
    )
  }

  function tryNextProductImage(
    event,
    product
  ) {
    const img = event.currentTarget
    const candidates =
      productImageCandidates(product)

    const currentIndex = Number(
      img.dataset.imageIndex || 0
    )

    const nextIndex =
      currentIndex + 1

    if (nextIndex < candidates.length) {
      img.dataset.imageIndex =
        String(nextIndex)

      img.src =
        candidates[nextIndex]

      return
    }

    img.onerror = null
    img.style.display = 'none'

    const fallback =
      img.parentElement?.querySelector('[data-image-fallback="true"]')

    if (fallback) {
      fallback.style.display = 'flex'
    }
  }


  const inputClass =
    'w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-200'

  const paginatedFilteredProducts = useMemo(() => {
    const start = (page - 1) * pageSize
    return (filteredProducts || []).slice(start, start + pageSize)
  }, [filteredProducts, page, pageSize])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(((filteredProducts || []).length) / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredProducts, page, pageSize])


  return (
    <AccountLayout
      language={language}
      role={role}
      permissions={currentUser?.permissions || {}}
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
        className="eldokan-page min-h-screen bg-[#f7f9fc] p-4 sm:p-8"
      >
        <div className="mx-auto max-w-7xl">

          <Breadcrumb
            ar={ar}
            items={[
              {
                label: ar ? 'المنتجات' : 'Products',
              },
            ]}
          />
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-black">
                {ar ? 'المنتجات' : 'Products'}
              </h1>

              <p className="mt-2 text-slate-500">
                {ar
                  ? 'المنتجات التي أضافها الحساب وحالة الموافقة عليها.'
                  : 'Products created by this account and their approval status.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleLanguage}
                className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-2 text-sm font-bold"
              >
                {ar ? 'English' : 'العربية'}
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                title={ar ? 'تحديث الصفحة' : 'Refresh Page'}
                aria-label={ar ? 'تحديث الصفحة' : 'Refresh Page'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <FiRefreshCw />
              </button>

              <button
                type="button"
                onClick={onAddProduct}
                title={ar ? 'إضافة منتج' : 'Add Product'}
                aria-label={ar ? 'إضافة منتج' : 'Add Product'}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"
              >
                <FiPlus />
              </button>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={ar ? 'البحث باسم المنتج أو SKU' : 'Search by product name or SKU'}
                className="h-14 flex-1 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-slate-100"
              />
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title={ar ? 'مسح البحث' : 'Clear Search'}
                aria-label={ar ? 'مسح البحث' : 'Clear Search'}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 bg-white text-lg hover:bg-slate-50"
              >
                <FiX />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: ar ? 'الكل' : 'All', count: products.length },
                {
                  key: 'live',
                  label: 'Live',
                  count: products.filter((product) =>
                    (product.approvalStatus || (product.status === 'publish' ? 'live' : 'not_live')) === 'live'
                  ).length,
                },
                {
                  key: 'pending',
                  label: ar ? 'قيد المراجعة' : 'Pending',
                  count: products.filter((product) =>
                    (product.approvalStatus || (product.status === 'publish' ? 'live' : 'not_live')) === 'pending'
                  ).length,
                },
                {
                  key: 'rejected',
                  label: ar ? 'مرفوض' : 'Rejected',
                  count: products.filter((product) =>
                    (product.approvalStatus || (product.status === 'publish' ? 'live' : 'not_live')) === 'rejected'
                  ).length,
                },
                {
                  key: 'not_live',
                  label: ar ? 'غير منشور' : 'Not Live',
                  count: products.filter((product) => {
                    const status = product.approvalStatus || (product.status === 'publish' ? 'live' : 'not_live')
                    return !['live', 'pending', 'rejected'].includes(status)
                  }).length,
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-xl border px-5 py-2.5 text-sm font-bold transition ${
                    statusFilter === item.key
                      ? 'border-black bg-black text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
              {ar ? 'جاري تحميل المنتجات...' : 'Loading products...'}
            </div>
          ) : filteredProducts.length ? (
            <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              <table className="eldokan-products-table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-black">
                      {ar ? 'المنتج' : 'Product'}
                    </th>
                    <th className="px-4 py-3 text-start text-sm font-black">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-start text-sm font-black">
                      {ar ? 'السعر' : 'Price'}
                    </th>
                    <th className="px-4 py-3 text-start text-sm font-black">
                      {ar ? 'المخزون' : 'Stock'}
                    </th>
                    <th className="px-4 py-3 text-start text-sm font-black">
                      {ar ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-start text-sm font-black">
                      {ar ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedFilteredProducts.map((product) => {
                    const hasSale =
                      String(product.editSalePrice ?? product.salePrice ?? '').trim() !== ''

                    const quickOpen =
                      quickEditId === product.id

                    return (
                      <Fragment key={product.id}>
                        <tr className="align-middle hover:bg-slate-50/60">
                          <td className="px-4 py-4">
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                {productImageSrc(product) ? (
                                  <>
                                    <img
                                      src={productImageSrc(product)}
                                      alt={productNameForLanguage(product, language)}
                                      loading="lazy"
                                      decoding="async"
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full bg-white object-cover"
                                      data-image-index="0"
                                      onError={(event) =>
                                        tryNextProductImage(
                                          event,
                                          product
                                        )
                                      }
                                    />
                                    <div
                                      data-image-fallback="true"
                                      className="hidden h-full w-full items-center justify-center px-1 text-center text-[9px] text-slate-400"
                                    >
                                      {ar ? 'بدون صورة' : 'No image'}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] text-slate-400">
                                    {ar ? 'بدون صورة' : 'No image'}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onEditProduct?.(product.id)
                                  }
                                  title={ar ? 'تعديل المنتج' : 'Edit Product'}
                                  className="block max-w-[220px] truncate text-start font-black text-slate-950 hover:text-green-700 hover:underline"
                                >
                                  {productNameForLanguage(product, language)}
                                </button>

                                {productShortDescriptionForLanguage(product, language) && (
                                  <p
                                    dir={ar ? 'rtl' : 'ltr'}
                                    className="mt-1 max-w-[320px] line-clamp-2 text-start text-xs leading-5 text-slate-500"
                                  >
                                    {productShortDescriptionForLanguage(product, language)}
                                  </p>
                                )}

                                {hasSale && (
                                  <div className="mt-2 space-y-1">
                                    <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-black text-green-700">
                                      {ar ? 'سعر الخصم' : 'Sale'}: {product.editSalePrice ?? product.salePrice}
                                    </span>

                                    {(product.editSaleStartDate || product.saleStartDate) &&
                                      (product.editSaleEndDate || product.saleEndDate) && (
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                          <FiCalendar />
                                          <span>
                                            {product.editSaleStartDate || product.saleStartDate}
                                          </span>
                                          <span>→</span>
                                          <span>
                                            {product.editSaleEndDate || product.saleEndDate}
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm font-bold text-slate-600">
                            {product.sku || '—'}
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-black text-slate-950">
                              {product.editRegularPrice ?? product.regularPrice ?? '0'}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className={`inline-flex min-w-[54px] justify-center rounded-full px-3 py-1.5 text-xs font-black ${
                              Number(product.editStockQuantity ?? product.stockQuantity ?? 0) <= 0
                                ? 'bg-red-50 text-red-700'
                                : Number(product.editStockQuantity ?? product.stockQuantity ?? 0) <= 5
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {product.editStockQuantity ?? product.stockQuantity ?? 0}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {product.isLive || product.approvalStatus === 'live' ? (
                              <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-black text-green-700">
                                Live
                              </span>
                            ) : product.approvalStatus === 'pending' ? (
                              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                                {ar ? 'قيد المراجعة' : 'Pending'}
                              </span>
                            ) : product.approvalStatus === 'rejected' ? (
                              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
                                {ar ? 'مرفوض' : 'Rejected'}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">
                                {ar ? 'غير منشور' : 'Not Live'}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuickEditId(
                                      quickOpen ? null : product.id
                                    )
                                  }
                                  title={ar ? 'تعديل سريع' : 'Quick Edit'}
                                  aria-label={ar ? 'تعديل سريع' : 'Quick Edit'}
                                  className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                                    quickOpen
                                      ? 'border-black bg-black text-white'
                                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {quickOpen
                                    ? <FiChevronUp />
                                    : <FiEdit2 />}
                                </button>
                              )}

                              {(() => {
                                const isLiveProduct = Boolean(
                                  product.isLive ||
                                  product.approvalStatus === 'live' ||
                                  product.workflowState === 'approved' ||
                                  product.status === 'publish'
                                )

                                if (!isLiveProduct) return null

                                return (
                                  <button
                                    type="button"
                                    onClick={() => openLiveProduct(product)}
                                    disabled={openingLiveId === product.id}
                                    title={ar ? 'عرض المنتج مباشرة على موقع الدكان' : 'Open product directly on ElDokan website'}
                                    aria-label={ar ? 'عرض المنتج مباشرة على موقع الدكان' : 'Open product directly on ElDokan website'}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-300 bg-sky-50 text-sky-700 transition hover:border-sky-400 hover:bg-sky-100 disabled:cursor-wait disabled:opacity-50"
                                  >
                                    <FiEye className="h-4 w-4" />
                                  </button>
                                )
                              })()}

                              <button
                                type="button"
                                onClick={() =>
                                  onEditProduct?.(product.id)
                                }
                                title={ar ? 'تعديل كل بيانات المنتج' : 'Edit All Product Data'}
                                aria-label={ar ? 'تعديل كل بيانات المنتج' : 'Edit All Product Data'}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              >
                                <FiChevronDown />
                              </button>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteUserProduct(product)
                                  }
                                  title={ar ? 'حذف' : 'Delete'}
                                  aria-label={ar ? 'حذف' : 'Delete'}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50"
                                >
                                  <FiTrash2 />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {quickOpen && canEdit && (
                          <tr className="bg-slate-50/80">
                            <td colSpan="6" className="px-4 py-4">
                              <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm p-4 shadow-sm">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-black text-slate-950">
                                      {ar ? 'تعديل سريع' : 'Quick Edit'}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                      {productNameForLanguage(product, language)}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setQuickEditId(null)}
                                    title={ar ? 'إغلاق' : 'Close'}
                                    aria-label={ar ? 'إغلاق' : 'Close'}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
                                  >
                                    <FiX />
                                  </button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <label className="mb-2 block text-xs font-black text-slate-500">
                                      {ar ? 'السعر الأساسي' : 'Regular Price'}
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={product.editRegularPrice}
                                      onChange={(event) =>
                                        changeField(
                                          product.id,
                                          'editRegularPrice',
                                          event.target.value
                                        )
                                      }
                                      className={inputClass}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-black text-slate-500">
                                      {ar ? 'المخزون' : 'Stock'}
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={product.editStockQuantity}
                                      onChange={(event) =>
                                        changeField(
                                          product.id,
                                          'editStockQuantity',
                                          event.target.value
                                        )
                                      }
                                      className={inputClass}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-black text-slate-500">
                                      {ar ? 'سعر الخصم' : 'Sale Price'}
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={product.editSalePrice}
                                      onChange={(event) =>
                                        changeField(
                                          product.id,
                                          'editSalePrice',
                                          event.target.value
                                        )
                                      }
                                      placeholder={ar ? 'اختياري' : 'Optional'}
                                      className={inputClass}
                                    />
                                  </div>
                                </div>

                                {String(product.editSalePrice ?? '').trim() !== '' && (
                                  <div className="mt-4 rounded-2xl border border-green-100 bg-green-50/60 p-4">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-black text-green-800">
                                      <FiCalendar />
                                      {ar ? 'مدة الخصم' : 'Sale Period'}
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <label className="rounded-xl border border-green-100 bg-white p-3">
                                        <span className="mb-2 block text-[11px] font-black text-slate-500">
                                          {ar ? 'بداية الخصم' : 'Starts'}
                                        </span>
                                        <input
                                          type="date"
                                          value={product.editSaleStartDate || ''}
                                          onChange={(event) =>
                                            changeField(
                                              product.id,
                                              'editSaleStartDate',
                                              event.target.value
                                            )
                                          }
                                          className="w-full bg-transparent text-sm font-black outline-none"
                                        />
                                      </label>

                                      <label className="rounded-xl border border-green-100 bg-white p-3">
                                        <span className="mb-2 block text-[11px] font-black text-slate-500">
                                          {ar ? 'نهاية الخصم' : 'Ends'}
                                        </span>
                                        <input
                                          type="date"
                                          value={product.editSaleEndDate || ''}
                                          onChange={(event) =>
                                            changeField(
                                              product.id,
                                              'editSaleEndDate',
                                              event.target.value
                                            )
                                          }
                                          className="w-full bg-transparent text-sm font-black outline-none"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}

                                <div className="mt-4 flex justify-end">
                                  <button
                                    type="button"
                                    disabled={savingId === product.id}
                                    onClick={() => saveProduct(product)}
                                    title={ar ? 'حفظ' : 'Save'}
                                    aria-label={ar ? 'حفظ' : 'Save'}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white disabled:opacity-50"
                                  >
                                    <FiSave />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-12 text-center">
              <h2 className="text-xl font-black text-black">
                {ar ? 'لا توجد منتجات بعد' : 'No products yet'}
              </h2>

              <button
                type="button"
                onClick={onAddProduct}
                title={ar ? 'إضافة منتج' : 'Add Product'}
                aria-label={ar ? 'إضافة منتج' : 'Add Product'}
                className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white"
              >
                <FiPlus />
              </button>
            </div>
          )}
        </div>

        {deleteUserProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
              dir={ar ? 'rtl' : 'ltr'}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h2 className="text-xl font-black text-black">
                {ar ? 'حذف المنتج' : 'Delete Product'}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {ar
                  ? `هل أنت متأكد من حذف "${productNameForLanguage(deleteUserProduct, language)}"؟`
                  : `Are you sure you want to delete "${productNameForLanguage(deleteUserProduct, language)}"?`}
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={deletingId === deleteUserProduct.id}
                  onClick={confirmDelete}
                  title={ar ? 'تأكيد الحذف' : 'Confirm Delete'}
                  aria-label={ar ? 'تأكيد الحذف' : 'Confirm Delete'}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white disabled:opacity-50"
                >
                  <FiTrash2 />
                </button>

                <button
                  type="button"
                  disabled={deletingId === deleteUserProduct.id}
                  onClick={() => setDeleteUserProduct(null)}
                  title={ar ? 'إلغاء' : 'Cancel'}
                  aria-label={ar ? 'إلغاء' : 'Cancel'}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm text-slate-700"
                >
                  <FiX />
                </button>
              </div>
            </div>
          </div>
        )}
      
        <Pagination
          page={page}
          totalItems={(filteredProducts || []).length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          ar={ar}
        />
</div>
    </AccountLayout>
  )
}
