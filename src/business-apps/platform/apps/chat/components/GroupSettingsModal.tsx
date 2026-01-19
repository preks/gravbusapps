import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Button,
  Avatar,
  IconAvatar,
  Badge,
  Alert,
  AlertDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@newwork/nw-design-system'
import { UserIcon, MoreVertical, Crown, Trash2, Shield, UserMinus } from 'lucide-react'
import { UserSelector } from './UserSelector'
import { ChatApiClient } from '../services/chatApiClient'
import type { Conversation, User } from '../types'
import { useChatTranslation } from '../contexts/TranslationContext'

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
  const t = useChatTranslation()
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!conversation || conversation.type !== 'group') {
    return null
  }

  const currentParticipant = conversation.participants?.find(p => p.userId === currentUserId)
  const isOwner = currentParticipant?.role === 'owner'
  const canManageParticipants = isOwner || currentParticipant?.role === 'admin'
  const ownerCount = conversation.participants?.filter(p => p.role === 'owner').length || 0

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
    if (!window.confirm(t('chat-confirmRemoveMember'))) {
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage(null)
      await apiClient.removeParticipant(conversation.id, userId)
      onRefresh()
    } catch (err: any) {
      console.error('Error removing member:', err)
      setErrorMessage(err?.response?.data?.message || t('chat-errorRemovingMember'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleMakeOwner = async (userId: string) => {
    if (!apiClient || !isOwner) return

    try {
      setIsLoading(true)
      setErrorMessage(null)
      await apiClient.updateParticipantRole(conversation.id, userId, 'owner')
      onRefresh()
    } catch (err: any) {
      console.error('Error making owner:', err)
      setErrorMessage(err?.response?.data?.message || t('chat-errorMakingOwner'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleMakeAdmin = async (userId: string) => {
    if (!apiClient || !isOwner) return

    try {
      setIsLoading(true)
      setErrorMessage(null)
      await apiClient.updateParticipantRole(conversation.id, userId, 'admin')
      onRefresh()
    } catch (err: any) {
      console.error('Error making admin:', err)
      setErrorMessage(err?.response?.data?.message || t('chat-errorMakingAdmin'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveRole = async (userId: string) => {
    if (!apiClient || !isOwner) return

    try {
      setIsLoading(true)
      setErrorMessage(null)
      await apiClient.updateParticipantRole(conversation.id, userId, 'member')
      onRefresh()
    } catch (err: any) {
      console.error('Error removing role:', err)
      setErrorMessage(err?.response?.data?.message || t('chat-errorRemovingRole'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!apiClient || !isOwner) return

    try {
      setIsLoading(true)
      setErrorMessage(null)
      await apiClient.deleteConversation(conversation.id)
      setShowDeleteConfirm(false)
      onClose()
      onRefresh()
    } catch (err: any) {
      console.error('Error deleting group:', err)
      setErrorMessage(err?.response?.data?.message || t('chat-errorDeletingGroup'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsAddingMembers(false)
    setSelectedUserIds([])
    setErrorMessage(null)
    setShowDeleteConfirm(false)
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
            <div className="gba:text-sm gba:font-medium">{t('chat-groupName')}</div>
            <div className="gba:text-sm gba:text-muted-foreground">{conversation.name}</div>
          </div>

          {conversation.description && (
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">{t('chat-description')}</div>
              <div className="gba:text-sm gba:text-muted-foreground">{conversation.description}</div>
            </div>
          )}

          {/* Participants */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-sm gba:font-medium">
                {t('chat-participants')} ({conversation.participants?.length || 0})
              </div>
              {canManageParticipants && !isAddingMembers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingMembers(true)}
                  disabled={isLoading}
                  data-testid={`${prefixDataTestId}-add-members-btn`}
                >
                  {t('chat-addMembers')}
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
                    {t('chat-cancel')}
                  </Button>
                  <Button
                    onClick={handleAddMembers}
                    disabled={isLoading || selectedUserIds.length === 0}
                    data-testid={`${prefixDataTestId}-confirm-add`}
                  >
                    {t('chat-add')} ({selectedUserIds.length})
                  </Button>
                </div>
              </div>
            ) : (
              <div className="gba:max-h-64 gba:overflow-y-auto gba:border gba:border-border gba:rounded-md gba:divide-y">
                {conversation.participants?.map(participant => {
                  const isCurrentUser = participant.userId === currentUserId
                  const isParticipantOwner = participant.role === 'owner'
                  const isParticipantAdmin = participant.role === 'admin'
                  const canManageThisParticipant = isOwner && !isCurrentUser

                  return (
                    <div
                      key={participant.userId}
                      className="gba:flex gba:items-center gba:p-3 gba:gap-3"
                      data-testid={`${prefixDataTestId}-participant-${participant.userId}`}
                    >
                      {participant.user?.avatarUrl ? (
                        <Avatar className="gba:w-9 gba:h-9 gba:flex-shrink-0">
                          <img
                            src={participant.user.avatarUrl}
                            alt={getDisplayName(participant.user)}
                            className="gba:w-full gba:h-full gba:object-cover gba:rounded-full"
                          />
                        </Avatar>
                      ) : (
                        <IconAvatar
                          className="gba:w-9 gba:h-9 gba:flex-shrink-0"
                          label={getDisplayName(participant.user)}
                          icon={UserIcon}
                        />
                      )}
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:font-medium gba:truncate">
                          {getDisplayName(participant.user)}
                          {isCurrentUser && (
                            <span className="gba:text-muted-foreground gba:ml-2">({t('chat-you')})</span>
                          )}
                        </div>
                        {participant.user?.email && (
                          <div className="gba:text-sm gba:text-muted-foreground gba:truncate">
                            {participant.user.email}
                          </div>
                        )}
                      </div>
                      <Badge variant={getRoleBadgeVariant(participant.role)}>{participant.role || 'member'}</Badge>

                      {/* Role management dropdown for owners */}
                      {canManageThisParticipant && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="gba:h-8 gba:w-8"
                              disabled={isLoading}
                              data-testid={`${prefixDataTestId}-actions-${participant.userId}`}
                            >
                              <MoreVertical className="gba:h-4 gba:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isParticipantOwner && (
                              <DropdownMenuItem
                                onClick={() => handleMakeOwner(participant.userId)}
                                data-testid={`${prefixDataTestId}-make-owner-${participant.userId}`}
                              >
                                <Crown className="gba:h-4 gba:w-4 gba:mr-2" />
                                {t('chat-makeOwner')}
                              </DropdownMenuItem>
                            )}
                            {!isParticipantOwner && !isParticipantAdmin && (
                              <DropdownMenuItem
                                onClick={() => handleMakeAdmin(participant.userId)}
                                data-testid={`${prefixDataTestId}-make-admin-${participant.userId}`}
                              >
                                <Shield className="gba:h-4 gba:w-4 gba:mr-2" />
                                {t('chat-makeAdmin')}
                              </DropdownMenuItem>
                            )}
                            {(isParticipantAdmin || isParticipantOwner) && !isParticipantOwner && (
                              <DropdownMenuItem
                                onClick={() => handleRemoveRole(participant.userId)}
                                data-testid={`${prefixDataTestId}-remove-role-${participant.userId}`}
                              >
                                <UserMinus className="gba:h-4 gba:w-4 gba:mr-2" />
                                {t('chat-removeRole')}
                              </DropdownMenuItem>
                            )}
                            {!isParticipantOwner && (
                              <DropdownMenuItem
                                onClick={() => handleRemoveMember(participant.userId)}
                                className="gba:text-destructive"
                                data-testid={`${prefixDataTestId}-remove-${participant.userId}`}
                              >
                                <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
                                {t('chat-removeFromGroup')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <Alert variant="destructive" className="gba:mt-2">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Info about being last owner */}
        {isOwner && ownerCount === 1 && (
          <Alert className="gba:mt-2">
            <AlertDescription>{t('chat-lastOwnerInfo')}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gba:flex gba:justify-between gba:gap-2">
          {isOwner && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              data-testid={`${prefixDataTestId}-delete-group`}
            >
              <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('chat-deleteGroup')}
            </Button>
          )}
          <div className="gba:flex-1" />
          <Button variant="outline" onClick={handleClose} data-testid={`${prefixDataTestId}-close`}>
            {t('chat-close')}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat-deleteGroupTitle')}</DialogTitle>
            <DialogDescription>{t('chat-deleteGroupDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isLoading}>
              {t('common-cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={isLoading}>
              {t('chat-delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
