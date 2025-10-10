import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useGetEmployeeDetails } from '../queries/EmployeeDetailsQueries'
import { EmployeeDetailsData } from '../types'

export interface UseEmployeeDetailsDataProps {
  employeeId: string
  context: BusinessAppContextProps
  skipFetch?: boolean // Skip data fetching if true
}

export const useEmployeeDetailsData = ({ employeeId, context, skipFetch }: UseEmployeeDetailsDataProps) => {
  const [employeeData, setEmployeeData] = useState<EmployeeDetailsData | null>(null)
  const [isLoading, setIsLoading] = useState(!skipFetch) // Don't start loading if skipping fetch
  const [error, setError] = useState<string | null>(null)

  const { fetchEmployeeDetails } = useGetEmployeeDetails(context)

  useEffect(() => {
    const loadEmployeeData = async () => {
      if (skipFetch || !employeeId || !context.accessToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const structureId = getCurrentActiveStructureId()
        const result = await fetchEmployeeDetails({
          employeeId,
          structureId,
          hasStructureId: !!structureId
        })

        // Transform the API response to our component format
        if (result.EmployeePosition && result.EmployeePosition.length > 0) {
          const position = result.EmployeePosition[0]
          const employee = position.employee

          const transformedData: EmployeeDetailsData = {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            displayName: employee.displayName,
            pictureThumbnail: employee.pictureThumbnail,
            additionalProperties: employee.additionalProperties || {},
            skills: (employee.skills || []).filter(skill => skill?.skill),
            communication: (employee.communication || []).filter(comm => comm && !comm.isDeleted),
            workingCondition: (employee.workingCondition || []).filter(wc => wc),
            employeePosition: {
              id: position.id,
              organizationalUnitId: position.organizationalUnitId,
              organizationalUnit: position.organizationalUnit,
              supervisor: position.supervisor,
              jobPosition: position.jobPosition,
              jobPositionId: position.jobPositionId,
              siteLocation: position.siteLocation,
              companyId: position.companyId,
              company: position.company,
              siteLocationId: position.siteLocationId,
              costCenterId: position.costCenterId,
              costCenter: position.costCenter,
              matrixUnitEmployees: (position.matrixUnitEmployees || []).filter(item => item?.matrixUnit),
              employeeCapabilities: (position.employeeCapabilities || []).filter(item => item?.capability)
            }
          }

          setEmployeeData(transformedData)
        } else {
          setError('Employee not found')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        console.error('Error loading employee details:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadEmployeeData()
  }, [employeeId, context.accessToken, skipFetch]) // Only depend on the stable values

  // Keep the refetch function for manual retries
  const refetch = useCallback(async () => {
    if (!employeeId || !context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const structureId = getCurrentActiveStructureId()
      const result = await fetchEmployeeDetails({
        employeeId,
        structureId,
        hasStructureId: !!structureId
      })

      if (result.EmployeePosition && result.EmployeePosition.length > 0) {
        const position = result.EmployeePosition[0]
        const employee = position.employee

        const transformedData: EmployeeDetailsData = {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          displayName: employee.displayName,
          pictureThumbnail: employee.pictureThumbnail,
          additionalProperties: employee.additionalProperties || {},
          skills: (employee.skills || []).filter(skill => skill && skill.skill),
          communication: (employee.communication || []).filter(comm => comm && !comm.isDeleted),
          workingCondition: (employee.workingCondition || []).filter(wc => wc),
          employeePosition: {
            id: position.id,
            organizationalUnitId: position.organizationalUnitId,
            organizationalUnit: position.organizationalUnit,
            supervisor: position.supervisor,
            jobPosition: position.jobPosition,
            jobPositionId: position.jobPositionId,
            siteLocation: position.siteLocation,
            companyId: position.companyId,
            company: position.company,
            siteLocationId: position.siteLocationId,
            costCenterId: position.costCenterId,
            costCenter: position.costCenter,
            matrixUnitEmployees: (position.matrixUnitEmployees || []).filter(item => item && item.matrixUnit),
            employeeCapabilities: (position.employeeCapabilities || []).filter(item => item && item.capability)
          }
        }

        setEmployeeData(transformedData)
      } else {
        setError('Employee not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Error loading employee details:', err)
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, context.accessToken, fetchEmployeeDetails])

  return {
    employeeData,
    isLoading,
    error,
    refetch
  }
}
