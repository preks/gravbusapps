import { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { ExpressionSuggestionItem, ExpressionValueType } from '@/common/components/flow/expression-editor'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { collectJsonSchemaPaths } from '../decisionConfigUtils'
import translations from '../../../../_i18n'

export function useTaskExpertMappingSuggestions(prompt: Pick<PromptODM, 'response_schema'> | undefined): {
  schemaPaths: string[]
  suggestions: ExpressionSuggestionItem[]
} {
  const { t } = useTranslation(translations)
  const schemaPaths = useMemo(() => {
    return collectJsonSchemaPaths(prompt?.response_schema ?? null)
  }, [prompt])

  const suggestions = useMemo((): ExpressionSuggestionItem[] => {
    const schema = (prompt?.response_schema ?? null) as any

    const getObjectProperty = (node: any, key: string): any => {
      if (node?.type === 'object' && node?.properties && typeof node.properties === 'object') {
        return node.properties[key]
      }
      return undefined
    }

    const getSchemaNodeAtPath = (root: any, path: string): any => {
      if (!root || typeof root !== 'object') return null
      const raw = String(path || '').trim()
      if (!raw) return root

      const parts = raw.split('.').filter(Boolean)
      let cur: any = root
      for (const part0 of parts) {
        if (!cur || typeof cur !== 'object') return null
        const part = String(part0)

        if (part.endsWith('[]')) {
          const key = part.slice(0, -2)
          if (key) cur = getObjectProperty(cur, key)
          cur = cur?.items
          continue
        }

        cur = getObjectProperty(cur, part)
      }
      return cur
    }

    const inferValueType = (node: any): ExpressionValueType => {
      const type = String(node?.type || '').trim()
      const format = String(node?.format || '').trim()
      if (type === 'boolean') return 'boolean'
      if (type === 'number' || type === 'integer') return 'number'
      if (type === 'string') {
        if (format === 'date') return 'date'
        if (format === 'date-time' || format === 'datetime') return 'datetime'
        return 'string'
      }
      return 'unknown'
    }

    const schemaItems: ExpressionSuggestionItem[] = (schemaPaths || []).map((p, i) => {
      const path = String(p || '').trim()
      const node = path ? getSchemaNodeAtPath(schema, path) : null
      const type = inferValueType(node)
      return {
        id: `taskexpert-schema-${i}-${path}`,
        label: path,
        expression: `$steps.self.resultData.${path}`,
        source: 'steps',
        dataType: type,
        description: t('decision-ai-taskexpert-mapping-suggestion-description')
      }
    })

    const merged = [...schemaItems]
    const seen = new Set<string>()
    return merged.filter(item => {
      const key = String(item.expression || '').trim()
      if (!key) return false
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [prompt, schemaPaths, t])

  return { schemaPaths, suggestions }
}
