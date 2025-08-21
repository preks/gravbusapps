import React from 'react';
import { Textarea } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface MessageSectionProps {
  message: string;
  showWarning: boolean;
  onMessageChange: (value: string) => void;
}

const MessageSection: React.FC<MessageSectionProps> = ({
  message,
  showWarning,
  onMessageChange
}) => {
  return (
    <div className="gba:mb-4 gba:bg-gray-100 gba:p-2 gba:rounded-sm gba:w-full" data-testid="approve-expense-plan-message">
      <div className="gba:text-md gba:font-semibold gba:mb-1 gba:text-foreground">
        Message
      </div>
      <Textarea
        placeholder="Write Message..."
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        className="gba:bg-transparent gba:border-none gba:text-muted-foreground gba:resize-none gba:p-0 gba:text-xs"
        data-testid="approve-expense-plan-message-textarea"
      />
      
      {/* Warning message */}
      {showWarning && (
        <div className="gba:text-red-600 gba:text-sm gba:mt-2" data-testid="approve-expense-plan-warning">
          {getTranslationFromI18nKeyAndLabel('approve_expense_plan.warning_message', 'Please add a message!')}
        </div>
      )}
    </div>
  );
};

export default MessageSection; 