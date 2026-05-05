import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner
} from '@newwork/nw-design-system'
import { AlertTriangle, Check, GitBranch, Rocket } from 'lucide-react'
import type { NamespacePromotionResult } from '../types'

interface PromoteNamespaceDialogProps {
  open: boolean
  onClose: () => void
  namespace: string
  entityCount: number
  onPromote: (namespace: string) => Promise<NamespacePromotionResult>
  'data-testid'?: string
}

export const PromoteNamespaceDialog: React.FC<PromoteNamespaceDialogProps> = ({
  open,
  onClose,
  namespace,
  entityCount,
  onPromote,
  'data-testid': testId = 'promote-namespace-dialog'
}) => {
  const [isPromoting, setIsPromoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<NamespacePromotionResult | null>(null)

  const handlePromote = useCallback(async () => {
    setIsPromoting(true)
    setError(null)

    try {
      const promotionResult = await onPromote(namespace)
      setResult(promotionResult)
    } catch (promotionError) {
      setError(promotionError instanceof Error ? promotionError.message : 'Failed to promote namespace')
    } finally {
      setIsPromoting(false)
    }
  }, [namespace, onPromote])

  const handleClose = useCallback(() => {
    setError(null)
    setResult(null)
    onClose()
  }, [onClose])

  const failedEntities = useMemo(() => (result?.entities || []).filter(entityStatus => entityStatus.error), [result])
  const failedRelationships = useMemo(
    () => (result?.relationships || []).filter(relationshipStatus => relationshipStatus.error),
    [result]
  )

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Rocket className="gba:h-5 gba:w-5 gba:text-primary" />
            Promote Namespace
          </DialogTitle>
          <DialogDescription>
            Promote the full namespace in dependency order and create the required relationships afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:bg-muted/50 gba:rounded-lg gba:p-4 gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:font-medium">{namespace}</span>
              <Badge variant="secondary">{entityCount} entities</Badge>
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
              <p>The backend promotes the full namespace scope.</p>
              <p>Already successful entities stay promoted if later entities fail.</p>
            </div>
          </div>

          {result && (
            <Alert className={result.success ? 'gba:bg-success-secondary gba:border-success' : undefined}>
              {result.success ? (
                <Check className="gba:h-4 gba:w-4 gba:text-success" />
              ) : (
                <AlertTriangle className="gba:h-4 gba:w-4 gba:text-warning" />
              )}
              <AlertDescription>
                <div className="gba:space-y-2">
                  <p className="gba:font-medium">
                    {result.success
                      ? 'Namespace promoted successfully.'
                      : 'Namespace promotion finished with partial success.'}
                  </p>
                  <div className="gba:flex gba:flex-wrap gba:gap-2 gba:text-xs">
                    <Badge variant="secondary">{result.promotedEntityCount} promoted</Badge>
                    <Badge variant="secondary">{result.failedEntityCount} entity failures</Badge>
                    <Badge variant="secondary">{result.skippedEntityCount} entity skipped</Badge>
                    <Badge variant="secondary">{result.createdRelationshipCount} relationships created</Badge>
                    <Badge variant="secondary">{result.failedRelationshipCount} relationship failures</Badge>
                    <Badge variant="secondary">{result.skippedRelationshipCount} relationship skipped</Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="gba:h-4 gba:w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!result && (
            <Alert>
              <GitBranch className="gba:h-4 gba:w-4" />
              <AlertDescription className="gba:text-xs">
                Tables are deployed in dependency order first. Foreign-key relationships are created afterwards.
              </AlertDescription>
            </Alert>
          )}

          {result && failedEntities.length > 0 && (
            <div className="gba:space-y-2">
              <p className="gba:text-sm gba:font-medium">Entity issues</p>
              <div className="gba:max-h-32 gba:overflow-auto gba:space-y-2">
                {failedEntities.map(entityStatus => (
                  <div
                    key={entityStatus.entityKey}
                    className="gba:rounded-md gba:border gba:border-border gba:p-2 gba:text-xs gba:space-y-1"
                  >
                    <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                      <span className="gba:font-medium">{entityStatus.entityKey}</span>
                      <Badge variant={entityStatus.skipped ? 'secondary' : 'destructive'}>
                        {entityStatus.skipped ? 'Skipped' : 'Failed'}
                      </Badge>
                    </div>
                    {entityStatus.error && <p className="gba:text-muted-foreground">{entityStatus.error}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && failedRelationships.length > 0 && (
            <div className="gba:space-y-2">
              <p className="gba:text-sm gba:font-medium">Relationship issues</p>
              <div className="gba:max-h-32 gba:overflow-auto gba:space-y-2">
                {failedRelationships.map(relationshipStatus => (
                  <div
                    key={`${relationshipStatus.sourceEntity}-${relationshipStatus.targetEntity}-${relationshipStatus.foreignKeyColumn}`}
                    className="gba:rounded-md gba:border gba:border-border gba:p-2 gba:text-xs gba:space-y-1"
                  >
                    <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                      <span className="gba:font-medium">
                        {relationshipStatus.sourceEntity} {'->'} {relationshipStatus.targetEntity}
                      </span>
                      <Badge variant={relationshipStatus.skipped ? 'secondary' : 'destructive'}>
                        {relationshipStatus.skipped ? 'Skipped' : 'Failed'}
                      </Badge>
                    </div>
                    <p className="gba:text-muted-foreground">
                      {relationshipStatus.foreignKeyColumn}
                      {relationshipStatus.error ? `: ${relationshipStatus.error}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handlePromote}
              disabled={isPromoting || entityCount === 0}
              data-testid={`${testId}-confirm`}
            >
              {isPromoting ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  Promoting...
                </>
              ) : (
                <>
                  <Rocket className="gba:h-4 gba:w-4 gba:mr-2" />
                  Promote Namespace
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
