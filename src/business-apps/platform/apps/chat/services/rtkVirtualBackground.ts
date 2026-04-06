/**
 * RTK Virtual Background Service
 * Uses official @cloudflare/realtimekit-virtual-background package
 */

import RealtimeKitVideoBackgroundTransformer from '@cloudflare/realtimekit-virtual-background'
import type { RealtimeKitMeeting, VideoMiddleware } from '@cloudflare/realtimekit-react'
import { getChatBackgroundPosterUrl } from '../constants/chatPlatformAssetUrls'

export class RTKVirtualBackground {
  private transformer: RealtimeKitVideoBackgroundTransformer | null = null
  private currentMiddleware: VideoMiddleware | null = null
  private isInitialized = false

  async initialize(meeting: RealtimeKitMeeting): Promise<void> {
    if (this.isInitialized) return

    // Check browser support
    if (!RealtimeKitVideoBackgroundTransformer.isSupported()) {
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
    const backgroundUrl = imageUrl || getChatBackgroundPosterUrl()

    this.currentMiddleware = await this.transformer.createStaticBackgroundVideoMiddleware(backgroundUrl)

    if (meeting.self?.addVideoMiddleware) {
      meeting.self.addVideoMiddleware(this.currentMiddleware)
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
    this.currentMiddleware = await this.transformer.createBackgroundBlurVideoMiddleware(blurStrength)

    if (meeting.self?.addVideoMiddleware) {
      meeting.self.addVideoMiddleware(this.currentMiddleware)
    }
  }

  disable(meeting: RealtimeKitMeeting): void {
    if (this.currentMiddleware && meeting.self?.removeVideoMiddleware) {
      meeting.self.removeVideoMiddleware(this.currentMiddleware)
      this.currentMiddleware = null
    }
  }

  destroy(meeting: RealtimeKitMeeting): void {
    this.disable(meeting)
    this.transformer = null
    this.isInitialized = false
  }

  isSupported(): boolean {
    return RealtimeKitVideoBackgroundTransformer.isSupported()
  }
}
