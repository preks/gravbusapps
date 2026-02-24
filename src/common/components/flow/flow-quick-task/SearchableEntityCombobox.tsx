import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Check,
  ChevronsUpDown,
  Loader2,
  X,
  Building,
  User,
  Target,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  Building2,
  TrendingUp,
  Briefcase,
  UserPlus
} from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
  cn
} from '@newwork/nw-design-system'
import { useUniversalEntitySearch, UniversalEntityOption, UniversalEntityType } from './hooks/useUniversalEntitySearch'
import { base64ToDataURL } from '@/business-apps/core/every/apps/every-box/utils/avatarUtils'

interface SearchableEntityComboboxProps {
  accessToken: string
  onChange?: (entityId: string, entityData: UniversalEntityOption | null) => void
  placeholder?: string
  disabled?: boolean
  entityTypes?: UniversalEntityType[]
  'data-testid'?: string
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building,
  User,
  Target,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  Building2,
  TrendingUp,
  Briefcase,
  UserPlus
}

const entityTypeLabels: Record<UniversalEntityType, string> = {
  account: 'Account',
  lead: 'Lead',
  contact: 'Contact',
  opportunity: 'Opportunity',
  employee: 'Employee',
  absence: 'Absence',
  'expense-request': 'Expense',
  'expense-plan': 'Plan',
  'expense-item': 'Item',
  'investment-account': 'Inv. Account',
  'investment-lead': 'Inv. Lead',
  'investment-opportunity': 'Inv. Opportunity',
  investment: 'Investment'
}

const entityTypeBadgeColors: Record<UniversalEntityType, string> = {
  account: 'gba:bg-blue-100 gba:text-blue-800',
  lead: 'gba:bg-purple-100 gba:text-purple-800',
  contact: 'gba:bg-green-100 gba:text-green-800',
  opportunity: 'gba:bg-orange-100 gba:text-orange-800',
  employee: 'gba:bg-cyan-100 gba:text-cyan-800',
  absence: 'gba:bg-yellow-100 gba:text-yellow-800',
  'expense-request': 'gba:bg-red-100 gba:text-red-800',
  'expense-plan': 'gba:bg-pink-100 gba:text-pink-800',
  'expense-item': 'gba:bg-rose-100 gba:text-rose-800',
  'investment-account': 'gba:bg-indigo-100 gba:text-indigo-800',
  'investment-lead': 'gba:bg-violet-100 gba:text-violet-800',
  'investment-opportunity': 'gba:bg-fuchsia-100 gba:text-fuchsia-800',
  investment: 'gba:bg-slate-100 gba:text-slate-800'
}

export const SearchableEntityCombobox: React.FC<SearchableEntityComboboxProps> = ({
  accessToken,
  onChange,
  placeholder = 'Search for any entity...',
  disabled = false,
  entityTypes,
  'data-testid': dataTestId = 'searchable-entity-combobox'
}) => {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<UniversalEntityOption | null>(null)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const { entities, loading, error, searchEntities } = useUniversalEntitySearch({
    accessToken,
    entityTypes,
    limit: 50
  })

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim().length >= 2) {
      searchEntities(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchEntities])

  const handleSelect = useCallback(
    (entity: UniversalEntityOption) => {
      setSelectedEntity(entity)
      setOpen(false)
      onChange?.(entity.id, entity)
    },
    [onChange]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedEntity(null)
      setSearchTerm('')
      onChange?.('', null)
    },
    [onChange]
  )

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  const getIcon = (iconName?: string) => {
    if (!iconName) return null
    const IconComponent = iconMap[iconName]
    return IconComponent ? <IconComponent className="gba:h-4 gba:w-4 gba:mr-2" /> : null
  }

  // Convert base64 avatar to Object URL
  const convertAvatarUrl = (avatarUrl?: string): string | undefined => {
    if (!avatarUrl) return undefined
    // If already an HTTP URL, return as is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl
    }
    // Convert base64 to data URL (no memory leak)
    return base64ToDataURL(avatarUrl)
  }

  // Memoize converted avatar URL for selected entity
  const selectedAvatarUrl = useMemo(() => {
    return convertAvatarUrl(selectedEntity?.avatarUrl)
  }, [selectedEntity?.avatarUrl])

  return (
    <div className="gba:w-full" data-testid={dataTestId}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="gba:w-full gba:justify-between gba:h-10"
            data-testid={`${dataTestId}-trigger`}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
              {selectedEntity ? (
                <>
                  {selectedAvatarUrl ? (
                    <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
                      <AvatarImage src={selectedAvatarUrl} alt={selectedEntity.name} />
                      <AvatarFallback>{getInitials(selectedEntity.name)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    getIcon(selectedEntity.icon)
                  )}
                  <span className="gba:truncate gba:text-sm gba:font-medium">{selectedEntity.name}</span>
                  <Badge className={cn('gba:text-xs gba:shrink-0', entityTypeBadgeColors[selectedEntity.type])}>
                    {entityTypeLabels[selectedEntity.type]}
                  </Badge>
                </>
              ) : (
                <span className="gba:text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <div className="gba:flex gba:items-center gba:gap-1 gba:ml-2 gba:shrink-0">
              {selectedEntity && !disabled && (
                <button
                  type="button"
                  className="gba:h-6 gba:w-6 gba:p-0 gba:rounded gba:flex gba:items-center gba:justify-center hover:gba:bg-accent gba:cursor-pointer"
                  onClick={handleClear}
                  data-testid={`${dataTestId}-clear`}
                  aria-label="Clear selection"
                >
                  <X className="gba:h-4 gba:w-4" />
                </button>
              )}
              <ChevronsUpDown className="gba:h-4 gba:w-4 gba:shrink-0 gba:opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-[400px] gba:p-0" align="start" data-testid={`${dataTestId}-popover`}>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search entities..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              data-testid={`${dataTestId}-search-input`}
            />
            <CommandList>
              {loading && (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
                  <Loader2 className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
                </div>
              )}

              {error && (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-destructive">
                  Error loading entities. Please try again.
                </div>
              )}

              {!loading && !error && searchTerm.trim().length < 2 && (
                <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
              )}

              {!loading && !error && searchTerm.trim().length >= 2 && entities.length === 0 && (
                <CommandEmpty>No entities found.</CommandEmpty>
              )}

              {!loading && !error && entities.length > 0 && (
                <CommandGroup>
                  {entities.map(entity => {
                    const entityAvatarUrl = convertAvatarUrl(entity.avatarUrl)
                    return (
                      <CommandItem
                        key={`${entity.type}-${entity.id}`}
                        value={`${entity.type}-${entity.id}`}
                        onSelect={() => handleSelect(entity)}
                        className="gba:cursor-pointer"
                        data-testid={`${dataTestId}-option-${entity.type}-${entity.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                          {entityAvatarUrl ? (
                            <Avatar className="gba:h-8 gba:w-8 gba:shrink-0">
                              <AvatarImage src={entityAvatarUrl} alt={entity.name} />
                              <AvatarFallback>{getInitials(entity.name)}</AvatarFallback>
                            </Avatar>
                          ) : (
                            getIcon(entity.icon)
                          )}
                          <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:text-sm gba:font-medium gba:truncate">{entity.name}</span>
                              <Badge className={cn('gba:text-xs gba:shrink-0', entityTypeBadgeColors[entity.type])}>
                                {entityTypeLabels[entity.type]}
                              </Badge>
                            </div>
                            {entity.subtitle && (
                              <span className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                {entity.subtitle}
                              </span>
                            )}
                          </div>
                          {selectedEntity?.id === entity.id && selectedEntity?.type === entity.type && (
                            <Check className="gba:h-4 gba:w-4 gba:shrink-0" />
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
