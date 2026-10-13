import { useEffect, useRef, useState } from 'react'
import {
  getProductAttributes,
  getProductAttributeTerms,
} from '../../lib/productApi'

export default function AttributeSelector({ value = [], onChange, ar, categoryId = 0 }) {
  const [attributes, setAttributes] = useState([])
  const [loading, setLoading] = useState(true)
  const [attributeSearch, setAttributeSearch] = useState('')
  const [termSearch, setTermSearch] = useState({})
  const [loadError, setLoadError] = useState(false)
  const [reload, setReload] = useState(0)
  const latest = useRef({ value, onChange })
  const categoryGeneration = useRef(0)
  latest.current = { value, onChange }

  function publish(rows) {
    latest.current.value = rows
    latest.current.onChange(rows)
  }

  useEffect(() => {
    let cancelled = false
    categoryGeneration.current += 1
    setLoading(true)
    setLoadError(false)
    setAttributes([])
    setAttributeSearch('')
    setTermSearch({})
    const selectedCategory = Number(categoryId || 0)
    if (!selectedCategory) {
      setLoading(false)
      return () => { cancelled = true }
    }

    getProductAttributes(selectedCategory)
      .then((rows) => {
        if (cancelled) return
        setAttributes(rows)
        const allowed = new Set(rows.map((item) => Number(item.id)))
        const current = latest.current.value || []
        const next = current
          .filter((row) => !Number(row.attributeId) || allowed.has(Number(row.attributeId)))
          .map((row) => row.loading ? { ...row, loading: false, termError: true } : row)
        if (next.length !== current.length || next.some((row, index) => row !== current[index])) {
          latest.current.value = next
          latest.current.onChange(next)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      categoryGeneration.current += 1
    }
  }, [categoryId, reload])

  function addRow() {
    publish([...value, { attributeId: 0, termIds: [], terms: [] }])
  }

  function removeRow(index) {
    publish(value.filter((_, i) => i !== index))
  }

  async function changeAttribute(index, id) {
    const attributeId = Number(id)
    const generation = categoryGeneration.current
    const next = value.map((row, i) =>
      i === index
        ? { ...row, attributeId, termIds: [], terms: [], loading: !!attributeId, termError: false }
        : row
    )
    const target = next[index]
    publish(next)
    if (!attributeId) return

    try {
      const terms = await getProductAttributeTerms(attributeId)
      if (generation !== categoryGeneration.current) return
      const current = latest.current.value || []
      if (!current.includes(target)) return
      publish(current.map((row) => row === target ? { ...row, terms, loading: false } : row))
    } catch {
      if (generation !== categoryGeneration.current) return
      const current = latest.current.value || []
      if (!current.includes(target)) return
      publish(current.map((row) => row === target ? { ...row, loading: false, termError: true } : row))
    }
  }

  function toggleTerm(index, termId) {
    const id = Number(termId)
    publish(
      value.map((row, i) => {
        if (i !== index) return row
        const exists = row.termIds.includes(id)
        return {
          ...row,
          termIds: exists
            ? row.termIds.filter((x) => x !== id)
            : [...row.termIds, id],
        }
      })
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
        {ar ? 'جاري تحميل الخصائص...' : 'Loading attributes...'}
      </div>
    )
  }

  if (loadError) {
    return <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700">
      <p>{ar ? 'تعذر تحميل خصائص الفئة. حاول مرة أخرى.' : 'Could not load category attributes. Please retry.'}</p>
      <button type="button" onClick={() => setReload((n) => n + 1)} className="mt-2 underline">
        {ar ? 'إعادة المحاولة' : 'Retry'}
      </button>
    </div>
  }

  if (!Number(categoryId || 0) || !attributes.length) {
    return <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
      {!Number(categoryId || 0)
        ? (ar ? 'اختر الفئة أولًا لعرض خصائصها.' : 'Select a category to see its attributes.')
        : (ar ? 'لا توجد خصائص متاحة لهذه الفئة حاليًا.' : 'No attributes are currently available for this category.')}
    </div>
  }

  return (
    <div className="space-y-4">
      {value.map((row, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-3">
            <input
              type="search"
              value={attributeSearch}
              onChange={(e) => setAttributeSearch(e.target.value)}
              placeholder={ar ? 'ابحث عن Attribute...' : 'Search attributes...'}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            />
            <div className="flex gap-3">
            <select
              value={row.attributeId || ''}
              onChange={(e) => changeAttribute(index, e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">
                {ar ? 'اختر Attribute' : 'Select Attribute'}
              </option>
              {attributes.filter((attribute) => String(attribute.name || '').toLowerCase().includes(attributeSearch.trim().toLowerCase())).map((attribute) => (
                <option key={attribute.id} value={attribute.id}>
                  {attribute.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => removeRow(index)}
              className="rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-bold text-red-700"
            >
              {ar ? 'حذف' : 'Remove'}
            </button>
            </div>
          </div>

          {!!row.attributeId && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-black text-black">
                {ar ? 'القيم' : 'Values'}
              </div>

              {row.loading ? (
                <div className="text-sm text-slate-500">
                  {ar ? 'جاري تحميل القيم...' : 'Loading values...'}
                </div>
              ) : row.termError ? (
                <button type="button" className="text-sm text-red-700 underline" onClick={() => changeAttribute(index, row.attributeId)}>
                  {ar ? 'تعذر تحميل القيم — إعادة المحاولة' : 'Could not load values — retry'}
                </button>
              ) : (
                <div>
                  <input
                    type="search"
                    value={termSearch[index] || ''}
                    onChange={(e) =>
                      setTermSearch((current) => ({
                        ...current,
                        [index]: e.target.value,
                      }))
                    }
                    placeholder={ar ? 'ابحث في القيم...' : 'Search values...'}
                    className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  />
                  <div className="flex flex-wrap gap-2">
                  {(row.terms || [])
                    .filter((term) =>
                      String(term.name || '').toLowerCase().includes(
                        String(termSearch[index] || '').trim().toLowerCase()
                      )
                    )
                    .map((term) => {
                    const active = row.termIds.includes(Number(term.id))
                    return (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => toggleTerm(index, term.id)}
                        className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                          active
                            ? 'border-black bg-black text-white'
                            : 'border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        {term.name}
                      </button>
                    )
                  })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="rounded-xl border border-black bg-white px-5 py-3 text-sm font-black text-black"
      >
        + {ar ? 'إضافة Attribute' : 'Add Attribute'}
      </button>
    </div>
  )
}
