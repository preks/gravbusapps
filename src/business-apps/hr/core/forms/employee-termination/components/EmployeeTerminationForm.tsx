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
  DateInput
} from '@newwork/nw-design-system'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { useEmployeeTerminationContext } from '../context/EmployeeTerminationContext'
import { getTranslationFromI18nKeyAndLabel, formatDateToISO, getDateFormat } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import FormHeader from '../../components/FormHeader'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useForm } from 'react-hook-form'

export const EmployeeTerminationForm: React.FC = () => {
  const { formValues, setFormValues, employee, loading, error, hasJobPosition } = useEmployeeTerminationContext()

  const form = useForm<{ employeeId?: string }>({
    defaultValues: { employeeId: formValues.employeeId }
  })

  const exitDate = employee?.employeePosition?.exitDate
    ? dayjs(employee?.employeePosition?.exitDate).format(getDateFormat('date-long'))
    : ''

  const isFormValid = formValues.terminationDate?.isValid()

  if (loading) {
    return <div className="gba:h-full gba:w-full" data-testid="employee-termination-loading-blank" />
  }

  if (exitDate) {
    return (
      <div className="gba:rounded-2xl gba:flex gba:flex-col gba:p-0">
        <FormHeader
          title={getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.title', 'Employee Termination')}
          flowIconUrl={flowSmall}
          className="gba:px-6"
        />
        <div
          className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:px-6"
          data-testid="employee-termination-terminated-container"
        >
          <div className="gba:text-muted-foreground gba:text-start">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_termination.exitDate_error_message_line_1',
              `A termination for this employee is already scheduled for ${exitDate}.`,
              {
                terminationDate: exitDate,
                interpolation: {
                  escapeValue: false
                }
              }
            )}
            <br />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_termination.exitDate_error_message_line_2',
              'If you need to update or reverse this action, please contact your administrator.'
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:rounded-2xl gba:flex gba:flex-col gba:min-h-[600px] gba:p-0 gba:[&>div[data-testid='employee-termination-form']]:!pt-0">
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
          const dateStr = formValues.terminationDate?.isValid() ? formValues.terminationDate.format('YYYY-MM-DD') : ''
          const terminationDateIso = dateStr ? (formatDateToISO(new Date(dateStr)) as string) : ''
          return {
            employeeId: formValues.employeeId,
            terminationDate: terminationDateIso,
            terminateJobPosition: formValues.terminateJobPosition,
            event: 'pse_submit'
          }
        }}
      >
        <div className="gba:flex-1 gba:flex gba:flex-col gba:justify-between">
          <div>
            <div className="gba:flex gba:items-center gba:mb-6">
              {loading ? (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  <div>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_termination.load_employee_text',
                      'Loading employee info...'
                    )}
                  </div>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTitle>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_termination.error_load_title',
                      'Error Loading Employee'
                    )}
                  </AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : employee ? (
                <>
                  <Avatar size="xl" className="gba:size-16">
                    {employee.pictureThumbnail ? (
                      <AvatarImage
                        src={`data:image/gif;base64,${employee.pictureThumbnail}`}
                        alt={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_termination.employee_avatar_alt_text',
                          'Employee photo'
                        )}
                      />
                    ) : (
                      <AvatarFallback>
                        {`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="gba:ml-2">
                    <div className="gba:font-semibold">{`${employee.firstName || ''} ${employee.lastName || ''}`}</div>
                    <div>{employee.employeePosition?.organizationalUnit?.name}</div>
                    <div>{employee.employeePosition?.jobPosition?.name}</div>
                  </div>
                </>
              ) : (
                <div>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_termination.no_data_found_text',
                    'No employee data found'
                  )}
                </div>
              )}
            </div>

            <div className="gba:mb-6 gba:overflow-hidden">
              <label className="gba:block gba:mb-2 gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.exit_date_input', 'Exit Date')}
                <span className="gba:text-destructive"> *</span>
              </label>
              <DateInput
                type="date"
                className="gba:w-full"
                value={formValues.terminationDate?.isValid() ? formValues.terminationDate.format('YYYY-MM-DD') : ''}
                onChange={value => {
                  const nextDateValue = typeof value === 'string' ? value : null

                  if (nextDateValue) {
                    setFormValues({ terminationDate: dayjs(nextDateValue) })
                    return
                  }
                  setFormValues({ terminationDate: dayjs('') })
                }}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absences_overview_entry_screen.select_placeholder',
                  'Please Select'
                )}
                data-testid="exit-date-picker"
              />
            </div>

            <div className="gba:mb-6">
              <div className="gba:block gba:mb-2 gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_termination.checkbox_label',
                  'Terminate Job Position'
                )}
              </div>
              <div className="gba:flex gba:items-center gba:gap-2" data-testid="terminate-job-checkbox-container">
                <Checkbox
                  id="terminate-job-checkbox"
                  checked={formValues.terminateJobPosition}
                  onCheckedChange={checked => setFormValues({ terminateJobPosition: !!checked })}
                  disabled={!hasJobPosition}
                  data-testid="terminate-job-checkbox"
                />
                <span className={hasJobPosition ? '' : 'gba:text-muted-foreground'}>
                  {hasJobPosition
                    ? getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_termination.checkbox_description',
                        "Also terminate the employee's job position"
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_termination.no_job_position_message',
                        'This employee has no job position assigned'
                      )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </AppActionForm>
    </div>
  )
}
