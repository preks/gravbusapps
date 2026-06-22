import { useCallback, useMemo, useState } from 'react'
import { Button, Input, Textarea, useTranslation } from '@newwork/nw-design-system'
import type { AdminSkill, CreateSkillPayload, UpdateSkillPayload } from '../../../../types/enterpriseAgent'
import translations from '../../../../_i18n'

interface SkillFormProps {
  skill?: AdminSkill | null
  onSave: (payload: CreateSkillPayload | UpdateSkillPayload) => void
  onCancel: () => void
  isSaving?: boolean
}

export const SkillForm: React.FC<SkillFormProps> = ({ skill, onSave, onCancel, isSaving }) => {
  const { t } = useTranslation(translations)
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
        .map(tag => tag.trim())
        .filter(Boolean),
      compatibility: compatibility.trim() || undefined
    }
    onSave(payload)
  }, [name, description, body, category, tags, compatibility, onSave])

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-medium gba:text-foreground">
          {isEdit ? t('settings-skill-studio-edit-title') : t('settings-skill-studio-new-title')}
        </h3>
        <Button variant="ghost" onClick={onCancel} data-testid="cancel-skill-form">
          {t('action-cancel')}
        </Button>
      </div>

      <div className="gba:space-y-3">
        <Input
          label={t('settings-skill-studio-field-name')}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('settings-skill-studio-field-name-placeholder')}
          data-testid="skill-name-input"
        />
        <Input
          label={t('settings-skill-studio-field-category')}
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder={t('settings-skill-studio-field-category-placeholder')}
          data-testid="skill-category-input"
        />
        <Textarea
          label={t('settings-skill-studio-field-description')}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('settings-skill-studio-field-description-placeholder')}
          rows={3}
          data-testid="skill-description-input"
        />
        <Input
          label={t('settings-skill-studio-field-tags')}
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder={t('settings-skill-studio-field-tags-placeholder')}
          data-testid="skill-tags-input"
        />
        <Input
          label={t('settings-skill-studio-field-compatibility')}
          value={compatibility}
          onChange={e => setCompatibility(e.target.value)}
          placeholder={t('settings-skill-studio-field-compatibility-placeholder')}
          data-testid="skill-compatibility-input"
        />
        <Textarea
          label={t('settings-skill-studio-field-content')}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={t('settings-skill-studio-field-content-placeholder')}
          rows={10}
          data-testid="skill-content-input"
        />
      </div>

      <div className="gba:flex gba:justify-end gba:gap-2">
        <Button variant="secondary" onClick={onCancel} data-testid="cancel-skill-btn">
          {t('action-cancel')}
        </Button>
        <Button onClick={handleSave} disabled={!canSubmit || isSaving} data-testid="save-skill-btn">
          {isSaving
            ? t('settings-skill-studio-saving')
            : isEdit
              ? t('settings-skill-studio-save-changes')
              : t('settings-skill-studio-create')}
        </Button>
      </div>
    </div>
  )
}
