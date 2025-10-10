import React from 'react'
import { Button, Checkbox, Avatar, Alert, Spinner, DateInputField } from '@newwork/gravity-ui-catalog'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { useEmployeeTerminationContext } from '../context/EmployeeTerminationContext'
import { getTranslationFromI18nKeyAndLabel, getDateFormat } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

export const EmployeeTerminationForm: React.FC = () => {
  const { formValues, setFormValues, employee, loading, error, submit, cancel } = useEmployeeTerminationContext()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit()
  }

  const handleCancel = () => {
    cancel()
  }

  const isFormValid = formValues.terminationDate?.isValid()

  return (
    <div className="gba:max-w-[500px] gba:mx-auto gba:bg-white gba:rounded-2xl gba:shadow-lg gba:flex gba:flex-col gba:min-h-[600px] gba:p-0">
      <div className="gba:flex gba:items-center gba:gap-3 gba:pt-8 gba:pb-6 gba:border-b gba:border-[#F0F0F0]">
        <img
          src={flowSmall}
          alt="Flow Small"
          style={{
            filter: 'brightness(0)',
            fill: '#000',
            width: '24px',
            height: '24px'
          }}
        />
        <span className="gba:flex gba:items-center gba:h-6">
          {getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.title', 'Employee Termination')}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="gba:flex-1 gba:flex gba:flex-col gba:justify-between gba:pb-10">
        <div className="gba:pb-10 gba:pt-4">
          <div className="gba:flex gba:items-center gba:mb-8">
            {loading ? (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Spinner size="small" />
                <div>Loading employee info...</div>
              </div>
            ) : error ? (
              <Alert message="Error Loading Employee" description={error} type="error" showIcon />
            ) : employee ? (
              <>
                <Avatar
                  src={employee.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined}
                  initials={`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}
                  alt={`${employee.firstName} ${employee.lastName}`}
                  // @ts-ignore - Type issue in gravity-ui-catalog for contentType
                  contentType={employee.pictureThumbnail ? 'image' : 'initials'}
                  // @ts-ignore - Type issue in gravity-ui-catalog for size
                  size="xl"
                  // @ts-ignore - Type issue in gravity-ui-catalog for shape
                  shape="rounded"
                  // @ts-ignore - Type issue in gravity-ui-catalog for appearance
                  appearance="gradient"
                />
                <div className="gba:ml-2">
                  <div>{`${employee.firstName || ''} ${employee.lastName || ''}`}</div>
                  <div>{employee.employeePosition?.organizationalUnit?.name}</div>
                  <div>{employee.employeePosition?.jobPosition?.name}</div>
                </div>
              </>
            ) : (
              <div>No employee data found</div>
            )}
          </div>

          <div className="gba:mb-6">
            <DateInputField
              label={getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.exit_date_input', 'Exit Date')}
              name="terminationDate"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:absences_overview_entry_screen.select_placeholder',
                'Please Select'
              )}
              value={formValues.terminationDate?.toDate()}
              onChange={field => {
                if (field.value) {
                  setFormValues({ terminationDate: dayjs(field.value as Date) })
                } else {
                  setFormValues({ terminationDate: undefined })
                }
              }}
              format={getDateFormat('date')}
              data-testid="exit-date-picker"
              required={true}
            />
          </div>

          <div className="gba:pt-6">
            <button
              type="button"
              className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:p-2 gba:rounded gba:hover:bg-gray-100/50 gba:transition-colors"
              onClick={() => setFormValues({ terminateJobPosition: !formValues.terminateJobPosition })}
              data-testid="terminate-job-checkbox-container"
            >
              <Checkbox
                data-testid="terminate-job-checkbox"
                name="terminateJobPosition"
                value={formValues.terminateJobPosition}
                onChange={() => setFormValues({ terminateJobPosition: !formValues.terminateJobPosition })}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
              <span className="gba:cursor-pointer">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_termination.checkbox_label',
                  'Terminate Job Position'
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="gba:border-t gba:border-[#F0F0F0] gba:flex gba:gap-4 gba:justify-start gba:pt-4">
          <Button
            variant="primary"
            disabled={!isFormValid}
            data-testid="submit-termination-btn"
            className="gba:min-w-[120px] gba:h-[40px] gba:px-8 gba:rounded-full"
            onClick={handleSubmit}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          </Button>
          <Button
            variant="secondary"
            onClick={handleCancel}
            data-testid="cancel-termination-btn"
            className="gba:min-w-[120px] gba:h-[40px] gba:px-8 gba:rounded-full"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.cancel', 'Cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
