import { useEffect, useMemo, useRef, useState } from 'react'

function decodeHtml(value = '') {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function Dropdown({
  label,
  placeholder,
  items,
  value,
  onChange,
  ar,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const selected = items.find(
    (item) => Number(item.id) === Number(value)
  )

  useEffect(() => {
    function handleOutsideClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-4 text-start text-sm font-bold text-slate-900 outline-none transition hover:border-black focus:border-black focus:ring-4 focus:ring-slate-200"
      >
        <span className={selected ? 'text-black' : 'text-slate-400'}>
          {selected?.name || placeholder}
        </span>

        <span
          className={`text-xs transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={ar ? 'اكتب للبحث...' : 'Type to search...'}
            className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-black"
          />
          <div className="max-h-56 overflow-y-auto">
          {items
            .filter((item) =>
              String(item.name || '').toLowerCase().includes(search.trim().toLowerCase())
            )
            .map((item) => {
            const active =
              Number(item.id) === Number(value)

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id)
                  setOpen(false)
                }}
                className={`block w-full px-4 py-3 text-start text-sm transition ${
                  active
                    ? 'bg-black font-bold text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.name}
              </button>
            )
          })}
          {!items.filter((item) =>
            String(item.name || '').toLowerCase().includes(search.trim().toLowerCase())
          ).length && (
            <div className="px-3 py-4 text-center text-sm text-slate-400">
              {ar ? 'لا توجد نتائج' : 'No results'}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CategoryDropdown({
  categories,
  value,
  onChange,
  ar,
}) {
  const normalized = useMemo(
    () =>
      (categories || []).map((item) => ({
        ...item,
        id: Number(item.id),
        parent: Number(item.parent || 0),
        name: decodeHtml(item.name || ''),
      })),
    [categories]
  )

  const mainCategories = useMemo(
    () => normalized.filter((item) => item.parent === 0),
    [normalized]
  )

  const selectedCategory = useMemo(
    () =>
      normalized.find(
        (item) => Number(item.id) === Number(value)
      ) || null,
    [normalized, value]
  )

  const selectedMainId = useMemo(() => {
    if (!selectedCategory) return 0

    return selectedCategory.parent === 0
      ? selectedCategory.id
      : selectedCategory.parent
  }, [selectedCategory])

  const [mainId, setMainId] = useState(selectedMainId)

  useEffect(() => {
    setMainId(selectedMainId)
  }, [selectedMainId])

  const subCategories = useMemo(
    () =>
      mainId
        ? normalized.filter(
            (item) => item.parent === Number(mainId)
          )
        : [],
    [normalized, mainId]
  )

  const hasSubCategories =
    Boolean(mainId) && subCategories.length > 0

  const selectedSubId =
    selectedCategory && selectedCategory.parent !== 0
      ? selectedCategory.id
      : 0

  function handleMainChange(nextMainId) {
    const id = Number(nextMainId)

    setMainId(id)

    const children = normalized.filter(
      (item) => item.parent === id
    )

    if (children.length > 0) {
      // Main has children:
      // wait for user to choose a Sub Category.
      onChange(0)
    } else {
      // Main has no children:
      // use Main Category directly.
      onChange(id)
    }
  }

  function handleSubChange(nextSubId) {
    onChange(Number(nextSubId))
  }

  return (
    <div className="space-y-4">
      <Dropdown
        label={ar ? 'التصنيف الرئيسي' : 'Main Category'}
        placeholder={
          ar
            ? 'اختر التصنيف الرئيسي'
            : 'Select Main Category'
        }
        items={mainCategories}
        value={mainId}
        onChange={handleMainChange}
        ar={ar}
      />

      {hasSubCategories && (
        <div className="animate-[fadeIn_.18s_ease-out]">
          <Dropdown
            label={ar ? 'التصنيف الفرعي' : 'Sub Category'}
            placeholder={
              ar
                ? 'اختر التصنيف الفرعي'
                : 'Select Sub Category'
            }
            items={subCategories}
            value={selectedSubId}
            onChange={handleSubChange}
            ar={ar}
          />
        </div>
      )}
    </div>
  )
}
