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
import { Rocket, Database, Check, AlertTriangle, ArrowRight, Table2 } from 'lucide-react'
import { CustomDataDefinition } from '../types'

interface PromoteDialogProps {
  open: boolean
  onClose: () => void
  definition: CustomDataDefinition | null
  onPromote: (definitionId: string) => Promise<CustomDataDefinition>
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
      const promoted = await onPromote(definition.id)
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

  const isAlreadyPromoted = definition.publish_state === 'PROMOTED_TRACKED'
  const tableName = definition.deploy_state?.tableName || `cde_${definition.key}`

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Rocket className="gba:h-5 gba:w-5 gba:text-primary" />
            {isAlreadyPromoted ? 'Entity Status' : 'Promote Entity'}
          </DialogTitle>
          <DialogDescription>
            {isAlreadyPromoted
              ? 'This entity has been promoted to a native PostgreSQL table'
              : 'Deploy this entity as a native PostgreSQL table'}
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Definition Info */}
          <div className="gba:bg-muted/50 gba:rounded-lg gba:p-4 gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:font-medium">{definition.display_name || definition.key}</span>
              <Badge variant={isAlreadyPromoted ? 'success' : 'warning'}>
                {isAlreadyPromoted ? 'Promoted' : 'Draft'}
              </Badge>
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
              <div className="gba:flex gba:justify-between">
                <span>Key:</span>
                <span className="gba:font-mono">{definition.key}</span>
              </div>
              <div className="gba:flex gba:justify-between">
                <span>Columns:</span>
                <span>{definition.columns_json?.length || 0} fields</span>
              </div>
            </div>
          </div>

          {/* Already Promoted Status */}
          {isAlreadyPromoted && definition.deploy_state && (
            <Alert className="gba:bg-success-secondary gba:border-success">
              <Check className="gba:h-4 gba:w-4 gba:text-success" />
              <AlertDescription>
                <div className="gba:space-y-2">
                  <p className="gba:text-success-secondary-foreground">Entity is deployed and active.</p>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                    <Table2 className="gba:h-3 gba:w-3" />
                    <span className="gba:font-mono">{definition.deploy_state.tableName}</span>
                  </div>
                  {definition.deploy_state.deployedAt && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Deployed: {new Date(definition.deploy_state.deployedAt).toLocaleString()}
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
                <p className="gba:font-medium">Entity promoted successfully!</p>
                <p className="gba:text-xs gba:mt-1">
                  Table created: <span className="gba:font-mono">{success.deploy_state?.tableName}</span>
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

          {/* Promotion Info */}
          {!isAlreadyPromoted && !success && (
            <div className="gba:space-y-3">
              {/* Visual transformation */}
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

              {/* What happens */}
              <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
                <p className="gba:font-medium">What happens when you promote:</p>
                <ul className="gba:list-disc gba:list-inside gba:space-y-1 gba:ml-2">
                  <li>A native PostgreSQL table will be created</li>
                  <li>
                    Table name: <span className="gba:font-mono">{tableName}</span>
                  </li>
                  <li>The table will be tracked in Hasura for GraphQL access</li>
                  <li>Column types will be mapped to SQL types</li>
                </ul>
              </div>

              {/* Warning */}
              <Alert>
                <AlertTriangle className="gba:h-4 gba:w-4 gba:text-warning" />
                <AlertDescription className="gba:text-xs">
                  This action cannot be undone. The entity key will be permanent.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!isAlreadyPromoted && !success && (
            <Button onClick={handlePromote} disabled={isPromoting} data-testid={`${testId}-confirm`}>
              {isPromoting ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  Promoting...
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
