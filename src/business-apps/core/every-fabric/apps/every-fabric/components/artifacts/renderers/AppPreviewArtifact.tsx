import { useTranslation } from '@newwork/nw-design-system'
import CodeArtifactComponent from './CodeArtifact'
import type { RendererProps } from './index'
import translations from '../../../_i18n'

const AppPreviewArtifact: React.FC<RendererProps> = props => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      <div className="gba:border-b gba:border-border gba:bg-muted/30 gba:px-4 gba:py-2">
        <p className="gba:text-xs gba:text-muted-foreground">{t('artifact-app-preview-desc')}</p>
      </div>
      <div className="gba:flex-1 gba:min-h-0">
        <CodeArtifactComponent {...props} viewMode="code" />
      </div>
    </div>
  )
}

export default AppPreviewArtifact
