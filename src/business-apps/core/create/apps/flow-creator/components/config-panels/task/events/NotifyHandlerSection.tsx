import React, { useMemo } from 'react'
import { Checkbox, Label } from '@newwork/nw-design-system'
import { EventHandlerType, type NotifyHandlerConfig } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { NOTIFY_CHANNEL_OPTIONS } from './eventConstants'
import { ExpressionEditor } from '@/common/components/flow/expression-editor'
import { useStudioExpressionSuggestions } from '../../../../hooks/useStudioExpressionSuggestions'

interface NotifyHandlerSectionProps {
  handler: NotifyHandlerConfig
  onChange: (next: NotifyHandlerConfig) => void
  testId: string
  subscriptionId: string
}

export const NotifyHandlerSection: React.FC<NotifyHandlerSectionProps> = ({
  handler,
  onChange,
  testId,
  subscriptionId
}) => {
  const selected = useMemo(() => {
    const channels = handler.channels && handler.channels.length > 0 ? handler.channels : ['EMAIL', 'PUSH', 'WEB']
    return new Set(channels)
  }, [handler.channels])

  const suggestions = useStudioExpressionSuggestions()

  return (
    <div className="gba:flex gba:flex-col gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Notification</Label>

      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Channels</Label>
        <div className="gba:flex gba:flex-wrap gba:gap-3">
          {NOTIFY_CHANNEL_OPTIONS.map(opt => {
            const checked = selected.has(opt.value)
            return (
              <div key={opt.value} className="gba:flex gba:items-center gba:gap-2">
                <Checkbox
                  id={`${subscriptionId}-notify-${opt.value}`}
                  checked={checked}
                  onCheckedChange={isChecked => {
                    const next = new Set(selected)
                    if (isChecked) next.add(opt.value)
                    else next.delete(opt.value)
                    onChange({
                      ...handler,
                      type: EventHandlerType.NOTIFY,
                      channels: Array.from(next)
                    })
                  }}
                  data-testid={`${testId}-events-notify-${opt.value}-${subscriptionId}`}
                />
                <Label htmlFor={`${subscriptionId}-notify-${opt.value}`} className="gba:text-xs gba:text-foreground">
                  {opt.label}
                </Label>
              </div>
            )
          })}
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Recipients</Label>
          <ExpressionEditor
            value={handler.recipientsExpression ?? ''}
            onChange={value => onChange({ ...handler, type: EventHandlerType.NOTIFY, recipientsExpression: value })}
            suggestions={suggestions}
            placeholder="Type {{ to insert recipients from workflow data…"
            allowFreeText
            singleLine
            data-testid={`${testId}-events-notify-recipients-${subscriptionId}`}
          />
        </div>
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Subject</Label>
          <ExpressionEditor
            value={handler.subjectExpression ?? ''}
            onChange={value => onChange({ ...handler, type: EventHandlerType.NOTIFY, subjectExpression: value })}
            suggestions={suggestions}
            placeholder="Task updated — type {{ to insert fields…"
            allowFreeText
            singleLine
            data-testid={`${testId}-events-notify-subject-${subscriptionId}`}
          />
        </div>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Body</Label>
        <ExpressionEditor
          value={handler.bodyExpression ?? ''}
          onChange={value => onChange({ ...handler, type: EventHandlerType.NOTIFY, bodyExpression: value })}
          suggestions={suggestions}
          placeholder="Message template — type {{ to insert fields…"
          allowFreeText
          multiline
          data-testid={`${testId}-events-notify-body-${subscriptionId}`}
        />
      </div>
    </div>
  )
}
