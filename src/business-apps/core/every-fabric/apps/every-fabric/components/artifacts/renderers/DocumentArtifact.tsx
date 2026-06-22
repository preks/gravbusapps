import { useTranslation } from '@newwork/nw-design-system'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import type { ArtifactFile } from '../../../types/fabric'
import CodeArtifact from './CodeArtifact'
import translations from '../../../_i18n'

export interface DocumentArtifactProps {
  file: ArtifactFile
  content: string | null
  viewMode: 'preview' | 'code'
}

const DocumentArtifact: React.FC<DocumentArtifactProps> = ({ file, content, viewMode }) => {
  const { t } = useTranslation(translations)

  if (content === null) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-sm gba:text-muted-foreground">
        {t('artifact-loading-document')}
      </div>
    )
  }

  if (viewMode === 'code') {
    return <CodeArtifact file={file} content={content} viewMode={viewMode} language="markdown" />
  }

  return (
    <div className="gba:h-full gba:overflow-y-auto gba:bg-background" data-testid="fabric-document-artifact">
      <div className="gba:max-w-prose gba:mx-auto gba:px-8 gba:py-8">
        <MarkdownWithChipsRenderer content={content} />
      </div>
    </div>
  )
}

export default DocumentArtifact
