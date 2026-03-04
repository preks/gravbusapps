// Cast receiver page for external display presentation.

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@newwork/nw-design-system'
import type { SlideData } from './slideElements'
import type { SlideTheme } from './slideThemes'
import { SlideCanvas } from './SlideCanvas'
import type { CastSlideData } from '../hooks/usePresentationCast'
import type { PresentationConnection, PresentationConnectionAvailableEvent } from '../types/presentationApi'
import '../types/presentationApi'

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
  const [showSlideTransition, setShowSlideTransition] = useState(false)
  const [connectionSource, setConnectionSource] = useState<'api' | 'window' | null>(null)
  const [showControls, setShowControls] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const connectionRef = useRef<PresentationConnection | null>(null)
  const controllerWindowRef = useRef<Window | null>(null)
  const prevIndexRef = useRef<number>(0)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const handleMessageRef = useRef<((data: CastSlideData, source: 'api' | 'window') => void) | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSlide = slides[currentIndex]

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

  // Calculate scale to fit display
  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return

      const slideWidth = 1280
      const slideHeight = 720
      const containerWidth = window.innerWidth
      const containerHeight = window.innerHeight

      const scaleX = containerWidth / slideWidth
      const scaleY = containerHeight / slideHeight
      setScale(Math.min(scaleX, scaleY))
    }

    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [])

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
          // Show transition effect when slide changes
          if (data.slideIndex !== prevIndexRef.current) {
            setShowSlideTransition(true)
            setTimeout(() => setShowSlideTransition(false), 300)
            prevIndexRef.current = data.slideIndex
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
      }
    },
    [sendAck]
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
      {/* Slide transition overlay */}
      {showSlideTransition && (
        <div className="gba:absolute gba:inset-0 gba:bg-black/20 gba:z-10 gba:pointer-events-none gba:animate-pulse" />
      )}

      {/* Slide container with transition */}
      <div
        className={cn(
          'gba:relative gba:transition-opacity gba:duration-200',
          showSlideTransition ? 'gba:opacity-90' : 'gba:opacity-100'
        )}
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
        />
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
