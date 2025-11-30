import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label
} from '@newwork/nw-design-system'
import { UserSelector } from './UserSelector'
import { ChatApiClient } from '../services/chatApiClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (name: string, participantIds: string[], description?: string) => Promise<void>
  apiClient: ChatApiClient | null
  currentUserId: string | null
  prefixDataTestId?: string
  accessToken?: string
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  currentUserId,
  prefixDataTestId = 'create-group-modal',
  accessToken
}) => {
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (!isCreating) {
      setGroupName('')
      setDescription('')
      setSelectedUserIds([])
      setError(null)
      onClose()
    }
  }

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError(getTranslationFromI18nKeyAndLabel('chat.groupNameRequired', 'Group name is required'))
      return
    }

    if (selectedUserIds.length === 0) {
      setError(getTranslationFromI18nKeyAndLabel('chat.selectAtLeastOneUser', 'Please select at least one participant'))
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      await onCreateGroup(groupName.trim(), selectedUserIds, description.trim() || undefined)
      handleClose()
    } catch (err) {
      console.error('Error creating group:', err)
      setError(
        getTranslationFromI18nKeyAndLabel('chat.groupCreationFailed', 'Failed to create group. Please try again.')
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[80vh]" data-testid={prefixDataTestId}>
        <DialogHeader>
          <DialogTitle>{getTranslationFromI18nKeyAndLabel('chat.createGroup', 'Create Group Chat')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Group Name */}
          <div className="gba:space-y-2">
            <Label htmlFor="group-name">
              {getTranslationFromI18nKeyAndLabel('chat.groupName', 'Group Name')}
              <span className="gba:text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              placeholder={getTranslationFromI18nKeyAndLabel('chat.groupNamePlaceholder', 'Enter group name...')}
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              disabled={isCreating}
              data-testid={`${prefixDataTestId}-name-input`}
            />
          </div>

          {/* Description (optional) */}
          <div className="gba:space-y-2">
            <Label htmlFor="group-description">
              {getTranslationFromI18nKeyAndLabel('chat.groupDescription', 'Description')}
              <span className="gba:text-muted-foreground gba:ml-1">
                ({getTranslationFromI18nKeyAndLabel('chat.optional', 'optional')})
              </span>
            </Label>
            <Input
              id="group-description"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'chat.groupDescriptionPlaceholder',
                'Enter description...'
              )}
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isCreating}
              data-testid={`${prefixDataTestId}-description-input`}
            />
          </div>

          {/* User Selector */}
          <div className="gba:space-y-2">
            <Label>
              {getTranslationFromI18nKeyAndLabel('chat.selectParticipants', 'Select Participants')}
              <span className="gba:text-destructive">*</span>
            </Label>
            <div className="gba:h-72">
              <UserSelector
                selectedUserIds={selectedUserIds}
                onSelectionChange={setSelectedUserIds}
                currentUserId={currentUserId}
                prefixDataTestId={`${prefixDataTestId}-user-selector`}
                accessToken={accessToken}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="gba:text-sm gba:text-destructive gba:bg-destructive-secondary gba:p-3 gba:rounded-md"
              data-testid={`${prefixDataTestId}-error`}
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            data-testid={`${prefixDataTestId}-cancel`}
          >
            {getTranslationFromI18nKeyAndLabel('chat.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} data-testid={`${prefixDataTestId}-create`}>
            {isCreating
              ? getTranslationFromI18nKeyAndLabel('chat.creating', 'Creating...')
              : getTranslationFromI18nKeyAndLabel('chat.createGroup', 'Create Group')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
