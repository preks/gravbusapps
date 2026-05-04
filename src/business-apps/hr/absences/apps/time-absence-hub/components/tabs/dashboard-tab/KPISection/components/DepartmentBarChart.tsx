import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { ChartBarIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DepartmentBarChartProps {
  data: any[]
  onBarClick: (data: any) => void
}

interface DepartmentTooltipContentProps {
  active?: boolean
  payload?: Array<{ payload: any }>
}

const DepartmentTooltipContent: React.FC<DepartmentTooltipContentProps> = ({ active, payload }) => {
  if (!active || !payload?.length) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="gba:bg-card gba:p-3 gba:border gba:rounded gba:shadow gba:min-w-48 gba:select-none">
      <p className="gba:font-medium gba:mb-2">{data.fullName}</p>
      <div className="gba:space-y-1 gba:text-sm">
        <p className="gba:text-info">
          {data.absences}{' '}
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.total_absence_days',
            'total absence days'
          )}
        </p>
        <p className="gba:text-info">
          {data.uniqueEmployees}{' '}
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.employees', 'employees')}
        </p>
        <p className="gba:text-success">
          {data.avgDaysPerEmployee}{' '}
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.avg_days_per_employee',
            'avg days/employee'
          )}
        </p>
        <p className="gba:text-warning">
          {data.avgRequestsPerEmployee}{' '}
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.avg_requests_per_employee',
            'avg requests/employee'
          )}
        </p>
        <p className="gba:text-muted-foreground gba:text-xs gba:mt-2">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.total', 'Total')}:{' '}
          {data.totalRequests}{' '}
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.requests', 'requests')}
        </p>
      </div>
    </div>
  )
}

export const DepartmentBarChart: React.FC<DepartmentBarChartProps> = ({ data, onBarClick }) => {
  return (
    <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="department-chart-card">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <ChartBarIcon size={20} className="gba:text-info" />
        <div>
          <h5 className="gba:text-sm gba:font-medium gba:m-0">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.top_departments',
              'Top Departments'
            )}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_days_by_department',
              'Absence days by department (with avg per employee)'
            )}
          </p>
        </div>
      </div>
      <div className="gba:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} className="gba:cursor-pointer">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} fontSize={12} />
            <YAxis fontSize={12} />
            <RechartsTooltip content={<DepartmentTooltipContent />} />

            <Bar dataKey="absences" fill="transparent" onClick={data => onBarClick(data)} barSize={40} />

            <Bar
              dataKey="absences"
              fill="var(--nw-chart-3)"
              onClick={data => onBarClick(data)}
              radius={[2, 2, 0, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
