import type { OperatorId, ValueType } from './decisionConfigUtils'

export const OPERATORS_BY_TYPE: Record<ValueType, Array<{ id: OperatorId; label: string }>> = {
  number: [
    { id: 'eq', label: '==' },
    { id: 'neq', label: '!=' },
    { id: 'gt', label: '>' },
    { id: 'gte', label: '>=' },
    { id: 'lt', label: '<' },
    { id: 'lte', label: '<=' }
  ],
  date: [
    { id: 'eq', label: 'On (==)' },
    { id: 'neq', label: 'Not on (!=)' },
    { id: 'lt', label: 'Before (<)' },
    { id: 'lte', label: 'On or before (<=)' },
    { id: 'gt', label: 'After (>)' },
    { id: 'gte', label: 'On or after (>=)' }
  ],
  datetime: [
    { id: 'eq', label: 'On (==)' },
    { id: 'neq', label: 'Not on (!=)' },
    { id: 'lt', label: 'Before (<)' },
    { id: 'lte', label: 'On or before (<=)' },
    { id: 'gt', label: 'After (>)' },
    { id: 'gte', label: 'On or after (>=)' }
  ],
  boolean: [
    { id: 'eq', label: 'Is (==)' },
    { id: 'neq', label: 'Is not (!=)' }
  ],
  string: [
    { id: 'eq', label: 'Equals (==)' },
    { id: 'neq', label: 'Not equals (!=)' },
    { id: 'contains', label: 'Contains' },
    { id: 'not_contains', label: 'Does not contain' },
    { id: 'starts_with', label: 'Starts with' },
    { id: 'ends_with', label: 'Ends with' }
  ],
  unknown: [
    { id: 'eq', label: '==' },
    { id: 'neq', label: '!=' }
  ]
}
