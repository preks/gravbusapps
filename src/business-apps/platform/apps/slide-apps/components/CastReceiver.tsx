// Cast receiver page for external display presentation.

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@newwork/nw-design-system'
import type { SlideData, ElementEffect } from './slideElements'
import { DEFAULT_TRANSITION } from './slideElements'
import type { SlideTheme } from './slideThemes'
import { SlideCanvas } from './SlideCanvas'
import { SlideTransitionPlayer } from './SlideTransitionPlayer'
import type { CastSlideData } from '../hooks/usePresentationCast'
import type { PresentationConnection, PresentationConnectionAvailableEvent } from '../types/presentationApi'
import '../types/presentationApi'
import './slideAnimations.css'

export interface CastReceiverProps {
  'data-testid'?: string
}

const IDLE_TIMEOUT_MS = 3000

export const CastReceiver: React.FC<CastReceiverProps> = ({ 'data-testid': testId = 'cast-receiver' }) => {
  const [slides, setSlides] = useState<SlideData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [theme, setTheme] = useState<SlideTheme | null>(null)
  const [scale, setScale] = useState(1)
  const [isConnected, setIsConnected] = useState(false)
  const [isPresentationReceiver, setIsPresentationReceiver] = useState(false)
  const [connectionSource, setConnectionSource] = useState<'api' | 'window' | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [activeEffects, setActiveEffects] = useState<Map<string, ElementEffect>>(new Map())
  const [previousSlide, setPreviousSlide] = useState<SlideData | null>(null)
  const [, setIsTransitioning] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const connectionRef = useRef<PresentationConnection | null>(null)
  const controllerWindowRef = useRef<Window | null>(null)
  const prevIndexRef = useRef<number>(0)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const handleMessageRef = useRef<((data: CastSlideData, source: 'api' | 'window') => void) | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const effectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const currentSlide = slides[currentIndex]
  const currentTransition = currentSlide?.transition || DEFAULT_TRANSITION

  // Handle transition completion
  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false)
    setPreviousSlide(null)
  }, [])

  // Track slide changes for transitions
  useEffect(() => {
    const prevIdx = prevIndexRef.current
    if (slides.length > 0 && prevIdx !== currentIndex && slides[prevIdx]) {
      const targetSlide = slides[currentIndex]
      const transition = targetSlide?.transition || DEFAULT_TRANSITION

      if (transition.type !== 'none') {
        setPreviousSlide(slides[prevIdx])
        setIsTransitioning(true)
      }
    }
    prevIndexRef.current = currentIndex
  }, [currentIndex, slides])

  // Apply effect CSS classes to an element
  const applyEffect = useCallback((effect: ElementEffect) => {
    const element = document.querySelector(`[data-element-id="${effect.elementId}"]`) as HTMLElement
    if (!element) {
      console.warn('[CastReceiver] Element not found for effect:', effect.elementId)
      return false
    }

    // Remove any existing effect classes from this element
    element.classList.remove(
      'effect-highlight',
      'effect-underline',
      'effect-magnify',
      'effect-pulse',
      'effect-glow',
      'effect-bounce',
      'effect-spotlight-active',
      'effect-cleared'
    )
    element.classList.remove(
      'effect-highlight-subtle',
      'effect-highlight-normal',
      'effect-highlight-strong',
      'effect-underline-subtle',
      'effect-underline-normal',
      'effect-underline-strong',
      'effect-magnify-subtle',
      'effect-magnify-normal',
      'effect-magnify-strong',
      'effect-pulse-subtle',
      'effect-pulse-normal',
      'effect-pulse-strong',
      'effect-glow-subtle',
      'effect-glow-normal',
      'effect-glow-strong',
      'effect-bounce-subtle',
      'effect-bounce-normal',
      'effect-bounce-strong'
    )

    // Handle spotlight effect (dim other elements)
    if (effect.effect === 'spotlight') {
      // Add spotlight-active to target
      element.classList.add('effect-spotlight-active')
      // Dim all other slide elements
      document.querySelectorAll('[data-element-id]').forEach(el => {
        if (el !== element) {
          el.classList.add('effect-spotlight-dimmed')
          el.classList.remove('effect-spotlight-restored')
        }
      })
    } else {
      // Apply effect class with intensity
      element.classList.add(`effect-${effect.effect}`)
      element.classList.add(`effect-${effect.effect}-${effect.intensity}`)
      element.style.setProperty('--effect-duration', `${effect.duration}ms`)
    }

    console.log('[CastReceiver] Applied effect:', effect.effect, 'to', effect.elementId)
    return true
  }, [])

  // Clear effect from an element
  const clearEffect = useCallback(
    (effectId: string, elementId?: string) => {
      const targetElementId = elementId || activeEffects.get(effectId)?.elementId
      if (!targetElementId) return

      const element = document.querySelector(`[data-element-id="${targetElementId}"]`) as HTMLElement
      if (element) {
        // Clear all effect classes
        element.classList.add('effect-cleared')
        setTimeout(() => {
          element.classList.remove(
            'effect-highlight',
            'effect-underline',
            'effect-magnify',
            'effect-pulse',
            'effect-glow',
            'effect-bounce',
            'effect-spotlight-active',
            'effect-cleared'
          )
          element.classList.remove(
            'effect-highlight-subtle',
            'effect-highlight-normal',
            'effect-highlight-strong',
            'effect-underline-subtle',
            'effect-underline-normal',
            'effect-underline-strong',
            'effect-magnify-subtle',
            'effect-magnify-normal',
            'effect-magnify-strong',
            'effect-pulse-subtle',
            'effect-pulse-normal',
            'effect-pulse-strong',
            'effect-glow-subtle',
            'effect-glow-normal',
            'effect-glow-strong',
            'effect-bounce-subtle',
            'effect-bounce-normal',
            'effect-bounce-strong'
          )
          element.style.removeProperty('--effect-duration')
        }, 50)
      }

      // Restore spotlight-dimmed elements
      document.querySelectorAll('.effect-spotlight-dimmed').forEach(el => {
        el.classList.remove('effect-spotlight-dimmed')
        el.classList.add('effect-spotlight-restored')
      })

      // Clear timer if exists
      const timer = effectTimersRef.current.get(effectId)
      if (timer) {
        clearTimeout(timer)
        effectTimersRef.current.delete(effectId)
      }
    },
    [activeEffects]
  )

  // Clear all effects
  const clearAllEffects = useCallback(() => {
    activeEffects.forEach((effect, effectId) => {
      clearEffect(effectId, effect.elementId)
    })
    setActiveEffects(new Map())
    effectTimersRef.current.forEach(timer => clearTimeout(timer))
    effectTimersRef.current.clear()
  }, [activeEffects, clearEffect])

  // Handle video control commands
  const handleVideoControl = useCallback((elementId: string, action: 'play' | 'pause' | 'restart') => {
    const video = document.querySelector(`[data-element-id="${elementId}"] video`) as HTMLVideoElement
    if (!video) {
      console.warn('[CastReceiver] Video element not found:', elementId)
      return false
    }

    switch (action) {
      case 'play':
        video.play().catch(e => console.warn('[CastReceiver] Video play failed:', e))
        break
      case 'pause':
        video.pause()
        break
      case 'restart':
        video.currentTime = 0
        video.play().catch(e => console.warn('[CastReceiver] Video restart failed:', e))
        break
    }
    console.log('[CastReceiver] Video control:', action, elementId)
    return true
  }, [])

  // Send acknowledgment back to controller
  const sendAck = useCallback((type: string, data?: Record<string, unknown>) => {
    console.log('[CastReceiver] Sending ack:', type, data)
    const message = JSON.stringify({ type, ...data })

    // Send via Presentation API
    if (connectionRef.current?.state === 'connected') {
      try {
        connectionRef.current.send(message)
        console.log('[CastReceiver] Sent ack via Presentation API')
      } catch (e) {
        console.warn('[CastReceiver] Presentation API send failed:', e)
      }
    }

    // Send via BroadcastChannel (primary fallback)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'cast-ack', ackType: type, ...data })
        console.log('[CastReceiver] Sent ack via BroadcastChannel')
      } catch (e) {
        console.warn('[CastReceiver] BroadcastChannel send failed:', e)
      }
    }

    // Send via postMessage to opener window (secondary fallback)
    if (controllerWindowRef.current || window.opener) {
      try {
        const target = controllerWindowRef.current || window.opener
        target?.postMessage({ type: 'cast-ack', ackType: type, ...data }, window.location.origin)
        console.log('[CastReceiver] Sent ack via postMessage')
      } catch (e) {
        console.warn('[CastReceiver] postMessage send failed:', e)
      }
    }
  }, [])

  // Calculate scale to fit display. Source the canvas dimensions from the
  // current slide (PPTX imports carry their actual <p:sldSz>) so custom-size
  // decks fit the receiver correctly instead of assuming 16:9.
  const castCanvasWidth = currentSlide?.canvasSize?.width ?? 1280
  const castCanvasHeight = currentSlide?.canvasSize?.height ?? 720

  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return

      const containerWidth = window.innerWidth
      const containerHeight = window.innerHeight

      const scaleX = containerWidth / castCanvasWidth
      const scaleY = containerHeight / castCanvasHeight
      setScale(Math.min(scaleX, scaleY))
    }

    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [castCanvasWidth, castCanvasHeight])

  // Auto-hide controls on mouse inactivity
  useEffect(() => {
    const resetIdleTimer = () => {
      setShowControls(true)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      idleTimerRef.current = setTimeout(() => {
        setShowControls(false)
      }, IDLE_TIMEOUT_MS)
    }

    resetIdleTimer()
    window.addEventListener('mousemove', resetIdleTimer)
    window.addEventListener('mousedown', resetIdleTimer)

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer)
      window.removeEventListener('mousedown', resetIdleTimer)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [])

  // Handle incoming messages - use ref to avoid recreating BroadcastChannel
  const handleMessage = useCallback(
    (data: CastSlideData, source: 'api' | 'window') => {
      console.log('[CastReceiver] handleMessage called with type:', data.type, 'source:', source)
      switch (data.type) {
        case 'init':
          console.log('[CastReceiver] Received init message with', data.slides?.length, 'slides')
          if (data.slides) {
            setSlides(data.slides)
          }
          setCurrentIndex(data.slideIndex)
          prevIndexRef.current = data.slideIndex
          setTheme(data.theme)
          setIsConnected(true)
          setConnectionSource(source)
          sendAck('connected', { slideIndex: data.slideIndex, totalSlides: data.totalSlides })
          break

        case 'slide-update':
        case 'navigate':
          // Clear all effects on slide change
          if (data.slideIndex !== prevIndexRef.current) {
            prevIndexRef.current = data.slideIndex
            clearAllEffects()
          }
          setCurrentIndex(data.slideIndex)
          if (data.slide && data.slides) {
            setSlides(data.slides)
          } else if (data.slide) {
            setSlides(prev => {
              const updated = [...prev]
              updated[data.slideIndex] = data.slide
              return updated
            })
          }
          sendAck('slide-received', { slideIndex: data.slideIndex })
          break

        case 'theme-update':
          setTheme(data.theme)
          sendAck('theme-received')
          break

        case 'effect':
          console.log('[CastReceiver] Received effect message with', data.effects?.length || 0, 'effects')
          if (data.effects && data.effects.length > 0) {
            console.log(
              '[CastReceiver] Effects to apply:',
              data.effects.map(e => ({ id: e.id, effect: e.effect, elementId: e.elementId }))
            )
            data.effects.forEach(effect => {
              console.log('[CastReceiver] Attempting to apply effect:', effect.effect, 'to element:', effect.elementId)
              // Apply the effect
              const applied = applyEffect(effect)
              console.log('[CastReceiver] Effect applied result:', applied)
              if (applied) {
                // Track active effect
                setActiveEffects(prev => new Map(prev).set(effect.id, effect))

                // Schedule auto-cleanup
                const timer = setTimeout(() => {
                  clearEffect(effect.id, effect.elementId)
                  setActiveEffects(prev => {
                    const next = new Map(prev)
                    next.delete(effect.id)
                    return next
                  })
                }, effect.duration + 100)
                effectTimersRef.current.set(effect.id, timer)

                sendAck('effect-applied', { effectId: effect.id, elementId: effect.elementId })
              }
            })
          }
          break

        case 'clear-effects':
          if (data.clearCommand) {
            const cmd = data.clearCommand
            switch (cmd.type) {
              case 'clear-single':
                if (cmd.effectId) {
                  clearEffect(cmd.effectId)
                  setActiveEffects(prev => {
                    const next = new Map(prev)
                    next.delete(cmd.effectId!)
                    return next
                  })
                }
                break
              case 'clear-element':
                if (cmd.elementId) {
                  activeEffects.forEach((effect, effectId) => {
                    if (effect.elementId === cmd.elementId) {
                      clearEffect(effectId, effect.elementId)
                    }
                  })
                  setActiveEffects(prev => {
                    const next = new Map(prev)
                    prev.forEach((effect, effectId) => {
                      if (effect.elementId === cmd.elementId) {
                        next.delete(effectId)
                      }
                    })
                    return next
                  })
                }
                break
              case 'clear-all':
                clearAllEffects()
                break
            }
            sendAck('effect-cleared')
          }
          break

        case 'video-control':
          if (data.videoControl) {
            const { elementId, action } = data.videoControl
            const success = handleVideoControl(elementId, action)
            if (success) {
              sendAck('video-controlled', { elementId })
            }
          }
          break
      }
    },
    [sendAck, applyEffect, clearEffect, clearAllEffects, handleVideoControl, activeEffects]
  )

  // Keep ref updated for stable channel listener
  useEffect(() => {
    handleMessageRef.current = handleMessage
  }, [handleMessage])

  // Setup Presentation API receiver
  useEffect(() => {
    if (!('presentation' in navigator) || !navigator.presentation?.receiver) {
      return
    }

    setIsPresentationReceiver(true)

    const setupConnection = (connection: PresentationConnection) => {
      connectionRef.current = connection

      connection.onmessage = event => {
        try {
          const data = JSON.parse(event.data as string) as CastSlideData
          handleMessage(data, 'api')
        } catch {
          // Ignore parse errors
        }
      }

      connection.onclose = () => {
        setIsConnected(false)
        setConnectionSource(null)
        connectionRef.current = null
      }

      // Notify controller we're ready
      if (connection.state === 'connected') {
        connection.send(JSON.stringify({ type: 'ready' }))
      }
    }

    navigator.presentation.receiver.connectionList
      .then(list => {
        list.connections.forEach(setupConnection)

        list.onconnectionavailable = event => {
          setupConnection((event as PresentationConnectionAvailableEvent).connection)
        }
      })
      .catch(() => {
        // Not a presentation receiver context
      })
  }, [handleMessage])

  // Setup BroadcastChannel listener for fallback mode (survives auth redirects)
  // Use empty deps to create channel only once on mount
  useEffect(() => {
    console.log('[CastReceiver] Setting up BroadcastChannel listener')
    try {
      const channel = new BroadcastChannel('slides-cast-channel')
      broadcastChannelRef.current = channel
      console.log('[CastReceiver] BroadcastChannel created')

      channel.onmessage = (event: MessageEvent) => {
        console.log('[CastReceiver] Received BroadcastChannel message:', event.data)
        const data = event.data as CastSlideData
        if (data && typeof data === 'object' && 'type' in data && !('ackType' in data)) {
          console.log('[CastReceiver] Processing message type:', data.type)
          // Use ref to call latest handleMessage without recreating channel
          handleMessageRef.current?.(data, 'window')
        }
      }

      return () => {
        console.log('[CastReceiver] Closing BroadcastChannel')
        channel.close()
        broadcastChannelRef.current = null
      }
    } catch (e) {
      console.warn('[CastReceiver] BroadcastChannel not supported:', e)
      return () => {}
    }
  }, []) // Empty deps - channel created once on mount

  // Setup postMessage listener for fallback mode
  useEffect(() => {
    // Store opener window reference for sending acks
    if (window.opener) {
      controllerWindowRef.current = window.opener as Window
    }

    const handlePostMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return

      // Store source window for acks
      if (event.source && event.source !== window) {
        controllerWindowRef.current = event.source as Window
      }

      const data = event.data as CastSlideData
      if (data && typeof data === 'object' && 'type' in data && !('ackType' in data)) {
        // Use ref to call latest handleMessage
        handleMessageRef.current?.(data, 'window')
      }
    }

    window.addEventListener('message', handlePostMessage)
    return () => window.removeEventListener('message', handlePostMessage)
  }, []) // Empty deps - listener created once on mount

  // Keyboard navigation (for manual control if needed)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          setCurrentIndex(prev => Math.max(0, prev - 1))
          break
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          setCurrentIndex(prev => Math.min(slides.length - 1, prev + 1))
          break
        case 'Home':
          e.preventDefault()
          setCurrentIndex(0)
          break
        case 'End':
          e.preventDefault()
          setCurrentIndex(slides.length - 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slides.length])

  // Waiting state
  if (!isConnected || !currentSlide) {
    return (
      <div
        ref={containerRef}
        className="gba:fixed gba:inset-0 gba:z-[99999] gba:bg-zinc-900 gba:flex gba:flex-col gba:items-center gba:justify-center"
        data-testid={testId}
      >
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-6">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-zinc-800 gba:flex gba:items-center gba:justify-center">
            <svg
              className="gba:w-8 gba:h-8 gba:text-zinc-400 gba:animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
          </div>
          <div className="gba:text-center">
            <h2 className="gba:text-xl gba:font-semibold gba:text-zinc-200 gba:mb-2">Waiting for presentation...</h2>
            <p className="gba:text-sm gba:text-zinc-500">
              {isPresentationReceiver ? 'Connected via Presentation API' : 'Listening for connection from presenter'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'gba:fixed gba:inset-0 gba:z-[99999] gba:overflow-hidden gba:flex gba:items-center gba:justify-center'
      )}
      style={{ backgroundColor: theme?.preview.background || '#000000' }}
      data-testid={testId}
    >
      {/* Slide container with transitions */}
      <div
        className="gba:relative gba:overflow-hidden"
        style={{
          width: castCanvasWidth * scale,
          height: castCanvasHeight * scale
        }}
      >
        <SlideTransitionPlayer
          currentSlideId={currentSlide.id}
          previousSlideId={previousSlide?.id || null}
          transition={currentTransition}
          onTransitionComplete={handleTransitionComplete}
          previousContent={
            previousSlide && (
              <SlideCanvas
                elements={previousSlide.elements}
                selectedIds={new Set()}
                background={previousSlide.background}
                onSelectElements={() => {}}
                onUpdateElement={() => {}}
                onUpdateMultipleElements={() => {}}
                onEditText={() => {}}
                scale={scale}
                isPresenting={true}
                canvasSize={previousSlide.canvasSize}
              />
            )
          }
        >
          <SlideCanvas
            elements={currentSlide.elements}
            selectedIds={new Set()}
            background={currentSlide.background}
            onSelectElements={() => {}}
            onUpdateElement={() => {}}
            onUpdateMultipleElements={() => {}}
            onEditText={() => {}}
            scale={scale}
            isPresenting={true}
            canvasSize={currentSlide.canvasSize}
          />
        </SlideTransitionPlayer>
      </div>

      {/* Connection status indicator */}
      <div
        className={cn(
          'gba:fixed gba:top-4 gba:left-4 gba:flex gba:items-center gba:gap-2 gba:bg-black/50 gba:backdrop-blur-sm gba:rounded-lg gba:px-3 gba:py-2',
          'gba:transition-opacity gba:duration-500',
          showControls ? 'gba:opacity-100' : 'gba:opacity-0'
        )}
      >
        <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-green-500 gba:animate-pulse" />
        <span className="gba:text-xs gba:font-medium gba:text-white">
          {connectionSource === 'api' ? 'Connected (Cast)' : 'Connected (Window)'}
        </span>
      </div>

      {/* Slide counter */}
      <div
        className={cn(
          'gba:fixed gba:bottom-4 gba:right-4 gba:bg-black/50 gba:backdrop-blur-sm gba:rounded-lg gba:px-4 gba:py-2',
          'gba:transition-opacity gba:duration-500',
          showControls ? 'gba:opacity-100' : 'gba:opacity-0'
        )}
      >
        <span className="gba:text-sm gba:font-medium gba:text-white gba:tabular-nums">
          {currentIndex + 1} / {slides.length}
        </span>
      </div>
    </div>
  )
}

export default CastReceiver
