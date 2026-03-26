/**
 * All chat modals and overlays: CreateGroup, GroupSettings, ExpertSelector,
 * IncomingGroupCall (invite + rejoin), PreCallSetupStateSync.
 */

import { CreateGroupModal } from './CreateGroupModal'
import { GroupSettingsModal } from './GroupSettingsModal'
import { ExpertSelectorPanel } from './ExpertSelectorPanel.tsx'
import { IncomingGroupCallDialog } from './IncomingGroupCallDialog'
import { PreCallSetupStateSync } from './PreCallSetupStateSync'
import type { ChatClient } from '@/common/network/chat/ChatClient'
import { ConversationType, type Conversation } from '../types'
import type { ExpertInfo } from '../hooks/useChatMessageHandlers'
import type { RejoinModalState } from '../hooks/useChatRejoinCall'
import type { CallParticipant } from '../services/webrtcClient'
import type { GroupCallUIState, GroupCallInvite, UseGroupCallReturn } from '../services/callTypes'

export interface ChatModalsProps {
  prefixDataTestId: string
  accessToken: string | undefined
  apiClient: ChatClient | null
  currentUserId: string | null
  currentUser: { id: string; username?: string } | null
  activeConversation: Conversation | null
  showCreateGroupModal: boolean
  onCloseCreateGroupModal: () => void
  onCreateGroup: (
    name: string,
    participantIds: string[],
    description?: string,
    dimensionContext?: unknown
  ) => Promise<void>
  showGroupSettingsModal: boolean
  onCloseGroupSettingsModal: () => void
  onRefreshConversations: () => void
  showExpertSelector: boolean
  onCloseExpertSelector: () => void
  availableExperts: unknown[]
  expertsLoading: boolean
  activeExperts: ExpertInfo[]
  onAddExpert: (
    expert: unknown,
    sendMessageVoid: (
      conversationId: string,
      content: string,
      metadata?: Record<string, unknown>
    ) => void | Promise<void>
  ) => void
  sendMessageVoid: (conversationId: string, content: string, metadata?: Record<string, unknown>) => void | Promise<void>
  incomingGroupCallInvite: unknown
  currentUserAsParticipant: CallParticipant | null
  onAcceptGroupInvite: (preferences?: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled?: boolean
    audioInputDeviceId?: string | null
    videoInputDeviceId?: string | null
  }) => void
  onDeclineGroupInvite: () => void
  rejoinModalState: RejoinModalState
  onRejoinWithPreferences: (preferences: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled: boolean
  }) => void
  onRejoinCancel: () => void
  groupCallState: GroupCallUIState
  realtimeKitGroupCall: UseGroupCallReturn
  groupParticipants: unknown[]
}

export function ChatModals({
  prefixDataTestId,
  accessToken,
  apiClient,
  currentUserId,
  currentUser,
  activeConversation,
  showCreateGroupModal,
  onCloseCreateGroupModal,
  onCreateGroup,
  showGroupSettingsModal,
  onCloseGroupSettingsModal,
  onRefreshConversations,
  showExpertSelector,
  onCloseExpertSelector,
  availableExperts,
  expertsLoading,
  activeExperts,
  onAddExpert,
  sendMessageVoid,
  incomingGroupCallInvite,
  currentUserAsParticipant,
  onAcceptGroupInvite,
  onDeclineGroupInvite,
  rejoinModalState,
  onRejoinWithPreferences,
  onRejoinCancel,
  groupCallState,
  realtimeKitGroupCall,
  groupParticipants
}: Readonly<ChatModalsProps>) {
  return (
    <>
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={onCloseCreateGroupModal}
        onCreateGroup={onCreateGroup}
        apiClient={apiClient}
        currentUserId={currentUserId}
        prefixDataTestId={`${prefixDataTestId}-create-group-modal`}
        accessToken={accessToken}
      />
      <GroupSettingsModal
        isOpen={showGroupSettingsModal}
        onClose={onCloseGroupSettingsModal}
        conversation={activeConversation}
        currentUserId={currentUserId}
        accessToken={accessToken}
        apiClient={apiClient}
        onRefresh={onRefreshConversations}
        prefixDataTestId={`${prefixDataTestId}-group-settings-modal`}
      />
      <ExpertSelectorPanel
        isOpen={showExpertSelector}
        onClose={onCloseExpertSelector}
        experts={availableExperts as never[]}
        activeExpertIds={activeExperts.map(e => e.expertId)}
        isLoading={expertsLoading}
        onAddExpert={expert => onAddExpert(expert, sendMessageVoid)}
        data-testid={`${prefixDataTestId}-expert-selector`}
      />
      {(incomingGroupCallInvite || rejoinModalState) && (
        <IncomingGroupCallDialog
          invite={
            (incomingGroupCallInvite as GroupCallInvite) ??
            (() => {
              const isMeetingConversation =
                activeConversation?.metadata?.type === 'meeting' || Boolean(activeConversation?.metadata?.meetingId)
              let convType: 'direct' | 'group' | 'meeting'
              if (isMeetingConversation) convType = 'meeting'
              else if (activeConversation?.type === ConversationType.DIRECT) convType = 'direct'
              else convType = 'group'
              const meetingName = rejoinModalState!.conversationName ?? activeConversation?.name
              const startedBy = rejoinModalState!.startedBy
              let defaultOdName: string
              if (convType === 'direct') defaultOdName = 'Call'
              else if (convType === 'meeting') defaultOdName = 'Meeting'
              else defaultOdName = 'Group call'
              return {
                roomId: rejoinModalState!.roomId,
                callType: rejoinModalState!.callType,
                from: startedBy
                  ? { id: startedBy.id, odId: startedBy.odId, odName: startedBy.odName, avatarUrl: startedBy.avatarUrl }
                  : {
                      id: 'rejoin',
                      odId: 'rejoin',
                      odName: meetingName ?? defaultOdName
                    },
                conversationName: meetingName,
                conversationId: activeConversation?.id ?? rejoinModalState!.roomId,
                conversationType: convType,
                transcriptionEnabled: rejoinModalState!.transcriptionEnabled === true
              } as GroupCallInvite
            })()
          }
          userName={currentUserAsParticipant?.odName}
          userAvatarUrl={currentUserAsParticipant?.avatarUrl}
          onAccept={
            incomingGroupCallInvite
              ? (onAcceptGroupInvite as (preferences: {
                  micEnabled: boolean
                  cameraEnabled: boolean
                  backgroundEnabled: boolean
                  audioInputDeviceId?: string | null
                  videoInputDeviceId?: string | null
                }) => void)
              : onRejoinWithPreferences
          }
          onDecline={incomingGroupCallInvite ? onDeclineGroupInvite : onRejoinCancel}
          playRingtone={!!incomingGroupCallInvite && realtimeKitGroupCall.isRingingLeader === true}
          prefixDataTestId={`${prefixDataTestId}-incoming-group-call`}
        />
      )}
      <PreCallSetupStateSync
        groupCallState={groupCallState}
        realtimeKitGroupCall={realtimeKitGroupCall}
        activeConversation={activeConversation}
        currentUser={currentUser}
        currentUserAsParticipant={currentUserAsParticipant}
        groupParticipants={groupParticipants}
        incomingGroupCallInvite={incomingGroupCallInvite}
      />
    </>
  )
}
