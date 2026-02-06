/**
 * Shared DimensionPicker component for selecting organizational groups
 * Used by both chat (group chats) and spaces (dimension-based spaces)
 */

import React, { useState, useMemo } from 'react'
import {
  Button,
  Input,
  Label,
  Spinner,
  Avatar,
  IconAvatar,
  RadioGroup,
  RadioGroupItem,
  ScrollArea
} from '@newwork/nw-design-system'
import {
  MagnifyingGlass,
  Buildings,
  UsersThree,
  MapPin,
  Check,
  CaretRight,
  Bank,
  Lightning
} from '@phosphor-icons/react'
import { UserIcon } from 'lucide-react'
import type { OrgUserBasic } from '@/common/network/org-directory/OrgDirectoryClient'
import type { DimensionType, DimensionOption, DimensionPickerTranslations } from '../types/dimensions'
import { DEFAULT_DIMENSION_TRANSLATIONS } from '../types/dimensions'

type Step = 'select_type' | 'select_dimension' | 'confirm_members'

interface DimensionTypeConfig {
  type: DimensionType
  labelKey: keyof DimensionPickerTranslations
  icon: React.ElementType
}

const DIMENSION_TYPES: DimensionTypeConfig[] = [
  { type: 'organization_unit', labelKey: 'organizationUnit', icon: Buildings },
  { type: 'matrix_team', labelKey: 'matrixTeam', icon: UsersThree },
  { type: 'location', labelKey: 'location', icon: MapPin },
  { type: 'legal_entity', labelKey: 'legalEntity', icon: Bank },
  { type: 'capability', labelKey: 'capability', icon: Lightning }
]

export interface DimensionPickerProps {
  organizationalUnits: DimensionOption[]
  matrixTeams: DimensionOption[]
  locations: DimensionOption[]
  legalEntities: DimensionOption[]
  capabilities: DimensionOption[]
  isLoadingDimensions: boolean
  isLoadingMembers: boolean
  selectedMembers: OrgUserBasic[]
  onDimensionSelect: (type: DimensionType, dimensionId: string) => void
  /** Called when user confirms the selection with members and dimension info */
  onConfirm: (members: OrgUserBasic[], dimensionName: string, dimensionType: DimensionType, dimensionId: string) => void
  onCancel: () => void
  currentUserId?: string | null
  /** Custom translations - defaults to English */
  translations?: Partial<DimensionPickerTranslations>
  'data-testid'?: string
}

export const DimensionPicker: React.FC<DimensionPickerProps> = ({
  organizationalUnits,
  matrixTeams,
  locations,
  legalEntities,
  capabilities,
  isLoadingDimensions,
  isLoadingMembers,
  selectedMembers,
  onDimensionSelect,
  onConfirm,
  onCancel,
  currentUserId,
  translations: customTranslations,
  'data-testid': testId = 'dimension-picker'
}) => {
  // Merge custom translations with defaults
  const t = useMemo(() => ({ ...DEFAULT_DIMENSION_TRANSLATIONS, ...customTranslations }), [customTranslations])

  const [step, setStep] = useState<Step>('select_type')
  const [selectedType, setSelectedType] = useState<DimensionType | null>(null)
  const [selectedDimension, setSelectedDimension] = useState<DimensionOption | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Get dimension options based on selected type
  const dimensionOptions = useMemo(() => {
    switch (selectedType) {
      case 'organization_unit':
        return organizationalUnits
      case 'matrix_team':
        return matrixTeams
      case 'location':
        return locations
      case 'legal_entity':
        return legalEntities
      case 'capability':
        return capabilities
      default:
        return []
    }
  }, [selectedType, organizationalUnits, matrixTeams, locations, legalEntities, capabilities])

  // Filter dimension options by search
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return dimensionOptions
    const query = searchQuery.toLowerCase()
    return dimensionOptions.filter(opt => opt.name.toLowerCase().includes(query))
  }, [dimensionOptions, searchQuery])

  // Filter out current user from members
  const filteredMembers = useMemo(() => {
    return selectedMembers.filter(m => m.id !== currentUserId)
  }, [selectedMembers, currentUserId])

  // Handle dimension type selection
  const handleTypeSelect = (type: DimensionType) => {
    setSelectedType(type)
    setSelectedDimension(null)
    setSearchQuery('')
    setStep('select_dimension')
  }

  // Handle specific dimension selection
  const handleDimensionSelect = (dimension: DimensionOption) => {
    setSelectedDimension(dimension)
    onDimensionSelect(selectedType!, dimension.id)
    setStep('confirm_members')
  }

  // Handle back navigation
  const handleBack = () => {
    if (step === 'confirm_members') {
      setStep('select_dimension')
      setSelectedDimension(null)
    } else if (step === 'select_dimension') {
      setStep('select_type')
      setSelectedType(null)
      setSearchQuery('')
    }
  }

  // Handle confirm
  const handleConfirm = () => {
    if (selectedDimension && selectedType && filteredMembers.length > 0) {
      onConfirm(filteredMembers, selectedDimension.name, selectedType, selectedDimension.id)
    }
  }

  // Get dimension type label
  const getTypeName = (type: DimensionType): string => {
    const dim = DIMENSION_TYPES.find(d => d.type === type)
    return dim ? t[dim.labelKey] : ''
  }

  // Get count for dimension type
  const getCount = (type: DimensionType): number => {
    switch (type) {
      case 'organization_unit':
        return organizationalUnits.length
      case 'matrix_team':
        return matrixTeams.length
      case 'location':
        return locations.length
      case 'legal_entity':
        return legalEntities.length
      case 'capability':
        return capabilities.length
      default:
        return 0
    }
  }

  // Get icon for selected dimension type
  const getDimensionIcon = () => {
    switch (selectedType) {
      case 'organization_unit':
        return Buildings
      case 'matrix_team':
        return UsersThree
      case 'location':
        return MapPin
      case 'legal_entity':
        return Bank
      case 'capability':
        return Lightning
      default:
        return Buildings
    }
  }

  // Render step 1: Select dimension type
  const renderTypeSelection = () => (
    <div className="gba:space-y-4" data-testid={`${testId}-type-selection`}>
      <div className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t.selectTypePrompt}</div>

      <RadioGroup
        value={selectedType || ''}
        onValueChange={value => handleTypeSelect(value as DimensionType)}
        className="gba:space-y-3"
      >
        {DIMENSION_TYPES.map(({ type, labelKey, icon: Icon }) => {
          const count = getCount(type)
          return (
            <label
              key={type}
              className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:border gba:border-border/50 gba:rounded-lg gba:cursor-pointer gba:transition-colors gba:hover:bg-muted/50"
              data-testid={`${testId}-type-${type}`}
            >
              <RadioGroupItem value={type} id={type} />
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                  <Icon className="gba:w-5 gba:h-5 gba:text-primary" />
                </div>
                <div className="gba:flex-1">
                  <div className="gba:font-medium gba:text-foreground">{t[labelKey]}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {count} {t.available}
                  </div>
                </div>
                <CaretRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              </div>
            </label>
          )
        })}
      </RadioGroup>

      {isLoadingDimensions && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  )

  // Render step 2: Select specific dimension
  const renderDimensionSelection = () => {
    const DimensionIcon = getDimensionIcon()
    return (
      <div className="gba:space-y-4" data-testid={`${testId}-dimension-selection`}>
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-2">
          <span>{t.selectFrom}</span>
          <span className="gba:font-medium gba:text-foreground">{getTypeName(selectedType!)}</span>
        </div>

        {/* Search input */}
        <div className="gba:relative">
          <MagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:!pl-10"
            data-testid={`${testId}-search`}
          />
        </div>

        {/* Dimension list */}
        <ScrollArea className="gba:h-64 gba:border gba:border-border/50 gba:rounded-lg">
          {isLoadingDimensions ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner size="sm" />
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-sm gba:text-muted-foreground">
              {searchQuery ? t.noResults : t.noDimensionsAvailable}
            </div>
          ) : (
            <div className="gba:p-1">
              {filteredOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleDimensionSelect(option)}
                  className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-md gba:text-left gba:transition-colors gba:hover:bg-muted/50"
                  data-testid={`${testId}-option-${option.id}`}
                >
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                    <DimensionIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:font-medium gba:text-sm gba:truncate gba:text-foreground">{option.name}</div>
                    {option.type && <div className="gba:text-xs gba:text-muted-foreground">{option.type}</div>}
                  </div>
                  <CaretRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    )
  }

  // Render step 3: Confirm members
  const renderMemberConfirmation = () => (
    <div className="gba:space-y-4" data-testid={`${testId}-member-confirmation`}>
      <div className="gba:p-3 gba:bg-primary/5 gba:rounded-lg gba:border gba:border-primary/20">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Check className="gba:w-4 gba:h-4 gba:text-primary" />
          <span className="gba:font-medium gba:text-sm gba:text-foreground">{selectedDimension?.name}</span>
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{getTypeName(selectedType!)}</div>
      </div>

      <div>
        <Label className="gba:text-sm gba:text-muted-foreground">
          {t.membersToAdd}
          <span className="gba:ml-1 gba:text-foreground gba:font-medium">({filteredMembers.length})</span>
        </Label>
      </div>

      {/* Members list */}
      <ScrollArea className="gba:h-48 gba:border gba:border-border/50 gba:rounded-lg">
        {isLoadingMembers ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="sm" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="gba:p-8 gba:text-center gba:text-sm gba:text-muted-foreground">{t.noMembersFound}</div>
        ) : (
          <div className="gba:p-1">
            {filteredMembers.map(member => (
              <div
                key={member.id}
                className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-md"
                data-testid={`${testId}-member-${member.id}`}
              >
                {member.avatarUrl ? (
                  <Avatar className="gba:w-8 gba:h-8 gba:flex-shrink-0">
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="gba:w-full gba:h-full gba:object-cover gba:rounded-full"
                    />
                  </Avatar>
                ) : (
                  <IconAvatar className="gba:w-8 gba:h-8 gba:flex-shrink-0" label={member.name} icon={UserIcon} />
                )}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium gba:truncate gba:text-foreground">{member.name}</div>
                  {member.email && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{member.email}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {filteredMembers.length === 0 && !isLoadingMembers && (
        <div className="gba:text-sm gba:text-warning gba:bg-warning-secondary gba:p-3 gba:rounded-md">
          {t.cannotCreateEmpty}
        </div>
      )}
    </div>
  )

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Step indicator */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
        <span className={step === 'select_type' ? 'gba:text-primary gba:font-medium' : ''}>{t.stepSelectType}</span>
        <span>→</span>
        <span className={step === 'select_dimension' ? 'gba:text-primary gba:font-medium' : ''}>
          {t.stepSelectGroup}
        </span>
        <span>→</span>
        <span className={step === 'confirm_members' ? 'gba:text-primary gba:font-medium' : ''}>{t.stepConfirm}</span>
      </div>

      {/* Step content */}
      {step === 'select_type' && renderTypeSelection()}
      {step === 'select_dimension' && renderDimensionSelection()}
      {step === 'confirm_members' && renderMemberConfirmation()}

      {/* Navigation buttons */}
      <div className="gba:flex gba:justify-between gba:pt-4 gba:border-t gba:border-border/50">
        <Button variant="ghost" onClick={step === 'select_type' ? onCancel : handleBack} data-testid={`${testId}-back`}>
          {step === 'select_type' ? t.cancel : t.back}
        </Button>

        {step === 'confirm_members' && (
          <Button
            onClick={handleConfirm}
            disabled={filteredMembers.length === 0 || isLoadingMembers}
            data-testid={`${testId}-confirm`}
          >
            {t.continue}
          </Button>
        )}
      </div>
    </div>
  )
}

export default DimensionPicker
