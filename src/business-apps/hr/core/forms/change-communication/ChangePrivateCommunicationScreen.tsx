import React, { useEffect, useMemo, useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system';
import { AppActionForm } from '@/components/app-action-form';
import flowSmall from '@/assets/icons/flowSmall.svg';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useCommunicationLookups } from './queries/ChangeCommunicationQueries';
import { useEmployeeData } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';

interface ChangePrivateCommunicationScreenProps extends BusinessAppContextProps {}

const prefixDataTestId = 'ChangePrivateCommunicationScreen';

const ChangePrivateCommunicationScreen: React.FC<ChangePrivateCommunicationScreenProps> = (context) => {
  const [channelType, setChannelType] = useState<string | undefined>(undefined);
  const [valueType, setValueType] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('PRIVATE');
  const [baseline, setBaseline] = useState<{ channelRef?: string; typeRefId?: string; value?: string; purpose?: string } | null>(null);
  const { channels, types, loading } = useCommunicationLookups(context);
  const employeeId = context.userInfo?.employeeDetails?.employeeId || '';
  const { employee } = useEmployeeData(context.accessToken, '', employeeId, !employeeId);

  // Build memoized latest-by-channel map to avoid re-running on each render
  const latestByChannelRef = useMemo(() => {
    const communications = (employee?.communication || []) as any[];
    return communications.reduce((acc: Record<string, any>, c: any) => {
      const key = c.channelRef;
      if (!key) return acc;
      const prev = acc[key];
      if (!prev) {
        acc[key] = c;
      } else {
        const prevVersion = typeof prev.version === 'number' ? prev.version : -1;
        const curVersion = typeof c.version === 'number' ? c.version : prevVersion + 1;
        if (curVersion >= prevVersion) acc[key] = c;
      }
      return acc;
    }, {} as Record<string, any>);
  }, [employee?.communication]);

  const isValid = useMemo(() => !!channelType && !!valueType && !!purpose && value.trim().length > 0, [channelType, valueType, purpose, value]);
  const hasChanges = useMemo(() => {
    if (!baseline) return false;
    return (
      channelType !== baseline.channelRef ||
      valueType !== baseline.typeRefId ||
      value.trim() !== (baseline.value || '') ||
      purpose !== (baseline.purpose || 'PRIVATE')
    );
  }, [baseline, channelType, valueType, value, purpose]);

  // Auto-select first available channel type once data is loaded
  useEffect(() => {
    if (!channelType && channels && channels.length > 0) {
      setChannelType(channels[0].id);
    }
  }, [channelType, channels]);

  // Prefill fields based on selected channel from employee data (only when baseline not set for channel)
  useEffect(() => {
    if (!employee || !channelType) return;
    if (baseline && baseline.channelRef === channelType) return; // don't override user edits

    let existing = latestByChannelRef[channelType];
    if (!existing) {
      // Fallback: try matching by catalog label/code
      const selectedChannel = channels.find((ch) => ch.id === channelType);
      if (selectedChannel) {
        existing = (employee.communication || []).find((c: any) => c.channel?.value === selectedChannel.label || c.channel?.code === selectedChannel.value);
      }
    }
    if (!existing) {
      // Clear fields if no existing data and set baseline accordingly
      setValueType(undefined);
      setValue('');
      setPurpose('PRIVATE');
      setBaseline({ channelRef: channelType, typeRefId: undefined, value: '', purpose: 'PRIVATE' });
      return;
    }
    // Map type label to option id
    const match = existing.type?.value ? types.find((t) => t.label === existing.type.value || t.value === existing.type.value) : undefined;
    const typeId = match ? match.id : undefined;
    const prefillValue = existing.value || '';
    const prefillPurpose = existing.purpose || 'PRIVATE';
    setValueType(typeId);
    setValue(prefillValue);
    setPurpose(prefillPurpose);
    setBaseline({ channelRef: channelType, typeRefId: typeId, value: prefillValue, purpose: prefillPurpose });
  }, [employee, channelType, channels, types, latestByChannelRef, baseline]);

  const validateForm = () => {
    if (!isValid) {
      return [getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.enterValue', 'Enter Value')];
    }
    return null;
  };

  const handlePreSubmit = async () => {
    return {
      employeeCommunication: {
        channelRef: channelType,
        typeRef: valueType,
        purpose,
        value: value.trim(),
        employeeId: context.userInfo?.employeeDetails?.employeeId,
      },
    };
  };

  return (
    <AppActionForm
      processType="update"
      formData={{}}
      onSubmit={(data) => data}
      validateForm={validateForm}
      handlePreSubmit={handlePreSubmit}
      isSubmitDisabled={!isValid || !hasChanges}
      submitButtonTestId="flw_changeRelationship_btnSubmit"
      cancelButtonTestId="flw_changeRelationship_btnCancel"
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
      <div className="gba:bg-white gba:max-w-xl gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2">
            <img
              src={flowSmall}
              alt="Flow Small"
              className="gba:w-6 gba:h-6"
              style={{ filter: 'brightness(0)' }}
            />
            <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.title', 'Change Private Communication')}
            </h2>
          </div>
        </div>

        <div className="gba:border-t gba:border-gray-200" />

        {/* Content */}
        <div className="gba:p-6 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          {/* Channel Type */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.channelType', 'Channel Type')}*
            </div>
            <Select value={channelType} onValueChange={setChannelType} disabled={loading}>
              <SelectTrigger className="gba:w-full" data-testid="flw_changePrivateCommunication_currentChannelType">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.selectChannel', 'Select Channel Type')} />
              </SelectTrigger>
              <SelectContent>
                {channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.type', 'Type')}*
            </div>
            <Select value={valueType} onValueChange={setValueType} disabled={loading}>
              <SelectTrigger className="gba:w-full" data-testid="flw_changePrivateCommunication_currentType">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.selectType', 'Select Type')} />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purpose */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.purpose', 'Purpose')}*
            </div>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger className="gba:w-full" data-testid="flw_changePrivateCommunication_currentPurpose">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.selectPurpose', 'Select Purpose')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">{getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.purpose.private', 'Private')}</SelectItem>
                <SelectItem value="INTERNAL">{getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.purpose.internal', 'Internal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.value', 'Value')}*
            </div>
            <Input
              placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.enterValue', 'Enter Value')}
              value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
              data-testid="flw_changePrivateCommunication_currentValue"
            />
          </div>
        </div>

        {/* Actions handled by AppActionForm */}
      </div>
    </AppActionForm>
  );
};

export default ChangePrivateCommunicationScreen;


