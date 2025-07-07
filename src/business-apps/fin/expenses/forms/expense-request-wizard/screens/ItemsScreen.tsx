import React from 'react';
import { Typography } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';

const { Title } = Typography;

/**
 * ItemsScreen component props
 */
interface ItemsScreenProps extends BusinessAppContextProps {}

/**
 * ItemsScreen component for expense request wizard
 * @param props - Component props
 * @returns ItemsScreen component
 */
const ItemsScreen: React.FC<ItemsScreenProps> = () => {
  return (
    <div className="gba:itemsScreenContainer" data-testid="expense-request-wizard-items-screen">
      <Title level={4} className="gba:screenTitle" data-testid="expense-request-wizard-items-screen-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request_wizard.items_screen_title', 'Expense Items')}
      </Title>
      <div className="gba:itemsContent" data-testid="expense-request-wizard-items-screen-content">
        {/* Content will be added here */}
      </div>
    </div>
  );
};

export default ItemsScreen;
