// Investment Header Configuration Utilities
import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { formatCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
// Remove dependency on investmentTypeUtils - now using dynamic types
import { FormFieldsDefinition, FormFieldDefinition } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Calendar, Flag } from 'lucide-react'

/**
 * Format date helper
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('de-DE')
  } catch {
    return '-'
  }
}

/**
 * Helper function to get value from object using dot notation path
 */
const getValueByPath = (obj: any, path: string): any => {
  if (!obj || !path) return undefined

  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i]

    if (!current || current[key] === undefined) {
      return undefined
    }

    // Special handling for additionalProperties
    if (key === 'additionalProperties') {
      if (typeof current[key] === 'string') {
        // Legacy case: additionalProperties stored as JSON string (parse it)
        try {
          const parsed = JSON.parse(current[key])
          // If this is the last key in the path, return the whole parsed object
          if (i === parts.length - 1) {
            return parsed
          }
          // Otherwise, set current to parsed and continue with remaining path
          current = parsed
          continue
        } catch {
          return undefined
        }
      } else if (typeof current[key] === 'object' && current[key] !== null) {
        // New case: additionalProperties stored as object (direct access)
        if (i === parts.length - 1) {
          return current[key]
        }
        // Continue navigating through the object
        current = current[key]
        continue
      } else {
        return undefined
      }
    }

    // Regular navigation
    current = current[key]
  }

  return current
}

/**
 * Formats a field value based on its type
 */
export const formatFieldValue = (value: any, fieldType: string, currencyCode: string): string => {
  if (value === null || value === undefined || value === '') return '-'

  switch (fieldType) {
    case 'DATE':
    case 'DATETIME':
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch {
        return '-'
      }

    case 'AMOUNT':
      // Handle both number and string values (additionalProperties stores as strings)
      if (typeof value === 'number') {
        return formatCurrency(value, currencyCode)
      } else if (typeof value === 'string') {
        const numValue = parseFloat(value)
        return !isNaN(numValue) ? formatCurrency(numValue, currencyCode) : '-'
      }
      return '-'

    case 'PERCENTAGE':
      // Handle both number and string values (additionalProperties stores as strings)
      if (typeof value === 'number') {
        return `${value}%`
      } else if (typeof value === 'string') {
        const numValue = parseFloat(value)
        return !isNaN(numValue) ? `${numValue}%` : '-'
      }
      return '-'

    case 'NUMBER':
      // Handle both number and string values (additionalProperties stores as strings)
      if (typeof value === 'number') {
        return value.toString()
      } else if (typeof value === 'string') {
        const numValue = parseFloat(value)
        return !isNaN(numValue) ? numValue.toString() : '-'
      }
      return '-'

    case 'TEXT':
    case 'TEXTAREA':
      return value.toString()

    default:
      // Handle catalog fields
      if (fieldType.startsWith('CATALOG_') || fieldType.startsWith('REF_')) {
        // Check if it's an array (e.g., REF_InvestmentRole)
        if (Array.isArray(value)) {
          // Filter out deleted items and extract labels
          const activeItems = value.filter((item: any) => !item.isDeleted)
          if (activeItems.length === 0) return '-'

          const labels = activeItems
            .map((item: any) => {
              // Try investmentRole.value (for InvestmentRole type)
              if (item.investmentRole?.value) return item.investmentRole.value
              if (item.investmentRole?.name) return item.investmentRole.name
              // Try direct value/name properties (for other ref types)
              if (item.value) return item.value
              if (item.name) return item.name
              return null
            })
            .filter(Boolean)

          return labels.length > 0 ? labels.join(', ') : '-'
        }

        // Single object handling (existing logic)
        if (typeof value === 'object' && value.value) {
          return value.value // Catalog entry
        }
        if (typeof value === 'object' && value.name) {
          return value.name // Entity reference
        }
      }
      return value.toString()
  }
}

/**
 * Gets the investment type's form field definition from catalog data
 */
export const getInvestmentTypeFieldDefinition = (
  investmentTypeCode: string,
  catalogData: any
): FormFieldsDefinition | null => {
  if (!catalogData || !investmentTypeCode) return null

  // SPECIAL CASE FOR EQUITY: Check the EQUITY group level instead of individual type
  // Find the investment type to get its parent group
  const investmentTypes = catalogData.investmentTypes || []
  const matchingType = investmentTypes.find((type: any) => type.code === investmentTypeCode)

  const parentCode = matchingType?.parentEntryId?.split(':').pop()
  if (parentCode === 'EQUITY') {
    // For equity investments, use the EQUITY group's form fields
    const investmentGroups = catalogData.investmentGroups || []
    const equityGroup = investmentGroups.find((group: any) => group.code === 'EQUITY')
    if (equityGroup?.objectValue) {
      return equityGroup.objectValue as FormFieldsDefinition
    }
  }

  // For non-equity investments, check the type level first
  if (matchingType?.objectValue) {
    return matchingType.objectValue as FormFieldsDefinition
  }

  // If not found in direct types, look in group's child entries
  const investmentGroups = catalogData.investmentGroups || []
  for (const group of investmentGroups) {
    if (group.childEntries) {
      const childType = group.childEntries.find((child: any) => child.code === investmentTypeCode)
      if (childType?.objectValue) {
        return childType.objectValue as FormFieldsDefinition
      }
    }
  }

  return null
}

/**
 * Gets the liquid fund type's form field definition from catalog data
 * ONLY for liquid fund investments with investmentLiquidFundTypeRef
 */
export const getLiquidFundTypeFieldDefinition = (
  liquidFundTypeCode: string,
  catalogData: any
): FormFieldsDefinition | null => {
  if (!catalogData || !liquidFundTypeCode) return null

  // Look through investment liquid fund types for matching code
  const liquidFundTypes = catalogData.investmentLiquidFundTypes || []
  const matchingType = liquidFundTypes.find((type: any) => type.code === liquidFundTypeCode)

  if (matchingType?.objectValue) {
    return matchingType.objectValue as FormFieldsDefinition
  }

  return null
}

/**
 * Transforms form field definitions into header detail items
 */
export const transformFormFieldsToHeaderItems = (
  formFieldsDefinition: FormFieldsDefinition | null,
  investment: any,
  typeSpecificData: any
) => {
  if (!formFieldsDefinition?.formFields) return []

  const currencyCode = extractCurrencyCode(investment?.currency?.code || '')
  const items: Array<{ label: string; value: string }> = []

  // Combine all field definitions from all groups
  const allFields: FormFieldDefinition[] = []
  formFieldsDefinition.formFields.forEach(group => {
    allFields.push(...group.fields)
  })

  // Sort fields by display order
  allFields.sort((a, b) => {
    const orderA = parseFloat(a.displayOrder || '999')
    const orderB = parseFloat(b.displayOrder || '999')
    return orderA - orderB
  })

  // Transform each field to a header item
  allFields.forEach(field => {
    // Get the value using the property path
    let value = getValueByPath(investment, field.property)

    // If not found in main investment, try type-specific data
    if (value === undefined) {
      value = getValueByPath(typeSpecificData, field.property)
    }

    // SPECIAL FIX: If looking for liquidFundInvestment.additionalProperties but not found,
    // try the investment.additionalProperties instead (common case for our setup)
    if (value === undefined && field.property.startsWith('liquidFundInvestment.additionalProperties.')) {
      const fieldName = field.property.replace('liquidFundInvestment.additionalProperties.', '')
      value = getValueByPath(investment, `additionalProperties.${fieldName}`)
    }

    // Format the value
    // Special handling: Interest rate fields should always be formatted as percentages
    // even if catalog incorrectly defines them as AMOUNT
    let effectiveFieldType = field.type
    if (field.property.toLowerCase().includes('interestrate')) {
      effectiveFieldType = 'PERCENTAGE'
    }

    const formattedValue = formatFieldValue(value, effectiveFieldType, currencyCode)

    items.push({
      label: field.label,
      value: formattedValue
    })
  })

  return items
}

/**
 * Groups header items into logical sections for better display
 */
export const groupHeaderItems = (items: Array<{ label: string; value: string }>) => {
  // Split items into groups of reasonable size (5-6 items per group)
  const groups = []
  const itemsPerGroup = 5

  for (let i = 0; i < items.length; i += itemsPerGroup) {
    const groupItems = items.slice(i, i + itemsPerGroup)
    groups.push({
      id: `dynamic-group-${Math.floor(i / itemsPerGroup) + 1}`,
      items: groupItems
    })
  }

  return groups
}

/**
 * Gets type-specific badges for the header
 */
export const getTypeSpecificBadges = (investmentType: string, typeSpecificData: any) => {
  switch (investmentType) {
    case 'equity':
      return (
        typeSpecificData?.equityInvestment?.investmentStakeType?.value && (
          <Badge variant="default" className="gba:text-sm">
            {typeSpecificData.equityInvestment.investmentStakeType.value}
          </Badge>
        )
      )
    case 'real_estate':
      return (
        typeSpecificData?.realEstateInvestment?.propertyType?.value && (
          <Badge variant="outline" className="gba:border-orange-200 gba:text-orange-800">
            {typeSpecificData.realEstateInvestment.propertyType.value}
          </Badge>
        )
      )
    default:
      return null
  }
}

/**
 * Gets the badge variant based on investment status type
 */
const getStatusBadgeVariant = (statusType: string | undefined): 'info' | 'warning' | 'success' | 'default' => {
  switch (statusType) {
    case 'EXITED':
      return 'info' // info variant
    case 'ON_HOLD':
      return 'warning' // warning variant
    case 'ACTIVE':
      return 'success' // success variant
    default:
      return 'default' // default variant for unknown types
  }
}

/**
 * Gets the badge variant based on liquid fund type
 */
const getLiquidFundTypeBadgeVariant = (liquidFundType: any): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!liquidFundType?.value) return 'default'

  const typeValue = liquidFundType.value.toLowerCase()

  // Map liquid fund types to appropriate badge variants
  if (typeValue.includes('money market') || typeValue.includes('cash')) {
    return 'secondary' // Money market funds - secondary variant
  } else if (typeValue.includes('bond') || typeValue.includes('fixed income')) {
    return 'outline' // Bond funds - outline variant
  } else if (typeValue.includes('equity') || typeValue.includes('stock')) {
    return 'destructive' // Equity funds - destructive variant (higher risk)
  } else if (typeValue.includes('balanced') || typeValue.includes('mixed')) {
    return 'default' // Balanced funds - default variant
  }

  return 'default' // Default fallback
}

/**
 * Creates the header meta badges with AppAction wrappers
 */
export const createHeaderMeta = (
  investment: any,
  investmentType: string,
  typeSpecificData: any,
  accessToken: string
) => {
  const investmentId = investment?.id

  // Determine planned exit badge state and styling
  const getPlannedExitBadge = () => {
    const isPlanned = investment?.planedExit || false
    const plannedExitDate = investment?.plannedExitDate
    const exitDate = investment?.exitDate

    // Determine badge content and styling based on state
    let badgeContent, badgeVariant, badgeClass, icon

    // Determine the case based on planned exit state
    let caseType: 'not-planned' | 'planned-no-date' | 'planned-with-date' | 'invalid'

    if (!isPlanned) {
      caseType = 'not-planned'
    } else if (isPlanned && !plannedExitDate) {
      caseType = 'planned-no-date'
    } else if (isPlanned && plannedExitDate) {
      caseType = 'planned-with-date'
    } else {
      caseType = 'invalid'
    }

    switch (caseType) {
      case 'not-planned':
        // Case 1: No exit is planned
        badgeContent = getTranslationFromI18nKeyAndLabel('investment.exit.planExit', 'Plan Exit')
        badgeVariant = 'secondary'
        badgeClass = 'gba:flex gba:items-center gba:gap-1 gba:cursor-pointer gba:hover:opacity-80'
        icon = <Calendar className="gba:w-3 gba:h-3" />
        break

      case 'planned-no-date':
        // Case 2: Exit is planned but no date is set
        badgeContent = getTranslationFromI18nKeyAndLabel('investment.exit.setExitDate', 'Set Exit Date')
        badgeVariant = 'warning'
        badgeClass = 'gba:flex gba:items-center gba:gap-1 gba:cursor-pointer gba:hover:opacity-80'
        icon = <Calendar className="gba:w-3 gba:h-3" />
        break

      case 'planned-with-date':
        // Case 3 & 4: Exit is planned with date
        const exitDateObj = new Date(plannedExitDate)
        const now = new Date()
        const isPast = exitDateObj < now
        const isEmptyExitDate = !exitDate

        badgeContent = formatDate(plannedExitDate)
        badgeVariant = isPast && isEmptyExitDate ? 'destructive' : 'info'
        badgeClass = 'gba:flex gba:items-center gba:gap-1 gba:cursor-pointer gba:hover:opacity-80'
        icon = <Flag className="gba:w-3 gba:h-3" />
        break

      case 'invalid':
      default:
        return null
    }

    return (
      <AppAction
        contextsArray={[FlowContextName.investmentPlanExit]}
        externalContextData={{
          investmentId,
          scope: 'exit'
        }}
        prefixDataTestId="investment-planned-exit"
        accessToken={accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      >
        <Badge variant={badgeVariant as any} className={badgeClass}>
          {icon}
          {badgeContent}
        </Badge>
      </AppAction>
    )
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Badge variant="secondary" className="gba:text-sm">
        {investment?.investmentType?.value ||
          getTranslationFromI18nKeyAndLabel('investment.type.default', 'Investment')}
      </Badge>
      {/* Liquid Fund Type Badge - ONLY for liquid funds */}
      {investment?.investmentGroup?.code?.includes('LIQUID_FUND') &&
        typeSpecificData?.liquidFundInvestment?.investmentLiquidFundType && (
          <Badge
            variant={getLiquidFundTypeBadgeVariant(typeSpecificData.liquidFundInvestment.investmentLiquidFundType)}
            className="gba:text-sm"
          >
            {typeSpecificData.liquidFundInvestment.investmentLiquidFundType.value}
          </Badge>
        )}

      {/* Status Badge with AppAction */}
      <AppAction
        contextsArray={[FlowContextName.investmentStatusUpdate]}
        externalContextData={{
          investmentId,
          scope: 'status'
        }}
        prefixDataTestId="investment-status"
        accessToken={accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      >
        <Badge
          variant={getStatusBadgeVariant(investment?.investmentStatus?.type)}
          className="gba:cursor-pointer gba:hover:opacity-80"
        >
          {investment?.investmentStatus?.value ||
            getTranslationFromI18nKeyAndLabel('investment.status.unknown', 'Unknown')}
        </Badge>
      </AppAction>

      {/* Company Badge - Only show if company association exists */}
      {investment?.company?.id && (
        <button
          type="button"
          onClick={() => {
            const companyId = investment.company?.id
            if (companyId) {
              navigateTo(
                buildPlatformUrl('/platform/mdm/company-record', {
                  companyId
                })
              )
            }
          }}
          className="gba:bg-transparent gba:border-0 gba:p-0"
          data-testid="investment-company-link"
          aria-label={`${getTranslationFromI18nKeyAndLabel('investment.legalEntity.ariaLabel', 'Navigate to legal entity')}: ${investment.company.name}`}
        >
          <Badge variant="outline" className="gba:cursor-pointer gba:hover:opacity-80">
            {getTranslationFromI18nKeyAndLabel('investment.legalEntity.label', 'Legal Entity')}:{' '}
            {investment.company.name}
          </Badge>
        </button>
      )}

      {/* Planned Exit Badge with AppAction - Always show */}
      {getPlannedExitBadge()}

      {/* Type-specific badges */}
      {getTypeSpecificBadges(investmentType, typeSpecificData)}

      {/* Source Opportunity Badge - Only show if association exists */}
      {investment?.investmentOpportunity?.id && (
        <button
          type="button"
          onClick={() => {
            const opportunityId = investment?.investmentOpportunity?.id
            if (opportunityId) {
              navigateTo(
                buildPlatformUrl('/platform/irm/opportunity-record', {
                  opportunityId
                })
              )
            }
          }}
          className="gba:bg-transparent gba:border-0 gba:p-0"
          data-testid="investment-source-opportunity-link"
          aria-label={`${getTranslationFromI18nKeyAndLabel('investment.sourceOpportunity.ariaLabel', 'Navigate to source opportunity')}: ${investment.investmentOpportunity.name}`}
        >
          <Badge variant="outline" className="gba:cursor-pointer gba:hover:opacity-80">
            {getTranslationFromI18nKeyAndLabel('investment.sourceOpportunity.label', 'Source Opportunity')}:{' '}
            {investment.investmentOpportunity.name}
          </Badge>
        </button>
      )}
    </div>
  )
}

/**
 * Gets type-specific detail groups for the header - now supports dynamic fields
 */
export const getTypeSpecificDetailGroups = (
  investmentType: string,
  typeSpecificData: any,
  investment: any,
  catalogData?: any // Optional catalog data for dynamic fields
) => {
  const currencyCode = extractCurrencyCode(investment?.currency?.code || '')

  // Try dynamic fields first if catalog data is available
  if (catalogData && investment?.investmentType?.code) {
    let formFieldsDefinition: FormFieldsDefinition | null = null

    // PRIORITY 1: For liquid funds with liquid fund type - use liquid fund type fields
    if (
      investment.investmentGroup?.code?.includes('LIQUID_FUND') &&
      typeSpecificData?.liquidFundInvestment?.investmentLiquidFundType?.code
    ) {
      formFieldsDefinition = getLiquidFundTypeFieldDefinition(
        typeSpecificData.liquidFundInvestment.investmentLiquidFundType.code,
        catalogData
      )
    }

    // PRIORITY 2: Fallback to investment type fields
    if (!formFieldsDefinition) {
      formFieldsDefinition = getInvestmentTypeFieldDefinition(investment.investmentType.code, catalogData)
    }

    if (formFieldsDefinition) {
      const dynamicItems = transformFormFieldsToHeaderItems(formFieldsDefinition, investment, typeSpecificData)

      if (dynamicItems.length > 0) {
        // Add Owner Employee if not already provided by the form definition
        const ownerEmployeeLabel = getTranslationFromI18nKeyAndLabel('crm.investments.ownerEmployee', 'Owner Employee')
        const hasOwnerEmployeeField = formFieldsDefinition.formFields.some(group =>
          group.fields.some(field => field.property?.includes('ownerEmployee'))
        )
        const hasOwnerEmployee = dynamicItems.some(item => item.label === ownerEmployeeLabel)
        if (!hasOwnerEmployeeField && !hasOwnerEmployee && investment?.ownerEmployee) {
          dynamicItems.push({
            label: ownerEmployeeLabel,
            value:
              investment.ownerEmployee.firstName && investment.ownerEmployee.lastName
                ? `${investment.ownerEmployee.firstName} ${investment.ownerEmployee.lastName}`.trim()
                : investment.ownerEmployee.displayName || investment.ownerEmployee.fullName || '-'
          })
        }

        return groupHeaderItems(dynamicItems)
      }
    }
  }

  // Fallback to static field configurations based on investment group
  const group = investment?.investmentGroup?.code || ''

  if (group.includes('EQUITY') || investmentType === 'equity') {
    const equity = typeSpecificData?.equityInvestment
    return [
      {
        id: 'equity-details',
        items: [
          {
            label: 'Initial Investment',
            value: investment?.initialInvestmentAmount
              ? formatCurrency(investment.initialInvestmentAmount, currencyCode)
              : '-'
          },
          {
            label: 'Total Investment',
            value: investment?.totalInvestmentAmount
              ? formatCurrency(investment.totalInvestmentAmount, currencyCode)
              : '-'
          },
          {
            label: 'Market Value',
            value: investment?.investmentMarketValue
              ? formatCurrency(investment.investmentMarketValue, currencyCode)
              : '-'
          },
          {
            label: 'Stake Percentage',
            value: equity?.stakePercentage ? `${equity.stakePercentage}%` : '-'
          },
          {
            label: 'Foundation Date',
            value: formatDate(equity?.foundationDate)
          }
        ]
      },
      {
        id: 'equity-details-2',
        items: [
          {
            label: 'Turnover Amount',
            value: equity?.turnoverAmount ? formatCurrency(equity.turnoverAmount, currencyCode) : '-'
          },
          {
            label: 'EBITDA Amount',
            value: equity?.ebitdaAmount ? formatCurrency(equity.ebitdaAmount, currencyCode) : '-'
          },
          {
            label: 'Owner Employee',
            value: investment?.ownerEmployee
              ? `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim()
              : '-'
          }
        ]
      }
    ]
  } else if (group.includes('REAL_ESTATE') || investmentType === 'real_estate') {
    const realEstate = typeSpecificData?.realEstateInvestment
    return realEstate
      ? [
          {
            id: 'real-estate-details',
            items: [
              {
                label: getTranslationFromI18nKeyAndLabel('crm.investments.realEstate.size', 'Size'),
                value: realEstate.size
                  ? `${realEstate.size} ${realEstate.sizeMeasurementUnitRef?.split(':').pop() || 'm²'}`
                  : '-'
              },
              {
                label: getTranslationFromI18nKeyAndLabel('crm.investments.realEstate.buildingYear', 'Building Year'),
                value: realEstate.buildingYear || '-'
              },
              {
                label: getTranslationFromI18nKeyAndLabel(
                  'crm.investments.realEstate.annualNetColdRent',
                  'Annual Net Cold Rent'
                ),
                value: realEstate.annualNetColdRent ? formatCurrency(realEstate.annualNetColdRent, currencyCode) : '-'
              },
              {
                label: getTranslationFromI18nKeyAndLabel('crm.investments.realEstate.funding', 'Funding'),
                value: realEstate.funding ? formatCurrency(realEstate.funding, currencyCode) : '-'
              },
              {
                label: getTranslationFromI18nKeyAndLabel('crm.investments.realEstate.occupancyPercent', 'Occupancy %'),
                value: realEstate.occupancyPercent ? `${realEstate.occupancyPercent}%` : '-'
              },
              {
                label: getTranslationFromI18nKeyAndLabel('crm.investments.realEstate.locality', 'Location'),
                value: realEstate.locality || '-'
              }
            ]
          }
        ]
      : []
  } else if (group.includes('LIQUID_FUND') || investmentType === 'liquid_fund') {
    const liquidFund = typeSpecificData?.liquidFundInvestment
    return [
      {
        id: 'liquid-fund-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.initialInvestment', 'Initial Investment'),
            value: investment?.initialInvestmentAmount
              ? formatCurrency(investment.initialInvestmentAmount, currencyCode)
              : '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.totalInvestment', 'Total Investment'),
            value: investment?.totalInvestmentAmount
              ? formatCurrency(investment.totalInvestmentAmount, currencyCode)
              : '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.marketValue', 'Market Value'),
            value: investment?.investmentMarketValue
              ? formatCurrency(investment.investmentMarketValue, currencyCode)
              : '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.fundType', 'Fund Type'),
            value: liquidFund?.investmentLiquidFundType?.value || '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.isinCode', 'ISIN Code'),
            value: investment?.isin || '-'
          }
        ]
      },
      {
        id: 'liquid-fund-details-2',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.bankName', 'Bank Name'),
            value: liquidFund?.bankName || '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.interestRate', 'Interest Rate'),
            value: liquidFund?.interestRate ? `${liquidFund.interestRate}%` : '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.acquisitionDate', 'Acquisition Date'),
            value: formatDate(investment?.acquisitionDate)
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.ownerEmployee', 'Owner Employee'),
            value: investment?.ownerEmployee
              ? `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim()
              : '-'
          }
        ]
      }
    ]
  } else {
    // Default/generic investment fields
    return [
      {
        id: 'general-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.initialInvestment', 'Initial Investment'),
            value: investment?.initialInvestmentAmount
              ? formatCurrency(investment.initialInvestmentAmount, currencyCode)
              : '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.totalInvestment', 'Total Investment'),
            value: investment?.totalInvestmentAmount
              ? formatCurrency(investment.totalInvestmentAmount, currencyCode)
              : '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.marketValue', 'Market Value'),
            value: investment?.investmentMarketValue
              ? formatCurrency(investment.investmentMarketValue, currencyCode)
              : '-'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.acquisitionDate', 'Acquisition Date'),
            value: formatDate(investment?.acquisitionDate)
          },
          {
            label: getTranslationFromI18nKeyAndLabel('investment.fields.ownerEmployee', 'Owner Employee'),
            value: investment?.ownerEmployee
              ? `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim()
              : '-'
          }
        ]
      }
    ]
  }
}
