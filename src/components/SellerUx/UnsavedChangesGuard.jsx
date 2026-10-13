import { useEffect } from 'react'

export default function UnsavedChangesGuard({ dirty, message }) {
  useEffect(() => {
    if (!dirty) return
    const handler = (event) => {
      event.preventDefault()
      event.returnValue = message || 'You have unsaved changes.'
      return event.returnValue
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, message])
  return null
}
