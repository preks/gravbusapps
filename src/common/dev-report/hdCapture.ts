import type { DevReportScreenshot } from './screenshot'

let stream: MediaStream | null = null
let videoEl: HTMLVideoElement | null = null

function cleanup() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
  if (videoEl) {
    videoEl.srcObject = null
    videoEl = null
  }
}

export function isHdCaptureActive(): boolean {
  if (!stream || !videoEl) return false
  const track = stream.getVideoTracks()[0]
  return !!track && track.readyState === 'live'
}

export async function initHdCapture(): Promise<boolean> {
  if (isHdCaptureActive()) return true

  cleanup()

  try {
    if (!navigator?.mediaDevices?.getDisplayMedia) return false

    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' } as any,
      preferCurrentTab: true
    } as any)

    const track = stream.getVideoTracks()[0]
    if (!track) {
      cleanup()
      return false
    }

    track.onended = cleanup

    videoEl = document.createElement('video')
    videoEl.srcObject = stream
    videoEl.muted = true
    videoEl.playsInline = true
    await videoEl.play()

    await new Promise(r => setTimeout(r, 100))
    return isHdCaptureActive()
  } catch {
    cleanup()
    return false
  }
}

export async function grabHdFrame(): Promise<{ screenshot: DevReportScreenshot | null; error?: string }> {
  if (!isHdCaptureActive() || !videoEl) {
    return { screenshot: null, error: 'hd_stream_not_active' }
  }

  try {
    const w = videoEl.videoWidth || window.innerWidth
    const h = videoEl.videoHeight || window.innerHeight
    if (w < 1 || h < 1) return { screenshot: null, error: 'hd_no_dimensions' }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(videoEl, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    if (!dataUrl || dataUrl === 'data:,') return { screenshot: null, error: 'hd_empty_frame' }
    if (dataUrl.length > 4_000_000) return { screenshot: null, error: 'hd_frame_too_large' }

    return { screenshot: { dataUrl, mimeType: 'image/jpeg', width: w, height: h } }
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 500) : String(e).slice(0, 500)
    return { screenshot: null, error: msg }
  }
}

export function stopHdCapture() {
  cleanup()
}
