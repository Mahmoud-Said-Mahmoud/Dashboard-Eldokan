import { useEffect, useRef, useState } from 'react'
import { getProductBrands } from '../../lib/productApi'
import { FiChevronDown } from 'react-icons/fi'

export default function BrandSelector({
  value,
  onChange,
  ar,
}) {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)

  useEffect(() => {
    getProductBrands()
      .then(setBrands)
      .catch((error) =>
        setError(
          error instanceof Error
            ? error.message
            : ar
            ? 'تعذر تحميل البراندات'
            : 'Could not load brands'
        )
      )
      .finally(() => setLoading(false))
  }, [ar])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [])

  const selectedBrand = brands.find(
    (brand) => Number(brand.id) === Number(value)
  )

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-500">
        {ar ? 'جاري تحميل البراندات...' : 'Loading brands...'}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3.5 text-sm font-bold outline-none transition ${
          open
            ? 'border-black ring-4 ring-slate-200'
            : 'border-slate-300 hover:border-black'
        }`}
      >
        <span className={selectedBrand ? 'text-black' : 'text-slate-500'}>
          {selectedBrand?.name ||
            (ar ? 'اختر البراند' : 'Select Brand')}
        </span>

        <FiChevronDown
          className={`text-base transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-[100] mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={ar ? 'ابحث عن البراند...' : 'Search brands...'}
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-black"
          />
          <div className="max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
            className="block w-full border-b border-slate-100 px-4 py-3 text-start text-sm font-bold text-slate-500 hover:bg-slate-50"
          >
            {ar ? 'بدون براند' : 'No Brand'}
          </button>

          {brands.filter((brand) => String(brand.name || '').toLowerCase().includes(search.trim().toLowerCase())).map((brand) => {
            const active =
              Number(brand.id) === Number(value)

            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => {
                  onChange(Number(brand.id))
                  setOpen(false)
                }}
                className={`block w-full px-4 py-3 text-start text-sm transition ${
                  active
                    ? 'bg-black font-black text-white'
                    : 'bg-white font-medium text-slate-700 hover:bg-slate-50'
                }`}
              >
                {brand.name}
              </button>
            )
          })}

          {!brands.filter((brand) => String(brand.name || '').toLowerCase().includes(search.trim().toLowerCase())).length && (
            <div className="px-4 py-4 text-center text-sm text-slate-400">
              {ar ? 'لا توجد براندات' : 'No brands found'}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}