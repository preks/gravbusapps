import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { CheckCircle, MagnifyingGlass, PaperPlaneTilt, X } from '@phosphor-icons/react'
import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import type { PermissionOption } from '../types'
import { getInitials } from './shareEntityDialogUtils'

interface ShareEntityDialogInviteSectionProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
  isSearching: boolean
  filteredResults: EmployeeLiteOption[]
  selectedUsers: EmployeeLiteOption[]
  toggleUser: (user: EmployeeLiteOption) => void
  removeUser: (userId?: string) => void
  selectedPermission: string
  setSelectedPermission: (value: string) => void
  permissionOptions: PermissionOption[]
  showShareMessage: boolean
  message: string
  setMessage: (value: string) => void
  sentSuccess: boolean
  successMessage: string
  error: string | null
  isSharing: boolean
  onShare: () => void
  testId: string
  t: (key: string, vars?: Record<string, unknown>) => string
}

export function ShareEntityDialogInviteSection({
  searchQuery,
  setSearchQuery,
  isSearching,
  filteredResults,
  selectedUsers,
  toggleUser,
  removeUser,
  selectedPermission,
  setSelectedPermission,
  permissionOptions,
  showShareMessage,
  message,
  setMessage,
  sentSuccess,
  successMessage,
  error,
  isSharing,
  onShare,
  testId,
  t
}: ShareEntityDialogInviteSectionProps) {
  return (
    <div className="gba:space-y-3">
      <Label className="gba:text-sm gba:font-medium">{t('share-add-people')}</Label>

      <div className="gba:relative">
        <MagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <Input
          id={`${testId}-search`}
          placeholder={t('share-search-placeholder')}
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          className="gba:pl-10"
          data-testid={`${testId}-search-input`}
        />
      </div>

      {searchQuery.trim().length >= 2 && (
        <div className="gba:max-h-48 gba:overflow-y-auto gba:rounded-md gba:border" data-testid={`${testId}-results`}>
          {isSearching ? (
            <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">{t('share-searching')}</div>
          ) : filteredResults.length > 0 ? (
            <div className="gba:divide-y">
              {filteredResults.map(employee => {
                const isSelected = selectedUsers.some(user => user.userId === employee.userId)
                return (
                  <div
                    key={employee.id || employee.userId}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleUser(employee)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleUser(employee)
                      }
                    }}
                    className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:p-3 hover:gba:bg-accent focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2"
                    data-testid={`${testId}-result-${employee.userId}`}
                  >
                    <Checkbox checked={isSelected} className="gba:pointer-events-none" />
                    <Avatar className="gba:h-8 gba:w-8">
                      {employee.pictureThumbnail ? (
                        <AvatarImage
                          src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                          alt={employee.displayName}
                        />
                      ) : (
                        <AvatarFallback>{getInitials(employee.displayName)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="gba:min-w-0 gba:flex-1">
                      <p className="gba:truncate gba:text-sm gba:font-medium">{employee.displayName}</p>
                      <p className="gba:truncate gba:text-xs gba:text-muted-foreground">
                        {employee.organizationalUnitName || employee.jobPositionName || ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">{t('share-no-users')}</div>
          )}
        </div>
      )}

      {selectedUsers.length > 0 && (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs gba:text-muted-foreground">
            {t('share-selected', { count: selectedUsers.length })}
          </Label>
          <div className="gba:max-h-32 gba:space-y-2 gba:overflow-y-auto">
            {selectedUsers.map(user => (
              <div
                key={user.userId}
                className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:bg-accent/50 gba:p-2"
              >
                <Avatar className="gba:h-8 gba:w-8">
                  {user.pictureThumbnail ? (
                    <AvatarImage src={`data:image/jpeg;base64,${user.pictureThumbnail}`} alt={user.displayName} />
                  ) : (
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="gba:min-w-0 gba:flex-1">
                  <p className="gba:truncate gba:text-sm gba:font-medium">{user.displayName}</p>
                  <p className="gba:truncate gba:text-xs gba:text-muted-foreground">
                    {user.organizationalUnitName || user.jobPositionName || ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUser(user.userId)}
                  className="gba:h-6 gba:w-6 gba:p-0"
                  data-testid={`${testId}-selected-user-${user.userId}`}
                >
                  <X className="gba:h-3 gba:w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Label className="gba:text-xs">{t('share-permission-label')}</Label>
            <Select value={selectedPermission} onValueChange={setSelectedPermission}>
              <SelectTrigger className="gba:w-40" data-testid={`${testId}-permission-select`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {permissionOptions.map(option => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Icon className="gba:h-4 gba:w-4" />
                        {t(option.labelKey)}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          {showShareMessage && (
            <div className="gba:space-y-2">
              <Label className="gba:text-xs">{t('share-message-label')}</Label>
              <Textarea
                value={message}
                onChange={event => setMessage(event.target.value)}
                placeholder={t('share-message-placeholder')}
                data-testid={`${testId}-message-input`}
              />
            </div>
          )}
        </div>
      )}

      {sentSuccess && (
        <div
          className="gba:rounded-lg gba:border gba:border-success/20 gba:bg-success/10 gba:p-3"
          data-testid={`${testId}-success`}
        >
          <div className="gba:flex gba:items-start gba:gap-2">
            <CheckCircle className="gba:mt-0.5 gba:h-5 gba:w-5 gba:flex-shrink-0 gba:text-success" />
            <div className="gba:min-w-0">
              <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('share-success-title')}</p>
              {successMessage ? (
                <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{successMessage}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="gba:text-sm gba:text-destructive" data-testid={`${testId}-error`}>
          {error}
        </p>
      )}

      {selectedUsers.length > 0 && !sentSuccess && (
        <Button onClick={onShare} disabled={isSharing} className="gba:w-full" data-testid={`${testId}-submit-button`}>
          <PaperPlaneTilt className="gba:mr-2 gba:h-4 gba:w-4" />
          {isSharing ? t('share-sharing') : t('share-submit', { count: selectedUsers.length })}
        </Button>
      )}
    </div>
  )
}
