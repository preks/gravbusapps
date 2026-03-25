import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Button,
  Input,
  DateInput,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon, BriefcaseIcon } from '@phosphor-icons/react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

// Separate component for each job history item
const JobHistoryItem: React.FC<{
  historyIndex: number
  onRemove: () => void
}> = ({ historyIndex, onRemove }) => {
  const form = useFormContext<any>()

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <BriefcaseIcon className="gba:w-5 gba:h-5" />
            Position {historyIndex + 1}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={onRemove}
            className="gba:text-destructive hover:gba:bg-destructive-secondary"
            data-testid={formatDataTestId('job-candidate-form', `job-history-remove-${historyIndex}`)}
            aria-label="Remove job history"
          >
            <TrashIcon className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <FormField
            control={form.control}
            name={`jobHistory.${historyIndex}.jobPosition`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Position / Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Senior Software Engineer, Marketing Manager"
                    data-testid={formatDataTestId('job-candidate-form', `job-history-position-${historyIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`jobHistory.${historyIndex}.company`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Company name"
                    data-testid={formatDataTestId('job-candidate-form', `job-history-company-${historyIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name={`jobHistory.${historyIndex}.hireDate`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DateInput
                      {...field}
                      data-testid={formatDataTestId('job-candidate-form', `job-history-hireDate-${historyIndex}`)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`jobHistory.${historyIndex}.exitDate`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DateInput
                      {...field}
                      placeholder="Leave empty if current position"
                      data-testid={formatDataTestId('job-candidate-form', `job-history-exitDate-${historyIndex}`)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const JobHistoryArrayField: React.FC = () => {
  const form = useFormContext<any>()

  // Use field array for multiple job history entries
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'jobHistory'
  })

  const handleAddJobHistory = () => {
    append({
      jobPosition: '',
      company: '',
      hireDate: '',
      exitDate: ''
    })
  }

  const handleRemoveJobHistory = (index: number) => {
    remove(index)
  }

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
          <BriefcaseIcon className="gba:w-5 gba:h-5" />
          Employment History
        </h3>
      </div>

      {fields.length === 0 && (
        <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
          No employment history added. Click the button below to add your previous work experience.
        </div>
      )}

      {fields.map((field, historyIndex) => (
        <JobHistoryItem
          key={field.id}
          historyIndex={historyIndex}
          onRemove={() => handleRemoveJobHistory(historyIndex)}
        />
      ))}

      {/* Add Job History Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddJobHistory}
        className="gba:w-full gba:mt-2"
        data-testid={formatDataTestId('job-candidate-form', 'job-history-add')}
      >
        <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
        Add Employment
      </Button>
    </div>
  )
}
