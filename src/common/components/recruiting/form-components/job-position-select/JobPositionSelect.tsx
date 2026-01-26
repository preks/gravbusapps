import React from 'react'
import { Combobox, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Briefcase, User } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPositionSelect, type JobPositionOption } from './useJobPositionSelect'

export interface JobPositionSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onJobPositionChange?: (jobPosition: JobPositionOption | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string

  // Context
  businessAppContext?: BusinessAppContextProps
  accessToken?: string
  initialJobPosition?: JobPositionOption | null

  // Manual mode (for backward compatibility)
  jobPositions?: JobPositionOption[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

const JobPositionSelect = React.forwardRef<HTMLButtonElement, JobPositionSelectProps>(
  (
    {
      value,
      onValueChange,
      onJobPositionChange,
      placeholder = 'Search Job Position...',
      searchPlaceholder = 'Type to search...',
      className,
      'data-testid': dataTestId = 'job-position-select',
      businessAppContext,
      accessToken,
      initialJobPosition,
      jobPositions: manualJobPositions,
      onSearch: manualOnSearch,
      loading: manualLoading,
      hasMore: manualHasMore,
      onLoadMore: manualOnLoadMore,
      ...rest
    },
    ref
  ) => {
    const { jobPositionsWithInitial, loading, hasMore, onSearch, onLoadMore, handleValueChange } = useJobPositionSelect(
      {
        value,
        onValueChange,
        onJobPositionChange,
        businessAppContext,
        accessToken,
        initialJobPosition,
        jobPositions: manualJobPositions,
        onSearch: manualOnSearch,
        loading: manualLoading,
        hasMore: manualHasMore,
        onLoadMore: manualOnLoadMore
      }
    )

    // Build options
    const options = React.useMemo(() => {
      return jobPositionsWithInitial.map(pos => {
        return {
          value: pos.id,
          label: (
            <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Briefcase className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{pos.name}</div>
                </div>
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-xs gba:text-left gba:mt-1">
                  {pos.organizationalUnit?.name && (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <Building2 className="gba:w-3 gba:h-3" />
                      {pos.organizationalUnit.name}
                    </span>
                  )}
                  {pos.organizationalUnit?.name && pos.currentEmployee && <span>·</span>}
                  {pos.currentEmployee && (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <User className="gba:w-3 gba:h-3" />
                      {pos.currentEmployee.displayName}
                    </span>
                  )}
                </div>
              </div>
              {pos.currentEmployee && (
                <Avatar className="gba:self-center" size="sm">
                  {pos.currentEmployee.pictureThumbnail ? (
                    <AvatarImage
                      src={`data:image/jpeg;base64,${pos.currentEmployee.pictureThumbnail}`}
                      alt={pos.currentEmployee.displayName}
                    />
                  ) : (
                    <AvatarFallback className="gba:text-xs">
                      {(pos.currentEmployee.displayName || '?')
                        .split(' ')
                        .map(p => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              )}
            </div>
          )
        }
      })
    }, [jobPositionsWithInitial])

    return (
      <Combobox
        ref={ref as any}
        className={`gba:[&&]:h-auto ${className || ''}`}
        options={options as any}
        value={value || ''}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={loading ? 'Loading...' : 'No job positions found'}
        onSearch={onSearch}
        searchDebounce={300}
        loading={Boolean(loading)}
        onLoadMore={onLoadMore}
        hasMore={Boolean(hasMore)}
        data-testid={dataTestId}
        align="start"
        {...rest}
      />
    )
  }
)

JobPositionSelect.displayName = 'JobPositionSelect'

export default JobPositionSelect
