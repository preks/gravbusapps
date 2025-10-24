'use client'

import React, { useState, useMemo } from 'react'
import {
  Card,
  Input,
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
  DateInput,
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
  const form = useForm<{ date: string; type: 'CLOCK_IN' | 'CLOCK_OUT'; time: string; notes?: string }>({
    defaultValues: { date: '', type: 'CLOCK_IN', time: '', notes: '' },
    mode: 'onChange'
  })
  const [submitting] = useState(false)

  const [typeVal, dateVal, timeVal, notesVal] = form.watch(['type', 'date', 'time', 'notes']) as [
    'CLOCK_IN' | 'CLOCK_OUT',
    string,
    string,
    string
  ]
  const isValid = useMemo(() => {
    const hasNotes = typeof notesVal === 'string' && notesVal.trim().length > 0
    return Boolean(typeVal && dateVal && timeVal && hasNotes)
  }, [typeVal, dateVal, timeVal, notesVal])

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

      <Card className="gba:p-4">
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
                      <DateInput
                        type="date"
                        value={field.value}
                        onChange={v => field.onChange(v)}
                        data-testid="rcf-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="time"
                rules={{ required: 'Effective time is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Effective Time <span className="gba:text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="HH:mm" {...field} data-testid="rcf-time" />
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
      </Card>
    </div>
  )
}

export default RequestCorrectionForm
