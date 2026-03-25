import React, { useMemo } from 'react'
import { Badge, Button, Label, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@newwork/nw-design-system'
import { Wand2 } from 'lucide-react'
import type { FunctionAssistantDraftResponse } from '@/common/network/functions/FunctionsServiceClient'

export interface DraftPreviewCardProps {
  draft: FunctionAssistantDraftResponse
  hint?: string
  onApply: () => void
  'data-testid'?: string
}

export const DraftPreviewCard: React.FC<DraftPreviewCardProps> = ({
  draft,
  hint,
  onApply,
  'data-testid': testId = 'assistant-draft'
}) => {
  const suggestedConfigKeys = useMemo(() => {
    const keys = draft?.configKeys || []
    return keys.map(k => String(k || '').trim()).filter(Boolean)
  }, [draft])

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Badge variant="secondary">Draft ready</Badge>
        {draft.name ? <Badge variant="outline">{draft.name}</Badge> : null}
        {suggestedConfigKeys.length ? <Badge variant="info">{suggestedConfigKeys.length} config keys</Badge> : null}
      </div>

      {hint ? <div className="gba:text-xs gba:text-muted-foreground">{hint}</div> : null}
      {draft.description ? <div className="gba:text-sm gba:text-muted-foreground">{draft.description}</div> : null}

      {suggestedConfigKeys.length ? (
        <div className="gba:space-y-1" data-testid={`${testId}-config`}>
          <Label className="gba:text-xs gba:text-muted-foreground">Suggested config keys</Label>
          <div className="gba:flex gba:flex-wrap gba:gap-1">
            {suggestedConfigKeys.map(k => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground">
            After applying, set credential values in <strong>Settings</strong> before running tests.
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="source" className="gba:w-full" data-testid={`${testId}-tabs`}>
        <TabsList>
          <TabsTrigger value="source" data-testid={`${testId}-tab-source`}>
            Source
          </TabsTrigger>
          <TabsTrigger value="input" data-testid={`${testId}-tab-input`}>
            Input schema
          </TabsTrigger>
          <TabsTrigger value="output" data-testid={`${testId}-tab-output`}>
            Output schema
          </TabsTrigger>
          <TabsTrigger value="payload" data-testid={`${testId}-tab-payload`}>
            Example payload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="source" className="gba:pt-3">
          <Textarea
            value={draft.source || ''}
            readOnly
            rows={10}
            className="gba:font-mono gba:text-xs"
            data-testid={`${testId}-source`}
          />
        </TabsContent>

        <TabsContent value="input" className="gba:pt-3">
          <Textarea
            value={JSON.stringify(draft.inputSchema || {}, null, 2)}
            readOnly
            rows={10}
            className="gba:font-mono gba:text-xs"
            data-testid={`${testId}-input`}
          />
        </TabsContent>

        <TabsContent value="output" className="gba:pt-3">
          <Textarea
            value={JSON.stringify(draft.outputSchema || {}, null, 2)}
            readOnly
            rows={10}
            className="gba:font-mono gba:text-xs"
            data-testid={`${testId}-output`}
          />
        </TabsContent>

        <TabsContent value="payload" className="gba:pt-3">
          <Textarea
            value={JSON.stringify(draft.examplePayload ?? {}, null, 2)}
            readOnly
            rows={10}
            className="gba:font-mono gba:text-xs"
            data-testid={`${testId}-payload`}
          />
        </TabsContent>
      </Tabs>

      <div className="gba:flex gba:justify-end">
        <Button type="button" variant="default" onClick={onApply} data-testid={`${testId}-apply`}>
          <Wand2 className="gba:h-4 gba:w-4 gba:mr-2" />
          Apply to editor
        </Button>
      </div>
    </div>
  )
}

export default DraftPreviewCard
