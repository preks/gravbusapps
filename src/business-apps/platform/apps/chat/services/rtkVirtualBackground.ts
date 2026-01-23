/**
 * RTK Virtual Background Service
 * Uses official @cloudflare/realtimekit-virtual-background package
 */

import RealtimeKitVideoBackgroundTransformer from '@cloudflare/realtimekit-virtual-background'
import type { RealtimeKitMeeting, VideoMiddleware } from '@cloudflare/realtimekit-react'
import backgroundPoster from '../assets/background-poster.jpg'
import { rtkDebug } from '../utils/rtkDebug'

export class RTKVirtualBackground {
  private transformer: RealtimeKitVideoBackgroundTransformer | null = null
  private currentMiddleware: VideoMiddleware | null = null
  private isInitialized = false

  async initialize(meeting: RealtimeKitMeeting): Promise<void> {
    if (this.isInitialized) return

    rtkDebug.log('[RTK Virtual Background] 🎨 Initializing transformer...')

    // Check browser support
    if (!RealtimeKitVideoBackgroundTransformer.isSupported()) {
      rtkDebug.warn('[RTK Virtual Background] ⚠️ Not supported in this browser')
      throw new Error('Virtual background not supported in this browser')
    }

    // Initialize transformer with optimized config
    this.transformer = await RealtimeKitVideoBackgroundTransformer.init({
      meeting,
      segmentationConfig: {
        model: 'mlkit', // mlkit is faster than meet
        backend: 'wasmSimd',
        inputResolution: '256x256',
        pipeline: 'webgl2', // webgl2 is faster than canvas2dCpu
        targetFps: 30
      }
    })

    this.isInitialized = true
    rtkDebug.log('[RTK Virtual Background] ✅ Transformer initialized')
  }

  async enableBackground(meeting: RealtimeKitMeeting, imageUrl?: string): Promise<void> {
    if (!this.isInitialized || !this.transformer) {
      throw new Error('Transformer not initialized')
    }

    // Remove existing middleware if any
    if (this.currentMiddleware && meeting.self?.removeVideoMiddleware) {
      meeting.self.removeVideoMiddleware(this.currentMiddleware)
      this.currentMiddleware = null
    }

    // Create and apply background middleware
    const backgroundUrl = imageUrl || backgroundPoster
    rtkDebug.log('[RTK Virtual Background] 🖼️ Applying background:', backgroundUrl)

    this.currentMiddleware = await this.transformer.createStaticBackgroundVideoMiddleware(backgroundUrl)

    if (meeting.self?.addVideoMiddleware) {
      meeting.self.addVideoMiddleware(this.currentMiddleware)
      rtkDebug.log('[RTK Virtual Background] ✅ Background applied')
    }
  }

  async enableBlur(meeting: RealtimeKitMeeting, blurStrength: number = 50): Promise<void> {
    if (!this.isInitialized || !this.transformer) {
      throw new Error('Transformer not initialized')
    }

    // Remove existing middleware if any
    if (this.currentMiddleware && meeting.self?.removeVideoMiddleware) {
      meeting.self.removeVideoMiddleware(this.currentMiddleware)
      this.currentMiddleware = null
    }

    // Create and apply blur middleware
    rtkDebug.log('[RTK Virtual Background] 💨 Applying blur with strength:', blurStrength)

    this.currentMiddleware = await this.transformer.createBackgroundBlurVideoMiddleware(blurStrength)

    if (meeting.self?.addVideoMiddleware) {
      meeting.self.addVideoMiddleware(this.currentMiddleware)
      rtkDebug.log('[RTK Virtual Background] ✅ Blur applied')
    }
  }

  disable(meeting: RealtimeKitMeeting): void {
    if (this.currentMiddleware && meeting.self?.removeVideoMiddleware) {
      meeting.self.removeVideoMiddleware(this.currentMiddleware)
      this.currentMiddleware = null
      rtkDebug.log('[RTK Virtual Background] ⏸️ Background removed')
    }
  }

  destroy(meeting: RealtimeKitMeeting): void {
    this.disable(meeting)
    this.transformer = null
    this.isInitialized = false
    rtkDebug.log('[RTK Virtual Background] 🗑️ Destroyed')
  }

  isSupported(): boolean {
    return RealtimeKitVideoBackgroundTransformer.isSupported()
  }
}
