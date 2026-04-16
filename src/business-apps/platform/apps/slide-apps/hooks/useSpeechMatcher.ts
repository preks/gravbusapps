// Speech Matcher Hook - Keyword extraction, n-gram matching, and video triggers.

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { SlideData, AIAssistConfig } from '../components/slideElements'

export interface MatchResult {
  elementId: string
  matchedPhrase: string // What was said
  slidePhrase: string // What it matched
  confidence: number // 0-1 score
  matchType: 'exact' | 'partial' | 'ngram'
}

export interface VideoTriggerResult {
  elementId: string
  action: 'play' | 'pause' | 'restart'
  triggerPhrase: string
}

export interface UseSpeechMatcherOptions {
  slides: SlideData[]
  currentIndex: number
  config: AIAssistConfig
  onMatch: (matches: MatchResult[]) => void
  onVideoTrigger: (result: VideoTriggerResult) => void
}

export interface UseSpeechMatcherReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  recentMatches: MatchResult[]
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  error: string | null
  volumeLevel: number // 0-100 microphone volume
  cooldownProgress: number // 0-100, 100 = ready (no cooldown active)
}

// Stop words for English
const STOP_WORDS: Record<string, Set<string>> = {
  'en-US': new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'what',
    'which',
    'who',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'every',
    'both',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'also',
    'now',
    'here',
    'there',
    'then',
    'once',
    'if',
    'because',
    'as',
    'until',
    'while',
    'about',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'under',
    'again',
    'further',
    'our',
    'your',
    'its',
    'their',
    'my',
    'his',
    'her',
    'let',
    'lets',
    'going',
    'want',
    'see',
    'look',
    'know',
    'think',
    'say',
    'said'
  ])
}

// Video trigger phrases
const VIDEO_TRIGGER_PHRASES = [
  { phrase: 'play the video', action: 'play' as const },
  { phrase: 'show the video', action: 'play' as const },
  { phrase: 'let me show you', action: 'play' as const },
  { phrase: 'watch this', action: 'play' as const },
  { phrase: 'here is a demo', action: 'play' as const },
  { phrase: 'play video', action: 'play' as const },
  { phrase: 'start video', action: 'play' as const },
  { phrase: 'pause the video', action: 'pause' as const },
  { phrase: 'stop the video', action: 'pause' as const },
  { phrase: 'pause video', action: 'pause' as const },
  { phrase: 'play it again', action: 'restart' as const },
  { phrase: 'restart the video', action: 'restart' as const },
  { phrase: 'replay video', action: 'restart' as const },
  { phrase: 'start over', action: 'restart' as const }
]

interface ElementKeyword {
  elementId: string
  keyword: string
  originalText: string
}

// Content Matcher Class
class ContentMatcher {
  private keywordIndex: Map<string, ElementKeyword[]> = new Map()
  private ngramIndex: Map<string, ElementKeyword[]> = new Map()
  private stopWords: Set<string>

  constructor(language: string) {
    this.stopWords = STOP_WORDS[language] || STOP_WORDS['en-US']
  }

  // Build indexes from slide elements
  indexSlide(slide: SlideData): void {
    this.keywordIndex.clear()
    this.ngramIndex.clear()

    const elements = Array.isArray(slide.elements) ? slide.elements : []

    for (const element of elements) {
      if (element.type !== 'text') continue

      const text = (element as { content: string }).content
      if (!text) continue

      const keywords = this.extractKeywords(text)
      const ngrams = this.extractNgrams(text, 2, 3)

      keywords.forEach(kw => this.addToIndex(this.keywordIndex, kw, element.id, text))
      ngrams.forEach(ng => this.addToIndex(this.ngramIndex, ng, element.id, text))
    }
  }

  private addToIndex(
    index: Map<string, ElementKeyword[]>,
    keyword: string,
    elementId: string,
    originalText: string
  ): void {
    const existing = index.get(keyword) || []
    // Avoid duplicates
    if (!existing.some(e => e.elementId === elementId)) {
      existing.push({ elementId, keyword, originalText })
      index.set(keyword, existing)
    }
  }

  // Extract meaningful keywords (filter stop words, min length 3)
  extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !this.stopWords.has(w))
  }

  // Extract n-grams for phrase matching
  extractNgrams(text: string, minN: number, maxN: number): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0)
    const ngrams: string[] = []

    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '))
      }
    }
    return ngrams
  }

  // Match transcript against indexes
  match(transcript: string, sensitivity: 'low' | 'medium' | 'high'): MatchResult[] {
    const threshold = { low: 0.9, medium: 0.7, high: 0.5 }[sensitivity]
    const results: MatchResult[] = []
    const matchedElements = new Set<string>()

    // Try n-gram matches first (more specific)
    const transcriptNgrams = this.extractNgrams(transcript, 2, 3)
    for (const ngram of transcriptNgrams) {
      const matches = this.ngramIndex.get(ngram)
      if (matches) {
        matches.forEach(m => {
          if (!matchedElements.has(m.elementId)) {
            results.push({
              elementId: m.elementId,
              matchedPhrase: ngram,
              slidePhrase: m.originalText.slice(0, 50),
              confidence: 1.0,
              matchType: 'ngram'
            })
            matchedElements.add(m.elementId)
          }
        })
      }
    }

    // Then try single keywords
    const transcriptKeywords = this.extractKeywords(transcript)
    for (const keyword of transcriptKeywords) {
      const matches = this.keywordIndex.get(keyword)
      if (matches) {
        matches.forEach(m => {
          if (!matchedElements.has(m.elementId)) {
            results.push({
              elementId: m.elementId,
              matchedPhrase: keyword,
              slidePhrase: m.originalText.slice(0, 50),
              confidence: 0.8,
              matchType: 'exact'
            })
            matchedElements.add(m.elementId)
          }
        })
      }
    }

    return results.filter(r => r.confidence >= threshold)
  }

  // Get count of indexed elements
  getIndexedCount(): number {
    return this.keywordIndex.size + this.ngramIndex.size
  }
}

// Transcript Buffer Class - only for display purposes
class TranscriptBuffer {
  private words: string[] = []
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  append(newText: string): void {
    const newWords = newText.split(/\s+/).filter(w => w.length > 0)
    this.words.push(...newWords)

    // Trim if exceeds max
    if (this.words.length > this.maxSize) {
      this.words = this.words.slice(-this.maxSize)
    }
  }

  // Get recent words for display only
  getRecent(count: number = 20): string {
    return this.words.slice(-count).join(' ')
  }

  clear(): void {
    this.words = []
  }
}

// Check if Web Speech API is supported
function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

// Get SpeechRecognition constructor
function getSpeechRecognition(): typeof SpeechRecognition | null {
  if ('SpeechRecognition' in window) {
    return (window as typeof window & { SpeechRecognition: typeof SpeechRecognition }).SpeechRecognition
  }
  if ('webkitSpeechRecognition' in window) {
    return (window as typeof window & { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition
  }
  return null
}

export function useSpeechMatcher(options: UseSpeechMatcherOptions): UseSpeechMatcherReturn {
  const { slides, currentIndex, config, onMatch, onVideoTrigger } = options

  // Destructure config values to avoid re-renders when config object reference changes
  const { language, sensitivity, videoAutoplay, cooldownMs, duplicateDetectionMs, transcriptBufferSize } = config

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [cooldownProgress, setCooldownProgress] = useState(100)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const matcherRef = useRef<ContentMatcher | null>(null)
  const bufferRef = useRef<TranscriptBuffer | null>(null)
  const cooldownMapRef = useRef<Map<string, number>>(new Map())
  const recentTranscriptsRef = useRef<{ text: string; timestamp: number }[]>([])
  const lastInterimProcessedRef = useRef<number>(0)
  const onMatchRef = useRef(onMatch)
  const onVideoTriggerRef = useRef(onVideoTrigger)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const volumeAnimationRef = useRef<number | null>(null)

  // Keep refs updated to avoid stale closures in speech recognition callback
  useEffect(() => {
    onMatchRef.current = onMatch
  }, [onMatch])

  useEffect(() => {
    onVideoTriggerRef.current = onVideoTrigger
  }, [onVideoTrigger])

  const isSupported = useMemo(() => isSpeechRecognitionSupported(), [])

  // Get current slide
  const currentSlide = slides[currentIndex]

  // Initialize matcher and buffer
  useEffect(() => {
    matcherRef.current = new ContentMatcher(language)
    bufferRef.current = new TranscriptBuffer(transcriptBufferSize)
  }, [language, transcriptBufferSize])

  // Re-index when slide changes
  useEffect(() => {
    if (currentSlide && matcherRef.current) {
      matcherRef.current.indexSlide(currentSlide)
      // Clear cooldowns and recent transcripts on slide change
      cooldownMapRef.current.clear()
      recentTranscriptsRef.current = []
      console.log('[SpeechMatcher] Indexed slide:', currentIndex)
    }
  }, [currentSlide, currentIndex])

  // Check video trigger phrases
  const checkVideoTriggers = useCallback(
    (text: string): VideoTriggerResult | null => {
      if (!videoAutoplay) return null

      const lowerText = text.toLowerCase()

      // Find video elements on current slide
      const videoElements = Array.isArray(currentSlide?.elements)
        ? currentSlide.elements.filter(e => e.type === 'video')
        : []
      if (videoElements.length === 0) return null

      for (const trigger of VIDEO_TRIGGER_PHRASES) {
        if (lowerText.includes(trigger.phrase)) {
          // Use first video element (future: could use AI to determine which)
          return {
            elementId: videoElements[0].id,
            action: trigger.action,
            triggerPhrase: trigger.phrase
          }
        }
      }
      return null
    },
    [videoAutoplay, currentSlide?.elements]
  )

  // Check if element is on cooldown
  const isOnCooldown = useCallback(
    (elementId: string): boolean => {
      const lastTriggered = cooldownMapRef.current.get(elementId)
      if (!lastTriggered) return false
      return Date.now() - lastTriggered < cooldownMs
    },
    [cooldownMs]
  )

  // Check if text is an exact duplicate processed recently
  const isDuplicateTranscript = useCallback(
    (text: string): boolean => {
      const now = Date.now()
      const expiryMs = duplicateDetectionMs

      // Filter out expired transcripts
      recentTranscriptsRef.current = recentTranscriptsRef.current.filter(entry => now - entry.timestamp < expiryMs)

      // Only block EXACT matches (not substrings)
      for (const entry of recentTranscriptsRef.current) {
        if (entry.text === text) {
          return true
        }
      }
      return false
    },
    [duplicateDetectionMs]
  )

  // Schedule work during browser idle time to avoid blocking animations
  const scheduleIdleWork = useCallback((work: () => void) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => work(), { timeout: 100 })
    } else {
      setTimeout(work, 0)
    }
  }, [])

  // Process new transcript text - match ONLY the current transcript
  const processTranscript = useCallback(
    (newText: string) => {
      if (!matcherRef.current || !bufferRef.current) return

      const trimmedText = newText.trim().toLowerCase()
      if (!trimmedText) return

      // Skip if this is an exact duplicate (fast check, keep synchronous)
      if (isDuplicateTranscript(trimmedText)) {
        return
      }

      // Add to recent transcripts with timestamp (keep last 10)
      recentTranscriptsRef.current = [
        ...recentTranscriptsRef.current.slice(-9),
        { text: trimmedText, timestamp: Date.now() }
      ]

      // Update display buffer (fast, keep synchronous)
      bufferRef.current.append(newText)
      setTranscript(bufferRef.current.getRecent(30))

      // Defer heavy matching work to idle time to avoid blocking animations
      scheduleIdleWork(() => {
        if (!matcherRef.current) return

        // Check for video triggers
        const videoTrigger = checkVideoTriggers(trimmedText)
        if (videoTrigger && !isOnCooldown(videoTrigger.elementId)) {
          cooldownMapRef.current.set(videoTrigger.elementId, Date.now())
          onVideoTriggerRef.current(videoTrigger)
        }

        // Match against slide content
        const matches = matcherRef.current.match(trimmedText, sensitivity)
        const validMatches = matches.filter(m => !isOnCooldown(m.elementId))

        if (validMatches.length > 0) {
          validMatches.forEach(m => {
            cooldownMapRef.current.set(m.elementId, Date.now())
          })
          setRecentMatches(prev => [...prev.slice(-9), ...validMatches])
          onMatchRef.current(validMatches)
        }
      })
    },
    [sensitivity, checkVideoTriggers, isOnCooldown, isDuplicateTranscript, scheduleIdleWork]
  )

  // Start volume meter using Web Audio API
  const startVolumeMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.fftSize)

      // Track last value to avoid unnecessary state updates
      let lastVolumeLevel = 0

      const updateVolume = () => {
        if (!analyserRef.current) return

        analyserRef.current.getByteTimeDomainData(dataArray)

        let sumSquares = 0
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128
          sumSquares += normalized * normalized
        }
        const rms = Math.sqrt(sumSquares / dataArray.length)
        // Round to nearest 20 to reduce state updates
        const scaled = Math.min(100, Math.round((rms * 400) / 20) * 20)

        // Only update if bucket changed
        if (scaled !== lastVolumeLevel) {
          lastVolumeLevel = scaled
          setVolumeLevel(scaled)
        }
      }

      // Update every 500ms (2fps) - sufficient for visual feedback
      volumeAnimationRef.current = setInterval(updateVolume, 500) as unknown as number
      updateVolume()
    } catch (e) {
      console.error('[SpeechMatcher] Volume meter error:', e)
    }
  }, [])

  // Stop volume meter
  const stopVolumeMeter = useCallback(() => {
    if (volumeAnimationRef.current) {
      clearInterval(volumeAnimationRef.current)
      volumeAnimationRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    analyserRef.current = null
    setVolumeLevel(0)
  }, [])

  // Cooldown progress tracker - use interval for reliable updates
  useEffect(() => {
    if (!isListening) {
      setCooldownProgress(100)
      return
    }

    let lastProgress = 100

    const updateCooldownProgress = () => {
      const now = Date.now()
      let minProgress = 100

      // Find the most recent (lowest progress) cooldown
      cooldownMapRef.current.forEach((timestamp, elementId) => {
        const elapsed = now - timestamp
        const remaining = cooldownMs - elapsed

        if (remaining > 0) {
          // Round to nearest 10 to reduce state updates
          const progress = Math.round((elapsed / cooldownMs) * 10) * 10
          minProgress = Math.min(minProgress, progress)
        } else {
          cooldownMapRef.current.delete(elementId)
        }
      })

      // Only update if bucket changed
      if (minProgress !== lastProgress) {
        lastProgress = minProgress
        setCooldownProgress(minProgress)
      }
    }

    // Update every 500ms (2fps) - sufficient for progress bar
    const intervalId = setInterval(updateCooldownProgress, 500)
    updateCooldownProgress()

    return () => {
      clearInterval(intervalId)
    }
  }, [isListening, cooldownMs])

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognitionClass = getSpeechRecognition()
    if (!SpeechRecognitionClass) {
      setError('Speech recognition not available')
      return
    }

    try {
      const recognition = new SpeechRecognitionClass()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language

      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
        startVolumeMeter()
        console.log('[SpeechMatcher] Started listening')
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' '
          } else {
            interimTranscript += result[0].transcript
          }
        }

        // Process final transcript with priority (always process immediately)
        if (finalTranscript) {
          processTranscript(finalTranscript.trim())
        }
        // Process interim results with throttling (max every 500ms) to avoid performance issues
        else if (interimTranscript) {
          const now = Date.now()
          const timeSinceLastInterim = now - lastInterimProcessedRef.current

          if (timeSinceLastInterim >= 500) {
            const trimmed = interimTranscript.trim()
            const wordCount = trimmed.split(/\s+/).length
            if (wordCount >= 2 || trimmed.length >= 6) {
              lastInterimProcessedRef.current = now
              processTranscript(trimmed)
            }
          }
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[SpeechMatcher] Error:', event.error)
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access.')
        } else if (event.error !== 'no-speech') {
          setError(`Speech recognition error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        // Restart if still supposed to be listening
        if (isListening && recognitionRef.current === recognition) {
          try {
            recognition.start()
          } catch {
            setIsListening(false)
            stopVolumeMeter()
          }
        } else {
          setIsListening(false)
          stopVolumeMeter()
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (e) {
      console.error('[SpeechMatcher] Failed to start:', e)
      setError('Failed to start speech recognition')
    }
  }, [isSupported, language, isListening, processTranscript, startVolumeMeter, stopVolumeMeter])

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    stopVolumeMeter()
    console.log('[SpeechMatcher] Stopped listening')
  }, [stopVolumeMeter])

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setRecentMatches([])
    bufferRef.current?.clear()
    recentTranscriptsRef.current = []
    cooldownMapRef.current.clear()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      if (volumeAnimationRef.current) {
        clearInterval(volumeAnimationRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    recentMatches,
    startListening,
    stopListening,
    resetTranscript,
    error,
    volumeLevel,
    cooldownProgress
  }
}

export default useSpeechMatcher
