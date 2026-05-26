import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { File as FileIcon, Plus, Trash, Wrench, X } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { AddToolsModal } from './AddToolsModal'
import {
  addToolToSkillDraft,
  getToolsFromSkillDraft,
  hasYamlFrontmatter,
  removeAllToolsFromSkillDraft,
  removeToolFromSkillDraft
} from '../renderers/skillDraftUtils'
import { inferTargetDir, formatFileSize } from './skillFileUtils'
import { SkillVersionHistory } from './SkillVersionHistory'
import type { AdminSkill } from '../../types/enterpriseAgent'

export interface SkillEditorPanelProps {
  accessToken: string
  /** The skill to edit. When `null`, the panel renders an empty state. */
  skillId: string | null
  /** Fired after a successful save so parents can refresh list state. */
  onSaved?: (updated: { skill_id: string; name?: string; description?: string }) => void
  /** Fired when the user wants to leave the editor (used on mobile for a back affordance). */
  onClose?: () => void
  showToast?: (message: string, variant: 'success' | 'error') => void
}

/**
 * Right-column editor for a single skill's `SKILL.md`. Mirrors the feature set of the legacy
 * edit modal (content textarea, attached-files list with add/remove) but lives inline in the
 * skills page as a persistent panel.
 */
export const SkillEditorPanel: React.FC<SkillEditorPanelProps> = ({
  accessToken,
  skillId,
  onSaved,
  onClose,
  showToast
}) => {
  const client = useEnterpriseAgentClient(accessToken)

  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [files, setFiles] = useState<{ path: string; mime_type: string; size: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingFilePath, setDeletingFilePath] = useState<string | null>(null)
  const [addToolsModalOpen, setAddToolsModalOpen] = useState(false)
  const [skillHead, setSkillHead] = useState<Pick<AdminSkill, 'version' | 'published_version' | 'is_active'> | null>(
    null
  )
  const [versionHistoryKey, setVersionHistoryKey] = useState(0)
  const [previewingVersion, setPreviewingVersion] = useState<number | null>(null)
  const addFilesRef = useRef<HTMLInputElement>(null)

  const attachedTools = useMemo(() => getToolsFromSkillDraft(content), [content])
  const canEditTools = hasYamlFrontmatter(content)
  const validationMessages = useMemo(() => {
    const messages: string[] = []
    if (!canEditTools) messages.push('Add YAML frontmatter before attaching provider tools.')
    for (const toolRef of attachedTools) {
      if (!/^[a-z_]+\.[A-Za-z0-9_.-]+(@\d+)?$/.test(toolRef)) {
        messages.push(`${toolRef} is not a provider-qualified ref.`)
      }
      if (
        /(delete|remove|cancel|revoke|terminate|send|schedule|submit)/i.test(toolRef) &&
        !/approval_policy|require_approval/i.test(content)
      ) {
        messages.push(`${toolRef} looks write/destructive; add an approval policy before saving for production use.`)
      }
    }
    return messages
  }, [attachedTools, canEditTools, content])

  const applyToolSelection = useCallback(
    (names: string[]) => {
      let draft = removeAllToolsFromSkillDraft(content)
      for (const name of names) draft = addToolToSkillDraft(draft, name)
      setContent(draft)
    },
    [content]
  )

  const handleRemoveTool = useCallback((toolName: string) => {
    setContent(prev => removeToolFromSkillDraft(prev, toolName))
  }, [])

  // Reload content whenever the caller changes the target skill. Swallow stale responses if
  // `skillId` changes again mid-flight by comparing against a local ref.
  const currentSkillRef = useRef<string | null>(null)
  useEffect(() => {
    currentSkillRef.current = skillId
    if (skillId == null) {
      setContent('')
      setSavedContent('')
      setFiles([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setContent('')
    setSavedContent('')
    setFiles([])
    Promise.all([client.getSkill(skillId), client.listSkillFiles(skillId)])
      .then(([doc, fileList]) => {
        if (cancelled || currentSkillRef.current !== skillId) return
        // If the YAML frontmatter has no tools: block but MongoDB tool_refs exist,
        // inject them so the editor chips and AddToolsModal both reflect reality.
        // We set savedContent to this same value so the editor opens in a clean
        // (non-dirty) state — the YAML is now the canonical source.
        let initialContent = doc.content
        const dbToolRefs: string[] = Array.isArray(doc.tool_refs) ? doc.tool_refs : []
        if (dbToolRefs.length > 0 && getToolsFromSkillDraft(initialContent).length === 0) {
          let injected = initialContent
          for (const ref of dbToolRefs) {
            injected = addToolToSkillDraft(injected, ref)
          }
          initialContent = injected
        }
        setContent(initialContent)
        setSavedContent(initialContent)
        setSkillHead({
          version: doc.version,
          published_version: doc.published_version,
          is_active: doc.is_active ?? false
        })
        setPreviewingVersion(null)
        setFiles(fileList)
      })
      .catch(() => {
        if (cancelled || currentSkillRef.current !== skillId) return
        showToast?.('Failed to load skill content', 'error')
      })
      .finally(() => {
        if (cancelled || currentSkillRef.current !== skillId) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [skillId, client, showToast])

  const handleSave = useCallback(async () => {
    if (!skillId) return
    setSaving(true)
    try {
      const doc = await client.saveSkillRaw(skillId, content)
      setSavedContent(doc.content)
      setContent(doc.content)
      setSkillHead({
        version: doc.version,
        published_version: doc.published_version,
        is_active: doc.is_active ?? false
      })
      setPreviewingVersion(null)
      setVersionHistoryKey(k => k + 1)
      showToast?.(`Skill "${skillId}" saved as v${doc.version}`, 'success')
      onSaved?.({ skill_id: doc.skill_id, name: doc.name, description: doc.description })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast?.(`Save failed: ${msg}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [skillId, content, client, onSaved, showToast])

  const handleRevert = useCallback(() => {
    setContent(savedContent)
    setPreviewingVersion(null)
  }, [savedContent])

  const handlePublishCurrent = useCallback(async () => {
    if (!skillId || !skillHead) return
    if (content !== savedContent) {
      showToast?.('Save the current draft before publishing.', 'error')
      return
    }
    setSaving(true)
    try {
      const doc = await client.publishSkillVersion(skillId, skillHead.version)
      setSkillHead({
        version: doc.version,
        published_version: doc.published_version,
        is_active: doc.is_active ?? true
      })
      setVersionHistoryKey(k => k + 1)
      showToast?.(`Published v${doc.published_version ?? doc.version}`, 'success')
      onSaved?.({ skill_id: doc.skill_id, name: doc.name, description: doc.description })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast?.(`Publish failed: ${msg}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [skillId, skillHead, content, savedContent, client, onSaved, showToast])

  const handleDeleteFile = useCallback(
    async (path: string) => {
      if (!skillId) return
      setDeletingFilePath(path)
      try {
        await client.deleteSkillFile(skillId, path)
        setFiles(prev => prev.filter(f => f.path !== path))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Failed to delete file: ${msg}`, 'error')
      } finally {
        setDeletingFilePath(null)
      }
    },
    [skillId, client, showToast]
  )

  const handleAddFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = Array.from(e.target.files ?? [])
      e.target.value = ''
      if (newFiles.length === 0 || !skillId) return
      const renamedFiles = newFiles.map(f => new File([f], `${inferTargetDir(f.name)}/${f.name}`, { type: f.type }))
      try {
        const uploaded = await client.uploadSkillFiles(skillId, renamedFiles)
        setFiles(prev => [...prev, ...uploaded])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`File upload failed: ${msg}`, 'error')
      }
    },
    [skillId, client, showToast]
  )

  if (skillId == null) {
    return (
      <div
        className="gba:h-full gba:flex gba:items-center gba:justify-center gba:px-6 gba:py-10"
        data-testid="skill-editor-empty"
      >
        <div className="gba:max-w-sm gba:text-center gba:space-y-1">
          <p className="gba:text-sm gba:font-medium gba:text-foreground">Select a skill to edit</p>
          <p className="gba:text-xs gba:text-muted-foreground">
            Pick a skill from the list to view and edit its <code className="gba:font-mono">SKILL.md</code>.
          </p>
        </div>
      </div>
    )
  }

  const isDirty = content !== savedContent

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="skill-editor-panel" data-skill-id={skillId}>
      <div className="gba:shrink-0 gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-4 sm:gba:px-6 gba:py-4 gba:border-b gba:border-border/50">
        <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
          <h2 className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">
            Edit <code className="gba:font-mono gba:text-sm">{skillId}</code>
          </h2>
          {skillHead && (
            <span
              className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-border gba:bg-muted/40 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground"
              data-testid="skill-editor-version-badge"
            >
              draft v{skillHead.version}
              {skillHead.published_version != null ? ` · pub v${skillHead.published_version}` : ' · unpublished'}
            </span>
          )}
          {isDirty && (
            <span
              className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-primary/30 gba:bg-primary/10 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary"
              data-testid="skill-editor-dirty"
            >
              Unsaved
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            className="gba:inline-flex gba:p-1 gba:rounded gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted"
            onClick={onClose}
            aria-label="Clear selection"
            data-testid="skill-editor-clear"
          >
            <X className="gba:h-4 gba:w-4" />
          </button>
        )}
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-4 sm:gba:px-6 gba:py-4 gba:space-y-4">
        {loading ? (
          <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">Loading…</p>
        ) : (
          <>
            <div>
              <label className="gba:block gba:text-xs gba:font-medium gba:mb-1.5" htmlFor="skill-editor-content">
                SKILL.md
              </label>
              <textarea
                id="skill-editor-content"
                data-testid="skill-editor-textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="gba:w-full gba:min-h-[20rem] gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:px-4 gba:py-3 gba:text-sm gba:font-mono gba:leading-relaxed gba:resize-y gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-primary/30"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
                Tools
                {attachedTools.length > 0 && (
                  <span className="gba:ml-1.5 gba:text-muted-foreground gba:font-normal">({attachedTools.length})</span>
                )}
              </label>
              <button
                type="button"
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:px-2.5 gba:py-1.5 gba:text-xs gba:text-foreground gba:border gba:border-border gba:bg-background gba:hover:bg-muted gba:transition-colors gba:disabled:opacity-50 gba:disabled:cursor-not-allowed"
                onClick={() => setAddToolsModalOpen(true)}
                disabled={!canEditTools}
                title={
                  canEditTools
                    ? 'Attach function tools to this skill'
                    : 'Add a YAML frontmatter block (---) to this SKILL.md to attach tools'
                }
                data-testid="skill-editor-add-tool"
              >
                <Wrench className="gba:h-3.5 gba:w-3.5" />
                Add Tool to Skill
                {attachedTools.length > 0 && (
                  <span className="gba:rounded-full gba:bg-primary/15 gba:px-1.5 gba:text-[10px] gba:font-semibold gba:text-primary">
                    {attachedTools.length}
                  </span>
                )}
              </button>
              {attachedTools.length > 0 && (
                <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:pt-2">
                  {attachedTools.map(toolName => (
                    <span
                      key={toolName}
                      className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-border gba:bg-muted/40 gba:px-2.5 gba:py-0.5 gba:text-xs gba:text-foreground"
                      data-testid={`skill-editor-tool-chip-${toolName}`}
                    >
                      {toolName}
                      <button
                        type="button"
                        className="gba:ml-0.5 gba:text-muted-foreground gba:hover:text-destructive"
                        onClick={() => handleRemoveTool(toolName)}
                        data-testid={`skill-editor-tool-chip-remove-${toolName}`}
                        aria-label={`Remove ${toolName}`}
                      >
                        <X className="gba:h-3 gba:w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="gba:mt-2 gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:p-2.5">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <p className="gba:text-[11px] gba:font-semibold gba:text-foreground">Validation summary</p>
                  <button
                    type="button"
                    className="gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline"
                    onClick={() => {
                      showToast?.(
                        validationMessages.length === 0
                          ? 'Skill graph validation passed. Save the skill, attach it to an expert, then run a test task from Agents.'
                          : `Validation found ${validationMessages.length} issue(s).`,
                        validationMessages.length === 0 ? 'success' : 'error'
                      )
                    }}
                  >
                    Test graph
                  </button>
                </div>
                {validationMessages.length === 0 ? (
                  <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
                    Tool refs are valid and no obvious approval gaps were detected.
                  </p>
                ) : (
                  <ul className="gba:mt-1 gba:list-disc gba:pl-4 gba:text-[11px] gba:text-amber-700">
                    {validationMessages.slice(0, 4).map(message => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </div>
              {!canEditTools && (
                <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-1.5">
                  This SKILL.md has no YAML frontmatter. Add a <code className="gba:font-mono">---</code> block at the
                  top to attach tools.
                </p>
              )}
            </div>

            <div>
              <label className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
                Attach files to Skill (optional)
                {files.length > 0 && (
                  <span className="gba:ml-1.5 gba:text-muted-foreground gba:font-normal">({files.length})</span>
                )}
              </label>
              <input
                ref={addFilesRef}
                type="file"
                multiple
                className="gba:hidden"
                onChange={e => void handleAddFiles(e)}
              />
              <button
                type="button"
                onClick={() => addFilesRef.current?.click()}
                className="gba:w-full gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground gba:hover:bg-muted/40 gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2"
              >
                <Plus className="gba:h-3.5 gba:w-3.5" />
                Add files (scripts, references, assets)
              </button>
              {files.length > 0 && (
                <div className="gba:mt-2 gba:space-y-1 gba:max-h-32 gba:overflow-y-auto">
                  {files.map(f => (
                    <div
                      key={f.path}
                      className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:rounded-md gba:border gba:border-border gba:px-2.5 gba:py-1.5"
                    >
                      <FileIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:shrink-0" />
                      <span className="gba:flex-1 gba:truncate gba:text-foreground gba:font-mono">{f.path}</span>
                      <span className="gba:text-muted-foreground gba:shrink-0 gba:text-[11px]">
                        {formatFileSize(f.size)}
                      </span>
                      <button
                        type="button"
                        className="gba:p-0.5 gba:rounded gba:text-muted-foreground gba:hover:text-destructive gba:shrink-0"
                        title={`Delete ${f.path}`}
                        disabled={deletingFilePath === f.path}
                        onClick={() => handleDeleteFile(f.path)}
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
            </div>

            <SkillVersionHistory
              accessToken={accessToken}
              skillId={skillId}
              head={skillHead}
              refreshKey={versionHistoryKey}
              publishDisabled={isDirty}
              publishDisabledReason="Save the current draft before publishing a version."
              showToast={showToast}
              onPreviewVersion={(version, historical) => {
                setPreviewingVersion(version)
                setContent(historical)
              }}
              onRestored={() => {
                setPreviewingVersion(null)
                setVersionHistoryKey(k => k + 1)
                if (skillId) {
                  void client.getSkill(skillId).then(doc => {
                    setContent(doc.content)
                    setSavedContent(doc.content)
                    setSkillHead({
                      version: doc.version,
                      published_version: doc.published_version,
                      is_active: doc.is_active ?? false
                    })
                  })
                }
                onSaved?.({ skill_id: skillId })
              }}
              onPublished={() => {
                setVersionHistoryKey(k => k + 1)
                if (skillId) {
                  void client.getSkill(skillId).then(doc => {
                    setSkillHead({
                      version: doc.version,
                      published_version: doc.published_version,
                      is_active: doc.is_active ?? false
                    })
                  })
                }
                onSaved?.({ skill_id: skillId })
              }}
            />
            {previewingVersion != null && (
              <p className="gba:text-[11px] gba:text-amber-700" data-testid="skill-editor-preview-banner">
                Previewing historical v{previewingVersion}. Save is disabled until you restore or revert.
              </p>
            )}
          </>
        )}
      </div>

      <div className="gba:shrink-0 gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-4 sm:gba:px-6 gba:py-3 gba:border-t gba:border-border/50 gba:bg-muted/10">
        <button
          type="button"
          className="gba:px-3 gba:py-1.5 gba:rounded-md gba:border gba:border-border gba:text-xs gba:text-muted-foreground gba:hover:bg-muted gba:transition-colors gba:disabled:opacity-50"
          onClick={handleRevert}
          disabled={!isDirty || saving || loading}
          data-testid="skill-editor-revert"
        >
          Revert
        </button>
        {skillHead && (
          <button
            type="button"
            className="gba:px-3 gba:py-1.5 gba:rounded-md gba:border gba:border-primary/40 gba:text-xs gba:text-primary gba:hover:bg-primary/10 gba:disabled:opacity-50"
            disabled={saving || loading || previewingVersion != null || isDirty}
            title={isDirty ? 'Save the current draft before publishing.' : undefined}
            onClick={() => void handlePublishCurrent()}
            data-testid="skill-editor-publish"
          >
            Publish v{skillHead.version}
          </button>
        )}
        <button
          type="button"
          className="gba:px-3 gba:py-1.5 gba:rounded-md gba:bg-primary gba:text-primary-foreground gba:text-xs gba:hover:bg-primary/90 gba:transition-colors gba:disabled:opacity-50"
          disabled={saving || loading || !isDirty || previewingVersion != null}
          onClick={() => void handleSave()}
          data-testid="skill-editor-save"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>
      </div>

      <AddToolsModal
        open={addToolsModalOpen}
        onClose={() => setAddToolsModalOpen(false)}
        accessToken={accessToken}
        alreadySelected={attachedTools}
        onAdd={applyToolSelection}
      />
    </div>
  )
}
