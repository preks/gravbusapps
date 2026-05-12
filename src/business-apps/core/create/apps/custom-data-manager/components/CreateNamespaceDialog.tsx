import React, { useMemo, useState } from 'react'
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
  Textarea,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import type { CreateNamespaceDto } from '../types'

interface CreateNamespaceDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (dto: CreateNamespaceDto) => Promise<void>
  'data-testid'?: string
}

const normalizeNamespace = (ns: string): string => {
  return String(ns || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

export const CreateNamespaceDialog: React.FC<CreateNamespaceDialogProps> = ({
  open,
  onClose,
  onCreate,
  'data-testid': testId = 'create-namespace-dialog'
}) => {
  const [namespace, setNamespace] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalized = useMemo(() => normalizeNamespace(namespace), [namespace])

  const handleSubmit = async () => {
    const ns = normalizeNamespace(namespace)
    if (!ns) {
      setError('Namespace is required')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onCreate({
        namespace: ns,
        displayName: displayName || undefined,
        description: description || undefined
      })
      setNamespace('')
      setDisplayName('')
      setDescription('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create namespace')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Create namespace</DialogTitle>
          <DialogDescription>
            Namespaces isolate custom data schemas and data sources. Use reverse-domain notation, e.g.{' '}
            <span className="gba:font-mono">com.company.hr</span>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" data-testid={`${testId}-error`}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-namespace`}>
              Namespace <span className="gba:text-destructive">*</span>
            </Label>
            <Input
              id={`${testId}-namespace`}
              value={namespace}
              onChange={e => setNamespace(e.target.value)}
              placeholder="com.company.department"
              className="gba:font-mono"
              data-testid={`${testId}-namespace`}
            />
            <div className="gba:text-xs gba:text-muted-foreground">
              Normalized: <span className="gba:font-mono">{normalized || '-'}</span>
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-displayName`}>Display name</Label>
            <Input
              id={`${testId}-displayName`}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Human-friendly name"
              data-testid={`${testId}-displayName`}
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-description`}>Description</Label>
            <Textarea
              id={`${testId}-description`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              data-testid={`${testId}-description`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} data-testid={`${testId}-create`}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateNamespaceDialog
