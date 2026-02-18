/**
 * Sidebar view, pagination, reactions, media devices and unread chat for GroupCallModalRtk.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useMediaDevices } from '../useMediaDevices'
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
    setActiveReactions(prev => [...prev, { id: reactionId, emoji, participantId, timestamp: Date.now() }])
    setTimeout(() => {
      setActiveReactions(prev => prev.filter(r => r.id !== reactionId))
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

  const [gallerySize, setGallerySize] = useState<'default' | 'large'>('default')

  const baseParticipantsPerPage = useMemo(() => {
    if (screenWidth < 768) return 4
    if (screenWidth < 1024) return 6
    return 9
  }, [screenWidth])

  const PARTICIPANTS_PER_PAGE = useMemo(() => {
    if (gallerySize === 'large') {
      if (screenWidth < 768) return 9
      if (screenWidth < 1024) return 16
      return 25
    }
    return baseParticipantsPerPage
  }, [gallerySize, screenWidth, baseParticipantsPerPage])

  useEffect(() => {
    let socket = wsClient?.getSocket()
    if (!socket && wsClient && accessToken) {
      try {
        wsClient.connect(accessToken)
        socket = wsClient.getSocket()
      } catch {
        // Best-effort only
      }
    }
    if (!socket) return

    const handleReaction = (data: { participantId: string; participantName: string; emoji: string }) => {
      showReactionAnimation(data.emoji, data.participantId)
    }

    socket.on('group-call:reaction-received', handleReaction)
    return () => {
      socket.off('group-call:reaction-received', handleReaction)
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
    screenWidth,
    gallerySize,
    setGallerySize
  }
}
