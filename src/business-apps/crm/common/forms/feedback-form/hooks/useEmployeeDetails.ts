import { useEmployeeById } from '../../lead-form/hooks/useEmployeeById';
import { EmployeeOption } from '../types';

export const useEmployeeDetails = (accessToken: string, employeeId?: string) => {
  const { employee, loading, error, fetchEmployee } = useEmployeeById({
    accessToken,
    employeeId
  });

  const getEmployeeOption = (): EmployeeOption | null => {
    if (!employee) return null;

    return {
      id: employee.employee.id,
      name: employee.employee.displayName || `${employee.firstName} ${employee.lastName}`,
      email: undefined, // Not available in this query
      jobTitle: employee.jobPosition?.name,
      department: employee.organizationalUnit?.name
    };
  };

  return {
    employee: getEmployeeOption(),
    loading,
    error,
    fetchEmployee,
    rawEmployee: employee
  };
};
