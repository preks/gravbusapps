import { useEffect, useMemo, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { workingConditionQuery } from '../queries/workingCondition'
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'

export interface WorkingConditionKpi {
  id: string
  employeeId: string
  hireDate: string | null
  exitDate: string | null
  monthlyGrossSalary: number | null
  annualGrossSalary: number | null
  hourlyGrossSalary: number | null
  employmentType?: { value: string } | null
  contractType?: { value: string } | null
  region?: { value: string } | null
  remote?: { value: boolean | string } | null
  probationEnd?: string | null
  currency?: { code?: string; value?: string } | null
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
  const { yearStart, yearEnd } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()

    return {
      yearStart: `${year}-01-01`,
      yearEnd: `${year}-12-31`
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    setLoading(true)
    client
      .request(workingConditionQuery, {
        yearStart,
        yearEnd
      })
      .then((res: any) => {
        if (!isMounted) {
          return
        }

        setData(res.EmployeeWorkingCondition || [])
        setCount(res.EmployeeWorkingConditionAggregate?.aggregate?.count || 0)
        setError(null)
      })
      .catch((error) => {
        if (isMounted) {
          setError(error)
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [client, yearEnd, yearStart])

  return { data, count, loading, error }
}
