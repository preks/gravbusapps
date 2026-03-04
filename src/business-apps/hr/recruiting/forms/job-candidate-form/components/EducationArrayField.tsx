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
import { PlusIcon, TrashIcon, GraduationCapIcon } from '@phosphor-icons/react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

// Separate component for each education item
const EducationItem: React.FC<{
  educationIndex: number
  onRemove: () => void
}> = ({ educationIndex, onRemove }) => {
  const form = useFormContext<any>()

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <GraduationCapIcon className="gba:w-5 gba:h-5" />
            Education {educationIndex + 1}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={onRemove}
            className="gba:text-destructive hover:gba:bg-destructive-secondary"
            data-testid={formatDataTestId('job-candidate-form', `education-remove-${educationIndex}`)}
            aria-label="Remove education"
          >
            <TrashIcon className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <FormField
            control={form.control}
            name={`educations.${educationIndex}.title`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title / Field of Study</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid={formatDataTestId('job-candidate-form', `education-title-${educationIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`educations.${educationIndex}.institute`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institute / University</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid={formatDataTestId('job-candidate-form', `education-institute-${educationIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`educations.${educationIndex}.degree`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Degree</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid={formatDataTestId('job-candidate-form', `education-degree-${educationIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name={`educations.${educationIndex}.startDate`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DateInput
                      {...field}
                      data-testid={formatDataTestId('job-candidate-form', `education-startDate-${educationIndex}`)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`educations.${educationIndex}.endDate`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DateInput
                      {...field}
                      data-testid={formatDataTestId('job-candidate-form', `education-endDate-${educationIndex}`)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={`educations.${educationIndex}.locality`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Locality / City</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid={formatDataTestId('job-candidate-form', `education-locality-${educationIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export const EducationArrayField: React.FC = () => {
  const form = useFormContext<any>()

  // Use field array for multiple educations
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'educations'
  })

  const handleAddEducation = () => {
    append({
      title: '',
      institute: '',
      degree: '',
      startDate: '',
      endDate: '',
      locality: ''
    })
  }

  const handleRemoveEducation = (index: number) => {
    remove(index)
  }

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
          <GraduationCapIcon className="gba:w-5 gba:h-5" />
          Education History
        </h3>
      </div>

      {fields.length === 0 && (
        <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
          No education records added. Click the button below to add your education history.
        </div>
      )}

      {fields.map((field, educationIndex) => (
        <EducationItem
          key={field.id}
          educationIndex={educationIndex}
          onRemove={() => handleRemoveEducation(educationIndex)}
        />
      ))}

      {/* Add Education Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddEducation}
        className="gba:w-full gba:mt-2"
        data-testid={formatDataTestId('job-candidate-form', 'education-add')}
      >
        <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
        Add Education
      </Button>
    </div>
  )
}
