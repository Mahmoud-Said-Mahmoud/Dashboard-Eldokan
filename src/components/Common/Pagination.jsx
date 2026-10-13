import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function Pagination({
  page = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  ar = false,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  const totalPages = Math.max(1, Math.ceil(Number(totalItems || 0) / Number(pageSize || 10)))
  const currentPage = Math.min(Math.max(1, Number(page || 1)), totalPages)

  if (!totalItems) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(totalItems, currentPage * pageSize)

  const pageNumbers = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)

  for (let number = start; number <= end; number += 1) {
    pageNumbers.push(number)
  }

  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-bold text-slate-500">
        {ar
          ? `عرض ${startItem} - ${endItem} من ${totalItems}`
          : `Showing ${startItem} - ${endItem} of ${totalItems}`}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-black"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {ar ? `${size} / صفحة` : `${size} / page`}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
          title={ar ? 'السابق' : 'Previous'}
        >
          {ar ? <FiChevronRight /> : <FiChevronLeft />}
        </button>

        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange?.(1)}
              className="h-9 min-w-9 rounded-xl border border-slate-200 px-3 text-sm font-black"
            >
              1
            </button>
            {start > 2 && <span className="px-1 text-slate-400">…</span>}
          </>
        )}

        {pageNumbers.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPageChange?.(number)}
            className={`h-9 min-w-9 rounded-xl border px-3 text-sm font-black transition ${
              number === currentPage
                ? 'border-black bg-black text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            {number}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
            <button
              type="button"
              onClick={() => onPageChange?.(totalPages)}
              className="h-9 min-w-9 rounded-xl border border-slate-200 px-3 text-sm font-black"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
          title={ar ? 'التالي' : 'Next'}
        >
          {ar ? <FiChevronLeft /> : <FiChevronRight />}
        </button>
      </div>
    </div>
  )
}
