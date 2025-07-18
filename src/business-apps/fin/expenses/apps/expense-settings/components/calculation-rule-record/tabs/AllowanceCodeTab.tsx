import React from 'react';
import { Alert, Card } from 'antd';
import { PiInfo } from 'react-icons/pi';

interface AllowanceCodeTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

const AllowanceCodeTab: React.FC<AllowanceCodeTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  return (
    <Card data-testid="allowance-code-tab">
      <Alert
        message="Allowance Code Module"
        description={`This tab will contain the Allowance Code module for rule ${ruleId}. Module integration is pending implementation.`}
        type="info"
        icon={<PiInfo />}
        showIcon
      />
      {/* TODO: Integrate actual Allowance Code module */}
      <div className="gba:mt-4 gba:p-4 gba:border gba:border-dashed gba:border-gray-300 gba:rounded">
        <p className="gba:text-gray-600">
          <strong>Module Data:</strong>
        </p>
        <ul className="gba:text-sm gba:text-gray-500">
          <li>Expense Calculation ID: {ruleId}</li>
          <li>Active From: {activeFrom}</li>
          <li>Access Token: {accessToken ? '***' : 'Not provided'}</li>
        </ul>
      </div>
    </Card>
  );
};

export default AllowanceCodeTab; 