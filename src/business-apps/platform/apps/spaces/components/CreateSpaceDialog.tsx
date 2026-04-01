/**
 * CreateSpaceDialog - Dialog for creating new spaces
 *
 * Supports two creation modes:
 * 1. Manual - User enters name/description and invites members manually
 * 2. By Group - User selects an organizational dimension (org unit, matrix team, etc.)
 *    and all members are automatically added
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  IconAvatar,
  useTranslation
} from '@newwork/nw-design-system'
import { Globe, Lock, Loader2, UserIcon } from 'lucide-react'
import { Users, Buildings } from '@phosphor-icons/react'
import { DimensionPicker, useOrganizationalDimensions, getDimensionPickerTranslations } from '../../shared'
import type { DimensionType } from '../../shared/types/dimensions'
import sharedTranslations from '../../shared/_i18n'
import type { OrgUserBasic } from '@/common/network/org-directory/OrgDirectoryClient'
import type { CreateSpaceInput, SpaceDimension } from '../types/space.types'

type CreationMode = 'manual' | 'dimension'

export interface CreateSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateSpaceInput) => Promise<void>
  accessToken?: string
  currentUserId?: string
  'data-testid'?: string
}

export const CreateSpaceDialog: React.FC<CreateSpaceDialogProps> = ({
  open,
  onOpenChange,
  onCreate,
  accessToken,
  currentUserId,
  'data-testid': testId = 'create-space-dialog'
}) => {
  const { t } = useTranslation(sharedTranslations)
  // Mode state
  const [creationMode, setCreationMode] = useState<CreationMode>('manual')
  const [showDimensionPicker, setShowDimensionPicker] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [createCalendar, setCreateCalendar] = useState(true)
  const [calendarName, setCalendarName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Dimension-based selection state
  const [dimensionMembers, setDimensionMembers] = useState<OrgUserBasic[]>([])
  const [selectedDimension, setSelectedDimension] = useState<SpaceDimension | null>(null)

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
  } = useOrganizationalDimensions(accessToken || '', { t })

  // Load dimensions when modal opens and dimension mode is selected
  useEffect(() => {
    if (open && creationMode === 'dimension' && accessToken) {
      loadDimensions()
    }
  }, [open, creationMode, accessToken, loadDimensions])

  const resetForm = useCallback(() => {
    setName('')
    setDescription('')
    setIsPublic(false)
    setCreateCalendar(true)
    setCalendarName('')
    setCreationMode('manual')
    setShowDimensionPicker(false)
    setDimensionMembers([])
    setSelectedDimension(null)
    clearMembers()
  }, [clearMembers])

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && !isLoading) {
        resetForm()
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, resetForm, isLoading]
  )

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const input: CreateSpaceInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
        createCalendar,
        calendarName: createCalendar ? calendarName.trim() || `${name.trim()} Calendar` : undefined
      }

      // Add dimension info if creating from dimension
      if (creationMode === 'dimension' && selectedDimension) {
        input.dimension = selectedDimension
        input.memberIds = dimensionMembers.map(m => m.id)
      }

      await onCreate(input)
      resetForm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }, [
    name,
    description,
    isPublic,
    createCalendar,
    calendarName,
    creationMode,
    selectedDimension,
    dimensionMembers,
    onCreate,
    resetForm,
    onOpenChange
  ])

  // Handle dimension selection from picker
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
    setSelectedDimension({
      type: dimensionType,
      id: dimensionId,
      name: dimensionName
    })
    setShowDimensionPicker(false)
    // Auto-suggest space name based on dimension
    if (!name.trim()) {
      setName(dimensionName)
    }
  }

  // Handle mode change
  const handleModeChange = (mode: string) => {
    setCreationMode(mode as CreationMode)
    // Reset selections when changing mode
    if (mode === 'manual') {
      setDimensionMembers([])
      setSelectedDimension(null)
      clearMembers()
    }
  }

  // Start dimension picker flow
  const handleStartDimensionPicker = () => {
    setShowDimensionPicker(true)
  }

  // Cancel dimension picker
  const handleCancelDimensionPicker = () => {
    setShowDimensionPicker(false)
    clearMembers()
  }

  const getMemberCount = () => {
    return creationMode === 'dimension' ? dimensionMembers.length : 0
  }

  // Render form fields (shared between modes after dimension is selected)
  const renderFormFields = () => (
    <>
      {/* Name Input */}
      <div className="gba:space-y-2">
        <Label htmlFor="space-name" className="gba:text-sm gba:font-medium">
          Name
          <span className="gba:text-destructive gba:ml-0.5">*</span>
        </Label>
        <Input
          id="space-name"
          placeholder="e.g., Marketing Team"
          value={name}
          onChange={e => setName(e.target.value)}
          className="gba:h-10"
          disabled={isLoading}
          data-testid={`${testId}-name-input`}
        />
      </div>

      {/* Description Input */}
      <div className="gba:space-y-2">
        <Label htmlFor="space-description" className="gba:text-sm gba:font-medium">
          Description
          <span className="gba:text-muted-foreground gba:font-normal gba:ml-1">(optional)</span>
        </Label>
        <Textarea
          id="space-description"
          placeholder="What is this space for?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="gba:resize-none"
          disabled={isLoading}
          data-testid={`${testId}-description-input`}
        />
      </div>

      {/* Visibility Toggle */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:rounded-lg gba:bg-card">
        <div className="gba:flex gba:items-center gba:gap-3">
          {isPublic ? (
            <Globe className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
          ) : (
            <Lock className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
          )}
          <div>
            <p className="gba:text-sm gba:font-medium gba:text-foreground">{isPublic ? 'Public' : 'Private'}</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              {isPublic ? 'Discoverable by organization' : 'Only invited members'}
            </p>
          </div>
        </div>
        <Switch
          checked={isPublic}
          onCheckedChange={setIsPublic}
          disabled={isLoading}
          data-testid={`${testId}-public-switch`}
        />
      </div>

      <div className="gba:space-y-3 gba:p-4 gba:rounded-lg gba:bg-card">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <p className="gba:text-sm gba:font-medium gba:text-foreground">Create space calendar</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              Add a linked internal calendar that can later be shown in the shared calendar view
            </p>
          </div>
          <Switch
            checked={createCalendar}
            onCheckedChange={setCreateCalendar}
            disabled={isLoading}
            data-testid={`${testId}-calendar-switch`}
          />
        </div>

        {createCalendar && (
          <div className="gba:space-y-2">
            <Label htmlFor="space-calendar-name" className="gba:text-sm gba:font-medium">
              Calendar name
            </Label>
            <Input
              id="space-calendar-name"
              placeholder={name.trim() ? `${name.trim()} Calendar` : 'Team Calendar'}
              value={calendarName}
              onChange={e => setCalendarName(e.target.value)}
              className="gba:h-10"
              disabled={isLoading}
              data-testid={`${testId}-calendar-name-input`}
            />
          </div>
        )}
      </div>
    </>
  )

  // Render member preview for dimension mode
  const renderMemberPreview = () => (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:text-muted-foreground">
        Members
        <span className="gba:ml-1 gba:text-foreground gba:font-medium">({dimensionMembers.length})</span>
      </Label>
      <div className="gba:h-32 gba:overflow-y-auto gba:border gba:border-border/50 gba:rounded-lg gba:bg-muted/20 gba:p-2">
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
                <IconAvatar className="gba:w-5 gba:h-5 gba:flex-shrink-0" label={member.name} icon={UserIcon} />
              )}
              <span className="gba:truncate gba:max-w-[120px]">{member.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[85vh]" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Create Space</DialogTitle>
          <DialogDescription>Create a workspace to organize your team's content</DialogDescription>
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
              translations={getDimensionPickerTranslations(t)}
              data-testid={`${testId}-dimension-picker`}
            />
          </div>
        ) : (
          // Main creation form
          <div className="gba:space-y-4 gba:py-4">
            {/* Mode Selection Tabs */}
            <Tabs value={creationMode} onValueChange={handleModeChange} className="gba:w-full">
              <TabsList className="gba:w-full gba:mb-4">
                <TabsTrigger value="manual" className="gba:flex-1" data-testid={`${testId}-tab-manual`}>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                    <Users className="gba:w-4 gba:h-4" />
                    <span>Create Manually</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="dimension" className="gba:flex-1" data-testid={`${testId}-tab-dimension`}>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                    <Buildings className="gba:w-4 gba:h-4" />
                    <span>Create by Group</span>
                  </div>
                </TabsTrigger>
              </TabsList>

              {/* Manual Creation Tab */}
              <TabsContent value="manual" className="gba:space-y-4">
                {renderFormFields()}
              </TabsContent>

              {/* Dimension Selection Tab */}
              <TabsContent value="dimension" className="gba:space-y-4">
                {selectedDimension ? (
                  <>
                    {/* Selected group info */}
                    <div className="gba:p-4 gba:bg-success-secondary gba:rounded-lg gba:border gba:border-success/30">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <div>
                          <div className="gba:font-medium gba:text-success-secondary-foreground">
                            {selectedDimension.name}
                          </div>
                          <div className="gba:text-sm gba:text-success-secondary-foreground/70">
                            {dimensionMembers.length} members will be added
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartDimensionPicker}
                          data-testid={`${testId}-change-dimension`}
                        >
                          Change
                        </Button>
                      </div>
                    </div>

                    {renderFormFields()}
                    {renderMemberPreview()}
                  </>
                ) : (
                  // No dimension selected - show selection prompt
                  <div className="gba:text-center gba:py-12 gba:space-y-4">
                    <div className="gba:w-16 gba:h-16 gba:mx-auto gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                      <Buildings className="gba:w-8 gba:h-8 gba:text-primary" />
                    </div>
                    <div>
                      <h3 className="gba:font-medium gba:text-foreground">Create Space from Group</h3>
                      <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:max-w-xs gba:mx-auto">
                        Select an organizational group and all its members will be automatically added to your space
                      </p>
                    </div>
                    <Button onClick={handleStartDimensionPicker} data-testid={`${testId}-select-dimension`}>
                      Select Group
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Footer - only show when not in dimension picker */}
        {!showDimensionPicker && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isLoading}
              data-testid={`${testId}-cancel`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                isLoading ||
                !name.trim() ||
                (creationMode === 'dimension' && getMemberCount() === 0 && !selectedDimension)
              }
              data-testid={`${testId}-create-button`}
            >
              {isLoading ? (
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              ) : creationMode === 'dimension' && getMemberCount() > 0 ? (
                `Create Space (${getMemberCount()} members)`
              ) : (
                'Create Space'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CreateSpaceDialog
