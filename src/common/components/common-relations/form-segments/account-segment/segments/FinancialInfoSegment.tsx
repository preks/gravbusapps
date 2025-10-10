import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { useCatalogOptions } from '../../shared/hooks/useCatalogOptions'

interface Props {
  annualRevenueLabel?: React.ReactNode
  numberOfEmployeesLabel?: React.ReactNode
  timeZoneLabel?: React.ReactNode
  foundationDateLabel?: React.ReactNode
  tickerSymbolLabel?: React.ReactNode

  accessToken?: string

  annualRevenueOptions?: Array<{ value: string; label: string }>
  annualRevenueCatalog?: { identifier: string; version: string }
  fetchAnnualRevenueOptions?: (q?: string) => Promise<Array<{ value: string; label: string }>>

  employeeSizeOptions?: Array<{ value: string; label: string }>
  employeeSizeCatalog?: { identifier: string; version: string }
  fetchEmployeeSizeOptions?: (q?: string) => Promise<Array<{ value: string; label: string }>>

  timeZoneOptions?: Array<{ value: string; label: string }>
  timeZoneCatalog?: { identifier: string; version: string }
  fetchTimeZoneOptions?: (q?: string) => Promise<Array<{ value: string; label: string }>>
}

const FinancialInfoSegment: React.FC<Props> = ({
  annualRevenueLabel,
  numberOfEmployeesLabel,
  timeZoneLabel,
  foundationDateLabel,
  tickerSymbolLabel,
  accessToken,
  annualRevenueOptions,
  annualRevenueCatalog,
  fetchAnnualRevenueOptions,
  employeeSizeOptions,
  employeeSizeCatalog,
  fetchEmployeeSizeOptions,
  timeZoneOptions,
  timeZoneCatalog,
  fetchTimeZoneOptions
}) => {
  const form = useFormContext<any>()

  const revenueState = useCatalogOptions({
    accessToken,
    catalog: annualRevenueCatalog,
    providedOptions: annualRevenueOptions,
    fetchOptions: fetchAnnualRevenueOptions
  })
  const employeeSizeState = useCatalogOptions({
    accessToken,
    catalog: employeeSizeCatalog,
    providedOptions: employeeSizeOptions,
    fetchOptions: fetchEmployeeSizeOptions
  })
  const timeZoneState = useCatalogOptions({
    accessToken,
    catalog: timeZoneCatalog,
    providedOptions: timeZoneOptions,
    fetchOptions: fetchTimeZoneOptions
  })

  return (
    <>
      {/* Annual Revenue + Number of Employees */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {annualRevenueLabel && (
          <FormField
            control={form.control as any}
            name="annualRevenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{annualRevenueLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="account-segment-annual-revenue">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {revenueState.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {revenueState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {numberOfEmployeesLabel && (
          <FormField
            control={form.control as any}
            name="numberOfEmployees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{numberOfEmployeesLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="account-segment-number-of-employees">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employeeSizeState.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {employeeSizeState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Time Zone + Foundation Date */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {timeZoneLabel && (
          <FormField
            control={form.control as any}
            name="timeZone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{timeZoneLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="account-segment-time-zone">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeZoneState.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {timeZoneState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {foundationDateLabel && (
          <FormField
            control={form.control as any}
            name="foundationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{foundationDateLabel}</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="account-segment-foundation-date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Ticker Symbol */}
      {tickerSymbolLabel && (
        <FormField
          control={form.control as any}
          name="tickerSymbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tickerSymbolLabel}</FormLabel>
              <FormControl>
                <Input data-testid="account-segment-ticker-symbol" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}

export default FinancialInfoSegment
