import { useMemo, useState, useCallback } from 'react'
import type { OpportunityData } from './useOpportunityData'

export interface ExecutiveOption {
  id: string
  name: string
  firstName?: string
  lastName?: string
  jobPosition?: string
  pictureThumbnail?: string
}

type CompanyExecutive = NonNullable<
  NonNullable<OpportunityData['investmentCompany']>['investmentCompanyExecutive']
>[number]

// Build an option from the executive's linked employee (preferred source).
const buildFromEmployee = (executive: CompanyExecutive): ExecutiveOption | null => {
  const employee = executive.employee
  if (!employee) return null

  const name = employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Executive'

  return {
    id: executive.id,
    name,
    firstName: employee.firstName,
    lastName: employee.lastName,
    jobPosition: employee.employeePosition?.jobPosition?.name,
    pictureThumbnail: employee.pictureThumbnail
  }
}

// Fallback to the executive's linked investment contact when no employee is set.
const buildFromContact = (executive: CompanyExecutive): ExecutiveOption | null => {
  const contact = executive.investmentContact
  if (!contact) return null

  const name = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Executive'

  return {
    id: executive.id,
    name,
    firstName: contact.firstName,
    lastName: contact.lastName,
    jobPosition: contact.jobPosition,
    pictureThumbnail: contact.pictureThumbnail
  }
}

// Build the executive dropdown options from the opportunity's investment company.
// An executive is included when it links an internal employee or, when no employee
// exists, an investment contact.
export const useCompanyExecutives = (opportunity: OpportunityData | null, preselectedExecutiveId: string | null) => {
  const [searchTerm, setSearchTerm] = useState('')

  const allExecutives = useMemo<ExecutiveOption[]>(() => {
    const executives = opportunity?.investmentCompany?.investmentCompanyExecutive
    if (!executives) return []

    const executiveMap = new Map<string, ExecutiveOption>()

    executives.forEach(executive => {
      const option = buildFromEmployee(executive) || buildFromContact(executive)
      if (option) {
        executiveMap.set(executive.id, option)
      }
    })

    return Array.from(executiveMap.values())
  }, [opportunity])

  const executives = useMemo(() => {
    if (!searchTerm.trim()) return allExecutives

    const search = searchTerm.toLowerCase()
    return allExecutives.filter(
      executive =>
        executive.name.toLowerCase().includes(search) || executive.jobPosition?.toLowerCase().includes(search)
    )
  }, [allExecutives, searchTerm])

  const sortedExecutives = useMemo(() => {
    if (!preselectedExecutiveId) return executives

    const preselected = executives.find(executive => executive.id === preselectedExecutiveId)
    const others = executives.filter(executive => executive.id !== preselectedExecutiveId)

    return preselected ? [preselected, ...others] : executives
  }, [executives, preselectedExecutiveId])

  const search = useCallback((q: string) => {
    setSearchTerm(q || '')
  }, [])

  return {
    executives: sortedExecutives,
    loading: false,
    hasMore: false,
    search,
    loadMore: () => Promise.resolve()
  }
}
