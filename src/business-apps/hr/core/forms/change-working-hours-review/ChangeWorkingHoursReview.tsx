import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import ReviewRows, { type ReviewRow } from '../components/ReviewRows'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import translations from '../_i18n'
import {
  formatReviewDate,
  getEmployeeIdFromReviewPayload,
  getNestedValue,
  getTaskPayload,
  hasAnyReviewValue,
  type ReviewNumericValue
} from '../utils/reviewPayloadUtils'

type TFunction = (key: string, params?: Record<string, unknown>) => string

interface EmployeeWorkingHoursData {
  activeFrom?: string | null
  activeTo?: string | null
  weeklyHours?: ReviewNumericValue
  weeklyDays?: ReviewNumericValue
  fullTimeEquivalent?: ReviewNumericValue
  mondayHours?: ReviewNumericValue
  tuesdayHours?: ReviewNumericValue
  wednesdayHours?: ReviewNumericValue
  thursdayHours?: ReviewNumericValue
  fridayHours?: ReviewNumericValue
  saturdayHours?: ReviewNumericValue
  sundayHours?: ReviewNumericValue
}

interface EmployeeHeaderData {
  firstName?: string
  lastName?: string
  displayName?: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: {
      name?: string
    }
  }
}

interface WorkingHoursReviewQueryResponse {
  employee?: {
    firstName?: string
    lastName?: string
    displayName?: string
    pictureThumbnail?: string
    employeePosition?: {
      jobPosition?: {
        name?: string
      }
    }
    workingHours?: EmployeeWorkingHoursData[]
  } | null
}

const GET_WORKING_HOURS_REVIEW_DATA = `
  query GetWorkingHoursReviewData($employeeId: uuid!) {
    employee: EmployeeByPk(id: $employeeId) {
      firstName
      lastName
      displayName
      pictureThumbnail
      employeePosition {
        jobPosition {
          name
        }
      }
      workingHours(
        where: { isDeleted: { _eq: false } }
        orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]
        limit: 2
      ) {
        activeFrom
        activeTo
        weeklyHours
        weeklyDays
        fullTimeEquivalent
        mondayHours
        tuesdayHours
        wednesdayHours
        thursdayHours
        fridayHours
        saturdayHours
        sundayHours
      }
    }
  }
`

const getNewWorkingHours = (payload: Record<string, any>): EmployeeWorkingHoursData =>
  getNestedValue<EmployeeWorkingHoursData>(payload, [
    'employeeWorkingHours',
    'workingHours',
    'EmployeeWorkingHours',
    'employeeWorkingHoursData',
    'newEmployeeWorkingHours',
    'newWorkingHours',
    'employee.workingHours',
    'employeeWorkingHoursChange.employeeWorkingHours'
  ]) || {}

const getOldWorkingHours = (payload: Record<string, any>): EmployeeWorkingHoursData =>
  getNestedValue<EmployeeWorkingHoursData>(payload, [
    'oldEmployeeWorkingHours',
    'previousEmployeeWorkingHours',
    'currentEmployeeWorkingHours',
    'oldWorkingHours',
    'previousWorkingHours',
    'currentWorkingHours',
    'employeeWorkingHoursBefore',
    'employeeWorkingHoursChange.oldEmployeeWorkingHours'
  ]) || {}

const getEmployee = (payload: Record<string, any>): EmployeeHeaderData | undefined =>
  getNestedValue<EmployeeHeaderData>(payload, [
    'employee',
    'employeeData',
    'employeeDetails',
    'employeeWorkingHoursChange.employee'
  ])

const getEmployeeId = (
  payload: Record<string, any>,
  additionalData: BusinessAppContextProps['additionalData']
): string | undefined =>
  getEmployeeIdFromReviewPayload(payload, additionalData, [
    'employeeId',
    'employeeWorkingHours.employeeId',
    'workingHours.employeeId',
    'employeeWorkingHoursChange.employeeId',
    'employee.id'
  ])

const formatNumber = (value?: ReviewNumericValue): string => {
  if (value === null || value === undefined || value === '') return ''
  const numberValue = Number(value)

  if (Number.isNaN(numberValue)) {
    return String(value)
  }

  return Number.isInteger(numberValue) ? String(numberValue) : String(Math.round(numberValue * 100) / 100)
}

const buildRows = (
  oldWorkingHours: EmployeeWorkingHoursData,
  newWorkingHours: EmployeeWorkingHoursData,
  t: TFunction
): ReviewRow[] => [
  {
    key: 'activeFrom',
    label: t('working-hours-active-from'),
    oldValue: formatReviewDate(oldWorkingHours.activeFrom),
    newValue: formatReviewDate(newWorkingHours.activeFrom)
  },
  {
    key: 'activeTo',
    label: t('working-hours-active-to'),
    oldValue: formatReviewDate(oldWorkingHours.activeTo),
    newValue: formatReviewDate(newWorkingHours.activeTo)
  },
  {
    key: 'weeklyHours',
    label: t('working-hours-weekly-hours'),
    oldValue: formatNumber(oldWorkingHours.weeklyHours),
    newValue: formatNumber(newWorkingHours.weeklyHours)
  },
  {
    key: 'workingDays',
    label: t('working-hours-working-days'),
    oldValue: formatNumber(oldWorkingHours.weeklyDays),
    newValue: formatNumber(newWorkingHours.weeklyDays)
  },
  {
    key: 'fte',
    label: t('working-hours-fte'),
    oldValue: formatNumber(oldWorkingHours.fullTimeEquivalent),
    newValue: formatNumber(newWorkingHours.fullTimeEquivalent)
  },
  {
    key: 'monday',
    label: t('weekday-monday'),
    oldValue: formatNumber(oldWorkingHours.mondayHours),
    newValue: formatNumber(newWorkingHours.mondayHours)
  },
  {
    key: 'tuesday',
    label: t('weekday-tuesday'),
    oldValue: formatNumber(oldWorkingHours.tuesdayHours),
    newValue: formatNumber(newWorkingHours.tuesdayHours)
  },
  {
    key: 'wednesday',
    label: t('weekday-wednesday'),
    oldValue: formatNumber(oldWorkingHours.wednesdayHours),
    newValue: formatNumber(newWorkingHours.wednesdayHours)
  },
  {
    key: 'thursday',
    label: t('weekday-thursday'),
    oldValue: formatNumber(oldWorkingHours.thursdayHours),
    newValue: formatNumber(newWorkingHours.thursdayHours)
  },
  {
    key: 'friday',
    label: t('weekday-friday'),
    oldValue: formatNumber(oldWorkingHours.fridayHours),
    newValue: formatNumber(newWorkingHours.fridayHours)
  },
  {
    key: 'saturday',
    label: t('weekday-saturday'),
    oldValue: formatNumber(oldWorkingHours.saturdayHours),
    newValue: formatNumber(newWorkingHours.saturdayHours)
  },
  {
    key: 'sunday',
    label: t('weekday-sunday'),
    oldValue: formatNumber(oldWorkingHours.sundayHours),
    newValue: formatNumber(newWorkingHours.sundayHours)
  }
]

export const ChangeWorkingHoursReview: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData }) => {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(accessToken)
  const form = useForm({
    defaultValues: {},
    mode: 'onChange'
  })
  const payload = useMemo(() => getTaskPayload(additionalData), [additionalData])
  const employeeId = useMemo(() => getEmployeeId(payload, additionalData), [additionalData, payload])
  const [fetchedEmployee, setFetchedEmployee] = useState<EmployeeHeaderData | undefined>()
  const [fetchedWorkingHours, setFetchedWorkingHours] = useState<EmployeeWorkingHoursData[]>([])
  const [isLoadingFallbackData, setIsLoadingFallbackData] = useState(false)
  const payloadNewWorkingHours = useMemo(() => getNewWorkingHours(payload), [payload])
  const payloadOldWorkingHours = useMemo(() => getOldWorkingHours(payload), [payload])
  const newWorkingHours = hasAnyReviewValue(payloadNewWorkingHours)
    ? payloadNewWorkingHours
    : (fetchedWorkingHours[0] ?? {})
  const oldWorkingHours = hasAnyReviewValue(payloadOldWorkingHours)
    ? payloadOldWorkingHours
    : (fetchedWorkingHours[1] ?? {})
  const employee = getEmployee(payload) || fetchedEmployee
  const hasOldData = hasAnyReviewValue(oldWorkingHours)

  useEffect(() => {
    if (!accessToken || !employeeId || hasAnyReviewValue(payloadNewWorkingHours)) {
      return
    }

    let cancelled = false
    setIsLoadingFallbackData(true)

    graphqlClient
      .request<WorkingHoursReviewQueryResponse>(GET_WORKING_HOURS_REVIEW_DATA, { employeeId })
      .then(result => {
        if (cancelled) {
          return
        }

        setFetchedEmployee(result.employee ?? undefined)
        setFetchedWorkingHours(result.employee?.workingHours ?? [])
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setIsLoadingFallbackData(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, employeeId, graphqlClient, payloadNewWorkingHours])

  const rows = useMemo(() => buildRows(oldWorkingHours, newWorkingHours, t), [newWorkingHours, oldWorkingHours, t])

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[1000px]"
      data-testid="change-working-hours-review-container"
    >
      <FormHeader
        title={t('working-hours-review-title')}
        flowIconUrl={flowIconUrl}
        employee={
          employee
            ? {
                firstName: employee.firstName,
                lastName: employee.lastName,
                pictureThumbnail: employee.pictureThumbnail,
                jobTitle: employee.employeePosition?.jobPosition?.name
              }
            : undefined
        }
      />

      {isLoadingFallbackData ? (
        <div
          className="gba:flex gba:min-h-80 gba:items-center gba:justify-center"
          data-testid="change-working-hours-review-loading"
        >
          <Spinner size="lg" />
        </div>
      ) : (
        <div
          className="gba:flex gba:flex-col gba:[&>div[data-testid='change-working-hours-review']]:pt-0! gba:**:data-[testid='change-working-hours-review-form']:max-w-none!"
          data-testid="change-working-hours-review-content"
        >
          <AppActionForm
            processType="update"
            form={form as any}
            formData={{}}
            submitEventType="pse_submit"
            cancelEventType="pse_abort"
            submitButtonText={t('action-acknowledge')}
            showCancelButton={false}
            submitButtonTestId="change-working-hours-review-acknowledge-button"
            onSubmit={async () => ({
              acknowledge: 'acknowledged'
            })}
            data-testid="change-working-hours-review"
          >
            <div className="gba:space-y-6" data-testid="change-working-hours-review-form">
              <ReviewRows
                rows={rows}
                dataTestIdPrefix="change-working-hours-review-row"
                oldDataText={t('review-previous-values')}
                currentDataText={t('review-new-values')}
                mode="diff"
                hideNewLabels={!hasOldData}
              />
            </div>
          </AppActionForm>
        </div>
      )}
    </div>
  )
}

export default ChangeWorkingHoursReview
