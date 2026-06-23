import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
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
  hasAnyReviewValue
} from '../utils/reviewPayloadUtils'

type TFunction = (key: string, params?: Record<string, unknown>) => string

interface CatalogValue {
  value?: string | null
  translations?: Array<{ value?: string | null }>
}

interface WorkingConditionData {
  activeFrom?: string | null
  activeTo?: string | null
  hireDate?: string | null
  startDate?: string | null
  probationEnd?: string | null
  probationEndDate?: string | null
  employmentTypeRef?: string | null
  contractTypeRef?: string | null
  remoteRef?: string | null
  regionRef?: string | null
  employmentType?: CatalogValue | null
  contractType?: CatalogValue | null
  remote?: CatalogValue | null
  region?: CatalogValue | null
}

interface EmployeeHeaderData {
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
  employeePosition?: { jobPosition?: { name?: string } }
}

interface ReviewQueryResponse {
  employee?: (EmployeeHeaderData & { workingCondition?: WorkingConditionData[] }) | null
}

const GET_WORKING_CONDITIONS_REVIEW_DATA = `
  query GetWorkingConditionsReviewData($employeeId: uuid!, $activeUserLocale: String!) {
    employee: EmployeeByPk(id: $employeeId) {
      firstName
      lastName
      pictureThumbnail
      employeePosition { jobPosition { name } }
      workingCondition(
        where: { isDeleted: { _eq: false } }
        orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]
        limit: 2
      ) {
        activeFrom
        activeTo
        hireDate
        probationEnd
        employmentTypeRef
        contractTypeRef
        remoteRef
        regionRef
        employmentType { value translations(where: { localeCode: { _eq: $activeUserLocale } }) { value } }
        contractType { value translations(where: { localeCode: { _eq: $activeUserLocale } }) { value } }
        remote { value translations(where: { localeCode: { _eq: $activeUserLocale } }) { value } }
        region { value translations(where: { localeCode: { _eq: $activeUserLocale } }) { value } }
      }
    }
  }
`

const getNewWorkingCondition = (payload: Record<string, any>): WorkingConditionData =>
  getNestedValue<WorkingConditionData>(payload, [
    'employeeWorkingCondition',
    'workingCondition',
    'newEmployeeWorkingCondition',
    'newWorkingCondition',
    'employeeWorkingConditionChange.employeeWorkingCondition'
  ]) || {}

const getOldWorkingCondition = (payload: Record<string, any>): WorkingConditionData =>
  getNestedValue<WorkingConditionData>(payload, [
    'oldEmployeeWorkingCondition',
    'previousEmployeeWorkingCondition',
    'currentEmployeeWorkingCondition',
    'oldWorkingCondition',
    'previousWorkingCondition',
    'currentWorkingCondition',
    'employeeWorkingConditionBefore',
    'employeeWorkingConditionChange.oldEmployeeWorkingCondition'
  ]) || {}

const getEmployee = (payload: Record<string, any>): EmployeeHeaderData | undefined =>
  getNestedValue<EmployeeHeaderData>(payload, [
    'employee',
    'employeeData',
    'employeeDetails',
    'employeeWorkingConditionChange.employee'
  ])

const getEmployeeId = (
  payload: Record<string, any>,
  additionalData: BusinessAppContextProps['additionalData']
): string | undefined =>
  getEmployeeIdFromReviewPayload(payload, additionalData, [
    'employeeId',
    'employeeWorkingCondition.employeeId',
    'workingCondition.employeeId',
    'employeeWorkingConditionChange.employeeId',
    'employee.id'
  ])

const formatCatalog = (entry?: CatalogValue | string | null): string => {
  if (!entry) return ''
  if (typeof entry === 'string') return entry
  return entry.translations?.[0]?.value || entry.value || ''
}

const buildRows = (oldData: WorkingConditionData, newData: WorkingConditionData, t: TFunction): ReviewRow[] => [
  {
    key: 'activeFrom',
    label: t('working-conditions-employment-start-date'),
    oldValue: formatReviewDate(oldData.activeFrom),
    newValue: formatReviewDate(newData.activeFrom)
  },
  {
    key: 'activeTo',
    label: t('working-conditions-employment-end-date'),
    oldValue: formatReviewDate(oldData.activeTo),
    newValue: formatReviewDate(newData.activeTo)
  },
  {
    key: 'employmentType',
    label: t('working-conditions-employment-type'),
    oldValue: formatCatalog(oldData.employmentType) || formatCatalog(oldData.employmentTypeRef),
    newValue: formatCatalog(newData.employmentType) || formatCatalog(newData.employmentTypeRef)
  },
  {
    key: 'contractType',
    label: t('working-conditions-contract-type'),
    oldValue: formatCatalog(oldData.contractType) || formatCatalog(oldData.contractTypeRef),
    newValue: formatCatalog(newData.contractType) || formatCatalog(newData.contractTypeRef)
  },
  {
    key: 'remote',
    label: t('working-conditions-remote'),
    oldValue: formatCatalog(oldData.remote) || formatCatalog(oldData.remoteRef),
    newValue: formatCatalog(newData.remote) || formatCatalog(newData.remoteRef)
  },
  {
    key: 'region',
    label: t('working-conditions-region'),
    oldValue: formatCatalog(oldData.region) || formatCatalog(oldData.regionRef),
    newValue: formatCatalog(newData.region) || formatCatalog(newData.regionRef)
  },
  {
    key: 'probationEnd',
    label: t('working-conditions-probation-end-date'),
    oldValue: formatReviewDate(oldData.probationEnd || oldData.probationEndDate),
    newValue: formatReviewDate(newData.probationEnd || newData.probationEndDate)
  }
]

export const UpdateWorkingConditionsReview: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData }) => {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(accessToken)
  const form = useForm({ defaultValues: {}, mode: 'onChange' })
  const payload = useMemo(() => getTaskPayload(additionalData), [additionalData])
  const employeeId = useMemo(() => getEmployeeId(payload, additionalData), [additionalData, payload])
  const payloadNewData = useMemo(() => getNewWorkingCondition(payload), [payload])
  const payloadOldData = useMemo(() => getOldWorkingCondition(payload), [payload])
  const [fetchedEmployee, setFetchedEmployee] = useState<EmployeeHeaderData | undefined>()
  const [fetchedConditions, setFetchedConditions] = useState<WorkingConditionData[]>([])
  const [isLoadingFallbackData, setIsLoadingFallbackData] = useState(false)
  const newData = hasAnyReviewValue(payloadNewData) ? payloadNewData : (fetchedConditions[0] ?? {})
  const oldData = hasAnyReviewValue(payloadOldData) ? payloadOldData : (fetchedConditions[1] ?? {})
  const employee = getEmployee(payload) || fetchedEmployee
  const hasOldData = hasAnyReviewValue(oldData)

  useEffect(() => {
    if (!accessToken || !employeeId || hasAnyReviewValue(payloadNewData)) return
    let cancelled = false
    setIsLoadingFallbackData(true)
    graphqlClient
      .request<ReviewQueryResponse>(GET_WORKING_CONDITIONS_REVIEW_DATA, {
        employeeId,
        activeUserLocale: getCurrentActiveUserLocale()
      })
      .then(result => {
        if (cancelled) return
        setFetchedEmployee(result.employee ?? undefined)
        setFetchedConditions(result.employee?.workingCondition ?? [])
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoadingFallbackData(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, employeeId, graphqlClient, payloadNewData])

  const rows = useMemo(() => buildRows(oldData, newData, t), [newData, oldData, t])

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[1000px]"
      data-testid="update-working-conditions-review-container"
    >
      <FormHeader
        title={t('working-conditions-review-title')}
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
          data-testid="update-working-conditions-review-loading"
        >
          <Spinner size="lg" />
        </div>
      ) : (
        <div
          className="gba:flex gba:flex-col gba:[&>div[data-testid='update-working-conditions-review']]:pt-0! gba:**:data-[testid='update-working-conditions-review-form']:max-w-none!"
          data-testid="update-working-conditions-review-content"
        >
          <AppActionForm
            processType="update"
            form={form as any}
            formData={{}}
            submitEventType="pse_submit"
            cancelEventType="pse_abort"
            submitButtonText={t('action-acknowledge')}
            showCancelButton={false}
            submitButtonTestId="update-working-conditions-review-acknowledge-button"
            onSubmit={async () => ({ acknowledge: 'acknowledged' })}
            data-testid="update-working-conditions-review"
          >
            <div className="gba:space-y-6" data-testid="update-working-conditions-review-form">
              <ReviewRows
                rows={rows}
                dataTestIdPrefix="update-working-conditions-review-row"
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

export default UpdateWorkingConditionsReview
