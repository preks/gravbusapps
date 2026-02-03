import React, { Dispatch, SetStateAction, useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage, toast } from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { TeamEmployee } from '../../apps/project-management/hooks/useTeamAssignments'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const DATA_TEST_ID_PREFIX = 'EmployeeAllocationForm'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`
const EMPLOYEES_BASE_URL = `${env('NEXT_PUBLIC_BASE_URL')}/processes/employee`

// Translation function type for project-allocation bundle (optional when used from ProjectAllocation)
type TranslationFn = (key: string, params?: Record<string, string | number>) => string

const DEFAULT_VALIDATION = {
  required: 'Allocation percentage is required',
  range: 'Allocation percentage must be a number between 0 and 100',
  exceeds: (availableAllocation: number) => `New allocation exceeds 100%. Available allocation: ${availableAllocation}%`
}

// Create dynamic schema based on employee data
const createEmployeeAllocationFormSchema = (
  currentPercentage: number,
  totalAllocationPercent: number | null | undefined,
  t?: TranslationFn
) => {
  const availableAllocation =
    totalAllocationPercent !== null && totalAllocationPercent !== undefined ? 100 - totalAllocationPercent : 100
  const msgRequired = t ? t('validation_percentage_required') : DEFAULT_VALIDATION.required
  const msgRange = t ? t('validation_percentage_range') : DEFAULT_VALIDATION.range
  const msgExceeds = t
    ? t('validation_allocation_exceeds', { availableAllocation })
    : DEFAULT_VALIDATION.exceeds(availableAllocation)

  return z
    .object({
      percentage: z
        .string()
        .min(1, msgRequired)
        .refine(
          val => {
            const num = Number(val)
            return !Number.isNaN(num) && num >= 0 && num <= 100
          },
          { message: msgRange }
        )
        .transform(Number)
    })
    .refine(
      data => {
        if (
          totalAllocationPercent !== null &&
          totalAllocationPercent !== undefined &&
          data.percentage > currentPercentage
        ) {
          const difference = data.percentage - currentPercentage
          const newTotal = difference + totalAllocationPercent
          return newTotal <= 100
        }
        return true
      },
      { message: msgExceeds, path: ['percentage'] }
    )
}

export interface EmployeeAllocationFormProps extends BusinessAppContextProps {
  employee: TeamEmployee
  teamId: string
  structureId: string
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: React.ReactNode
  refetch?: () => void
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  onSubmit?: () => void
  totalAllocationPercent: {
    id: string
    version: number
    totalAllocationPercent: number | null
  } | null
  /** Optional translation function from project-allocation bundle (en-US, de-DE, ro-RO) */
  t?: (key: string, params?: Record<string, string | number>) => string
}

const EmployeeAllocationForm: React.FC<EmployeeAllocationFormProps> = ({
  employee,
  totalAllocationPercent,
  teamId,
  structureId,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  refetch,
  isDrawerActive = false,
  open,
  setOpen,
  onSubmit,
  t: tProjectAllocation
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClientOrgchart = useRestClient(ORGCHART_BASE_URL)
  const restClientEmployees = useRestClient(EMPLOYEES_BASE_URL)
  const { t } = useTranslation('master-data')

  const [loading, setLoading] = useState(false)
  const fallbackName = tProjectAllocation ? tProjectAllocation('fallback_employee_name') : 'Employee'
  const employeeName =
    employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || fallbackName
  const employeePercentage = employee.percentage ?? 0

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)

      const payload = {
        employeeId: employee.employeeId || employee.id,
        structureId: structureId,
        matrixUnitId: teamId,
        percentage: values.percentage === '' ? 0 : Number(values.percentage)
      }
      const percentageDifference = (values.percentage as number) - employeePercentage

      // Use PUT to update the allocation
      await restClientOrgchart.put(`/employee-assignments/matrix-unit/${employee.teamAssignmentId}`, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      const workingHoursPayload = {
        changeMode: 'INSERT',
        employeeWorkingHours: {
          employeeId: employee.employeeId || employee.id,
          totalAllocationPercent: totalAllocationPercent
            ? (totalAllocationPercent.totalAllocationPercent ?? 0) + percentageDifference
            : values.percentage,
          ...(totalAllocationPercent && {
            id: totalAllocationPercent.id,
            version: totalAllocationPercent.version
          })
        }
      }
      await restClientEmployees.post(
        `/${totalAllocationPercent ? 'updateEmployeeWorkingHours' : 'createEmployeeWorkingHours'}`,
        workingHoursPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      refetch?.()
      onSubmit?.()
    } catch (error) {
      console.error('Error updating employee allocation:', error)
      toast.error(tProjectAllocation ? tProjectAllocation('toast_error_failed_request') : 'Failed to send request')
    } finally {
      setLoading(false)
    }
    setOpen?.(false)
  }

  const defaultValues = useMemo(() => {
    return {
      percentage: employee.percentage !== undefined && employee.percentage !== null ? String(employee.percentage) : ''
    }
  }, [employee])

  // Create dynamic Zod resolver based on employee data
  const resolver = useMemo(() => {
    const schema = createEmployeeAllocationFormSchema(
      employee.percentage ?? 0,
      employee.totalAllocationPercent?.totalAllocationPercent ?? 0,
      tProjectAllocation
    )
    return zodResolver(schema) as any
  }, [employee.percentage, employee.totalAllocationPercent, tProjectAllocation])

  const formTitle = tProjectAllocation
    ? tProjectAllocation('form_title', { employeeName })
    : `Edit Allocation for ${employeeName}`
  const formDescription = tProjectAllocation
    ? tProjectAllocation('form_description')
    : 'Update the project allocation percentage for this employee'

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={formTitle}
      description={formDescription}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={true}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
      resolver={resolver}
    >
      <FormField
        name="percentage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {tProjectAllocation
                ? tProjectAllocation('field_percentage_label')
                : t('forms.employeeAllocation.fields.percentage.label', { defaultValue: 'Allocation Percentage' })}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder={
                  tProjectAllocation
                    ? tProjectAllocation('field_percentage_placeholder')
                    : t('forms.employeeAllocation.fields.percentage.placeholder', {
                        defaultValue: 'Enter allocation percentage (0-100)'
                      })
                }
                {...field}
                data-testid={`${dataTestId}-percentage-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default EmployeeAllocationForm
