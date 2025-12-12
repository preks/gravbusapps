import React, { useCallback, useEffect, useMemo } from 'react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { CatalogEntry } from '@/common/data/catalog'
import { CatalogSelect, CatalogSelectProps } from '@/components/catalog-select'

type InvestmentRolesFieldProps = Omit<
  CatalogSelectProps,
  'catalogIdentifier' | 'variant' | 'multiple' | 'value' | 'onValueChange'
> & {
  fieldName: string
  testIdPrefix?: string
  value?: InvestmentRoleItem[] | CatalogEntry | null
  onValueChange?: (value: InvestmentRoleItem[]) => void
}

interface InvestmentRoleItem {
  id?: string
  version?: number
  investmentRole: CatalogEntry
  displayOrder: number
  isDeleted?: boolean
}

export const InvestmentRolesField = ({
  fieldName,
  testIdPrefix = 'InvestmentForm',
  value,
  onValueChange,
  ...props
}: InvestmentRolesFieldProps) => {
  // Normalize single object to array format on mount or when value changes
  useEffect(() => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const normalizedRoles: InvestmentRoleItem[] = [
        {
          investmentRole: value,
          displayOrder: 0
        }
      ]
      onValueChange?.(normalizedRoles)
    }
  }, [value, onValueChange])

  // Normalize to array format (handles both single object from opportunity and array from investment)
  const currentRoles: InvestmentRoleItem[] = useMemo(() => {
    if (Array.isArray(value)) {
      return value
    } else if (value && typeof value === 'object') {
      // During render, just use the single object wrapped in array for display
      return [
        {
          investmentRole: value,
          displayOrder: 0
        }
      ]
    }
    return []
  }, [value])

  // Filter out deleted roles for display
  const activeRoles = useMemo(() => {
    return currentRoles.filter(role => !role.isDeleted)
  }, [currentRoles])

  // Get selected role IDs for CatalogSelect (array of strings)
  const selectedRoleIds = useMemo(() => {
    return activeRoles
      .map(role => role.investmentRole?.id)
      .filter(Boolean)
      .filter((id): id is string => typeof id === 'string')
  }, [activeRoles])

  // Handle changes from CatalogSelect (both adding and removing)
  const handleCatalogSelectChange = useCallback(
    (newRoleIds: string | string[]) => {
      if (!Array.isArray(newRoleIds)) {
        // Single value - convert to array
        newRoleIds = newRoleIds ? [newRoleIds] : []
      }

      // Find removed IDs (in current but not in new)
      const currentIds = new Set(selectedRoleIds)
      const newIds = new Set(newRoleIds)
      const removedIds = new Set(selectedRoleIds.filter(id => !newIds.has(id)))
      const addedIds = newRoleIds.filter(id => !currentIds.has(id))

      // Handle removals: mark as deleted or remove
      const updatedRoles = currentRoles
        .map(role => {
          const roleId = role.investmentRole?.id
          if (roleId && removedIds.has(roleId)) {
            // If role has an ID (exists in DB), mark as deleted instead of removing
            if (role.id) {
              return { ...role, isDeleted: true }
            }
            // Mark for removal (will be filtered out below)
            return null
          }
          return role
        })
        .filter((role): role is InvestmentRoleItem => role !== null)

      // Handle additions: create new roles
      const newRoles: InvestmentRoleItem[] = addedIds.map((roleId, index) => ({
        investmentRole: { id: roleId } as CatalogEntry, // Minimal entry, will be enriched
        displayOrder: updatedRoles.length + index
      }))

      onValueChange?.([...updatedRoles, ...newRoles])
    },
    [selectedRoleIds, currentRoles, onValueChange]
  )

  return (
    <CatalogSelect
      {...props}
      catalogIdentifier="InvestmentRole:v1"
      variant="combobox"
      multiple={true}
      value={selectedRoleIds}
      onValueChange={handleCatalogSelectChange}
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}CatalogSelect`)}
    />
  )
}
