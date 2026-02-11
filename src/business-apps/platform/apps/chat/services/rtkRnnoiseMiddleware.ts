/**
 * RTK RNNoise Middleware Service
 * Integrates RNNoise AI noise suppression as Cloudflare Realtime Kit audio middleware
 */

import type { RealtimeKitMeeting } from '@cloudflare/realtimekit-react'

const RNNOISE_WORKLET_MODULE_URL = new URL('../worklets/rnnoise-processor.ts', import.meta.url).toString()

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

type AudioMiddleware = (audioContext: AudioContext) => Promise<AudioWorkletNode> | AudioWorkletNode

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

  private getWorkletModuleUrl(): string {
    return RNNOISE_WORKLET_MODULE_URL
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
        // Register worklet module for this AudioContext (required per context).
        if (!RTKRnnoiseMiddleware.registeredContexts.has(audioContext)) {
          console.log('[RNNoise] 🔄 About to register worklet module...')

          const workletUrl = this.getWorkletModuleUrl()
          console.log('[RNNoise] 📦 Worklet URL:', {
            url: workletUrl.substring(0, 50) + '...',
            fullLength: workletUrl.length,
            isBlob: workletUrl.startsWith('blob:')
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
        console.error('[RNNoise] ❌ FATAL ERROR in middleware function:', error)

        const err = error instanceof Error ? error : undefined
        console.error('[RNNoise] Error name:', err?.name)
        console.error('[RNNoise] Error message:', err?.message)
        console.error('[RNNoise] Error stack:', err?.stack)
        console.error('[RNNoise] AudioContext state:', audioContext.state)
        console.error('[RNNoise] AudioContext sampleRate:', audioContext.sampleRate)

        // Re-throw to let RTK know the middleware failed
        throw error
      }
    }
  }
}
