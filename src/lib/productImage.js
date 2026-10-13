const TARGET_SIZE = 1000
const JPEG_QUALITY = 0.88

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => resolve({ image, url })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }

    image.src = url
  })
}

export async function normalizeImage(file) {
  const { image, url } = await loadImage(file)

  try {
    // Always create a clean 1000x1000 product image.
    // Small images are enlarged, large images are reduced.
    // object-contain behavior is reproduced on canvas so the whole product
    // stays visible and gets a white background.
    const canvas = document.createElement('canvas')
    canvas.width = TARGET_SIZE
    canvas.height = TARGET_SIZE

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE)

    const scale = Math.min(
      TARGET_SIZE / image.naturalWidth,
      TARGET_SIZE / image.naturalHeight
    )

    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const x = Math.round((TARGET_SIZE - width) / 2)
    const y = Math.round((TARGET_SIZE - height) / 2)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, x, y, width, height)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('Could not process image')),
        'image/jpeg',
        JPEG_QUALITY
      )
    })

    const baseName = (file.name || 'product-image')
      .replace(/\.[^.]+$/, '')
      .replace(/[^\w.-]+/g, '-')

    return new File(
      [blob],
      `${baseName}-eldokan.jpg`,
      {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
