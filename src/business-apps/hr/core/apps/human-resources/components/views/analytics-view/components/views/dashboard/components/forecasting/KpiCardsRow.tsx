import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WorkingConditionKpi, WorkingConditionKpiResult } from '../../../../../hooks/useWorkingConditionForecast'

interface KpiCardsRowProps extends BusinessAppContextProps {
  kpiData: WorkingConditionKpiResult
}

const KpiCardsRow: React.FC<KpiCardsRowProps> = ({ kpiData }) => {
  const { loading, data } = kpiData
  const employees: WorkingConditionKpi[] = data as WorkingConditionKpi[]

  const today = new Date()
  const activeEmployees = employees.filter(wc => !wc.exitDate || new Date(wc.exitDate) > today)

  const totalMonthlySalary = activeEmployees.reduce((sum, wc) => sum + (wc.monthlyGrossSalary || 0), 0)
  const totalAnnualSalary = activeEmployees.reduce((sum, wc) => sum + (wc.annualGrossSalary || 0), 0)
  const headcount = activeEmployees.length

  const currencyCode =
    activeEmployees.length && activeEmployees[0].currency && (activeEmployees[0].currency as any).code
      ? (activeEmployees[0].currency as any).code
      : ''

  const formatSalary = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 2 })}M`
    }
    return value.toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 0 })
  }

  const currentYear = today.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const ytdHires = employees.filter(
    wc => wc.hireDate && new Date(wc.hireDate) >= startOfYear && new Date(wc.hireDate) <= today
  ).length
  const ytdDepartures = employees.filter(
    wc => wc.exitDate && new Date(wc.exitDate) >= startOfYear && new Date(wc.exitDate) <= today
  ).length
  const nextMonthForecast = totalMonthlySalary * 1.05
  const sixMonthForecast = totalMonthlySalary * 1.17

  return (
    <div className="gba:relative" data-testid="forecasting-kpi-row-wrapper">
      {loading && (
        <div className="gba:absolute gba:inset-0 gba:z-10 gba:flex gba:items-center gba:justify-center gba:bg-background/70">
          <Spinner />
        </div>
      )}
      <div className="gba:flex gba:flex-row gba:w-full gba:gap-4 gba:mb-6">
        <Card className="gba:shadow gba:rounded gba:flex-1" data-testid="kpi-total-annual-payroll">
          <CardContent className="gba:p-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('forecasting_kpi_total_annual_payroll', 'Total Annual Payroll')}
          </div>
          <div className="gba:text-2xl gba:font-bold gba:mb-1">
            {activeEmployees.length === 0 ? (
              <span>-</span>
            ) : (
              <>
                {formatSalary(totalAnnualSalary)} {currencyCode}
              </>
            )}
          </div>
          </CardContent>
        </Card>
        <Card className="gba:shadow gba:rounded gba:flex-1" data-testid="kpi-total-salary">
          <CardContent className="gba:p-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('forecasting_kpi_total_salary', 'Total Monthly Salary')}
          </div>
          <div className="gba:text-2xl gba:font-bold gba:mb-1">
            {activeEmployees.length === 0 ? (
              <span>-</span>
            ) : (
              <>
                {formatSalary(totalMonthlySalary)} {currencyCode}
              </>
            )}
          </div>
          </CardContent>
        </Card>
        <Card className="gba:shadow gba:rounded gba:flex-1" data-testid="kpi-headcount">
          <CardContent className="gba:p-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('forecasting_kpi_headcount', 'Current Headcount')}
          </div>
          <div className="gba:text-2xl gba:font-bold gba:mb-1">{headcount}</div>
          </CardContent>
        </Card>
        <Card className="gba:shadow gba:rounded gba:flex-1" data-testid="kpi-ytd-hires">
          <CardContent className="gba:p-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('forecasting_kpi_ytd_hires', 'YTD Hires')}
          </div>
          <div className="gba:text-2xl gba:font-bold gba:text-success gba:mb-1">+{ytdHires}</div>
          </CardContent>
        </Card>
        <Card className="gba:shadow gba:rounded gba:flex-1" data-testid="kpi-ytd-departures">
          <CardContent className="gba:p-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('forecasting_kpi_ytd_departures', 'YTD Departures')}
          </div>
          <div className="gba:text-2xl gba:font-bold gba:text-destructive gba:mb-1">-{ytdDepartures}</div>
          </CardContent>
        </Card>
        <Card className="gba:shadow gba:rounded gba:flex-1" data-testid="kpi-next-month-forecast">
          <CardContent className="gba:p-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('forecasting_kpi_next_month_forecast', 'Next Month Forecast')}
          </div>
          <div className="gba:text-2xl gba:font-bold gba:mb-1">
            {activeEmployees.length === 0 ? (
              <span>-</span>
            ) : (
              <>
                {formatSalary(nextMonthForecast)} {currencyCode}
                {/* Difference from current month */}
                {(() => {
                  const diff = nextMonthForecast - totalMonthlySalary
                  if (diff === 0) return null
                  const diffClass = diff > 0 ? 'gba:text-success' : 'gba:text-destructive'
                  return (
                    <div className={`gba:text-xs ${diffClass} gba:mt-1`} data-testid="kpi-next-month-diff">
                      {diff > 0 ? '+' : ''}
                      {formatSalary(diff)} {currencyCode}
                    </div>
                  )
                })()}
              </>
            )}
          </div>
          </CardContent>
        </Card>
        <Card className="gba:shadow gba:rounded gba:flex-1" data-testid="kpi-six-month-forecast">
          <CardContent className="gba:p-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('forecasting_kpi_six_month_forecast', '6-Month Forecast')}
          </div>
          <div className="gba:text-2xl gba:font-bold gba:mb-1">
            {activeEmployees.length === 0 ? (
              <span>-</span>
            ) : (
              <>
                {formatSalary(sixMonthForecast)} {currencyCode}
              </>
            )}
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default KpiCardsRow
export { KpiCardsRow }
