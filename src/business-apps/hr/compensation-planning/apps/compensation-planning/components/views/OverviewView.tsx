import React from 'react'
import { Card, CardContent, Spinner, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { formatCurrency } from '../../../../utils/budgetCalculations'

interface OverviewViewProps {
  accessToken: string
  companyId: string
}

export const OverviewView: React.FC<OverviewViewProps> = ({ accessToken, companyId }) => {
  const { teamMembers, loading, error } = useTeamCompensationData({
    accessToken,
    companyId
  })

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const totalHeadcount = teamMembers.length
  const totalSalaryCost = teamMembers.reduce((sum, m) => sum + (m.currentAnnualSalary ?? 0), 0)
  const totalBonuses = teamMembers.reduce((sum, m) => sum + (m.currentBonusTotal ?? 0), 0)
  const totalBenefits = teamMembers.reduce((sum, m) => sum + (m.currentBenefitsTotal ?? 0), 0)
  const currency = teamMembers[0]?.currency ?? 'EUR'
  const avgSalary = totalHeadcount > 0 ? totalSalaryCost / totalHeadcount : 0

  return (
    <div className="gba:space-y-4">
      <Alert>
        <AlertTitle>Preview Mode</AlertTitle>
        <AlertDescription>
          Compensation cycles require backend tables that are not yet configured. Below is a summary of current employee
          compensation data for this company.
        </AlertDescription>
      </Alert>

      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-4 gba:gap-4">
        <Card>
          <CardContent className="gba:p-4 gba:text-center">
            <div className="gba:text-2xl gba:font-bold">{totalHeadcount}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Total Headcount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4 gba:text-center">
            <div className="gba:text-2xl gba:font-bold">{formatCurrency(totalSalaryCost, currency)}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Annual Salary Cost</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4 gba:text-center">
            <div className="gba:text-2xl gba:font-bold">{formatCurrency(avgSalary, currency)}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Average Salary</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4 gba:text-center">
            <div className="gba:text-2xl gba:font-bold">{formatCurrency(totalBonuses, currency)}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Total Bonuses YTD</div>
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardContent className="gba:p-4">
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3">Compensation Breakdown</h3>
            <div className="gba:space-y-2">
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">Total Salary Cost</span>
                <span className="gba:text-sm gba:font-medium">{formatCurrency(totalSalaryCost, currency)}</span>
              </div>
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">Total Bonuses</span>
                <span className="gba:text-sm gba:font-medium">{formatCurrency(totalBonuses, currency)}</span>
              </div>
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">Total Benefits</span>
                <span className="gba:text-sm gba:font-medium">{formatCurrency(totalBenefits, currency)}</span>
              </div>
              <div className="gba:border-t gba:pt-2 gba:flex gba:justify-between">
                <span className="gba:text-sm gba:font-semibold">Total Compensation</span>
                <span className="gba:text-sm gba:font-bold">
                  {formatCurrency(totalSalaryCost + totalBonuses + totalBenefits, currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gba:p-4">
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3">Workforce Stats</h3>
            <div className="gba:space-y-2">
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">Employees</span>
                <span className="gba:text-sm gba:font-medium">{totalHeadcount}</span>
              </div>
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">With Salary Data</span>
                <span className="gba:text-sm gba:font-medium">
                  {teamMembers.filter(m => m.currentAnnualSalary != null).length}
                </span>
              </div>
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">With Comp Band</span>
                <span className="gba:text-sm gba:font-medium">
                  {teamMembers.filter(m => m.compensationBand != null).length}
                </span>
              </div>
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">Average Compa-Ratio</span>
                <span className="gba:text-sm gba:font-medium">
                  {(() => {
                    const withRatio = teamMembers.filter(m => m.compaRatio != null)
                    if (withRatio.length === 0) return '-'
                    const avg = withRatio.reduce((s, m) => s + (m.compaRatio ?? 0), 0) / withRatio.length
                    return avg.toFixed(2)
                  })()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
