import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { FolderPlus, Loader2 } from 'lucide-react'
import { Users, Buildings } from '@phosphor-icons/react'
import { DimensionPicker, useOrganizationalDimensions, DEFAULT_DIMENSION_TRANSLATIONS } from '../../../shared'
import type { DimensionType, SelectedDimension } from '../../../shared/types/dimensions'
import type { OrgUserBasic } from '@/common/network/org-directory/OrgDirectoryClient'
import { SpaceFormFields, MemberPreview } from './SpaceFormFields'

type CreationMode = 'manual' | 'dimension'

export interface CreateCollectionSubmitData {
  name: string
  description?: string
  icon?: string
  color?: string
  isPublic?: boolean
  dimension?: SelectedDimension
  memberIds?: string[]
}

export interface CreateCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCollectionSubmitData) => void
  isSubmitting?: boolean
  accessToken?: string
  currentUserId?: string
  'data-testid'?: string
}

export const CreateCollectionDialog: React.FC<CreateCollectionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  accessToken,
  currentUserId,
  'data-testid': testId = 'create-collection-dialog'
}) => {
  const [creationMode, setCreationMode] = useState<CreationMode>('manual')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [showDimensionPicker, setShowDimensionPicker] = useState(false)
  const [dimensionMembers, setDimensionMembers] = useState<OrgUserBasic[]>([])
  const [selectedDimension, setSelectedDimension] = useState<SelectedDimension | null>(null)

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
  } = useOrganizationalDimensions(accessToken || '', {})

  useEffect(() => {
    if (open && creationMode === 'dimension' && accessToken) loadDimensions()
  }, [open, creationMode, accessToken, loadDimensions])

  const resetForm = useCallback(() => {
    setName('')
    setDescription('')
    setSelectedColor(null)
    setSelectedIcon(null)
    setIsPublic(false)
    setCreationMode('manual')
    setShowDimensionPicker(false)
    setDimensionMembers([])
    setSelectedDimension(null)
    clearMembers()
  }, [clearMembers])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: selectedIcon || undefined,
      color: selectedColor || undefined,
      isPublic,
      ...(creationMode === 'dimension' && selectedDimension
        ? { dimension: selectedDimension, memberIds: dimensionMembers.map(m => m.id) }
        : {})
    })
  }, [
    name,
    description,
    selectedIcon,
    selectedColor,
    isPublic,
    creationMode,
    selectedDimension,
    dimensionMembers,
    onSubmit
  ])

  const handleDimensionSelect = async (type: DimensionType, dimensionId: string) => {
    await loadMembersByDimension(type, dimensionId)
  }

  const handleDimensionConfirm = (
    members: OrgUserBasic[],
    dimensionName: string,
    dimensionType: DimensionType,
    dimensionId: string
  ) => {
    setDimensionMembers(members)
    setSelectedDimension({ type: dimensionType, id: dimensionId, name: dimensionName })
    setShowDimensionPicker(false)
    if (!name.trim()) setName(dimensionName)
  }

  const handleModeChange = (mode: string) => {
    setCreationMode(mode as CreationMode)
    if (mode === 'manual') {
      setDimensionMembers([])
      setSelectedDimension(null)
      clearMembers()
    }
  }

  const memberCount = creationMode === 'dimension' ? dimensionMembers.length : 0
  const canSubmit =
    !!name.trim() && !isSubmitting && !(creationMode === 'dimension' && !selectedDimension && memberCount === 0)

  const formFieldsProps = {
    name,
    onNameChange: setName,
    description,
    onDescriptionChange: setDescription,
    isPublic,
    onIsPublicChange: setIsPublic,
    selectedIcon,
    onIconChange: setSelectedIcon,
    selectedColor,
    onColorChange: setSelectedColor,
    canSubmit,
    onSubmit: handleSubmit,
    testId
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v && !isSubmitting) {
          resetForm()
          onOpenChange(false)
        } else {
          onOpenChange(v)
        }
      }}
    >
      <DialogContent className="gba:max-w-2xl gba:max-h-[85vh]" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <FolderPlus className="gba:w-5 gba:h-5 gba:text-primary" />
            New Space
          </DialogTitle>
          <DialogDescription>
            Group related boards together. Share the space to give people access to all boards inside.
          </DialogDescription>
        </DialogHeader>

        {showDimensionPicker ? (
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
              onCancel={() => {
                setShowDimensionPicker(false)
                clearMembers()
              }}
              currentUserId={currentUserId}
              translations={DEFAULT_DIMENSION_TRANSLATIONS}
              data-testid={`${testId}-dimension-picker`}
            />
          </div>
        ) : (
          <div className="gba:space-y-4 gba:py-4">
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

              <TabsContent value="manual" className="gba:space-y-4">
                <SpaceFormFields {...formFieldsProps} />
              </TabsContent>

              <TabsContent value="dimension" className="gba:space-y-4">
                {selectedDimension ? (
                  <>
                    <div className="gba:p-3 gba:bg-success-secondary gba:rounded-lg gba:border gba:border-success/30">
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
                          onClick={() => setShowDimensionPicker(true)}
                          data-testid={`${testId}-change-dimension`}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                    <SpaceFormFields {...formFieldsProps} />
                    <MemberPreview members={dimensionMembers} />
                  </>
                ) : (
                  <DimensionPrompt onSelect={() => setShowDimensionPicker(true)} testId={testId} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!showDimensionPicker && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} data-testid={`${testId}-submit`}>
              {isSubmitting ? (
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              ) : memberCount > 0 ? (
                `Create Space (${memberCount} members)`
              ) : (
                <>
                  <FolderPlus className="gba:w-4 gba:h-4 gba:mr-2" /> Create Space
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DimensionPrompt({ onSelect, testId }: { onSelect: () => void; testId: string }) {
  return (
    <div className="gba:text-center gba:py-10 gba:space-y-4">
      <div className="gba:w-14 gba:h-14 gba:mx-auto gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
        <Buildings className="gba:w-7 gba:h-7 gba:text-primary" />
      </div>
      <div>
        <h3 className="gba:font-medium gba:text-foreground">Create Space from Group</h3>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:max-w-xs gba:mx-auto">
          Select an organizational group and all its members will be automatically added to your space
        </p>
      </div>
      <Button onClick={onSelect} data-testid={`${testId}-select-dimension`}>
        Select Group
      </Button>
    </div>
  )
}
