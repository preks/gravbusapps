import { useCallback } from 'react'
import { PencilIcon, TrashIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import type { AdminSkill } from '../../../types/enterpriseAgent'
import { SkillFiles } from './SkillFiles'
import { SkillTools } from './SkillTools'

interface SkillDetailProps {
  skill: AdminSkill
  canEdit: boolean
  onEdit: (skill: AdminSkill) => void
  onDelete: (skillId: string) => void
  onUploadFile?: (file: File) => void
  onDeleteFile?: (path: string) => void
  onFetchFileBinary?: (path: string) => Promise<Blob>
  onAssignTools?: (toolIds: string[]) => void
  onRemoveTool?: (toolId: string) => void
  uploading?: boolean
}

export const SkillDetail: React.FC<SkillDetailProps> = ({
  skill,
  canEdit,
  onEdit,
  onDelete,
  onUploadFile,
  onDeleteFile,
  onFetchFileBinary,
  onAssignTools,
  onRemoveTool,
  uploading
}) => {
  const handleEdit = useCallback(() => onEdit(skill), [onEdit, skill])
  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete skill "${skill.name}"?`)) {
      onDelete(skill.skill_id)
    }
  }, [onDelete, skill])

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:items-start gba:justify-between">
        <div className="gba:space-y-1">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h3 className="gba:text-lg gba:font-medium gba:text-foreground">{skill.name}</h3>
            <span
              className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium ${
                skill.is_active ? 'gba:bg-green-100 gba:text-green-800' : 'gba:bg-gray-100 gba:text-gray-800'
              }`}
            >
              {skill.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {skill.category && <p className="gba:text-xs gba:text-muted-foreground">Category: {skill.category}</p>}
        </div>
        {canEdit && (
          <div className="gba:flex gba:gap-2">
            <Button size="sm" variant="secondary" onClick={handleEdit} data-testid={`edit-skill-${skill.skill_id}`}>
              <PencilIcon className="gba:h-4 gba:w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} data-testid={`delete-skill-${skill.skill_id}`}>
              <TrashIcon className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="gba:space-y-1">
        <p className="gba:text-sm gba:font-medium gba:text-foreground">Description</p>
        <p className="gba:text-sm gba:text-muted-foreground">{skill.description}</p>
      </div>

      {skill.tags.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-1">
          {skill.tags.map(tag => (
            <span
              key={tag}
              className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-gray-100 gba:px-2 gba:py-0.5 gba:text-xs gba:text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-sm">
        <div>
          <span className="gba:text-muted-foreground">Version:</span>{' '}
          <span className="gba:font-medium">{skill.version}</span>
        </div>
        <div>
          <span className="gba:text-muted-foreground">Status:</span>{' '}
          <span className="gba:font-medium">{skill.status}</span>
        </div>
        <div>
          <span className="gba:text-muted-foreground">Created by:</span>{' '}
          <span className="gba:font-medium">{skill.created_by}</span>
        </div>
        <div>
          <span className="gba:text-muted-foreground">Updated by:</span>{' '}
          <span className="gba:font-medium">{skill.updated_by}</span>
        </div>
      </div>

      {skill.content && (
        <div className="gba:space-y-1">
          <p className="gba:text-sm gba:font-medium gba:text-foreground">Content</p>
          <pre className="gba:max-h-64 gba:overflow-auto gba:rounded-md gba:bg-gray-50 gba:p-3 gba:text-xs">
            {skill.content}
          </pre>
        </div>
      )}

      <SkillFiles
        files={skill.files ?? []}
        canEdit={canEdit}
        onUpload={onUploadFile}
        onDelete={onDeleteFile}
        onFetchBinary={onFetchFileBinary}
        uploading={uploading}
      />

      <SkillTools
        assignedTools={skill.tools ?? []}
        availableTools={skill.available_tools ?? []}
        canEdit={canEdit}
        onAssign={onAssignTools}
        onRemove={onRemoveTool}
      />
    </div>
  )
}
