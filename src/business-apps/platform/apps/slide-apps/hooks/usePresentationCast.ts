// Presentation casting hook with W3C Presentation API and fallback support.

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SlideData, ElementEffect, EffectClearCommand } from '../components/slideElements'
import type { SlideTheme } from '../components/slideThemes'
import type {
  PresentationAvailability,
  PresentationConnection,
  PresentationRequestInstance
} from '../types/presentationApi'
import '../types/presentationApi'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'closed'
export type CastMode = 'auto' | 'cast' | 'window'

export interface VideoControlCommand {
  elementId: string
  action: 'play' | 'pause' | 'restart'
}

export interface CastSlideData {
  type: 'slide-update' | 'theme-update' | 'navigate' | 'init' | 'effect' | 'clear-effects' | 'video-control'
  slideIndex: number
  totalSlides: number
  slide: SlideData
  theme: SlideTheme
  slides?: SlideData[]
  // Effect commands
  effects?: ElementEffect[]
  clearCommand?: EffectClearCommand
  // Video control
  videoControl?: VideoControlCommand
}

export interface ReceiverAckData {
  ackType:
    | 'connected'
    | 'slide-received'
    | 'theme-received'
    | 'ready'
    | 'effect-applied'
    | 'effect-cleared'
    | 'video-controlled'
    | string
  effectId?: string
  elementId?: string
  slideIndex?: number
  totalSlides?: number
}

export interface UsePresentationCastOptions {
  receiverUrl?: string
  onConnectionChange?: (state: ConnectionState) => void
  onReceiverAck?: (data: ReceiverAckData) => void
  onError?: (error: Error) => void
}

export interface UsePresentationCastReturn {
  isSupported: boolean
  isAvailable: boolean
  isConnected: boolean
  isFallbackMode: boolean
  connectionState: ConnectionState
  /** Start casting with optional mode: 'auto' (default), 'cast' (Presentation API only), 'window' (new window only) */
  startCasting: (slides: SlideData[], theme: SlideTheme, currentIndex: number, mode?: CastMode) => Promise<void>
  stopCasting: () => void
  sendSlideData: (data: CastSlideData) => void
  /** Send effect commands to receiver */
  sendEffects: (effects: ElementEffect[]) => void
  /** Send clear effects command to receiver */
  sendClearEffects: (command: EffectClearCommand) => void
  /** Send video control command to receiver */
  sendVideoControl: (elementId: string, action: 'play' | 'pause' | 'restart') => void
}

const STORAGE_KEY = 'slide-cast-presentation-id'
const BROADCAST_CHANNEL_NAME = 'slides-cast-channel'

export function usePresentationCast(options: UsePresentationCastOptions = {}): UsePresentationCastReturn {
  const { receiverUrl = '/slides/cast-receiver', onConnectionChange, onReceiverAck, onError } = options

  const [isSupported] = useState(() => 'presentation' in navigator && navigator.presentation !== undefined)
  const [isAvailable, setIsAvailable] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [isFallbackMode, setIsFallbackMode] = useState(false)

  const connectionRef = useRef<PresentationConnection | null>(null)
  const fallbackWindowRef = useRef<Window | null>(null)
  const requestRef = useRef<PresentationRequestInstance | null>(null)
  const availabilityRef = useRef<PresentationAvailability | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connectionEstablishedTimeRef = useRef<number | null>(null)
  const receivedAckRef = useRef<boolean>(false)

  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state)
      onConnectionChange?.(state)
    },
    [onConnectionChange]
  )

  // Monitor display availability
  useEffect(() => {
    console.log('[Cast API] Checking Presentation API support:', isSupported)

    if (!isSupported) {
      console.log('[Cast API] Presentation API not supported, enabling fallback')
      setIsAvailable(true)
      return
    }

    const fullReceiverUrl = new URL(receiverUrl, window.location.origin).href
    console.log('[Cast API] Initializing with receiver URL:', fullReceiverUrl)

    try {
      if (!globalThis.PresentationRequest) {
        console.log('[Cast API] PresentationRequest not available')
        setIsAvailable(true)
        return
      }

      const request = new globalThis.PresentationRequest([fullReceiverUrl])
      requestRef.current = request
      console.log('[Cast API] PresentationRequest created')

      request
        .getAvailability()
        .then(availability => {
          console.log('[Cast API] Display availability:', availability.value)
          availabilityRef.current = availability
          setIsAvailable(availability.value)

          availability.onchange = () => {
            console.log('[Cast API] Display availability changed:', availability.value)
            setIsAvailable(availability.value)
          }
        })
        .catch(e => {
          console.log('[Cast API] getAvailability() not supported or failed:', (e as Error).message)
          setIsAvailable(true)
        })
    } catch (e) {
      console.error('[Cast API] Failed to create PresentationRequest:', e)
      setIsAvailable(true)
    }

    return () => {
      if (availabilityRef.current) {
        availabilityRef.current.onchange = null
      }
    }
  }, [isSupported, receiverUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
      }
      if (connectionRef.current) {
        connectionRef.current.terminate()
      }
      if (fallbackWindowRef.current && !fallbackWindowRef.current.closed) {
        fallbackWindowRef.current.close()
      }
    }
  }, [])

  // Listen for fallback window close
  useEffect(() => {
    if (!isFallbackMode || !fallbackWindowRef.current) return

    const checkWindow = setInterval(() => {
      if (fallbackWindowRef.current?.closed) {
        updateConnectionState('disconnected')
        setIsFallbackMode(false)
        fallbackWindowRef.current = null
        clearInterval(checkWindow)
      }
    }, 500)

    return () => clearInterval(checkWindow)
  }, [isFallbackMode, updateConnectionState])

  // Listen for acknowledgments from fallback window via BroadcastChannel
  useEffect(() => {
    if (!isFallbackMode) return

    // Create BroadcastChannel if not already exists (may have been created in startCasting)
    if (!broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      } catch {
        // BroadcastChannel not supported
      }
    }

    // Set up message handler for acknowledgments
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.onmessage = (event: MessageEvent) => {
        const data = event.data
        if (data && typeof data === 'object' && data.type === 'cast-ack') {
          // Mark ack received and clear retry interval to stop sending stale init data
          if (!receivedAckRef.current && data.ackType === 'connected') {
            receivedAckRef.current = true
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current)
              retryIntervalRef.current = null
            }
          }
          onReceiverAck?.({ ackType: data.ackType, slideIndex: data.slideIndex, totalSlides: data.totalSlides })
        }
      }
    }

    // Also listen for postMessage fallback
    const handleAckMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      const data = event.data
      if (data && typeof data === 'object' && data.type === 'cast-ack') {
        // Mark ack received and clear retry interval to stop sending stale init data
        if (!receivedAckRef.current && data.ackType === 'connected') {
          receivedAckRef.current = true
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current)
            retryIntervalRef.current = null
          }
        }
        onReceiverAck?.({ ackType: data.ackType, slideIndex: data.slideIndex, totalSlides: data.totalSlides })
      }
    }

    window.addEventListener('message', handleAckMessage)
    return () => {
      window.removeEventListener('message', handleAckMessage)
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
        broadcastChannelRef.current = null
      }
    }
  }, [isFallbackMode, onReceiverAck])

  const setupConnection = useCallback(
    (connection: PresentationConnection, initialData?: CastSlideData) => {
      console.log('[Cast API] Setting up connection:', {
        id: connection.id,
        state: connection.state,
        url: connection.url
      })

      connectionRef.current = connection

      connection.onconnect = () => {
        console.log('[Cast API] onconnect fired - connection established')
        connectionEstablishedTimeRef.current = Date.now()
        updateConnectionState('connected')
        localStorage.setItem(STORAGE_KEY, connection.id)

        if (initialData) {
          console.log('[Cast API] Sending initial data via Presentation API')
          connection.send(JSON.stringify(initialData))
        }
      }

      connection.onclose = event => {
        console.log('[Cast API] onclose fired:', {
          reason: (event as CloseEvent)?.reason || 'unknown',
          code: (event as CloseEvent)?.code,
          wasClean: (event as CloseEvent)?.wasClean
        })
        updateConnectionState('closed')
        connectionRef.current = null
      }

      connection.onterminate = () => {
        console.log('[Cast API] onterminate fired - connection terminated')

        // Detect quick termination (within 3 seconds of connection)
        // This usually means Chromecast couldn't load the receiver URL (e.g., localhost)
        const establishedTime = connectionEstablishedTimeRef.current
        const now = Date.now()
        const timeSinceConnect = establishedTime ? now - establishedTime : null
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

        console.log('[Cast API] Terminate analysis:', {
          establishedTime,
          now,
          timeSinceConnect,
          isLocalhost,
          hostname: window.location.hostname,
          hasOnError: !!onError
        })

        if (timeSinceConnect !== null && timeSinceConnect < 5000) {
          console.log('[Cast API] Quick termination detected - likely Chromecast URL issue')

          if (isLocalhost) {
            console.log('[Cast API] Triggering CHROMECAST_LOCALHOST_ERROR')
            onError?.(new Error('CHROMECAST_LOCALHOST_ERROR'))
          }
        }

        connectionEstablishedTimeRef.current = null
        updateConnectionState('disconnected')
        localStorage.removeItem(STORAGE_KEY)
        connectionRef.current = null
      }

      connection.onmessage = event => {
        console.log('[Cast API] onmessage received:', event.data)
        try {
          const message = JSON.parse(event.data as string)
          if (message.type === 'ready' && initialData) {
            console.log('[Cast API] Receiver ready, sending initial data')
            connection.send(JSON.stringify(initialData))
          } else if (
            message.type === 'connected' ||
            message.type === 'slide-received' ||
            message.type === 'theme-received'
          ) {
            console.log('[Cast API] Receiver ack:', message.type)
            onReceiverAck?.({ ackType: message.type, slideIndex: message.slideIndex, totalSlides: message.totalSlides })
          }
        } catch (e) {
          console.warn('[Cast API] Failed to parse message:', e)
        }
      }

      // Monitor state changes
      const originalState = connection.state
      console.log('[Cast API] Initial connection state:', originalState)

      // Some browsers fire state changes differently
      const stateCheckInterval = setInterval(() => {
        if (connection.state !== originalState) {
          console.log('[Cast API] Connection state changed:', connection.state)
          clearInterval(stateCheckInterval)
        }
      }, 100)

      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(stateCheckInterval), 10000)

      if (connection.state === 'connected') {
        console.log('[Cast API] Connection already in connected state')
        updateConnectionState('connected')
        if (initialData) {
          console.log('[Cast API] Sending initial data (already connected)')
          connection.send(JSON.stringify(initialData))
        }
      } else if (connection.state === 'closed' || connection.state === 'terminated') {
        console.log('[Cast API] Connection already in terminal state:', connection.state)
        updateConnectionState('disconnected')
      }
    },
    [updateConnectionState, onReceiverAck, onError]
  )

  const startCasting = useCallback(
    async (slides: SlideData[], theme: SlideTheme, currentIndex: number, mode: CastMode = 'auto') => {
      const initialData: CastSlideData = {
        type: 'init',
        slideIndex: currentIndex,
        totalSlides: slides.length,
        slide: slides[currentIndex],
        theme,
        slides
      }

      // Try Presentation API if mode allows
      if (mode !== 'window' && isSupported && requestRef.current) {
        const fullReceiverUrl = new URL(receiverUrl, window.location.origin).href
        console.log('[Cast API] Attempting Presentation API cast')
        console.log('[Cast API] Receiver URL:', fullReceiverUrl)
        console.log('[Cast API] Note: Chromecast cannot access localhost URLs!')

        try {
          updateConnectionState('connecting')

          // Try to reconnect to existing session
          const savedId = localStorage.getItem(STORAGE_KEY)
          if (savedId) {
            console.log('[Cast API] Attempting reconnect with saved ID:', savedId)
            try {
              const connection = await requestRef.current.reconnect(savedId)
              console.log('[Cast API] Reconnect successful')
              setupConnection(connection, initialData)
              return
            } catch (e) {
              console.log('[Cast API] Reconnect failed:', (e as Error).message)
              localStorage.removeItem(STORAGE_KEY)
            }
          }

          // Start new presentation
          console.log('[Cast API] Starting new presentation request...')
          console.log('[Cast API] User will see device picker dialog')

          const connection = await requestRef.current.start()

          console.log('[Cast API] Device selected, connection object received:', {
            id: connection.id,
            state: connection.state,
            url: connection.url
          })

          setupConnection(connection, initialData)
          return
        } catch (error) {
          const err = error as Error
          console.error('[Cast API] Presentation API error:', {
            name: err.name,
            message: err.message,
            stack: err.stack
          })

          if (err.name === 'NotAllowedError') {
            console.log('[Cast API] User cancelled device picker')
            updateConnectionState('disconnected')
            return
          }

          if (err.name === 'NotFoundError') {
            console.log('[Cast API] No presentation displays available')
          }

          if (err.name === 'OperationError') {
            console.log('[Cast API] Operation failed - possibly receiver URL not accessible')
            console.log('[Cast API] For Chromecast: The receiver URL must be publicly accessible!')
            console.log('[Cast API] Chromecast is trying to load:', fullReceiverUrl)
          }

          // If mode is 'cast' only, don't fallback - throw error
          if (mode === 'cast') {
            updateConnectionState('disconnected')
            throw new Error('No external displays available. Please connect a display or use "Present in Window".')
          }
          // Fall through to fallback mode for 'auto'
          console.log('[Cast API] Falling back to window mode')
        }
      }

      // If mode is 'cast' only and we reach here, no displays available
      if (mode === 'cast') {
        updateConnectionState('disconnected')
        throw new Error('Cast to Display requires the Presentation API and an external display.')
      }

      // Window mode: Open new window
      try {
        updateConnectionState('connecting')
        setIsFallbackMode(true)

        // Create BroadcastChannel early for sending initial data
        if (!broadcastChannelRef.current) {
          try {
            broadcastChannelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
            console.log('[Cast] BroadcastChannel created in editor')
          } catch (e) {
            console.warn('[Cast] BroadcastChannel not supported:', e)
          }
        }

        // Store cast receiver mode in localStorage to survive auth redirects
        localStorage.setItem('slides-cast-receiver-mode', 'true')

        const fullReceiverUrl = new URL(receiverUrl, window.location.origin).href
        // Open as a new tab (not popup) so user has full browser controls including Cast
        // Using '_blank' without window features opens a regular tab
        const newWindow = window.open(fullReceiverUrl, '_blank')

        if (!newWindow) {
          throw new Error('Failed to open presentation window. Please allow popups.')
        }

        fallbackWindowRef.current = newWindow

        // Reset ack state for new connection
        receivedAckRef.current = false
        let retryCount = 0
        const maxRetries = 15

        // Clear any existing retry interval
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current)
          retryIntervalRef.current = null
        }

        // Send initial data via both channels
        const sendInitialData = () => {
          if (newWindow.closed) {
            console.log('[Cast] Receiver window closed, stopping')
            updateConnectionState('disconnected')
            setIsFallbackMode(false)
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current)
              retryIntervalRef.current = null
            }
            return
          }

          if (receivedAckRef.current) {
            console.log('[Cast] Received ack, stopping retries')
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current)
              retryIntervalRef.current = null
            }
            return
          }

          retryCount++
          console.log(`[Cast] Sending initial data attempt ${retryCount}/${maxRetries}`)

          if (retryCount > maxRetries) {
            console.log('[Cast] Max retries reached, stopping')
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current)
              retryIntervalRef.current = null
            }
            return
          }

          // Send via BroadcastChannel (survives auth redirects)
          if (broadcastChannelRef.current) {
            try {
              broadcastChannelRef.current.postMessage(initialData)
              console.log('[Cast] Sent via BroadcastChannel')
            } catch (e) {
              console.warn('[Cast] BroadcastChannel send failed:', e)
            }
          }

          // Also try postMessage as fallback
          try {
            newWindow.postMessage(initialData, window.location.origin)
            console.log('[Cast] Sent via postMessage')
          } catch (e) {
            console.warn('[Cast] postMessage failed:', e)
          }

          updateConnectionState('connected')
        }

        newWindow.addEventListener('load', () => {
          setTimeout(sendInitialData, 200)
        })

        // Retry sending data every 2 seconds until we get an ack (up to 30 seconds)
        setTimeout(sendInitialData, 500)
        retryIntervalRef.current = setInterval(sendInitialData, 2000)
      } catch (error) {
        updateConnectionState('disconnected')
        setIsFallbackMode(false)
        onError?.(error as Error)
      }
    },
    [isSupported, receiverUrl, setupConnection, updateConnectionState, onError]
  )

  const stopCasting = useCallback(() => {
    // Clear retry interval and reset ack state
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current)
      retryIntervalRef.current = null
    }
    receivedAckRef.current = false

    if (connectionRef.current) {
      connectionRef.current.terminate()
      connectionRef.current = null
    }

    if (fallbackWindowRef.current && !fallbackWindowRef.current.closed) {
      fallbackWindowRef.current.close()
      fallbackWindowRef.current = null
    }

    localStorage.removeItem(STORAGE_KEY)
    updateConnectionState('disconnected')
    setIsFallbackMode(false)
  }, [updateConnectionState])

  const sendSlideData = useCallback((data: CastSlideData) => {
    console.log('[Cast] sendSlideData called with type:', data.type)
    console.log('[Cast] BroadcastChannel available:', !!broadcastChannelRef.current)
    console.log('[Cast] Connection available:', !!connectionRef.current, connectionRef.current?.state)
    console.log('[Cast] Fallback window available:', !!fallbackWindowRef.current, fallbackWindowRef.current?.closed)

    // Send via Presentation API
    if (connectionRef.current && connectionRef.current.state === 'connected') {
      try {
        connectionRef.current.send(JSON.stringify(data))
        console.log('[Cast] Sent via Presentation API')
      } catch (e) {
        console.warn('[Cast] Presentation API send failed:', e)
      }
    }

    // Send via BroadcastChannel (primary fallback method)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(data)
        console.log('[Cast] Sent via BroadcastChannel')
      } catch (e) {
        console.warn('[Cast] BroadcastChannel send failed:', e)
      }
    }

    // Send via postMessage to fallback window (secondary fallback)
    if (fallbackWindowRef.current && !fallbackWindowRef.current.closed) {
      try {
        fallbackWindowRef.current.postMessage(data, window.location.origin)
        console.log('[Cast] Sent via postMessage to fallback window')
      } catch (e) {
        console.warn('[Cast] postMessage send failed:', e)
      }
    }
  }, [])

  // Send effect commands to receiver
  const sendEffects = useCallback(
    (effects: ElementEffect[]) => {
      console.log('[Cast] sendEffects called with', effects.length, 'effects')
      if (effects.length === 0) return
      console.log(
        '[Cast] Sending effects:',
        effects.map(e => ({ id: e.id, effect: e.effect, elementId: e.elementId }))
      )
      sendSlideData({
        type: 'effect',
        effects,
        slideIndex: 0,
        totalSlides: 0,
        slide: {} as SlideData,
        theme: {} as SlideTheme
      })
    },
    [sendSlideData]
  )

  // Send clear effects command to receiver
  const sendClearEffects = useCallback(
    (command: EffectClearCommand) => {
      sendSlideData({
        type: 'clear-effects',
        clearCommand: command,
        slideIndex: 0,
        totalSlides: 0,
        slide: {} as SlideData,
        theme: {} as SlideTheme
      })
    },
    [sendSlideData]
  )

  // Send video control command to receiver
  const sendVideoControl = useCallback(
    (elementId: string, action: 'play' | 'pause' | 'restart') => {
      sendSlideData({
        type: 'video-control',
        videoControl: { elementId, action },
        slideIndex: 0,
        totalSlides: 0,
        slide: {} as SlideData,
        theme: {} as SlideTheme
      })
    },
    [sendSlideData]
  )

  return {
    isSupported,
    isAvailable,
    isConnected: connectionState === 'connected',
    isFallbackMode,
    connectionState,
    startCasting,
    stopCasting,
    sendSlideData,
    sendEffects,
    sendClearEffects,
    sendVideoControl
  }
}
