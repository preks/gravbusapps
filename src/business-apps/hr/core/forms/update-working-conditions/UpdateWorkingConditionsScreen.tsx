import React, { useEffect, useMemo, useState } from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useWorkingConditionsLookups } from './queries/UpdateWorkingConditionsQueries'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { truncateText } from '@/common/utils/textUtils'

const prefixDataTestId = 'UpdateWorkingConditionsScreen'

const UpdateWorkingConditionsScreen: React.FC<BusinessAppContextProps> = context => {
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

  // If country has no regions, hook returns a single option (country). Select it by default.
  useEffect(() => {
    if (!region && Array.isArray(regions) && regions.length === 1) {
      setRegion(regions[0].id)
    }
  }, [regions, region])

  const isValid = useMemo(() => {
    return Boolean(employmentType && contractType && remote && region && startDate)
  }, [employmentType, contractType, remote, region, startDate])

  const hasChanges = useMemo(() => {
    if (!current) return true // if nothing to compare against, allow submit when valid
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
    return {
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
        employeeId:
          (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
          context.userInfo?.employeeDetails?.employeeId,
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
      submitButtonTestId="flw_updateWorkingConditions_submitBtn"
      cancelButtonTestId="flw_updateWorkingConditions_cancelBtn"
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      onCancel={() => {
        dispatchProcessContinueEvent('pse_abort', {
          event: 'pse_abort',
          pso_exitStrategy: 'abort',
          pso_completeNotification: {
            type: 'error',
            messageKey: getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_module.toast_notification_cancel_create_absence',
              'The action has been canceled.'
            )
          }
        })
      }}
    >
      <div className="gba:bg-white gba:max-w-3xl gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        {/* Title Header */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:py-6">
          <img src={flowSmall} alt="Flow Small" className="gba:w-6 gba:h-6" style={{ filter: 'brightness(0)' }} />
          <h2 className="gba:text-xl gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.title', 'Update Working Conditions')}
          </h2>
        </div>

        {/* Employee Header */}
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

        {/* Content */}
        <div className="gba:py-6 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          {/* Employment Type */}
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

          {/* Contract Type */}
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

          {/* Remote */}
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

          {/* Region */}
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

          {/* Dates (stacked vertically like old form) */}
          <div className="gba:flex gba:flex-col gba:gap-4">
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.start_date', 'Start Date')}*
              </div>
              <Input
                type="date"
                value={startDate}
                onChange={(e: any) => setStartDate(e.target.value)}
                data-testid="flw_updateWorkingConditions_startDatePicker"
              />
            </div>
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:working_conditions_form.probation_end_date',
                  'Probation End Date'
                )}
              </div>
              <Input
                type="date"
                value={probationEndDate}
                onChange={(e: any) => setProbationEndDate(e.target.value)}
                disabled={!startDate || loading}
                min={startDate || undefined}
                data-testid="flw_updateWorkingConditions_probationEndDatePicker"
              />
            </div>
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.end_date', 'End Date')}
              </div>
              <Input
                type="date"
                value={endDate}
                onChange={(e: any) => setEndDate(e.target.value)}
                disabled={!startDate || loading}
                min={startDate || undefined}
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
