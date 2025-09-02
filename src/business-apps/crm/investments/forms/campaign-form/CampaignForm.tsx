import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface CampaignFormProps extends BusinessAppContextProps {}

const CampaignForm: React.FC<CampaignFormProps> = () => {
  return (
    <div className="gba:p-6" data-testid="investment-campaign-form">
      <div className="gba:grid gba:grid-cols-1 gba:gap-4">
        <label className="gba:block">
          <span className="gba:block gba:mb-2">{getTranslationFromI18nKeyAndLabel('campaign.name', 'Campaign Name')}</span>
          <input className="gba:w-full gba:border gba:rounded gba:px-3 gba:py-2" data-testid="investment-campaign-name" />
        </label>
        <label className="gba:block">
          <span className="gba:block gba:mb-2">{getTranslationFromI18nKeyAndLabel('campaign.budget', 'Budget')}</span>
          <input type="number" className="gba:w-full gba:border gba:rounded gba:px-3 gba:py-2" data-testid="investment-campaign-budget" />
        </label>
      </div>
      <div className="gba:mt-4 gba:flex gba:justify-end">
        <button className="gba:px-3 gba:py-1 gba:border gba:rounded" data-testid="investment-campaign-submit">
          {getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        </button>
      </div>
    </div>
  );
};

export default CampaignForm;

