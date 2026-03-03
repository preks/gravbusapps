import React, { useState } from 'react'
import {
  Button,
  Combobox,
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { PlusIcon, XIcon } from '@phosphor-icons/react'
import { Briefcase } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  pictureThumbnail?: string
  extraInfo?: {
    accountName?: string
    companyName?: string
    estimatedAmount?: number
    currency?: string
    closeDate?: string
    pipeline?: string
    stage?: string
    ownerEmployee?: {
      firstName?: string
      lastName?: string
    }
  }
}

interface OpportunityValue {
  id: string
  name: string
  pictureThumbnail?: string
}

interface OpportunitySelectProps {
  value: OpportunityValue | string | null
  onChange: (opportunityId: string | OpportunityValue | { id: string; name: string } | null) => void
  dataTestId?: string
  error?: string | null

  // Opportunity data passed as props
  opportunities: SelectOption[]
  opportunitiesLoading: boolean
  opportunitiesError: string | null
  searchOpportunities: (search: string) => void

  // Component behavior
  multiple?: boolean
}

const OpportunitySelect: React.FC<OpportunitySelectProps> = ({
  value,
  onChange,
  dataTestId,
  error,
  opportunities,
  opportunitiesLoading,
  opportunitiesError,
  searchOpportunities,
  multiple = false
}) => {
  // Helper function to extract ID from value (string or object)
  const getOpportunityId = (opportunityValue: string | OpportunityValue): string => {
    return typeof opportunityValue === 'object' ? opportunityValue.id : opportunityValue
  }

  // Normalize value to always work with arrays internally
  const normalizedValue: Array<string | OpportunityValue> = React.useMemo(() => {
    if (Array.isArray(value)) return value
    if (value === null || value === '') return []
    return [value]
  }, [value])

  // Internal state to preserve opportunity names when adding new opportunities
  const [internalValue, setInternalValue] = useState<Array<string | OpportunityValue>>(normalizedValue)
  const [mergedOpportunities, setMergedOpportunities] = useState<SelectOption[]>([])
  const [showAddExisting, setShowAddExisting] = useState(false)

  // Sync internal value with prop value
  React.useEffect(() => {
    const currentIds = new Set(internalValue.map(v => getOpportunityId(v)))
    const newIds = new Set(normalizedValue.map(v => getOpportunityId(v)))

    // Only update if IDs actually changed
    const idsChanged =
      currentIds.size !== newIds.size ||
      [...currentIds].some(id => !newIds.has(id)) ||
      [...newIds].some(id => !currentIds.has(id))

    if (idsChanged) {
      setInternalValue(normalizedValue)
    }
  }, [normalizedValue])

  // Merge pre-selected opportunities with loaded opportunities
  React.useEffect(() => {
    const preSelectedOpportunities: SelectOption[] = []

    if (internalValue.length > 0) {
      internalValue.forEach(val => {
        if (typeof val === 'object' && val.id && val.name) {
          const existsInLoadedOpportunities = opportunities.some(o => o.id === val.id)
          if (!existsInLoadedOpportunities) {
            preSelectedOpportunities.push({
              id: val.id,
              value: val.id,
              label: val.name,
              name: val.name
            })
          }
        }
      })
    }

    setMergedOpportunities([...preSelectedOpportunities, ...opportunities])
  }, [internalValue, opportunities])

  // Helper to get opportunity data for display
  const getOpportunityData = (opportunityValue: string | OpportunityValue): SelectOption | null => {
    const opportunityId = getOpportunityId(opportunityValue)
    const nameFromValue = typeof opportunityValue === 'object' && opportunityValue.name ? opportunityValue.name : null

    // Try to find in merged opportunities
    const opportunityFromMerged = mergedOpportunities.find(o => o.id === opportunityId)
    if (opportunityFromMerged) {
      return {
        ...opportunityFromMerged,
        label: nameFromValue || opportunityFromMerged.label || opportunityFromMerged.name,
        name: nameFromValue || opportunityFromMerged.name
      }
    }

    // Fallback
    if (nameFromValue) {
      return {
        id: opportunityId,
        value: opportunityId,
        label: nameFromValue,
        name: nameFromValue
      }
    }

    return null
  }

  // Handle add opportunity
  const handleAddOpportunity = (opportunityId: string) => {
    if (!opportunityId) return

    const selectedOpportunity = mergedOpportunities.find(o => o.id === opportunityId)
    if (!selectedOpportunity) return

    const newOpportunity: OpportunityValue = {
      id: opportunityId,
      name: selectedOpportunity.label || selectedOpportunity.name,
      pictureThumbnail: selectedOpportunity.pictureThumbnail
    }
    const newValue = multiple ? [...internalValue, newOpportunity] : [newOpportunity]
    setInternalValue(newValue)

    if (multiple) {
      onChange(newValue as any)
    } else {
      onChange(newOpportunity)
    }
    setShowAddExisting(false)
  }

  // Handle remove opportunity
  const handleRemoveOpportunity = (opportunityId: string) => {
    const newValue = internalValue.filter(o => getOpportunityId(o) !== opportunityId)
    setInternalValue(newValue)
    onChange(multiple ? (newValue as any) : newValue[0] || '')
  }

  // Filter out already selected opportunities
  const selectedOpportunityIds = new Set(internalValue.map(o => getOpportunityId(o)))
  const availableOpportunityOptions = React.useMemo(() => {
    return mergedOpportunities
      .filter(o => !selectedOpportunityIds.has(o.id))
      .map(o => {
        const accountInfo = o.extraInfo?.accountName ? ` - ${o.extraInfo.accountName}` : ''
        const stageInfo = o.extraInfo?.stage ? ` (${o.extraInfo.stage})` : ''
        const label = `${o.label}${accountInfo}${stageInfo}`
        return {
          value: o.id,
          label
        }
      })
  }, [mergedOpportunities, selectedOpportunityIds])

  // Empty state (only for multiple mode)
  if (multiple && internalValue.length === 0 && !showAddExisting) {
    return (
      <div className="gba:space-y-2">
        <button
          type="button"
          className="gba:border-2 gba:border-dashed gba:border-muted-foreground/25 gba:rounded-lg gba:p-6 gba:text-center gba:cursor-pointer hover:gba:border-muted-foreground/50 gba:transition-colors gba:w-full gba:bg-transparent"
          onClick={() => setShowAddExisting(true)}
          data-testid={formatDataTestId(dataTestId || 'opportunity-list', 'empty-state')}
        >
          <PlusIcon className="gba:mx-auto gba:h-8 gba:w-8 gba:text-muted-foreground gba:mb-2" />
          <p className="gba:text-sm gba:text-muted-foreground">
            No opportunities selected. Click to add an opportunity.
          </p>
        </button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {opportunitiesError && (
          <Alert variant="destructive">
            <AlertDescription>{opportunitiesError}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div className="gba:space-y-2" data-testid={dataTestId || 'opportunity-list'}>
      {/* Combobox for adding opportunities */}
      {showAddExisting && (
        <div className="gba:space-y-2">
          <Combobox
            value=""
            onValueChange={handleAddOpportunity}
            options={availableOpportunityOptions}
            placeholder="Search and select opportunity..."
            searchPlaceholder="Search opportunities..."
            emptyText={opportunitiesLoading ? 'Loading...' : 'No opportunities found'}
            disabled={opportunitiesLoading}
            loading={opportunitiesLoading}
            onSearch={searchOpportunities}
            data-testid={formatDataTestId(dataTestId || 'opportunity-list', 'combobox')}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAddExisting(false)}
            data-testid={formatDataTestId(dataTestId || 'opportunity-list', 'cancel-add')}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Add Opportunity Button */}
      {multiple && !showAddExisting && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddExisting(true)}
          className="gba:w-full"
          data-testid={formatDataTestId(dataTestId || 'opportunity-list', 'add-button')}
        >
          <PlusIcon className="gba:mr-2 gba:h-4 gba:w-4" />
          Add Opportunity
        </Button>
      )}

      {/* For single-select mode: show combobox immediately if no value */}
      {!multiple && internalValue.length === 0 && (
        <Combobox
          value=""
          onValueChange={handleAddOpportunity}
          options={availableOpportunityOptions}
          placeholder="Search and select opportunity..."
          searchPlaceholder="Search opportunities..."
          emptyText={opportunitiesLoading ? 'Loading...' : 'No opportunities found'}
          disabled={opportunitiesLoading}
          loading={opportunitiesLoading}
          onSearch={searchOpportunities}
          data-testid={formatDataTestId(dataTestId || 'opportunity-list', 'combobox')}
        />
      )}

      {/* Selected Opportunities List */}
      {internalValue.length > 0 && (
        <div
          className="gba:space-y-2"
          data-testid={formatDataTestId(dataTestId || 'opportunity-list', 'selected-list')}
        >
          {internalValue.map((opportunity, index) => {
            const opportunityId = getOpportunityId(opportunity)
            const opportunityData = getOpportunityData(opportunity)

            if (!opportunityData) return null

            return (
              <div
                key={opportunityId}
                className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg gba:bg-card"
                data-testid={formatDataTestId(dataTestId || 'opportunity-list', `opportunity-${index}`)}
              >
                {/* Avatar */}
                <Avatar size="sm" className="gba:flex-shrink-0">
                  {opportunityData.pictureThumbnail ? (
                    <AvatarImage src={opportunityData.pictureThumbnail} alt={opportunityData.label} />
                  ) : (
                    <AvatarFallback>
                      <Briefcase className="gba:h-4 gba:w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Opportunity Info */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:truncate gba:font-medium">{opportunityData.label}</div>
                  {opportunityData.extraInfo?.accountName && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {opportunityData.extraInfo.accountName}
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveOpportunity(opportunityId)}
                  data-testid={formatDataTestId(dataTestId || 'opportunity-list', `remove-${index}`)}
                  aria-label={`Remove ${opportunityData.label}`}
                >
                  <XIcon className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Error Display */}
      {(error || opportunitiesError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || opportunitiesError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default OpportunitySelect
