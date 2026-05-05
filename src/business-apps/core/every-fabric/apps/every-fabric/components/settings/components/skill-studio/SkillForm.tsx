import { useCallback, useMemo, useState } from 'react'
import { Button, Input, Textarea } from '@newwork/nw-design-system'
import type { AdminSkill, CreateSkillPayload, UpdateSkillPayload } from '../../../types/enterpriseAgent'

interface SkillFormProps {
  skill?: AdminSkill | null
  onSave: (payload: CreateSkillPayload | UpdateSkillPayload) => void
  onCancel: () => void
  isSaving?: boolean
}

export const SkillForm: React.FC<SkillFormProps> = ({ skill, onSave, onCancel, isSaving }) => {
  const isEdit = Boolean(skill)

  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [category, setCategory] = useState(skill?.category ?? '')
  const [tags, setTags] = useState(skill?.tags?.join(', ') ?? '')
  const [body, setBody] = useState(skill?.content ?? '')
  const [compatibility, setCompatibility] = useState(skill?.compatibility ?? '')

  const canSubmit = useMemo(() => name.trim() && description.trim(), [name, description])

  const handleSave = useCallback(() => {
    const payload: UpdateSkillPayload = {
      name: name.trim(),
      description: description.trim(),
      body: body.trim() || undefined,
      category: category.trim() || undefined,
      tags: tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      compatibility: compatibility.trim() || undefined
    }
    onSave(payload)
  }, [name, description, body, category, tags, compatibility, onSave])

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-medium gba:text-foreground">{isEdit ? 'Edit Skill' : 'New Skill'}</h3>
        <Button variant="ghost" onClick={onCancel} data-testid="cancel-skill-form">
          Cancel
        </Button>
      </div>

      <div className="gba:space-y-3">
        <Input
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Skill name"
          data-testid="skill-name-input"
        />
        <Input
          label="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="e.g. crm, finance, general"
          data-testid="skill-category-input"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Short description"
          rows={3}
          data-testid="skill-description-input"
        />
        <Input
          label="Tags (comma-separated)"
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="crm, sales, automation"
          data-testid="skill-tags-input"
        />
        <Input
          label="Compatibility"
          value={compatibility}
          onChange={e => setCompatibility(e.target.value)}
          placeholder="e.g. prompt-manager>=0.9.0"
          data-testid="skill-compatibility-input"
        />
        <Textarea
          label="Content (Markdown)"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="# Skill instructions..."
          rows={10}
          data-testid="skill-content-input"
        />
      </div>

      <div className="gba:flex gba:justify-end gba:gap-2">
        <Button variant="secondary" onClick={onCancel} data-testid="cancel-skill-btn">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSubmit || isSaving} data-testid="save-skill-btn">
          {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Skill'}
        </Button>
      </div>
    </div>
  )
}
