import React from 'react'
import { Combobox } from '@newwork/nw-design-system'
import { Briefcase } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobProfileSelect, type JobProfileOption } from './useJobProfileSelect'

export interface JobProfileSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onJobProfileChange?: (jobProfile: JobProfileOption | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string

  // Context
  businessAppContext?: BusinessAppContextProps
  accessToken?: string
  initialJobProfile?: JobProfileOption | null

  // Manual mode (for backward compatibility)
  jobProfiles?: JobProfileOption[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

const JobProfileSelect = React.forwardRef<HTMLButtonElement, JobProfileSelectProps>(
  (
    {
      value,
      onValueChange,
      onJobProfileChange,
      placeholder = 'Search Job Profile...',
      searchPlaceholder = 'Type to search...',
      className,
      'data-testid': dataTestId = 'job-profile-select',
      businessAppContext,
      accessToken,
      initialJobProfile,
      jobProfiles: manualJobProfiles,
      onSearch: manualOnSearch,
      loading: manualLoading,
      hasMore: manualHasMore,
      onLoadMore: manualOnLoadMore,
      ...rest
    },
    ref
  ) => {
    const { jobProfilesWithInitial, loading, hasMore, onSearch, onLoadMore, handleValueChange } = useJobProfileSelect({
      onValueChange,
      onJobProfileChange,
      businessAppContext,
      accessToken,
      initialJobProfile,
      jobProfiles: manualJobProfiles,
      onSearch: manualOnSearch,
      loading: manualLoading,
      hasMore: manualHasMore,
      onLoadMore: manualOnLoadMore
    })

    // Build options
    const options = React.useMemo(() => {
      return jobProfilesWithInitial.map(profile => {
        const displayName = profile.name || profile.code || 'Unknown'
        return {
          value: profile.id,
          label: (
            <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
              <Briefcase className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{displayName}</div>
                {profile.code && profile.code !== displayName && (
                  <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:text-left">{profile.code}</div>
                )}
                {profile.description && (
                  <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:text-left">
                    {profile.description}
                  </div>
                )}
              </div>
            </div>
          )
        }
      })
    }, [jobProfilesWithInitial])

    return (
      <Combobox
        ref={ref as any}
        className={`gba:[&&]:h-auto ${className || ''}`}
        options={options as any}
        value={value || ''}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={loading ? 'Loading...' : 'No job profiles found'}
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

JobProfileSelect.displayName = 'JobProfileSelect'

export default JobProfileSelect
