/**
 * PromoteToDatabaseModal Component
 *
 * A modal dialog for promoting a file-based spreadsheet app
 * to a real database entity with GraphQL integration.
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Badge,
  Progress,
  Spinner
} from '@newwork/nw-design-system'
import {
  Database,
  FileSpreadsheet,
  ArrowRight,
  Check,
  AlertTriangle,
  Sparkles,
  Server,
  Table2,
  Shield
} from 'lucide-react'
import type { SpreadsheetApp } from '../types'

export interface PromoteToDatabaseModalProps {
  isOpen: boolean
  onClose: () => void
  app: SpreadsheetApp
  onPromote: (app: SpreadsheetApp, entityName: string) => Promise<void>
  'data-testid'?: string
}

type PromotionStep = 'confirm' | 'naming' | 'promoting' | 'success' | 'error'

/**
 * PromoteToDatabaseModal Component
 */
export const PromoteToDatabaseModal: React.FC<PromoteToDatabaseModalProps> = ({
  isOpen,
  onClose,
  app,
  onPromote,
  'data-testid': testId = 'promote-to-database-modal'
}) => {
  const [step, setStep] = useState<PromotionStep>('confirm')
  const [entityName, setEntityName] = useState(
    app.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')
  )
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const totalRows = app.sheets.reduce((sum, sheet) => sum + sheet.data.length, 0)

  /**
   * Handle promotion
   */
  const handlePromote = async () => {
    setStep('promoting')
    setProgress(0)
    setError(null)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      await onPromote(app, entityName)

      clearInterval(progressInterval)
      setProgress(100)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote to database')
      setStep('error')
    }
  }

  /**
   * Handle close and reset
   */
  const handleClose = () => {
    setStep('confirm')
    setEntityName(app.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_'))
    setProgress(0)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        {/* Confirm Step */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <div className="gba:flex gba:items-center gba:gap-4 gba:mb-2">
                <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                  <Database className="gba:w-6 gba:h-6 gba:text-primary" />
                </div>
                <div>
                  <DialogTitle>Promote to Database</DialogTitle>
                  <DialogDescription>
                    Convert your file-based app to a real database entity
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="gba:space-y-4 gba:py-4">
              {/* Visual representation */}
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:py-4">
                <div className="gba:text-center">
                  <div className="gba:w-16 gba:h-16 gba:rounded-xl gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-2 gba:mx-auto">
                    <FileSpreadsheet className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
                  </div>
                  <p className="gba:text-sm gba:text-muted-foreground">File-based</p>
                </div>
                <ArrowRight className="gba:w-6 gba:h-6 gba:text-primary" />
                <div className="gba:text-center">
                  <div className="gba:w-16 gba:h-16 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-2 gba:mx-auto">
                    <Database className="gba:w-8 gba:h-8 gba:text-primary" />
                  </div>
                  <p className="gba:text-sm gba:text-primary gba:font-medium">Database</p>
                </div>
              </div>

              {/* Benefits */}
              <div className="gba:bg-muted/30 gba:rounded-lg gba:p-4 gba:space-y-3">
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  Benefits of promoting:
                </p>
                <div className="gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                    <Server className="gba:w-4 gba:h-4 gba:text-success" />
                    <span>Full GraphQL API access for integrations</span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                    <Shield className="gba:w-4 gba:h-4 gba:text-success" />
                    <span>Enterprise-grade security and backup</span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                    <Sparkles className="gba:w-4 gba:h-4 gba:text-success" />
                    <span>AI-powered insights and automation</span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                    <Table2 className="gba:w-4 gba:h-4 gba:text-success" />
                    <span>Advanced filtering and reporting</span>
                  </div>
                </div>
              </div>

              {/* Data summary */}
              <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/20 gba:rounded-lg">
                <span className="gba:text-sm gba:text-muted-foreground">Data to migrate:</span>
                <div className="gba:flex gba:gap-2">
                  <Badge variant="secondary">
                    {app.sheets.length} sheets
                  </Badge>
                  <Badge variant="secondary">
                    {totalRows.toLocaleString()} rows
                  </Badge>
                </div>
              </div>

              {/* Warning */}
              <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:bg-warning-secondary/30 gba:rounded-lg">
                <AlertTriangle className="gba:w-4 gba:h-4 gba:text-warning gba:mt-0.5" />
                <p className="gba:text-sm gba:text-warning">
                  This action cannot be undone. Your data will be migrated to the database.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep('naming')}>
                Continue
                <ArrowRight className="gba:w-4 gba:h-4 gba:ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Naming Step */}
        {step === 'naming' && (
          <>
            <DialogHeader>
              <DialogTitle>Name Your Entity</DialogTitle>
              <DialogDescription>
                Choose a name for your database entity. This will be used in the GraphQL API.
              </DialogDescription>
            </DialogHeader>

            <div className="gba:space-y-4 gba:py-4">
              <div className="gba:space-y-2">
                <Label htmlFor="entityName">Entity Name</Label>
                <Input
                  id="entityName"
                  value={entityName}
                  onChange={e => setEntityName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="my_entity_name"
                  className="gba:font-mono"
                />
                <p className="gba:text-xs gba:text-muted-foreground">
                  Only letters, numbers, and underscores allowed
                </p>
              </div>

              <div className="gba:bg-muted/30 gba:rounded-lg gba:p-4">
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">
                  GraphQL endpoint preview:
                </p>
                <code className="gba:text-sm gba:text-primary gba:font-mono">
                  query {'{'}
                  {entityName}(where: {'{'}...{'}'}) {'{'}
                  ... {'}'}
                  {'}'}
                </code>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('confirm')}>
                Back
              </Button>
              <Button onClick={handlePromote} disabled={!entityName.trim()}>
                <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                Promote Now
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Promoting Step */}
        {step === 'promoting' && (
          <>
            <DialogHeader>
              <DialogTitle>Migrating Data</DialogTitle>
              <DialogDescription>
                Please wait while we migrate your data to the database...
              </DialogDescription>
            </DialogHeader>

            <div className="gba:flex gba:flex-col gba:items-center gba:py-8 gba:space-y-6">
              <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                <Spinner size="lg" className="gba:text-primary" />
              </div>

              <div className="gba:w-full gba:space-y-2">
                <Progress value={progress} className="gba:h-2" />
                <p className="gba:text-sm gba:text-center gba:text-muted-foreground">
                  {progress < 30 && 'Creating database schema...'}
                  {progress >= 30 && progress < 60 && 'Migrating data...'}
                  {progress >= 60 && progress < 90 && 'Setting up GraphQL endpoints...'}
                  {progress >= 90 && 'Finalizing...'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <>
            <DialogHeader>
              <div className="gba:flex gba:items-center gba:gap-4 gba:mb-2">
                <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center">
                  <Check className="gba:w-6 gba:h-6 gba:text-success" />
                </div>
                <div>
                  <DialogTitle>Promotion Complete!</DialogTitle>
                  <DialogDescription>
                    Your app is now backed by a real database
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="gba:space-y-4 gba:py-4">
              <div className="gba:bg-success/5 gba:border gba:border-success/20 gba:rounded-lg gba:p-4">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                  <Database className="gba:w-5 gba:h-5 gba:text-success" />
                  <span className="gba:font-medium gba:text-foreground">
                    {entityName}
                  </span>
                </div>
                <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-sm">
                  <div>
                    <p className="gba:text-muted-foreground">Tables created</p>
                    <p className="gba:font-medium gba:text-foreground">
                      {app.sheets.length}
                    </p>
                  </div>
                  <div>
                    <p className="gba:text-muted-foreground">Rows migrated</p>
                    <p className="gba:font-medium gba:text-foreground">
                      {totalRows.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <p className="gba:text-sm gba:text-muted-foreground">
                Your data is now available through the GraphQL API. 
                You can use it in workflows, integrations, and reports.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <>
            <DialogHeader>
              <div className="gba:flex gba:items-center gba:gap-4 gba:mb-2">
                <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-destructive/10 gba:flex gba:items-center gba:justify-center">
                  <AlertTriangle className="gba:w-6 gba:h-6 gba:text-destructive" />
                </div>
                <div>
                  <DialogTitle>Promotion Failed</DialogTitle>
                  <DialogDescription>
                    An error occurred during the promotion process
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="gba:py-4">
              <div className="gba:bg-destructive/5 gba:border gba:border-destructive/20 gba:rounded-lg gba:p-4">
                <p className="gba:text-sm gba:text-destructive">{error}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep('naming')}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
