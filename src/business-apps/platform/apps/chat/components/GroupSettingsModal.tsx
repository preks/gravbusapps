import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Avatar,
  Badge
} from '@newwork/nw-design-system'
import { UserSelector } from './UserSelector'
import { ChatApiClient } from '../services/chatApiClient'
import type { Conversation, User } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface GroupSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  conversation: Conversation | null
  currentUserId: string | null
  apiClient: ChatApiClient | null
  onRefresh: () => void
  prefixDataTestId?: string
  accessToken?: string
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  apiClient,
  onRefresh,
  prefixDataTestId = 'group-settings-modal',
  accessToken
}) => {
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  if (!conversation || conversation.type !== 'group') {
    return null
  }

  const currentParticipant = conversation.participants?.find(p => p.userId === currentUserId)
  const canManageParticipants = currentParticipant?.role === 'owner' || currentParticipant?.role === 'admin'

  const getDisplayName = (user?: User) => {
    if (!user) return 'Unknown User'
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }
    return user.username
  }

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      case 'member':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const handleAddMembers = async () => {
    if (!apiClient || selectedUserIds.length === 0) return

    try {
      setIsLoading(true)
      // Add participants one by one
      for (const userId of selectedUserIds) {
        await apiClient.addParticipant(conversation.id, userId)
      }
      setSelectedUserIds([])
      setIsAddingMembers(false)
      onRefresh()
    } catch (err) {
      console.error('Error adding members:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!apiClient || !currentUserId) return

    // Confirm removal
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return
    }

    try {
      setIsLoading(true)
      await apiClient.removeParticipant(conversation.id, userId)
      onRefresh()
    } catch (err) {
      console.error('Error removing member:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsAddingMembers(false)
    setSelectedUserIds([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[80vh]" data-testid={prefixDataTestId}>
        <DialogHeader>
          <DialogTitle>{conversation.name || 'Group Settings'}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Group Info */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('chat.groupName', 'Group Name')}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">{conversation.name}</div>
          </div>

          {conversation.description && (
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('chat.description', 'Description')}
              </div>
              <div className="gba:text-sm gba:text-muted-foreground">{conversation.description}</div>
            </div>
          )}

          {/* Participants */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('chat.participants', 'Participants')} (
                {conversation.participants?.length || 0})
              </div>
              {canManageParticipants && !isAddingMembers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingMembers(true)}
                  disabled={isLoading}
                  data-testid={`${prefixDataTestId}-add-members-btn`}
                >
                  {getTranslationFromI18nKeyAndLabel('chat.addMembers', 'Add Members')}
                </Button>
              )}
            </div>

            {isAddingMembers ? (
              <div className="gba:space-y-4">
                <div className="gba:h-72">
                  <UserSelector
                    selectedUserIds={selectedUserIds}
                    onSelectionChange={setSelectedUserIds}
                    currentUserId={currentUserId}
                    prefixDataTestId={`${prefixDataTestId}-user-selector`}
                    accessToken={accessToken}
                  />
                </div>
                <div className="gba:flex gba:gap-2 gba:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingMembers(false)
                      setSelectedUserIds([])
                    }}
                    disabled={isLoading}
                    data-testid={`${prefixDataTestId}-cancel-add`}
                  >
                    {getTranslationFromI18nKeyAndLabel('chat.cancel', 'Cancel')}
                  </Button>
                  <Button
                    onClick={handleAddMembers}
                    disabled={isLoading || selectedUserIds.length === 0}
                    data-testid={`${prefixDataTestId}-confirm-add`}
                  >
                    {getTranslationFromI18nKeyAndLabel('chat.add', 'Add')} ({selectedUserIds.length})
                  </Button>
                </div>
              </div>
            ) : (
              <div className="gba:max-h-64 gba:overflow-y-auto gba:border gba:border-border gba:rounded-md gba:divide-y">
                {conversation.participants?.map(participant => (
                  <div
                    key={participant.userId}
                    className="gba:flex gba:items-center gba:p-3 gba:gap-3"
                    data-testid={`${prefixDataTestId}-participant-${participant.userId}`}
                  >
                    <Avatar
                      src={participant.user?.avatarUrl}
                      fallback={(participant.user?.username || 'U').charAt(0).toUpperCase()}
                    />
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:font-medium gba:truncate">
                        {getDisplayName(participant.user)}
                        {participant.userId === currentUserId && (
                          <span className="gba:text-muted-foreground gba:ml-2">
                            ({getTranslationFromI18nKeyAndLabel('chat.you', 'you')})
                          </span>
                        )}
                      </div>
                      {participant.user?.email && (
                        <div className="gba:text-sm gba:text-muted-foreground gba:truncate">
                          {participant.user.email}
                        </div>
                      )}
                    </div>
                    <Badge variant={getRoleBadgeVariant(participant.role)}>{participant.role || 'member'}</Badge>
                    {canManageParticipants && participant.userId !== currentUserId && participant.role !== 'owner' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(participant.userId)}
                        disabled={isLoading}
                        data-testid={`${prefixDataTestId}-remove-${participant.userId}`}
                      >
                        {getTranslationFromI18nKeyAndLabel('chat.remove', 'Remove')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid={`${prefixDataTestId}-close`}>
            {getTranslationFromI18nKeyAndLabel('chat.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
