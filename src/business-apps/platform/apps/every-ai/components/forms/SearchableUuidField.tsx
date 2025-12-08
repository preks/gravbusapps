import React, { useState, useEffect, useMemo } from 'react'
import { Combobox } from '@newwork/nw-design-system'
import {
  useEmployeeSearchLight,
  useAccountSearch,
  useContactSearch,
  useLeadSearch,
  useOpportunitySearch,
  getEntityTypeFromFieldName,
  type EntityType
} from '../../queries/employeeQueries'

interface SearchableUuidFieldProps {
  controlId: string
  label: string
  fieldName: string
  accessToken: string
  disabled?: boolean
  value: string
  onChange: (val: string) => void
}

export const SearchableUuidField: React.FC<SearchableUuidFieldProps> = ({
  controlId,
  label,
  fieldName,
  accessToken,
  disabled,
  value,
  onChange
}) => {
  const [search, setSearch] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  // Determine entity type from field name
  const entityType: EntityType = getEntityTypeFromFieldName(fieldName)

  // Use appropriate search hook based on entity type
  const { employees, isLoading: employeeLoading } = useEmployeeSearchLight(
    entityType === 'employee' ? accessToken : '',
    { search: entityType === 'employee' ? debouncedSearch : '', limit: 50 }
  )
  const { accounts, isLoading: accountLoading } = useAccountSearch(entityType === 'account' ? accessToken : '', {
    search: entityType === 'account' ? debouncedSearch : '',
    limit: 50
  })
  const { contacts, isLoading: contactLoading } = useContactSearch(entityType === 'contact' ? accessToken : '', {
    search: entityType === 'contact' ? debouncedSearch : '',
    limit: 50
  })
  const { leads, isLoading: leadLoading } = useLeadSearch(entityType === 'lead' ? accessToken : '', {
    search: entityType === 'lead' ? debouncedSearch : '',
    limit: 50
  })
  const { opportunities, isLoading: opportunityLoading } = useOpportunitySearch(
    entityType === 'opportunity' ? accessToken : '',
    { search: entityType === 'opportunity' ? debouncedSearch : '', limit: 50 }
  )

  // Get options and loading state based on entity type
  const { options, isLoading } = useMemo(() => {
    switch (entityType) {
      case 'account':
        return {
          options: accounts.map(a => ({
            value: a.id,
            label: a.name || a.email || a.id
          })),
          isLoading: accountLoading
        }
      case 'contact':
        return {
          options: contacts.map(c => ({
            value: c.id,
            label: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || c.id
          })),
          isLoading: contactLoading
        }
      case 'lead':
        return {
          options: leads.map(l => ({
            value: l.id,
            label:
              `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() + (l.companyName ? ` (${l.companyName})` : '') ||
              l.email ||
              l.id
          })),
          isLoading: leadLoading
        }
      case 'opportunity':
        return {
          options: opportunities.map(o => ({
            value: o.id,
            label: o.name || o.code || o.id
          })),
          isLoading: opportunityLoading
        }
      case 'employee':
      default:
        return {
          options: employees.map(e => ({
            value: e.id,
            label: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.id
          })),
          isLoading: employeeLoading
        }
    }
  }, [
    entityType,
    employees,
    accounts,
    contacts,
    leads,
    opportunities,
    employeeLoading,
    accountLoading,
    contactLoading,
    leadLoading,
    opportunityLoading
  ])

  // Get placeholder text based on entity type
  const placeholderText = useMemo(() => {
    switch (entityType) {
      case 'account':
        return 'Search accounts...'
      case 'contact':
        return 'Search contacts...'
      case 'lead':
        return 'Search leads...'
      case 'opportunity':
        return 'Search opportunities...'
      default:
        return 'Search employees...'
    }
  }, [entityType])

  return (
    <div>
      <Combobox
        id={controlId}
        className="gba:w-full"
        options={options}
        value={value || ''}
        onValueChange={v => onChange(v || '')}
        placeholder={`Select ${label}`}
        searchPlaceholder={placeholderText}
        emptyText={isLoading ? 'Loading...' : 'No results'}
        onSearch={setSearch}
        searchDebounce={300}
        loading={Boolean(isLoading)}
        disabled={disabled}
        data-testid={`${controlId}-searchable-uuid`}
      />
    </div>
  )
}
