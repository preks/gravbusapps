import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getMonthlySalaryForecastQuery } from '../queries/getMonthlySalaryForecast'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'

export interface MonthlyHeadcountChange {
  month: string // e.g. '2024-06'
  newHires: number
  departures: number
  netChange: number
}

export const useMonthlyHeadcountChanges = (props: BusinessAppContextProps, year: number) => {
  const [data, setData] = useState<MonthlyHeadcountChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const client = useGraphqlClient(props.accessToken)

  useEffect(() => {
    const startOfYear = dayjs(`${year}-01-01`).startOf('month').format('YYYY-MM-DD')
    const endOfYear = dayjs(`${year}-12-31`).endOf('month').format('YYYY-MM-DD')
    setLoading(true)
    client
      .request(getMonthlySalaryForecastQuery, {
        startOfYear,
        endOfYear
      })
      .then((res: any) => {
        const months: MonthlyHeadcountChange[] = []
        for (let m = 0; m < 12; m++) {
          const monthStr = dayjs(`${year}-01-01`).add(m, 'month').format('YYYY-MM')
          months.push({ month: monthStr, newHires: 0, departures: 0, netChange: 0 })
        }
        const all = res.monthly
        months.forEach(month => {
          const start = dayjs(`${month.month}-01`).startOf('month')
          // New hires this month
          const newHires = all.filter((emp: any) => {
            const hire = emp.hireDate ? dayjs(emp.hireDate) : null
            return hire && hire.isSame(start, 'month')
          })
          // Departures this month
          const departures = all.filter((emp: any) => {
            const exit = emp.exitDate ? dayjs(emp.exitDate) : null
            return exit && exit.isSame(start, 'month')
          })
          month.newHires = newHires.length
          month.departures = departures.length
          month.netChange = month.newHires - month.departures
        })
        setData(months)
        setError(null)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [props.accessToken, year])

  return { data, loading, error }
}
