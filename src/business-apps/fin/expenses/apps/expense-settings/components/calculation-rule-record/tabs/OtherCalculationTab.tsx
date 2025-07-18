import React from 'react';
import { Alert, Card } from 'antd';
import { PiInfo } from 'react-icons/pi';

interface OtherCalculationTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

const OtherCalculationTab: React.FC<OtherCalculationTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  return (
    <Card data-testid="other-calculation-tab">
      <Alert
        message="Other Calculation Module"
        description={`This tab will contain the Other Calculation module for rule ${ruleId}. Module integration is pending implementation.`}
        type="info"
        icon={<PiInfo />}
        showIcon
      />
      {/* TODO: Integrate actual Other Calculation module */}
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

export default OtherCalculationTab; 