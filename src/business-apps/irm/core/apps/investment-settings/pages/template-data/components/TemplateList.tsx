import React from 'react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  Spinner,
  EmptyState
} from '@newwork/nw-design-system'
import { PencilSimpleIcon, TrashIcon, EyeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentTemplate } from '../types'

interface TemplateListProps extends BusinessAppContextProps {
  templates: DocumentTemplate[]
  isLoading: boolean
  error: string | null
  onEdit: (template: DocumentTemplate) => void
  onDelete: (id: string) => void
  onPreview: (template: DocumentTemplate) => void
  onRetry: () => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'template-list'

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  isLoading,
  error,
  onEdit,
  onDelete,
  onPreview,
  onRetry,
  prefixDataTestId = DATA_TEST_ID
}) => {
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-12"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={onRetry} data-testid={`${prefixDataTestId}-retry-button`}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="gba:py-12" data-testid={`${prefixDataTestId}-empty`}>
        <EmptyState
          title="No document templates yet"
          description="Create your first document template to get started"
        />
      </div>
    )
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4" data-testid={prefixDataTestId}>
      {templates.map(template => (
        <Card key={template.id} data-testid={`${prefixDataTestId}-item-${template.code}`}>
          <CardHeader>
            <div className="gba:flex gba:items-start gba:justify-between">
              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <CardTitle>{template.value}</CardTitle>
                  <Badge variant={template.isActive ? 'success' : 'secondary'}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription className="gba:mt-1">
                  <span className="gba:font-mono gba:text-xs">{template.code}</span>
                  {template.description && (
                    <>
                      {' • '}
                      {template.description}
                    </>
                  )}
                </CardDescription>
              </div>
              <div className="gba:flex gba:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPreview(template)}
                  data-testid={`${prefixDataTestId}-preview-button-${template.code}`}
                >
                  <EyeIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(template)}
                  data-testid={`${prefixDataTestId}-edit-button-${template.code}`}
                >
                  <PencilSimpleIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(template.id)}
                  data-testid={`${prefixDataTestId}-delete-button-${template.code}`}
                >
                  <TrashIcon />
                </Button>
              </div>
            </div>
          </CardHeader>
          {template.htmlContent && (
            <CardContent>
              <div className="gba:text-xs gba:text-muted-foreground gba:font-mono gba:truncate">
                {template.htmlContent.substring(0, 150)}
                {template.htmlContent.length > 150 && '...'}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

export default TemplateList
