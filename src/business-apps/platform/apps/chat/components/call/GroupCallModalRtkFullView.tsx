/**
 * Full-view dialog for Realtime Kit group call (Dialog + video area + sidebar + controls).
 * Used by GroupCallModalRtk when view is not minimized.
 */

import { createPortal } from 'react-dom'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { Monitor, Maximize2, ArrowLeftRight } from 'lucide-react'
import { CallHeader } from './CallHeader'
import { ScreenShareView } from './ScreenShareView'
import { CallControlsBar } from './CallControlsBar'
import { ParticipantsPanel } from './ParticipantsPanel'
import { ChatPanel } from './ChatPanel'
import { MemoizedParticipantVideoTile } from './ParticipantVideoTile'
import { VideoGrid } from './VideoGrid'
import { HorizontalFilmstrip } from './HorizontalFilmstrip'
import { AudioSettingsModal } from './AudioSettingsModal'
import type { GroupCallModalRtkProps } from './groupCallModalTypes'
import type { GroupCallModalRtkState } from '../../hooks/useGroupCallModalRtkState'

export interface GroupCallModalRtkFullViewProps {
  props: GroupCallModalRtkProps
  state: GroupCallModalRtkState
}

export function GroupCallModalRtkFullView({ props: p, state }: GroupCallModalRtkFullViewProps) {
  const {
    callState,
    availableParticipants,
    pendingInvites,
    onEndCall,
    onToggleMinimize,
    onInviteParticipant,
    activeSpeakerId,
    activeSpeakerHistory,
    onToggleMute,
    onToggleVideo,
    onToggleScreenShare,
    onToggleBackground,
    onToggleRnnoise,
    onRnnoiseModeChange,
    onToggleRaiseHand,
    onSendReaction,
    onMicDeviceChange,
    onCameraDeviceChange,
    prefixDataTestId = 'rtk-group-call',
    conversationName,
    rnnoiseEnabled,
    rnnoiseMode = 'aggressive',
    wsClient,
    transcriptionEnabled,
    apiClient,
    accessToken,
    currentUserId,
    currentUser,
    callConversation: callConversationProp,
    activeConversation,
    activeExperts,
    hideReactionsAndHandRaise = false
  } = p

  const width = globalThis.window.innerWidth
  let dialogMaxWidth: string
  if (width >= 1280) dialogMaxWidth = '1800px'
  else if (width >= 1024) dialogMaxWidth = '1600px'
  else dialogMaxWidth = '90vw'

  return createPortal(
    <div key="full-call-dialog" data-view-mode="full">
      <Dialog modal={false} open={state.isOpen} onOpenChange={() => {}}>
        <DialogContent
          className="gba:h-[85vh] gba:p-0 gba:overflow-hidden gba:flex gba:flex-col gba:gap-0"
          style={{
            width: '90vw',
            maxWidth: dialogMaxWidth
          }}
          data-testid={`${prefixDataTestId}-modal`}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
        >
          <style>{`
          [data-testid="${prefixDataTestId}-modal"] > button[data-radix-collection-item] {
            display: none !important;
          }
          [data-testid="${prefixDataTestId}-modal"] > button {
            display: none !important;
          }
        `}</style>
          <DialogTitle className="gba:sr-only">
            {conversationName || state.t('chat-groupCall') || 'Group Call'}
          </DialogTitle>
          <DialogDescription className="gba:sr-only">
            {callState.callType === 'video' ? state.t('chat-videoCall') : state.t('chat-audioCall')} with{' '}
            {state.stableRemotePeers.length + 1}{' '}
            {state.stableRemotePeers.length + 1 === 1 ? 'participant' : 'participants'}
          </DialogDescription>

          {/* Row 1: Compact Header */}
          <div className="gba:bg-background gba:border-b gba:flex-shrink-0">
            <CallHeader
              conversationName={conversationName}
              conversationType={callState.conversationType}
              callStartTime={callState.startTime}
              participantCount={state.stableRemotePeers.length + 1}
              availableParticipantsCount={availableParticipants?.length || 0}
              callType={callState.callType}
              showParticipantsPanel={state.sidebarView === 'participants'}
              showChatPanel={state.sidebarView === 'chat'}
              unreadChatCount={state.unreadChatCount}
              onToggleParticipantsPanel={state.handleToggleParticipants}
              onToggleChat={state.handleToggleChat}
              onToggleMinimize={onToggleMinimize}
              onClose={onEndCall}
              showLargeGalleryControl={state.stableRemotePeers.length + 1 > 10}
              gallerySize={state.gallerySize}
              onToggleGallerySize={() => state.setGallerySize(prev => (prev === 'default' ? 'large' : 'default'))}
              prefixDataTestId={prefixDataTestId}
              t={state.t}
            />
            {transcriptionEnabled && (
              <Alert
                variant="info-secondary"
                className="gba:rounded-none gba:py-2 gba:px-4"
                data-testid={`${prefixDataTestId}-recording-transcript-banner`}
              >
                <AlertDescription className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                  <span
                    className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse gba:flex-shrink-0"
                    aria-hidden
                  />
                  {state.t('chat-call-recordingTranscriptActive')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Row 2: Video Area + Sidebar (Grid Layout) */}
          <div
            className="gba:flex-1 gba:grid gba:min-h-0 gba:overflow-hidden gba:bg-muted/30"
            style={{
              gridTemplateColumns:
                state.sidebarView === 'closed' ? '1fr' : `1fr ${state.responsiveConfig.sidebarWidth}px`
            }}
          >
            {/* Video Area */}
            <div className="gba:flex gba:flex-col gba:gap-4 gba:p-4 gba:min-h-0 gba:overflow-hidden">
              {state.focusedScreenShare ? (
                <>
                  <div
                    className={`gba:min-h-0 gba:rounded-lg gba:overflow-hidden gba:bg-black gba:relative ${
                      state.contentProminentWhenSharing ? 'gba:flex-[3]' : 'gba:flex-[1]'
                    }`}
                  >
                    <video
                      ref={el => {
                        if (el && state.focusedScreenShare) {
                          state.screenShareVideoRefs.current.set(state.focusedScreenShare.peerId, el)
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="gba:w-full gba:h-full gba:object-contain"
                      data-testid={`${prefixDataTestId}-focused-screen-share`}
                    />
                    <div className="gba:absolute gba:bottom-3 gba:left-3 gba:px-3 gba:py-1 gba:bg-black/70 gba:rounded-md gba:text-white gba:text-sm">
                      {state.focusedScreenShare.peerName}'s screen
                    </div>
                    <button
                      onClick={() => state.setContentProminentWhenSharing(prev => !prev)}
                      className="gba:absolute gba:top-3 gba:right-28 gba:p-2 gba:bg-black/70 hover:gba:bg-black/90 gba:rounded-md gba:text-white gba:transition-colors"
                      data-testid={`${prefixDataTestId}-swap-content-people-btn`}
                      aria-label={state.t('groupCall-swapLayout') || 'Swap layout'}
                      title={state.t('groupCall-swapLayout') || 'Swap layout'}
                    >
                      <ArrowLeftRight className="gba:w-5 gba:h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (state.focusedScreenShare.screenShareTrack) {
                          const stream = new MediaStream([state.focusedScreenShare.screenShareTrack])
                          state.setExpandedScreenShare({
                            peerId: state.focusedScreenShare.peerId,
                            peerName: state.focusedScreenShare.peerName,
                            stream
                          })
                        }
                      }}
                      className="gba:absolute gba:top-3 gba:right-16 gba:p-2 gba:bg-black/70 hover:gba:bg-black/90 gba:rounded-md gba:text-white gba:transition-colors"
                      data-testid={`${prefixDataTestId}-expand-screen-share-btn`}
                      aria-label={state.t('groupCall-expandScreenShare') || 'Expand to fullscreen'}
                    >
                      <Maximize2 className="gba:w-5 gba:h-5" />
                    </button>
                    <button
                      onClick={() => state.setFocusedScreenShareId(null)}
                      className="gba:absolute gba:top-3 gba:right-3 gba:p-2 gba:bg-black/70 hover:gba:bg-black/90 gba:rounded-md gba:text-white gba:transition-colors"
                      data-testid={`${prefixDataTestId}-exit-screen-share-focus-btn`}
                      aria-label={state.t('groupCall-exitScreenShareFocus') || 'Exit screen share focus'}
                    >
                      <Monitor className="gba:w-5 gba:h-5" />
                    </button>
                  </div>
                  <div
                    className={`gba:min-h-0 gba:border-t gba:border-border ${
                      state.contentProminentWhenSharing ? 'gba:flex-[1]' : 'gba:flex-[3]'
                    }`}
                  >
                    {state.contentProminentWhenSharing ? (
                      <HorizontalFilmstrip
                        participants={
                          state.gridItems
                            .filter(
                              item =>
                                item.type === 'video' ||
                                item.type === 'avatar' ||
                                (item.type === 'screen-share' && !item.isFocusedScreenShare)
                            )
                            .map(item => ({
                              id: item.id,
                              peerId: item.peerId,
                              peerName: item.peerName,
                              avatarUrl: item.avatarUrl,
                              userId: item.userId,
                              customParticipantId: item.customParticipantId,
                              isLocal: item.isLocal,
                              isMuted: item.isMuted,
                              hasVideoTrack: item.hasVideoTrack || false,
                              hasAudioTrack: item.hasAudioTrack || false,
                              type: item.type,
                              screenShareTrack: item.screenShareTrack,
                              isHandRaised: hideReactionsAndHandRaise
                                ? false
                                : state.isParticipantHandRaised(item.peerId, item.userId, item.customParticipantId),
                              handRaisedOrderNumber: hideReactionsAndHandRaise
                                ? undefined
                                : state.getHandRaisedOrderNumber(item.peerId, item.userId, item.customParticipantId),
                              isActiveSpeaker: item.isActiveSpeaker
                            })) as any
                        }
                        videoRefCallback={(peerId: string, isLocal: boolean) =>
                          state.getVideoRefCallback(peerId, '', isLocal)
                        }
                        screenShareVideoRefCallback={(peerId: string) => (el: HTMLVideoElement | null) => {
                          if (el) {
                            state.screenShareVideoRefs.current.set(peerId, el)
                          } else {
                            state.screenShareVideoRefs.current.delete(peerId)
                          }
                        }}
                        onScreenShareClick={(peerId: string) => {
                          state.setFocusedScreenShareId(peerId)
                        }}
                        activeSpeakerId={activeSpeakerId}
                        reactions={hideReactionsAndHandRaise ? [] : state.activeReactions}
                        t={state.t}
                        prefixDataTestId={`${prefixDataTestId}-filmstrip`}
                        isMinimized={callState.isMinimized}
                      />
                    ) : (
                      (() => {
                        const peopleOnlyItems = state.gridItems.filter(
                          item =>
                            item.type === 'video' ||
                            item.type === 'avatar' ||
                            (item.type === 'screen-share' && !item.isFocusedScreenShare)
                        )
                        const perPage =
                          state.paginatedGridItems.totalPages > 0
                            ? Math.ceil(state.paginatedGridItems.totalItems / state.paginatedGridItems.totalPages)
                            : 12
                        const peopleTotalPages = Math.ceil(peopleOnlyItems.length / perPage) || 1
                        const effectivePage = Math.min(state.currentPage, Math.max(0, peopleTotalPages - 1))
                        const peoplePageItems = peopleOnlyItems.slice(
                          effectivePage * perPage,
                          (effectivePage + 1) * perPage
                        )
                        return (
                          <VideoGrid
                            mode="auto-fit"
                            minTileSize={state.minTileSize}
                            gridItems={peoplePageItems.map(item => {
                              const hasVideoOrShare = item.hasVideoTrack || !!item.screenShareTrack
                              const tileBg = hasVideoOrShare ? 'gba:bg-black' : 'gba:bg-muted'
                              const tile = (
                                <MemoizedParticipantVideoTile
                                  peerId={item.peerId}
                                  peerName={item.peerName}
                                  avatarUrl={item.avatarUrl}
                                  userId={item.userId}
                                  customParticipantId={item.customParticipantId}
                                  isLocal={item.isLocal}
                                  isMuted={item.isMuted}
                                  hasVideoTrack={item.hasVideoTrack || false}
                                  hasAudioTrack={item.hasAudioTrack || false}
                                  screenShareTrack={item.screenShareTrack}
                                  isFocusedScreenShare={false}
                                  totalScreenShares={state.allScreenShares.length}
                                  isHandRaised={
                                    hideReactionsAndHandRaise
                                      ? false
                                      : state.isParticipantHandRaised(
                                          item.peerId,
                                          item.userId,
                                          item.customParticipantId
                                        )
                                  }
                                  handRaisedOrderNumber={
                                    hideReactionsAndHandRaise
                                      ? undefined
                                      : state.getHandRaisedOrderNumber(
                                          item.peerId,
                                          item.userId,
                                          item.customParticipantId
                                        )
                                  }
                                  isActiveSpeaker={item.isActiveSpeaker}
                                  reactions={hideReactionsAndHandRaise ? [] : state.activeReactions}
                                  isMinimized={callState.isMinimized}
                                  onScreenShareClick={() => {
                                    if (item.screenShareTrack) {
                                      state.setFocusedScreenShareId(item.peerId)
                                    }
                                  }}
                                  onScreenShareFocus={() => {
                                    state.setFocusedScreenShareId(item.peerId)
                                  }}
                                  videoRef={state.getVideoRefCallback(item.peerId, item.peerName, item.isLocal)}
                                  screenShareVideoRef={
                                    item.screenShareTrack
                                      ? el => {
                                          if (el) {
                                            state.screenShareVideoRefs.current.set(item.peerId, el)
                                          } else {
                                            state.screenShareVideoRefs.current.delete(item.peerId)
                                          }
                                        }
                                      : undefined
                                  }
                                  prefixDataTestId={prefixDataTestId}
                                  t={state.t}
                                />
                              )
                              return (
                                <div
                                  key={item.id}
                                  className={`gba:w-full gba:min-w-0 gba:aspect-video gba:rounded-lg gba:overflow-hidden ${tileBg}`}
                                  data-testid={`${prefixDataTestId}-grid-item-${item.id}`}
                                >
                                  {tile}
                                </div>
                              )
                            })}
                            currentPage={effectivePage}
                            totalPages={peopleTotalPages}
                            totalItems={peopleOnlyItems.length}
                            onPageChange={state.setCurrentPage}
                            isEmpty={peopleOnlyItems.length === 0}
                            prefixDataTestId={prefixDataTestId}
                            t={state.t}
                          />
                        )
                      })()
                    )}
                  </div>
                </>
              ) : (
                <VideoGrid
                  mode="auto-fit"
                  minTileSize={state.minTileSize}
                  gridItems={state.paginatedGridItems.items.map(item => {
                    const hasVideoOrShare = item.hasVideoTrack || !!item.screenShareTrack
                    const tileBg = hasVideoOrShare ? 'gba:bg-black' : 'gba:bg-muted'
                    const tile = (
                      <MemoizedParticipantVideoTile
                        peerId={item.peerId}
                        peerName={item.peerName}
                        avatarUrl={item.avatarUrl}
                        userId={item.userId}
                        customParticipantId={item.customParticipantId}
                        isLocal={item.isLocal}
                        isMuted={item.isMuted}
                        hasVideoTrack={item.hasVideoTrack || false}
                        hasAudioTrack={item.hasAudioTrack || false}
                        screenShareTrack={item.screenShareTrack}
                        isFocusedScreenShare={false}
                        totalScreenShares={state.allScreenShares.length}
                        isHandRaised={
                          hideReactionsAndHandRaise
                            ? false
                            : state.isParticipantHandRaised(item.peerId, item.userId, item.customParticipantId)
                        }
                        handRaisedOrderNumber={
                          hideReactionsAndHandRaise
                            ? undefined
                            : state.getHandRaisedOrderNumber(item.peerId, item.userId, item.customParticipantId)
                        }
                        isActiveSpeaker={item.isActiveSpeaker}
                        reactions={hideReactionsAndHandRaise ? [] : state.activeReactions}
                        isMinimized={callState.isMinimized}
                        onScreenShareClick={() => {
                          if (item.screenShareTrack) {
                            state.setFocusedScreenShareId(item.peerId)
                          }
                        }}
                        onScreenShareFocus={() => {
                          state.setFocusedScreenShareId(item.peerId)
                        }}
                        videoRef={state.getVideoRefCallback(item.peerId, item.peerName, item.isLocal)}
                        screenShareVideoRef={
                          item.screenShareTrack
                            ? el => {
                                if (el) {
                                  state.screenShareVideoRefs.current.set(item.peerId, el)
                                } else {
                                  state.screenShareVideoRefs.current.delete(item.peerId)
                                }
                              }
                            : undefined
                        }
                        prefixDataTestId={prefixDataTestId}
                        t={state.t}
                      />
                    )
                    return (
                      <div
                        key={item.id}
                        className={`gba:w-full gba:min-w-0 gba:aspect-video gba:rounded-lg gba:overflow-hidden ${tileBg}`}
                        data-testid={`${prefixDataTestId}-grid-item-${item.id}`}
                      >
                        {tile}
                      </div>
                    )
                  })}
                  currentPage={state.currentPage}
                  totalPages={state.paginatedGridItems.totalPages}
                  totalItems={state.paginatedGridItems.totalItems}
                  onPageChange={state.setCurrentPage}
                  isEmpty={state.gridItems.length === 0}
                  prefixDataTestId={prefixDataTestId}
                  t={state.t}
                />
              )}
            </div>

            {state.sidebarView !== 'closed' && (
              <div className="gba:bg-card gba:flex gba:flex-col gba:border-l gba:min-h-0 gba:overflow-hidden">
                {state.sidebarView === 'participants' && (
                  <ParticipantsPanel
                    meeting={state.meeting}
                    isOpen={true}
                    prefixDataTestId={prefixDataTestId}
                    availableParticipants={availableParticipants}
                    pendingInvites={pendingInvites}
                    onInviteParticipant={onInviteParticipant}
                    onMuteParticipant={state.handleMuteParticipant}
                    onMuteAll={state.handleMuteAll}
                    activeSpeakerId={activeSpeakerId}
                    activeSpeakerHistory={activeSpeakerHistory}
                    remoteHandsRaised={hideReactionsAndHandRaise ? {} : state.effectiveRemoteHandsRaised}
                    handRaisedOrder={hideReactionsAndHandRaise ? {} : state.effectiveHandRaisedOrder}
                    localHandRaised={hideReactionsAndHandRaise ? false : state.effectiveLocalHandRaised}
                    localUserId={state.meeting?.self?.userId}
                    activeConversation={callConversationProp || activeConversation}
                    t={state.t}
                    accessToken={accessToken}
                  />
                )}
                {state.sidebarView === 'chat' && apiClient && accessToken && (
                  <ChatPanel
                    conversation={state.callConversation}
                    apiClient={apiClient}
                    wsClient={wsClient || null}
                    currentUserId={currentUserId || null}
                    currentUser={currentUser}
                    accessToken={accessToken || ''}
                    activeExperts={activeExperts}
                    isOpen={true}
                    onClose={() => state.setSidebarView('closed')}
                    prefixDataTestId={`${prefixDataTestId}-chat`}
                  />
                )}
                {state.sidebarView === 'audio-settings' && (
                  <AudioSettingsModal
                    audioInputDevices={state.audioInputDevices}
                    audioOutputDevices={state.audioOutputDevices}
                    selectedAudioInputId={state.selectedAudioInputId}
                    selectedAudioOutputId={state.selectedAudioOutputId}
                    onAudioInputChange={deviceId => {
                      state.setSelectedAudioInputId(deviceId)
                      if (onMicDeviceChange) {
                        void onMicDeviceChange(deviceId)
                      }
                    }}
                    onAudioOutputChange={deviceId => {
                      state.setSelectedAudioOutputId(deviceId)
                    }}
                    canSelectAudioOutput={state.canSelectAudioOutput}
                    rnnoiseEnabled={rnnoiseEnabled}
                    rnnoiseMode={rnnoiseMode}
                    onToggleRnnoise={onToggleRnnoise}
                    onRnnoiseModeChange={onRnnoiseModeChange}
                    onClose={() => state.setSidebarView('closed')}
                    prefixDataTestId={`${prefixDataTestId}-audio-settings`}
                    t={state.t}
                  />
                )}
              </div>
            )}
          </div>

          <div className="gba:bg-background gba:border-t gba:flex-shrink-0">
            <CallControlsBar
              callType={callState.callType}
              isMuted={state.effectiveLocalIsMuted}
              isVideoEnabled={state.effectiveLocalIsVideoEnabled}
              isScreenSharing={state.effectiveLocalIsScreenSharing}
              backgroundEnabled={callState.backgroundEnabled}
              handRaised={hideReactionsAndHandRaise ? false : state.effectiveLocalHandRaised}
              transcriptionActive={transcriptionEnabled}
              onToggleMute={onToggleMute}
              onToggleVideo={onToggleVideo}
              onToggleScreenShare={onToggleScreenShare}
              onToggleBackground={onToggleBackground}
              onToggleRaiseHand={hideReactionsAndHandRaise ? undefined : onToggleRaiseHand}
              onSendReaction={hideReactionsAndHandRaise ? undefined : onSendReaction}
              onMicDeviceChange={
                onMicDeviceChange
                  ? deviceId => {
                      void onMicDeviceChange(deviceId)
                    }
                  : undefined
              }
              onCameraDeviceChange={
                onCameraDeviceChange
                  ? deviceId => {
                      void onCameraDeviceChange(deviceId)
                    }
                  : undefined
              }
              onSpeakerDeviceChange={state.handleSpeakerDeviceChange}
              onToggleAudioSettings={state.handleToggleAudioSettings}
              sharedDeviceState={{
                audioInputDevices: state.audioInputDevices,
                audioOutputDevices: state.audioOutputDevices,
                videoInputDevices: state.videoInputDevices,
                selectedAudioInputId: state.selectedAudioInputId,
                selectedAudioOutputId: state.selectedAudioOutputId,
                selectedVideoInputId: state.selectedVideoInputId,
                setSelectedAudioInputId: (id: string | null) => {
                  if (id !== null) state.setSelectedAudioInputId(id)
                },
                setSelectedAudioOutputId: (id: string | null) => {
                  if (id !== null) state.setSelectedAudioOutputId(id)
                },
                setSelectedVideoInputId: (id: string | null) => {
                  if (id !== null) state.setSelectedVideoInputId(id)
                },
                canSelectAudioOutput: state.canSelectAudioOutput
              }}
              onEndCall={onEndCall}
              prefixDataTestId={prefixDataTestId}
              t={state.t}
            />
          </div>

          {state.expandedScreenShare && (
            <ScreenShareView
              peerId={state.expandedScreenShare.peerId}
              peerName={state.expandedScreenShare.peerName}
              stream={state.expandedScreenShare.stream}
              onClose={() => state.setExpandedScreenShare(null)}
              prefixDataTestId={prefixDataTestId}
              t={state.t}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>,
    document.body
  )
}
