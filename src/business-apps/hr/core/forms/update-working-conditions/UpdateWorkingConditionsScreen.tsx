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
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useWorkingConditionsLookups } from './queries/UpdateWorkingConditionsQueries'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { truncateText } from '@/common/utils/textUtils'
import translations from '../_i18n'

const prefixDataTestId = 'UpdateWorkingConditionsScreen'

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
    loading
  } = useWorkingConditionsLookups(context)

  const [employmentType, setEmploymentType] = useState<string | undefined>(undefined)
  const [contractType, setContractType] = useState<string | undefined>(undefined)
  const [remote, setRemote] = useState<string | undefined>(undefined)
  const [region, setRegion] = useState<string | undefined>(undefined)
  const [startDate, setStartDate] = useState<string>('')
  const [probationEndDate, setProbationEndDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

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
    }
  }, [current])

  useEffect(() => {
    if (!region && Array.isArray(regions) && regions.length === 1) {
      setRegion(regions[0].id)
    }
  }, [regions, region])

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

  const isValid = useMemo(() => {
    return Boolean(employmentType && contractType && remote && region && startDate)
  }, [employmentType, contractType, remote, region, startDate])

  const hasChanges = useMemo(() => {
    if (!current) return true
    const curStart = current.startDate ? current.startDate.split('T')[0] : ''
    const curProb = current.probationEndDate ? current.probationEndDate.split('T')[0] : ''
    const curEnd = current.endDate ? current.endDate.split('T')[0] : ''
    return (
      employmentType !== current.employmentTypeRef ||
      contractType !== current.contractTypeRef ||
      remote !== current.remoteRef ||
      region !== current.regionRef ||
      (startDate || '') !== curStart ||
      (probationEndDate || '') !== curProb ||
      (endDate || '') !== curEnd
    )
  }, [current, employmentType, contractType, remote, region, startDate, probationEndDate, endDate])

  const validateForm = () => {
    if (!isValid) {
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
        contractStatus: 'ACTIVE'
      }
    }
  }

  return (
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
      <div className="gba:bg-white gba:max-w-3xl gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        <div className="gba:flex gba:items-center gba:gap-2 gba:py-6">
          <img src={flowSmall} alt="Flow Small" className="gba:w-6 gba:h-6" style={{ filter: 'brightness(0)' }} />
          <h2 className="gba:text-xl gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.title', 'Update Working Conditions')}
          </h2>
        </div>

        <div className="gba:flex gba:items-center gba:gap-3 gba:pb-4">
          <Avatar className="gba:w-12 gba:h-12">
            <AvatarImage
              src={pictureThumbnail ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined}
              alt={`${firstName || ''} ${lastName || ''}`}
            />
            <AvatarFallback>
              {(firstName?.[0] || '').toUpperCase()}
              {(lastName?.[0] || '').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col">
            <div className="gba:text-base gba:font-medium">
              {firstName} {lastName}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">{jobTitle}</div>
          </div>
        </div>

        <div className="gba:border-t" />

        <div className="gba:py-6 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.employmentType', 'Employment Type')}*
            </div>
            <Select value={employmentType} onValueChange={setEmploymentType} disabled={loading}>
              <SelectTrigger
                className="gba:w-full gba:truncate"
                data-testid="flw_updateWorkingConditions_employmentTypeSelect"
              >
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select Type')} />
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
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select Type')} />
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
              <SelectTrigger className="gba:w-full gba:truncate" data-testid="flw_updateWorkingConditions_remoteSelect">
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
              <SelectTrigger className="gba:w-full gba:truncate" data-testid="flw_updateWorkingConditions_regionSelect">
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
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.start_date', 'Start Date')}*
              </div>
              <DateInput
                type="date"
                value={startDate}
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

            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:working_conditions_form.probation_end_date',
                  'Probation End Date'
                )}
              </div>
              <DateInput
                type="date"
                value={probationEndDate}
                onChange={(value: string | [string | null, string | null] | null) => {
                  const stringValue = typeof value === 'string' ? value : ''
                  setProbationEndDate(stringValue)
                }}
                disabled={!startDate || loading}
                min={startDate || undefined}
                outputFormat="iso"
                data-testid="flw_updateWorkingConditions_probationEndDatePicker"
              />
              {isProbationException && (
                <div
                  className="gba:text-sm gba:text-warning"
                  data-testid="flw_updateWorkingConditions_probationWarning"
                >
                  {t('working-conditions-probation-exception-warning')}
                </div>
              )}
            </div>
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.end_date', 'End Date')}
              </div>
              <DateInput
                type="date"
                value={endDate}
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
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default UpdateWorkingConditionsScreen
