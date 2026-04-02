/**
 * Generates a realistic great horned owl "WHOO-hoo-ho-HOOOOO" WAV file
 * and outputs it as a base64 data URI for embedding.
 */
const SAMPLE_RATE = 44100
const CHANNELS = 1
const BITS_PER_SAMPLE = 16

function generateOwlHoot() {
  const totalDuration = 2.4
  const numSamples = Math.floor(SAMPLE_RATE * totalDuration)
  const samples = new Float32Array(numSamples)

  // Owl hoot consists of several "syllables" with characteristic frequency sweep
  const syllables = [
    { start: 0.0, dur: 0.35, freqStart: 340, freqEnd: 280, amp: 0.95, rise: 0.04, fall: 0.08 },
    { start: 0.42, dur: 0.18, freqStart: 310, freqEnd: 270, amp: 0.55, rise: 0.03, fall: 0.05 },
    { start: 0.65, dur: 0.14, freqStart: 290, freqEnd: 260, amp: 0.4, rise: 0.02, fall: 0.04 },
    { start: 0.88, dur: 0.7, freqStart: 360, freqEnd: 240, amp: 1.0, rise: 0.05, fall: 0.2 },
    { start: 1.7, dur: 0.5, freqStart: 320, freqEnd: 220, amp: 0.7, rise: 0.04, fall: 0.15 }
  ]

  for (const syl of syllables) {
    const startSample = Math.floor(syl.start * SAMPLE_RATE)
    const numSylSamples = Math.floor(syl.dur * SAMPLE_RATE)
    let phase1 = 0,
      phase2 = 0,
      phase3 = 0,
      phaseMod = 0

    for (let i = 0; i < numSylSamples; i++) {
      const t = i / SAMPLE_RATE
      const progress = i / numSylSamples

      // Frequency sweep (owl hoots descend in pitch)
      const freq = syl.freqStart + (syl.freqEnd - syl.freqStart) * progress

      // Slight vibrato (owls have a natural warble)
      const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * 4
      const actualFreq = freq + vibrato

      // Amplitude envelope: quick attack, sustain, gradual release
      let env
      const riseEnd = syl.rise / syl.dur
      const fallStart = 1 - syl.fall / syl.dur
      if (progress < riseEnd) {
        env = progress / riseEnd
        env = env * env // quadratic rise
      } else if (progress > fallStart) {
        const fallProgress = (progress - fallStart) / (1 - fallStart)
        env = 1 - fallProgress * fallProgress
      } else {
        env = 1.0
      }
      env *= syl.amp

      // Breathy quality: add slight noise modulation
      const noise = (Math.random() * 2 - 1) * 0.02

      // FM synthesis for richer, more natural tone
      const modFreq = actualFreq * 2.0
      const modDepth = actualFreq * 0.15
      phaseMod += (2 * Math.PI * modFreq) / SAMPLE_RATE
      const fmOffset = Math.sin(phaseMod) * modDepth

      // Fundamental + harmonics (owl sounds are relatively pure but not perfectly sinusoidal)
      const f = actualFreq + fmOffset
      phase1 += (2 * Math.PI * f) / SAMPLE_RATE
      phase2 += (2 * Math.PI * f * 2.01) / SAMPLE_RATE
      phase3 += (2 * Math.PI * f * 3.02) / SAMPLE_RATE

      const fundamental = Math.sin(phase1)
      const harmonic2 = Math.sin(phase2) * 0.2
      const harmonic3 = Math.sin(phase3) * 0.05

      // Formant-like resonance boost around 500-600Hz
      const formantBoost = Math.exp(-Math.pow((f - 500) / 120, 2)) * 0.15

      let sample = (fundamental + harmonic2 + harmonic3 + noise) * env * (1 + formantBoost)

      // Soft clipping for natural compression
      sample = Math.tanh(sample * 1.2)

      const idx = startSample + i
      if (idx < numSamples) {
        samples[idx] += sample
      }
    }
  }

  // Add very subtle reverb (simple delay-based)
  const delaySamples = Math.floor(0.08 * SAMPLE_RATE)
  const reverbGain = 0.15
  for (let i = delaySamples; i < numSamples; i++) {
    samples[i] += samples[i - delaySamples] * reverbGain
  }
  const delaySamples2 = Math.floor(0.16 * SAMPLE_RATE)
  for (let i = delaySamples2; i < numSamples; i++) {
    samples[i] += samples[i - delaySamples2] * reverbGain * 0.4
  }

  // Normalize to prevent clipping
  let maxVal = 0
  for (let i = 0; i < numSamples; i++) {
    maxVal = Math.max(maxVal, Math.abs(samples[i]))
  }
  const normFactor = maxVal > 0 ? 0.92 / maxVal : 1
  for (let i = 0; i < numSamples; i++) {
    samples[i] *= normFactor
  }

  return samples
}

function encodeWav(samples) {
  const numSamples = samples.length
  const dataSize = numSamples * CHANNELS * (BITS_PER_SAMPLE / 8)
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(CHANNELS, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), 28)
  buffer.writeUInt16LE(CHANNELS * (BITS_PER_SAMPLE / 8), 32)
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34)

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]))
    const intVal = val < 0 ? val * 32768 : val * 32767
    buffer.writeInt16LE(Math.round(intVal), 44 + i * 2)
  }

  return buffer
}

const samples = generateOwlHoot()
const wavBuffer = encodeWav(samples)
const base64 = wavBuffer.toString('base64')
const dataUri = `data:audio/wav;base64,${base64}`

// Output just the data URI
console.log(dataUri)

// Also report size
console.error(`WAV size: ${wavBuffer.length} bytes (${(wavBuffer.length / 1024).toFixed(1)} KB)`)
console.error(`Base64 length: ${base64.length} chars`)
