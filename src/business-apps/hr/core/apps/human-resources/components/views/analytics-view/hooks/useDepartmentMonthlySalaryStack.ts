import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getSalaryByOrgUnitQuery } from '../queries/getSalaryByOrgUnit'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { selectReportingWorkingConditionsByEmployee } from '../utils/workingConditionSelection'

export interface DepartmentSalaryStack {
  month: string // e.g. '2024-06'
  totalSalary: number
  departments: {
    id: string
    name: string
    color: string
    salary: number
    percent: number
    change: number
  }[]
  change: number // total salary change from previous month
}

const DEPARTMENT_COLORS = [
  'var(--nw-chart-1)', // Engineering
  'var(--nw-chart-2)', // Sales
  'var(--nw-chart-3)', // Marketing
  'var(--nw-chart-4)', // Operations
  'var(--nw-chart-5)', // HR
  'var(--nw-chart-6)' // Other
]

export const useDepartmentMonthlySalaryStack = (props: BusinessAppContextProps, year: number) => {
  const [data, setData] = useState<DepartmentSalaryStack[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const client = useGraphqlClient(props.accessToken)
  const structureId = getCurrentActiveStructureId()

  useEffect(() => {
    setLoading(true)
    client
      .request(getSalaryByOrgUnitQuery, { structureId })
      .then((res: any) => {
        const orgUnits = res.OrganizationalUnit
        const orgUnitMap: Record<string, { id: string; name: string; color: string }> = {}
        orgUnits.forEach((ou: any, i: number) => {
          orgUnitMap[ou.id] = {
            id: ou.id,
            name: ou.name,
            color: DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length]
          }
        })
        // Map employeeId to departmentId
        const empToDept: Record<string, string> = {}
        res.EmployeeOrganizationalUnit.forEach((eou: any) => {
          empToDept[eou.employeeId] = eou.organizationalUnitId
        })
        // Get one reporting working condition per employee.
        const all = selectReportingWorkingConditionsByEmployee(res.EmployeeWorkingCondition || [])
        // Build month-wise salary stacks
        const months: DepartmentSalaryStack[] = []
        for (let m = 0; m < 12; m++) {
          const monthStr = dayjs(`${year}-01-01`).add(m, 'month').format('YYYY-MM')
          const start = dayjs(`${monthStr}-01`).startOf('month')
          const end = start.endOf('month')
          const deptSums: Record<string, number> = {}
          let total = 0
          all.forEach((emp: any) => {
            const hire = emp.hireDate ? dayjs(emp.hireDate) : null
            const exit = emp.exitDate ? dayjs(emp.exitDate) : null
            const active = (!hire || !hire.isAfter(end)) && (!exit || exit.isAfter(start))
            const deptId = empToDept[emp.employeeId]
            if (active && deptId && emp.monthlyGrossSalary) {
              deptSums[deptId] = (deptSums[deptId] || 0) + emp.monthlyGrossSalary
              total += emp.monthlyGrossSalary
            }
          })
          const departments = Object.entries(deptSums).map(([deptId, salary]) => {
            const dept = orgUnitMap[deptId] || {
              id: deptId,
              name: 'Other',
              color: DEPARTMENT_COLORS[DEPARTMENT_COLORS.length - 1]
            }
            return {
              ...dept,
              salary,
              percent: total > 0 ? (salary / total) * 100 : 0,
              change: 0 // set later
            }
          })
          months.push({ month: monthStr, totalSalary: total, departments, change: 0 })
        }
        // Calculate change from previous month
        for (let i = 1; i < months.length; i++) {
          const prev = months[i - 1]
          const curr = months[i]
          curr.change = curr.totalSalary - prev.totalSalary
          curr.departments.forEach(d => {
            const prevDept = prev.departments.find(pd => pd.id === d.id)
            d.change = d.salary - (prevDept ? prevDept.salary : 0)
          })
        }
        setData(months)
        setError(null)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [props.accessToken, structureId, year])

  return { data, loading, error }
}
