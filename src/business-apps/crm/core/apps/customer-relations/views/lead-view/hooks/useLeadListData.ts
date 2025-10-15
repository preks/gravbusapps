import { useState, useCallback, useMemo } from 'react'
import { Lead, LeadQueryVariables } from '../types'
import { useGetLeadsData } from '../queries/LeadQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { enforceQueryLimit } from '../../../../../../common/utils/queryLimits'

interface LeadListDataProps {
  search: string
  leadStatuses: string[]
  leadRatings: string[]
  leadSources: string[]
  industries: string[]
  companySizes: string[]
  owners: string[]
  leadContacts: string[]
  leadCompanies: string[]
  countries: string[]
  regions: string[]
  cities: string[]
  createdAfter?: string
  createdBefore?: string
  sensitive?: boolean
  sortField?: string
  sortOrder?: 'ASC' | 'DESC' | ''
  accessToken: string
  sourceApp?: string
}

interface UseLeadListDataReturn {
  leads: Lead[]
  total: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  loadPage: (
    page: number,
    pageSize?: number,
    additionalFilters?: any,
    overrideSortField?: string,
    overrideSortOrder?: 'ASC' | 'DESC' | '',
    showLoading?: boolean
  ) => Promise<void>
  retry: () => void
}

export const useLeadListData = ({
  search = '',
  leadStatuses = [],
  leadRatings = [],
  leadSources = [],
  industries = [],
  companySizes = [],
  owners = [],
  leadContacts = [],
  leadCompanies = [],
  countries = [],
  regions = [],
  cities = [],
  createdAfter,
  createdBefore,
  sensitive,
  sortField = 'createdAt',
  sortOrder = 'DESC',
  accessToken,
  sourceApp
}: LeadListDataProps): UseLeadListDataReturn => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [hasMore, setHasMore] = useState(true)

  const { fetchLeadsData } = useGetLeadsData({
    accessToken
  } as BusinessAppContextProps)

  // Stabilize filter arrays using useMemo to prevent infinite loops
  const stableFilters = useMemo(
    () => ({
      leadStatuses: [...leadStatuses],
      leadRatings: [...leadRatings],
      leadSources: [...leadSources],
      industries: [...industries],
      companySizes: [...companySizes],
      owners: [...owners],
      leadContacts: [...leadContacts],
      leadCompanies: [...leadCompanies],
      countries: [...countries],
      regions: [...regions],
      cities: [...cities]
    }),
    [
      leadStatuses.join(','),
      leadRatings.join(','),
      leadSources.join(','),
      industries.join(','),
      companySizes.join(','),
      owners.join(','),
      leadContacts.join(','),
      leadCompanies.join(','),
      countries.join(','),
      regions.join(','),
      cities.join(',')
    ]
  )

  const loadPage = useCallback(
    async (
      targetPage: number,
      newPageSize: number = pageSize,
      additionalFilters: any = {},
      overrideSortField?: string,
      overrideSortOrder?: 'ASC' | 'DESC' | '',
      showLoading: boolean = true
    ) => {
      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      try {
        // Enforce query limit to ensure optimal performance
        const safePageSize = enforceQueryLimit(newPageSize)
        const offset = (targetPage - 1) * safePageSize

        // Build where clause directly (similar to employee hook pattern)
        const baseWhere = { isDeleted: { _eq: false } }
        const conditions: any[] = []

        // Add sourceApp filter if provided
        if (sourceApp) {
          conditions.push({ sourceApp: { _eq: sourceApp } })
        }

        // Add search conditions
        if (search) {
          const searchConditions = [
            { firstName: { _ilike: `%${search}%` } },
            { lastName: { _ilike: `%${search}%` } },
            { email: { _ilike: `%${search}%` } },
            { companyName: { _ilike: `%${search}%` } },
            { position: { _ilike: `%${search}%` } },
            { companyEmail: { _ilike: `%${search}%` } }, // Added: displayed in company info
            { companyWebsite: { _ilike: `%${search}%` } }, // Added: displayed in company info
            { companyPhone: { _ilike: `%${search}%` } }, // Added: displayed in company phone
            { phoneNumber: { _ilike: `%${search}%` } }, // Added: personal phone number
            { industry: { value: { _ilike: `%${search}%` } } }, // Added: displayed in industry
            { academicTitle: { value: { _ilike: `%${search}%` } } }, // Added: displayed in contact name
            { leadStatus: { value: { _ilike: `%${search}%` } } }, // Added: displayed in status
            { leadRating: { value: { _ilike: `%${search}%` } } }, // Added: displayed in rating
            { leadSource: { value: { _ilike: `%${search}%` } } }, // Added: displayed in source
            { country: { value: { _ilike: `%${search}%` } } }, // Added: displayed in country column
            { region: { value: { _ilike: `%${search}%` } } }, // Fixed: region is a CatalogEntry object
            { city: { _ilike: `%${search}%` } }, // Added: displayed in city column
            { addressLine: { _ilike: `%${search}%` } }, // Fixed: use addressLine instead of address
            { postalCode: { _ilike: `%${search}%` } }, // Added: postal code search
            { ownerEmployee: { firstName: { _ilike: `%${search}%` } } },
            { ownerEmployee: { lastName: { _ilike: `%${search}%` } } },
            { ownerEmployee: { fullName: { _ilike: `%${search}%` } } },
            { account: { name: { _ilike: `%${search}%` } } },
            { contact: { firstName: { _ilike: `%${search}%` } } },
            { contact: { lastName: { _ilike: `%${search}%` } } },
            { contact: { email: { _ilike: `%${search}%` } } }
          ]
          conditions.push({ _or: searchConditions })
        }

        // Add lead status filter
        if (stableFilters.leadStatuses.length > 0) {
          conditions.push({
            leadStatus: {
              id: { _in: stableFilters.leadStatuses }
            }
          })
        }

        // Add industry filter
        if (stableFilters.industries.length > 0) {
          conditions.push({
            account: {
              industry: {
                id: { _in: stableFilters.industries }
              }
            }
          })
        }

        // Add owner filter
        if (stableFilters.owners.length > 0) {
          conditions.push({ ownerEmployeeId: { _in: stableFilters.owners } })
        }

        // Add contact filter
        if (stableFilters.leadContacts.length > 0) {
          conditions.push({
            contact: {
              id: { _in: stableFilters.leadContacts }
            }
          })
        }

        // Add company filter
        if (stableFilters.leadCompanies.length > 0) {
          conditions.push({
            _or: [
              { companyName: { _in: stableFilters.leadCompanies } },
              { account: { name: { _in: stableFilters.leadCompanies } } }
            ]
          })
        }

        // Company size filters - filter through account relationship using employee count ranges
        if (stableFilters.companySizes.length > 0) {
          const sizeConditions: any[] = []

          stableFilters.companySizes.forEach(sizeId => {
            switch (sizeId) {
              case 'startup':
                // 1-10 employees - use _or with _ilike patterns for better matching
                sizeConditions.push({
                  account: {
                    numberOfEmployees: {
                      value: {
                        _or: [{ _ilike: '%1-10%' }, { _ilike: '%startup%' }, { _ilike: '%micro%' }]
                      }
                    }
                  }
                })
                break
              case 'small':
                // 11-50 employees
                sizeConditions.push({
                  account: {
                    numberOfEmployees: {
                      value: {
                        _or: [{ _ilike: '%11-50%' }, { _ilike: '%small%' }]
                      }
                    }
                  }
                })
                break
              case 'medium':
                // 51-200 employees
                sizeConditions.push({
                  account: {
                    numberOfEmployees: {
                      value: {
                        _or: [{ _ilike: '%51-200%' }, { _ilike: '%medium%' }]
                      }
                    }
                  }
                })
                break
              case 'large':
                // 201-1000 employees
                sizeConditions.push({
                  account: {
                    numberOfEmployees: {
                      value: {
                        _or: [{ _ilike: '%201-1000%' }, { _ilike: '%large%' }]
                      }
                    }
                  }
                })
                break
              case 'enterprise':
                // 1000+ employees
                sizeConditions.push({
                  account: {
                    numberOfEmployees: {
                      value: {
                        _or: [{ _ilike: '%1000+%' }, { _ilike: '%enterprise%' }]
                      }
                    }
                  }
                })
                break
            }
          })
        }

        // Add lead rating filter
        if (stableFilters.leadRatings.length > 0) {
          conditions.push({
            leadRating: {
              id: { _in: stableFilters.leadRatings }
            }
          })
        }

        // Add lead source filter
        if (stableFilters.leadSources.length > 0) {
          conditions.push({
            leadSource: {
              id: { _in: stableFilters.leadSources }
            }
          })
        }

        // Add country filter
        if (stableFilters.countries.length > 0) {
          conditions.push({
            country: { value: { _in: stableFilters.countries } }
          })
        }

        // Add region filter
        if (stableFilters.regions.length > 0) {
          conditions.push({
            region: { value: { _in: stableFilters.regions } }
          })
        }

        // Add city filter
        if (stableFilters.cities.length > 0) {
          conditions.push({ city: { _in: stableFilters.cities } })
        }

        // Add date range filters
        if (createdAfter) {
          conditions.push({ createdAt: { _gte: createdAfter } })
        }

        if (createdBefore) {
          conditions.push({ createdAt: { _lte: createdBefore } })
        }

        // Sensitivity filter (boolean)
        if (typeof sensitive === 'boolean') {
          conditions.push({ sensitive: { _eq: sensitive } })
        }

        // Combine base where with conditions
        const where = conditions.length > 0 ? { ...baseWhere, _and: conditions } : baseWhere

        // Build orderBy based on sortField and sortOrder
        const orderBy: any = {}
        if (overrideSortField && overrideSortField !== '') {
          if (overrideSortField === 'accountName') {
            orderBy.account = {
              name: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'ownerEmployeeId') {
            orderBy.ownerEmployee = {
              displayName: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'leadRatingRef') {
            orderBy.leadRating = {
              value: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'leadStatusRef') {
            orderBy.leadStatus = {
              value: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'firstName') {
            orderBy.contact = {
              firstName: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST',
              lastName: 'ASC_NULLS_LAST'
            }
          } else if (overrideSortField === 'leadCombined') {
            // Priority: contact name first (firstName, lastName), fallback companyName
            orderBy.contact = {
              firstName: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST',
              lastName: 'ASC_NULLS_LAST'
            } as any
            // Also include companyName as secondary
            ;(orderBy as any).companyName = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'createdAt') {
            orderBy.createdAt = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'companyName') {
            orderBy.companyName = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'email') {
            orderBy.email = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'companyWebsite') {
            orderBy.companyWebsite = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'companyPhone') {
            orderBy.companyPhone = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'conversionDate') {
            orderBy.conversionDate = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'industryRef') {
            orderBy.industry = {
              value: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'leadSourceRef') {
            orderBy.leadSource = {
              value: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'countryRef') {
            orderBy.country = {
              value: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'regionRef') {
            orderBy.region = {
              value: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'city') {
            orderBy.city = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'sensitive') {
            orderBy.sensitive = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          }
        } else if (sortField && sortField !== '') {
          if (sortField === 'accountName') {
            orderBy.account = {
              name: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'ownerEmployeeId') {
            orderBy.ownerEmployee = {
              displayName: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'leadRatingRef') {
            orderBy.leadRating = {
              value: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'leadStatusRef') {
            orderBy.leadStatus = {
              value: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'firstName') {
            orderBy.contact = {
              firstName: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST',
              lastName: 'ASC_NULLS_LAST'
            }
          } else if (sortField === 'leadCombined') {
            orderBy.contact = {
              firstName: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST',
              lastName: 'ASC_NULLS_LAST'
            } as any
            ;(orderBy as any).companyName = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (sortField === 'createdAt') {
            orderBy.createdAt = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (sortField === 'companyName') {
            orderBy.companyName = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (sortField === 'email') {
            orderBy.email = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (sortField === 'companyWebsite') {
            orderBy.companyWebsite = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (sortField === 'companyPhone') {
            orderBy.companyPhone = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (sortField === 'conversionDate') {
            orderBy.conversionDate = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (sortField === 'industryRef') {
            orderBy.industry = {
              value: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'leadSourceRef') {
            orderBy.leadSource = {
              value: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'countryRef') {
            orderBy.country = {
              value: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'regionRef') {
            orderBy.region = {
              value: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'city') {
            orderBy.city = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (sortField === 'sensitive') {
            orderBy.sensitive = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          }
        }

        // Default sorting if no specific sort is provided
        if (Object.keys(orderBy).length === 0) {
          orderBy.createdAt = 'DESC_NULLS_LAST'
        }

        const variables: LeadQueryVariables = {
          offset,
          limit: safePageSize,
          orderBy: [orderBy],
          where
        }

        const result = await fetchLeadsData(variables)

        setLeads(result.Lead || [])
        setTotal(result.LeadAggregate?.aggregate?.count || 0)
        setCurrentPage(targetPage)
        setPageSize(safePageSize)
        setHasMore((result.Lead || []).length === safePageSize)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load leads'))
        setLeads([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [
      fetchLeadsData,
      search,
      pageSize,
      sortField,
      sortOrder,
      stableFilters,
      createdAfter,
      createdBefore,
      sourceApp,
      sensitive
    ]
  )

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    loadPage(currentPage + 1)
  }, [hasMore, loading, currentPage, loadPage])

  const retry = useCallback(() => {
    loadPage(currentPage)
  }, [currentPage, loadPage])

  return {
    leads,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  }
}
