/**
 * All chat modals and overlays: CreateGroup, GroupSettings, ExpertSelector,
 * IncomingGroupCall, RejoinCall, PreCallSetupStateSync.
 */

import { CreateGroupModal } from './CreateGroupModal'
import { GroupSettingsModal } from './GroupSettingsModal'
import { ExpertSelectorPanel } from './ExpertSelectorPanel.tsx'
import { IncomingGroupCallDialog } from './IncomingGroupCallDialog'
import { RejoinCallDialog } from './RejoinCallDialog'
import { PreCallSetupStateSync } from './PreCallSetupStateSync'
import type { ChatApiClient } from '../services/chatApiClient'
import type { Conversation } from '../types'
import type { ExpertInfo } from '../hooks/useChatMessageHandlers'
import type { RejoinModalState } from '../hooks/useChatRejoinCall'
import type { CallParticipant } from '../services/webrtcClient'
import type { GroupCallUIState, UseGroupCallReturn } from '../services/callTypes'

export interface ChatModalsProps {
  prefixDataTestId: string
  accessToken: string | undefined
  apiClient: ChatApiClient | null
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
  onAcceptGroupInvite: () => void
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
}: ChatModalsProps) {
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
      {incomingGroupCallInvite && (
        <IncomingGroupCallDialog
          invite={incomingGroupCallInvite as never}
          userName={currentUserAsParticipant?.odName}
          userAvatarUrl={currentUserAsParticipant?.avatarUrl}
          onAccept={onAcceptGroupInvite}
          onDecline={onDeclineGroupInvite}
          prefixDataTestId={`${prefixDataTestId}-incoming-group-call`}
        />
      )}
      <RejoinCallDialog
        isOpen={!!rejoinModalState}
        callType={rejoinModalState?.callType || 'video'}
        conversationName={rejoinModalState?.conversationName}
        participantCount={rejoinModalState?.participantCount}
        userName={currentUserAsParticipant?.odName}
        userAvatarUrl={currentUserAsParticipant?.avatarUrl}
        onJoin={onRejoinWithPreferences}
        onCancel={onRejoinCancel}
        prefixDataTestId={`${prefixDataTestId}-rejoin-call`}
      />
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
