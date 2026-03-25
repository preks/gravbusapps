/**
 * Background Processor - Real-time background replacement using MediaPipe Selfie Segmentation
 */

import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation'
import backgroundPoster from '../assets/background-poster.jpg'

export interface BackgroundProcessorOptions {
  backgroundImageUrl?: string
}

export class BackgroundProcessor {
  private selfieSegmentation: SelfieSegmentation | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private video: HTMLVideoElement
  private backgroundImage: HTMLImageElement | null = null
  private isRunning = false
  private animationFrameId: number | null = null
  private outputStream: MediaStream | null = null
  private inputStream: MediaStream | null = null
  private latestMask: CanvasImageSource | null = null
  private isInitialized = false

  constructor(private options: BackgroundProcessorOptions = {}) {
    this.canvas = document.createElement('canvas')
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx

    this.video = document.createElement('video')
    this.video.autoplay = true
    this.video.muted = true
    this.video.playsInline = true
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Load background image
    await this.loadBackgroundImage(this.options.backgroundImageUrl || backgroundPoster)

    // Initialize MediaPipe
    this.selfieSegmentation = new SelfieSegmentation({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    })

    this.selfieSegmentation.setOptions({
      modelSelection: 1, // 0 = general, 1 = landscape (faster)
      selfieMode: true // Don't auto-mirror, we handle it
    })

    this.selfieSegmentation.onResults((results: Results) => {
      this.latestMask = results.segmentationMask
    })

    await this.selfieSegmentation.initialize()
    this.isInitialized = true
  }

  private async loadBackgroundImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        this.backgroundImage = img
        resolve()
      }
      img.onerror = reject
      img.src = url
    })
  }

  async startProcessing(inputStream: MediaStream): Promise<MediaStream> {
    if (this.isRunning) this.stopProcessing()

    await this.initialize()

    const videoTrack = inputStream.getVideoTracks()[0]
    if (!videoTrack) throw new Error('No video track')

    this.inputStream = inputStream
    const settings = videoTrack.getSettings()
    const width = settings.width || 640
    const height = settings.height || 480

    this.canvas.width = width
    this.canvas.height = height

    this.video.srcObject = inputStream
    await this.video.play()

    // Create output stream
    this.outputStream = this.canvas.captureStream(30)

    // Add audio tracks
    inputStream.getAudioTracks().forEach(track => {
      this.outputStream!.addTrack(track)
    })

    this.isRunning = true
    this.processLoop()

    return this.outputStream
  }

  private async processLoop(): Promise<void> {
    if (!this.isRunning || !this.selfieSegmentation) return

    try {
      // Send frame to model
      await this.selfieSegmentation.send({ image: this.video })

      // Render
      this.render()
    } catch (err) {
      console.warn('Frame processing error:', err)
    }

    this.animationFrameId = requestAnimationFrame(() => this.processLoop())
  }

  private render(): void {
    const w = this.canvas.width
    const h = this.canvas.height

    // If no mask yet, just show video
    if (!this.latestMask || !this.backgroundImage) {
      this.ctx.drawImage(this.video, 0, 0, w, h)
      return
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, w, h)

    // Draw background - use "contain" to show full image without zoom
    const bgRatioW = w / this.backgroundImage.width
    const bgRatioH = h / this.backgroundImage.height
    const bgRatio = Math.min(bgRatioW, bgRatioH) // "contain" - show full image
    const bgW = this.backgroundImage.width * bgRatio
    const bgH = this.backgroundImage.height * bgRatio
    const bgX = (w - bgW) / 2
    const bgY = (h - bgH) / 2

    // Fill any letterbox areas with a solid color first
    this.ctx.fillStyle = '#1a1a2e' // Dark background color
    this.ctx.fillRect(0, 0, w, h)
    this.ctx.drawImage(this.backgroundImage, bgX, bgY, bgW, bgH)

    // Process mask - enlarge by 5% to eliminate gaps when moving
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = w
    maskCanvas.height = h
    const maskCtx = maskCanvas.getContext('2d')!

    // Scale mask up by 5% from center to fill gaps around edges
    const scale = 1.05
    const offsetX = (w * (1 - scale)) / 2
    const offsetY = (h * (1 - scale)) / 2
    maskCtx.drawImage(this.latestMask, offsetX, offsetY, w * scale, h * scale)

    // Create person canvas - draw video masked by segmentation
    const personCanvas = document.createElement('canvas')
    personCanvas.width = w
    personCanvas.height = h
    const personCtx = personCanvas.getContext('2d')!

    // Draw the mask (no blur - sharper edges)
    personCtx.drawImage(maskCanvas, 0, 0)

    // Draw video only where mask is (extract person)
    personCtx.globalCompositeOperation = 'source-in'
    personCtx.drawImage(this.video, 0, 0, w, h)

    // Composite person over background
    this.ctx.drawImage(personCanvas, 0, 0)
  }

  stopProcessing(): void {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.video.srcObject = null
    this.inputStream = null
    this.outputStream = null
    this.latestMask = null
  }

  getOutputStream(): MediaStream | null {
    return this.outputStream
  }

  getInputStream(): MediaStream | null {
    return this.inputStream
  }

  isProcessing(): boolean {
    return this.isRunning
  }

  destroy(): void {
    this.stopProcessing()
    if (this.selfieSegmentation) {
      this.selfieSegmentation.close()
      this.selfieSegmentation = null
    }
    this.backgroundImage = null
    this.isInitialized = false
  }
}
