import React, { useMemo, useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system';
import { AppActionForm } from '@/components/app-action-form';
import flowSmall from '@/assets/icons/flowSmall.svg';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
// import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { useCommunicationLookups } from './queries/ChangeCommunicationQueries';

interface ChangePrivateCommunicationScreenProps extends BusinessAppContextProps {}

const prefixDataTestId = 'ChangePrivateCommunicationScreen';

const ChangePrivateCommunicationScreen: React.FC<ChangePrivateCommunicationScreenProps> = (context) => {
  const [channelType, setChannelType] = useState<string | undefined>(undefined);
  const [valueType, setValueType] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('PRIVATE');
  const { channels, types, loading } = useCommunicationLookups(context);

  const isValid = useMemo(() => !!channelType && !!valueType && !!purpose && value.trim().length > 0, [channelType, valueType, purpose, value]);

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
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
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
              <SelectTrigger className="gba:w-full">
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
              <SelectTrigger className="gba:w-full">
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
              <SelectTrigger className="gba:w-full">
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
            />
          </div>
        </div>

        {/* Actions handled by AppActionForm */}
      </div>
    </AppActionForm>
  );
};

export default ChangePrivateCommunicationScreen;


