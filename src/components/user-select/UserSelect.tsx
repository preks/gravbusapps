import React from 'react'
import { Combobox, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Mail } from 'lucide-react'
import type { User } from '@/common/network/users'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useUserSelect } from './useUserSelect'

/**
 * User type for UserSelect component
 */
export type UserSelectOption = User

export interface UserSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onUserChange?: (user: UserSelectOption | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  'data-testid'?: string

  // Context - only accessToken required
  accessToken?: string
  initialUser?: UserSelectOption | null

  // Optional: Filter options
  activeOnly?: boolean // Only show active users (default: true)
}

const UserSelect = React.forwardRef<HTMLButtonElement, UserSelectProps>(
  (
    {
      value,
      onValueChange,
      onUserChange,
      placeholder = getTranslationFromI18nKeyAndLabel('common.user.search.placeholder', 'Search User...'),
      searchPlaceholder = getTranslationFromI18nKeyAndLabel(
        'common.user.search.input.placeholder',
        'Type to search users...'
      ),
      className,
      'data-testid': dataTestId = 'user-select',
      accessToken,
      initialUser,
      activeOnly = true,
      ...rest
    },
    ref
  ) => {
    const { users, loading, hasMore, onSearch, onLoadMore, handleValueChange } = useUserSelect({
      value,
      onValueChange,
      onUserChange,
      accessToken,
      initialUser,
      activeOnly
    })

    // Build options
    const options = React.useMemo(() => {
      return users.map(user => {
        // Create initials from name
        const initials = (user.name || user.email || '?')
          .split(' ')
          .filter(Boolean) // Remove empty strings from consecutive spaces
          .map(p => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        return {
          value: user.id,
          label: (
            <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
              <Avatar className="gba:self-center" size="sm">
                {user.picture ? (
                  <AvatarImage src={user.picture} alt={user.name} />
                ) : (
                  <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{user.name}</div>
                {user.email && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:text-left">
                    <Mail className="gba:w-3 gba:h-3" />
                    <span className="gba:truncate">{user.email}</span>
                  </div>
                )}
              </div>
            </div>
          )
        }
      })
    }, [users])

    // Get selected user for display
    const selectedUser = React.useMemo(() => {
      if (!value) return null
      return users.find(u => u.id === value)
    }, [value, users])

    // Selected value display
    const selectedValueDisplay = selectedUser ? (
      <div className="gba:flex gba:items-center gba:gap-2 gba:py-1">
        <Avatar size="sm">
          {selectedUser.picture ? (
            <AvatarImage src={selectedUser.picture} alt={selectedUser.name} />
          ) : (
            <AvatarFallback className="gba:text-xs">
              {(selectedUser.name || selectedUser.email || '?')
                .split(' ')
                .filter(Boolean) // Remove empty strings from consecutive spaces
                .map(p => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="gba:flex gba:flex-col gba:min-w-0 gba:gap-0.5">
          <span className="gba:text-sm gba:truncate gba:leading-tight">{selectedUser.name}</span>
          {selectedUser.email && (
            <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:leading-tight">
              {selectedUser.email}
            </span>
          )}
        </div>
      </div>
    ) : undefined

    return (
      <Combobox
        ref={ref as any}
        value={value || ''}
        onValueChange={handleValueChange}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        selectedValueDisplay={selectedValueDisplay}
        emptyText={
          loading
            ? getTranslationFromI18nKeyAndLabel('common.user.loading', 'Loading users...')
            : getTranslationFromI18nKeyAndLabel('common.user.empty', 'No users found')
        }
        onSearch={onSearch}
        searchDebounce={300}
        loading={Boolean(loading)}
        hasMore={Boolean(hasMore)}
        onLoadMore={onLoadMore}
        className={`gba:[&&]:h-auto ${className || ''}`}
        data-testid={dataTestId}
        align="start"
        {...rest}
      />
    )
  }
)

UserSelect.displayName = 'UserSelect'

export { UserSelect }
