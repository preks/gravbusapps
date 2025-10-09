import React, { useEffect, useMemo, useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system';
import { AppActionForm } from '@/components/app-action-form';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { useWorkingConditionsLookups } from './queries/UpdateWorkingConditionsQueries';

interface UpdateWorkingConditionsScreenProps extends BusinessAppContextProps {}

const prefixDataTestId = 'UpdateWorkingConditionsScreen';

const UpdateWorkingConditionsScreen: React.FC<UpdateWorkingConditionsScreenProps> = (context) => {
  const { employmentTypes, contractTypes, remoteOptions, regions, current, jobTitle, firstName, lastName, pictureThumbnail, loading } = useWorkingConditionsLookups(context);

  const [employmentType, setEmploymentType] = useState<string | undefined>(undefined);
  const [contractType, setContractType] = useState<string | undefined>(undefined);
  const [remote, setRemote] = useState<string | undefined>(undefined);
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>('');
  const [probationEndDate, setProbationEndDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (current) {
      setEmploymentType(current.employmentTypeRef);
      setContractType(current.contractTypeRef);
      setRemote(current.remoteRef);
      setRegion(current.regionRef);
      setStartDate(current.startDate || '');
      setProbationEndDate(current.probationEndDate || '');
      setEndDate(current.endDate || '');
    }
  }, [current]);

  const isValid = useMemo(() => {
    return Boolean(employmentType && contractType && region && startDate);
  }, [employmentType, contractType, region, startDate]);

  const validateForm = () => {
    if (!isValid) {
      return [getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.required', 'Please complete required fields')];
    }
    return null;
  };

  const handlePreSubmit = async () => {
    return {
      employeeWorkingConditions: {
        id: current?.id,
        version: typeof current?.version === 'number' ? current?.version : undefined,
        employmentTypeRef: employmentType,
        contractTypeRef: contractType,
        remoteRef: remote,
        regionRef: region,
        startDate: startDate || undefined,
        probationEndDate: probationEndDate || undefined,
        endDate: endDate || undefined,
        employeeId: context.userInfo?.employeeDetails?.employeeId
      }
    };
  };

  return (
    <AppActionForm
      processType="update"
      formData={{}}
      onSubmit={(data) => data}
      validateForm={validateForm}
      handlePreSubmit={handlePreSubmit}
      isSubmitDisabled={!isValid}
      submitButtonTestId="flw_updateWorkingConditions_btnSubmit"
      cancelButtonTestId="flw_updateWorkingConditions_btnCancel"
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
        });
      }}
    >
      <div className="gba:bg-white gba:max-w-3xl gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:p-6">
          <Avatar className="gba:w-12 gba:h-12">
            <AvatarImage src={pictureThumbnail ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined} alt={`${firstName || ''} ${lastName || ''}`} />
            <AvatarFallback>{(firstName?.[0] || '').toUpperCase()}{(lastName?.[0] || '').toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col">
            <div className="gba:text-base gba:font-medium">{firstName} {lastName}</div>
            <div className="gba:text-sm gba:text-muted-foreground">{jobTitle}</div>
          </div>
        </div>

        <div className="gba:border-t" />

        {/* Content */}
        <div className="gba:p-6 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          {/* Employment Type */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.employmentType', 'Employment Type')}*
            </div>
            <Select value={employmentType} onValueChange={setEmploymentType} disabled={loading}>
              <SelectTrigger className="gba:w-full" data-testid="flw_workCond_employmentType">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select Type')} />
              </SelectTrigger>
              <SelectContent>
                {employmentTypes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contract Type */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.contractType', 'Contract Type')}
            </div>
            <Select value={contractType} onValueChange={setContractType} disabled={loading}>
              <SelectTrigger className="gba:w-full" data-testid="flw_workCond_contractType">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select Type')} />
              </SelectTrigger>
              <SelectContent>
                {contractTypes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Remote */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.remote', 'Remote')}
            </div>
            <Select value={remote} onValueChange={setRemote} disabled={loading}>
              <SelectTrigger className="gba:w-full" data-testid="flw_workCond_remote">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select remote')} />
              </SelectTrigger>
              <SelectContent>
                {remoteOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
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
              <SelectTrigger className="gba:w-full" data-testid="flw_workCond_region">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.select', 'Select Region')} />
              </SelectTrigger>
              <SelectContent>
                {regions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates (stacked vertically like old form) */}
          <div className="gba:flex gba:flex-col gba:gap-4">
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.start_date', 'Start Date')}*</div>
              <Input type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} data-testid="flw_workCond_startDate" />
            </div>
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.probation_end_date', 'Probation End Date')}</div>
              <Input type="date" value={probationEndDate} onChange={(e: any) => setProbationEndDate(e.target.value)} data-testid="flw_workCond_probationEndDate" />
            </div>
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('lowcoder:working_conditions_form.end_date', 'End Date')}</div>
              <Input type="date" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} data-testid="flw_workCond_endDate" />
            </div>
          </div>
        </div>
      </div>
    </AppActionForm>
  );
};

export default UpdateWorkingConditionsScreen;


