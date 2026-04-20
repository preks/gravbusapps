import React, { useState, useEffect, useMemo } from 'react'
import { Combobox } from '@newwork/nw-design-system'
import {
  useEmployeeSearchLight,
  useAccountSearch,
  useContactSearch,
  useLeadSearch,
  useOpportunitySearch,
  useEmployeeDetails,
  getEntityTypeFromFieldName,
  type EntityType
} from '../../queries/employeeQueries'
import { useCustomerOpportunity } from '@/common/data/customer/hooks/useCustomerOpportunity'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { useInvestmentContact } from '@/common/data/investment/hooks/useInvestmentContact'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'

interface SearchableUuidFieldProps {
  controlId: string
  label: string
  fieldName: string
  accessToken: string
  disabled?: boolean
  value: string
  onChange: (val: string) => void
  /** Flow module name (e.g. customer-relations, investment-relations). When it includes "investment", IRM hooks are used to resolve labels. */
  moduleName?: string
  /** JSON Schema for this field (used for `x-dataSource.entity` on custom flow forms). */
  fieldSchema?: any
}

export const SearchableUuidField: React.FC<SearchableUuidFieldProps> = ({
  controlId,
  label,
  fieldName,
  accessToken,
  disabled,
  value,
  onChange,
  moduleName,
  fieldSchema
}) => {
  const [search, setSearch] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const isIrm = Boolean(moduleName?.toLowerCase().includes('investment'))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const entityType: EntityType = getEntityTypeFromFieldName(fieldName, fieldSchema)

  // Fetch selected employee details if value exists and entity type is employee
  const { state: employeeDetailsState } = useEmployeeDetails(
    entityType === 'employee' && value ? value : '',
    entityType === 'employee' && value ? accessToken : ''
  )

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
        // Add selected employee to options if it exists and is not already in the list
        const employeeOptions = employees.map(e => ({
          value: e.id,
          label: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.id
        }))

        // If we have a selected value, ensure it's in options
        if (value) {
          // Check if selected value already exists in options
          const existsInOptions = employeeOptions.some(opt => opt.value === value)

          if (!existsInOptions) {
            // If employee details are loaded, use them
            if (employeeDetailsState.state === 'success' && employeeDetailsState.employee) {
              const selectedEmployee = employeeDetailsState.employee
              const selectedOption = {
                value: selectedEmployee.id,
                label:
                  `${selectedEmployee.firstName ?? ''} ${selectedEmployee.lastName ?? ''}`.trim() || selectedEmployee.id
              }
              employeeOptions.unshift(selectedOption) // Add to beginning
            } else {
              // Always add value to options (even if loading) so Combobox can display it
              // This ensures the selected value is visible even before employee details load
              employeeOptions.unshift({
                value: value,
                label:
                  employeeDetailsState.state === 'success' && employeeDetailsState.employee
                    ? `${employeeDetailsState.employee.firstName ?? ''} ${employeeDetailsState.employee.lastName ?? ''}`.trim() ||
                      value
                    : value // Show UUID until employee details load
              })
            }
          } else if (employeeDetailsState.state === 'success' && employeeDetailsState.employee) {
            // Update existing option label if employee details are loaded
            const optionIndex = employeeOptions.findIndex(opt => opt.value === value)
            if (optionIndex !== -1) {
              const selectedEmployee = employeeDetailsState.employee
              employeeOptions[optionIndex].label =
                `${selectedEmployee.firstName ?? ''} ${selectedEmployee.lastName ?? ''}`.trim() || value
            }
          }
        }

        return {
          options: employeeOptions,
          isLoading: employeeLoading || (value && employeeDetailsState.state === 'loading')
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
    opportunityLoading,
    value,
    employeeDetailsState
  ])

  // When value is pre-filled (e.g. from flow proposal) but not in options yet (no search),
  // resolve its label using existing "fetch by ID" hooks so the Combobox shows name/title instead of raw UUID.
  const val = (value || '').trim()
  const valueNotInOptions = val && !options.some((o: { value: string }) => o.value === val)
  const idToResolve = valueNotInOptions ? val : undefined

  const { opportunity } = useCustomerOpportunity(
    accessToken,
    entityType === 'opportunity' && !isIrm ? idToResolve : undefined
  )
  const { account } = useCustomerAccount(accessToken, entityType === 'account' && !isIrm ? idToResolve : undefined)
  const { contact } = useCustomerContact(accessToken, entityType === 'contact' && !isIrm ? idToResolve : undefined)
  const { lead } = useCustomerLead(accessToken, entityType === 'lead' && !isIrm ? idToResolve : undefined)
  const { opportunity: investmentOpportunity } = useInvestmentOpportunity(
    accessToken,
    entityType === 'opportunity' && isIrm ? idToResolve : undefined
  )
  const { account: investmentAccount } = useInvestmentAccount(
    accessToken,
    entityType === 'account' && isIrm ? idToResolve : undefined
  )
  const { contact: investmentContact } = useInvestmentContact(
    accessToken,
    entityType === 'contact' && isIrm ? idToResolve : undefined
  )
  const { lead: investmentLead } = useInvestmentLead(
    accessToken,
    entityType === 'lead' && isIrm ? idToResolve : undefined
  )
  const { state: employeeState } = useEmployeeDetails(
    entityType === 'employee' && idToResolve ? idToResolve : '',
    accessToken
  )

  const resolvedLabel = useMemo(() => {
    if (!valueNotInOptions || !val) return null
    switch (entityType) {
      case 'opportunity': {
        const o = isIrm ? investmentOpportunity : opportunity
        return o ? o.name || (o as { code?: string }).code || o.id : null
      }
      case 'account': {
        const a = isIrm ? investmentAccount : account
        return a ? a.name || a.id : null
      }
      case 'contact': {
        const c = isIrm ? investmentContact : contact
        return c ? `${(c.firstName ?? '').trim()} ${(c.lastName ?? '').trim()}`.trim() || c.id : null
      }
      case 'lead': {
        const l = isIrm ? investmentLead : lead
        return l
          ? `${(l.firstName ?? '').trim()} ${(l.lastName ?? '').trim()}`.trim() +
              ((l as { companyName?: string }).companyName
                ? ` (${(l as { companyName?: string }).companyName})`
                : '') ||
              (l as { email?: string }).email ||
              l.id
          : null
      }
      case 'employee':
      default:
        if (employeeState?.state === 'success' && employeeState.employee) {
          const e = employeeState.employee
          return `${(e.firstName ?? '').trim()} ${(e.lastName ?? '').trim()}`.trim() || e.id
        }
        return null
    }
  }, [
    valueNotInOptions,
    val,
    entityType,
    isIrm,
    opportunity,
    account,
    contact,
    lead,
    investmentOpportunity,
    investmentAccount,
    investmentContact,
    investmentLead,
    employeeState
  ])

  const optionsWithValue = useMemo(() => {
    if (!val) return options
    const inList = options.some((o: { value: string }) => o.value === val)
    if (inList) return options
    return [{ value: val, label: resolvedLabel ?? val }, ...options]
  }, [val, options, resolvedLabel])

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
        options={optionsWithValue}
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
