import { useCallback, useState } from 'react'
import { ArrowsOutIcon, CheckIcon, CopyIcon, DownloadSimpleIcon, ImageIcon, XIcon } from '@phosphor-icons/react'
import type { ArtifactFile } from '../../types/fabric'
import { useArtifactI18n } from './useArtifactI18n'

// ─── Type metadata ────────────────────────────────────────────────────────────

const TYPE_ICON: Record<ArtifactFile['rendererType'], string> = {
  html: '🌐',
  document: '📄',
  markdown: '📝',
  slide: '📊',
  chart: '📈',
  table: '▦',
  diagram: '📐',
  'app-preview': '🧩',
  code: '💻',
  unknown: '📁'
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

const ViewToggle: React.FC<{
  viewMode: 'preview' | 'code'
  onChange: (m: 'preview' | 'code') => void
  disabled?: boolean
  previewLabel: string
  codeLabel: string
}> = ({ viewMode, onChange, disabled, previewLabel, codeLabel }) => (
  <div className="gba:inline-flex gba:items-center gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-0.5">
    {(['preview', 'code'] as const).map(mode => (
      <button
        key={mode}
        onClick={() => onChange(mode)}
        disabled={disabled}
        className={`gba:px-2.5 gba:py-1 gba:rounded-md gba:text-xs gba:font-medium gba:transition-colors gba:capitalize ${
          viewMode === mode
            ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
            : 'gba:text-muted-foreground gba:hover:text-foreground'
        } gba:disabled:opacity-40`}
        data-testid={`fabric-toolbar-view-${mode}`}
      >
        {mode === 'preview' ? previewLabel : codeLabel}
      </button>
    ))}
  </div>
)

// ─── Main component ───────────────────────────────────────────────────────────

export interface ArtifactToolbarProps {
  file: ArtifactFile
  viewMode: 'preview' | 'code'
  onViewModeChange: (mode: 'preview' | 'code') => void
  content: string | null
  onClose: () => void
  onDownloadPng?: () => void
}

export const ArtifactToolbar: React.FC<ArtifactToolbarProps> = ({
  file,
  viewMode,
  onViewModeChange,
  content,
  onClose,
  onDownloadPng
}) => {
  const { t, typeLabel } = useArtifactI18n()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  const canToggle = file.rendererType !== 'unknown'

  return (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:px-4 sm:gba:px-5 gba:py-3 gba:border-b gba:border-border/80 gba:bg-background/92 gba:backdrop-blur-md gba:shrink-0"
      data-testid="fabric-artifact-toolbar"
    >
      {/* Type icon + name + badge */}
      <span className="gba:text-base gba:leading-none gba:shrink-0">{TYPE_ICON[file.rendererType]}</span>
      <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">{file.name}</span>
        <span className="gba:shrink-0 gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded-full gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:bg-muted gba:text-muted-foreground">
          {typeLabel(file.rendererType)}
        </span>
      </div>

      {/* View mode toggle */}
      {canToggle && (
        <ViewToggle
          viewMode={viewMode}
          onChange={onViewModeChange}
          previewLabel={t('artifact-view-preview')}
          codeLabel={t('artifact-view-code')}
        />
      )}

      {/* Action buttons */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
        <button
          onClick={handleCopy}
          disabled={!content}
          title={t('artifact-copy-content')}
          className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:disabled:opacity-30"
          data-testid="fabric-toolbar-copy"
        >
          {copied ? (
            <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-green-500" weight="bold" />
          ) : (
            <CopyIcon className="gba:h-3.5 gba:w-3.5" />
          )}
        </button>

        <a
          href={file.downloadUrl}
          download={file.name}
          title={t('artifact-download')}
          className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="fabric-toolbar-download"
        >
          <DownloadSimpleIcon className="gba:h-3.5 gba:w-3.5" />
        </a>

        {onDownloadPng && (
          <button
            onClick={onDownloadPng}
            title={t('artifact-download-png')}
            className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            data-testid="fabric-toolbar-download-png"
          >
            <ImageIcon className="gba:h-3.5 gba:w-3.5" />
          </button>
        )}

        <a
          href={file.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={t('artifact-open-tab')}
          className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="fabric-toolbar-open"
        >
          <ArrowsOutIcon className="gba:h-3.5 gba:w-3.5" />
        </a>

        <button
          onClick={onClose}
          title={t('artifact-close-viewer')}
          className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="fabric-toolbar-close"
        >
          <XIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
      </div>
    </div>
  )
}
