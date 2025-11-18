'use client'

import React, { useState, useMemo } from 'react'
import {
  Input,
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
  Calendar,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface RequestCorrectionFormProps extends BusinessAppContextProps {
  employeeId: string
  onSubmitted?: () => void
}

export const RequestCorrectionForm: React.FC<RequestCorrectionFormProps> = ({ employeeId, onSubmitted }) => {
  const form = useForm<{ date: string; type: 'CLOCK_IN' | 'CLOCK_OUT'; notes?: string }>({
    defaultValues: { date: '', type: 'CLOCK_IN', notes: '' },
    mode: 'onChange'
  })
  const [submitting] = useState(false)

  const [typeVal, dateVal, notesVal] = form.watch(['type', 'date', 'notes']) as [
    'CLOCK_IN' | 'CLOCK_OUT',
    string,
    string
  ]
  const isValid = useMemo(() => {
    const hasNotes = typeof notesVal === 'string' && notesVal.trim().length > 0
    return Boolean(typeVal && dateVal && hasNotes)
  }, [typeVal, dateVal, notesVal])

  const handleSubmit = async () => {
    // Transform into submission payload; here we just echo
    const vals = form.getValues()
    const result = { employeeId, ...vals }
    // Simulate async; replace with mutation/flow start
    await new Promise(r => setTimeout(r, 200))
    onSubmitted?.()
    return result
  }

  return (
    <div className="gba:space-y-6" data-testid="request-correction-form">
      <FormHeader
        title={getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.request_correction', 'Request Correction')}
        flowIconUrl={flowIconUrl}
      />

      <AppActionForm
        processType="create"
        onSubmit={handleSubmit}
        form={form as any}
        formData={form.getValues()}
        data-testid="request-correction-app-action-form"
        submitButtonText="Submit"
        isSubmitDisabled={!isValid || submitting}
      >
        <div className="gba:flex-1 gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            <FormField
              control={form.control as any}
              name="type"
              rules={{ required: 'Type is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Type <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} data-testid="rcf-type">
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLOCK_IN">Clock In</SelectItem>
                        <SelectItem value="CLOCK_OUT">Clock Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="date"
              rules={{ required: 'Date is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Date <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div data-testid="rcf-date">
                      <Calendar
                        type="datetime-local"
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date: Date | undefined) => field.onChange(date ? date.toISOString() : '')}
                        disabled={(date: Date) => {
                          // Start of current month (inclusive)
                          const start = new Date()
                          start.setDate(1)
                          start.setHours(0, 0, 0, 0)

                          // End of current month (inclusive)
                          const end = new Date(start)
                          end.setMonth(end.getMonth() + 1)
                          end.setDate(0)
                          end.setHours(23, 59, 59, 999)

                          return date < start || date > end
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control as any}
            name="notes"
            rules={{ required: 'Notes are required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Notes <span className="gba:text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Add details..." {...field} data-testid="rcf-notes" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </AppActionForm>
    </div>
  )
}

export default RequestCorrectionForm
