/**
 * RTK RNNoise Middleware Service
 * Integrates RNNoise AI noise suppression as Cloudflare Realtime Kit audio middleware
 */

import type { AudioMiddleware, RealtimeKitMeeting } from '@cloudflare/realtimekit-react'

// Import worklet as a worker module - Vite will bundle it properly
import workletUrl from '../worklets/rnnoise-processor.ts?worker&url'
const RNNOISE_WORKLET_MODULE_URL = workletUrl

export interface RnnoiseConfig {
  enabled: boolean
  logLevel: 'verbose' | 'normal' | 'minimal'
  strength: number
  mode?: 'gentle' | 'moderate' | 'aggressive' // Preset modes for easier control
}

export interface RnnoiseStats {
  framesProcessed: number
  totalProcessingTime: number
  averageLatency: number
  isActive: boolean
}

export class RTKRnnoiseMiddleware {
  private workletNode: AudioWorkletNode | null = null
  private currentMiddleware: AudioMiddleware | null = null
  private isInitialized: boolean = false
  private stats: RnnoiseStats = {
    framesProcessed: 0,
    totalProcessingTime: 0,
    averageLatency: 0,
    isActive: false
  }
  private config: RnnoiseConfig = {
    enabled: true,
    logLevel: 'normal', // normal is the default, verbose is more detailed, minimal is the least detailed
    strength: 1.0, // Maximum strength for most aggressive noise suppression
    mode: 'aggressive' // Preset mode for easy UX
  }

  // Preset strength values for different modes
  private static readonly MODE_STRENGTHS = {
    gentle: 0.5, // Light noise reduction, preserves more original audio
    moderate: 0.75, // Balanced noise reduction
    aggressive: 1.0 // Maximum noise reduction
  }

  // AudioWorklet modules are registered per AudioContext instance.
  private static registeredContexts: WeakSet<AudioContext> = new WeakSet()
  private static cachedWorkletBlobUrl: string | null = null
  private static workletLoadPermanentlyFailed: boolean = false

  /**
   * Get worklet module URL, converting cross-origin URLs to same-origin blob: URLs.
   * This mirrors the pattern used in remote-component-loader for loading scripts from Azure CDN.
   */
  private async getWorkletModuleUrl(): Promise<string> {
    if (RTKRnnoiseMiddleware.cachedWorkletBlobUrl) {
      console.log('[RNNoise] Using cached blob: URL')
      return RTKRnnoiseMiddleware.cachedWorkletBlobUrl
    }

    let workletUrl = RNNOISE_WORKLET_MODULE_URL

    // Log the initial value to debug
    console.log('[RNNoise] Initial worklet URL from Vite import:', {
      url: workletUrl,
      type: typeof workletUrl,
      length: workletUrl?.length,
      isUndefined: workletUrl === undefined,
      isNull: workletUrl === null
    })

    // Vite can inline assets as `data:*;base64,...` (we've seen it come through as `data:video/mp2t`).
    // AudioWorklet expects JS; normalize by creating a blob URL with an explicit JS MIME type.
    if (workletUrl.startsWith('data:')) {
      console.log('[RNNoise] Converting data: URL to blob:')
      try {
        const base64Match = workletUrl.match(/^data:[^;]+;base64,(.+)$/)
        if (base64Match) {
          const jsCode = atob(base64Match[1])
          const blob = new Blob([jsCode], { type: 'application/javascript' })
          RTKRnnoiseMiddleware.cachedWorkletBlobUrl = URL.createObjectURL(blob)
          console.log('[RNNoise] ✅ Converted data: URL to blob:')
          return RTKRnnoiseMiddleware.cachedWorkletBlobUrl
        }
      } catch (error) {
        console.warn('[RNNoise] Failed to convert data: URL, falling back to original:', error)
      }
    }

    // WORKAROUND: Rewrite Vite's generated /assets/ path to match actual upload location
    // Vite generates: ../../../assets/rnnoise-processor-BzzgNUaP.js
    // But publish script uploads to: platform/apps/chat/rnnoise-processor-BzzgNUaP.js
    // So we rewrite /assets/ URLs to be in the same directory as index.js
    if (workletUrl.includes('/assets/')) {
      // First resolve the URL to get the full path, then extract filename
      const resolvedUrl = new URL(workletUrl, window.location.href).href
      const urlParts = resolvedUrl.split('/')
      const workletFilename = urlParts[urlParts.length - 1] || ''

      // Validate we got a filename
      if (!workletFilename || workletFilename === 'undefined') {
        console.error('[RNNoise] Failed to extract filename from URL', {
          original: workletUrl,
          resolved: resolvedUrl,
          urlParts,
          lastPart: urlParts[urlParts.length - 1]
        })
        throw new Error(`Failed to extract filename from worklet URL: ${workletUrl}`)
      }

      // Construct the rewritten URL by replacing /assets/ path with the screen's path
      // Pattern: .../screens/assets/file.js -> .../screens/platform/apps/chat/file.js
      const rewrittenUrl = resolvedUrl.replace('/screens/assets/', '/screens/platform/apps/chat/')

      console.log('[RNNoise] 🔄 Rewriting worklet URL to match upload location', {
        original: workletUrl,
        resolved: resolvedUrl,
        filename: workletFilename,
        rewritten: rewrittenUrl
      })
      workletUrl = rewrittenUrl
    }

    // Check if worklet URL is cross-origin
    const resolvedUrl = new URL(workletUrl, window.location.href).toString()
    const workletOrigin = new URL(resolvedUrl).origin
    const isCrossOrigin = workletOrigin !== window.location.origin

    // If cross-origin, fetch and convert to blob: URL (mirrors remote-component-loader pattern)
    if (isCrossOrigin) {
      console.log('[RNNoise] Cross-origin worklet detected, fetching and converting to blob: URL', {
        pageOrigin: window.location.origin,
        workletOrigin,
        workletUrl: resolvedUrl.substring(0, 100) + '...'
      })

      try {
        // Fetch the worklet code from Azure CDN (this respects CORS for fetch API)
        const response = await fetch(resolvedUrl)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const workletCode = await response.text()
        console.log('[RNNoise] ✅ Fetched worklet code', {
          sizeBytes: workletCode.length,
          sizeKB: (workletCode.length / 1024).toFixed(2)
        })

        // Create blob: URL (same-origin) with proper MIME type
        const blob = new Blob([workletCode], { type: 'application/javascript' })
        const blobUrl = URL.createObjectURL(blob)

        // Cache it for future use
        RTKRnnoiseMiddleware.cachedWorkletBlobUrl = blobUrl

        console.log('[RNNoise] ✅ Converted to same-origin blob: URL', {
          original: resolvedUrl.substring(0, 50) + '...',
          blob: blobUrl
        })

        return blobUrl
      } catch (error) {
        console.error('[RNNoise] ❌ Failed to fetch/convert worklet to blob:', error)
        throw new Error(`Failed to load worklet from ${resolvedUrl}: ${error}`)
      }
    }

    // Already same-origin or localhost, use directly
    console.log('[RNNoise] Using same-origin worklet URL directly')
    return workletUrl
  }

  /**
   * Initialize RNNoise middleware.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[RNNoise] Already initialized, skipping')
      return
    }

    console.log('[RNNoise] Initializing RNNoise middleware...')

    try {
      this.isInitialized = true
      console.log('[RNNoise] Initialization complete')
    } catch (error) {
      console.error('[RNNoise] Failed to initialize:', error)
      this.isInitialized = false
      throw error
    }
  }

  /**
   * Enable RNNoise middleware and add to RTK meeting
   */
  async enable(meeting: RealtimeKitMeeting): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('RNNoise not initialized')
    }

    if (!meeting?.self) {
      throw new Error('Meeting.self not available')
    }

    // Prevent duplicate middleware
    if (this.currentMiddleware) {
      console.log('[RNNoise] Middleware already enabled, skipping')
      return
    }

    console.log('[RNNoise] Enabling noise suppression...')
    console.log('[RNNoise] meeting.self type:', typeof meeting.self)
    console.log('[RNNoise] meeting.self.addAudioMiddleware exists?', typeof meeting.self.addAudioMiddleware)

    try {
      // Create audio middleware function
      this.currentMiddleware = this.createRnnoiseMiddleware()

      // Add middleware to RTK meeting
      if (meeting.self.addAudioMiddleware) {
        const result = (meeting.self.addAudioMiddleware as any)(this.currentMiddleware) as unknown
        console.log('[RNNoise] addAudioMiddleware returned:', result)
        if (result && typeof (result as any).then === 'function') {
          await (result as Promise<unknown>)
          console.log('[RNNoise] addAudioMiddleware promise resolved')
        }

        console.log('[RNNoise] Middleware added to RTK meeting', {
          meetingId: meeting.id,
          audioTrackId: meeting.self.audioTrack?.id,
          middlewareType: typeof this.currentMiddleware
        })

        this.stats.isActive = true
        this.stats.framesProcessed = 0
        this.stats.totalProcessingTime = 0
        this.stats.averageLatency = 0
      } else {
        console.warn('[RNNoise] addAudioMiddleware not available on meeting.self')
        throw new Error('addAudioMiddleware not supported')
      }
    } catch (error) {
      console.error('[RNNoise] Failed to enable middleware:', error)
      this.currentMiddleware = null
      throw error
    }
  }

  /**
   * Disable RNNoise middleware and remove from RTK meeting
   */
  disable(meeting: RealtimeKitMeeting): void {
    console.log('[RNNoise] Disabling noise suppression')

    // Set inactive immediately to prevent stats processing
    this.stats.isActive = false

    if (this.workletNode) {
      try {
        // Clear message handler FIRST to stop processing stats
        this.workletNode.port.onmessage = null
      } catch {
        // Ignore - might already be cleared
      }
      try {
        // Send stop message to worklet before disconnecting
        this.workletNode.port.postMessage({ type: 'stop' })
      } catch {
        // Ignore - worklet might already be stopped
      }
      try {
        this.workletNode.port.close()
      } catch {
        // Ignore - not all implementations support close()
      }
      try {
        this.workletNode.disconnect()
      } catch {
        // Ignore - node may already be disconnected
      }
      this.workletNode = null
    }

    if (this.currentMiddleware && meeting?.self?.removeAudioMiddleware) {
      meeting.self.removeAudioMiddleware(this.currentMiddleware)

      console.log('[RNNoise] Middleware removed', {
        totalFrames: this.stats.framesProcessed,
        totalTime: this.stats.totalProcessingTime.toFixed(2) + 's'
      })

      this.currentMiddleware = null
    }
  }

  /**
   * Destroy RNNoise middleware and clean up resources
   */
  destroy(meeting: RealtimeKitMeeting): void {
    console.log('[RNNoise] Destroying middleware and cleaning up resources')

    this.disable(meeting)

    // AudioContext is managed by RTK, no cleanup needed here

    this.isInitialized = false
    this.stats = {
      framesProcessed: 0,
      totalProcessingTime: 0,
      averageLatency: 0,
      isActive: false
    }

    console.log('[RNNoise] Cleanup complete')
  }

  /**
   * Get current processing statistics
   */
  getStats(): RnnoiseStats {
    return { ...this.stats }
  }

  /**
   * Set noise suppression mode (gentle, moderate, aggressive)
   */
  setMode(mode: 'gentle' | 'moderate' | 'aggressive'): void {
    this.config.mode = mode
    this.config.strength = RTKRnnoiseMiddleware.MODE_STRENGTHS[mode]

    console.log('[RNNoise] Mode changed:', {
      mode,
      strength: this.config.strength
    })

    // Update worklet strength if already running
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'setStrength',
        strength: this.config.strength
      })
    }
  }

  /**
   * Get current mode
   */
  getMode(): 'gentle' | 'moderate' | 'aggressive' {
    return this.config.mode || 'aggressive'
  }

  /**
   * Check if RNNoise is supported in current browser
   */
  isSupported(): boolean {
    try {
      const audioContext = new AudioContext()
      const supported = !!audioContext.audioWorklet
      audioContext.close()
      return supported
    } catch {
      return false
    }
  }

  /**
   * Create RNNoise audio middleware function
   */
  private createRnnoiseMiddleware(): AudioMiddleware {
    return async (audioContext: AudioContext) => {
      console.log('[RNNoise] Middleware function called', {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state
      })

      try {
        if (RTKRnnoiseMiddleware.workletLoadPermanentlyFailed) {
          return audioContext.createGain()
        }

        // Register worklet module for this AudioContext (required per context).
        if (!RTKRnnoiseMiddleware.registeredContexts.has(audioContext)) {
          console.log('[RNNoise] 🔄 About to register worklet module...')

          // Get worklet URL (may fetch from CDN and convert to blob: if cross-origin)
          const workletUrl = await this.getWorkletModuleUrl()

          console.log('[RNNoise] 📦 Worklet URL ready:', {
            url: workletUrl.substring(0, 50) + '...',
            isBlob: workletUrl.startsWith('blob:'),
            isData: workletUrl.startsWith('data:')
          })

          console.log('[RNNoise] 🔄 Calling audioContext.audioWorklet.addModule()...')
          await audioContext.audioWorklet.addModule(workletUrl)

          RTKRnnoiseMiddleware.registeredContexts.add(audioContext)
          console.log('[RNNoise] ✅ AudioWorklet processor registered for AudioContext', {
            processorName: 'rnnoise-processor'
          })
        } else {
          console.log('[RNNoise] ℹ️ AudioWorklet already registered for this context, skipping')
        }

        // Create AudioWorklet node
        console.log('[RNNoise] 🔄 Creating AudioWorklet node...')
        this.workletNode = new AudioWorkletNode(audioContext, 'rnnoise-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          processorOptions: {
            strength: this.config.strength,
            logLevel: this.config.logLevel
          }
        })

        console.log('[RNNoise] ✅ AudioWorklet node created:', {
          processorName: 'rnnoise-processor',
          strength: this.config.strength,
          logLevel: this.config.logLevel,
          channelCount: 1,
          sampleRate: audioContext.sampleRate
        })

        // Listen for processing stats from worklet
        this.workletNode.port.onmessage = event => {
          if (!this.stats.isActive) return

          if (event.data?.type === 'first-frame') {
            if (this.config.logLevel === 'verbose') {
              console.log('[RNNoise] 🎙️ process() method called! Audio is flowing into worklet:', event.data)
            }
            return
          }

          if (event.data?.type === 'rnnoise-ready') {
            console.log('[RNNoise] ✅ Worklet ready and loaded WASM successfully', event.data)
            return
          }

          if (event.data?.type === 'rnnoise-error') {
            console.error('[RNNoise] ❌ Worklet failed to initialize RNNoise, falling back to passthrough:', event.data)
            // The worklet continues in passthrough mode, but we should mark inactive.
            this.stats.isActive = false
            return
          }

          if (event.data.type === 'stats') {
            this.stats.framesProcessed = event.data.framesProcessed
            // Note: Performance timing not available in AudioWorklet context
            // totalProcessingTime and averageLatency are not provided by worklet
            this.stats.totalProcessingTime = event.data.totalProcessingTime ?? 0
            this.stats.averageLatency = event.data.averageLatency ?? 0

            // Log first frame to confirm audio is flowing
            if (event.data.framesProcessed === 1) {
              console.log('[RNNoise] 🎙️ First audio frame processed! Audio is flowing through RNNoise')
            }

            // Log stats periodically (every 100 frames)
            if (event.data.framesProcessed % 100 === 0) {
              console.log('[RNNoise] Processing stats:', {
                framesProcessed: event.data.framesProcessed,
                isActive: event.data.isActive
              })
            }
          }
        }

        console.log('[RNNoise] AudioWorklet node created and processing')

        return this.workletNode
      } catch (error: unknown) {
        console.error('[RNNoise] ❌ RNNoise middleware failed; falling back to passthrough.', error)

        const err = error instanceof Error ? error : undefined
        console.error('[RNNoise] Error name:', err?.name)
        console.error('[RNNoise] Error message:', err?.message)
        console.error('[RNNoise] Error stack:', err?.stack)
        console.error('[RNNoise] AudioContext state:', audioContext.state)
        console.error('[RNNoise] AudioContext sampleRate:', audioContext.sampleRate)

        // Mark as permanently failed to avoid retry spam
        RTKRnnoiseMiddleware.workletLoadPermanentlyFailed = true

        this.stats.isActive = false
        return audioContext.createGain()
      }
    }
  }
}
