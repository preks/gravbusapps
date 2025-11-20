import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Textarea, Alert, AlertDescription } from '@newwork/nw-design-system'
import { PiMessageSquare } from 'react-icons/pi'
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
    <Card data-testid={`${prefixDataTestId}-message`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiMessageSquare className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.search_employee_list.recent_employees_table.message',
            'Message'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <Textarea
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.comment_area',
            'Write Message...'
          )}
          value={message}
          onChange={e => onMessageChange(e.target.value)}
          className="gba:resize-none gba:min-h-[100px]"
          data-testid={`${prefixDataTestId}-message-textarea`}
        />

        {/* Warning message */}
        {showWarning && (
          <Alert variant="destructive" data-testid={`${prefixDataTestId}-warning`}>
            <AlertDescription>{getTranslationFromI18nKeyAndLabel(warningKey, warningDefaultText)}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default MessageSection
