import React from 'react'
import { Label, useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FlowContextExpressionEditor } from '../../shared/FlowContextExpressionEditor'

interface UserDecisionHeaderSectionProps {
  title: string
  message: string
  defaultDecisionTitle: string
  onChangeTitle: (value: string) => void
  onChangeMessage: (value: string) => void
  suggestions: ExpressionSuggestionItem[]
  dataSources?: React.ComponentProps<typeof FlowContextExpressionEditor>['dataSources']
  testId: string
}

export const UserDecisionHeaderSection: React.FC<UserDecisionHeaderSectionProps> = ({
  title,
  message,
  defaultDecisionTitle,
  onChangeTitle,
  onChangeMessage,
  suggestions,
  dataSources,
  testId
}) => {
  const { t } = useTranslation(translations)

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('decision-user-task-title-label')}</Label>
        <FlowContextExpressionEditor
          value={title}
          onChange={onChangeTitle}
          suggestions={suggestions}
          dataSources={dataSources}
          placeholder={defaultDecisionTitle}
          allowFreeText
          singleLine
          data-testid={`${testId}-user-task-title`}
        />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('decision-user-task-message-label')}</Label>
        <FlowContextExpressionEditor
          value={message}
          onChange={onChangeMessage}
          suggestions={suggestions}
          dataSources={dataSources}
          placeholder={t('decision-user-task-message-placeholder')}
          allowFreeText
          multiline
          data-testid={`${testId}-user-task-message`}
        />
      </div>
    </>
  )
}
