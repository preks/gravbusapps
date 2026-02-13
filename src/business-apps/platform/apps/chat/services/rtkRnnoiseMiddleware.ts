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
  private lastInvokedAt: number | null = null
  private stats: RnnoiseStats = {
    framesProcessed: 0,
    totalProcessingTime: 0,
    averageLatency: 0,
    isActive: false
  }
  private config: RnnoiseConfig = {
    enabled: true,
    logLevel: 'minimal', // minimal = no info logs; normal/verbose for debugging
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
    if (RTKRnnoiseMiddleware.cachedWorkletBlobUrl) {
      return RTKRnnoiseMiddleware.cachedWorkletBlobUrl
    }

    const blob = new Blob([workletCode], { type: 'application/javascript' })
    RTKRnnoiseMiddleware.cachedWorkletBlobUrl = URL.createObjectURL(blob)
    return RTKRnnoiseMiddleware.cachedWorkletBlobUrl
  }

  /**
   * Initialize RNNoise middleware.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      this.isInitialized = true
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

    if (this.currentMiddleware) {
      return
    }

    this.enableInFlight = (async () => {
      // Mark active early so a concurrent middleware invocation doesn't bail out.
      this.stats.isActive = true
      this.lastInvokedAt = null

      // Create audio middleware function
      this.middlewareEpoch += 1
      const epoch = this.middlewareEpoch
      this.currentMiddleware = this.createRnnoiseMiddleware(epoch)

      // Add middleware to RTK meeting
      if (self.addAudioMiddleware) {
        const result = (self.addAudioMiddleware as any)(this.currentMiddleware) as unknown
        if (result && typeof (result as any).then === 'function') {
          await (result as Promise<unknown>)
        }

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
    // Set inactive immediately to prevent stats processing
    this.stats.isActive = false
    this.lastInvokedAt = null
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
    }

    this.currentMiddleware = null
    RTKRnnoiseMiddleware.workletLoadPermanentlyFailed = false
  }

  /**
   * Destroy RNNoise middleware and clean up resources
   */
  destroy(meeting: RealtimeKitMeeting): void {
    this.disable(meeting)
    this.isInitialized = false
    this.stats = {
      framesProcessed: 0,
      totalProcessingTime: 0,
      averageLatency: 0,
      isActive: false
    }
  }

  /**
   * Get current processing statistics
   */
  getStats(): RnnoiseStats {
    return { ...this.stats }
  }

  getLastInvokedAt(): number | null {
    return this.lastInvokedAt
  }

  /**
   * Set noise suppression mode (gentle, moderate, aggressive)
   */
  setMode(mode: 'gentle' | 'moderate' | 'aggressive'): void {
    this.config.mode = mode
    this.config.strength = RTKRnnoiseMiddleware.MODE_STRENGTHS[mode]

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
      if (!this.stats.isActive || epoch !== this.middlewareEpoch) {
        return audioContext.createGain()
      }

      this.lastInvokedAt = Date.now()

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
          if (!RTKRnnoiseMiddleware.registeredContexts.has(audioContext)) {
            const workletUrl = await this.getWorkletModuleUrl()
            await audioContext.audioWorklet.addModule(workletUrl)
            RTKRnnoiseMiddleware.registeredContexts.add(audioContext)
          }

          // If we were disabled while init was in-flight, do not create a worklet node.
          if (!this.stats.isActive || epoch !== this.middlewareEpoch) {
            return audioContext.createGain()
          }

          const node = new AudioWorkletNode(audioContext, 'rnnoise-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 1,
            processorOptions: {
              strength: this.config.strength,
              logLevel: this.config.logLevel
            }
          })

          node.port.onmessage = event => {
            if (!this.stats.isActive) return

            if (event.data?.type === 'first-frame') {
              return
            }

            if (event.data?.type === 'rnnoise-ready') {
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
            }
          }

          // If we were disabled mid-creation, clean up immediately and return passthrough.
          if (!this.stats.isActive || epoch !== this.middlewareEpoch) {
            this.cleanupWorkletNode(node)
            return audioContext.createGain()
          }

          this.workletNodeByContext.set(audioContext, node)
          this.activeWorkletNodes.add(node)
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
