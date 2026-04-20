import React from 'react'
import { Button, Badge, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeft, ArrowRight, FileText, Globe } from 'lucide-react'
import translations from '../../_i18n'
import type { UnstructuredPreviewItem } from '../../types/externalUnstructuredConnector'

export interface UnstructuredPreviewProps {
  connectorName: string
  items: UnstructuredPreviewItem[]
  estimatedTotal?: number
  isLoading: boolean
  error?: string | null
  onBack: () => void
  onNext: () => void
  'data-testid'?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const UnstructuredPreview: React.FC<UnstructuredPreviewProps> = ({
  connectorName,
  items,
  estimatedTotal,
  isLoading,
  error,
  onBack,
  onNext,
  'data-testid': testId = 'unstructured-preview'
}) => {
  const { t } = useTranslation(translations)

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={testId}>
        <Spinner size="md" />
        <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">{t('external-import-preview-loading')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:space-y-4" data-testid={testId}>
        <div className="gba:rounded-md gba:border gba:border-destructive/40 gba:bg-destructive-secondary gba:p-4">
          <p className="gba:text-sm gba:font-medium gba:text-destructive">{t('external-import-preview-failed')}</p>
          <p className="gba:mt-1 gba:text-sm gba:text-destructive">{error}</p>
        </div>

        <div className="gba:flex gba:justify-start gba:pt-2">
          <Button variant="outline" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
            <ArrowLeft className="gba:w-3 gba:h-3 gba:mr-1" /> {t('external-import-back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div>
        <p className="gba:text-sm gba:text-muted-foreground">
          {t('external-import-preview-intro', { connectorName })}
          {estimatedTotal != null &&
            ` ${t('external-import-preview-total', { count: estimatedTotal.toLocaleString() })}`}
          .
        </p>
      </div>

      {items.length === 0 ? (
        <div className="gba:py-8 gba:text-center gba:space-y-2">
          <FileText className="gba:w-8 gba:h-8 gba:mx-auto gba:text-muted-foreground" />
          <p className="gba:text-sm gba:text-muted-foreground">{t('external-import-preview-empty')}</p>
        </div>
      ) : (
        <div className="gba:space-y-2 gba:max-h-[400px] gba:overflow-y-auto gba:pr-1">
          {items.map(item => (
            <div
              key={item.externalId}
              className="gba:border gba:rounded-md gba:p-3 gba:space-y-1"
              data-testid={`${testId}-item-${item.externalId}`}
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <FileText className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:shrink-0" />
                <span className="gba:text-sm gba:font-medium gba:truncate">{item.title}</span>
                <Badge variant="secondary" className="gba:text-xs gba:shrink-0">
                  {item.kind}
                </Badge>
              </div>
              <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                {item.mimeType && <span>{item.mimeType}</span>}
                {item.sizeBytes != null && <span>{formatBytes(item.sizeBytes)}</span>}
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:flex gba:items-center gba:gap-1 gba:text-primary gba:hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <Globe className="gba:w-3 gba:h-3" /> {t('external-import-open')}
                  </a>
                )}
              </div>
              {item.snippet && <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{item.snippet}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="gba:flex gba:justify-between gba:pt-2">
        <Button variant="outline" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ArrowLeft className="gba:w-3 gba:h-3 gba:mr-1" /> {t('external-import-back')}
        </Button>
        <Button size="sm" onClick={onNext} disabled={items.length === 0} data-testid={`${testId}-next`}>
          {t('external-import-configure-import')} <ArrowRight className="gba:w-3 gba:h-3 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
