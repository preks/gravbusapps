import React from 'react';
import { Typography } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';

const { Title } = Typography;

/**
 * TripScreen component props
 */
interface TripScreenProps extends BusinessAppContextProps {}

/**
 * TripScreen component for expense request wizard
 * @param props - Component props
 * @returns TripScreen component
 */
const TripScreen: React.FC<TripScreenProps> = () => {
  return (
    <div className="gba:tripScreenContainer" data-testid="expense-request-wizard-trip-screen">
      <Title level={4} className="gba:screenTitle" data-testid="expense-request-wizard-trip-screen-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request_wizard.trip_screen_title', 'Trip Details')}
      </Title>
      <div className="gba:tripContent" data-testid="expense-request-wizard-trip-screen-content">
        {/* Content will be added here */}
      </div>
    </div>
  );
};

export default TripScreen;
