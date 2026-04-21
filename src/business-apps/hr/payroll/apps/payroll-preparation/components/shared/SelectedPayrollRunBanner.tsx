import React from 'react'
import { Card } from '@newwork/nw-design-system'
import type { PayrollRun } from '../../types/payrollTypes'
import { formatDate as formatPlatformDate } from '@/common/utils/windowUtils'
import { PayrollRunStatusBadge, getPayrollRunStatusLabel } from './StatusBadge'

interface SelectedPayrollRunBannerProps {
  payrollRun: PayrollRun
  t: (key: string) => string
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const formatted = formatPlatformDate(dateStr, 'date.short')
  return formatted ?? '-'
}

export const SelectedPayrollRunBanner: React.FC<SelectedPayrollRunBannerProps> = ({ payrollRun, t }) => {
  return (
    <Card className="gba:p-6" data-testid="payroll-prep-selected-run-banner">
      <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{payrollRun.legalEntityName}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {t(`month-${payrollRun.month}`)} {payrollRun.year} | {payrollRun.country}
          </p>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            {t('runs-col-cutoff')}: {formatDate(payrollRun.cutOffDate)} | {t('runs-col-payment')}:{' '}
            {formatDate(payrollRun.paymentDate)}
          </p>
        </div>
        <PayrollRunStatusBadge
          status={payrollRun.status}
          translatedLabel={getPayrollRunStatusLabel(payrollRun.status, t)}
        />
      </div>
    </Card>
  )
}
