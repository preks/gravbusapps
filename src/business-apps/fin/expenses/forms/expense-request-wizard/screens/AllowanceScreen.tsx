import React from 'react';
import { Typography } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';

const { Title } = Typography;

/**
 * AllowanceScreen component props
 */
interface AllowanceScreenProps extends BusinessAppContextProps {}

/**
 * AllowanceScreen component for expense request wizard
 * @param props - Component props
 * @returns AllowanceScreen component
 */
const AllowanceScreen: React.FC<AllowanceScreenProps> = () => {
  return (
    <div className="gba:allowanceScreenContainer" data-testid="expense-request-wizard-allowance-screen">
      <Title level={4} className="gba:screenTitle" data-testid="expense-request-wizard-allowance-screen-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request_wizard.allowance_screen_title', 'Allowances & Deductions')}
      </Title>
      <div className="gba:allowanceContent" data-testid="expense-request-wizard-allowance-screen-content">
        {/* Content will be added here */}
      </div>
    </div>
  );
};

export default AllowanceScreen;
