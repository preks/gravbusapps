import React, { useState, useMemo } from 'react'
import {
  Button,
  DateInput,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { PayrollRun } from '../../types/payrollTypes'

export interface CreatePayrollRunParams {
  month: number
  year: number
  cutOffDate: string
  paymentDate: string
}

interface CreatePayrollRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingRuns: PayrollRun[]
  saving: boolean
  onSubmit: (params: CreatePayrollRunParams) => Promise<void>
  t: (key: string) => string
}

const MONTH_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function getYearOptions(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current - 2; y <= current + 2; y++) years.push(y)
  return years
}

function lastDayOfMonth(month: number, year: number): string {
  const d = new Date(Date.UTC(year, month, 0))
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function defaultCutOffDate(month: number, year: number): string {
  return lastDayOfMonth(month, year)
}

function defaultPaymentDate(cutOff: string): string {
  return addDays(cutOff, 10)
}

export const CreatePayrollRunDialog: React.FC<CreatePayrollRunDialogProps> = ({
  open,
  onOpenChange,
  existingRuns,
  saving,
  onSubmit,
  t
}) => {
  const now = new Date()
  const initCutOff = defaultCutOffDate(now.getMonth() + 1, now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [cutOffDate, setCutOffDate] = useState(initCutOff)
  const [paymentDate, setPaymentDate] = useState(defaultPaymentDate(initCutOff))

  const handleMonthChange = (val: string) => {
    const m = Number(val)
    setMonth(m)
    const cutOff = defaultCutOffDate(m, year)
    setCutOffDate(cutOff)
    setPaymentDate(defaultPaymentDate(cutOff))
  }

  const handleYearChange = (val: string) => {
    const y = Number(val)
    setYear(y)
    const cutOff = defaultCutOffDate(month, y)
    setCutOffDate(cutOff)
    setPaymentDate(defaultPaymentDate(cutOff))
  }

  const isDuplicate = useMemo(
    () => existingRuns.some(r => r.month === month && r.year === year),
    [existingRuns, month, year]
  )

  const isValid = cutOffDate && paymentDate && !isDuplicate

  const handleSubmit = async () => {
    if (!isValid) return
    await onSubmit({ month, year, cutOffDate, paymentDate })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('create-run-title')}</DialogTitle>
          <DialogDescription>{t('create-run-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                {t('create-run-month')}
              </label>
              <Select value={String(month)} onValueChange={handleMonthChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_VALUES.map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {t(`month-${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                {t('create-run-year')}
              </label>
              <Select value={String(year)} onValueChange={handleYearChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map(y => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
              {t('create-run-cutoff')}
            </label>
            <DateInput
              type="date"
              value={cutOffDate}
              onChange={val => setCutOffDate(typeof val === 'string' ? val : '')}
            />
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
              {t('create-run-payment')}
            </label>
            <DateInput
              type="date"
              value={paymentDate}
              onChange={val => setPaymentDate(typeof val === 'string' ? val : '')}
            />
          </div>

          {isDuplicate && <p className="gba:text-sm gba:text-destructive">{t('create-run-duplicate-error')}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('create-run-cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || saving}>
            {t('create-run-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
