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
  const [employmentType, setEmploymentType] = useState<string>('')
  const [contractType, setContractType] = useState<string>('')
  const [remote, setRemote] = useState<string>('')
  const [region, setRegion] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [probationEndDate, setProbationEndDate] = useState<string>('')
  useEffect(() => {
    if (!current) {
      return
    }

    const toDateInput = (val?: string | null): string => {
      if (!val) return ''
      const idx = val.indexOf('T')
      return idx > 0 ? val.substring(0, idx) : val
    }

    setStartDate(toDateInput(current.startDate))
    setProbationEndDate(toDateInput(current.probationEndDate))
  }, [current])

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

  const isValid = useMemo(() => {
    return (
      Boolean(selectedEmploymentType && selectedContractType && selectedRemote && selectedRegion && startDate) &&
      !isProbationEndBeforeStart
    )
  }, [
    selectedEmploymentType,
    selectedContractType,
    selectedRemote,
    selectedRegion,
    startDate,
    isProbationEndBeforeStart
  ])

  const title = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.title', 'Update Working Conditions'),
    []
  )

  const hasChanges = useMemo(() => {
    if (!current) return true
    const curStart = current.startDate ? current.startDate.split('T')[0] : ''
    const curProb = current.probationEndDate ? current.probationEndDate.split('T')[0] : ''
    return (
      selectedEmploymentType !== (current.employmentTypeRef || '') ||
      selectedContractType !== (current.contractTypeRef || '') ||
      selectedRemote !== (current.remoteRef || '') ||
      selectedRegion !== (current.regionRef || '') ||
      (startDate || '') !== curStart ||
      (probationEndDate || '') !== curProb
    )
  }, [
    current,
    selectedEmploymentType,
    selectedContractType,
    selectedRemote,
    selectedRegion,
    startDate,
    probationEndDate
  ])

  const validateForm = () => {
    if (isProbationEndBeforeStart) {
      return [t('working-conditions-probation-end-before-start')]
    }
    if (!selectedEmploymentType || !selectedContractType || !selectedRemote || !selectedRegion || !startDate) {
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
        employmentTypeRef: selectedEmploymentType,
        contractTypeRef: selectedContractType,
        remoteRef: selectedRemote,
        regionRef: selectedRegion,
        hireDate: startDate || undefined,
        probationEnd: probationEndDate || undefined,
        employeeId,
        contractStatus: 'ACTIVE'
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
              <Select value={selectedEmploymentType} onValueChange={setEmploymentType} disabled={loading}>
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
              <Select value={selectedContractType} onValueChange={setContractType} disabled={loading}>
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
              <Select value={selectedRemote} onValueChange={setRemote} disabled={loading}>
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
              <Select value={selectedRegion} onValueChange={setRegion}>
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
            </div>
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export default UpdateWorkingConditionsScreen
