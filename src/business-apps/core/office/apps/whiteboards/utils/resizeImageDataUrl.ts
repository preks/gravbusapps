const MAX_DIMENSION = 2048
const TARGET_QUALITY = 0.85
const MAX_BYTES = 4 * 1024 * 1024

export function resizeImageDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && dataUrl.length < MAX_BYTES) {
        resolve(dataUrl)
        return
      }

      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1)
      width = Math.round(width * scale)
      height = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', TARGET_QUALITY))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}
