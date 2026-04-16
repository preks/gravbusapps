/**
 * InviteMemberDialog - Dialog for inviting members to a space
 *
 * Clean, professional dialog with real employee search
 * Following NEWWORK design system
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation
} from '@newwork/nw-design-system'
import { Search, Loader2, Check } from 'lucide-react'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import type { SpaceMemberRole, AddMemberInput } from '../types/space.types'
import translations from '../_i18n'

export interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (input: AddMemberInput) => Promise<void>
  spaceId: string
  accessToken?: string
  'data-testid'?: string
}

// Get initials for avatar fallback
const getInitials = (name?: string) => {
  if (!name) return '??'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Convert picture thumbnail to data URL
const toAvatarUrl = (pictureThumbnail?: string): string | undefined => {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:') || pictureThumbnail.startsWith('http')) {
    return pictureThumbnail
  }
  return `data:image/jpeg;base64,${pictureThumbnail}`
}

export const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  open,
  onOpenChange,
  onInvite,
  accessToken,
  'data-testid': testId = 'invite-member-dialog'
}) => {
  const { t } = useTranslation(translations)
  const roleOptions: { role: SpaceMemberRole; label: string; description: string }[] = [
    { role: 'admin', label: t('common-admin'), description: t('members-role-admin-description') },
    { role: 'editor', label: t('common-editor'), description: t('members-role-editor-description') },
    { role: 'viewer', label: t('common-viewer'), description: t('members-role-viewer-description') }
  ]
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLiteOption | null>(null)
  const [selectedRole, setSelectedRole] = useState<SpaceMemberRole>('editor')
  const [isInviting, setIsInviting] = useState(false)

  const { employees, loading, search } = useEmployeeSearch(accessToken)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        search(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, search])

  const resetForm = useCallback(() => {
    setSearchQuery('')
    setSelectedEmployee(null)
    setSelectedRole('editor')
  }, [])

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetForm()
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, resetForm]
  )

  const handleInvite = useCallback(async () => {
    if (!selectedEmployee?.userId) return

    setIsInviting(true)
    try {
      const input: AddMemberInput = {
        role: selectedRole,
        userId: selectedEmployee.userId
      }
      await onInvite(input)
      resetForm()
      onOpenChange(false)
    } finally {
      setIsInviting(false)
    }
  }, [selectedEmployee, selectedRole, onInvite, resetForm, onOpenChange])

  const handleSelectEmployee = useCallback((employee: EmployeeLiteOption) => {
    setSelectedEmployee(employee)
    setSearchQuery('')
  }, [])

  // Filter out already selected employee from search results
  const filteredEmployees = employees.filter(e => e.id !== selectedEmployee?.id)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-md gba:p-0 gba:overflow-hidden" data-testid={testId}>
        {/* Header */}
        <DialogHeader className="gba:p-6 gba:pb-4">
          <DialogTitle className="gba:text-lg gba:font-semibold">{t('invite-title')}</DialogTitle>
          <DialogDescription className="gba:text-sm gba:text-muted-foreground">
            {t('invite-description')}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="gba:px-6 gba:pb-6 gba:space-y-5">
          {/* Selected Employee */}
          {selectedEmployee && (
            <div className="gba:p-3 gba:rounded-lg gba:bg-card gba:flex gba:items-center gba:gap-3">
              <Avatar className="gba:w-10 gba:h-10">
                {selectedEmployee.pictureThumbnail ? (
                  <AvatarImage
                    src={toAvatarUrl(selectedEmployee.pictureThumbnail)}
                    alt={selectedEmployee.displayName}
                  />
                ) : null}
                <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-sm">
                  {getInitials(selectedEmployee.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex-1 gba:min-w-0">
                <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                  {selectedEmployee.displayName}
                </p>
                {selectedEmployee.jobPositionName && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                    {selectedEmployee.jobPositionName}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEmployee(null)}
                className="gba:text-muted-foreground hover:gba:text-foreground"
              >
                {t('common-change')}
              </Button>
            </div>
          )}

          {/* Search Input */}
          {!selectedEmployee && (
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium">{t('invite-search-label')}</Label>
              <div className="gba:relative">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  placeholder={t('common-search-employees-placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="gba:pl-9 gba:h-10"
                  data-testid={`${testId}-search-input`}
                />
                {loading && (
                  <Loader2 className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {searchQuery.length >= 2 && filteredEmployees.length > 0 && (
                <div className="gba:max-h-48 gba:overflow-y-auto gba:rounded-lg gba:border gba:border-border gba:divide-y gba:divide-border">
                  {filteredEmployees.slice(0, 5).map(employee => (
                    <button
                      key={employee.id}
                      onClick={() => handleSelectEmployee(employee)}
                      className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:text-left gba:transition-colors hover:gba:bg-muted/50"
                      data-testid={`${testId}-employee-${employee.id}`}
                    >
                      <Avatar className="gba:w-8 gba:h-8">
                        {employee.pictureThumbnail ? (
                          <AvatarImage src={toAvatarUrl(employee.pictureThumbnail)} alt={employee.displayName} />
                        ) : null}
                        <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-xs">
                          {getInitials(employee.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                          {employee.displayName}
                        </p>
                        {employee.jobPositionName && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                            {employee.jobPositionName}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {searchQuery.length >= 2 && !loading && filteredEmployees.length === 0 && (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                  {t('invite-no-results')}
                </p>
              )}
            </div>
          )}

          {/* Role Selection */}
          {selectedEmployee && (
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium">{t('invite-role-label')}</Label>
              <div className="gba:space-y-1">
                {roleOptions.map(({ role, label, description }) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:text-left gba:transition-colors ${
                      selectedRole === role
                        ? 'gba:bg-primary/5 gba:ring-1 gba:ring-primary/20'
                        : 'hover:gba:bg-muted/50'
                    }`}
                    data-testid={`${testId}-role-${role}`}
                  >
                    <div className="gba:flex-1">
                      <p className="gba:text-sm gba:font-medium gba:text-foreground">{label}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">{description}</p>
                    </div>
                    {selectedRole === role && <Check className="gba:w-4 gba:h-4 gba:text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="gba:flex gba:gap-3 gba:pt-2">
            <Button variant="secondary" className="gba:flex-1" onClick={() => handleClose(false)} disabled={isInviting}>
              {t('common-cancel')}
            </Button>
            <Button
              className="gba:flex-1"
              onClick={handleInvite}
              disabled={!selectedEmployee || isInviting}
              data-testid={`${testId}-invite-button`}
            >
              {isInviting ? <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" /> : t('common-invite')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InviteMemberDialog
