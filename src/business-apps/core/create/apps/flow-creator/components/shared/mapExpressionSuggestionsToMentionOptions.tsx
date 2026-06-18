import type { MentionOption, MentionTriggerConfig } from '@newwork/nw-design-system'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FLOW_CONTEXT_SOURCE_ICON, FLOW_CONTEXT_SOURCE_LABEL } from './flowContextSourceMeta'

export const FLOW_EXPRESSION_MENTION_CONFIG = {
  trigger: ['{{', '@'],
  markup: '{{__id__}}',
  appendSpaceOnAdd: true
} satisfies MentionTriggerConfig

export function mapExpressionSuggestionToMentionOption(item: ExpressionSuggestionItem): MentionOption {
  const Icon = FLOW_CONTEXT_SOURCE_ICON[item.source]

  return {
    id: item.expression,
    label: item.label,
    group: item.source,
    groupLabel: FLOW_CONTEXT_SOURCE_LABEL[item.source],
    searchText: [item.label, item.expression, item.description].filter(Boolean).join(' '),
    optionLabel: (
      <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0">
        <Icon className="gba:h-3.5 gba:w-3.5 gba:mt-0.5 gba:shrink-0 gba:text-muted-foreground" />
        <div className="gba:flex gba:flex-col gba:min-w-0">
          <span className="gba:truncate gba:text-foreground">{item.label}</span>
          {item.description ? (
            <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">{item.description}</span>
          ) : null}
        </div>
      </div>
    )
  }
}

export function mapExpressionSuggestionsToMentionOptions(items: ExpressionSuggestionItem[]): MentionOption[] {
  return items.map(mapExpressionSuggestionToMentionOption)
}
