import React, { useEffect, useMemo, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import {
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
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import { useWorkingConditionsLookups } from './queries/UpdateWorkingConditionsQueries'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { truncateText } from '@/common/utils/textUtils'
import translations from '../_i18n'

const prefixDataTestId = 'UpdateWorkingConditionsScreen'

const getDateInputValue = (value: string): string | undefined => (value ? value : undefined)

const UpdateWorkingConditionsScreen: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(translations)
  const {
    employmentTypes,
    contractTypes,
    remoteOptions,
    regions,
    current,
    jobTitle,
    firstName,
    lastName,
    pictureThumbnail,
    loading,
    regionCatalogIsFull
  } = useWorkingConditionsLookups(context)

  const [employmentType, setEmploymentType] = useState<string | undefined>(undefined)
  const [contractType, setContractType] = useState<string | undefined>(undefined)
  const [remote, setRemote] = useState<string | undefined>(undefined)
  const [region, setRegion] = useState<string | undefined>(undefined)
  const [startDate, setStartDate] = useState<string>('')
  const [probationEndDate, setProbationEndDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [fixedTermReason, setFixedTermReason] = useState<string>('')

  useEffect(() => {
    if (current) {
      setEmploymentType(current.employmentTypeRef)
      setContractType(current.contractTypeRef)
      setRemote(current.remoteRef)
      setRegion(current.regionRef)
      const toDateInput = (val?: string | null): string => {
        if (!val) return ''
        const idx = val.indexOf('T')
        return idx > 0 ? val.substring(0, idx) : val
      }
      setStartDate(toDateInput(current.startDate))
      setProbationEndDate(toDateInput(current.probationEndDate))
      setEndDate(toDateInput(current.endDate))
      setFixedTermReason(current.additionalProperties?.fixedTermReason || '')
    }
  }, [current])

  useEffect(() => {
    if (!regionCatalogIsFull && !region && Array.isArray(regions) && regions.length === 1) {
      setRegion(regions[0].id)
    }
  }, [regions, region, regionCatalogIsFull])

  const probationPeriodText = useMemo(() => {
    if (!contractType) return null

    const selectedContract = contractTypes.find(ct => ct.id === contractType)
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
  }, [contractType, contractTypes, t])

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
    if (startDate && contractType) {
      const calculatedEndDate = calculateProbationEndDate(startDate, contractType)
      if (calculatedEndDate) {
        setProbationEndDate(calculatedEndDate)
      } else {
        setProbationEndDate('')
      }
    }
  }, [startDate, contractType, calculateProbationEndDate])

  const isProbationException = useMemo(() => {
    if (!startDate || !contractType || !probationEndDate) return false

    const calculatedEndDate = calculateProbationEndDate(startDate, contractType)
    return calculatedEndDate !== null && probationEndDate !== calculatedEndDate
  }, [startDate, contractType, probationEndDate, calculateProbationEndDate])

  const isProbationEndBeforeStart = useMemo(() => {
    if (!startDate || !probationEndDate) return false
    const start = dayjs(startDate)
    const probationEnd = dayjs(probationEndDate)
    return start.isValid() && probationEnd.isValid() && probationEnd.isBefore(start, 'day')
  }, [startDate, probationEndDate])

  const isValid = useMemo(() => {
    return Boolean(employmentType && contractType && remote && region && startDate) && !isProbationEndBeforeStart
  }, [employmentType, contractType, remote, region, startDate, isProbationEndBeforeStart])

  const title = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.title', 'Update Working Conditions'),
    []
  )

  const hasChanges = useMemo(() => {
    if (!current) return true
    const curStart = current.startDate ? current.startDate.split('T')[0] : ''
    const curProb = current.probationEndDate ? current.probationEndDate.split('T')[0] : ''
    const curEnd = current.endDate ? current.endDate.split('T')[0] : ''
    const curFixedTermReason = current.additionalProperties?.fixedTermReason || ''
    return (
      employmentType !== current.employmentTypeRef ||
      contractType !== current.contractTypeRef ||
      remote !== current.remoteRef ||
      region !== current.regionRef ||
      (startDate || '') !== curStart ||
      (probationEndDate || '') !== curProb ||
      (endDate || '') !== curEnd ||
      fixedTermReason !== curFixedTermReason
    )
  }, [current, employmentType, contractType, remote, region, startDate, probationEndDate, endDate, fixedTermReason])

  const validateForm = () => {
    if (isProbationEndBeforeStart) {
      return [t('working-conditions-probation-end-before-start')]
    }
    if (!employmentType || !contractType || !remote || !region || !startDate) {
      return [
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:working_conditions_form.required',
          'Please complete required fields'
        )
      ]
    }
    return null
  }

  const handlePreSubmit = async () => {
    const employeeId =
      (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      context.userInfo?.employeeDetails?.employeeId

    return {
      employeeId,
      event: 'pse_submit',
      employeeWorkingCondition: {
        id: current?.id,
        version: typeof current?.version === 'number' ? current?.version : undefined,
        employmentTypeRef: employmentType,
        contractTypeRef: contractType,
        remoteRef: remote,
        regionRef: region,
        hireDate: startDate || undefined,
        probationEnd: probationEndDate || undefined,
        exitDate: endDate || undefined,
        employeeId,
        contractStatus: 'ACTIVE',
        additionalProperties: fixedTermReason ? { fixedTermReason } : undefined
      }
    }
  }

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
          validateForm={validateForm}
          handlePreSubmit={handlePreSubmit}
          isSubmitDisabled={!isValid || !hasChanges}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="flw_updateWorkingConditions_submitBtn"
          cancelButtonTestId="flw_updateWorkingConditions_cancelBtn"
          submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          data-testid={formatDataTestId(prefixDataTestId, 'Container')}
        >
          <div className="gba:py-6 gba:space-y-4">
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:working_conditions_form.employmentType',
                  'Employment Type'
                )}
                *
              </div>
              <Select value={employmentType} onValueChange={setEmploymentType} disabled={loading}>
                <SelectTrigger
                  className="gba:w-full gba:truncate"
                  data-testid="flw_updateWorkingConditions_employmentTypeSelect"
                >
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select Type')}
                  />
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
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.contractType', 'Contract Type')}*
              </div>
              <Select value={contractType} onValueChange={setContractType} disabled={loading}>
                <SelectTrigger
                  className="gba:w-full gba:truncate"
                  data-testid="flw_updateWorkingConditions_contractTypeSelect"
                >
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select Type')}
                  />
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
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.remote', 'Remote')}*
              </div>
              <Select value={remote} onValueChange={setRemote} disabled={loading}>
                <SelectTrigger
                  className="gba:w-full gba:truncate"
                  data-testid="flw_updateWorkingConditions_remoteSelect"
                >
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select remote')}
                  />
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
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.region', 'Region')}*
              </div>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger
                  className="gba:w-full gba:truncate"
                  data-testid="flw_updateWorkingConditions_regionSelect"
                >
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select Region')}
                  />
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
              <div className="gba:space-y-2 gba:overflow-hidden">
                <div className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.start_date', 'Start Date')}*
                </div>
                <DateInput
                  type="date"
                  value={getDateInputValue(startDate)}
                  onChange={(value: string | [string | null, string | null] | null) => {
                    const stringValue = typeof value === 'string' ? value : ''
                    setStartDate(stringValue)
                  }}
                  outputFormat="iso"
                  data-testid="flw_updateWorkingConditions_startDatePicker"
                />
              </div>

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
                <div className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:working_conditions_form.probation_end_date',
                    'Probation End Date'
                  )}
                </div>
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
              <div className="gba:space-y-2 gba:overflow-hidden">
                <div className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.end_date', 'End Date')}
                </div>
                <DateInput
                  type="date"
                  value={getDateInputValue(endDate)}
                  onChange={(value: string | [string | null, string | null] | null) => {
                    const stringValue = typeof value === 'string' ? value : ''
                    setEndDate(stringValue)
                  }}
                  disabled={!startDate || loading}
                  min={startDate || undefined}
                  outputFormat="iso"
                  data-testid="flw_updateWorkingConditions_endDatePicker"
                />
              </div>

              <div className="gba:space-y-2">
                <div className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:working_conditions_form.fixed_term_reason',
                    'Exit Reason'
                  )}
                </div>
                <Input
                  type="text"
                  value={fixedTermReason}
                  onChange={(e: any) => setFixedTermReason(e.target.value)}
                  disabled={!endDate || loading}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:working_conditions_form.fixed_term_reason_placeholder',
                    'Enter reason'
                  )}
                  data-testid="flw_updateWorkingConditions_fixedTermReason"
                />
              </div>
            </div>
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export default UpdateWorkingConditionsScreen
