/**
 * RTK Video Middleware - Integrates BackgroundProcessor with RealtimeKit's video pipeline
 */

import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation'
import backgroundPoster from '../assets/background-poster.jpg'

export interface RTKVideoMiddlewareOptions {
  backgroundImageUrl?: string
}

/**
 * Creates a RealtimeKit video middleware that applies background replacement
 * Uses MediaPipe Selfie Segmentation for person detection
 */
export class RTKVideoMiddleware {
  private selfieSegmentation: SelfieSegmentation | null = null
  private backgroundImage: HTMLImageElement | null = null
  private latestMask: any = null // MediaPipe segmentationMask type is complex (GpuBuffer | ImageBitmap | WebGLTexture)
  private isInitialized = false
  private isProcessing = false
  private lastProcessTime = 0
  private readonly frameInterval = 33 // ~30fps

  constructor(private options: RTKVideoMiddlewareOptions = {}) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('[RTK Middleware] 🎨 Initializing video effects...')

    // Load background image (use NewWork preset by default)
    await this.loadBackgroundImage(this.options.backgroundImageUrl || backgroundPoster)

    // Initialize MediaPipe
    this.selfieSegmentation = new SelfieSegmentation({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    })

    this.selfieSegmentation.setOptions({
      modelSelection: 1, // 0 = general, 1 = landscape (faster)
      selfieMode: false // Don't auto-mirror
    })

    this.selfieSegmentation.onResults((results: Results) => {
      this.latestMask = results.segmentationMask
    })

    await this.selfieSegmentation.initialize()
    this.isInitialized = true
    this.isProcessing = true
    console.log('[RTK Middleware] ✅ Video effects initialized')
  }

  private async loadBackgroundImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        this.backgroundImage = img
        console.log('[RTK Middleware] 🖼️ Background image loaded')
        resolve()
      }
      img.onerror = err => {
        console.error('[RTK Middleware] ❌ Failed to load background:', err)
        reject(err)
      }
      img.src = url
    })
  }

  /**
   * The middleware function that RTK calls for each video frame
   * This is the core integration point with RealtimeKit
   */
  getMiddleware() {
    let frameCount = 0
    return (canvas: HTMLCanvasElement, ctx?: CanvasRenderingContext2D) => {
      frameCount++

      // Check if canvas has valid dimensions
      if (!canvas.width || !canvas.height || canvas.width === 0 || canvas.height === 0) {
        if (frameCount <= 3) {
          console.log(`[RTK Middleware] ⏳ Frame ${frameCount} - waiting for canvas dimensions:`, {
            width: canvas.width,
            height: canvas.height
          })
        }
        return // Skip until canvas is ready
      }

      // Log first few valid frames
      if (frameCount <= 3) {
        console.log(`[RTK Middleware] 🎬 Frame ${frameCount} received:`, {
          canvasSize: `${canvas.width}x${canvas.height}`,
          hasCtx: !!ctx,
          isProcessing: this.isProcessing,
          isInitialized: this.isInitialized
        })
      }

      if (!this.isProcessing || !this.isInitialized) {
        return // Pass through if not processing
      }

      // Get context if not provided
      const context = ctx || canvas.getContext('2d')
      if (!context) {
        console.warn('[RTK Middleware] No 2D context available')
        return
      }

      // Throttle processing to ~30fps
      const now = performance.now()
      if (now - this.lastProcessTime < this.frameInterval) {
        return
      }
      this.lastProcessTime = now

      // Log every 30th frame to show processing is happening
      if (frameCount % 30 === 0) {
        console.log(`[RTK Middleware] 🎨 Processing frame ${frameCount}`)
      }

      try {
        // Extract ImageData from canvas to send to MediaPipe
        // MediaPipe cannot process canvas directly, needs ImageData or ImageBitmap
        if (this.selfieSegmentation) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

          // Create temporary canvas with ImageData to send to MediaPipe
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = canvas.width
          tempCanvas.height = canvas.height
          const tempCtx = tempCanvas.getContext('2d')!
          tempCtx.putImageData(imageData, 0, 0)

          this.selfieSegmentation.send({ image: tempCanvas }).catch(err => {
            console.debug('[RTK Middleware] Frame processing error:', err)
          })
        }

        // Apply background effect if mask is ready
        if (this.latestMask && this.backgroundImage) {
          this.applyBackgroundEffect(canvas, context)
        }
      } catch (err) {
        console.warn('[RTK Middleware] Error in middleware:', err)
      }
    }
  }

  private applyBackgroundEffect(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    const w = canvas.width
    const h = canvas.height

    if (!this.latestMask || !this.backgroundImage) return

    // Save original canvas content (the person)
    const originalImageData = ctx.getImageData(0, 0, w, h)

    // Clear canvas
    ctx.clearRect(0, 0, w, h)

    // Draw background - use "contain" to show full image without zoom
    const bgRatioW = w / this.backgroundImage.width
    const bgRatioH = h / this.backgroundImage.height
    const bgRatio = Math.min(bgRatioW, bgRatioH)
    const bgW = this.backgroundImage.width * bgRatio
    const bgH = this.backgroundImage.height * bgRatio
    const bgX = (w - bgW) / 2
    const bgY = (h - bgH) / 2

    // Fill letterbox areas with dark color
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(this.backgroundImage, bgX, bgY, bgW, bgH)

    // Process mask - enlarge by 5% to eliminate gaps
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = w
    maskCanvas.height = h
    const maskCtx = maskCanvas.getContext('2d')!

    const scale = 1.05
    const offsetX = (w * (1 - scale)) / 2
    const offsetY = (h * (1 - scale)) / 2
    maskCtx.drawImage(this.latestMask, offsetX, offsetY, w * scale, h * scale)

    // Create person canvas
    const personCanvas = document.createElement('canvas')
    personCanvas.width = w
    personCanvas.height = h
    const personCtx = personCanvas.getContext('2d')!

    // Draw mask
    personCtx.drawImage(maskCanvas, 0, 0)

    // Extract person using mask
    personCtx.globalCompositeOperation = 'source-in'
    personCtx.putImageData(originalImageData, 0, 0)

    // Composite person over background
    ctx.drawImage(personCanvas, 0, 0)
  }

  pause(): void {
    this.isProcessing = false
    console.log('[RTK Middleware] ⏸️ Video effects paused')
  }

  resume(): void {
    this.isProcessing = true
    console.log('[RTK Middleware] ▶️ Video effects resumed')
  }

  destroy(): void {
    this.isProcessing = false
    this.isInitialized = false

    if (this.selfieSegmentation) {
      this.selfieSegmentation.close()
      this.selfieSegmentation = null
    }

    this.backgroundImage = null
    this.latestMask = null
    console.log('[RTK Middleware] 🗑️ Video effects destroyed')
  }
}
