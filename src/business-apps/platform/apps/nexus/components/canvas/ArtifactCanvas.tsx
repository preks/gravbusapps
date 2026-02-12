import { useState, useCallback } from 'react'
import { toast } from '@newwork/nw-design-system'
import { EmptyCanvas } from './EmptyCanvas'
import { ArtifactToolbar } from './ArtifactToolbar'
import { DocumentRenderer } from '../renderers/DocumentRenderer'
import { AnalysisRenderer } from '../renderers/AnalysisRenderer'
import { SlidesRenderer } from '../renderers/SlidesRenderer'
import type { NexusArtifact, DocumentContent, AnalysisContent, SlidesContent } from '../../types/nexus.types'

interface ArtifactCanvasProps {
  artifact: NexusArtifact | null
  artifactStreaming: boolean
  artifactStreamContent: string
  accessToken: string
  onSuggestionClick: (prompt: string) => void
  onSaveArtifact: (
    artifactId: string,
    targetType: 'document' | 'slides'
  ) => Promise<{ success: boolean; message: string }>
  testId?: string
}

export const ArtifactCanvas = ({
  artifact,
  artifactStreaming,
  artifactStreamContent,
  accessToken,
  onSuggestionClick,
  onSaveArtifact,
  testId = 'nexus-canvas'
}: ArtifactCanvasProps) => {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(
    async (targetType: 'document' | 'slides') => {
      if (!artifact) return
      setIsSaving(true)
      try {
        const result = await onSaveArtifact(artifact.id, targetType)
        if (result.success) {
          toast({ title: 'Saved successfully', description: result.message })
        } else {
          toast({ title: 'Save failed', description: result.message, variant: 'destructive' })
        }
      } finally {
        setIsSaving(false)
      }
    },
    [artifact, onSaveArtifact]
  )

  const handleCopy = useCallback(() => {
    if (!artifact) return

    let text = ''
    if (artifact.type === 'document') {
      text = (artifact.content as DocumentContent).markdown || ''
    } else if (artifact.type === 'analysis') {
      text = (artifact.content as AnalysisContent).summary || ''
    } else if (artifact.type === 'slides') {
      text = (artifact.content as SlidesContent).title || ''
    }

    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }, [artifact])

  // Empty state
  if (!artifact) {
    return <EmptyCanvas onSuggestionClick={onSuggestionClick} />
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      <ArtifactToolbar artifact={artifact} onSave={handleSave} onCopy={handleCopy} isSaving={isSaving} />

      <div className="gba:flex-1 gba:overflow-y-auto">
        {artifact.type === 'document' && (
          <DocumentRenderer
            content={artifact.content as DocumentContent}
            isStreaming={artifactStreaming}
            streamContent={artifactStreamContent}
            accessToken={accessToken}
          />
        )}

        {artifact.type === 'analysis' && (
          <AnalysisRenderer
            content={artifact.content as AnalysisContent}
            title={artifact.title}
            isStreaming={artifactStreaming}
            accessToken={accessToken}
          />
        )}

        {artifact.type === 'slides' && <SlidesRenderer content={artifact.content as SlidesContent} />}
      </div>
    </div>
  )
}
