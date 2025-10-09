import React from 'react'
import { Card, CardContent, Spinner, Button } from '@newwork/nw-design-system'
import { RefreshCw, Building2 } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface TableStateWrapperProps {
  isLoading: boolean
  error: string | Error | null
  onRetry: () => void | Promise<void>
  children: React.ReactNode
  dataTestId: string
  icon?: React.ReactNode
  loadingHeight?: string
}

export const TableStateWrapper: React.FC<TableStateWrapperProps> = ({
  isLoading,
  error,
  onRetry,
  children,
  dataTestId,
  icon = <Building2 />,
  loadingHeight = 'var(--nw-spacing-64)'
}) => {
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center"
        style={{ height: loadingHeight }}
        data-testid={`${dataTestId}-loading`}
      >
        <Spinner size="lg" data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent
          style={{
            padding: 'var(--nw-spacing-lg)',
            textAlign: 'center',
            color: 'var(--nw-destructive)'
          }}
        >
          <div>
            {React.isValidElement(icon)
              ? React.cloneElement(icon, {
                  style: {
                    height: 'var(--nw-spacing-12)',
                    width: 'var(--nw-spacing-12)',
                    margin: '0 auto var(--nw-spacing-md) auto'
                  }
                })
              : null}
            <p style={{ fontWeight: '500' }}>{typeof error === 'string' ? error : error?.message}</p>
            <Button
              onClick={onRetry}
              style={{ marginTop: 'var(--nw-spacing-4)' }}
              data-testid={`${dataTestId}-retry-button`}
            >
              <RefreshCw
                style={{
                  width: 'var(--nw-spacing-4)',
                  height: 'var(--nw-spacing-4)',
                  marginRight: 'var(--nw-spacing-2)'
                }}
              />
              {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return <Card data-testid={dataTestId}>{children}</Card>
}
