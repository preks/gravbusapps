/**
 * useGroupCallModalRtkState - State and effects for GroupCallModalRtk (Realtime Kit group call UI).
 */

import { useState, useEffect, useMemo } from 'react'
import { useChatTranslation } from '../contexts/TranslationContext'
import { getScreenShareTrack } from '../utils/groupCallModalUtils'
import { isVideoTrackScreenShare } from '../utils/callUtils'
import type { GroupCallModalRtkProps } from '../components/call/groupCallModalTypes'
import { useGroupCallModalCallConversation } from './groupCallModal/useGroupCallModalCallConversation'
import { useGroupCallModalPeersAndMeeting } from './groupCallModal/useGroupCallModalPeersAndMeeting'
import { useGroupCallModalHandRaise } from './groupCallModal/useGroupCallModalHandRaise'
import { useGroupCallModalSidebarAndReactions } from './groupCallModal/useGroupCallModalSidebarAndReactions'
import { useGroupCallModalVideoRefs } from './groupCallModal/useGroupCallModalVideoRefs'
import { useGroupCallModalStreamAttachment } from './groupCallModal/useGroupCallModalStreamAttachment'
import { useGroupCallModalTrackAttachment } from './groupCallModal/useGroupCallModalTrackAttachment'
import { useGroupCallModalMuteHandlers } from './groupCallModal/useGroupCallModalMuteHandlers'
import { useGroupCallModalSpeakerAndExpanded } from './groupCallModal/useGroupCallModalSpeakerAndExpanded'
import { useGroupCallModalMinimized } from './groupCallModal/useGroupCallModalMinimized'

export function useGroupCallModalRtkState(props: GroupCallModalRtkProps) {
  const {
    callState,
    participants,
    activeSpeakerId,
    activeSpeakerHistory,
    onEndCall,
    onToggleMute,
    onToggleVideo,

    currentUserId,
    currentUser,
    callConversation: callConversationProp,
    activeConversation
  } = props

  const { instanceId, callConversation } = useGroupCallModalCallConversation(props)
  const {
    meeting,
    currentParticipant,
    globalMeetingId,
    effectiveLocalIsMuted,
    effectiveLocalIsVideoEnabled,
    localScreenShareTrack,
    effectiveLocalIsScreenSharing,
    stableRemotePeers
  } = useGroupCallModalPeersAndMeeting(props)

  const {
    effectiveLocalHandRaised,
    effectiveRemoteHandsRaised,
    effectiveHandRaisedOrder,
    isLocalUser,
    isParticipantHandRaised,
    getHandRaisedOrderNumber
  } = useGroupCallModalHandRaise(props, meeting, globalMeetingId)

  const sidebar = useGroupCallModalSidebarAndReactions(props, callConversation, meeting, stableRemotePeers)
  const {
    currentPage,
    setCurrentPage,
    sidebarView,
    setSidebarView,
    unreadChatCount,
    activeReactions,
    showReactionAnimation,
    handleToggleParticipants,
    handleToggleChat,
    handleToggleAudioSettings,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    canSelectAudioOutput,
    PARTICIPANTS_PER_PAGE,
    gallerySize,
    setGallerySize
  } = sidebar

  const videoRefs = useGroupCallModalVideoRefs(props)
  const {
    localVideoRef,
    remoteVideoRefs,
    screenShareVideoRefs,
    speakerVolumeRef,
    selectedAudioOutputIdRef,
    applySinkIdToElement,
    videoElementsVersion,
    setLocalVideoRef,
    videoRefCallbacksRef,
    getVideoRefCallback,
    focusedScreenShareId,
    setFocusedScreenShareId,
    expandedScreenShare,
    setExpandedScreenShare,
    contentProminentWhenSharing,
    setContentProminentWhenSharing
  } = videoRefs

  useGroupCallModalStreamAttachment(
    props,
    meeting,
    stableRemotePeers,
    effectiveLocalIsVideoEnabled,
    localVideoRef,
    remoteVideoRefs,
    videoElementsVersion
  )

  const t = useChatTranslation()

  const { handleMuteParticipant, handleMuteAll } = useGroupCallModalMuteHandlers(
    props,
    meeting,
    currentParticipant,
    stableRemotePeers
  )

  // Debug helper: Expose call controls to window for console debugging
  useEffect(() => {
    if (globalThis.window !== undefined) {
      ;(globalThis as any).rtkLeaveCall = () => {
        onEndCall()
      }
      ;(globalThis as any).rtkToggleMute = () => {
        onToggleMute()
      }
      ;(globalThis as any).rtkToggleVideo = () => {
        onToggleVideo()
      }
    }

    return () => {
      // Clean up on unmount
      if (globalThis.window !== undefined) {
        delete (globalThis as any).rtkLeaveCall
        delete (globalThis as any).rtkToggleMute
        delete (globalThis as any).rtkToggleVideo
      }
    }
  }, [onEndCall, onToggleMute, onToggleVideo])

  // Get ALL screen shares (not just one)
  const allScreenShares = useMemo(() => {
    const shares: Array<{
      peerId: string
      peerName: string
      screenShareTrack: MediaStreamTrack
      trackId: string
      peer: any
    }> = []

    const seenPeerIds = new Set<string>()

    // Find screen shares from remote peers
    stableRemotePeers?.forEach((peer: any) => {
      // Check multiple ways to detect screen share
      const screenShareTrack = getScreenShareTrack(peer)
      const hasScreenShareEnabled = peer.screenShareEnabled === true

      if (screenShareTrack) {
        // CRITICAL: Only include tracks that are still live (not ended/stopped)
        if (screenShareTrack.readyState !== 'live') {
        } else if (seenPeerIds.has(peer.id)) {
          // Duplicate - skip
        } else {
          shares.push({
            peerId: peer.id,
            peerName: peer.name || peer.displayName || peer.customParticipantId || 'Unknown',
            screenShareTrack,
            trackId: screenShareTrack.id,
            peer
          })
          seenPeerIds.add(peer.id)
        }
      } else if (hasScreenShareEnabled) {
        // Screen share is enabled but track not found yet - might be initializing
      }
    })

    if (effectiveLocalIsScreenSharing && localScreenShareTrack) {
      // CRITICAL: Only include tracks that are still live (not ended/stopped)
      if (localScreenShareTrack.readyState === 'live') {
        const localPeerId = meeting?.self?.id || 'local' // Use actual peer ID
        if (seenPeerIds.has(localPeerId)) {
        } else {
          shares.push({
            peerId: localPeerId,
            peerName: participants[0]?.odName || 'You',
            screenShareTrack: localScreenShareTrack,
            trackId: localScreenShareTrack.id,
            peer: null
          })
          seenPeerIds.add(localPeerId) // CRITICAL: Add the actual peerId, not 'local'
        }
      } else {
      }
    }

    return shares
  }, [stableRemotePeers, effectiveLocalIsScreenSharing, localScreenShareTrack, participants])

  // Get focused screen share (user-selected or first one)
  const focusedScreenShare = useMemo(() => {
    if (focusedScreenShareId) {
      return allScreenShares.find(s => s.peerId === focusedScreenShareId) || allScreenShares[0] || null
    }
    return allScreenShares[0] || null
  }, [allScreenShares, focusedScreenShareId])

  // Auto-focus first screen share when it appears
  useEffect(() => {
    if (allScreenShares.length > 0 && !focusedScreenShareId) {
      setFocusedScreenShareId(allScreenShares[0].peerId)
    } else if (allScreenShares.length === 0) {
      setFocusedScreenShareId(null)
    }
  }, [allScreenShares, focusedScreenShareId])

  // Build unified grid items: participants + screen shares
  const gridItems = useMemo(() => {
    // FIXED: Create mapping from userId to avatarUrl from CALL conversation participants
    // NOT from activeConversation (which changes as user navigates)
    const avatarUrlMap = new Map<string, string>()

    // Use callConversationProp (where the call was initiated) for participant avatars
    // This ensures avatars remain correct even when user navigates to other conversations
    const conversationForAvatars = callConversationProp || activeConversation

    if (conversationForAvatars?.participants) {
      conversationForAvatars.participants.forEach((cp: any) => {
        if (cp.user?.avatarUrl) {
          // Map by userId (the stable user ID in our system)
          avatarUrlMap.set(cp.userId, cp.user.avatarUrl)
          avatarUrlMap.set(cp.user.id, cp.user.avatarUrl)
        }
      })
    }

    // Fallback: check participants array
    participants.forEach(p => {
      if (p.avatarUrl && !avatarUrlMap.has(p.id)) {
        avatarUrlMap.set(p.id, p.avatarUrl)
        avatarUrlMap.set(p.odId, p.avatarUrl)
      }
    })

    const items: Array<{
      id: string
      type: 'video' | 'screen-share' | 'avatar'
      peerId: string
      avatarUrl?: string
      peerName: string
      userId?: string // SDK userId - for checking hand-raised state
      customParticipantId?: string // Our DB user ID - for checking hand-raised state
      videoTrack?: MediaStreamTrack
      audioTrack?: MediaStreamTrack
      screenShareTrack?: MediaStreamTrack
      hasVideoTrack?: boolean // For render decision
      hasAudioTrack?: boolean // For render decision
      isLocal: boolean
      isMuted: boolean
      isVideoEnabled: boolean
      isFocusedScreenShare?: boolean
      isActiveSpeaker?: boolean // Active speaker highlighting
    }> = []
    const seenIds = new Set<string>()

    // Add focused screen share first (if exists) - will be larger in grid
    if (focusedScreenShare) {
      const itemId = `screen-share-${focusedScreenShare.peerId}`
      if (!seenIds.has(itemId)) {
        items.push({
          id: itemId,
          type: 'screen-share',
          peerId: focusedScreenShare.peerId,
          peerName: focusedScreenShare.peerName,
          screenShareTrack: focusedScreenShare.screenShareTrack,
          isLocal: isLocalUser(focusedScreenShare.peerId),
          isMuted: isLocalUser(focusedScreenShare.peerId) ? effectiveLocalIsMuted : false,
          isVideoEnabled: true,
          isFocusedScreenShare: true
        })
        seenIds.add(itemId)
      }
    }

    // Add local participant (video or avatar) - ALWAYS show, even when screen sharing
    // Screen share and camera video are separate and should both be visible
    // CRITICAL: Filter out screen share track - only use camera video track
    const localVideoTrack =
      meeting?.self?.videoTrack && !isVideoTrackScreenShare(meeting.self.videoTrack) ? meeting.self.videoTrack : null
    const localAudioTrack = meeting?.self?.audioTrack
    const localHasVideo = effectiveLocalIsVideoEnabled && !!localVideoTrack

    // Always add local participant - screen share is a separate item
    const localParticipantId = 'local-participant'
    if (!seenIds.has(localParticipantId)) {
      const localPeerId = meeting?.self?.id || 'local'
      const localUserId = meeting?.self?.userId || currentUserId
      const localCustomParticipantId = meeting?.self?.customParticipantId

      // Try to match avatar by userId first (most reliable)
      const localAvatarUrl =
        avatarUrlMap.get(localUserId || '') ||
        avatarUrlMap.get(localCustomParticipantId || '') ||
        avatarUrlMap.get(localPeerId) ||
        participants[0]?.avatarUrl ||
        meeting?.self?.picture

      // Get local participant name from currentUser, currentParticipant, or meeting.self
      // Don't use participants[0] in test mode as it would be the first test participant
      const localParticipantName =
        currentUser?.displayName ||
        currentUser?.username ||
        currentParticipant?.odName ||
        meeting?.self?.name ||
        meeting?.self?.odName ||
        'You'

      const localParticipantItem = {
        id: localParticipantId,
        type: localHasVideo ? 'video' : 'avatar',
        peerId: localPeerId, // Use actual peer ID from SDK (fallback to 'local' for safety)
        peerName: localParticipantName,
        avatarUrl: localAvatarUrl,
        userId: meeting?.self?.userId, // For checking hand-raised state
        customParticipantId: meeting?.self?.customParticipantId, // Our DB user ID - for checking reactions
        videoTrack: localVideoTrack,
        audioTrack: localAudioTrack,
        hasVideoTrack: localHasVideo, // For rendering decision
        hasAudioTrack: !!localAudioTrack, // Audio needs video element too!
        isLocal: true,
        isMuted: effectiveLocalIsMuted,
        isVideoEnabled: effectiveLocalIsVideoEnabled,
        // Don't highlight yourself as active speaker (industry standard UX)
        // You already know you're speaking - more useful to see who ELSE is speaking
        isActiveSpeaker: false // Could make this: activeSpeakerId === 'local' to show self-highlight
      } as const
      items.push(localParticipantItem)
      seenIds.add(localParticipantId)
    }

    // Add non-focused screen shares to grid
    allScreenShares.forEach(share => {
      // Skip if this is the focused screen share (already added above)
      if (share.peerId === focusedScreenShare?.peerId) {
        return
      }

      const shareId = `screen-share-${share.peerId}`
      if (seenIds.has(shareId)) {
      } else {
        items.push({
          id: shareId,
          type: 'screen-share',
          peerId: share.peerId,
          peerName: share.peerName,
          screenShareTrack: share.screenShareTrack,
          isLocal: isLocalUser(share.peerId),
          isMuted: isLocalUser(share.peerId) ? effectiveLocalIsMuted : false,
          isVideoEnabled: true
        })
        seenIds.add(shareId)
      }
    })

    // Add remote participants (videos or avatars) - always add, even if sharing screen
    stableRemotePeers?.forEach((peer: any) => {
      // Get camera track - exclude screen share track
      const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null
      const hasVideo = peer.videoEnabled && !!cameraVideoTrack

      const participantId = `participant-${peer.id}`
      if (seenIds.has(participantId)) {
      } else {
        // Try to match avatar by userId or customParticipantId
        const avatarUrl =
          avatarUrlMap.get(peer.userId) ||
          avatarUrlMap.get(peer.customParticipantId) ||
          avatarUrlMap.get(peer.id) ||
          peer.picture

        items.push({
          id: participantId,
          type: hasVideo ? 'video' : 'avatar',
          peerId: peer.id,
          peerName: peer.name || peer.displayName || peer.odName || peer.customParticipantId || 'Unknown',
          avatarUrl: avatarUrl || peer.avatarUrl || peer.picture,
          userId: peer.userId, // SDK userId - for checking hand-raised state
          customParticipantId: peer.customParticipantId, // Our DB user ID - for checking hand-raised state
          videoTrack: cameraVideoTrack,
          audioTrack: peer.audioTrack,
          hasVideoTrack: hasVideo, // For rendering decision
          hasAudioTrack: !!peer.audioTrack, // Audio needs video element too!
          isLocal: false,
          isMuted: !peer.audioEnabled,
          isVideoEnabled: peer.videoEnabled || false,
          isActiveSpeaker: activeSpeakerId === peer.id // Check if this peer is active speaker
        })
        seenIds.add(participantId)
      }
    })

    // Sort items: Active speaker first (after focused screen share), then by history
    const focusedScreenShareCount = focusedScreenShare ? 1 : 0
    // CRITICAL: Find local participant, NOT screen share (screen share is also isLocal=true)
    const localItem = items.find(i => i.isLocal && i.type !== 'screen-share')

    const activeSpeakerItems = items
      .slice(focusedScreenShareCount)
      .filter(item => item.isActiveSpeaker && !item.isLocal && item.type !== 'screen-share')
    const historyItems = items
      .slice(focusedScreenShareCount)
      .filter(
        item =>
          !item.isActiveSpeaker &&
          !item.isLocal &&
          item.type !== 'screen-share' &&
          activeSpeakerHistory?.includes(item.peerId)
      )
      .sort((a, b) => {
        const aIndex = activeSpeakerHistory?.indexOf(a.peerId) ?? -1
        const bIndex = activeSpeakerHistory?.indexOf(b.peerId) ?? -1
        return aIndex - bIndex
      })
    const otherItems = items
      .slice(focusedScreenShareCount)
      .filter(
        item =>
          !item.isActiveSpeaker &&
          !item.isLocal &&
          item.type !== 'screen-share' &&
          !activeSpeakerHistory?.includes(item.peerId)
      )
    const screenShareItems = items.slice(focusedScreenShareCount).filter(i => i.type === 'screen-share')

    // Reconstruct: focused screen share (if any) + local + active speaker + history + others + screen shares
    const sortedItems = [
      ...items.slice(0, focusedScreenShareCount), // Keep focused screen share first
      ...(localItem ? [localItem] : []),
      ...activeSpeakerItems,
      ...historyItems,
      ...otherItems,
      ...screenShareItems
    ]

    return sortedItems
  }, [
    focusedScreenShare,
    allScreenShares,
    stableRemotePeers, // Use stable version to prevent unnecessary recomputation
    callState.isVideoEnabled,
    callState.isMuted,
    callState.isScreenSharing,
    callState.handRaised, // Needed for rendering hand indicator on local tile
    callState.remoteHandsRaised, // Needed for rendering hand indicators on remote tiles
    callState.handRaisedOrder, // Needed for hand-raise order numbers
    participants,
    meeting?.self?.videoTrack?.id, // Only depend on track ID, not entire object
    meeting?.self?.audioTrack?.id, // Only depend on track ID, not entire object
    meeting?.self?.videoEnabled, // SDK local video state (source of truth)
    meeting?.self?.audioEnabled, // SDK local audio state (source of truth)
    meeting?.self?.screenShareEnabled, // SDK local screen share state (source of truth)
    localScreenShareTrack?.id, // local screen share track identity
    meeting?.self?.userId, // For hand-raised checks
    meeting?.self?.customParticipantId, // For reactions
    activeSpeakerId,
    activeSpeakerHistory,
    callConversationProp?.participants, // For avatar URLs from call conversation
    activeConversation?.participants, // Fallback for avatar URLs
    currentUserId // For local avatar lookup
  ])

  // Clean up stale video ref callbacks when participants leave
  useEffect(() => {
    const currentPeerIds = new Set(gridItems.map(item => item.peerId))
    const callbackPeerIds = Array.from(videoRefCallbacksRef.current.keys())

    callbackPeerIds.forEach(peerId => {
      if (!currentPeerIds.has(peerId)) {
        videoRefCallbacksRef.current.delete(peerId)
      }
    })
  }, [gridItems])

  // Paginate grid items
  const paginatedGridItems = useMemo(() => {
    const totalPages = Math.ceil(gridItems.length / PARTICIPANTS_PER_PAGE)
    const startIndex = currentPage * PARTICIPANTS_PER_PAGE
    const endIndex = startIndex + PARTICIPANTS_PER_PAGE
    const pageItems = gridItems.slice(startIndex, endIndex)

    return {
      items: pageItems,
      totalPages,
      totalItems: gridItems.length
    }
  }, [gridItems, currentPage, PARTICIPANTS_PER_PAGE])

  // Reset to first page if current page is out of bounds (participants left)
  useEffect(() => {
    const totalPages = Math.ceil(gridItems.length / PARTICIPANTS_PER_PAGE)
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1)
    }
  }, [gridItems.length, currentPage, PARTICIPANTS_PER_PAGE])

  // Calculate responsive values based on screen size
  function getResponsiveConfig(width: number) {
    let sidebarWidth: number
    let minTileSize: number
    let minTileSizeWithSidebar: number
    let maxTileSize: number
    if (width < 768) {
      sidebarWidth = 280
      minTileSize = 150
      minTileSizeWithSidebar = 120
      maxTileSize = 9999
    } else if (width < 1024) {
      sidebarWidth = 320
      minTileSize = 180
      minTileSizeWithSidebar = 150
      maxTileSize = 450
    } else if (width < 1440) {
      sidebarWidth = 360
      minTileSize = 250
      minTileSizeWithSidebar = 200
      maxTileSize = 600
    } else if (width < 1920) {
      sidebarWidth = 360
      minTileSize = 250
      minTileSizeWithSidebar = 200
      maxTileSize = 700
    } else {
      sidebarWidth = 360
      minTileSize = 250
      minTileSizeWithSidebar = 200
      maxTileSize = 800
    }
    return { sidebarWidth, minTileSize, minTileSizeWithSidebar, maxTileSize }
  }

  const [responsiveConfig, setResponsiveConfig] = useState(() => getResponsiveConfig(globalThis.window.innerWidth))

  // Update responsive config on window resize
  useEffect(() => {
    const handleResize = () => {
      setResponsiveConfig(getResponsiveConfig(globalThis.window.innerWidth))
    }

    globalThis.window.addEventListener('resize', handleResize)
    return () => globalThis.window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate minimum tile size for auto-fit grid based on panel state, screen size, and gallery mode
  const minTileSize = useMemo(() => {
    const base = sidebarView === 'closed' ? responsiveConfig.minTileSize : responsiveConfig.minTileSizeWithSidebar
    if (gallerySize === 'large') {
      return Math.max(100, Math.floor(base * 0.7))
    }
    return base
  }, [sidebarView, responsiveConfig, gallerySize])

  // Cap max tile size when large gallery is on so more tiles fit
  const maxTileSize = useMemo(() => {
    if (gallerySize === 'large') {
      return Math.min(responsiveConfig.maxTileSize, 350)
    }
    return responsiveConfig.maxTileSize
  }, [gallerySize, responsiveConfig.maxTileSize])

  // Create stable track IDs for dependency tracking
  const screenShareTrackIds = useMemo(() => {
    return gridItems
      .filter(item => item.type === 'screen-share' && item.screenShareTrack)
      .map(item => `${item.peerId}:${item.screenShareTrack!.id}`)
      .sort()
      .join('|')
  }, [gridItems])

  const videoTrackIds = useMemo(() => {
    return gridItems
      .filter(item => item.type === 'video' && item.videoTrack)
      .map(item => `${item.peerId}:${item.videoTrack!.id}`)
      .sort()
      .join('|')
  }, [gridItems])

  useGroupCallModalTrackAttachment({
    gridItems,
    currentPage,
    isMinimized: callState.isMinimized,
    screenShareTrackIds,
    videoTrackIds,
    localVideoRef,
    remoteVideoRefs,
    screenShareVideoRefs,
    applySinkIdToElement,
    selectedAudioOutputIdRef
  })

  const { handleSpeakerDeviceChange, expandedScreenShareVideoRef, pipAudioRefs } = useGroupCallModalSpeakerAndExpanded(
    props,
    remoteVideoRefs,
    expandedScreenShare,
    setExpandedScreenShare,
    applySinkIdToElement,
    selectedAudioOutputIdRef,
    gridItems
  )

  const { firstRemotePeer, buildStreamFromPeer } = useGroupCallModalMinimized({
    props,
    stableRemotePeers,
    meeting,
    activeConversation,
    callStateIsMinimized: callState.isMinimized,
    pipAudioRefs,
    applySinkIdToElement,
    selectedAudioOutputIdRef
  })

  const isOpen =
    callState.status === 'connected' || callState.status === 'joining' || callState.status === 'reconnecting'

  // Render minimized view - floating PiP-style window
  return {
    instanceId,
    callConversation,
    t,
    localVideoRef,
    remoteVideoRefs,
    screenShareVideoRefs,
    videoRefCallbacksRef,
    getVideoRefCallback,
    setLocalVideoRef,
    videoElementsVersion,
    applySinkIdToElement,
    selectedAudioOutputIdRef,
    speakerVolumeRef,
    focusedScreenShareId,
    setFocusedScreenShareId,
    expandedScreenShare,
    setExpandedScreenShare,
    contentProminentWhenSharing,
    setContentProminentWhenSharing,
    meeting,
    currentParticipant,
    globalMeetingId,
    effectiveLocalIsMuted,
    effectiveLocalIsVideoEnabled,
    effectiveLocalHandRaised,
    effectiveRemoteHandsRaised,
    effectiveHandRaisedOrder,
    isLocalUser,
    isParticipantHandRaised,
    getHandRaisedOrderNumber,
    currentPage,
    setCurrentPage,
    sidebarView,
    setSidebarView,
    unreadChatCount,
    activeReactions,
    showReactionAnimation,
    handleToggleParticipants,
    handleToggleChat,
    handleToggleAudioSettings,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    canSelectAudioOutput,
    stableRemotePeers,
    gridItems,
    paginatedGridItems,
    minTileSize,
    maxTileSize,
    responsiveConfig,
    gallerySize,
    setGallerySize,
    allScreenShares,
    focusedScreenShare,
    handleMuteParticipant,
    handleMuteAll,
    handleSpeakerDeviceChange,
    expandedScreenShareVideoRef,
    isOpen,
    firstRemotePeer,
    buildStreamFromPeer,
    effectiveLocalIsScreenSharing
  }
}

export type GroupCallModalRtkState = ReturnType<typeof useGroupCallModalRtkState>
