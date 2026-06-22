import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { CaretRight, File as FileIcon, UploadSimple, Wrench, X } from '@phosphor-icons/react'
import translations from '../../_i18n'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { addToolToSkillDraft } from '../renderers/skillDraftUtils'
import { AddToolsModal } from './AddToolsModal'
import { inferTargetDir, type SkillFileDir } from './skillFileUtils'

type PendingFile = { file: File; targetDir: SkillFileDir }

export interface CreateSkillPanelProps {
  accessToken: string
  onClose: () => void
  onCreated?: (skillId: string) => void
  showToast?: (message: string, variant: 'success' | 'error') => void
}

export const CreateSkillPanel: React.FC<CreateSkillPanelProps> = ({ accessToken, onClose, onCreated, showToast }) => {
  const { t } = useTranslation(translations)
  const client = useEnterpriseAgentClient(accessToken)
  const [skillName, setSkillName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [tipsExpanded, setTipsExpanded] = useState(false)
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [addToolsModalOpen, setAddToolsModalOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const slug = useMemo(() => {
    const raw = skillName.trim()
    if (!raw) return ''
    return (
      raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 128) || 'custom-skill'
    )
  }, [skillName])

  const handleSubmit = useCallback(async () => {
    if (!slug || !description.trim() || !instructions.trim()) {
      setError('Skill name, description, and instructions are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await client.createSkillFromForm({
        name: slug,
        description: description.trim(),
        body: instructions.trim()
      })

      if (selectedTools.length > 0) {
        try {
          const doc = await client.getSkill(result.skill_id)
          let content: string = doc.content
          for (const tool of selectedTools) content = addToolToSkillDraft(content, tool)
          await client.saveSkillRaw(result.skill_id, content)
        } catch (toolErr: unknown) {
          const msg = toolErr instanceof Error ? toolErr.message : String(toolErr)
          showToast?.(`Skill created, but tool attachment failed: ${msg}`, 'error')
          onCreated?.(result.skill_id)
          return
        }
      }

      if (pendingFiles.length > 0) {
        const renamedFiles = pendingFiles.map(
          pf => new File([pf.file], `${pf.targetDir}/${pf.file.name}`, { type: pf.file.type })
        )
        try {
          await client.uploadSkillFiles(result.skill_id, renamedFiles)
        } catch (fileErr: unknown) {
          const msg = fileErr instanceof Error ? fileErr.message : String(fileErr)
          showToast?.(`Skill created, but file upload failed: ${msg}`, 'error')
          onCreated?.(result.skill_id)
          return
        }
      }

      showToast?.(
        pendingFiles.length > 0 ? `Skill created with ${pendingFiles.length} file(s).` : 'Skill created.',
        'success'
      )
      onCreated?.(result.skill_id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }, [slug, description, instructions, selectedTools, pendingFiles, client, showToast, onCreated])

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="create-skill-panel">
      <div className="gba:shrink-0 gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-4 sm:gba:px-6 gba:py-4 gba:border-b gba:border-border/50">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('skills-create-title')}</h2>
        <button
          type="button"
          className="gba:inline-flex gba:p-1 gba:rounded gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted"
          onClick={onClose}
          aria-label={t('skills-create-cancel-aria')}
        >
          <X className="gba:h-4 gba:w-4" />
        </button>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-4 sm:gba:px-6 gba:py-4 gba:space-y-4">
        <div className="gba:rounded-lg gba:border gba:border-border/50 gba:bg-muted/20 gba:overflow-hidden">
          <button
            type="button"
            className="gba:w-full gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
            onClick={() => setTipsExpanded(v => !v)}
          >
            <CaretRight className={`gba:h-3 gba:w-3 gba:transition-transform ${tipsExpanded ? 'gba:rotate-90' : ''}`} />
            Tips for effective skills
          </button>
          {tipsExpanded && (
            <div className="gba:px-3 gba:pb-3 gba:text-[11px] gba:text-muted-foreground gba:leading-relaxed gba:space-y-1.5">
              <p>
                <strong>{t('skills-create-name')}</strong> must be kebab-case (lowercase, hyphens only).
              </p>
              <p>
                <strong>{t('skills-create-description')}</strong> should include what it does AND when to use it:
              </p>
              <p className="gba:pl-2 gba:italic">
                &quot;Generates weekly status reports. Use when the user asks to summarize progress, write a standup
                update, or create a weekly recap.&quot;
              </p>
              <p>
                <strong>{t('skills-create-instructions')}</strong> should include step-by-step guidance, expected output
                format, and examples in Markdown.
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="create-skill-name" className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
            {t('skills-create-name')}
          </label>
          <input
            id="create-skill-name"
            type="text"
            value={skillName}
            onChange={e => setSkillName(e.target.value)}
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
            placeholder="weekly-status-report"
            data-testid="create-skill-name"
          />
          {slug && (
            <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-1">
              {t('skills-create-will-save-as')}: <code className="gba:font-mono gba:text-[11px]">{slug}</code>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="create-skill-description" className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
            {t('skills-create-description')}
          </label>
          <textarea
            id="create-skill-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:resize-none"
            placeholder="What the skill does. Use when the user asks to [specific phrases]…"
            data-testid="create-skill-description"
          />
        </div>

        <div>
          <label htmlFor="create-skill-instructions" className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
            {t('skills-create-instructions')}
          </label>
          <textarea
            id="create-skill-instructions"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={8}
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:font-mono gba:resize-none"
            placeholder="Step-by-step instructions in Markdown. Include expected output format and examples…"
            data-testid="create-skill-instructions"
          />
        </div>

        <div>
          <label className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
            {t('skills-create-tools')}
            {selectedTools.length > 0 && (
              <span className="gba:ml-1.5 gba:text-muted-foreground gba:font-normal">({selectedTools.length})</span>
            )}
          </label>
          <button
            type="button"
            className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:px-2.5 gba:py-1.5 gba:text-xs gba:text-foreground gba:border gba:border-border gba:bg-background gba:hover:bg-muted gba:transition-colors"
            onClick={() => setAddToolsModalOpen(true)}
            data-testid="create-skill-add-tool"
          >
            <Wrench className="gba:h-3.5 gba:w-3.5" />
            {t('skills-create-add-tool')}
            {selectedTools.length > 0 && (
              <span className="gba:rounded-full gba:bg-primary/15 gba:px-1.5 gba:text-[10px] gba:font-semibold gba:text-primary">
                {selectedTools.length}
              </span>
            )}
          </button>
          {selectedTools.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:pt-2">
              {selectedTools.map(toolName => (
                <span
                  key={toolName}
                  className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-border gba:bg-muted/40 gba:px-2.5 gba:py-0.5 gba:text-xs gba:text-foreground"
                >
                  {toolName}
                  <button
                    type="button"
                    className="gba:ml-0.5 gba:text-muted-foreground gba:hover:text-destructive"
                    onClick={() => setSelectedTools(prev => prev.filter(t => t !== toolName))}
                    aria-label={`Remove ${toolName}`}
                  >
                    <X className="gba:h-3 gba:w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">{t('skills-create-attach-files')}</label>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="gba:hidden"
            onChange={e => {
              const fileList = e.target.files
              e.target.value = ''
              if (!fileList || fileList.length === 0) return
              const newFiles: PendingFile[] = Array.from(fileList).map(f => ({
                file: f,
                targetDir: inferTargetDir(f.name)
              }))
              setPendingFiles(prev => [...prev, ...newFiles])
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="gba:w-full gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground gba:hover:bg-muted/40 gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2"
          >
            <UploadSimple className="gba:h-3.5 gba:w-3.5" />
            {t('skills-create-attach-files')}
          </button>
          {pendingFiles.length > 0 && (
            <div className="gba:mt-2 gba:space-y-1.5">
              {pendingFiles.map((pf, idx) => (
                <div
                  key={`${pf.file.name}-${idx}`}
                  className="gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-border gba:px-2.5 gba:py-1.5 gba:text-xs"
                >
                  <FileIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:shrink-0" />
                  <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-1.5">
                    <select
                      value={pf.targetDir}
                      onChange={e => {
                        const dir = e.target.value as PendingFile['targetDir']
                        setPendingFiles(prev => prev.map((f, i) => (i === idx ? { ...f, targetDir: dir } : f)))
                      }}
                      className="gba:rounded gba:border gba:border-border gba:bg-background gba:px-1 gba:py-0.5 gba:text-[11px]"
                    >
                      <option value="scripts">scripts/</option>
                      <option value="references">references/</option>
                      <option value="assets">assets/</option>
                    </select>
                    <span className="gba:truncate gba:text-foreground">{pf.file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="gba:p-0.5 gba:rounded gba:text-muted-foreground gba:hover:text-destructive gba:shrink-0"
                  >
                    <X className="gba:h-3 gba:w-3" />
                  </button>
                </div>
              ))}
              <p className="gba:text-[10px] gba:text-muted-foreground">
                {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} will be uploaded after skill creation
              </p>
            </div>
          )}
        </div>

        {error && <p className="gba:text-xs gba:text-destructive">{error}</p>}
      </div>

      <div className="gba:shrink-0 gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-4 sm:gba:px-6 gba:py-3 gba:border-t gba:border-border/50 gba:bg-muted/10">
        <button
          type="button"
          className="gba:px-3 gba:py-1.5 gba:rounded-md gba:border gba:border-border gba:text-xs gba:text-muted-foreground gba:hover:bg-muted gba:transition-colors"
          onClick={onClose}
        >
          {t('skills-create-cancel')}
        </button>
        <button
          type="button"
          className="gba:px-3 gba:py-1.5 gba:rounded-md gba:bg-primary gba:text-primary-foreground gba:text-xs gba:hover:bg-primary/90 gba:transition-colors gba:disabled:opacity-50"
          disabled={saving}
          onClick={() => void handleSubmit()}
          data-testid="create-skill-submit"
        >
          {saving ? t('skills-create-creating') : t('skills-create-submit')}
        </button>
      </div>

      <AddToolsModal
        open={addToolsModalOpen}
        onClose={() => setAddToolsModalOpen(false)}
        accessToken={accessToken}
        alreadySelected={selectedTools}
        onAdd={setSelectedTools}
      />
    </div>
  )
}
