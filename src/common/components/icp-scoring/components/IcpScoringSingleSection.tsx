import React from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label
} from '@newwork/nw-design-system'
import type { IcpScoreCommandResult } from '../types/icpScoringTypes'

export interface IcpScoringSingleSectionProps {
  testId: string
  hideEntityIdInput: boolean
  singleEntityId: string
  onSingleEntityIdChange: (value: string) => void
  singleValidationError: string | null
  singleError: string | null
  singleLoading: boolean
  singleResult: IcpScoreCommandResult | null
  onSubmit: () => Promise<void>
  onReset: () => void
  labels: {
    title: string
    entityId: string
    entityIdPlaceholder: string
    loading: string
    runSingle: string
    clear: string
    success: string
  }
}

export const IcpScoringSingleSection: React.FC<IcpScoringSingleSectionProps> = ({
  testId,
  hideEntityIdInput,
  singleEntityId,
  onSingleEntityIdChange,
  singleValidationError,
  singleError,
  singleLoading,
  singleResult,
  onSubmit,
  onReset,
  labels
}) => (
  <Card data-testid={`${testId}-single-form`}>
    <CardHeader>
      <CardTitle>{labels.title}</CardTitle>
    </CardHeader>
    <CardContent className="gba:space-y-4">
      {hideEntityIdInput ? null : (
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-entity-id`}>{labels.entityId}</Label>
          <Input
            id={`${testId}-entity-id`}
            value={singleEntityId}
            onChange={event => onSingleEntityIdChange(event.target.value)}
            placeholder={labels.entityIdPlaceholder}
            data-testid={`${testId}-entity-id-input`}
          />
        </div>
      )}

      {singleValidationError || singleError ? (
        <Alert variant="destructive" data-testid={`${testId}-single-error`}>
          <AlertDescription>{singleValidationError || singleError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="gba:flex gba:flex-wrap gba:gap-2">
        <Button
          onClick={() => {
            onSubmit().catch(() => {})
          }}
          disabled={singleLoading}
          data-testid={`${testId}-single-submit`}
        >
          {singleLoading ? labels.loading : labels.runSingle}
        </Button>
        <Button variant="outline" onClick={onReset} data-testid={`${testId}-single-reset`}>
          {labels.clear}
        </Button>
      </div>

      {singleResult ? (
        <Alert data-testid={`${testId}-single-success`}>
          <AlertDescription>{labels.success}</AlertDescription>
        </Alert>
      ) : null}
    </CardContent>
  </Card>
)
