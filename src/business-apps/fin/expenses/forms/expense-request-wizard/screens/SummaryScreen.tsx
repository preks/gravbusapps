import React from 'react';
import { Typography } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';

const { Title } = Typography;

/**
 * SummaryScreen component props
 */
interface SummaryScreenProps extends BusinessAppContextProps {
  additionalData?: { 
    mdi_modulePayload?: {
      tripData?: any;
    };
    [key: string]: any;
  };
}

/**
 * SummaryScreen component for expense request wizard
 * @param props - Component props
 * @returns SummaryScreen component
 */
const SummaryScreen: React.FC<SummaryScreenProps> = () => {
  return (
    <div className="gba:summaryScreenContainer" data-testid="expense-request-wizard-summary-screen">
      <Title level={4} className="gba:screenTitle" data-testid="expense-request-wizard-summary-screen-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request_wizard.summary_screen_title', 'Summary')}
      </Title>
      <div className="gba:summaryContent" data-testid="expense-request-wizard-summary-screen-content">
        {/* Content will be added here */}
      </div>
    </div>
  );
};

export default SummaryScreen;
