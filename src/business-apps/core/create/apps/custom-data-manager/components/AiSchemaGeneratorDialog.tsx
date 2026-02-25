import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea
} from '@newwork/nw-design-system'
import { Sparkles, Loader2, Check, AlertCircle, Database, Link as LinkIcon } from 'lucide-react'
import { EntitySchemaProposal, BatchCreationResult } from '../types'

interface AiSchemaGeneratorDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  onGenerate: (description: string) => Promise<EntitySchemaProposal>
  onCreate: (proposal: EntitySchemaProposal) => Promise<BatchCreationResult>
  'data-testid'?: string
}

type Step = 'input' | 'review' | 'creating' | 'success' | 'error'

export const AiSchemaGeneratorDialog: React.FC<AiSchemaGeneratorDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onGenerate,
  onCreate,
  'data-testid': testId = 'ai-schema-generator-dialog'
}) => {
  const [step, setStep] = useState<Step>('input')
  const [description, setDescription] = useState('')
  const [proposal, setProposal] = useState<EntitySchemaProposal | null>(null)
  const [result, setResult] = useState<BatchCreationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleClose = useCallback(() => {
    setStep('input')
    setDescription('')
    setProposal(null)
    setResult(null)
    setError(null)
    setIsGenerating(false)
    setIsCreating(false)
    onClose()
  }, [onClose])

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const generatedProposal = await onGenerate(description)
      setProposal(generatedProposal)
      setStep('review')
    } catch (err: any) {
      setError(err.message || 'Failed to generate schema')
      setStep('error')
    } finally {
      setIsGenerating(false)
    }
  }, [description, onGenerate])

  const handleCreate = useCallback(async () => {
    if (!proposal) return

    setIsCreating(true)
    setError(null)
    setStep('creating')

    try {
      const creationResult = await onCreate(proposal)
      setResult(creationResult)

      if (creationResult.success) {
        setStep('success')
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 2000)
      } else {
        setError(creationResult.error || 'Some entities or relationships failed to create')
        setStep('error')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create entities')
      setStep('error')
    } finally {
      setIsCreating(false)
    }
  }, [proposal, onCreate, onSuccess, handleClose])

  const handleRetry = useCallback(() => {
    setStep('input')
    setError(null)
    setProposal(null)
    setResult(null)
  }, [])

  const renderInputStep = () => (
    <div className="gba:space-y-4">
      <Alert>
        <Sparkles className="gba:h-4 gba:w-4" />
        <AlertDescription>
          Describe the data you want to manage in natural language. The AI will generate entity schemas with
          relationships.
        </AlertDescription>
      </Alert>

      <div className="gba:space-y-2">
        <label className="gba:text-sm gba:font-medium">Describe your data structure</label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Example: I need to track customers and their orders. Each customer has a name, email, and phone. Each order has an order date, total amount, and status. Orders belong to customers."
          rows={8}
          className="gba:resize-none"
          data-testid={`${testId}-description-input`}
        />
        <p className="gba:text-xs gba:text-muted-foreground">
          Be specific about entities, their attributes, and relationships between them.
        </p>
      </div>

      <div className="gba:flex gba:gap-2 gba:justify-end">
        <Button variant="outline" onClick={handleClose} data-testid={`${testId}-cancel-button`}>
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!description.trim() || isGenerating}
          data-testid={`${testId}-generate-button`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="gba:mr-2 gba:h-4 gba:w-4" />
              Generate Schema
            </>
          )}
        </Button>
      </div>
    </div>
  )

  const renderReviewStep = () => {
    if (!proposal) return null

    return (
      <div className="gba:space-y-4">
        <Alert>
          <Check className="gba:h-4 gba:w-4" />
          <AlertDescription>
            AI generated {proposal.entities.length} {proposal.entities.length === 1 ? 'entity' : 'entities'} with{' '}
            {proposal.relationships.length} {proposal.relationships.length === 1 ? 'relationship' : 'relationships'}.
            Review and edit before creating.
          </AlertDescription>
        </Alert>

        {proposal.reasoning && (
          <Card>
            <CardHeader>
              <CardTitle className="gba:text-sm">AI Reasoning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="gba:text-sm gba:text-muted-foreground">{proposal.reasoning}</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="entities" className="gba:w-full">
          <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
            <TabsTrigger value="entities" startIcon={<Database className="gba:h-4 gba:w-4" />}>
              Entities ({proposal.entities.length})
            </TabsTrigger>
            <TabsTrigger value="relationships" startIcon={<LinkIcon className="gba:h-4 gba:w-4" />}>
              Relationships ({proposal.relationships.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="gba:space-y-3">
            <ScrollArea className="gba:h-[400px]">
              <div className="gba:space-y-3 gba:pr-4">
                {proposal.entities.map((entity, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <CardTitle className="gba:text-base">{entity.displayName}</CardTitle>
                        <Badge variant="secondary">{entity.key}</Badge>
                      </div>
                      {entity.description && (
                        <p className="gba:text-sm gba:text-muted-foreground">{entity.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="gba:space-y-2">
                        <p className="gba:text-sm gba:font-medium">Columns ({entity.columns.length}):</p>
                        <div className="gba:grid gba:gap-2">
                          {entity.columns.map((col, colIndex) => (
                            <div
                              key={colIndex}
                              className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:p-2 gba:bg-muted gba:rounded-md"
                            >
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <span className="gba:font-medium">{col.label}</span>
                                <code className="gba:text-xs gba:text-muted-foreground">({col.name})</code>
                                {col.required && (
                                  <Badge variant="destructive" className="gba:text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline">{col.type}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="relationships" className="gba:space-y-3">
            <ScrollArea className="gba:h-[400px]">
              <div className="gba:space-y-3 gba:pr-4">
                {proposal.relationships.length === 0 ? (
                  <Alert>
                    <AlertDescription>No relationships defined in this schema.</AlertDescription>
                  </Alert>
                ) : (
                  proposal.relationships.map((rel, index) => (
                    <Card key={index}>
                      <CardContent className="gba:pt-6">
                        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                          <Badge>{rel.type}</Badge>
                          {rel.cascadeDelete && <Badge variant="destructive">Cascade Delete</Badge>}
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                          <Badge variant="secondary">{rel.sourceEntity}</Badge>
                          <span className="gba:text-muted-foreground">→</span>
                          <Badge variant="secondary">{rel.targetEntity}</Badge>
                        </div>
                        <div className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
                          Foreign Key: <code className="gba:text-xs">{rel.foreignKeyColumn}</code>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="gba:flex gba:gap-2 gba:justify-end">
          <Button variant="outline" onClick={handleRetry} data-testid={`${testId}-back-button`}>
            Back
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} data-testid={`${testId}-create-button`}>
            {isCreating ? (
              <>
                <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Database className="gba:mr-2 gba:h-4 gba:w-4" />
                Create Entities
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  const renderCreatingStep = () => (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-4">
      <Loader2 className="gba:h-12 gba:w-12 gba:animate-spin gba:text-primary" />
      <div className="gba:text-center">
        <h3 className="gba:text-lg gba:font-semibold">Creating Entities</h3>
        <p className="gba:text-sm gba:text-muted-foreground">Deploying tables and establishing relationships...</p>
      </div>
    </div>
  )

  const renderSuccessStep = () => {
    if (!result) return null

    const successfulEntities = result.entities.filter(e => e.tableDeployed).length
    const successfulRelationships = result.relationships.filter(r => r.created).length

    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-4">
        <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-success gba:flex gba:items-center gba:justify-center">
          <Check className="gba:h-6 gba:w-6 gba:text-success-foreground" />
        </div>
        <div className="gba:text-center">
          <h3 className="gba:text-lg gba:font-semibold">Entities Created Successfully!</h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {successfulEntities} {successfulEntities === 1 ? 'entity' : 'entities'} and {successfulRelationships}{' '}
            {successfulRelationships === 1 ? 'relationship' : 'relationships'} created.
          </p>
        </div>
      </div>
    )
  }

  const renderErrorStep = () => (
    <div className="gba:space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="gba:h-4 gba:w-4" />
        <AlertDescription>{error || 'An error occurred'}</AlertDescription>
      </Alert>

      {result && (
        <div className="gba:space-y-3">
          <h4 className="gba:text-sm gba:font-semibold">Creation Status:</h4>
          <ScrollArea className="gba:h-[300px]">
            <div className="gba:space-y-2 gba:pr-4">
              {result.entities.map((entity, index) => (
                <div
                  key={index}
                  className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-muted gba:rounded-md"
                >
                  <span className="gba:text-sm">{entity.entityKey}</span>
                  <Badge variant={entity.tableDeployed ? 'success' : 'destructive'}>
                    {entity.tableDeployed ? 'Created' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="gba:flex gba:gap-2 gba:justify-end">
        <Button variant="outline" onClick={handleClose} data-testid={`${testId}-close-button`}>
          Close
        </Button>
        <Button onClick={handleRetry} data-testid={`${testId}-retry-button`}>
          Try Again
        </Button>
      </div>
    </div>
  )

  const getDialogTitle = () => {
    switch (step) {
      case 'input':
        return 'Generate Schema with AI'
      case 'review':
        return 'Review AI-Generated Schema'
      case 'creating':
        return 'Creating Entities'
      case 'success':
        return 'Success'
      case 'error':
        return 'Error'
      default:
        return 'AI Schema Generator'
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="gba:max-w-4xl gba:max-h-[90vh]" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:h-5 gba:w-5 gba:text-primary" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Use AI to automatically generate entity schemas from natural language descriptions'}
            {step === 'review' && 'Review the AI-generated schema before creating the entities'}
            {step === 'creating' && 'Please wait while we create your entities and relationships'}
            {step === 'success' && 'Your entities have been created successfully'}
            {step === 'error' && 'Something went wrong during creation'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && renderInputStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'creating' && renderCreatingStep()}
        {step === 'success' && renderSuccessStep()}
        {step === 'error' && renderErrorStep()}
      </DialogContent>
    </Dialog>
  )
}
