import React, { useMemo, useState } from 'react';
import { Button, Spinner, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';

interface ChangePrivateCommunicationScreenProps extends BusinessAppContextProps {}

const prefixDataTestId = 'ChangePrivateCommunicationScreen';

const CHANNEL_TYPES = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'CHAT', label: 'Chat' },
];

const VALUE_TYPES = [
  { value: 'WORK', label: 'Work' },
  { value: 'HOME', label: 'Home' },
  { value: 'OTHER', label: 'Other' },
];

const ChangePrivateCommunicationScreen: React.FC<ChangePrivateCommunicationScreenProps> = ({ additionalData }) => {
  const [channelType, setChannelType] = useState<string | undefined>(undefined);
  const [valueType, setValueType] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<string>('');

  const isValid = useMemo(() => !!channelType && !!valueType && value.trim().length > 0, [channelType, valueType, value]);

  const handleSubmit = () => {
    if (!isValid) return;
    const payload = {
      channelType,
      type: valueType,
      purpose: 'PRIVATE',
      value: value.trim(),
    };
    dispatchProcessContinueEvent('pse_submit', payload);
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {});
  };

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full"
    >
      <div className="gba:bg-white gba:max-w-xl gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel('change.communication.title', 'Change Private Communication')}
            </h2>
          </div>
        </div>

        <div className="gba:border-t gba:border-gray-200" />

        {/* Content */}
        <div className="gba:p-6 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          {/* Channel Type */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('change.communication.channelType', 'Channel Type')}*
            </div>
            <Select value={channelType} onValueChange={setChannelType}>
              <SelectTrigger className="gba:w-full">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('change.communication.selectChannel', 'Select Channel Type')} />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('change.communication.type', 'Type')}*
            </div>
            <Select value={valueType} onValueChange={setValueType}>
              <SelectTrigger className="gba:w-full">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('change.communication.selectType', 'Select Type')} />
              </SelectTrigger>
              <SelectContent>
                {VALUE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purpose (fixed) */}
          <div className="gba:space-y-1">
            <div className="gba:text-sm gba:font-medium gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('change.communication.purpose', 'Purpose')}
            </div>
            <div className="gba:w-full gba:bg-gray-50 gba:text-gray-700 gba:rounded gba:p-3">PRIVATE</div>
          </div>

          {/* Value */}
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('change.communication.value', 'Value')}*
            </div>
            <Input
              placeholder={getTranslationFromI18nKeyAndLabel('change.communication.enterValue', 'Enter Value')}
              value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="gba:p-6 gba:border-t gba:border-gray-200 gba:flex gba:gap-3 gba:justify-end">
          <Button
            variant="secondary"
            onClick={handleCancel}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
          >
            {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          </Button>
          <Button
            disabled={!isValid}
            onClick={handleSubmit}
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
            className="gba:min-w-24"
          >
            {getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChangePrivateCommunicationScreen;


