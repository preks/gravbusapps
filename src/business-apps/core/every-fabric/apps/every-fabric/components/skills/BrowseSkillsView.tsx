import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
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

export type BrowseSkillManifestEntry = {
  skill_id: string
  name: string
  description: string
  has_files?: boolean
  file_count?: number
  tools?: string[]
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
 * Renders a single-column list of skill rows. Each row shows name, id, description, and
 * tool chips; a footer holds the Files/Export/Delete affordances. When `onEditSkill`
 * is provided the row body becomes a clickable region that selects the skill for
 * editing in a parent-rendered editor panel.
 */
export const BrowseSkillsView: React.FC<BrowseSkillsViewProps> = ({
  accessToken,
  showToast,
  onCreateSkill,
  onEditSkill,
  selectedSkillId,
  manifestVersion
}) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [manifest, setManifest] = useState<BrowseSkillManifestEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
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
    setConfirmDeleteId(null)
    void loadManifest(hasFetchedManifestRef.current ? { background: true } : undefined)
  }, [loadManifest])

  // Background refresh whenever the parent bumps manifestVersion (e.g. after a save in the
  // editor panel). Skip the initial mount (value 0) since `loadManifest` already fired above.
  const lastManifestVersionRef = useRef<number | undefined>(manifestVersion)
  useEffect(() => {
    if (manifestVersion === undefined) return
    if (lastManifestVersionRef.current === manifestVersion) return
    lastManifestVersionRef.current = manifestVersion
    void loadManifest({ background: true })
  }, [manifestVersion, loadManifest])

  const filteredManifest = useMemo(() => {
    if (!searchQuery.trim()) return manifest
    const q = searchQuery.toLowerCase()
    return manifest.filter(
      s =>
        s.skill_id.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    )
  }, [manifest, searchQuery])

  const handleDeleteSkill = useCallback(
    async (skillId: string) => {
      setDeletingId(skillId)
      setConfirmDeleteId(null)
      try {
        await client.deleteSkill(skillId)
        setManifest(prev => prev.filter(s => s.skill_id !== skillId))
        showToast?.(`Skill "${skillId}" deleted`, 'success')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Failed to delete skill: ${msg}`, 'error')
      } finally {
        setDeletingId(null)
      }
    },
    [client, showToast]
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
          Upload Skill
        </button>
        <button
          type="button"
          onClick={() => onCreateSkill?.()}
          className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:font-medium gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="create-skill-button"
        >
          <NotePencil className="gba:h-4 gba:w-4" />
          Create Skill
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
          placeholder="Search skills…"
          className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:pl-10 gba:pr-3 gba:py-2.5 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/30"
          data-testid="browse-skills-search"
        />
      </div>

      {loading ? (
        <p className="gba:text-sm gba:text-muted-foreground gba:py-8 gba:text-center">Loading…</p>
      ) : filteredManifest.length === 0 ? (
        <p className="gba:text-sm gba:text-muted-foreground gba:py-8 gba:text-center">
          {searchQuery.trim() ? 'No matching skills found.' : 'No skills found.'}
        </p>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-2" data-testid="browse-skills-list">
          {filteredManifest.map(s => {
            const isSelected = selectedSkillId === s.skill_id
            const bodyClasses = [
              'gba:w-full gba:text-left gba:p-4 gba:flex gba:flex-col gba:gap-2',
              onEditSkill
                ? 'gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-primary/40'
                : ''
            ].join(' ')

            const body = (
              <>
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  <p className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">
                    {s.name || s.skill_id}
                  </p>
                  {s.skill_id === 'skill-creator' && (
                    <span className="gba:text-xs gba:text-muted-foreground gba:italic">(default)</span>
                  )}
                </div>
                {s.name && s.name !== s.skill_id && (
                  <p className="gba:text-[11px] gba:font-mono gba:text-muted-foreground/70 gba:truncate">
                    {s.skill_id}
                  </p>
                )}
                <p className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed gba:line-clamp-4">
                  {s.description}
                </p>
                {s.tools && s.tools.length > 0 && (
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:mt-1">
                    <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:mr-1">
                      Tools in Skill:
                    </span>
                    {s.tools.map(tool => (
                      <span
                        key={tool}
                        className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-primary/30 gba:bg-primary/10 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary"
                      >
                        <Wrench className="gba:h-2.5 gba:w-2.5" />
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </>
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
                {onEditSkill ? (
                  <button
                    type="button"
                    className={bodyClasses}
                    onClick={() => onEditSkill(s.skill_id)}
                    data-testid={`browse-skills-row-${s.skill_id}`}
                    aria-pressed={isSelected}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={bodyClasses}>{body}</div>
                )}

                <div
                  className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:border-t gba:border-border gba:bg-muted/10 gba:px-3 gba:py-2"
                  // Footer is a sibling of the row button, so no stopPropagation is required —
                  // clicks on these controls never bubble into the body button at all.
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    {s.skill_id !== 'skill-creator' && (
                      <button
                        type="button"
                        className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-md gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted gba:transition-colors"
                        onClick={() => handleToggleFiles(s.skill_id)}
                      >
                        <Folder className="gba:h-3 gba:w-3" />
                        {expandedSkillId === s.skill_id ? 'Hide files' : 'Files'}
                        {s.has_files && s.file_count != null && s.file_count > 0 && (
                          <span
                            className="gba:ml-1 gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:rounded-full gba:border gba:border-primary/30 gba:bg-primary/10 gba:text-primary gba:font-medium"
                            data-testid={`browse-skills-file-count-${s.skill_id}`}
                          >
                            {s.file_count}
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-md gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted gba:transition-colors"
                      title={s.has_files ? `Export ${s.skill_id} as zip` : `Download ${s.skill_id} as .md`}
                      onClick={() => void handleExportSkill(s)}
                    >
                      <UploadSimple className="gba:h-3 gba:w-3 gba:rotate-180" />
                      Export
                    </button>
                    {s.skill_id !== 'skill-creator' && (
                      <>
                        {confirmDeleteId === s.skill_id ? (
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <button
                              type="button"
                              className="gba:px-2 gba:py-1 gba:rounded-md gba:text-[11px] gba:text-destructive gba:bg-destructive/10 gba:hover:bg-destructive/20 gba:transition-colors"
                              onClick={() => void handleDeleteSkill(s.skill_id)}
                              data-testid={`browse-skills-confirm-delete-${s.skill_id}`}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              className="gba:px-2 gba:py-1 gba:rounded-md gba:text-[11px] gba:text-muted-foreground gba:hover:bg-muted gba:transition-colors"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-md gba:text-[11px] gba:text-muted-foreground gba:hover:text-destructive gba:hover:bg-destructive/10 gba:transition-colors"
                            title={`Delete ${s.skill_id}`}
                            disabled={deletingId === s.skill_id}
                            data-testid={`browse-skills-delete-${s.skill_id}`}
                            onClick={() => setConfirmDeleteId(s.skill_id)}
                          >
                            {deletingId === s.skill_id ? (
                              <span className="gba:block gba:h-3 gba:w-3 gba:animate-spin gba:rounded-full gba:border gba:border-current gba:border-t-transparent" />
                            ) : (
                              <Trash className="gba:h-3 gba:w-3" />
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {expandedSkillId === s.skill_id && (
                  <div className="gba:border-t gba:border-border gba:bg-muted/20 gba:px-3 gba:py-2.5 gba:space-y-2">
                    {skillFilesLoading ? (
                      <p className="gba:text-[11px] gba:text-muted-foreground">Loading files…</p>
                    ) : skillFiles.length === 0 ? (
                      <p className="gba:text-[11px] gba:text-muted-foreground">No auxiliary files yet.</p>
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
                      Add files
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
