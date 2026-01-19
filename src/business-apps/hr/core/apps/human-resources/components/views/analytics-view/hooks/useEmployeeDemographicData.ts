'use client'

import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getEmployeeDemographicDataQuery } from '../queries/getEmployeeDemographicData'

interface UseEmployeeDemographicDataProps {
  accessToken: string
}

export interface DemographicData {
  totalEmployees: number
  genderDistribution: Array<{ gender: string; count: number }>
  nationalityDistribution: Array<{ nationality: string; count: number }>
  ageDistribution: Array<{ ageRange: string; count: number }>
  tenureDistribution: Array<{ tenureRange: string; count: number }>
  averageAge: number | null
  averageTenure: number | null
  mostCommonNationality: string | null
  mostCommonGender: string | null
}

// Age range definitions
const AGE_RANGES = [
  { label: '-17', min: 0, max: 17 },
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-45', min: 36, max: 45 },
  { label: '46-55', min: 46, max: 55 },
  { label: '56-66', min: 56, max: 66 },
  { label: '67+', min: 67, max: 150 }
]

// Tenure range definitions (in years)
const TENURE_RANGES = [
  { label: '< 1 year', min: 0, max: 0.99 },
  { label: '1-2 years', min: 1, max: 2.99 },
  { label: '3-5 years', min: 3, max: 5.99 },
  { label: '6-10 years', min: 6, max: 10.99 },
  { label: '11-15 years', min: 11, max: 15.99 },
  { label: '16-20 years', min: 16, max: 20.99 },
  { label: '21+ years', min: 21, max: 100 }
]

export const useEmployeeDemographicData = ({ accessToken }: UseEmployeeDemographicDataProps) => {
  const client = useGraphqlClient(accessToken)
  const [demographicData, setDemographicData] = useState<DemographicData>({
    totalEmployees: 0,
    genderDistribution: [],
    nationalityDistribution: [],
    ageDistribution: [],
    tenureDistribution: [],
    averageAge: null,
    averageTenure: null,
    mostCommonNationality: null,
    mostCommonGender: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadDemographicData = useCallback(() => {
    if (typeof window === 'undefined' || !client) return

    setLoading(true)
    setError(null)

    client
      .request(getEmployeeDemographicDataQuery, {})
      .then((res: any) => {
        if (!res) {
          setError(new Error('No response from GraphQL query'))
          setLoading(false)
          return
        }

        // Extract employee data from the employee positions
        const employeePositions = res.EmployeePosition || []
        const totalCount = res.EmployeePositionAggregate?.aggregate?.count || 0

        // Keep track of both employee and position data
        const employeeData = employeePositions
          .filter((position: any) => position.employee) // Filter out null employees
          .map((position: any) => ({
            position,
            employee: position.employee
          }))

        const currentDate = dayjs()

        // Process gender distribution
        const genderMap = new Map<string, number>()
        // Initialize with specified categories
        genderMap.set('Male', 0)
        genderMap.set('Female', 0)
        genderMap.set('Non-Binary', 0)
        genderMap.set('None Defined', 0)

        // Process nationality distribution
        const nationalityMap = new Map<string, number>()

        // Process age distribution
        const ageRangeMap = new Map<string, number>()
        // Initialize all age ranges with 0
        AGE_RANGES.forEach(range => {
          ageRangeMap.set(range.label, 0)
        })

        // Process tenure distribution
        const tenureRangeMap = new Map<string, number>()
        // Initialize all tenure ranges with 0
        TENURE_RANGES.forEach(range => {
          tenureRangeMap.set(range.label, 0)
        })

        let totalAge = 0
        let validAgeCount = 0
        let totalTenure = 0
        let validTenureCount = 0

        employeeData.forEach((data: any) => {
          const emp = data.employee
          const position = data.position

          // Process gender
          const gender = emp.gender?.value || 'None Defined'
          genderMap.set(gender, (genderMap.get(gender) || 0) + 1)

          // Process nationality
          const nationality = emp.nationality?.value || 'Unknown'
          nationalityMap.set(nationality, (nationalityMap.get(nationality) || 0) + 1)

          // Process age
          if (emp.birthDate) {
            const birthDate = dayjs(emp.birthDate)
            const age = currentDate.diff(birthDate, 'year')

            totalAge += age
            validAgeCount += 1

            // Find corresponding age range
            const ageRange = AGE_RANGES.find(range => age >= range.min && age <= range.max)
            if (ageRange) {
              ageRangeMap.set(ageRange.label, (ageRangeMap.get(ageRange.label) || 0) + 1)
            }
          } else {
            // Handle missing birth date
            ageRangeMap.set('Unknown', (ageRangeMap.get('Unknown') || 0) + 1)
          }

          // Process tenure - hireDate is on EmployeePosition, not Employee
          const hireDate = position.hireDate
          if (hireDate) {
            const hireDateObj = dayjs(hireDate)
            const tenureYears = currentDate.diff(hireDateObj, 'year', true) // true for floating point

            totalTenure += tenureYears
            validTenureCount += 1

            // Find corresponding tenure range
            const tenureRange = TENURE_RANGES.find(range => tenureYears >= range.min && tenureYears <= range.max)
            if (tenureRange) {
              tenureRangeMap.set(tenureRange.label, (tenureRangeMap.get(tenureRange.label) || 0) + 1)
            }
          } else {
            // Handle missing hire date
            tenureRangeMap.set('Unknown', (tenureRangeMap.get('Unknown') || 0) + 1)
          }
        })

        // Convert maps to arrays for charts
        const genderDistribution = Array.from(genderMap.entries())
          .map(([gender, count]) => ({ gender, count }))
          .filter(item => item.count > 0) // Only include non-zero values

        const nationalityDistribution = Array.from(nationalityMap.entries())
          .map(([nationality, count]) => ({ nationality, count }))
          .sort((a, b) => b.count - a.count) // Sort by count in descending order

        // Calculate average age
        const averageAge = validAgeCount > 0 ? Math.round((totalAge / validAgeCount) * 10) / 10 : null

        // Calculate average tenure
        const averageTenure = validTenureCount > 0 ? Math.round((totalTenure / validTenureCount) * 10) / 10 : null

        // Get most common nationality
        const mostCommonNationality = nationalityDistribution.length > 0 ? nationalityDistribution[0].nationality : null

        // Get most common gender
        const mostCommonGender = genderDistribution.length > 0 ? genderDistribution[0].gender : null

        // Prepare age distribution data
        const ageDistribution = Array.from(ageRangeMap.entries())
          .map(([rangeKey, count]) => ({ ageRange: rangeKey, count }))
          .filter(item => item.ageRange !== 'Unknown' || item.count > 0) // Include 'Unknown' only if it has values

        // Sort age ranges in correct order (not alphabetically)
        ageDistribution.sort((a, b) => {
          if (a.ageRange === 'Unknown') return 1
          if (b.ageRange === 'Unknown') return -1

          const aIndex = AGE_RANGES.findIndex(range => range.label === a.ageRange)
          const bIndex = AGE_RANGES.findIndex(range => range.label === b.ageRange)
          return aIndex - bIndex
        })

        // Prepare tenure distribution data
        const tenureDistribution = Array.from(tenureRangeMap.entries())
          .map(([rangeKey, count]) => ({ tenureRange: rangeKey, count }))
          .filter(item => item.tenureRange !== 'Unknown' || item.count > 0) // Include 'Unknown' only if it has values

        // Sort tenure ranges in correct order (not alphabetically)
        tenureDistribution.sort((a, b) => {
          if (a.tenureRange === 'Unknown') return 1
          if (b.tenureRange === 'Unknown') return -1

          const aIndex = TENURE_RANGES.findIndex(range => range.label === a.tenureRange)
          const bIndex = TENURE_RANGES.findIndex(range => range.label === b.tenureRange)
          return aIndex - bIndex
        })

        setDemographicData({
          // Use the aggregate count to match with the compensation table count
          totalEmployees: totalCount,
          genderDistribution,
          nationalityDistribution,
          ageDistribution,
          tenureDistribution,
          averageAge,
          averageTenure,
          mostCommonNationality,
          mostCommonGender
        })

        setLoading(false)
      })
      .catch((err: any) => {
        console.error('Error fetching employee demographic data:', err)
        setError(err)
        setLoading(false)
      })
  }, [client])

  useEffect(() => {
    loadDemographicData()
  }, [])

  return {
    demographicData,
    loading,
    error,
    reload: loadDemographicData
  }
}

export default useEmployeeDemographicData
