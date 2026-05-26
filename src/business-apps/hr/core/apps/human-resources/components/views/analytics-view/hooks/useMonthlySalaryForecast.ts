import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getMonthlySalaryForecastQuery } from '../queries/getMonthlySalaryForecast'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { selectReportingWorkingConditionsByEmployee } from '../utils/workingConditionSelection'

export interface MonthlySalaryForecast {
  month: string // e.g. '2024-06'
  totalSalary: number
  headcount: number
  newHires: number
}

export const useMonthlySalaryForecast = (props: BusinessAppContextProps, year: number) => {
  const [data, setData] = useState<MonthlySalaryForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | string | null>(null)
  const client = useGraphqlClient(props.accessToken)

  useEffect(() => {
    setLoading(true)
    client
      .request(getMonthlySalaryForecastQuery)
      .then((res: any) => {
        // Prepare months
        const months: MonthlySalaryForecast[] = []
        for (let m = 0; m < 12; m++) {
          const monthStr = dayjs(`${year}-01-01`).add(m, 'month').format('YYYY-MM')
          months.push({ month: monthStr, totalSalary: 0, headcount: 0, newHires: 0 })
        }
        const all = selectReportingWorkingConditionsByEmployee(res.monthly || [])
        months.forEach(month => {
          const start = dayjs(`${month.month}-01`).startOf('month')
          const end = start.endOf('month')
          // Employees active this month
          const active = all.filter((emp: any) => {
            const hire = emp.hireDate ? dayjs(emp.hireDate) : null
            const exit = emp.exitDate ? dayjs(emp.exitDate) : null
            return (!hire || !hire.isAfter(end)) && (!exit || exit.isAfter(start))
          })
          // New hires this month
          const newHires = all.filter((emp: any) => {
            const hire = emp.hireDate ? dayjs(emp.hireDate) : null
            return hire && hire.isSame(start, 'month')
          })
          month.headcount = active.length
          month.totalSalary = active.reduce((sum: number, emp: any) => sum + (emp.monthlyGrossSalary || 0), 0)
          month.newHires = newHires.length
        })
        setData(months)
        setError(null)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [props.accessToken, year])

  return { data, loading, error }
}
