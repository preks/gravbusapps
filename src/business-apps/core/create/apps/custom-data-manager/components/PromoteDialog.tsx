import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Button,
  Alert,
  AlertDescription,
  Badge,
  Spinner
} from '@newwork/nw-design-system'
import { Rocket, Database, Check, AlertTriangle, ArrowRight, Table2, RefreshCw } from 'lucide-react'
import { CustomDataDefinition } from '../types'

interface PromoteDialogProps {
  open: boolean
  onClose: () => void
  definition: CustomDataDefinition | null
  onPromote: (definition: CustomDataDefinition) => Promise<CustomDataDefinition>
  'data-testid'?: string
}

/**
 * Promote Dialog for Entity type definitions
 * Promotes a DRAFT entity to a native PostgreSQL table
 */
export const PromoteDialog: React.FC<PromoteDialogProps> = ({
  open,
  onClose,
  definition,
  onPromote,
  'data-testid': testId = 'promote-dialog'
}) => {
  const [isPromoting, setIsPromoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<CustomDataDefinition | null>(null)

  const handlePromote = useCallback(async () => {
    if (!definition) return

    setIsPromoting(true)
    setError(null)

    try {
      const promoted = await onPromote(definition)
      setSuccess(promoted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote entity')
    } finally {
      setIsPromoting(false)
    }
  }, [definition, onPromote])

  const handleClose = useCallback(() => {
    setError(null)
    setSuccess(null)
    onClose()
  }, [onClose])

  if (!definition) return null

  const isAlreadyPromoted = definition.publishState === 'PROMOTED_TRACKED'
  const tableName = definition.deployState?.tableName

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            {isAlreadyPromoted ? (
              <RefreshCw className="gba:h-5 gba:w-5 gba:text-primary" />
            ) : (
              <Rocket className="gba:h-5 gba:w-5 gba:text-primary" />
            )}
            {isAlreadyPromoted ? 'Re-deploy Entity' : 'Promote Entity'}
          </DialogTitle>
          <DialogDescription>
            {isAlreadyPromoted
              ? 'Apply schema changes to the existing custom data entity'
              : 'Publish this custom data entity'}
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Definition Info */}
          <div className="gba:bg-muted/50 gba:rounded-lg gba:p-4 gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:font-medium">{definition.displayName || definition.entityName}</span>
              <Badge variant={isAlreadyPromoted ? 'success' : 'warning'}>
                {isAlreadyPromoted ? 'Promoted' : 'Draft'}
              </Badge>
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
              <div className="gba:flex gba:justify-between">
                <span>Entity:</span>
                <span className="gba:font-mono">{definition.entityName}</span>
              </div>
              <div className="gba:flex gba:justify-between">
                <span>Columns:</span>
                <span>{definition.columns?.length || 0} fields</span>
              </div>
            </div>
          </div>

          {/* Already Promoted Status */}
          {isAlreadyPromoted && definition.deployState && (
            <Alert className="gba:bg-success-secondary gba:border-success">
              <Check className="gba:h-4 gba:w-4 gba:text-success" />
              <AlertDescription>
                <div className="gba:space-y-2">
                  <p className="gba:text-success-secondary-foreground">Entity is deployed and active.</p>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                    <Table2 className="gba:h-3 gba:w-3" />
                    <span className="gba:font-mono">{tableName}</span>
                  </div>
                  {definition.deployState.deployedAt && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Deployed: {new Date(definition.deployState.deployedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success after promotion */}
          {success && (
            <Alert className="gba:bg-success-secondary gba:border-success">
              <Check className="gba:h-4 gba:w-4 gba:text-success" />
              <AlertDescription className="gba:text-success-secondary-foreground">
                <p className="gba:font-medium">
                  {isAlreadyPromoted ? 'Schema re-deployed successfully!' : 'Entity promoted successfully!'}
                </p>
                <p className="gba:text-xs gba:mt-1">
                  Table: <span className="gba:font-mono">{success.deployState?.tableName}</span>
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="gba:h-4 gba:w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Promotion / Re-deploy Info */}
          {!success && (
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:py-4">
                <div className="gba:text-center">
                  <Database className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-1 gba:text-muted-foreground" />
                  <span className="gba:text-xs gba:text-muted-foreground">Entity Schema</span>
                </div>
                <ArrowRight className="gba:h-5 gba:w-5 gba:text-primary" />
                <div className="gba:text-center">
                  <Table2 className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-1 gba:text-primary" />
                  <span className="gba:text-xs gba:text-primary">PostgreSQL Table</span>
                </div>
              </div>

              <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
                <p className="gba:font-medium">
                  {isAlreadyPromoted ? 'What happens when you re-deploy:' : 'What happens when you promote:'}
                </p>
                <ul className="gba:list-disc gba:list-inside gba:space-y-1 gba:ml-2">
                  {isAlreadyPromoted ? (
                    <>
                      <li>New columns will be added to the existing table</li>
                      <li>Existing columns and data remain untouched</li>
                      <li>Hasura tracking will be refreshed</li>
                    </>
                  ) : (
                    <>
                      <li>A native PostgreSQL table will be created</li>
                      <li>Column types will be mapped to SQL types</li>
                    </>
                  )}
                  <li>
                    Table name: <span className="gba:font-mono">{tableName}</span>
                  </li>
                  <li>The table will be tracked in Hasura for GraphQL access</li>
                </ul>
              </div>

              <Alert>
                <AlertTriangle className="gba:h-4 gba:w-4 gba:text-warning" />
                <AlertDescription className="gba:text-xs">
                  {isAlreadyPromoted
                    ? 'Existing data will not be affected. Only additive changes (new columns) are applied.'
                    : 'This action cannot be undone. The entity key will be permanent.'}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button onClick={handlePromote} disabled={isPromoting} data-testid={`${testId}-confirm`}>
              {isPromoting ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  {isAlreadyPromoted ? 'Re-deploying...' : 'Promoting...'}
                </>
              ) : isAlreadyPromoted ? (
                <>
                  <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
                  Re-deploy
                </>
              ) : (
                <>
                  <Rocket className="gba:h-4 gba:w-4 gba:mr-2" />
                  Promote to PostgreSQL
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
