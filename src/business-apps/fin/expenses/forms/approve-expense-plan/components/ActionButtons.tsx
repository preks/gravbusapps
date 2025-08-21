import React from 'react';
import { Button } from '@newwork/nw-design-system';

interface ActionButtonsProps {
  submitting: boolean;
  onApprove: () => void;
  onReturn: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  submitting,
  onApprove,
  onReturn
}) => {
  return (
    <div className="gba:flex gba:justify-end gba:gap-3" data-testid="approve-expense-plan-actions">
      <Button
        variant="outline"
        onClick={onReturn}
        disabled={submitting}
        data-testid="approve-expense-plan-return-button"
      >
        Return
      </Button>
      <Button
        variant="default"
        onClick={onApprove}
        disabled={submitting}
        data-testid="approve-expense-plan-approve-button"
      >
        Approve
      </Button>
    </div>
  );
};

export default ActionButtons; 