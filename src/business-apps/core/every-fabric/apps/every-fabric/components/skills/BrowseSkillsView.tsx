import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Archive,
  ArrowCounterClockwise,
  CaretDown,
  CaretRight,
  CheckCircle,
  File as FileIcon,
  Folder,
  MagnifyingGlass,
  NotePencil,
  Plus,
  Trash,
  UploadSimple,
  Wrench
} from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { inferTargetDir, formatFileSize } from './skillFileUtils'
import translations from '../../_i18n'

const STATUS_STYLE_CLASSES: Record<string, { key: string; className: string }> = {
  draft: { key: 'skills-browse-status-draft', className: 'gba:bg-yellow-100 gba:text-yellow-800' },
  pending_review: { key: 'skills-browse-status-draft', className: 'gba:bg-yellow-100 gba:text-yellow-800' },
  approved: { key: 'skills-browse-status-draft', className: 'gba:bg-yellow-100 gba:text-yellow-800' },
  built_in: { key: 'skills-browse-status-builtin', className: 'gba:bg-blue-100 gba:text-blue-800' },
  archived: { key: 'skills-browse-status-archived', className: 'gba:bg-gray-100 gba:text-gray-600' }
}

function getStatusStyle(status: string | undefined, t: (key: string) => string) {
  if (!status) return null
  const style = STATUS_STYLE_CLASSES[status]
  if (style) return { label: t(style.key), className: style.className }
  return { label: status, className: 'gba:bg-muted gba:text-muted-foreground' }
}

const SKILL_ROW_ACTION_BTN =
  'gba:inline-flex gba:shrink-0 gba:items-center gba:gap-0.5 gba:px-1.5 gba:py-0.5 gba:rounded-md gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted gba:transition-colors gba:whitespace-nowrap'

const SKILL_ROW_ARCHIVE_BTN = `${SKILL_ROW_ACTION_BTN} gba:hover:text-destructive gba:hover:bg-destructive/10`

const SKILL_ROW_ACTIVE_PILL =
  'gba:inline-flex gba:items-center gba:gap-1 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-[11px] gba:font-medium gba:text-green-700 gba:bg-green-50 gba:shrink-0'

/** Wrench + count on the skill row; hover lists tool refs (same pattern as agent skill chips). */
const SkillRowToolsBadge: React.FC<{ skillId: string; tools: string[] }> = ({ skillId, tools }) => {
  if (tools.length === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="presentation"
            className="gba:inline-flex gba:shrink-0 gba:cursor-default gba:items-center gba:gap-0.5 gba:rounded-full gba:bg-amber-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-amber-800"
            data-testid={`browse-skills-tool-count-${skillId}`}
          >
            <Wrench className="gba:h-2.5 gba:w-2.5 gba:shrink-0" />
            {tools.length}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="gba:flex gba:max-w-xs gba:flex-col gba:gap-0.5">
            {tools.map(tool => (
              <span key={tool} className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
                <Wrench className="gba:h-3 gba:w-3 gba:shrink-0" />
                {tool}
              </span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export type BrowseSkillManifestEntry = {
  skill_id: string
  name: string
  description: string
  status?: string
  is_active?: boolean
  has_files?: boolean
  file_count?: number
  tools?: string[]
  source?: 'admin' | 'runtime_manifest'
  version?: number
  published_version?: number | null
  current_version?: number
}

export interface BrowseSkillsViewProps {
  accessToken: string
  showToast?: (message: string, variant: 'success' | 'error') => void
  /**
   * When provided, clicking the row body fires `onEditSkill(skill_id)` so a parent can open
   * a SKILL.md editor panel beside the list.
   */
  onEditSkill?: (skillId: string) => void
  /** Fires when the user clicks "Create Skill" so the parent can show the creation panel. */
  onCreateSkill?: () => void
  /** Currently selected/edited skill id — renders a visual highlight on the matching row. */
  selectedSkillId?: string | null
  /**
   * Bumped by the parent after an external mutation (e.g. a successful save in the editor
   * panel) to trigger a background manifest refresh so name/description/file_count stay
   * in sync on the cards.
   */
  manifestVersion?: number
}

/**
 * Stand-alone, page-friendly narrow list of the skills manifest.
 *
 * Each card shows title, version/status badges, inline actions, a two-line description,
 * and an Enabled pill. When `onEditSkill` is provided, the left column opens the editor.
 */
export const BrowseSkillsView: React.FC<BrowseSkillsViewProps> = ({
  accessToken,
  showToast,
  onCreateSkill,
  onEditSkill,
  selectedSkillId,
  manifestVersion
}) => {
  const { t } = useTranslation(translations)
  const client = useEnterpriseAgentClient(accessToken)
  const [manifest, setManifest] = useState<BrowseSkillManifestEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [transitioningId, setTransitioningId] = useState<string | null>(null)
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const [archivedSkills, setArchivedSkills] = useState<BrowseSkillManifestEntry[]>([])
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null)
  const [skillFiles, setSkillFiles] = useState<{ path: string; mime_type: string; size: number }[]>([])
  const [skillFilesLoading, setSkillFilesLoading] = useState(false)
  const [deletingFilePath, setDeletingFilePath] = useState<string | null>(null)
  const browseAddFilesRef = useRef<HTMLInputElement>(null)
  const uploadSkillRef = useRef<HTMLInputElement>(null)

  /** After first successful manifest fetch, subsequent mounts use stale-while-revalidate (no blocking spinner). */
  const hasFetchedManifestRef = useRef(false)

  const loadManifest = useCallback(
    async (opts?: { background?: boolean }) => {
      const background = opts?.background === true
      let showSpinner = false
      if (!background && !hasFetchedManifestRef.current) {
        setLoading(true)
        showSpinner = true
      }
      try {
        const data = await client.getSkillsManifest()
        setManifest(data.skills ?? [])
        hasFetchedManifestRef.current = true
      } catch {
        if (!hasFetchedManifestRef.current) {
          setManifest([])
        }
      } finally {
        if (showSpinner) {
          setLoading(false)
        }
      }
    },
    [client]
  )

  useEffect(() => {
    setSearchQuery('')
    void loadManifest(hasFetchedManifestRef.current ? { background: true } : undefined)
  }, [loadManifest])

  // Background refresh whenever the parent bumps manifestVersion (e.g. after a save in the editor
  // panel). Skip the initial mount (value 0) since `loadManifest` already fired above.
  const lastManifestVersionRef = useRef<number | undefined>(manifestVersion)
  useEffect(() => {
    if (manifestVersion === undefined) return
    if (lastManifestVersionRef.current === manifestVersion) return
    lastManifestVersionRef.current = manifestVersion
    void loadManifest({ background: true })
  }, [manifestVersion, loadManifest])

  const filteredManifest = useMemo(() => {
    const active = manifest.filter(s => s.status !== 'archived')
    if (!searchQuery.trim()) return active
    const q = searchQuery.toLowerCase()
    return active.filter(
      s =>
        s.skill_id.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    )
  }, [manifest, searchQuery])

  const handleArchiveSkill = useCallback(
    async (skillId: string) => {
      const confirmed = window.confirm(
        `Archive "${skillId}"? It will be hidden from agent selection and orchestration, but history is preserved.`
      )
      if (!confirmed) return
      setTransitioningId(skillId)
      try {
        await client.archiveSkill(skillId)
        setManifest(prev => prev.filter(s => s.skill_id !== skillId))
        showToast?.(`Skill "${skillId}" archived`, 'success')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Failed to archive skill: ${msg}`, 'error')
      } finally {
        setTransitioningId(null)
      }
    },
    [client, showToast]
  )

  const loadArchivedSkills = useCallback(async () => {
    setArchivedLoading(true)
    try {
      const skills = await client.listArchivedSkills()
      setArchivedSkills(skills as BrowseSkillManifestEntry[])
    } catch {
      setArchivedSkills([])
    } finally {
      setArchivedLoading(false)
    }
  }, [client])

  const handleRestoreSkill = useCallback(
    async (skillId: string) => {
      setTransitioningId(skillId)
      try {
        await client.enableSkill(skillId)
        setArchivedSkills(prev => prev.filter(s => s.skill_id !== skillId))
        showToast?.(`Skill "${skillId}" restored`, 'success')
        void loadManifest({ background: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Failed to restore skill: ${msg}`, 'error')
      } finally {
        setTransitioningId(null)
      }
    },
    [client, showToast, loadManifest]
  )

  const handleToggleFiles = useCallback(
    async (skillId: string) => {
      if (expandedSkillId === skillId) {
        setExpandedSkillId(null)
        setSkillFiles([])
        return
      }
      setExpandedSkillId(skillId)
      setSkillFilesLoading(true)
      try {
        const files = await client.listSkillFiles(skillId)
        setSkillFiles(files)
      } catch {
        setSkillFiles([])
      } finally {
        setSkillFilesLoading(false)
      }
    },
    [client, expandedSkillId]
  )

  const handleDeleteFile = useCallback(
    async (skillId: string, path: string) => {
      setDeletingFilePath(path)
      try {
        await client.deleteSkillFile(skillId, path)
        setSkillFiles(prev => prev.filter(f => f.path !== path))
        setManifest(prev =>
          prev.map(s =>
            s.skill_id === skillId
              ? { ...s, file_count: Math.max(0, (s.file_count ?? 1) - 1), has_files: (s.file_count ?? 1) - 1 > 0 }
              : s
          )
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Failed to delete file: ${msg}`, 'error')
      } finally {
        setDeletingFilePath(null)
      }
    },
    [client, showToast]
  )

  const handleBrowseAddFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      e.target.value = ''
      if (files.length === 0 || !expandedSkillId) return
      const renamedFiles = files.map(f => new File([f], `${inferTargetDir(f.name)}/${f.name}`, { type: f.type }))
      try {
        const uploaded = await client.uploadSkillFiles(expandedSkillId, renamedFiles)
        setSkillFiles(prev => [...prev, ...uploaded])
        setManifest(prev =>
          prev.map(s =>
            s.skill_id === expandedSkillId
              ? { ...s, file_count: (s.file_count ?? 0) + uploaded.length, has_files: true }
              : s
          )
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`File upload failed: ${msg}`, 'error')
      }
    },
    [client, expandedSkillId, showToast]
  )

  const handleExportSkill = useCallback(
    async (s: BrowseSkillManifestEntry) => {
      try {
        if (s.has_files) {
          const blob = await client.exportSkillBundle(s.skill_id)
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${s.skill_id}.zip`
          a.click()
          URL.revokeObjectURL(url)
        } else {
          const doc = await client.getSkill(s.skill_id)
          const blob = new Blob([doc.content], { type: 'text/markdown' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${s.skill_id}.md`
          a.click()
          URL.revokeObjectURL(url)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Download failed: ${msg}`, 'error')
      }
    },
    [client, showToast]
  )

  const handleUploadSkill = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
        showToast?.('Only .md / .markdown files are supported.', 'error')
        return
      }
      try {
        await client.uploadSkillFile(file)
        showToast?.(`Skill uploaded from "${file.name}".`, 'success')
        void loadManifest({ background: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Upload failed: ${msg}`, 'error')
      }
    },
    [client, showToast, loadManifest]
  )

  const handleTransition = useCallback(
    async (skillId: string, action: 'enable' | 'disable') => {
      setTransitioningId(skillId)
      try {
        const labels = { enable: 'Enabled', disable: 'Disabled' }
        const fns = {
          enable: () => client.enableSkill(skillId),
          disable: () => client.disableSkill(skillId)
        }
        await fns[action]()
        showToast?.(`${labels[action]}: "${skillId}"`, 'success')
        void loadManifest({ background: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Status change failed: ${msg}`, 'error')
      } finally {
        setTransitioningId(null)
      }
    },
    [client, showToast, loadManifest]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="browse-skills-view">
      <div className="gba:flex gba:items-center gba:gap-2">
        <button
          type="button"
          onClick={() => uploadSkillRef.current?.click()}
          className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:font-medium gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="upload-skill-button"
        >
          <UploadSimple className="gba:h-4 gba:w-4" />
          {t('skills-browse-upload')}
        </button>
        <button
          type="button"
          onClick={() => onCreateSkill?.()}
          className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:font-medium gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="create-skill-button"
        >
          <NotePencil className="gba:h-4 gba:w-4" />
          {t('skills-browse-create')}
        </button>
        <input
          ref={uploadSkillRef}
          type="file"
          accept=".md,.markdown"
          className="gba:hidden"
          onChange={handleUploadSkill}
        />
      </div>

      <div className="gba:relative">
        <MagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('skills-browse-search')}
          className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:pl-10 gba:pr-3 gba:py-2.5 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/30"
          data-testid="browse-skills-search"
        />
      </div>

      {loading ? (
        <p className="gba:text-sm gba:text-muted-foreground gba:py-8 gba:text-center">{t('skills-browse-loading')}</p>
      ) : filteredManifest.length === 0 ? (
        <p className="gba:text-sm gba:text-muted-foreground gba:py-8 gba:text-center">
          {searchQuery.trim() ? t('skills-browse-no-match') : t('skills-browse-empty')}
        </p>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-2" data-testid="browse-skills-list">
          {filteredManifest.map(s => {
            const isSelected = selectedSkillId === s.skill_id
            const isRuntimeOnly = s.source === 'runtime_manifest'
            const showSkillActions = s.skill_id !== 'skill-creator' && !isRuntimeOnly && s.status !== 'archived'

            const canEdit = Boolean(onEditSkill && !isRuntimeOnly)
            const statusStyle = getStatusStyle(s.status, t)

            const skillBody = (
              <div className="gba:relative gba:z-[1] gba:pointer-events-none">
                <p className="gba:text-sm gba:font-semibold gba:text-foreground">{s.name || s.skill_id}</p>
                <div className="gba:mt-1 gba:flex gba:flex-wrap gba:items-center gba:gap-x-1.5 gba:gap-y-1">
                  {(s.current_version != null || s.version != null || s.published_version != null) && (
                    <span
                      className="gba:shrink-0 gba:rounded gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground"
                      data-testid={`browse-skills-version-${s.skill_id}`}
                    >
                      {s.published_version != null
                        ? t('skills-browse-pub-version', { version: s.published_version })
                        : t('skills-browse-unpublished')}
                      {(s.current_version ?? s.version) != null &&
                      (s.current_version ?? s.version) !== s.published_version
                        ? ` · ${t('skills-browse-draft-version', { version: s.current_version ?? s.version })}`
                        : ''}
                    </span>
                  )}
                  {s.skill_id === 'skill-creator' && (
                    <span className="gba:text-xs gba:text-muted-foreground gba:italic">
                      {t('skills-browse-default-badge')}
                    </span>
                  )}
                  {statusStyle && (
                    <span
                      className={`gba:text-[10px] gba:font-medium gba:px-1.5 gba:py-0.5 gba:rounded ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </span>
                  )}
                  <div className="gba:pointer-events-auto gba:flex gba:shrink-0 gba:items-center gba:gap-0.5 gba:flex-nowrap">
                    {showSkillActions && (
                      <button
                        type="button"
                        className={SKILL_ROW_ACTION_BTN}
                        onClick={() => handleToggleFiles(s.skill_id)}
                      >
                        <Folder className="gba:h-3 gba:w-3" />
                        {expandedSkillId === s.skill_id ? t('skills-browse-hide-files') : t('skills-browse-files')}
                        {s.has_files && s.file_count != null && s.file_count > 0 && (
                          <span
                            className="gba:ml-0.5 gba:text-[10px] gba:px-1 gba:py-0.5 gba:rounded-full gba:border gba:border-primary/30 gba:bg-primary/10 gba:text-primary gba:font-medium"
                            data-testid={`browse-skills-file-count-${s.skill_id}`}
                          >
                            {s.file_count}
                          </span>
                        )}
                      </button>
                    )}
                    {!isRuntimeOnly && (
                      <button
                        type="button"
                        className={SKILL_ROW_ACTION_BTN}
                        title={s.has_files ? `Export ${s.skill_id} as zip` : `Download ${s.skill_id} as .md`}
                        onClick={() => void handleExportSkill(s)}
                      >
                        <UploadSimple className="gba:h-3 gba:w-3 gba:rotate-180" />
                        {t('skills-browse-export')}
                      </button>
                    )}
                    {isRuntimeOnly && (
                      <span className="gba:shrink-0 gba:px-1.5 gba:py-0.5 gba:text-[11px] gba:text-muted-foreground gba:whitespace-nowrap">
                        {t('skills-browse-runtime-skill')}
                      </span>
                    )}
                    {showSkillActions && s.is_active !== false && (
                      <button
                        type="button"
                        className={SKILL_ROW_ACTION_BTN}
                        disabled={transitioningId === s.skill_id}
                        onClick={() => void handleTransition(s.skill_id, 'disable')}
                      >
                        {t('skills-browse-disable')}
                      </button>
                    )}
                    {showSkillActions && (
                      <button
                        type="button"
                        className={SKILL_ROW_ARCHIVE_BTN}
                        disabled={transitioningId === s.skill_id}
                        onClick={() => void handleArchiveSkill(s.skill_id)}
                        data-testid={`browse-skills-archive-${s.skill_id}`}
                      >
                        <Archive className="gba:h-3 gba:w-3" />
                        {t('skills-browse-archive')}
                      </button>
                    )}
                    <SkillRowToolsBadge skillId={s.skill_id} tools={s.tools ?? []} />
                  </div>
                </div>
                {s.description ? (
                  <p
                    className="gba:text-xs gba:text-muted-foreground/70 gba:mt-0.5 gba:line-clamp-2"
                    data-testid={`browse-skills-description-${s.skill_id}`}
                  >
                    {s.description}
                  </p>
                ) : null}
              </div>
            )

            return (
              <div
                key={s.skill_id}
                className={[
                  'gba:flex gba:flex-col gba:rounded-xl gba:border gba:bg-card gba:overflow-hidden gba:transition-colors',
                  isSelected
                    ? 'gba:border-primary/60 gba:ring-1 gba:ring-primary/40 gba:bg-primary/5'
                    : 'gba:border-border'
                ].join(' ')}
                data-testid={`browse-skills-card-${s.skill_id}`}
                data-selected={isSelected ? 'true' : undefined}
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:p-3">
                  <div className="gba:relative gba:min-w-0 gba:flex-1">
                    {canEdit && (
                      <button
                        type="button"
                        className="gba:absolute gba:inset-0 gba:z-0 gba:rounded-md gba:cursor-pointer gba:hover:bg-muted/20 gba:transition-colors focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-primary/40"
                        onClick={() => onEditSkill!(s.skill_id)}
                        data-testid={`browse-skills-row-${s.skill_id}`}
                        aria-pressed={isSelected}
                        aria-label={`Edit ${s.name || s.skill_id}`}
                      />
                    )}
                    {skillBody}
                  </div>

                  <div className="gba:flex gba:shrink-0 gba:items-center">
                    {showSkillActions &&
                      (s.is_active === false ? (
                        <button
                          type="button"
                          className={`${SKILL_ROW_ACTIVE_PILL} gba:hover:bg-green-100 gba:transition-colors`}
                          disabled={transitioningId === s.skill_id}
                          onClick={() => void handleTransition(s.skill_id, 'enable')}
                          data-testid={`browse-skills-enable-${s.skill_id}`}
                        >
                          <CheckCircle className="gba:h-3 gba:w-3" />
                          {t('skills-browse-enable')}
                        </button>
                      ) : (
                        <span className={SKILL_ROW_ACTIVE_PILL} data-testid={`browse-skills-enabled-${s.skill_id}`}>
                          <CheckCircle className="gba:h-3 gba:w-3" />
                          {t('skills-browse-status-enabled')}
                        </span>
                      ))}
                  </div>
                </div>

                {expandedSkillId === s.skill_id && (
                  <div className="gba:border-t gba:border-border gba:bg-muted/20 gba:px-3 gba:py-2.5 gba:space-y-2">
                    {skillFilesLoading ? (
                      <p className="gba:text-[11px] gba:text-muted-foreground">{t('skills-browse-loading-files')}</p>
                    ) : skillFiles.length === 0 ? (
                      <p className="gba:text-[11px] gba:text-muted-foreground">{t('skills-browse-no-aux-files')}</p>
                    ) : (
                      <div className="gba:space-y-1">
                        {skillFiles.map(f => (
                          <div key={f.path} className="gba:flex gba:items-center gba:gap-2 gba:text-[11px]">
                            <FileIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                            <span className="gba:flex-1 gba:truncate gba:text-foreground gba:font-mono">{f.path}</span>
                            <span className="gba:text-muted-foreground gba:shrink-0">{formatFileSize(f.size)}</span>
                            <button
                              type="button"
                              className="gba:p-0.5 gba:rounded gba:text-muted-foreground gba:hover:text-destructive gba:shrink-0"
                              title={`Delete ${f.path}`}
                              disabled={deletingFilePath === f.path}
                              onClick={() => handleDeleteFile(s.skill_id, f.path)}
                            >
                              {deletingFilePath === f.path ? (
                                <span className="gba:block gba:h-3 gba:w-3 gba:animate-spin gba:rounded-full gba:border gba:border-current gba:border-t-transparent" />
                              ) : (
                                <Trash className="gba:h-3 gba:w-3" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      ref={browseAddFilesRef}
                      type="file"
                      multiple
                      className="gba:hidden"
                      onChange={e => void handleBrowseAddFiles(e)}
                    />
                    <button
                      type="button"
                      className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
                      onClick={() => browseAddFilesRef.current?.click()}
                    >
                      <Plus className="gba:h-3 gba:w-3" />
                      {t('skills-browse-add-files')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="gba:mt-6" data-testid="archived-skills-section">
        <button
          type="button"
          onClick={() => {
            const next = !archivedExpanded
            setArchivedExpanded(next)
            if (next && archivedSkills.length === 0) void loadArchivedSkills()
          }}
          className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:text-foreground gba:hover:text-foreground/80 gba:transition-colors"
          data-testid="archived-skills-toggle"
        >
          {archivedExpanded ? <CaretDown className="gba:h-4 gba:w-4" /> : <CaretRight className="gba:h-4 gba:w-4" />}
          {t('skills-browse-archived-title')}
          {archivedSkills.length > 0 && (
            <span className="gba:text-xs gba:font-normal gba:text-muted-foreground">({archivedSkills.length})</span>
          )}
        </button>
        {archivedExpanded && (
          <div className="gba:mt-3 gba:flex gba:flex-col gba:gap-2">
            {archivedLoading ? (
              <p className="gba:text-sm gba:text-muted-foreground gba:py-4 gba:text-center">
                {t('skills-browse-archived-loading')}
              </p>
            ) : archivedSkills.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground gba:py-4 gba:text-center">
                {t('skills-browse-archived-empty')}
              </p>
            ) : (
              archivedSkills.map(s => (
                <div
                  key={s.skill_id}
                  className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3"
                  data-testid={`archived-skill-${s.skill_id}`}
                >
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <p className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:truncate">
                        {s.name || s.skill_id}
                      </p>
                      <span className="gba:text-[10px] gba:font-medium gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-gray-100 gba:text-gray-600">
                        {t('skills-browse-status-archived')}
                      </span>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-0.5 gba:line-clamp-2">
                      {s.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-[11px] gba:font-medium gba:text-green-700 gba:bg-green-50 gba:hover:bg-green-100 gba:transition-colors gba:shrink-0"
                    disabled={transitioningId === s.skill_id}
                    onClick={() => void handleRestoreSkill(s.skill_id)}
                    data-testid={`restore-skill-${s.skill_id}`}
                  >
                    <ArrowCounterClockwise className="gba:h-3 gba:w-3" />
                    {t('skills-browse-restore')}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
