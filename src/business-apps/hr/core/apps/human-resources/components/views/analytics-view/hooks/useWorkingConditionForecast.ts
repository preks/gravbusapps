import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { workingConditionQuery } from '../queries/workingCondition'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { selectReportingWorkingConditionsByEmployee } from '../utils/workingConditionSelection'

export interface WorkingConditionKpi {
  id: string
  employeeId: string
  activeFrom: string | null
  activeTo: string | null
  hireDate: string | null
  exitDate: string | null
  monthlyGrossSalary: number | null
  annualGrossSalary: number | null
  hourlyGrossSalary: number | null
  employmentType?: { value: string } | null
  contractType?: { value: string } | null
  region?: { value: string } | null
  remote?: any
  probationEnd?: string | null
  currency?: { value: string } | null
}

export interface WorkingConditionKpiResult {
  data: WorkingConditionKpi[]
  count: number
  loading: boolean
  error: any
}

export const useWorkingConditionForecast = (props: BusinessAppContextProps): WorkingConditionKpiResult => {
  const [data, setData] = useState<WorkingConditionKpi[]>([])
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<any>(null)

  const client = useGraphqlClient(props.accessToken)

  useEffect(() => {
    setLoading(true)
    client
      .request(workingConditionQuery)
      .then((res: any) => {
        const workingConditions = (res.EmployeeWorkingCondition || []) as WorkingConditionKpi[]
        const activeWorkingConditions = selectReportingWorkingConditionsByEmployee(workingConditions)
        setData(activeWorkingConditions)
        setCount(activeWorkingConditions.length)
        setError(null)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [props.accessToken])

  return { data, count, loading, error }
}
