import type { RestClient } from '@/common/network/rest/RestClient'

export const EMPLOYEE_SALARY_ADJUSTMENTS_PATH = '/v1/employee-salaries/adjustments'

export interface EmployeeSalaryAdjustmentPayload {
  employeeId: string
  newAnnualGrossSalary: number
  effectiveDate: string
  requestedPercent: number
}

export interface ExecuteEmployeeSalaryAdjustmentsRestBody {
  adjustments: EmployeeSalaryAdjustmentPayload[]
}

export async function executeEmployeeSalaryAdjustments(
  restClient: RestClient,
  accessToken: string,
  body: ExecuteEmployeeSalaryAdjustmentsRestBody
): Promise<unknown> {
  return restClient.post<unknown>(EMPLOYEE_SALARY_ADJUSTMENTS_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}
