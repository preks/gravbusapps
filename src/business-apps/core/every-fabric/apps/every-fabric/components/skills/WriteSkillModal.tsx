import { useMemo, useRef, useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { CaretRight, File as FileIcon, UploadSimple, X } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'

type PendingFile = { file: File; targetDir: 'scripts' | 'references' | 'assets' }

function inferTargetDir(filename: string): PendingFile['targetDir'] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['py', 'sh', 'bash', 'js', 'ts', 'mjs', 'cjs', 'rb', 'pl'].includes(ext)) return 'scripts'
  if (['md', 'txt', 'pdf', 'doc', 'docx', 'rst', 'csv'].includes(ext)) return 'references'
  return 'assets'
}

export interface WriteSkillModalProps {
  open: boolean
  onClose: () => void
  accessToken: string
  showToast?: (message: string, variant: 'success' | 'error') => void
}

export const WriteSkillModal: React.FC<WriteSkillModalProps> = ({ open, onClose, accessToken, showToast }) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [skillName, setSkillName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [tipsExpanded, setTipsExpanded] = useState(false)
  const modalFileRef = useRef<HTMLInputElement>(null)

  const skillSlugPreview = useMemo(() => {
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

  if (!open) return null

  const handleReset = () => {
    setSkillName('')
    setDescription('')
    setInstructions('')
    setError('')
    setPendingFiles([])
  }

  const handleSubmit = async () => {
    const slug = skillSlugPreview
    if (!slug || !description.trim() || !instructions.trim()) {
      setError('Skill name, description, and instructions are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await client.createSkillFromForm({
        skillName: slug,
        description: description.trim(),
        instructions: instructions.trim()
      })

      if (pendingFiles.length > 0) {
        const sid = result.skill_id
        const renamedFiles = pendingFiles.map(
          pf => new File([pf.file], `${pf.targetDir}/${pf.file.name}`, { type: pf.file.type })
        )
        try {
          await client.uploadSkillFiles(sid, renamedFiles)
        } catch (fileErr: unknown) {
          const msg = fileErr instanceof Error ? fileErr.message : String(fileErr)
          handleReset()
          onClose()
          showToast?.(`Skill created, but file upload failed: ${msg}. Retry from Browse Skills.`, 'error')
          return
        }
      }

      handleReset()
      onClose()
      showToast?.(
        pendingFiles.length > 0 ? `Skill created with ${pendingFiles.length} file(s).` : 'Skill created.',
        'success'
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/80 gba:backdrop-blur-sm gba:p-4"
      data-testid="write-skill-modal"
    >
      <button
        type="button"
        className="gba:absolute gba:inset-0 gba:cursor-default"
        onClick={onClose}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose()
        }}
        tabIndex={-1}
        aria-label="Close dialog"
      />
      <div className="gba:w-full gba:max-w-md gba:rounded-xl gba:border gba:border-border gba:bg-background gba:shadow-xl gba:flex gba:flex-col gba:max-h-[90vh]">
        <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-4 gba:border-b gba:border-border">
          <h3 className="gba:text-base gba:font-semibold">Write skill instructions</h3>
          <button type="button" className="gba:p-1 gba:rounded gba:hover:bg-muted" onClick={onClose}>
            <X className="gba:h-4 gba:w-4" />
          </button>
        </div>
        <div className="gba:px-5 gba:py-4 gba:space-y-4 gba:overflow-y-auto">
          <div className="gba:rounded-lg gba:border gba:border-border/50 gba:bg-muted/20 gba:overflow-hidden">
            <button
              type="button"
              className="gba:w-full gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
              onClick={() => setTipsExpanded(v => !v)}
            >
              <CaretRight
                className={`gba:h-3 gba:w-3 gba:transition-transform ${tipsExpanded ? 'gba:rotate-90' : ''}`}
              />
              Tips for effective skills
            </button>
            {tipsExpanded && (
              <div className="gba:px-3 gba:pb-3 gba:text-[11px] gba:text-muted-foreground gba:leading-relaxed gba:space-y-1.5">
                <p>
                  <strong>Description</strong> should include what it does AND when to use it:
                </p>
                <p className="gba:pl-2 gba:italic">
                  &quot;Generates weekly status reports. Use when the user asks to summarize progress, write a standup
                  update, or create a weekly recap.&quot;
                </p>
                <p>
                  <strong>Instructions</strong> should include step-by-step guidance, expected output format, and
                  examples in Markdown.
                </p>
                <p>
                  <strong>Name</strong> must be kebab-case (lowercase, hyphens only).
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="write-skill-name" className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
              Skill name
            </label>
            <input
              id="write-skill-name"
              type="text"
              value={skillName}
              onChange={e => setSkillName(e.target.value)}
              className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
              placeholder="weekly-status-report"
              data-testid="write-skill-name"
            />
            {skillSlugPreview && (
              <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-1">
                Will be saved as: <code className="gba:font-mono gba:text-[11px]">{skillSlugPreview}</code>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="write-skill-description" className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
              Description
            </label>
            <Textarea
              id="write-skill-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="gba:resize-none gba:text-sm"
              placeholder="What the skill does. Use when the user asks to [specific phrases]…"
              data-testid="write-skill-description"
            />
          </div>
          <div>
            <label htmlFor="write-skill-instructions" className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
              Instructions
            </label>
            <Textarea
              id="write-skill-instructions"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={6}
              className="gba:resize-none gba:text-sm"
              placeholder="Step-by-step instructions in Markdown. Include expected output format and examples…"
              data-testid="write-skill-instructions"
            />
          </div>
          <div>
            <label htmlFor="write-skill-files" className="gba:block gba:text-xs gba:font-medium gba:mb-1.5">
              Skill files (optional)
            </label>
            <input
              id="write-skill-files"
              ref={modalFileRef}
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
              onClick={() => modalFileRef.current?.click()}
              className="gba:w-full gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground gba:hover:bg-muted/40 gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2"
            >
              <UploadSimple className="gba:h-3.5 gba:w-3.5" />
              Add files (scripts, references, assets)
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
        <div className="gba:flex gba:justify-end gba:gap-2 gba:px-5 gba:py-4 gba:border-t gba:border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={saving}
            data-testid="write-skill-submit"
          >
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}
