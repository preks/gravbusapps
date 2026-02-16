/**
 * Sidebar view, pagination, reactions, media devices and unread chat for GroupCallModalRtk.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useMediaDevices } from '../useMediaDevices'
import { rtkDebug } from '../../utils/rtkDebug'
import type { GroupCallModalRtkProps, SidebarView } from '../../components/call/groupCallModalTypes'

export function useGroupCallModalSidebarAndReactions(
  props: Pick<
    GroupCallModalRtkProps,
    'wsClient' | 'accessToken' | 'currentUserId' | 'callConversation' | 'activeConversation' | 'callState'
  >,
  callConversation: any,
  meeting: any,
  stableRemotePeers: any[]
) {
  const { wsClient, accessToken, currentUserId, callState } = props

  const [currentPage, setCurrentPage] = useState(0)
  const [sidebarView, setSidebarView] = useState<SidebarView>('closed')
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [activeReactions, setActiveReactions] = useState<
    Array<{ id: string; emoji: string; participantId: string; timestamp: number }>
  >([])

  const {
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
    refreshDevices
  } = useMediaDevices({ enabled: true })

  const isCallActive =
    callState?.status === 'connected' || callState?.status === 'joining' || callState?.status === 'reconnecting'
  useEffect(() => {
    if (isCallActive && callState) {
      void refreshDevices({ requestAudio: true, requestVideo: callState.callType === 'video' })
    }
  }, [isCallActive, callState?.callType, refreshDevices])

  const showReactionAnimation = useCallback((emoji: string, participantId: string) => {
    const reactionId = `${participantId}-${Date.now()}`
    rtkDebug.log('[RTK Modal] 🎨 showReactionAnimation called', { emoji, participantId, reactionId })
    setActiveReactions(prev => [...prev, { id: reactionId, emoji, participantId, timestamp: Date.now() }])
    setTimeout(() => {
      setActiveReactions(prev => prev.filter(r => r.id !== reactionId))
      rtkDebug.log('[RTK Modal] 🧹 Removed reaction after 3s', { reactionId })
    }, 3000)
  }, [])

  const handleToggleParticipants = useCallback(() => {
    setSidebarView((prev: SidebarView) => (prev === 'participants' ? 'closed' : 'participants'))
  }, [])

  const handleToggleChat = useCallback(() => {
    setSidebarView((prev: SidebarView) => {
      const newView = prev === 'chat' ? 'closed' : 'chat'
      if (newView === 'chat') setUnreadChatCount(0)
      return newView
    })
  }, [])

  const handleToggleAudioSettings = useCallback(() => {
    setSidebarView((prev: SidebarView) => (prev === 'audio-settings' ? 'closed' : 'audio-settings'))
  }, [])

  useEffect(() => {
    if (!wsClient || !callConversation || sidebarView === 'chat') return
    const handleNewMessage = (message: any) => {
      if (message.conversationId === callConversation.id && message.senderId !== currentUserId) {
        setUnreadChatCount(prev => prev + 1)
      }
    }
    wsClient.on('new_message', handleNewMessage)
    return () => wsClient.off('new_message', handleNewMessage)
  }, [wsClient, callConversation, sidebarView, currentUserId])

  const [screenWidth, setScreenWidth] = useState(globalThis.window.innerWidth)
  useEffect(() => {
    const handleResize = () => setScreenWidth(globalThis.window.innerWidth)
    globalThis.window.addEventListener('resize', handleResize)
    return () => globalThis.window.removeEventListener('resize', handleResize)
  }, [])

  const PARTICIPANTS_PER_PAGE = useMemo(() => {
    if (screenWidth < 768) return 4
    if (screenWidth < 1024) return 6
    return 9
  }, [screenWidth])

  useEffect(() => {
    rtkDebug.log('[RTK Modal] Reactions useEffect triggered', {
      hasWsClient: !!wsClient,
      hasSocket: !!wsClient?.getSocket()
    })

    let socket = wsClient?.getSocket()
    if (!socket && wsClient && accessToken) {
      try {
        wsClient.connect(accessToken)
        socket = wsClient.getSocket()
      } catch {
        // Best-effort only
      }
    }
    if (!socket) {
      rtkDebug.warn('[RTK Modal] ⚠️ No socket available for reactions')
      return
    }

    const handleReaction = (data: { participantId: string; participantName: string; emoji: string }) => {
      rtkDebug.log('[RTK Modal] 😊 Reaction received via WebSocket:', data)
      showReactionAnimation(data.emoji, data.participantId)
    }

    socket.on('group-call:reaction-received', handleReaction)
    rtkDebug.log('[RTK Modal] ✅ WebSocket listener attached for reactions')

    return () => {
      socket.off('group-call:reaction-received', handleReaction)
      rtkDebug.log('[RTK Modal] WebSocket listener removed for reactions')
    }
  }, [wsClient, accessToken, showReactionAnimation, stableRemotePeers, meeting])

  return {
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
    screenWidth
  }
}
