/**
 * GlobalMinimizedCall - Renders minimized call UI outside React tree
 *
 * This component uses the global call manager to persist call UI
 * even when the Chat component is unmounted.
 */

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Users } from 'lucide-react'
import { globalCallManager, type GlobalCallState } from '../services/globalCallManager'
import type { GroupCallParticipant } from '../services/groupWebrtcClient'
import { useChatTranslation } from '../contexts/TranslationContext'

// Format duration as MM:SS or HH:MM:SS
const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Get initials from name
const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

interface MinimizedCallUIProps {
  callState: GlobalCallState
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  onToggleMute: () => void
  onToggleVideo: () => void
  onExpand: () => void
  onEndCall: () => void
}

const MinimizedCallUI: React.FC<MinimizedCallUIProps> = ({
  callState,
  remoteStreams,
  participants,
  onToggleMute,
  onToggleVideo,
  onExpand,
  onEndCall
}) => {
  const t = useChatTranslation()
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const pipAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Get first remote participant for video preview
  const firstRemoteParticipant = participants.find(p => remoteStreams.has(p.id))
  const firstRemoteStream = firstRemoteParticipant ? remoteStreams.get(firstRemoteParticipant.id) : null

  // Set up video for minimized view
  useEffect(() => {
    if (pipVideoRef.current && firstRemoteStream) {
      pipVideoRef.current.srcObject = firstRemoteStream
      pipVideoRef.current.play().catch(err => console.debug('PiP video play error:', err))
    }
  }, [firstRemoteStream])

  // Play all remote audio streams
  useEffect(() => {
    // Create audio elements for each remote stream
    remoteStreams.forEach((stream, participantId) => {
      if (!pipAudioRefs.current.has(participantId)) {
        const audio = document.createElement('audio')
        audio.autoplay = true
        audio.srcObject = stream
        audio.play().catch(err => console.debug('Audio play error:', err))
        pipAudioRefs.current.set(participantId, audio)
      }
    })

    // Clean up removed streams
    pipAudioRefs.current.forEach((audio, participantId) => {
      if (!remoteStreams.has(participantId)) {
        audio.pause()
        audio.srcObject = null
        pipAudioRefs.current.delete(participantId)
      }
    })

    return () => {
      // Cleanup all audio on unmount
      pipAudioRefs.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      pipAudioRefs.current.clear()
    }
  }, [remoteStreams])

  const hasRemoteVideo = firstRemoteStream?.getVideoTracks().some(t => t.enabled)

  return (
    <div
      className="gba:fixed gba:bottom-12 gba:right-4 gba:z-[9999] gba:w-72 gba:bg-gray-900 gba:rounded-lg gba:shadow-2xl gba:overflow-hidden gba:border gba:border-gray-700"
      style={{ pointerEvents: 'auto' }}
      data-testid="global-minimized-call"
    >
      {/* Mini video preview */}
      <div className="gba:relative gba:aspect-video gba:bg-gray-800">
        {hasRemoteVideo ? (
          <video ref={pipVideoRef} autoPlay playsInline muted className="gba:w-full gba:h-full gba:object-cover" />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-2">
            {firstRemoteParticipant ? (
              <>
                <Avatar className="gba:h-12 gba:w-12">
                  {firstRemoteParticipant.avatarUrl && <AvatarImage src={firstRemoteParticipant.avatarUrl} />}
                  <AvatarFallback className="gba:bg-primary/20">
                    {getInitials(firstRemoteParticipant.odName)}
                  </AvatarFallback>
                </Avatar>
                <span className="gba:text-white gba:text-xs">{firstRemoteParticipant.odName}</span>
              </>
            ) : (
              <span className="gba:text-gray-400 gba:text-xs">{t('call-waitingForParticipants')}</span>
            )}
          </div>
        )}

        {/* Participant count overlay */}
        <div className="gba:absolute gba:top-2 gba:left-2 gba:flex gba:items-center gba:gap-1 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
          <Users className="gba:h-3 gba:w-3 gba:text-white" />
          <span className="gba:text-white gba:text-xs">{participants.length}</span>
        </div>

        {/* Duration */}
        <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
          <span className="gba:text-white gba:text-xs gba:font-mono">{formatDuration(callState.duration)}</span>
        </div>
      </div>

      {/* Mini controls */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-gray-800">
        <div className="gba:flex gba:items-center gba:gap-1">
          <button
            onClick={onToggleMute}
            className={`gba:p-2 gba:rounded-full gba:transition-all ${
              callState.isMuted
                ? 'gba:bg-red-500 gba:text-white'
                : 'gba:bg-gray-700 gba:text-white hover:gba:bg-gray-600'
            }`}
            title={callState.isMuted ? t('chat-unmute') : t('chat-mute')}
          >
            {callState.isMuted ? <MicOff className="gba:h-4 gba:w-4" /> : <Mic className="gba:h-4 gba:w-4" />}
          </button>
          <button
            onClick={onToggleVideo}
            className={`gba:p-2 gba:rounded-full gba:transition-all ${
              !callState.isVideoEnabled
                ? 'gba:bg-red-500 gba:text-white'
                : 'gba:bg-gray-700 gba:text-white hover:gba:bg-gray-600'
            }`}
            title={callState.isVideoEnabled ? t('chat-turnOffCamera') : t('chat-turnOnCamera')}
          >
            {callState.isVideoEnabled ? (
              <Video className="gba:h-4 gba:w-4" />
            ) : (
              <VideoOff className="gba:h-4 gba:w-4" />
            )}
          </button>
        </div>
        <div className="gba:flex gba:items-center gba:gap-1">
          <button
            onClick={onExpand}
            className="gba:p-2 gba:rounded-full gba:bg-gray-700 gba:text-white hover:gba:bg-gray-600 gba:transition-all"
            title={t('chat-fullscreen')}
          >
            <Maximize2 className="gba:h-4 gba:w-4" />
          </button>
          <button
            onClick={onEndCall}
            className="gba:p-2 gba:rounded-full gba:bg-red-500 gba:text-white hover:gba:bg-red-600 gba:transition-all"
            title={t('chat-leaveCall')}
          >
            <PhoneOff className="gba:h-4 gba:w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * GlobalMinimizedCall - Monitors the global call manager and renders
 * minimized call UI when needed (even outside of Chat component)
 */
export const GlobalMinimizedCall: React.FC = () => {
  const [callData, setCallData] = useState(globalCallManager.getCallData())
  const [isChatMinimizedMounted, setIsChatMinimizedMounted] = useState(false)
  const [, forceUpdate] = useState({})

  // Subscribe to global call manager changes
  useEffect(() => {
    const handleUpdate = () => {
      const newData = globalCallManager.getCallData()
      console.debug(
        'GlobalMinimizedCall: Received update, status:',
        newData.callState.status,
        'isMinimized:',
        newData.callState.isMinimized,
        'hasWebRTC:',
        !!newData.webrtcClient
      )
      setCallData(newData)
      forceUpdate({})
    }

    const unsubscribe = globalCallManager.subscribe(handleUpdate)

    return () => {
      unsubscribe()
    }
  }, [])

  // Check if Chat's GroupCallModal minimized view is mounted
  // We use a separate effect with polling for reliability
  useEffect(() => {
    const checkChatMounted = () => {
      // Look for the GroupCallModal's minimized view (rendered as portal by Chat component)
      const chatMinimizedElement = document.querySelector('[data-testid="group-call-minimized"]')
      const isMounted = !!chatMinimizedElement

      if (isMounted !== isChatMinimizedMounted) {
        console.debug('GlobalMinimizedCall: Chat minimized view mounted changed:', isMounted)
        setIsChatMinimizedMounted(isMounted)
      }
    }

    // Initial check
    checkChatMounted()

    // Set up observer for DOM changes
    const observer = new MutationObserver(checkChatMounted)
    observer.observe(document.body, { childList: true, subtree: true })

    // Also poll periodically as a fallback
    const pollInterval = setInterval(checkChatMounted, 500)

    return () => {
      observer.disconnect()
      clearInterval(pollInterval)
    }
  }, [isChatMinimizedMounted])

  const shouldRender =
    callData.callState.status !== 'idle' &&
    callData.callState.isMinimized &&
    callData.webrtcClient &&
    !isChatMinimizedMounted

  // Only log when there's an active call to reduce noise
  if (callData.callState.status !== 'idle') {
    console.debug('GlobalMinimizedCall: shouldRender:', shouldRender, {
      status: callData.callState.status,
      isMinimized: callData.callState.isMinimized,
      hasWebRTC: !!callData.webrtcClient,
      isChatMinimizedMounted
    })
  }

  // Don't render if:
  // - No active call
  // - Call is not minimized
  // - Chat component's minimized view is mounted (it will handle the UI)
  if (!shouldRender) {
    return null
  }

  const handleToggleMute = () => {
    if (callData.webrtcClient) {
      const isMuted = callData.webrtcClient.toggleMute()
      globalCallManager.updateCallState({ isMuted })
    }
  }

  const handleToggleVideo = () => {
    if (callData.webrtcClient) {
      const isVideoEnabled = callData.webrtcClient.toggleVideo()
      globalCallManager.updateCallState({ isVideoEnabled })
    }
  }

  const handleExpand = () => {
    // Navigate back to chat to expand
    // This will re-mount the Chat component which will pick up the call state
    globalCallManager.updateCallState({ isMinimized: false })

    // Try to navigate to chat
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'chat')
    window.history.pushState({}, '', url.toString())

    // Trigger a reload or navigation event
    window.dispatchEvent(new Event('popstate'))
  }

  const handleEndCall = async () => {
    // ✅ Use the proper leaveCall function if available (sends socket event + status restoration)
    if (callData.leaveCall) {
      console.log('[GlobalMinimizedCall] Using stored leaveCall function (sends socket event)')
      await callData.leaveCall()
    } else {
      // Fallback: old behavior (won't trigger status restoration!)
      console.warn('[GlobalMinimizedCall] ⚠️ No leaveCall function, falling back to manual cleanup')
      if (callData.webrtcClient) {
        callData.webrtcClient.leaveRoom()
        callData.webrtcClient.destroy()
      }
      globalCallManager.clearCall()
    }
  }

  // Render as portal to a dedicated container
  // This prevents conflicts with other portals
  let portalContainer = document.getElementById('global-minimized-call-portal')
  if (!portalContainer) {
    portalContainer = document.createElement('div')
    portalContainer.id = 'global-minimized-call-portal'
    portalContainer.style.cssText = 'position: fixed; z-index: 9999;'
    document.body.appendChild(portalContainer)
  }

  return createPortal(
    <MinimizedCallUI
      callState={callData.callState}
      remoteStreams={callData.remoteStreams}
      participants={callData.participants}
      onToggleMute={handleToggleMute}
      onToggleVideo={handleToggleVideo}
      onExpand={handleExpand}
      onEndCall={handleEndCall}
    />,
    portalContainer
  )
}

/**
 * Initialize the global minimized call renderer.
 * Uses vanilla DOM rendering that persists even when the Chat screen module is unloaded.
 */
export function initGlobalMinimizedCallRenderer() {
  // Only initialize once per page load
  if (window.__GLOBAL_CALL_UI_CONTAINER__) {
    console.debug('GlobalMinimizedCall: Already initialized')
    return
  }

  console.debug('GlobalMinimizedCall: Initializing global renderer')

  // Create container
  const containerId = 'global-minimized-call-container'
  let container = document.getElementById(containerId)

  if (!container) {
    container = document.createElement('div')
    container.id = containerId
    document.body.appendChild(container)
  }

  window.__GLOBAL_CALL_UI_CONTAINER__ = container

  // Track state to prevent unnecessary updates
  let isUpdating = false
  let lastShouldShow: boolean | null = null
  let lastDuration = -1

  // Function to reset tracking state (called when call is cleared)
  const resetTracking = () => {
    lastShouldShow = null
    lastDuration = -1
  }

  // Set up the vanilla DOM-based renderer that updates based on globalCallManager state
  const updateUI = () => {
    // Prevent re-entry during update
    if (isUpdating) return
    isUpdating = true

    try {
      const manager = globalCallManager
      const callData = manager.getCallData()

      // Check if Chat's minimized view (GroupCallModal) is handling the UI
      // GroupCallModal uses data-testid="{prefix}-minimized" which is "chat-group-call-minimized"
      const chatMinimizedElement = document.querySelector('[data-testid$="-group-call-minimized"]')

      const shouldShow =
        callData.callState.status !== 'idle' &&
        callData.callState.isMinimized &&
        callData.webrtcClient &&
        !chatMinimizedElement

      // Only log when shouldShow actually changes (not on every poll)
      if (shouldShow !== lastShouldShow && lastShouldShow !== null) {
        console.debug('GlobalMinimizedCall updateUI:', {
          shouldShow,
          status: callData.callState.status,
          isMinimized: callData.callState.isMinimized,
          hasWebRTC: !!callData.webrtcClient,
          chatHandling: !!chatMinimizedElement
        })
      }
      lastShouldShow = shouldShow

      if (!shouldShow) {
        if (container!.innerHTML !== '') {
          container!.innerHTML = ''
          console.debug('GlobalMinimizedCall: Cleared UI, shouldShow is false')
          // Only reset tracking when UI was actually cleared
          resetTracking()
        }
        isUpdating = false
        return
      }

      // Only update duration display, not entire UI, for duration changes
      const currentDuration = callData.callState.duration || 0
      const existingUI = document.getElementById('global-minimized-call-ui')

      if (existingUI && lastDuration !== currentDuration) {
        // Just update the duration text
        const durationEl = existingUI.querySelector('[data-duration]')
        if (durationEl) {
          const mins = Math.floor(currentDuration / 60)
          const secs = currentDuration % 60
          durationEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`
          lastDuration = currentDuration
        }
        isUpdating = false
        return
      }

      // If UI already exists and no major changes, skip rebuild
      if (existingUI && lastShouldShow === true) {
        isUpdating = false
        return
      }

      // Get first remote participant for display
      const participants = callData.participants || []
      const remoteStreams = callData.remoteStreams || new Map()
      const firstRemote = participants.find((p: any) => remoteStreams.has(p.id))
      const participantName = firstRemote?.odName || 'Group Call'
      const participantInitials = participantName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()

      // Format duration
      const duration = callData.callState.duration || 0
      const mins = Math.floor(duration / 60)
      const secs = duration % 60
      const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`

      // Hardcoded English tooltips (this vanilla DOM renderer is currently disabled)
      const tooltipMute = callData.callState.isMuted ? 'Unmute' : 'Mute'
      const tooltipCamera = callData.callState.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'
      const tooltipExpand = 'Expand call'
      const tooltipLeave = 'Leave call'

      // Render the minimized UI using innerHTML (vanilla DOM)
      container!.innerHTML = `
      <div id="global-minimized-call-ui" style="
        position: fixed;
        bottom: 48px;
        right: 16px;
        z-index: 9999;
        width: 288px;
        background: #111827;
        border-radius: 8px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        border: 1px solid #374151;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <!-- Video preview area -->
        <div style="
          position: relative;
          aspect-ratio: 16/9;
          background: #1f2937;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Avatar placeholder -->
          <div style="
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 500;
          ">${participantInitials}</div>
          
          <!-- Participant count -->
          <div style="
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(0,0,0,0.6);
            padding: 4px 8px;
            border-radius: 9999px;
            color: white;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            ${participants.length}
          </div>
          
          <!-- Duration -->
          <div data-duration style="
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0,0,0,0.6);
            padding: 4px 8px;
            border-radius: 9999px;
            color: white;
            font-size: 12px;
            font-family: monospace;
          ">${durationStr}</div>
        </div>
        
        <!-- Controls -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          background: #1f2937;
        ">
          <div style="display: flex; gap: 4px;">
            <button id="global-call-mute-btn" style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: ${callData.callState.isMuted ? '#ef4444' : '#374151'};
              color: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            " title="${tooltipMute}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${
                  callData.callState.isMuted
                    ? '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'
                    : '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'
                }
              </svg>
            </button>
            <button id="global-call-video-btn" style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: ${!callData.callState.isVideoEnabled ? '#ef4444' : '#374151'};
              color: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            " title="${tooltipCamera}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${
                  !callData.callState.isVideoEnabled
                    ? '<path d="M16.5 2.25H2.625c-.621 0-1.125.504-1.125 1.125v13.5c0 .621.504 1.125 1.125 1.125h13.5c.621 0 1.125-.504 1.125-1.125V3.375c0-.621-.504-1.125-1.125-1.125z"/><path d="M22.5 7.5l-4.5 4.5 4.5 4.5V7.5z"/><line x1="1" y1="1" x2="23" y2="23"/>'
                    : '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>'
                }
              </svg>
            </button>
          </div>
          <div style="display: flex; gap: 4px;">
            <button id="global-call-expand-btn" style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: #374151;
              color: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            " title="${tooltipExpand}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
            <button id="global-call-end-btn" style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: #ef4444;
              color: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            " title="${tooltipLeave}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" transform="rotate(135 12 12)"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `

      // Attach event listeners
      const muteBtn = document.getElementById('global-call-mute-btn')
      const videoBtn = document.getElementById('global-call-video-btn')
      const expandBtn = document.getElementById('global-call-expand-btn')
      const endBtn = document.getElementById('global-call-end-btn')

      muteBtn?.addEventListener('click', () => {
        if (callData.webrtcClient) {
          const isMuted = callData.webrtcClient.toggleMute()
          manager.updateCallState({ isMuted })
        }
      })

      videoBtn?.addEventListener('click', () => {
        if (callData.webrtcClient) {
          const isVideoEnabled = callData.webrtcClient.toggleVideo()
          manager.updateCallState({ isVideoEnabled })
        }
      })

      expandBtn?.addEventListener('click', () => {
        console.debug('GlobalMinimizedCall: Expand clicked, clearing UI immediately')

        // Immediately clear the vanilla DOM UI before navigation
        container!.innerHTML = ''
        resetTracking()

        // Update state (but don't clear the call since we're restoring in React)
        manager.updateCallState({ isMinimized: false })

        // Navigate to chat
        const url = new URL(window.location.href)
        url.searchParams.set('view', 'chat')
        window.history.pushState({}, '', url.toString())
        window.dispatchEvent(new Event('popstate'))
      })

      endBtn?.addEventListener('click', () => {
        if (callData.webrtcClient) {
          callData.webrtcClient.leaveRoom()
          callData.webrtcClient.destroy()
        }
        manager.clearCall()
      })
    } finally {
      isUpdating = false
    }
  }

  // Subscribe to state changes (but don't trigger infinite updates)
  globalCallManager.subscribe(() => {
    // Use requestAnimationFrame to batch updates
    requestAnimationFrame(updateUI)
  })

  // Check periodically for Chat's minimized view mounting/unmounting
  // This replaces the MutationObserver which caused infinite loops
  setInterval(() => {
    requestAnimationFrame(updateUI)
  }, 500)

  console.debug('GlobalMinimizedCall: Initialized vanilla DOM renderer')
}

export default GlobalMinimizedCall
