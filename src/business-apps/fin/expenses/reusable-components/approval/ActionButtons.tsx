import React from 'react';
import { Button } from '@newwork/nw-design-system';

interface ActionButtonsProps {
  submitting: boolean;
  onApprove: () => void;
  onReturn: () => void;
  prefixDataTestId?: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  submitting,
  onApprove,
  onReturn,
  prefixDataTestId = 'approve-expense'
}) => {
  return (
    <div className="gba:flex gba:justify-end gba:gap-3" data-testid={`${prefixDataTestId}-actions`}>
      <Button
        variant="outline"
        onClick={onReturn}
        disabled={submitting}
        data-testid={`${prefixDataTestId}-return-button`}
      >
        Return
      </Button>
      <Button
        variant="default"
        onClick={onApprove}
        disabled={submitting}
        data-testid={`${prefixDataTestId}-approve-button`}
      >
        Approve
      </Button>
    </div>
  );
};

export default ActionButtons; 