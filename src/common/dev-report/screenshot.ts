import html2canvas from 'html2canvas-pro'

export type DevReportScreenshot = {
  dataUrl: string
  mimeType: 'image/jpeg'
  width: number
  height: number
}

function safeMessage(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`.slice(0, 500)
  return String(e).slice(0, 500)
}

function captureVideoFrames(): Map<number, string> {
  const frames = new Map<number, string>()
  try {
    document.querySelectorAll('video').forEach((video, idx) => {
      try {
        if (!video.videoWidth || !video.videoHeight) return
        const c = document.createElement('canvas')
        c.width = video.videoWidth
        c.height = video.videoHeight
        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0, c.width, c.height)
        frames.set(idx, c.toDataURL('image/jpeg', 0.6))
      } catch {
        // cross-origin video
      }
    })
  } catch {
    // ignore
  }
  return frames
}

function getVideoPosterUrls(): Map<number, string> {
  const posters = new Map<number, string>()
  try {
    document.querySelectorAll('video').forEach((video, idx) => {
      const poster = video.getAttribute('poster')
      if (poster) posters.set(idx, poster)
    })
  } catch {
    // ignore
  }
  return posters
}

function collectBackdropElements(): Map<number, string> {
  const result = new Map<number, string>()
  try {
    document.querySelectorAll('*').forEach((el, idx) => {
      try {
        const s = getComputedStyle(el)
        if (s.backdropFilter && s.backdropFilter !== 'none') {
          result.set(idx, s.backgroundColor || '')
        }
      } catch {
        // ignore
      }
    })
  } catch {
    // ignore
  }
  return result
}

function boostAlpha(rgba: string, minAlpha = 0.85): string {
  const m = rgba.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),?\s*([\d.]+)?\s*\)/)
  if (!m) return rgba
  const boosted = Math.max(minAlpha, Math.min(1, parseFloat(m[4] ?? '1') + 0.7))
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${boosted})`
}

function collectFontFaceRules(): string {
  const rules: string[] = []
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSFontFaceRule) {
            rules.push(rule.cssText)
          }
        }
      } catch {
        // cross-origin stylesheet
      }
    }
  } catch {
    // ignore
  }
  return rules.join('\n')
}

export async function captureDevReportScreenshot(): Promise<{
  screenshot: DevReportScreenshot | null
  error?: string
}> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return { screenshot: null, error: 'no_dom' }

  try {
    try {
      await document.fonts.ready
    } catch {
      // font API unavailable
    }

    const width = Math.max(1, window.innerWidth || 0)
    const height = Math.max(1, window.innerHeight || 0)
    const videoFrames = captureVideoFrames()
    const posterUrls = getVideoPosterUrls()
    const backdropEls = collectBackdropElements()
    const fontFaceCss = collectFontFaceRules()

    const canvas = await html2canvas(document.body, {
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      x: window.scrollX,
      y: window.scrollY,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 3000,
      removeContainer: true,
      backgroundColor: null,
      ignoreElements: (el: Element) => {
        try {
          if (el.getAttribute?.('data-radix-portal') != null) return true
          const testId = el.getAttribute?.('data-testid')
          if (typeof testId === 'string' && testId.startsWith('dev-report')) return true
        } catch {
          // ignore
        }
        return false
      },
      onclone: async (clonedDoc: Document) => {
        try {
          const patchCss = clonedDoc.createElement('style')
          patchCss.textContent = [
            '* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
            fontFaceCss
          ].join('\n')
          clonedDoc.head.appendChild(patchCss)

          const allCloned = clonedDoc.querySelectorAll('*')
          backdropEls.forEach((bg, idx) => {
            const el = allCloned[idx] as HTMLElement | undefined
            if (el?.style && bg) el.style.backgroundColor = boostAlpha(bg)
          })

          clonedDoc.querySelectorAll('video').forEach((clonedVideo, idx) => {
            const frameUrl = videoFrames.get(idx)
            const posterUrl = posterUrls.get(idx)
            const parent = clonedVideo.parentElement
            if (parent) {
              if (frameUrl) {
                parent.style.backgroundImage = `url(${frameUrl})`
                parent.style.backgroundSize = 'cover'
                parent.style.backgroundPosition = 'center'
              } else if (posterUrl) {
                parent.style.backgroundImage = `url(${posterUrl})`
                parent.style.backgroundSize = 'cover'
                parent.style.backgroundPosition = 'center'
              } else {
                parent.style.backgroundColor = '#1a1a2e'
              }
            }
            clonedVideo.style.display = 'none'
          })

          clonedDoc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src') || ''
            if (!src || src.startsWith('data:') || src.startsWith('blob:')) return
            try {
              const u = new URL(src, window.location.origin)
              if (u.origin !== window.location.origin) {
                img.removeAttribute('src')
                img.style.visibility = 'hidden'
              }
            } catch {
              img.removeAttribute('src')
            }
          })

          try {
            await clonedDoc.fonts.ready
          } catch {
            // font API unavailable on cloned doc
          }
        } catch {
          // ignore
        }
      }
    })

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    if (!dataUrl || dataUrl === 'data:,' || dataUrl.length > 4_000_000) {
      return { screenshot: null, error: 'screenshot_too_large' }
    }
    return { screenshot: { dataUrl, mimeType: 'image/jpeg', width, height } }
  } catch (e) {
    return { screenshot: null, error: safeMessage(e) }
  }
}
