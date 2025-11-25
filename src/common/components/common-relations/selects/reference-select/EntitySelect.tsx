import React from 'react'
import { Combobox, Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { Rocket } from 'lucide-react'

export interface EntitySelectOption {
  id: string
  name: string
  type: string
  subtitle?: string
  pictureThumbnail?: string
}

export interface EntitySelectProps {
  value?: string | null
  entities: EntitySelectOption[]
  onValueChange?: (value: string | null) => void
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string
}

// Helper function to render avatar content
const renderAvatarContent = (entity: EntitySelectOption, initials: string): React.ReactNode => {
  if (entity.pictureThumbnail) {
    return <AvatarImage src={`data:image/jpeg;base64,${entity.pictureThumbnail}`} alt={entity.name} />
  }
  if (entity.type === 'opportunity') {
    return (
      <AvatarFallback className="gba:text-xs">
        <Rocket className="gba:w-3 gba:h-3" />
      </AvatarFallback>
    )
  }
  return <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
}

const EntitySelect = React.forwardRef<HTMLButtonElement, EntitySelectProps & Record<string, any>>(
  (
    {
      value,
      entities,
      onValueChange,
      onSearch,
      loading,
      hasMore,
      onLoadMore,
      placeholder = 'Search leads, contacts, accounts, opportunities, or investments...',
      searchPlaceholder = 'Type to search...',
      className,
      'data-testid': dataTestId = 'entity-select',
      ...rest
    },
    ref
  ) => {
    const options: any[] = React.useMemo(() => {
      return (entities || []).map((e: EntitySelectOption) => {
        const initials = (e.name || '?')
          .split(' ')
          .map((p: string) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
        const typeLabel = String(e.type).charAt(0).toUpperCase() + String(e.type).slice(1)
        return {
          value: e.id,
          label: (
            <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
              <Avatar className="gba:h-6 gba:w-6 gba:self-center">{renderAvatarContent(e, initials)}</Avatar>
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                <div className="gba:flex gba:items-center gba:w-full">
                  <div className="gba:flex-1 gba:min-w-0 gba:text-sm gba:font-medium gba:truncate gba:text-left">
                    {e.name}
                  </div>
                  <Badge className="gba:ml-2 gba:text-[10px]">{typeLabel}</Badge>
                </div>
                <div className="gba:text-xs gba:truncate gba:text-left">{e.subtitle || '\u00A0'}</div>
              </div>
            </div>
          )
        } as any
      })
    }, [entities])

    return (
      <Combobox
        ref={ref as any}
        className={`gba:[&&]:h-auto ${className || ''}`}
        options={options as any}
        value={value || ''}
        onValueChange={onValueChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={loading ? 'Loading...' : 'No results'}
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

EntitySelect.displayName = 'EntitySelect'

export default EntitySelect
