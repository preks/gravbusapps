'use client'

import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge
} from '@newwork/nw-design-system'
import { CompensationHistoryData } from '../../../types/compensationTypes'
import { getCompensationStatusLabel, getCompensationStatusVariant } from '../../../types/compensationEnums'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'
import PayslipHistorySection from './PayslipHistorySection'
import dayjs from 'dayjs'

interface PayHistoryViewProps {
  historyData: CompensationHistoryData
  loading: boolean
}

/**
 * Compensation History View Component
 * Displays historical compensation changes, payslips, and bonus payments
 */
const PayHistoryView: React.FC<PayHistoryViewProps> = ({ historyData, loading }) => {
  // Format currency for display
  const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const { compensationHistory, bonusHistory, payslipHistory } = historyData

  return (
    <div className="gba:space-y-6" data-testid="compensation-history-view">
      {/* Compensation History Section */}
      <Card data-testid="compensation-history-section">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.compensation_history', 'Compensation History')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">Loading compensation history...</div>
          ) : compensationHistory.length === 0 ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">No compensation history available</div>
          ) : (
            <Table data-testid="salary-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Compensation Band</TableHead>
                  <TableHead>Pay Grade</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compensationHistory.map(record => (
                  <TableRow key={record.id} data-testid={`salary-history-row-${record.id}`}>
                    <TableCell>
                      <div className="gba:font-medium">{dayjs(record.effectiveDate).format('MMM D, YYYY')}</div>
                      {record.endDate && (
                        <div className="gba:text-xs gba:text-muted-foreground">
                          to {dayjs(record.endDate).format('MMM D, YYYY')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="gba:font-semibold gba:text-foreground">
                        {formatCurrency(record.baseSalary, record.currency.code)}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">Annually</div>
                    </TableCell>
                    <TableCell>{record.compensationBand ? record.compensationBand.name : '-'}</TableCell>
                    <TableCell>
                      {record.compensationBand ? (
                        <Badge variant="outline">Level {record.compensationBand.payGrade}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="gba:text-sm gba:text-muted-foreground">{record.notes || '-'}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payslip History Section */}
      <PayslipHistorySection payslips={payslipHistory} loading={loading} />

      {/* Bonus History Section */}
      <Card data-testid="bonus-history-section">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.bonus_history', 'Bonus History')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">Loading bonus history...</div>
          ) : bonusHistory.length === 0 ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">No bonus history available</div>
          ) : (
            <Table data-testid="bonus-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonusHistory.map(bonus => (
                  <TableRow key={bonus.id} data-testid={`bonus-history-row-${bonus.id}`}>
                    <TableCell>{dayjs(bonus.paymentDate).format('MMM D, YYYY')}</TableCell>
                    <TableCell>
                      <div className="gba:font-semibold gba:text-success">
                        {formatCurrency(bonus.amount, bonus.currency.code)}
                      </div>
                    </TableCell>
                    <TableCell>{bonus.bonusType.value}</TableCell>
                    <TableCell>{bonus.fiscalYear}</TableCell>
                    <TableCell>
                      <Badge variant={getCompensationStatusVariant(bonus.status)}>
                        {getCompensationStatusLabel(bonus.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="gba:text-sm gba:text-muted-foreground">{bonus.notes || '-'}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PayHistoryView
