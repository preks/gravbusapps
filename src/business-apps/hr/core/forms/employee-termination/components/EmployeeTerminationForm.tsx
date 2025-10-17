import React from 'react'
import {
  Checkbox,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Input
} from '@newwork/nw-design-system'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { useEmployeeTerminationContext } from '../context/EmployeeTerminationContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import FormHeader from '../../components/FormHeader'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useForm } from 'react-hook-form'

export const EmployeeTerminationForm: React.FC = () => {
  const { formValues, setFormValues, employee, loading, error } = useEmployeeTerminationContext()

  const form = useForm<{ employeeId?: string }>({
    defaultValues: { employeeId: formValues.employeeId }
  })

  const isFormValid = formValues.terminationDate?.isValid()

  return (
    <div className="gba:bg-card gba:rounded-2xl gba:flex gba:flex-col gba:min-h-[600px] gba:p-0 gba:[&>div[data-testid='employee-termination-form']]:!pt-0">
      <FormHeader
        title={getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.title', 'Employee Termination')}
        flowIconUrl={flowSmall}
        className="gba:px-6"
      />
      <AppActionForm
        processType="update"
        form={form as any}
        formData={{ employeeId: formValues.employeeId }}
        submitEventType="pse_submit"
        cancelEventType="pse_abort"
        isSubmitDisabled={!isFormValid}
        submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.initiate_cancel_button',
          'Cancel'
        )}
        data-testid="employee-termination-form"
        submitButtonTestId="employee-termination-submit-button"
        cancelButtonTestId="employee-termination-cancel-button"
        onSubmit={async () => {
          return {
            employeeId: formValues.employeeId,
            terminationDate: formValues.terminationDate?.isValid() ? formValues.terminationDate : undefined,
            terminateJobPosition: formValues.terminateJobPosition,
            event: 'pse_submit'
          }
        }}
      >
        <div className="gba:flex-1 gba:flex gba:flex-col gba:justify-between">
          <div className=" gba:pt-4">
            <div className="gba:flex gba:items-center gba:mb-8">
              {loading ? (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  <div>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.load_employee_text', 'Loading employee info...')}</div>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.error_load_title', 'Error Loading Employee')}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : employee ? (
                <>
                  <Avatar size="xl" className="gba:size-16">
                    {employee.pictureThumbnail ? (
                      <AvatarImage src={`data:image/gif;base64,${employee.pictureThumbnail}`} alt={getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.employee_avatar_alt_text', 'Employee photo')} />
                    ) : (
                      <AvatarFallback>
                        {`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="gba:ml-2">
                    <div>{`${employee.firstName || ''} ${employee.lastName || ''}`}</div>
                    <div>{employee.employeePosition?.organizationalUnit?.name}</div>
                    <div>{employee.employeePosition?.jobPosition?.name}</div>
                  </div>
                </>
              ) : (
                <div>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.no_data_found_text', 'No employee data found')}</div>
              )}
            </div>

            <div className="gba:mb-6">
              <label className="gba:block gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.exit_date_input', 'Exit Date')}
                <span className="gba:text-destructive"> *</span>
              </label>
              <Input
                type="date"
                value={formValues.terminationDate?.isValid() ? formValues.terminationDate.format('YYYY-MM-DD') : ''}
                onChange={e => {
                  const v = e.target.value
                  if (v) {
                    setFormValues({ terminationDate: dayjs(v) })
                  } else {
                    setFormValues({ terminationDate: undefined as any })
                  }
                }}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absences_overview_entry_screen.select_placeholder',
                  'Please Select'
                )}
                data-testid="exit-date-picker"
              />
            </div>

            <div className="gba:pt-6">
              <label
                className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:p-2 gba:rounded"
                htmlFor="terminate-job-checkbox"
                data-testid="terminate-job-checkbox-container"
              >
                <Checkbox
                  id="terminate-job-checkbox"
                  checked={formValues.terminateJobPosition}
                  onCheckedChange={checked => setFormValues({ terminateJobPosition: !!checked })}
                  data-testid="terminate-job-checkbox"
                  className="gba:border-2 gba:border-foreground"
                />
                <span className="gba:cursor-pointer">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_termination.checkbox_label',
                    'Terminate Job Position'
                  )}
                </span>
              </label>
            </div>
          </div>
        </div>
      </AppActionForm>
    </div>
  )
}
