/**
 * Data Quality Calculator
 * Analyzes converted entities to provide field coverage statistics and warnings
 */

import { ConvertedEntity, TargetFieldDefinition } from '@/common/data/customer/agents/types'

export interface FieldCoverage {
  fieldName: string
  label: string
  count: number
  total: number
  percentage: number
  category: 'personal' | 'contact' | 'company' | 'location' | 'lead' | 'owner' | 'additional'
}

export interface DataQualityResult {
  totalEntities: number
  fieldCoverage: FieldCoverage[]
  warnings: string[]
}

/**
 * Map field names to categories for grouping
 */
function getFieldCategory(fieldName: string): FieldCoverage['category'] {
  const categoryMap: Record<string, FieldCoverage['category']> = {
    salutationRef: 'personal',
    academicTitleRef: 'personal',
    firstName: 'personal',
    lastName: 'personal',
    position: 'personal',
    email: 'contact',
    phoneNumber: 'contact',
    companyName: 'company',
    companyEmail: 'company',
    companyPhone: 'company',
    companyWebsite: 'company',
    legalFormRef: 'company',
    numberOfEmployeesRef: 'company',
    industryRef: 'company',
    accountAnnualRevenueBandRef: 'company',
    addressLine: 'location',
    city: 'location',
    postalCode: 'location',
    countryRef: 'location',
    regionRef: 'location',
    leadSourceRef: 'lead',
    leadStatusRef: 'lead',
    leadRatingRef: 'lead',
    sourceCompanyName: 'lead',
    sourceIndividualName: 'lead',
    ownerEmployeeId: 'owner',
    type: 'additional',
    code: 'additional',
    description: 'additional',
    sensitive: 'additional',
    notesSummary: 'additional',
    birthDate: 'personal',
    jobPosition: 'personal',
    department: 'personal',
    languageRef: 'personal'
  }

  return categoryMap[fieldName] || 'additional'
}

/**
 * Calculate data quality metrics for converted entities
 */
export function calculateDataQuality(entities: ConvertedEntity[], config: TargetFieldDefinition[]): DataQualityResult {
  const totalEntities = entities.length
  const fieldCoverage: FieldCoverage[] = []
  const warnings: string[] = []

  if (totalEntities === 0) {
    return { totalEntities: 0, fieldCoverage: [], warnings: ['No entities to analyze'] }
  }

  // Calculate coverage for each field
  config.forEach(fieldDef => {
    const fieldName = fieldDef.value
    const label = fieldDef.label

    // Count non-null values
    const count = entities.filter(entity => {
      const value = entity[fieldName as keyof ConvertedEntity]
      return value !== null && value !== undefined && value !== ''
    }).length

    const percentage = Math.round((count / totalEntities) * 100)

    fieldCoverage.push({
      fieldName,
      label,
      count,
      total: totalEntities,
      percentage,
      category: getFieldCategory(fieldName)
    })

    // Generate warnings for low coverage fields
    if (percentage === 0) {
      warnings.push(`${label}: No data available (0%)`)
    } else if (percentage < 50) {
      warnings.push(`${label}: Low coverage (${percentage}%)`)
    }
  })

  // Sort warnings by severity (0% first, then low coverage)
  warnings.sort((a, b) => {
    const aHasZero = a.includes('(0%)')
    const bHasZero = b.includes('(0%)')
    if (aHasZero && !bHasZero) return -1
    if (!aHasZero && bHasZero) return 1
    return 0
  })

  return {
    totalEntities,
    fieldCoverage,
    warnings
  }
}

/**
 * Get coverage statistics grouped by category
 */
export function getGroupedCoverage(fieldCoverage: FieldCoverage[]): Record<string, FieldCoverage[]> {
  return fieldCoverage.reduce(
    (acc, coverage) => {
      const category = coverage.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(coverage)
      return acc
    },
    {} as Record<string, FieldCoverage[]>
  )
}
