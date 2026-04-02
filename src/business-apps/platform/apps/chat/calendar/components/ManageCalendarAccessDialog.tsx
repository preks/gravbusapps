import React, { useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconAvatar,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, TrashIcon, UserIcon } from '@phosphor-icons/react'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { CalendarEmployee } from '../services/employeeSearchService'
import { createEmployeeSearchService } from '../services/employeeSearchService'
import type { InternalCalendarMember, InternalCalendarPermission, InternalCalendarSummary } from '../types'
import { InternalCalendarPermission as CalendarPermission } from '../types'
import translations from '../../_i18n'

interface ManageCalendarAccessDialogProps {
  accessToken: string
  currentUserId?: string
  calendar?: InternalCalendarSummary | null
  isOpen: boolean
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (data: {
    members: Array<{ userId: string; permission: InternalCalendarPermission }>
    removeUserIds: string[]
  }) => Promise<void>
}

const PERMISSION_OPTIONS: InternalCalendarPermission[] = [
  CalendarPermission.EDITOR,
  CalendarPermission.VIEWER,
  CalendarPermission.FREE_BUSY
]

function getMemberName(member: {
  displayName?: string
  firstName?: string
  lastName?: string
  email?: string
  userId: string
}): string {
  return (
    member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || member.userId
  )
}

function PersonAvatar({ label, imageUrl }: Readonly<{ label: string; imageUrl?: string }>) {
  if (imageUrl) {
    return (
      <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
        <img src={imageUrl} alt={label} className="gba:h-full gba:w-full gba:rounded-full gba:object-cover" />
      </Avatar>
    )
  }

  return <IconAvatar className="gba:h-8 gba:w-8 gba:flex-shrink-0" label={label} icon={UserIcon} />
}

export const ManageCalendarAccessDialog: React.FC<ManageCalendarAccessDialogProps> = ({
  accessToken,
  currentUserId,
  calendar,
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation(translations)
  const apiClient = useChatClient(accessToken)
  const employeeSearchService = useMemo(() => createEmployeeSearchService(accessToken), [accessToken])
  const [members, setMembers] = useState<InternalCalendarMember[]>([])
  const [removedUserIds, setRemovedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CalendarEmployee[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !calendar) {
      return
    }

    let cancelled = false

    const loadMembers = async () => {
      setIsLoadingMembers(true)
      setLoadError(null)

      try {
        const response = await apiClient.getCalendarMembers<{ members: InternalCalendarMember[] }>(calendar.id)
        if (!cancelled) {
          setMembers(response.members)
          setRemovedUserIds([])
        }
      } catch (error) {
        console.error('Error loading calendar members:', error)
        if (!cancelled) {
          setLoadError(t('calendar-sidebar-membersLoadError'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMembers(false)
        }
      }
    }

    void loadMembers()

    return () => {
      cancelled = true
    }
  }, [apiClient, calendar, isOpen, t])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setLoadError(null)
      return
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    let cancelled = false

    const timeoutId = globalThis.window.setTimeout(async () => {
      setIsSearching(true)

      try {
        const results = await employeeSearchService.searchEmployees(searchQuery.trim(), 10)
        if (!cancelled) {
          const existingMemberIds = new Set(members.map(member => member.userId))
          setSearchResults(results.filter(result => !existingMemberIds.has(result.userId)))
        }
      } catch (error) {
        console.error('Error searching employees for calendar access:', error)
        if (!cancelled) {
          setSearchResults([])
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }, 250)

    return () => {
      cancelled = true
      globalThis.window.clearTimeout(timeoutId)
    }
  }, [employeeSearchService, isOpen, members, searchQuery])

  const handlePermissionChange = (userId: string, permission: InternalCalendarPermission) => {
    setMembers(currentMembers =>
      currentMembers.map(member => (member.userId === userId ? { ...member, permission } : member))
    )
  }

  const handleAddMember = (employee: CalendarEmployee) => {
    setMembers(currentMembers => [
      ...currentMembers,
      {
        userId: employee.userId,
        permission: CalendarPermission.VIEWER,
        isOwner: false,
        displayName: employee.displayName,
        firstName: employee.firstName,
        lastName: employee.lastName
      }
    ])
    setSearchQuery('')
    setSearchResults([])
    setRemovedUserIds(currentIds => currentIds.filter(candidate => candidate !== employee.userId))
  }

  const handleRemoveMember = (userId: string) => {
    setMembers(currentMembers => currentMembers.filter(member => member.userId !== userId))
    setRemovedUserIds(currentIds => (currentIds.includes(userId) ? currentIds : [...currentIds, userId]))
  }

  const handleSubmit = async () => {
    await onSubmit({
      members: members
        .filter(member => !member.isOwner)
        .map(member => ({
          userId: member.userId,
          permission: member.permission
        })),
      removeUserIds: removedUserIds
    })
  }

  const renderMembersPanel = () => {
    if (isLoadingMembers) {
      return (
        <div
          className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:p-6 gba:text-sm gba:text-muted-foreground"
          data-testid="manage-calendar-access-members-loading"
        >
          <Spinner className="gba:h-4 gba:w-4" />
          {t('common-loading')}
        </div>
      )
    }

    if (loadError) {
      return (
        <div className="gba:p-4 gba:text-sm gba:text-destructive" data-testid="manage-calendar-access-members-error">
          {loadError}
        </div>
      )
    }

    return (
      <ScrollArea className="gba:max-h-80">
        <div className="gba:divide-y gba:divide-border/50" data-testid="manage-calendar-access-members-list">
          {members.map(member => {
            const isCurrentUser = currentUserId === member.userId
            const canModifyMember = !member.isOwner && !isCurrentUser

            return (
              <div
                key={member.userId}
                className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3"
              >
                <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                  <PersonAvatar label={getMemberName(member)} imageUrl={member.avatarUrl} />
                  <div className="gba:min-w-0">
                    <p className="gba:text-sm gba:font-medium gba:truncate">{getMemberName(member)}</p>
                    {member.email && (
                      <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{member.email}</p>
                    )}
                  </div>
                </div>

                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
                  {member.isOwner ? (
                    <Badge variant="secondary">{t('calendar-sidebar-owner')}</Badge>
                  ) : (
                    <Select
                      value={member.permission}
                      onValueChange={value =>
                        handlePermissionChange(member.userId, value as InternalCalendarPermission)
                      }
                      disabled={!canModifyMember || isSubmitting}
                    >
                      <SelectTrigger
                        className="gba:w-40"
                        data-testid={`manage-calendar-access-permission-select-${member.userId}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMISSION_OPTIONS.map(option => (
                          <SelectItem key={option} value={option}>
                            {t(`calendar-sidebar-permission-${option}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={!canModifyMember || isSubmitting}
                    data-testid={`manage-calendar-access-remove-button-${member.userId}`}
                  >
                    <TrashIcon className="gba:h-4 gba:w-4" />
                  </Button>
                </div>
              </div>
            )
          })}

          {members.length === 0 && (
            <div className="gba:p-4 gba:text-sm gba:text-muted-foreground" data-testid="manage-calendar-access-empty">
              {t('calendar-sidebar-noMembers')}
            </div>
          )}
        </div>
      </ScrollArea>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && !isSubmitting && onClose()}>
      <DialogContent className="gba:max-w-2xl" data-testid="manage-calendar-access-dialog">
        <DialogHeader>
          <DialogTitle>{t('calendar-sidebar-manageAccess')}</DialogTitle>
          <DialogDescription>
            {calendar
              ? t('calendar-sidebar-manageAccessDescription', { name: calendar.name })
              : t('calendar-sidebar-manageAccess')}
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="calendar-member-search">{t('calendar-sidebar-addPeople')}</Label>
            <div className="gba:relative">
              <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <Input
                id="calendar-member-search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder={t('calendar-searchByName')}
                disabled={isSubmitting}
                className="gba:pl-9"
                data-testid="manage-calendar-access-search-input"
              />
            </div>

            {isSearching && (
              <div
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground"
                data-testid="manage-calendar-access-search-loading"
              >
                <Spinner className="gba:h-4 gba:w-4" />
                {t('common-loading')}
              </div>
            )}

            {searchResults.length > 0 && (
              <div
                className="gba:rounded-lg gba:border gba:border-border/50 gba:bg-background"
                data-testid="manage-calendar-access-search-results"
              >
                {searchResults.map(result => (
                  <div
                    key={result.userId}
                    className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-3 gba:py-2 gba:border-b last:gba:border-b-0 gba:border-border/50"
                  >
                    <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                      <PersonAvatar
                        label={
                          result.displayName || `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'User'
                        }
                        imageUrl={result.pictureThumbnail}
                      />
                      <div className="gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:truncate">{result.displayName}</p>
                        {result.organizationalUnitName && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                            {result.organizationalUnitName}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMember(result)}
                      disabled={isSubmitting}
                      data-testid={`manage-calendar-access-add-button-${result.userId}`}
                    >
                      {t('chat-add')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label>{t('calendar-sidebar-members')}</Label>
              <Badge variant="outline">{members.length}</Badge>
            </div>

            <div className="gba:rounded-lg gba:border gba:border-border/50 gba:bg-background">
              {renderMembersPanel()}
            </div>
          </div>
        </div>

        <DialogFooter className="gba:flex gba:gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="manage-calendar-access-cancel-button"
          >
            {t('calendar-cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!calendar || isLoadingMembers || Boolean(loadError) || isSubmitting}
            data-testid="manage-calendar-access-save-button"
          >
            {t('calendar-saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
