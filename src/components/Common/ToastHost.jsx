import { useEffect, useState } from 'react'
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'

const MAX_TOASTS = 4

function toneClasses(type) {
  if (type === 'error') {
    return {
      wrap: 'border-red-200 bg-red-50 text-red-900',
      icon: 'text-red-600',
    }
  }

  if (type === 'info') {
    return {
      wrap: 'border-blue-200 bg-blue-50 text-blue-900',
      icon: 'text-blue-600',
    }
  }

  return {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: 'text-emerald-600',
  }
}

export function showToast(message, type = 'success', duration = 3800) {
  if (!message) return

  window.dispatchEvent(
    new CustomEvent('eldokan:toast', {
      detail: { message, type, duration },
    })
  )
}

export default function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    function onToast(event) {
      const detail = event?.detail || {}
      const message = String(detail.message || '').trim()
      if (!message) return

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const duration = Number(detail.duration || 3800)

      setToasts((current) => [
        ...current.slice(-(MAX_TOASTS - 1)),
        {
          id,
          message,
          type: detail.type || 'success',
        },
      ])

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, duration)
    }

    window.addEventListener('eldokan:toast', onToast)
    return () => window.removeEventListener('eldokan:toast', onToast)
  }, [])

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[99999] flex flex-col items-end gap-2 sm:inset-x-auto sm:end-4 sm:top-4 sm:w-[390px]">
      {toasts.map((toast) => {
        const tone = toneClasses(toast.type)
        const Icon = toast.type === 'error'
          ? FiAlertCircle
          : toast.type === 'info'
          ? FiInfo
          : FiCheckCircle

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${tone.wrap}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
            <div className="min-w-0 flex-1 text-sm font-bold leading-6">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 text-slate-600 hover:bg-white"
              aria-label="Close notification"
            >
              <FiX />
            </button>
          </div>
        )
      })}
    </div>
  )
}
