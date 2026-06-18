import React, { useEffect, useMemo, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  DateInput,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import FormHeader from '../components/FormHeader'
import {
  useWorkingConditionsLookups,
  type WorkingConditionValidationRecord
} from './queries/UpdateWorkingConditionsQueries'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { truncateText } from '@/common/utils/textUtils'
import translations from '../_i18n'

const prefixDataTestId = 'UpdateWorkingConditionsScreen'
type ChangeMode = 'UPDATE' | 'INSERT'

const getDateInputValue = (value: string): string | undefined => (value ? value : undefined)
const toInstantDate = (value: string): string | undefined => {
  if (!value) return undefined

  const date = dayjs(value)
  return date.isValid() ? `${date.format('YYYY-MM-DD')}T00:00:00.000Z` : undefined
}

const toDateInputValue = (value?: string | null): string => {
  if (!value) return ''
  const timestampIndex = value.indexOf('T')
  if (timestampIndex === -1) {
    return value
  }

  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD') : value.substring(0, timestampIndex)
}

const getWorkingConditionChangeMode = (context: BusinessAppContextProps): ChangeMode => {
  const additionalData = (context as any)?.additionalData
  const externalContextData = additionalData?.externalContextData
  const psiTaskPayload = additionalData?.psi_taskPayload
  const initialParameters = psiTaskPayload?.psi_initialParameters
  const changeMode =
    externalContextData?.changeMode ||
    additionalData?.changeMode ||
    psiTaskPayload?.changeMode ||
    initialParameters?.changeMode

  return changeMode === 'INSERT' ? 'INSERT' : 'UPDATE'
}

const toDateTimestamp = (year: string, month: string, day: string): number | null => {
  const date = dayjs(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)

  if (!date.isValid() || date.month() + 1 !== Number(month) || date.date() !== Number(day)) {
    return null
  }

  const timestamp = date.startOf('day').valueOf()
  return Number.isNaN(timestamp) ? null : timestamp
}

const getDateTimestamp = (value?: string | null): number | null => {
  if (!value) {
    return null
  }

  const trimmedValue = value.trim()
  const slashDateMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (slashDateMatch) {
    const [, firstPart, secondPart, year] = slashDateMatch
    const firstAsMonthTimestamp = toDateTimestamp(year, firstPart, secondPart)
    const secondAsMonthTimestamp = toDateTimestamp(year, secondPart, firstPart)
    const validTimestamps = [firstAsMonthTimestamp, secondAsMonthTimestamp].filter(
      (timestamp): timestamp is number => timestamp !== null
    )

    return validTimestamps.length > 0 ? Math.max(...validTimestamps) : null
  }

  const timestamp = dayjs(trimmedValue).startOf('day').valueOf()
  return Number.isNaN(timestamp) ? null : timestamp
}

interface EmployeeWorkingConditionSubmitPayload {
  id?: string
  version?: number
  employmentTypeRef: string
  contractTypeRef: string
  remoteRef: string
  regionRef: string
  activeFrom?: string
  activeTo?: string
  hireDate?: string
  probationEnd?: string
  employeeId?: string
  contractStatus: 'ACTIVE'
}

interface WorkingConditionsSubmitPayload {
  employeeId?: string
  event: 'pse_submit'
  changeMode?: ChangeMode
  employeeWorkingCondition: EmployeeWorkingConditionSubmitPayload
}

const UpdateWorkingConditionsScreen: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(translations)
  const changeMode = useMemo(() => getWorkingConditionChangeMode(context), [context])
  const {
    employmentTypes,
    contractTypes,
    remoteOptions,
    regions,
    current,
    defaultWorkingCondition,
    workingConditionValidationRecords,
    jobTitle,
    firstName,
    lastName,
    pictureThumbnail,
    loading,
    regionCatalogIsFull
  } = useWorkingConditionsLookups(context)
  const [employmentType, setEmploymentType] = useState<string>('')
  const [contractType, setContractType] = useState<string>('')
  const [remote, setRemote] = useState<string>('')
  const [region, setRegion] = useState<string>('')
  const [effectiveStartDate, setEffectiveStartDate] = useState<string>('')
  const [effectiveEndDate, setEffectiveEndDate] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [probationEndDate, setProbationEndDate] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  useEffect(() => {
    if (!current) {
      return
    }

    setStartDate(toDateInputValue(current.startDate))
    setEffectiveStartDate(toDateInputValue(current.activeFrom))
    setEffectiveEndDate(toDateInputValue(current.activeTo))
    setProbationEndDate(toDateInputValue(current.probationEndDate))
  }, [current])

  useEffect(() => {
    if (changeMode !== 'INSERT' || !defaultWorkingCondition) {
      return
    }

    setStartDate(previousValue => previousValue || toDateInputValue(defaultWorkingCondition.startDate))
    setProbationEndDate(previousValue => previousValue || toDateInputValue(defaultWorkingCondition.probationEndDate))
  }, [changeMode, defaultWorkingCondition])

  useEffect(() => {
    if (!regionCatalogIsFull && !current?.regionRef && !region && Array.isArray(regions) && regions.length === 1) {
      setRegion(regions[0].id)
    }
  }, [current?.regionRef, regions, region, regionCatalogIsFull])

  const selectedEmploymentType = employmentType || current?.employmentTypeRef || ''
  const selectedContractType = contractType || current?.contractTypeRef || ''
  const selectedRemote = remote || current?.remoteRef || ''
  const selectedRegion = region || current?.regionRef || ''
  const currentStartDate = current?.startDate ? current.startDate.split('T')[0] : ''
  const currentContractTypeRef = current?.contractTypeRef || ''
  const minimumEffectiveStartDate = changeMode === 'UPDATE' ? startDate || undefined : undefined
  const effectiveEndMinDate = effectiveStartDate || minimumEffectiveStartDate

  useEffect(() => {
    if (employmentType) {
      return
    }
    const nextEmploymentType = current?.employmentTypeRef || ''
    if (!nextEmploymentType || employmentTypes.some(option => option.id === nextEmploymentType)) {
      setEmploymentType(nextEmploymentType)
    }
  }, [current?.employmentTypeRef, employmentType, employmentTypes])

  useEffect(() => {
    if (contractType) {
      return
    }
    const nextContractType = current?.contractTypeRef || ''
    if (!nextContractType || contractTypes.some(option => option.id === nextContractType)) {
      setContractType(nextContractType)
    }
  }, [contractType, contractTypes, current?.contractTypeRef])

  useEffect(() => {
    if (remote) {
      return
    }
    const nextRemote = current?.remoteRef || ''
    if (!nextRemote || remoteOptions.some(option => option.id === nextRemote)) {
      setRemote(nextRemote)
    }
  }, [current?.remoteRef, remote, remoteOptions])

  useEffect(() => {
    if (region) {
      return
    }
    const nextRegion = current?.regionRef || ''
    if (!nextRegion || regions.some(option => option.id === nextRegion)) {
      setRegion(nextRegion)
    }
  }, [current?.regionRef, region, regions])

  const probationPeriodText = useMemo(() => {
    if (!selectedContractType) return null

    const selectedContract = contractTypes.find(ct => ct.id === selectedContractType)
    if (!selectedContract?.additionalValue2) return null

    try {
      const parsed = JSON.parse(selectedContract.additionalValue2)
      if (parsed && typeof parsed.value === 'number' && parsed.unit) {
        const value = parsed.value
        const unit = parsed.unit.toLowerCase()

        let unitLabel = ''
        switch (unit) {
          case 'day':
            unitLabel = t('working-conditions-unit-day', { count: value })
            break
          case 'week':
            unitLabel = t('working-conditions-unit-week', { count: value })
            break
          case 'month':
            unitLabel = t('working-conditions-unit-month', { count: value })
            break
          case 'year':
            unitLabel = t('working-conditions-unit-year', { count: value })
            break
          default:
            unitLabel = unit
        }

        return `${value} ${unitLabel}`
      }
    } catch {
      return null
    }

    return null
  }, [selectedContractType, contractTypes, t])

  const calculateProbationEndDate = useCallback(
    (start: string, ctId: string): string | null => {
      if (!start || !ctId) return null

      const selectedContract = contractTypes.find(ct => ct.id === ctId)
      if (!selectedContract?.additionalValue2) return null

      try {
        const parsed = JSON.parse(selectedContract.additionalValue2)
        if (parsed && typeof parsed.value === 'number' && parsed.unit) {
          const value = parsed.value
          const unit = parsed.unit.toLowerCase()

          const startDayjs = dayjs(start)
          if (!startDayjs.isValid()) return null

          let endDate: dayjs.Dayjs
          switch (unit) {
            case 'day':
              endDate = startDayjs.add(value, 'day')
              break
            case 'week':
              endDate = startDayjs.add(value, 'week')
              break
            case 'month':
              endDate = startDayjs.add(value, 'month')
              break
            case 'year':
              endDate = startDayjs.add(value, 'year')
              break
            default:
              return null
          }

          return endDate.format('YYYY-MM-DD')
        }
      } catch {
        return null
      }

      return null
    },
    [contractTypes]
  )

  useEffect(() => {
    if (!startDate || !selectedContractType) {
      return
    }

    // Avoid marking the form as changed on initial load.
    // Recalculate probation date only for new records or when drivers were edited.
    const isNewRecord = !current
    const hasDriverChanges = startDate !== currentStartDate || selectedContractType !== currentContractTypeRef
    if (!isNewRecord && !hasDriverChanges) {
      return
    }

    const calculatedEndDate = calculateProbationEndDate(startDate, selectedContractType)
    if (calculatedEndDate) {
      setProbationEndDate(calculatedEndDate)
      return
    }

    setProbationEndDate('')
  }, [startDate, selectedContractType, calculateProbationEndDate, current, currentStartDate, currentContractTypeRef])

  const isProbationException = useMemo(() => {
    if (!startDate || !selectedContractType || !probationEndDate) return false

    const calculatedEndDate = calculateProbationEndDate(startDate, selectedContractType)
    return calculatedEndDate !== null && probationEndDate !== calculatedEndDate
  }, [startDate, selectedContractType, probationEndDate, calculateProbationEndDate])

  const isProbationEndBeforeStart = useMemo(() => {
    if (!startDate || !probationEndDate) return false
    const start = dayjs(startDate)
    const probationEnd = dayjs(probationEndDate)
    return start.isValid() && probationEnd.isValid() && probationEnd.isBefore(start, 'day')
  }, [startDate, probationEndDate])

  const isEffectiveEndBeforeStart = useMemo(() => {
    if (!effectiveStartDate || !effectiveEndDate) return false
    const effectiveStart = dayjs(effectiveStartDate)
    const effectiveEnd = dayjs(effectiveEndDate)
    return effectiveStart.isValid() && effectiveEnd.isValid() && effectiveEnd.isBefore(effectiveStart, 'day')
  }, [effectiveStartDate, effectiveEndDate])

  const isEffectiveStartBeforeHireDate = useMemo(() => {
    if (changeMode !== 'INSERT' || !effectiveStartDate || !startDate) return false
    const effectiveStart = dayjs(effectiveStartDate)
    const hireDate = dayjs(startDate)
    return effectiveStart.isValid() && hireDate.isValid() && effectiveStart.isBefore(hireDate, 'day')
  }, [changeMode, effectiveStartDate, startDate])

  const isValid = useMemo(() => {
    return (
      Boolean(
        effectiveStartDate && selectedEmploymentType && selectedContractType && selectedRemote && selectedRegion
      ) &&
      !isEffectiveEndBeforeStart &&
      !isProbationEndBeforeStart
    )
  }, [
    effectiveStartDate,
    selectedEmploymentType,
    selectedContractType,
    selectedRemote,
    selectedRegion,
    isEffectiveEndBeforeStart,
    isProbationEndBeforeStart
  ])

  const title = useMemo(() => t('working-conditions-title'), [t])

  const hasChanges = useMemo(() => {
    if (!current) return true
    const curProb = current.probationEndDate ? current.probationEndDate.split('T')[0] : ''
    return (
      Boolean(effectiveStartDate || effectiveEndDate) ||
      selectedEmploymentType !== (current.employmentTypeRef || '') ||
      selectedContractType !== (current.contractTypeRef || '') ||
      selectedRemote !== (current.remoteRef || '') ||
      selectedRegion !== (current.regionRef || '') ||
      (probationEndDate || '') !== curProb
    )
  }, [
    current,
    effectiveStartDate,
    effectiveEndDate,
    selectedEmploymentType,
    selectedContractType,
    selectedRemote,
    selectedRegion,
    probationEndDate
  ])

  const hasWorkingConditionDateRange = useCallback(
    (record: WorkingConditionValidationRecord): boolean =>
      getDateTimestamp(record.activeFrom) !== null || getDateTimestamp(record.activeTo) !== null,
    []
  )

  const hasActivePeriodOverlap = useCallback(
    (
      submittedRecord: EmployeeWorkingConditionSubmitPayload,
      existingRecord: WorkingConditionValidationRecord,
      changeMode?: ChangeMode
    ): boolean => {
      if (changeMode === 'UPDATE' && submittedRecord.id && existingRecord.id === submittedRecord.id) {
        return false
      }

      if (!hasWorkingConditionDateRange(existingRecord)) {
        return false
      }

      const submittedFrom = getDateTimestamp(submittedRecord.activeFrom)
      const submittedTo = getDateTimestamp(submittedRecord.activeTo) ?? Number.POSITIVE_INFINITY
      const existingFrom = getDateTimestamp(existingRecord.activeFrom) ?? Number.NEGATIVE_INFINITY
      const existingTo = getDateTimestamp(existingRecord.activeTo) ?? Number.POSITIVE_INFINITY

      if (submittedFrom === null) {
        return false
      }

      const isReplacingOpenEndedRecord =
        changeMode === 'INSERT' && !submittedRecord.activeTo && !existingRecord.activeTo && submittedFrom > existingFrom

      if (isReplacingOpenEndedRecord) {
        return false
      }

      return submittedFrom <= existingTo && existingFrom <= submittedTo
    },
    [hasWorkingConditionDateRange]
  )

  const getOpenEndedWorkingConditionToClose = useCallback(
    (newActiveFrom?: string): WorkingConditionValidationRecord | null => {
      const submittedFrom = getDateTimestamp(newActiveFrom)
      if (changeMode !== 'INSERT' || submittedFrom === null) {
        return null
      }

      return workingConditionValidationRecords
        .filter(record => {
          const existingFrom = getDateTimestamp(record.activeFrom)
          const existingTo = getDateTimestamp(record.activeTo)
          return record.id && existingFrom !== null && existingTo === null && existingFrom < submittedFrom
        })
        .sort(
          (first, second) => (getDateTimestamp(second.activeFrom) ?? 0) - (getDateTimestamp(first.activeFrom) ?? 0)
        )[0]
    },
    [changeMode, workingConditionValidationRecords]
  )

  const getActivePeriodOverlapErrors = useCallback(
    (payload: WorkingConditionsSubmitPayload, changeMode?: ChangeMode) => {
      const hasOverlap = workingConditionValidationRecords.some(record =>
        hasActivePeriodOverlap(payload.employeeWorkingCondition, record, changeMode)
      )

      if (!hasOverlap) {
        return null
      }

      return [t('working-conditions-active-period-overlap')]
    },
    [hasActivePeriodOverlap, t, workingConditionValidationRecords]
  )

  const activePeriodOverlapError = useMemo(() => {
    const workingConditionToClose = getOpenEndedWorkingConditionToClose(effectiveStartDate)
    const submittedRecord: EmployeeWorkingConditionSubmitPayload = {
      id: changeMode === 'INSERT' ? workingConditionToClose?.id : current?.id,
      activeFrom: toInstantDate(effectiveStartDate),
      activeTo: toInstantDate(effectiveEndDate),
      employmentTypeRef: selectedEmploymentType,
      contractTypeRef: selectedContractType,
      remoteRef: selectedRemote,
      regionRef: selectedRegion,
      contractStatus: 'ACTIVE'
    }

    const hasOverlap = workingConditionValidationRecords.some(record =>
      hasActivePeriodOverlap(submittedRecord, record, changeMode)
    )

    return hasOverlap ? t('working-conditions-active-period-overlap') : null
  }, [
    changeMode,
    current?.id,
    effectiveEndDate,
    effectiveStartDate,
    getOpenEndedWorkingConditionToClose,
    hasActivePeriodOverlap,
    selectedContractType,
    selectedEmploymentType,
    selectedRegion,
    selectedRemote,
    t,
    workingConditionValidationRecords
  ])

  const clearDateRelatedValidationError = useCallback(() => {
    setValidationError(null)
  }, [])

  const validateForm = () => {
    if (isEffectiveEndBeforeStart) {
      return [t('working-conditions-employment-end-before-start')]
    }
    if (isProbationEndBeforeStart) {
      return [t('working-conditions-probation-end-before-start')]
    }
    if (!effectiveStartDate || !selectedEmploymentType || !selectedContractType || !selectedRemote || !selectedRegion) {
      return [t('working-conditions-required')]
    }
    if (activePeriodOverlapError) {
      return [activePeriodOverlapError]
    }
    return null
  }

  const buildSubmitPayload = useCallback((): WorkingConditionsSubmitPayload => {
    const additionalData = (context as any)?.additionalData
    const externalContextData = additionalData?.externalContextData
    const psiTaskPayload = additionalData?.psi_taskPayload
    const initialParameters = psiTaskPayload?.psi_initialParameters
    const employeeId =
      externalContextData?.employeeId ||
      additionalData?.employeeId ||
      psiTaskPayload?.employeeId ||
      initialParameters?.employeeId ||
      context.userInfo?.employeeDetails?.employeeId

    const workingConditionToClose = getOpenEndedWorkingConditionToClose(effectiveStartDate)
    const payloadWorkingConditionId = changeMode === 'INSERT' ? workingConditionToClose?.id : current?.id
    let payloadWorkingConditionVersion: number | undefined
    if (changeMode === 'INSERT') {
      payloadWorkingConditionVersion = workingConditionToClose?.version
    } else if (typeof current?.version === 'number') {
      payloadWorkingConditionVersion = current.version
    }

    return {
      employeeId,
      event: 'pse_submit',
      changeMode,
      employeeWorkingCondition: {
        id: payloadWorkingConditionId,
        version: payloadWorkingConditionVersion,
        employmentTypeRef: selectedEmploymentType,
        contractTypeRef: selectedContractType,
        remoteRef: selectedRemote,
        regionRef: selectedRegion,
        activeFrom: toInstantDate(effectiveStartDate),
        activeTo: toInstantDate(effectiveEndDate),
        hireDate: toInstantDate(startDate),
        probationEnd: toInstantDate(probationEndDate),
        employeeId,
        contractStatus: 'ACTIVE'
      }
    }
  }, [
    changeMode,
    context,
    current?.id,
    current?.version,
    effectiveEndDate,
    effectiveStartDate,
    getOpenEndedWorkingConditionToClose,
    probationEndDate,
    selectedContractType,
    selectedEmploymentType,
    selectedRegion,
    selectedRemote,
    startDate
  ])

  const handleSubmitClick = useCallback(() => {
    const errors = validateForm()
    if (errors && errors.length > 0) {
      setValidationError(errors.join(', '))
      return
    }

    setValidationError(null)
    const payload = buildSubmitPayload()
    const overlapErrors = activePeriodOverlapError
      ? [activePeriodOverlapError]
      : getActivePeriodOverlapErrors(payload, changeMode)
    if (overlapErrors && overlapErrors.length > 0) {
      setValidationError(overlapErrors.join(', '))
      return
    }

    dispatchProcessContinueEvent('pse_submit', payload)
  }, [activePeriodOverlapError, buildSubmitPayload, changeMode, getActivePeriodOverlapErrors, validateForm])

  const handleCancelClick = useCallback(() => {
    dispatchProcessContinueEvent('pse_abort', {})
  }, [])

  if (loading) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
        data-testid="update-working-conditions-form-container"
      >
        <FormHeader
          title={title}
          flowIconUrl={flowSmall}
          className="gba:px-6"
          employee={{
            firstName,
            lastName,
            pictureThumbnail,
            jobTitle
          }}
        />
        <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='UpdateWorkingConditionsScreen-Container']]:!pt-0">
          <div
            className="gba:flex gba:items-center gba:justify-center gba:py-20"
            data-testid="flw_updateWorkingConditions_loading"
          >
            <Spinner size="xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
      data-testid="update-working-conditions-form-container"
    >
      <FormHeader
        title={title}
        flowIconUrl={flowSmall}
        className="gba:px-6"
        employee={{
          firstName,
          lastName,
          pictureThumbnail,
          jobTitle
        }}
      />
      <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='UpdateWorkingConditionsScreen-Container']]:!pt-0">
        <AppActionForm
          processType="update"
          formData={{}}
          onSubmit={data => data}
          disableFormSubmission
          customActions={
            <div
              className="gba:flex gba:shrink-0 gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4"
              data-testid="flw_updateWorkingConditions_customActions"
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelClick}
                data-testid="flw_updateWorkingConditions_cancelBtn"
              >
                {t('action-cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSubmitClick}
                disabled={!isValid || !hasChanges || Boolean(activePeriodOverlapError)}
                data-testid="flw_updateWorkingConditions_submitBtn"
              >
                {t('action-submit')}
              </Button>
            </div>
          }
          data-testid={formatDataTestId(prefixDataTestId, 'Container')}
        >
          <div className="gba:py-6 gba:space-y-4">
            {validationError && (
              <div
                className="gba:text-sm gba:text-destructive"
                data-testid="flw_updateWorkingConditions_validationError"
              >
                {validationError}
              </div>
            )}

            <div className="gba:space-y-2 gba:overflow-hidden">
              <div className="gba:text-sm gba:font-medium">{t('working-conditions-employment-start-date')}*</div>
              <DateInput
                type="date"
                value={getDateInputValue(effectiveStartDate)}
                onChange={(value: string | [string | null, string | null] | null) => {
                  const stringValue = typeof value === 'string' ? value : ''
                  setEffectiveStartDate(stringValue)
                  clearDateRelatedValidationError()
                }}
                min={minimumEffectiveStartDate}
                outputFormat="iso"
                data-testid="flw_updateWorkingConditions_effectiveStartDatePicker"
              />
              {isEffectiveStartBeforeHireDate && (
                <div
                  className="gba:text-sm gba:text-warning"
                  data-testid="flw_updateWorkingConditions_effectiveStartBeforeHireDateWarning"
                >
                  {t('working-conditions-valid-from-before-hire-date-warning')}
                </div>
              )}
              {activePeriodOverlapError && !isEffectiveEndBeforeStart && (
                <div
                  className="gba:text-sm gba:text-destructive"
                  data-testid="flw_updateWorkingConditions_activePeriodOverlapError"
                >
                  {activePeriodOverlapError}
                </div>
              )}
            </div>

            <div className="gba:space-y-2 gba:overflow-hidden">
              <div className="gba:text-sm gba:font-medium">{t('working-conditions-employment-end-date')}</div>
              <DateInput
                type="date"
                value={getDateInputValue(effectiveEndDate)}
                onChange={(value: string | [string | null, string | null] | null) => {
                  const stringValue = typeof value === 'string' ? value : ''
                  setEffectiveEndDate(stringValue)
                  clearDateRelatedValidationError()
                }}
                min={effectiveEndMinDate}
                outputFormat="iso"
                data-testid="flw_updateWorkingConditions_effectiveEndDatePicker"
              />
              {isEffectiveEndBeforeStart && (
                <div
                  className="gba:text-sm gba:text-destructive"
                  data-testid="flw_updateWorkingConditions_effectiveEndBeforeStartError"
                >
                  {t('working-conditions-employment-end-before-start')}
                </div>
              )}
            </div>

            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">{t('working-conditions-employment-type')}*</div>
              <Select value={selectedEmploymentType} onValueChange={setEmploymentType} disabled={loading}>
                <SelectTrigger
                  className="gba:w-full gba:truncate"
                  data-testid="flw_updateWorkingConditions_employmentTypeSelect"
                >
                  <SelectValue placeholder={t('placeholder-select')} />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {truncateText(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">{t('working-conditions-contract-type')}*</div>
              <Select value={selectedContractType} onValueChange={setContractType} disabled={loading}>
                <SelectTrigger
                  className="gba:w-full gba:truncate"
                  data-testid="flw_updateWorkingConditions_contractTypeSelect"
                >
                  <SelectValue placeholder={t('placeholder-select')} />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {truncateText(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">{t('working-conditions-remote')}*</div>
              <Select value={selectedRemote} onValueChange={setRemote} disabled={loading}>
                <SelectTrigger
                  className="gba:w-full gba:truncate"
                  data-testid="flw_updateWorkingConditions_remoteSelect"
                >
                  <SelectValue placeholder={t('working-conditions-select-remote')} />
                </SelectTrigger>
                <SelectContent>
                  {remoteOptions.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {truncateText(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">{t('working-conditions-region')}*</div>
              <Select value={selectedRegion} onValueChange={setRegion}>
                <SelectTrigger
                  className="gba:w-full gba:truncate"
                  data-testid="flw_updateWorkingConditions_regionSelect"
                >
                  <SelectValue placeholder={t('working-conditions-select-region')} />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {truncateText(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:flex gba:flex-col gba:gap-4">
              {probationPeriodText && (
                <div className="gba:space-y-2">
                  <div className="gba:text-sm gba:font-medium">{t('working-conditions-probation-period')}</div>
                  <Input
                    value={probationPeriodText}
                    disabled
                    readOnly
                    data-testid="flw_updateWorkingConditions_probationPeriod"
                  />
                </div>
              )}

              <div className="gba:space-y-2 gba:overflow-hidden">
                <div className="gba:text-sm gba:font-medium">{t('working-conditions-probation-end-date')}</div>
                <DateInput
                  type="date"
                  value={getDateInputValue(probationEndDate)}
                  onChange={(value: string | [string | null, string | null] | null) => {
                    const stringValue = typeof value === 'string' ? value : ''
                    setProbationEndDate(stringValue)
                  }}
                  disabled={!startDate || loading}
                  min={startDate || undefined}
                  outputFormat="iso"
                  data-testid="flw_updateWorkingConditions_probationEndDatePicker"
                />
                {isProbationEndBeforeStart && (
                  <div
                    className="gba:text-sm gba:text-destructive"
                    data-testid="flw_updateWorkingConditions_probationEndBeforeStartError"
                  >
                    {t('working-conditions-probation-end-before-start')}
                  </div>
                )}
                {isProbationException && (
                  <div
                    className="gba:text-sm gba:text-warning"
                    data-testid="flw_updateWorkingConditions_probationWarning"
                  >
                    {t('working-conditions-probation-exception-warning')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export default UpdateWorkingConditionsScreen
