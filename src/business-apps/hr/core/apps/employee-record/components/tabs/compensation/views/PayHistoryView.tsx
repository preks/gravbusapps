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
import { CompensationHistoryData } from '../types/compensationTypes'
import { getCompensationStatusLabel, getCompensationStatusVariant } from '../types/compensationEnums'
import PayslipHistorySection from '../components/history/PayslipHistorySection'
import dayjs from 'dayjs'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface PayHistoryViewProps extends BusinessAppContextProps {
  t: (key: string, params?: any) => string
  historyData: CompensationHistoryData
  loading: boolean
  locale: string
}

/**
 * Compensation History View Component
 * Displays historical compensation changes, payslips, and bonus payments
 */
const PayHistoryView: React.FC<PayHistoryViewProps> = ({
  t,
  historyData,
  loading,
  locale,
  accessToken,
  userInfo,
  additionalData
}) => {
  const { compensationHistory, bonusHistory, payslipHistory } = historyData

  return (
    <div className="gba:space-y-6" data-testid="compensation-history-view">
      {/* Compensation History Section */}
      <Card data-testid="compensation-history-section">
        <CardHeader>
          <CardTitle>{t('history-compensation-title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">
              {t('history-loading-compensation')}
            </div>
          ) : compensationHistory.length === 0 ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('history-no-compensation')}</div>
          ) : (
            <Table data-testid="salary-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table-effective-date')}</TableHead>
                  <TableHead>{t('table-base-salary')}</TableHead>
                  <TableHead>{t('table-compensation-band')}</TableHead>
                  <TableHead>{t('table-pay-grade')}</TableHead>
                  <TableHead>{t('table-notes')}</TableHead>
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
                        {formatCurrencyString(record.baseSalary, {
                          currency: record.currency.code,
                          locale: locale,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">{t('current-annually')}</div>
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
      <PayslipHistorySection
        t={t}
        payslips={payslipHistory}
        loading={loading}
        locale={locale}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
      />

      {/* Bonus History Section */}
      <Card data-testid="bonus-history-section">
        <CardHeader>
          <CardTitle>{t('history-bonus-title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('history-loading-bonus')}</div>
          ) : bonusHistory.length === 0 ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('history-no-bonus')}</div>
          ) : (
            <Table data-testid="bonus-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table-date')}</TableHead>
                  <TableHead>{t('table-amount')}</TableHead>
                  <TableHead>{t('table-type')}</TableHead>
                  <TableHead>{t('table-fiscal-year')}</TableHead>
                  <TableHead>{t('table-status')}</TableHead>
                  <TableHead>{t('table-notes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonusHistory.map(bonus => (
                  <TableRow key={bonus.id} data-testid={`bonus-history-row-${bonus.id}`}>
                    <TableCell>{dayjs(bonus.paymentDate).format('MMM D, YYYY')}</TableCell>
                    <TableCell>
                      <div className="gba:font-semibold gba:text-success">
                        {formatCurrencyString(bonus.amount, {
                          currency: bonus.currency.code,
                          locale: locale,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
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
