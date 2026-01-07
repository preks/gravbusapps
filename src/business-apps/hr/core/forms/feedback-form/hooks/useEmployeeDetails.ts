import { useEmployeeById } from '@/common/data/employee/hooks/useEmployeeById'
import { EmployeeOption } from '../types'

export const useEmployeeDetails = (accessToken: string, employeeId?: string) => {
  const { employee, loading, error, fetchEmployee } = useEmployeeById({
    accessToken,
    employeeId
  })

  const getEmployeeOption = (): EmployeeOption | null => {
    if (!employee) return null

    return {
      id: employee.employee.id, // Use the actual employee ID from the employee object
      name: employee.employee.displayName || `${employee.firstName} ${employee.lastName}`,
      jobTitle: employee.jobPosition?.name,
      department: employee.organizationalUnit?.name,
      userId: employee.employee?.userId || undefined, // Include the user ID, convert null to undefined
      pictureThumbnail: employee.employee.pictureThumbnail || undefined // Include picture thumbnail
    }
  }

  return {
    employee: getEmployeeOption(),
    loading,
    error,
    fetchEmployee,
    rawEmployee: employee
  }
}
