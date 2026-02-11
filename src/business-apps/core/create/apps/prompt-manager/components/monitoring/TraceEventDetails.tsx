import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export const PromptResolvedDetail: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const { t } = useTranslation(translations)
  return (
    <div className="gba:space-y-3">
      {data.system_params && Object.keys(data.system_params).length > 0 && (
        <div>
          <div className="gba:text-xs gba:font-medium gba:mb-1">{t('monitoring-detail-system-params')}</div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-40 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
            {formatJson(data.system_params)}
          </pre>
        </div>
      )}
      {data.user_params && Object.keys(data.user_params).length > 0 && (
        <div>
          <div className="gba:text-xs gba:font-medium gba:mb-1">{t('monitoring-detail-user-params')}</div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-40 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
            {formatJson(data.user_params)}
          </pre>
        </div>
      )}
      {data.system_prompt_preview && (
        <div>
          <div className="gba:text-xs gba:font-medium gba:mb-1">{t('monitoring-detail-system-prompt')}</div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-64 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
            {data.system_prompt_preview}
          </pre>
        </div>
      )}
      {data.user_prompt_preview && (
        <div>
          <div className="gba:text-xs gba:font-medium gba:mb-1">{t('monitoring-detail-user-prompt')}</div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-64 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
            {data.user_prompt_preview}
          </pre>
        </div>
      )}
    </div>
  )
}

export const LlmIterationDetail: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const { t } = useTranslation(translations)
  const usage = data?.usage
  return (
    <div className="gba:space-y-2">
      <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-2">
        {data.model && (
          <div>
            <div className="gba:text-[10px] gba:text-muted-foreground">{t('monitoring-detail-model')}</div>
            <div className="gba:text-xs gba:font-medium">{data.model}</div>
          </div>
        )}
        {data.iteration && (
          <div>
            <div className="gba:text-[10px] gba:text-muted-foreground">{t('monitoring-detail-iteration')}</div>
            <div className="gba:text-xs gba:font-medium">{data.iteration}</div>
          </div>
        )}
        {usage && (
          <>
            <div>
              <div className="gba:text-[10px] gba:text-muted-foreground">{t('monitoring-detail-prompt-tokens')}</div>
              <div className="gba:text-xs gba:font-medium">{usage.prompt_tokens ?? '—'}</div>
            </div>
            <div>
              <div className="gba:text-[10px] gba:text-muted-foreground">
                {t('monitoring-detail-completion-tokens')}
              </div>
              <div className="gba:text-xs gba:font-medium">{usage.completion_tokens ?? '—'}</div>
            </div>
            <div>
              <div className="gba:text-[10px] gba:text-muted-foreground">{t('monitoring-detail-total-tokens')}</div>
              <div className="gba:text-xs gba:font-medium">{usage.total_tokens ?? '—'}</div>
            </div>
          </>
        )}
        {data.tool_calls_count != null && (
          <div>
            <div className="gba:text-[10px] gba:text-muted-foreground">
              {t('monitoring-details-tools', { count: data.tool_calls_count })}
            </div>
            <div className="gba:text-xs gba:font-medium">{data.tool_calls_count}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export const ToolCallDetail: React.FC<{ data: Record<string, any>; eventType: string }> = ({ data, eventType }) => {
  const { t } = useTranslation(translations)
  return (
    <div className="gba:space-y-2">
      <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:gap-2">
        <div>
          <div className="gba:text-[10px] gba:text-muted-foreground">{t('monitoring-detail-tool-name')}</div>
          <div className="gba:text-xs gba:font-medium">{data.tool_name || data.toolName || '—'}</div>
        </div>
        {data.tool_code && (
          <div>
            <div className="gba:text-[10px] gba:text-muted-foreground">{t('monitoring-detail-tool-code')}</div>
            <div className="gba:text-xs gba:font-medium">{data.tool_code}</div>
          </div>
        )}
        {data.duration_ms != null && (
          <div>
            <div className="gba:text-[10px] gba:text-muted-foreground">{t('monitoring-details-duration')}</div>
            <div className="gba:text-xs gba:font-medium">{data.duration_ms} ms</div>
          </div>
        )}
      </div>
      {data.arguments && (
        <div>
          <div className="gba:text-xs gba:font-medium gba:mb-1">{t('monitoring-detail-arguments')}</div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-40 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
            {formatJson(data.arguments)}
          </pre>
        </div>
      )}
      {eventType === 'tool.call.finished' && data.result_preview && (
        <div>
          <div className="gba:text-xs gba:font-medium gba:mb-1">{t('monitoring-detail-result')}</div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-40 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
            {data.result_preview}
          </pre>
        </div>
      )}
      {eventType === 'tool.call.error' && (
        <div>
          <div className="gba:text-xs gba:font-medium gba:text-destructive gba:mb-1">
            {t('monitoring-details-error')}
          </div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:bg-muted gba:rounded-md gba:p-2">
            {data.error_message || data.error_type || '—'}
          </pre>
        </div>
      )}
    </div>
  )
}
