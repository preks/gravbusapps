import React, { useEffect, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@newwork/nw-design-system'
import { DatabaseIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useDatasource, type DataSourceResult } from '@/common/data/flow/hooks/useDatasource'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface EntityPreviewProps {
  entityType: string
  entityId?: string
  testId?: string
}

export const EntityPreview: React.FC<EntityPreviewProps> = ({ entityType, entityId, testId = 'entity-preview' }) => {
  const { isLoading, error, list } = useDatasource()
  const [result, setResult] = useState<DataSourceResult | null>(null)

  useEffect(() => {
    if (!entityType || !entityId) {
      setResult(null)
      return
    }

    let isActive = true

    const loadEntityPreview = async () => {
      const nextResult = await list(entityType, {
        filters: [
          {
            field: 'id',
            operator: 'eq',
            value: entityId
          }
        ],
        limit: 1,
        offset: 0
      })

      if (isActive) {
        setResult(nextResult)
      }
    }

    void loadEntityPreview()

    return () => {
      isActive = false
    }
  }, [entityId, entityType, list])

  if (!entityType || !entityId) {
    return (
      <div data-testid={testId}>
        <EmptyState
          title={getTranslationFromI18nKeyAndLabel('flow.creator.selectEntityToPreview', 'Select an entity to preview')}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div data-testid={testId}>
        <Card>
          <CardContent className="gba:space-y-3 gba:p-4">
            <Skeleton className="gba:h-5 gba:w-40" />
            <Skeleton className="gba:h-4 gba:w-full" />
            <Skeleton className="gba:h-4 gba:w-full" />
            <Skeleton className="gba:h-4 gba:w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid={testId}>
        <Alert variant="destructive">
          <WarningCircleIcon className="gba:h-4 gba:w-4" weight="fill" />
          <AlertTitle>{getTranslationFromI18nKeyAndLabel('flow.creator.previewError', 'Preview Error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!result || result.entities.length === 0) {
    return (
      <div data-testid={testId}>
        <EmptyState title={getTranslationFromI18nKeyAndLabel('flow.creator.entityNotFound', 'Entity not found')} />
      </div>
    )
  }

  const entity = result.entities[0]
  const fields = Object.entries(entity).filter(([key]) => !['id', '_metadata', '_links'].includes(key))

  return (
    <div data-testid={testId}>
      <Card>
        <CardContent className="gba:space-y-4 gba:p-4">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <DatabaseIcon className="gba:h-4 gba:w-4" />
            <span className="gba:font-medium">{entityType}</span>
            <Badge variant="info">{entityId}</Badge>
          </div>

          <div className="gba:rounded-lg gba:border">
            <Table>
              <TableBody>
                {fields.map(([fieldKey, fieldValue]) => (
                  <TableRow key={fieldKey}>
                    <TableCell className="gba:w-[35%] gba:align-top gba:font-medium">
                      {formatFieldLabel(fieldKey)}
                    </TableCell>
                    <TableCell className="gba:align-top">{formatFieldValue(fieldValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatFieldValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="gba:text-muted-foreground">null</span>
  }

  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'success' : 'destructive'}>{String(value)}</Badge>
  }

  if (typeof value === 'object') {
    return (
      <pre className="gba:max-h-32 gba:overflow-auto gba:rounded gba:bg-muted gba:p-2 gba:text-xs">
        {safeJsonStringify(value)}
      </pre>
    )
  }

  return String(value)
}

function formatFieldLabel(fieldKey: string): string {
  return fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '[Unserializable value]'
  }
}
