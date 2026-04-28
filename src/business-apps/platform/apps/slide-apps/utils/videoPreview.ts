const PREVIEW_WIDTH = 640
const PREVIEW_HEIGHT = 360
const PREVIEW_TIME_SECONDS = 0.1

function createVideoElement(): HTMLVideoElement {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  return video
}

function drawVideoFrame(video: HTMLVideoElement): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = PREVIEW_WIDTH
  canvas.height = PREVIEW_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) return null

  context.drawImage(video, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)
  try {
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return null
  }
}

export function captureVideoPreviewImage(sourceUrl: string): Promise<string | null> {
  return new Promise(resolve => {
    const video = createVideoElement()
    let settled = false

    const settle = (value: string | null) => {
      if (settled) return
      settled = true
      video.pause()
      video.removeAttribute('src')
      video.load()
      resolve(value)
    }

    const capture = () => {
      const image = drawVideoFrame(video)
      settle(image)
    }

    video.addEventListener(
      'loadeddata',
      () => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          capture()
        }
      },
      { once: true }
    )

    video.addEventListener(
      'seeked',
      () => {
        capture()
      },
      { once: true }
    )

    video.addEventListener(
      'error',
      () => {
        settle(null)
      },
      { once: true }
    )

    video.src = sourceUrl
    void video
      .play()
      .then(() => {
        video.pause()
        video.currentTime = PREVIEW_TIME_SECONDS
      })
      .catch(() => {
        try {
          video.currentTime = PREVIEW_TIME_SECONDS
        } catch {
          settle(null)
        }
      })
  })
}

export async function captureVideoPreviewFromFile(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file)
  try {
    return await captureVideoPreviewImage(objectUrl)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
