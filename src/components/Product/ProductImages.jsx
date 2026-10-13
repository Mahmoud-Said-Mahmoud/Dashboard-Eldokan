import { useEffect, useRef, useState } from 'react'
import { normalizeImage } from '../../lib/productImage'

const SLOT_COUNT = 3

export default function ProductImages({
  value = [],
  onChange,
  ar,
}) {
  const [files, setFiles] = useState(
    Array(SLOT_COUNT).fill(null)
  )

  const [previews, setPreviews] = useState(
    Array(SLOT_COUNT).fill(null)
  )

  const [processing, setProcessing] = useState(
    Array(SLOT_COUNT).fill(false)
  )

  const previewsRef = useRef(previews)

  useEffect(() => {
    previewsRef.current = previews
  }, [previews])

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [])

  // The form owns the image list. When it changes from outside this component
  // (form reset after saving, or images filled by the link import), rebuild
  // the slots and previews to match it.
  useEffect(() => {
    const current = files.filter(Boolean)
    const incoming = (value || []).slice(0, SLOT_COUNT)

    if (
      current.length === incoming.length &&
      current.every((file, index) => file === incoming[index])
    ) {
      return
    }

    previews.forEach((url) => {
      if (url) URL.revokeObjectURL(url)
    })

    setFiles(
      Array.from({ length: SLOT_COUNT }, (_, index) => incoming[index] || null)
    )
    setPreviews(
      Array.from({ length: SLOT_COUNT }, (_, index) =>
        incoming[index] ? URL.createObjectURL(incoming[index]) : null
      )
    )
  }, [value])

  // Several pictures can be chosen (or dropped) at once: the first goes to the
  // slot that was clicked and the rest fill the remaining empty slots.
  async function pick(index, originalFiles) {
    const picked = Array.from(originalFiles || []).filter((file) =>
      String(file.type || '').startsWith('image/')
    )

    if (!picked.length) return

    const targets = [
      index,
      ...Array.from({ length: SLOT_COUNT }, (_, slot) => slot).filter(
        (slot) => slot !== index && !files[slot]
      ),
    ].slice(0, picked.length)

    setProcessing((current) =>
      current.map((busy, slot) => busy || targets.includes(slot))
    )

    const nextFiles = [...files]
    const nextPreviews = [...previews]

    for (let i = 0; i < targets.length; i += 1) {
      const slot = targets[i]

      try {
        const normalizedFile = await normalizeImage(picked[i])

        if (nextPreviews[slot]) {
          URL.revokeObjectURL(nextPreviews[slot])
        }

        nextFiles[slot] = normalizedFile
        nextPreviews[slot] = URL.createObjectURL(normalizedFile)
      } catch (error) {
        // Do not show technical image validation errors to the customer.
        // Keep the slot as it was if the browser cannot decode the file.
        console.error('Image processing failed:', error)
      }
    }

    setFiles(nextFiles)
    setPreviews(nextPreviews)
    setProcessing((current) =>
      current.map((busy, slot) => (targets.includes(slot) ? false : busy))
    )
    onChange(nextFiles.filter(Boolean))
  }

  function remove(index) {
    const nextFiles = [...files]
    nextFiles[index] = null
    setFiles(nextFiles)

    const nextPreviews = [...previews]

    if (nextPreviews[index]) {
      URL.revokeObjectURL(nextPreviews[index])
    }

    nextPreviews[index] = null
    setPreviews(nextPreviews)

    onChange(nextFiles.filter(Boolean))
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: SLOT_COUNT }, (_, index) => (
          <div key={index}>
            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                pick(index, event.dataTransfer?.files)
              }}
              className="relative flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-black bg-white transition hover:bg-slate-50">
              {processing[index] ? (
                <div className="px-3 text-center text-sm font-bold text-slate-500">
                  {ar ? 'جاري تجهيز الصورة...' : 'Preparing image...'}
                </div>
              ) : previews[index] ? (
                <img
                  src={previews[index]}
                  alt=""
                  className="h-full w-full object-contain bg-white"
                />
              ) : (
                <>
                  <div className="text-4xl font-light text-black">+</div>

                  <div className="mt-2 text-sm font-bold text-slate-600">
                    {index === 0
                      ? ar
                        ? 'الصورة الرئيسية'
                        : 'Main Image'
                      : ar
                      ? `الصورة ${index + 1}`
                      : `Image ${index + 1}`}
                  </div>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  pick(index, event.target.files)
                  event.target.value = ''
                }}
              />
            </label>

            {files[index] && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-2 w-full text-xs font-bold text-red-600"
              >
                {ar ? 'حذف الصورة' : 'Remove image'}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {ar
          ? 'ارفع 3 صور للمنتج. يمكنك اختيار الثلاث صور مرة واحدة أو سحبها هنا. سيتم ضبط مقاس الصور وتجهيزها تلقائيًا.'
          : 'Upload 3 product images. You can select all three at once or drag them here. Image size and dimensions will be adjusted automatically.'}
      </p>
    </div>
  )
}
