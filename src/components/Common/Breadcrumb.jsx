import { FiChevronLeft, FiChevronRight, FiHome } from 'react-icons/fi'

export default function Breadcrumb({
  ar,
  items = [],
}) {
  const Chevron = ar ? FiChevronLeft : FiChevronRight

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-2 text-sm"
    >
      <span className="inline-flex items-center gap-2 font-bold text-slate-400">
        <FiHome className="text-base" />
        <span>{ar ? 'لوحة التحكم' : 'Dashboard'}</span>
      </span>

      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex items-center gap-2"
        >
          <Chevron className="text-slate-300" />

          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className={`font-bold transition hover:text-black ${
                index === items.length - 1
                  ? 'text-black'
                  : 'text-slate-500'
              }`}
            >
              {item.label}
            </button>
          ) : (
            <span
              className={`font-bold ${
                index === items.length - 1
                  ? 'text-black'
                  : 'text-slate-500'
              }`}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
