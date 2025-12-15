import React, { Dispatch, SetStateAction, useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
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

// Create dynamic schema based on employee data
const createEmployeeAllocationFormSchema = (
  currentPercentage: number,
  totalAllocationPercent: number | null | undefined
) => {
  // Calculate available allocation for error message
  const availableAllocation =
    totalAllocationPercent !== null && totalAllocationPercent !== undefined ? 100 - totalAllocationPercent : 100

  return z
    .object({
      percentage: z
        .string()
        .min(1, 'Allocation percentage is required')
        .refine(
          val => {
            const num = Number(val)
            return !Number.isNaN(num) && num >= 0 && num <= 100
          },
          {
            message: 'Allocation percentage must be a number between 0 and 100'
          }
        )
        .transform(Number)
    })
    .refine(
      data => {
        // Only validate if totalAllocationPercent exists and new value is greater than current
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
      {
        message: `New allocation exceeds 100%. Available allocation: ${availableAllocation}%`,
        path: ['percentage']
      }
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
  onSubmit
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClientOrgchart = useRestClient(ORGCHART_BASE_URL)
  const restClientEmployees = useRestClient(EMPLOYEES_BASE_URL)
  const { t } = useTranslation('master-data')

  const [loading, setLoading] = useState(false)
  const employeeName =
    employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
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
    } finally {
      setLoading(false)
      setOpen?.(false)
    }
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
      employee.totalAllocationPercent?.totalAllocationPercent ?? 0
    )
    return zodResolver(schema) as any
  }, [employee.percentage, employee.totalAllocationPercent])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={`Edit Allocation for ${employeeName}`}
      description="Update the project allocation percentage for this employee"
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
              {t('forms.employeeAllocation.fields.percentage.label', { defaultValue: 'Allocation Percentage' })}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder={t('forms.employeeAllocation.fields.percentage.placeholder', {
                  defaultValue: 'Enter allocation percentage (0-100)'
                })}
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
