import React from 'react'
import { Textarea } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface MessageSectionProps {
  message: string
  showWarning: boolean
  onMessageChange: (value: string) => void
  prefixDataTestId?: string
  warningKey?: string
  warningDefaultText?: string
}

const MessageSection: React.FC<MessageSectionProps> = ({
  message,
  showWarning,
  onMessageChange,
  prefixDataTestId = 'approve-expense',
  warningKey = 'approve_expense.warning_message',
  warningDefaultText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:approve_expense_plan.warning_message',
    'Please add a message!'
  )
}) => {
  return (
    <div className="gba:mb-4 gba:p-2 gba:rounded-sm gba:w-full" data-testid={`${prefixDataTestId}-message`}>
      <div className="gba:text-md gba:font-semibold gba:mb-1 gba:text-foreground">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.search_employee_list.recent_employees_table.message',
          'Message'
        )}
      </div>
      <Textarea
        placeholder={getTranslationFromI18nKeyAndLabel(
          'lowcoder:approve_expense_plan.comment_area',
          'Write Message...'
        )}
        value={message}
        onChange={e => onMessageChange(e.target.value)}
        className="gba:border-none gba:resize-none gba:p-2 gba:text-xs gba:rounded-none"
        style={{ backgroundColor: 'muted' }}
        data-testid={`${prefixDataTestId}-message-textarea`}
      />

      {/* Warning message */}
      {showWarning && (
        <div className="gba:text-red-600 gba:text-sm gba:mt-2" data-testid={`${prefixDataTestId}-warning`}>
          {getTranslationFromI18nKeyAndLabel(warningKey, warningDefaultText)}
        </div>
      )}
    </div>
  )
}

export default MessageSection
