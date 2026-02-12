/**
 * RTK RNNoise Middleware Service
 * Integrates RNNoise AI noise suppression as Cloudflare Realtime Kit audio middleware
 */

import type { AudioMiddleware, RealtimeKitMeeting } from '@cloudflare/realtimekit-react'

// Import worklet code as inline string - Vite will compile and inline it in the bundle
// Using custom ?inline suffix that our plugin will handle
import workletCode from '../worklets/rnnoise-processor.ts?inline'

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
  private currentMiddleware: AudioMiddleware | null = null
  private isInitialized: boolean = false
  private enableInFlight: Promise<void> | null = null
  private middlewareEpoch: number = 0
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

  // One worklet node per AudioContext. RTK may call the middleware multiple times; we must
  // not create multiple nodes and leak the previous ones.
  private workletNodeByContext: WeakMap<AudioContext, AudioNode> = new WeakMap()
  private workletNodeInitPromiseByContext: WeakMap<AudioContext, Promise<AudioNode>> = new WeakMap()
  private activeWorkletNodes: Set<AudioWorkletNode> = new Set()

  /**
   * Get worklet module URL by creating a blob from bundled worklet code.
   */
  private async getWorkletModuleUrl(): Promise<string> {
    // Return cached blob URL if already created
    if (RTKRnnoiseMiddleware.cachedWorkletBlobUrl) {
      console.log('[RNNoise] Using cached blob URL from bundled worklet')
      return RTKRnnoiseMiddleware.cachedWorkletBlobUrl
    }

    console.log('[RNNoise] Creating blob URL from bundled worklet code')

    // Create blob from inline worklet code
    const blob = new Blob([workletCode], { type: 'application/javascript' })
    RTKRnnoiseMiddleware.cachedWorkletBlobUrl = URL.createObjectURL(blob)

    console.log('[RNNoise] ✅ Created blob URL:', RTKRnnoiseMiddleware.cachedWorkletBlobUrl)

    return RTKRnnoiseMiddleware.cachedWorkletBlobUrl
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
    if (this.enableInFlight) {
      await this.enableInFlight
      return
    }

    if (!this.isInitialized) {
      throw new Error('RNNoise not initialized')
    }

    if (!meeting?.self) {
      throw new Error('Meeting.self not available')
    }

    const self = meeting.self

    // Prevent duplicate middleware
    if (this.currentMiddleware) {
      console.log('[RNNoise] Middleware already enabled, skipping')
      return
    }

    console.log('[RNNoise] Enabling noise suppression...')
    console.log('[RNNoise] meeting.self type:', typeof meeting.self)
    console.log('[RNNoise] meeting.self.addAudioMiddleware exists?', typeof meeting.self.addAudioMiddleware)

    this.enableInFlight = (async () => {
      // Mark active early so a concurrent middleware invocation doesn't bail out.
      this.stats.isActive = true

      // Create audio middleware function
      this.middlewareEpoch += 1
      const epoch = this.middlewareEpoch
      this.currentMiddleware = this.createRnnoiseMiddleware(epoch)

      // Add middleware to RTK meeting
      if (self.addAudioMiddleware) {
        const result = (self.addAudioMiddleware as any)(this.currentMiddleware) as unknown
        console.log('[RNNoise] addAudioMiddleware returned:', result)
        if (result && typeof (result as any).then === 'function') {
          await (result as Promise<unknown>)
          console.log('[RNNoise] addAudioMiddleware promise resolved')
        }

        console.log('[RNNoise] Middleware added to RTK meeting', {
          meetingId: meeting.id,
          audioTrackId: self.audioTrack?.id,
          middlewareType: typeof this.currentMiddleware
        })

        this.stats.framesProcessed = 0
        this.stats.totalProcessingTime = 0
        this.stats.averageLatency = 0
      } else {
        console.warn('[RNNoise] addAudioMiddleware not available on meeting.self')
        throw new Error('addAudioMiddleware not supported')
      }
    })()

    try {
      await this.enableInFlight
    } catch (error) {
      console.error('[RNNoise] Failed to enable middleware:', error)
      this.stats.isActive = false
      this.currentMiddleware = null
      throw error
    } finally {
      this.enableInFlight = null
    }
  }

  /**
   * Disable RNNoise middleware and remove from RTK meeting
   */
  disable(meeting: RealtimeKitMeeting): void {
    console.log('[RNNoise] Disabling noise suppression')

    // Set inactive immediately to prevent stats processing
    this.stats.isActive = false
    // Invalidate any in-flight middleware initialization.
    this.middlewareEpoch += 1

    // Tear down ALL created nodes (we can otherwise leak a node if RTK invoked the middleware twice).
    for (const node of this.activeWorkletNodes) {
      this.cleanupWorkletNode(node)
    }
    this.activeWorkletNodes.clear()
    // Drop cached nodes/promises so a future enable creates a fresh graph.
    this.workletNodeByContext = new WeakMap()
    this.workletNodeInitPromiseByContext = new WeakMap()

    if (this.currentMiddleware && meeting?.self?.removeAudioMiddleware) {
      meeting.self.removeAudioMiddleware(this.currentMiddleware)

      console.log('[RNNoise] Middleware removed', {
        totalFrames: this.stats.framesProcessed,
        totalTime: this.stats.totalProcessingTime.toFixed(2) + 's'
      })
    }

    // CRITICAL: Always null the middleware reference to prevent stale state
    this.currentMiddleware = null
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
    for (const node of this.activeWorkletNodes) {
      try {
        node.port.postMessage({
          type: 'setStrength',
          strength: this.config.strength
        })
      } catch {
        // Best-effort
      }
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
  private createRnnoiseMiddleware(epoch: number): AudioMiddleware {
    return async (audioContext: AudioContext) => {
      // If we're already disabled (e.g., a race where middleware init is still finishing), bail out.
      if (!this.stats.isActive || epoch !== this.middlewareEpoch) {
        return audioContext.createGain()
      }

      console.log('[RNNoise] Middleware function called', {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state
      })

      try {
        if (RTKRnnoiseMiddleware.workletLoadPermanentlyFailed) {
          return audioContext.createGain()
        }

        const existingNode = this.workletNodeByContext.get(audioContext)
        if (existingNode) {
          return existingNode
        }

        const inFlight = this.workletNodeInitPromiseByContext.get(audioContext)
        if (inFlight) {
          return await inFlight
        }

        const initPromise = (async (): Promise<AudioNode> => {
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

          // If we were disabled while init was in-flight, do not create a worklet node.
          if (!this.stats.isActive || epoch !== this.middlewareEpoch) {
            return audioContext.createGain()
          }

          // Create AudioWorklet node
          console.log('[RNNoise] 🔄 Creating AudioWorklet node...')
          const node = new AudioWorkletNode(audioContext, 'rnnoise-processor', {
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
          node.port.onmessage = event => {
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
              console.error(
                '[RNNoise] ❌ Worklet failed to initialize RNNoise, falling back to passthrough:',
                event.data
              )
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
                //console.log('[RNNoise] Processing stats:', {
                //framesProcessed: event.data.framesProcessed,
                //isActive: event.data.isActive
                //})
              }
            }
          }

          // If we were disabled mid-creation, clean up immediately and return passthrough.
          if (!this.stats.isActive || epoch !== this.middlewareEpoch) {
            this.cleanupWorkletNode(node)
            return audioContext.createGain()
          }

          this.workletNodeByContext.set(audioContext, node)
          this.activeWorkletNodes.add(node)

          console.log('[RNNoise] AudioWorklet node created and processing')
          return node
        })()

        this.workletNodeInitPromiseByContext.set(audioContext, initPromise)

        try {
          return await initPromise
        } finally {
          this.workletNodeInitPromiseByContext.delete(audioContext)
        }
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

  private cleanupWorkletNode(node: AudioWorkletNode): void {
    try {
      // Clear message handler FIRST to stop stats/logs.
      node.port.onmessage = null
    } catch {
      // Best-effort
    }
    try {
      node.port.postMessage({ type: 'stop' })
    } catch {
      // Best-effort
    }
    try {
      node.port.close()
    } catch {
      // Best-effort
    }
    try {
      node.disconnect()
    } catch {
      // Best-effort
    }
    this.activeWorkletNodes.delete(node)
  }
}
