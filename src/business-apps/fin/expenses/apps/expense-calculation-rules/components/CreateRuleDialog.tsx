import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system';
import { CreateCalculationRuleForm } from '@/business-apps/fin/expenses/forms/create-calculation-rule';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface CreateRuleDialogProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  additionalData?: any;
  onCreated: () => void;
}

const CreateRuleDialog: React.FC<CreateRuleDialogProps> = ({ open, onOpenChange, accessToken, additionalData, onCreated }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={`expense-calculation-rules-create-modal`} 
        onOpenAutoFocus={(e) => { e.preventDefault(); }}
        className="gba:h-[100vh] gba:max-h-[100vh] gba:flex gba:flex-col gba:px-[40px] gba:w-[100%] gba:overflow-hidden">
        <DialogHeader />
        <DialogTitle className="gba:hidden">Create Calculation Rule</DialogTitle>
        <div className="gba:flex-1 gba:overflow-y-auto gba:pr-2">
          <CreateCalculationRuleForm
            accessToken={accessToken}
            additionalData={additionalData}
            onCancel={() => onOpenChange(false)}
            onCreate={() => { onOpenChange(false); onCreated(); }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRuleDialog;


