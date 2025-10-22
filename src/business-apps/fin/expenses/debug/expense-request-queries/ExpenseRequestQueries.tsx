import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { getCurrentActiveStructureId, getCurrentActiveUserLocale } from '../../../../../common/utils/windowUtils'
import { useEmployeeExpenseData } from '../../../../../common/network/expense-request/useEmployeeExpenseData'
import { useCostCentersByStructure } from '../../../../../common/network/cost-center/useCostCentersByStructure'
import { useProjectsByStructure } from '../../../../../common/network/project/useProjectsByStructure'
import { useEmployeeExpenseRule } from '../../../../../common/network/expense-request/useEmployeeExpenseRule'
import { BusinessAppContextProps } from '@/business-apps/types'

// Define the component props
type ExpenseRequestQueriesProps = BusinessAppContextProps
const currentDate = dayjs().format(`YYYY-MM-DDTHH:mm:ss.SSSZZ`)

const ExpenseRequestQueries: React.FC<ExpenseRequestQueriesProps> = ({ accessToken, userInfo }) => {
  // Constants
  const EMPLOYEE_ID = userInfo?.employeeDetails?.employeeId
  const structureId = getCurrentActiveStructureId()
  const activeUserLocale = getCurrentActiveUserLocale()

  // State for query results
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [costCenters, setCostCenters] = useState<any>(null)
  const [projects, setProjects] = useState<any>(null)
  const [employeeRule, setEmployeeRule] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Initialize hooks
  const fetchEmployeeData = useEmployeeExpenseData(accessToken, EMPLOYEE_ID, activeUserLocale)
  const fetchCostCenters = useCostCentersByStructure(accessToken, structureId)
  const fetchProjects = useProjectsByStructure(accessToken, structureId)
  const getEmployeeRule = useEmployeeExpenseRule(accessToken)

  // Fetch data
  useEffect(() => {
    if (!accessToken) {
      return
    }
    const fetchAllData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch employee data (ExpenseRequestType, ExpenseTransportMean, ExpensePlan, EmployeePosition)
        const empData = await fetchEmployeeData()
        setEmployeeData(empData)

        // Fetch cost centers
        const costCenterData = await fetchCostCenters()
        setCostCenters(costCenterData)

        // Fetch projects
        const projectData = await fetchProjects()
        setProjects(projectData)

        // Fetch employee rule
        const ruleData = await getEmployeeRule(EMPLOYEE_ID, currentDate)
        setEmployeeRule(ruleData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [fetchEmployeeData, fetchCostCenters, fetchProjects, getEmployeeRule, currentDate, accessToken])

  return (
    <div className="gba-p-4" data-testid="expense-request-queries">
      <h1 className="gba-text-2xl gba-font-bold gba-mb-4" data-testid="expense-request-queries-title">
        Expense Request API Test
      </h1>

      {loading && (
        <div className="gba-p-2 gba-bg-blue-100 gba-rounded" data-testid="expense-request-loading">
          Loading data...
        </div>
      )}

      {error && (
        <div
          className="gba-p-2 gba-bg-red-100 gba-text-red-700 gba-rounded gba-mb-4"
          data-testid="expense-request-error"
        >
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="gba-space-y-6" data-testid="expense-request-results">
          {/* Employee Data */}
          <div className="gba-border gba-p-3 gba-rounded" data-testid="employee-data-results">
            <h2 className="gba-text-lg gba-font-semibold gba-mb-2">Employee Data:</h2>
            <div className="gba-overflow-auto gba-max-h-64">
              <pre className="gba-whitespace-pre-wrap gba-text-sm gba-bg-gray-50 gba-p-2">
                {JSON.stringify(employeeData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Cost Centers */}
          <div className="gba-border gba-p-3 gba-rounded" data-testid="cost-centers-results">
            <h2 className="gba-text-lg gba-font-semibold gba-mb-2">Cost Centers:</h2>
            <div className="gba-overflow-auto gba-max-h-64">
              <pre className="gba-whitespace-pre-wrap gba-text-sm gba-bg-gray-50 gba-p-2">
                {JSON.stringify(costCenters, null, 2)}
              </pre>
            </div>
          </div>

          {/* Projects */}
          <div className="gba-border gba-p-3 gba-rounded" data-testid="projects-results">
            <h2 className="gba-text-lg gba-font-semibold gba-mb-2">Projects:</h2>
            <div className="gba-overflow-auto gba-max-h-64">
              <pre className="gba-whitespace-pre-wrap gba-text-sm gba-bg-gray-50 gba-p-2">
                {JSON.stringify(projects, null, 2)}
              </pre>
            </div>
          </div>

          {/* Employee Rule */}
          <div className="gba-border gba-p-3 gba-rounded" data-testid="employee-rule-results">
            <h2 className="gba-text-lg gba-font-semibold gba-mb-2">Employee Rule:</h2>
            <div className="gba-overflow-auto gba-max-h-64">
              <pre className="gba-whitespace-pre-wrap gba-text-sm gba-bg-gray-50 gba-p-2">
                {JSON.stringify(employeeRule, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseRequestQueries
