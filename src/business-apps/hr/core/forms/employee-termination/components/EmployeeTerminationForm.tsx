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
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useTranslation
} from '@newwork/nw-design-system'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { useEmployeeTerminationContext } from '../context/EmployeeTerminationContext'
import { formatDateToISO, getDateFormat } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import FormHeader from '../../components/FormHeader'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useForm } from 'react-hook-form'
import { useExitReasonCategoryCatalog, useExitReasonCatalog } from '../hooks/useExitReasonCatalogs'
import translations from '../_i18n'

export const EmployeeTerminationForm: React.FC = () => {
  const { t } = useTranslation(translations)
  const { formValues, setFormValues, employee, loading, error, hasJobPosition, accessToken } =
    useEmployeeTerminationContext()

  const form = useForm<{ employeeId?: string }>({
    defaultValues: { employeeId: formValues.employeeId }
  })

  const { options: exitReasonCategoryOptions, isLoading: exitReasonCategoryLoading } =
    useExitReasonCategoryCatalog(accessToken)

  const { options: exitReasonOptions, isLoading: exitReasonLoading } = useExitReasonCatalog(accessToken)

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
          title={t('employee-termination-title', { defaultValue: 'Employee Termination' })}
          flowIconUrl={flowSmall}
          className="gba:px-6"
        />
        <div
          className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:px-6"
          data-testid="employee-termination-terminated-container"
        >
          <div className="gba:text-muted-foreground gba:text-start">
            {t('employee-termination-already-scheduled', {
              terminationDate: exitDate,
              defaultValue: `A termination for this employee is already scheduled for ${exitDate}.`
            })}
            <br />
            {t('employee-termination-already-scheduled-help', {
              defaultValue: 'If you need to update or reverse this action, please contact your administrator.'
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:rounded-2xl gba:flex gba:flex-col gba:h-full gba:p-0 gba:[&>div[data-testid='employee-termination-form']]:!pt-0">
      <FormHeader
        title={t('employee-termination-title', { defaultValue: 'Employee Termination' })}
        flowIconUrl={flowSmall}
        className="gba:px-6"
      />
      <AppActionForm
        processType="update"
        form={form as any}
        formData={{ employeeId: formValues.employeeId }}
        submitEventType="pse_submit"
        cancelEventType="pse_abort"
        showCancelButton={true}
        isSubmitDisabled={!isFormValid}
        submitButtonText={t('employee-termination-submit', { defaultValue: 'Submit' })}
        cancelButtonText={t('employee-termination-cancel', { defaultValue: 'Cancel' })}
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
            exitReasonCategory: formValues.exitReasonCategory || null,
            exitReason: formValues.exitReason || null,
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
                  <div>{t('employee-termination-loading-employee', { defaultValue: 'Loading employee info...' })}</div>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTitle>
                    {t('employee-termination-error-loading', { defaultValue: 'Error Loading Employee' })}
                  </AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : employee ? (
                <>
                  <Avatar size="xl" className="gba:size-16">
                    {employee.pictureThumbnail ? (
                      <AvatarImage
                        src={`data:image/gif;base64,${employee.pictureThumbnail}`}
                        alt={t('employee-termination-employee-photo-alt', { defaultValue: 'Employee photo' })}
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
                <div>{t('employee-termination-no-data', { defaultValue: 'No employee data found' })}</div>
              )}
            </div>

            <div className="gba:mb-6 gba:overflow-hidden">
              <label className="gba:block gba:mb-2 gba:font-semibold">
                {t('employee-termination-exit-date', { defaultValue: 'Exit Date' })}
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
                placeholder={t('employee-termination-select-placeholder', { defaultValue: 'Please Select' })}
                data-testid="exit-date-picker"
              />
            </div>

            <div className="gba:mb-6">
              <label className="gba:block gba:mb-2 gba:font-semibold">
                {t('employee-termination-exit-reason-category', { defaultValue: 'Exit Reason Category' })}
              </label>
              <Select
                value={formValues.exitReasonCategory || undefined}
                onValueChange={value => setFormValues({ exitReasonCategory: value })}
                disabled={exitReasonCategoryLoading}
              >
                <SelectTrigger data-testid="exit-reason-category-select">
                  <SelectValue
                    placeholder={
                      exitReasonCategoryLoading
                        ? t('employee-termination-loading', { defaultValue: 'Loading...' })
                        : t('employee-termination-select-exit-reason-category', {
                            defaultValue: 'Select exit reason category'
                          })
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {exitReasonCategoryOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.value} data-testid={`exit-reason-category-option-${opt.id}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:mb-6">
              <label className="gba:block gba:mb-2 gba:font-semibold">
                {t('employee-termination-exit-reason', { defaultValue: 'Exit Reason' })}
              </label>
              <Select
                value={formValues.exitReason || undefined}
                onValueChange={value => setFormValues({ exitReason: value })}
                disabled={exitReasonLoading}
              >
                <SelectTrigger data-testid="exit-reason-select">
                  <SelectValue
                    placeholder={
                      exitReasonLoading
                        ? t('employee-termination-loading', { defaultValue: 'Loading...' })
                        : t('employee-termination-select-exit-reason', {
                            defaultValue: 'Select exit reason'
                          })
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {exitReasonOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.value} data-testid={`exit-reason-option-${opt.id}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:mb-6">
              <div className="gba:block gba:mb-2 gba:font-semibold">
                {t('employee-termination-terminate-job-position', { defaultValue: 'Terminate Job Position' })}
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
                    ? t('employee-termination-terminate-position-description', {
                        defaultValue: "Also terminate the employee's job position"
                      })
                    : t('employee-termination-no-job-position', {
                        defaultValue: 'This employee has no job position assigned'
                      })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </AppActionForm>
    </div>
  )
}
