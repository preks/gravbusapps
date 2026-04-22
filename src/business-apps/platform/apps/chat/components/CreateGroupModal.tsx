import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  IconAvatar,
  useTranslation
} from '@newwork/nw-design-system'
import { Users, Buildings } from '@phosphor-icons/react'
import { UserIcon } from 'lucide-react'
import { UserSelector } from './UserSelector'
import { DimensionPicker } from './DimensionPicker'
import type { ChatClient } from '@/common/network/chat/ChatClient'
import { useOrganizationalDimensions, DimensionType } from '../hooks/useOrganizationalDimensions'
import type { OrgUserBasic } from '@/common/network/org-directory/OrgDirectoryClient'
import translations from '../_i18n'

type CreationMode = 'manual' | 'dimension'

/**
 * Context for dimension-based group creation
 * Used to link group chats with organizational dimensions (for space integration)
 */
export interface DimensionContext {
  type: DimensionType
  id: string
  name: string
}

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (
    name: string,
    participantIds: string[],
    description?: string,
    dimensionContext?: DimensionContext
  ) => Promise<void>
  apiClient: ChatClient | null
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
  const { t } = useTranslation(translations)
  const [creationMode, setCreationMode] = useState<CreationMode>('manual')
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dimension-based selection state
  const [showDimensionPicker, setShowDimensionPicker] = useState(false)
  const [dimensionMembers, setDimensionMembers] = useState<OrgUserBasic[]>([])
  const [selectedDimensionName, setSelectedDimensionName] = useState<string>('')
  const [selectedDimensionType, setSelectedDimensionType] = useState<DimensionType | null>(null)
  const [selectedDimensionId, setSelectedDimensionId] = useState<string | null>(null)

  // Hook for organizational dimensions
  const {
    organizationalUnits,
    matrixTeams,
    locations,
    legalEntities,
    capabilities,
    isLoadingDimensions,
    isLoadingMembers,
    selectedMembers,
    loadDimensions,
    loadMembersByDimension,
    clearMembers
  } = useOrganizationalDimensions(accessToken || '')

  // Load dimensions when modal opens and dimension mode is selected
  useEffect(() => {
    if (isOpen && creationMode === 'dimension' && accessToken) {
      loadDimensions()
    }
  }, [isOpen, creationMode, accessToken, loadDimensions])

  const handleClose = () => {
    if (!isCreating) {
      resetState()
      onClose()
    }
  }

  const resetState = () => {
    setGroupName('')
    setDescription('')
    setSelectedUserIds([])
    setError(null)
    setCreationMode('manual')
    setShowDimensionPicker(false)
    setDimensionMembers([])
    setSelectedDimensionName('')
    setSelectedDimensionType(null)
    setSelectedDimensionId(null)
    clearMembers()
  }

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError(t('chat-groupNameRequired'))
      return
    }

    let participantIds = creationMode === 'manual' ? selectedUserIds : dimensionMembers.map(m => m.id)

    if (participantIds.length === 0) {
      setError(t('chat-selectAtLeastOneUser'))
      return
    }

    // Ensure current user is included in the participants (they are the group creator)
    if (currentUserId && !participantIds.includes(currentUserId)) {
      participantIds = [currentUserId, ...participantIds]
    }

    try {
      setIsCreating(true)
      setError(null)

      // Build dimension context if creating from dimension mode
      const dimensionContext: DimensionContext | undefined =
        creationMode === 'dimension' && selectedDimensionType && selectedDimensionId
          ? { type: selectedDimensionType, id: selectedDimensionId, name: selectedDimensionName }
          : undefined

      await onCreateGroup(groupName.trim(), participantIds, description.trim() || undefined, dimensionContext)
      handleClose()
    } catch (err) {
      console.error('Error creating group:', err)
      const backendMessage =
        err instanceof Error &&
        typeof (err as { responseData?: { message?: string } }).responseData?.message === 'string'
          ? (err as { responseData?: { message?: string } }).responseData?.message
          : err instanceof Error
            ? err.message
            : ''

      if (backendMessage.toLowerCase().includes('already exists for this dimension')) {
        setError(t('chat-groupCreationDuplicate'))
      } else {
        setError(t('chat-groupCreationFailed'))
      }
    } finally {
      setIsCreating(false)
    }
  }

  // Handle dimension selection
  const handleDimensionSelect = async (type: DimensionType, dimensionId: string) => {
    await loadMembersByDimension(type, dimensionId)
  }

  // Handle dimension confirmation
  const handleDimensionConfirm = (
    members: OrgUserBasic[],
    dimensionName: string,
    dimensionType: DimensionType,
    dimensionId: string
  ) => {
    setDimensionMembers(members)
    setSelectedDimensionName(dimensionName)
    setSelectedDimensionType(dimensionType)
    setSelectedDimensionId(dimensionId)
    setShowDimensionPicker(false)
    // Auto-suggest group name based on dimension
    if (!groupName.trim()) {
      setGroupName(dimensionName)
    }
  }

  // Handle mode change
  const handleModeChange = (mode: string) => {
    setCreationMode(mode as CreationMode)
    setError(null)
    // Reset selections when changing mode
    if (mode === 'manual') {
      setDimensionMembers([])
      setSelectedDimensionName('')
      clearMembers()
    } else {
      setSelectedUserIds([])
    }
  }

  // Start dimension picker flow
  const handleStartDimensionPicker = () => {
    setShowDimensionPicker(true)
    setError(null)
  }

  // Cancel dimension picker
  const handleCancelDimensionPicker = () => {
    setShowDimensionPicker(false)
    clearMembers()
  }

  const getParticipantCount = () => {
    return creationMode === 'manual' ? selectedUserIds.length : dimensionMembers.length
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="gba:max-h-[85vh]"
        style={{
          width: '90vw',
          maxWidth: window.innerWidth >= 1280 ? '896px' : window.innerWidth >= 1024 ? '768px' : '90vw'
        }}
        data-testid={prefixDataTestId}
      >
        <DialogHeader>
          <DialogTitle>{t('chat-createGroup')}</DialogTitle>
        </DialogHeader>

        {showDimensionPicker ? (
          // Dimension picker view
          <div className="gba:py-4">
            <DimensionPicker
              organizationalUnits={organizationalUnits}
              matrixTeams={matrixTeams}
              locations={locations}
              legalEntities={legalEntities}
              capabilities={capabilities}
              isLoadingDimensions={isLoadingDimensions}
              isLoadingMembers={isLoadingMembers}
              selectedMembers={selectedMembers}
              onDimensionSelect={handleDimensionSelect}
              onConfirm={handleDimensionConfirm}
              onCancel={handleCancelDimensionPicker}
              currentUserId={currentUserId}
              prefixDataTestId={`${prefixDataTestId}-dimension-picker`}
            />
          </div>
        ) : (
          // Main creation form
          <div className="gba:space-y-4 gba:py-4">
            {/* Mode Selection Tabs */}
            <Tabs value={creationMode} onValueChange={handleModeChange} className="gba:w-full">
              <TabsList className="gba:w-full gba:mb-4">
                <TabsTrigger value="manual" className="gba:flex-1" data-testid={`${prefixDataTestId}-tab-manual`}>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                    <Users className="gba:w-4 gba:h-4" />
                    <span>{t('chat-selectManually')}</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="dimension" className="gba:flex-1" data-testid={`${prefixDataTestId}-tab-dimension`}>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                    <Buildings className="gba:w-4 gba:h-4" />
                    <span>{t('chat-selectByGroup')}</span>
                  </div>
                </TabsTrigger>
              </TabsList>

              {/* Manual Selection Tab */}
              <TabsContent value="manual" className="gba:space-y-4">
                {/* Group Name */}
                <div className="gba:space-y-2">
                  <Label htmlFor="group-name">
                    {t('chat-groupName')}
                    <span className="gba:text-destructive">*</span>
                  </Label>
                  <Input
                    id="group-name"
                    placeholder={t('chat-groupNamePlaceholder')}
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    disabled={isCreating}
                    data-testid={`${prefixDataTestId}-name-input`}
                  />
                </div>

                {/* Description (optional) */}
                <div className="gba:space-y-2">
                  <Label htmlFor="group-description">
                    {t('chat-groupDescription')}
                    <span className="gba:text-muted-foreground gba:ml-1">({t('chat-optional')})</span>
                  </Label>
                  <Input
                    id="group-description"
                    placeholder={t('chat-groupDescriptionPlaceholder')}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    disabled={isCreating}
                    data-testid={`${prefixDataTestId}-description-input`}
                  />
                </div>

                {/* User Selector */}
                <div className="gba:space-y-2">
                  <Label>
                    {t('chat-selectParticipants')}
                    <span className="gba:text-destructive">*</span>
                  </Label>
                  <div className="gba:h-64">
                    <UserSelector
                      selectedUserIds={selectedUserIds}
                      onSelectionChange={setSelectedUserIds}
                      currentUserId={currentUserId}
                      prefixDataTestId={`${prefixDataTestId}-user-selector`}
                      accessToken={accessToken}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Dimension Selection Tab */}
              <TabsContent value="dimension" className="gba:space-y-4">
                {/* Selected dimension info or select button */}
                {dimensionMembers.length > 0 ? (
                  <>
                    {/* Selected group info */}
                    <div className="gba:p-4 gba:bg-success-secondary gba:rounded-lg gba:border gba:border-success/30">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <div>
                          <div className="gba:font-medium gba:text-success-secondary-foreground">
                            {selectedDimensionName}
                          </div>
                          <div className="gba:text-sm gba:text-success-secondary-foreground/70">
                            {dimensionMembers.length} {t('chat-members')}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartDimensionPicker}
                          data-testid={`${prefixDataTestId}-change-dimension`}
                        >
                          {t('chat-change')}
                        </Button>
                      </div>
                    </div>

                    {/* Group Name */}
                    <div className="gba:space-y-2">
                      <Label htmlFor="group-name-dimension">
                        {t('chat-groupName')}
                        <span className="gba:text-destructive">*</span>
                      </Label>
                      <Input
                        id="group-name-dimension"
                        placeholder={t('chat-groupNamePlaceholder')}
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        disabled={isCreating}
                        data-testid={`${prefixDataTestId}-name-input-dimension`}
                      />
                    </div>

                    {/* Description (optional) */}
                    <div className="gba:space-y-2">
                      <Label htmlFor="group-description-dimension">
                        {t('chat-groupDescription')}
                        <span className="gba:text-muted-foreground gba:ml-1">({t('chat-optional')})</span>
                      </Label>
                      <Input
                        id="group-description-dimension"
                        placeholder={t('chat-groupDescriptionPlaceholder')}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        disabled={isCreating}
                        data-testid={`${prefixDataTestId}-description-input-dimension`}
                      />
                    </div>

                    {/* Member preview */}
                    <div className="gba:space-y-2">
                      <Label className="gba:text-muted-foreground">{t('chat-participantsPreview')}</Label>
                      <div className="gba:h-40 gba:overflow-y-auto gba:border gba:border-border/50 gba:rounded-lg gba:bg-muted/20 gba:p-2">
                        <div className="gba:flex gba:flex-wrap gba:gap-2">
                          {dimensionMembers.map(member => (
                            <div
                              key={member.id}
                              className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:bg-background gba:rounded-md gba:text-sm gba:border gba:border-border/50"
                            >
                              {member.avatarUrl ? (
                                <Avatar className="gba:w-5 gba:h-5 gba:flex-shrink-0">
                                  <img
                                    src={member.avatarUrl}
                                    alt={member.name}
                                    className="gba:w-full gba:h-full gba:object-cover gba:rounded-full"
                                  />
                                </Avatar>
                              ) : (
                                <IconAvatar
                                  className="gba:w-5 gba:h-5 gba:flex-shrink-0"
                                  label={member.name}
                                  icon={UserIcon}
                                />
                              )}
                              <span className="gba:truncate gba:max-w-[150px]">{member.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // No dimension selected - show selection prompt
                  <div className="gba:text-center gba:py-12 gba:space-y-4">
                    <div className="gba:w-16 gba:h-16 gba:mx-auto gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                      <Buildings className="gba:w-8 gba:h-8 gba:text-primary" />
                    </div>
                    <div>
                      <h3 className="gba:font-medium gba:text-foreground">{t('chat-createGroupByDimension')}</h3>
                      <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:max-w-xs gba:mx-auto">
                        {t('chat-dimensionDescription')}
                      </p>
                    </div>
                    <Button onClick={handleStartDimensionPicker} data-testid={`${prefixDataTestId}-select-dimension`}>
                      {t('chat-selectGroup')}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

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
        )}

        {/* Footer - only show when not in dimension picker */}
        {!showDimensionPicker && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              data-testid={`${prefixDataTestId}-cancel`}
            >
              {t('chat-cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || getParticipantCount() === 0}
              data-testid={`${prefixDataTestId}-create`}
            >
              {isCreating
                ? t('chat-creating')
                : `${t('chat-createGroup')}${getParticipantCount() > 0 ? ` (${getParticipantCount()})` : ''}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
