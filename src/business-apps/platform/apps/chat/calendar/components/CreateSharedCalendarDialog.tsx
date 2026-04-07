import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Avatar,
  IconAvatar,
  useTranslation
} from '@newwork/nw-design-system'
import { Buildings, CalendarBlankIcon, User, Users } from '@phosphor-icons/react'
import {
  DimensionPicker,
  getDimensionPickerTranslations,
  useOrganizationalDimensions
} from '@/business-apps/platform/apps/shared'
import sharedTranslations from '@/business-apps/platform/apps/shared/_i18n'
import type { OrgUserBasic } from '@/common/network/org-directory/OrgDirectoryClient'
import type { DimensionType } from '@/business-apps/platform/apps/shared/types/dimensions'
import { CreateSharedCalendarData, InternalCalendarPermission, MEETING_COLORS, getDefaultCalendarColor } from '../types'
import translations from '../../_i18n'

type CreationMode = 'manual' | 'dimension'

interface CreateSharedCalendarDialogProps {
  isOpen: boolean
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (data: CreateSharedCalendarData) => Promise<void>
  accessToken?: string
  currentUserId?: string
}

export const CreateSharedCalendarDialog: React.FC<CreateSharedCalendarDialogProps> = ({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
  accessToken,
  currentUserId
}) => {
  const { t } = useTranslation(translations)
  const { t: tShared } = useTranslation(sharedTranslations)
  const dimensionPickerTranslations = useMemo(() => getDimensionPickerTranslations(tShared), [tShared])
  const [creationMode, setCreationMode] = useState<CreationMode>('manual')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(getDefaultCalendarColor())
  const [showDimensionPicker, setShowDimensionPicker] = useState(false)
  const [dimensionMembers, setDimensionMembers] = useState<OrgUserBasic[]>([])
  const [selectedDimension, setSelectedDimension] = useState<CreateSharedCalendarData['dimension']>()

  const {
    organizationalUnits,
    matrixTeams,
    locations,
    legalEntities,
    capabilities,
    isLoadingDimensions,
    isLoadingMembers,
    selectedMembers,
    error,
    loadDimensions,
    loadMembersByDimension,
    clearMembers
  } = useOrganizationalDimensions(accessToken || '', { t: tShared })

  const selectedColorName = useMemo(
    () => MEETING_COLORS.find(option => option.value === color)?.name || 'Blue',
    [color]
  )

  const resetState = useCallback(() => {
    setCreationMode('manual')
    setName('')
    setDescription('')
    setColor(getDefaultCalendarColor())
    setShowDimensionPicker(false)
    setDimensionMembers([])
    setSelectedDimension(undefined)
    clearMembers()
  }, [clearMembers])

  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen, resetState])

  useEffect(() => {
    if (isOpen && creationMode === 'dimension' && accessToken) {
      void loadDimensions()
    }
  }, [accessToken, creationMode, isOpen, loadDimensions])

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return
    }

    resetState()
    onClose()
  }, [isSubmitting, onClose, resetState])

  const handleDimensionSelect = useCallback(
    async (type: DimensionType, dimensionId: string) => {
      await loadMembersByDimension(type, dimensionId)
    },
    [loadMembersByDimension]
  )

  const handleDimensionConfirm = useCallback(
    (members: OrgUserBasic[], dimensionName: string, dimensionType: DimensionType, dimensionId: string) => {
      setDimensionMembers(members)
      setSelectedDimension({
        type: dimensionType,
        id: dimensionId,
        name: dimensionName
      })
      setShowDimensionPicker(false)

      if (!name.trim()) {
        setName(dimensionName)
      }
    },
    [name]
  )

  const handleModeChange = useCallback(
    (nextMode: string) => {
      const mode = nextMode as CreationMode
      setCreationMode(mode)

      if (mode === 'manual') {
        setShowDimensionPicker(false)
        setDimensionMembers([])
        setSelectedDimension(undefined)
        clearMembers()
      }
    },
    [clearMembers]
  )

  const handleSubmit = async () => {
    if (!name.trim() || (creationMode === 'dimension' && (!selectedDimension || dimensionMembers.length === 0))) {
      return
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      dimension: creationMode === 'dimension' ? selectedDimension : undefined,
      shares:
        creationMode === 'dimension'
          ? dimensionMembers.map(member => ({
              userId: member.id,
              permission: InternalCalendarPermission.VIEWER
            }))
          : undefined
    })
  }

  const renderColorField = () => (
    <div className="gba:space-y-2">
      <Label htmlFor="shared-calendar-color">{t('calendar-color')}</Label>
      <Select value={color} onValueChange={setColor}>
        <SelectTrigger id="shared-calendar-color" data-testid="shared-calendar-color-select">
          <SelectValue>{selectedColorName}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MEETING_COLORS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent
        className="gba:w-[95vw] gba:sm:w-full gba:max-w-2xl gba:max-h-[90vh] gba:flex gba:flex-col gba:overflow-hidden"
        data-testid="create-shared-calendar-dialog"
      >
        <DialogHeader className="gba:flex-shrink-0">
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <CalendarBlankIcon className="gba:h-5 gba:w-5" />
            {t('calendar-sidebar-newSharedCalendar')}
          </DialogTitle>
          <DialogDescription>{t('calendar-sidebar-newSharedCalendarDescription')}</DialogDescription>
        </DialogHeader>

        {showDimensionPicker ? (
          <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden gba:py-4">
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
              translations={dimensionPickerTranslations}
              data-testid="shared-calendar-dimension-picker"
            />
          </div>
        ) : (
          <>
            <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto">
              <div className="gba:space-y-4 gba:py-4">
                <Tabs value={creationMode} onValueChange={handleModeChange} className="gba:w-full">
                  <TabsList className="gba:w-full gba:mb-4">
                    <TabsTrigger value="manual" className="gba:flex-1" data-testid="shared-calendar-tab-manual">
                      <span className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                        <Users className="gba:h-4 gba:w-4" />
                        {t('calendar-sidebar-createManually')}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="dimension" className="gba:flex-1" data-testid="shared-calendar-tab-dimension">
                      <span className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                        <Buildings className="gba:h-4 gba:w-4" />
                        {t('calendar-sidebar-createByGroup')}
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="gba:space-y-4">
                    <div className="gba:space-y-2">
                      <Label htmlFor="shared-calendar-name">{t('calendar-sidebar-calendarName')}</Label>
                      <Input
                        id="shared-calendar-name"
                        value={name}
                        onChange={event => setName(event.target.value)}
                        placeholder={t('calendar-sidebar-calendarNamePlaceholder')}
                        disabled={isSubmitting}
                        data-testid="shared-calendar-name-input"
                      />
                    </div>

                    <div className="gba:space-y-2">
                      <Label htmlFor="shared-calendar-description">{t('calendar-description')}</Label>
                      <Textarea
                        id="shared-calendar-description"
                        value={description}
                        onChange={event => setDescription(event.target.value)}
                        placeholder={t('calendar-sidebar-calendarDescriptionPlaceholder')}
                        rows={3}
                        disabled={isSubmitting}
                        data-testid="shared-calendar-description-input"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="dimension" className="gba:space-y-4">
                    {renderColorField()}

                    {selectedDimension ? (
                      <>
                        <div className="gba:p-4 gba:bg-success-secondary gba:rounded-lg gba:border gba:border-success/30">
                          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                            <div>
                              <div className="gba:font-medium gba:text-success-secondary-foreground">
                                {selectedDimension.name}
                              </div>
                              <div className="gba:text-sm gba:text-success-secondary-foreground/70">
                                {t('calendar-sidebar-dimensionViewerAccess', { count: dimensionMembers.length })}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDimensionPicker(true)}
                              disabled={isSubmitting}
                              data-testid="shared-calendar-change-dimension"
                            >
                              {t('chat-change')}
                            </Button>
                          </div>
                        </div>

                        <div className="gba:space-y-2">
                          <Label htmlFor="shared-calendar-name-dimension">{t('calendar-sidebar-calendarName')}</Label>
                          <Input
                            id="shared-calendar-name-dimension"
                            value={name}
                            onChange={event => setName(event.target.value)}
                            placeholder={t('calendar-sidebar-calendarNamePlaceholder')}
                            disabled={isSubmitting}
                            data-testid="shared-calendar-name-input-dimension"
                          />
                        </div>

                        <div className="gba:space-y-2">
                          <Label htmlFor="shared-calendar-description-dimension">{t('calendar-description')}</Label>
                          <Textarea
                            id="shared-calendar-description-dimension"
                            value={description}
                            onChange={event => setDescription(event.target.value)}
                            placeholder={t('calendar-sidebar-calendarDescriptionPlaceholder')}
                            rows={3}
                            disabled={isSubmitting}
                            data-testid="shared-calendar-description-input-dimension"
                          />
                        </div>

                        <div className="gba:space-y-2">
                          <Label className="gba:text-sm gba:text-muted-foreground">
                            {t('calendar-sidebar-membersPreview')}
                          </Label>
                          <div className="gba:h-36 gba:overflow-y-auto gba:border gba:border-border/50 gba:rounded-lg gba:bg-muted/20 gba:p-2">
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
                                      icon={User}
                                    />
                                  )}
                                  <span className="gba:truncate gba:max-w-[140px]">{member.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="gba:text-center gba:py-12 gba:space-y-4">
                        <div className="gba:w-16 gba:h-16 gba:mx-auto gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                          <Buildings className="gba:w-8 gba:h-8 gba:text-primary" />
                        </div>
                        <div>
                          <h3 className="gba:font-medium gba:text-foreground">
                            {t('calendar-sidebar-createCalendarByDimension')}
                          </h3>
                          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:max-w-xs gba:mx-auto">
                            {t('calendar-sidebar-dimensionDescription')}
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowDimensionPicker(true)}
                          disabled={!accessToken || isSubmitting}
                          data-testid="shared-calendar-select-dimension"
                        >
                          {t('chat-selectGroup')}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {creationMode !== 'dimension' ? renderColorField() : null}

                {error ? (
                  <div
                    className="gba:text-sm gba:text-destructive gba:bg-destructive-secondary gba:p-3 gba:rounded-md"
                    data-testid="shared-calendar-error"
                  >
                    {error}
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter className="gba:flex gba:gap-2 gba:flex-shrink-0">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isSubmitting}
                data-testid="shared-calendar-cancel-button"
              >
                {t('calendar-cancel')}
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={!name.trim() || isSubmitting || (creationMode === 'dimension' && !selectedDimension)}
                data-testid="shared-calendar-submit-button"
              >
                {t('calendar-sidebar-createCalendar')}
                {creationMode === 'dimension' && dimensionMembers.length > 0 ? ` (${dimensionMembers.length})` : ''}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
