// RNNoise AudioWorklet processor with stable 128->frame buffering.
// Uses @jitsi/rnnoise-wasm with proper Emscripten API and sample scaling.
// This file is bundled by the inline-worklet esbuild step (not remote Rollup externals):
// AudioWorklet has no window.require — @jitsi/rnnoise-wasm must stay inside that bundle.

// Import must be at top level for Vite to bundle it properly
// @ts-expect-error - Jitsi rnnoise-wasm types
import createRNNWasmModuleSync from '@jitsi/rnnoise-wasm/dist/rnnoise-sync.js'

/**
 * Emscripten Module interface from @jitsi/rnnoise-wasm
 * @typedef {Object} RnnoiseModule
 * @property {function(number): number} _rnnoise_create - Creates DenoiseState instance, returns pointer
 * @property {function(number): void} _rnnoise_destroy - Destroys DenoiseState instance
 * @property {function(number, number, number): number} _rnnoise_process_frame - Processes frame, returns VAD probability (0..1)
 * @property {function(number): number} _malloc - Allocates WASM memory, returns pointer
 * @property {function(number): void} _free - Frees WASM memory
 * @property {Float32Array} HEAPF32 - WASM heap for float arrays
 */

// TypeScript shim for AudioWorklet global scope types.
// Some TS lib.dom versions/configs don't include AudioWorkletProcessor yet.
declare const sampleRate: number

declare class AudioWorkletProcessor {
  readonly port: MessagePort
  constructor(options?: AudioWorkletNodeOptions)
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

class RnnoiseProcessor extends AudioWorkletProcessor {
  private strength: number

  private rnnoiseReady = false
  private stopped = false // Flag to stop processing when disabled
  private rnnoiseModule: any = null
  private denoiseStatePtr: number = 0 // WASM pointer to DenoiseState
  private frameSize = 480

  private ring: Float32Array
  private ringSize: number
  private writePos = 0
  private readPos = 0
  private processPos = 0
  private availableToProcess = 0
  private outputLatencySamples = 480

  // WASM memory buffers for input/output (480 samples * 4 bytes = 1920 bytes each)
  private inputBufferPtr: number = 0
  private outputBufferPtr: number = 0
  private inputBufferSize: number = 0
  private outputBufferSize: number = 0

  private framesProcessed = 0

  constructor(options?: AudioWorkletNodeOptions) {
    super()

    const processorOptions = (options?.processorOptions ?? {}) as any
    this.strength = clamp01(processorOptions.strength ?? 0.8)

    // Large enough to avoid frequent wrap handling and keep processing ahead.
    this.ringSize = 480 * 8
    this.ring = new Float32Array(this.ringSize)

    this.port.onmessage = event => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'setStrength' && typeof data.strength === 'number') {
        this.strength = clamp01(data.strength)
      }

      if (data.type === 'stop') {
        // Stop processing and cleanup resources
        this.stopped = true
        this.rnnoiseReady = false
        this.cleanup()
      }
    }

    this.initializeRnnoise()
  }

  private initializeRnnoise(): void {
    try {
      // Use synchronous loading for AudioWorklet context
      const module = createRNNWasmModuleSync()
      this.rnnoiseModule = module

      // RNNoise always processes 480 samples per frame at 48kHz (10ms frames)
      // This is a constant defined by the RNNoise algorithm, not configurable
      this.frameSize = 480

      // Create DenoiseState instance (NULL model = use default)
      this.denoiseStatePtr = module._rnnoise_create(0)
      if (this.denoiseStatePtr === 0) {
        throw new Error('Failed to create RNNoise state')
      }

      // Allocate WASM memory buffers for input/output (480 floats * 4 bytes = 1920 bytes)
      this.inputBufferSize = this.frameSize * 4
      this.outputBufferSize = this.frameSize * 4
      this.inputBufferPtr = module._malloc(this.inputBufferSize)
      this.outputBufferPtr = module._malloc(this.outputBufferSize)

      if (this.inputBufferPtr === 0 || this.outputBufferPtr === 0) {
        throw new Error('Failed to allocate WASM memory buffers')
      }

      this.outputLatencySamples = this.frameSize
      this.rnnoiseReady = true

      // Start fresh to avoid processing stale ring contents that accumulated before WASM was ready.
      this.availableToProcess = 0
      this.processPos = this.writePos
      this.readPos = (this.writePos - this.outputLatencySamples + this.ringSize) % this.ringSize

      this.port.postMessage({ type: 'rnnoise-ready', frameSize: this.frameSize })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.port.postMessage({ type: 'rnnoise-error', message })
      // Cleanup on error
      this.cleanup()
    }
  }

  private cleanup(): void {
    if (this.rnnoiseModule && this.denoiseStatePtr !== 0) {
      this.rnnoiseModule._rnnoise_destroy(this.denoiseStatePtr)
      this.denoiseStatePtr = 0
    }
    if (this.rnnoiseModule) {
      if (this.inputBufferPtr !== 0) {
        this.rnnoiseModule._free(this.inputBufferPtr)
        this.inputBufferPtr = 0
      }
      if (this.outputBufferPtr !== 0) {
        this.rnnoiseModule._free(this.outputBufferPtr)
        this.outputBufferPtr = 0
      }
    }
    this.rnnoiseReady = false
  }

  private processOneFrameAt(pos: number): void {
    if (!this.rnnoiseModule || this.denoiseStatePtr === 0) return

    // Copy ring -> temporary frame buffer (handle wrap)
    const frameIn = new Float32Array(this.frameSize)
    const frameOrig = new Float32Array(this.frameSize)

    const first = Math.min(this.frameSize, this.ringSize - pos)
    frameIn.set(this.ring.subarray(pos, pos + first), 0)
    frameOrig.set(this.ring.subarray(pos, pos + first), 0)
    if (first < this.frameSize) {
      const remaining = this.frameSize - first
      frameIn.set(this.ring.subarray(0, remaining), first)
      frameOrig.set(this.ring.subarray(0, remaining), first)
    }

    // Scale from float (-1..1) to 16-bit PCM range (-32768..32767)
    // RNNoise expects 16-bit PCM scale, not normalized floats
    // Access WASM memory: HEAPF32 is indexed by float (4-byte) units, so divide byte offset by 4
    const inputBufferOffset = this.inputBufferPtr / 4
    for (let i = 0; i < this.frameSize; i++) {
      // Clamp to [-1, 1] then scale to 16-bit PCM range
      const clamped = Math.max(-1, Math.min(1, frameIn[i]))
      this.rnnoiseModule.HEAPF32[inputBufferOffset + i] = clamped * 32768
    }

    // Process frame: _rnnoise_process_frame(st, out, in_) returns VAD probability (0..1)
    // VAD probability indicates voice activity, but we don't use it for gating currently
    this.rnnoiseModule._rnnoise_process_frame(this.denoiseStatePtr, this.outputBufferPtr, this.inputBufferPtr)

    // Copy output from WASM memory and scale back from 16-bit PCM to float (-1..1)
    // Access WASM memory: HEAPF32 is indexed by float (4-byte) units, so divide byte offset by 4
    const outputBufferOffset = this.outputBufferPtr / 4
    for (let i = 0; i < this.frameSize; i++) {
      // Scale from 16-bit PCM back to float and clamp
      const pcmValue = this.rnnoiseModule.HEAPF32[outputBufferOffset + i]
      frameIn[i] = Math.max(-1, Math.min(1, pcmValue / 32768))
    }

    // Apply wet/dry mix (strength controls how much denoised audio vs original)
    const wet = this.strength
    const dry = 1 - wet
    for (let i = 0; i < this.frameSize; i++) {
      frameIn[i] = frameIn[i] * wet + frameOrig[i] * dry
    }

    // Write mixed output back to ring buffer
    if (first === this.frameSize) {
      this.ring.set(frameIn, pos)
      return
    }

    this.ring.set(frameIn.subarray(0, first), pos)
    this.ring.set(frameIn.subarray(first), 0)
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    // Early return if stopped - just passthrough audio without processing
    if (this.stopped) {
      const input = inputs[0]
      const output = outputs[0]
      if (input && output && output[0] && input[0]) {
        const inputChannel = input[0]
        const outputChannel = output[0]
        const n = Math.min(inputChannel.length, outputChannel.length)
        for (let i = 0; i < n; i++) {
          outputChannel[i] = inputChannel[i]
        }
      }
      return true
    }

    const input = inputs[0]
    const output = outputs[0]
    if (!input || !output || !output[0]) return true

    const inputChannel = input[0]
    const outputChannel = output[0]
    if (!inputChannel || !outputChannel) return true

    const n = Math.min(inputChannel.length, outputChannel.length)

    // Send message on very first process call to confirm audio is flowing
    if (this.framesProcessed === 0 && n > 0) {
      this.port.postMessage({
        type: 'first-frame',
        rnnoiseReady: this.rnnoiseReady,
        bufferSize: n,
        sampleRate
      })
    }

    if (!this.rnnoiseReady || !this.rnnoiseModule || this.denoiseStatePtr === 0) {
      // Passthrough while RNNoise WASM is loading to avoid silence/cut-offs.
      for (let i = 0; i < n; i++) {
        outputChannel[i] = inputChannel[i]
      }
      return true
    }

    // Write input into ring buffer.
    for (let i = 0; i < n; i++) {
      this.ring[this.writePos] = inputChannel[i]
      this.writePos++
      if (this.writePos >= this.ringSize) this.writePos = 0
    }
    this.availableToProcess = Math.min(this.availableToProcess + n, this.ringSize - this.frameSize)

    // Process as many full frames as possible.
    while (this.availableToProcess >= this.frameSize) {
      this.processOneFrameAt(this.processPos)
      this.processPos = (this.processPos + this.frameSize) % this.ringSize
      this.availableToProcess -= this.frameSize
      this.framesProcessed++
    }

    // Read from ring with fixed latency. If we ever read a not-yet-processed segment,
    // it will be the original input (still continuous, just less denoised briefly).
    for (let i = 0; i < n; i++) {
      outputChannel[i] = this.ring[this.readPos]
      this.readPos++
      if (this.readPos >= this.ringSize) this.readPos = 0
    }

    // Only send stats if not stopped
    if (!this.stopped && this.framesProcessed > 0 && this.framesProcessed % 10 === 0) {
      // Note: Performance timing not available in AudioWorklet context
      this.port.postMessage({
        type: 'stats',
        framesProcessed: this.framesProcessed,
        isActive: true
      })
    }

    return true
  }
}

registerProcessor('rnnoise-processor', RnnoiseProcessor)
