import { GearIcon } from '@phosphor-icons/react'
import { SectionHeader } from '../SettingsShared'
import { useSkillAdmin } from './useSkillAdmin'
import { SkillList } from './SkillList'
import { SkillForm } from './SkillForm'
import { SkillDetail } from './SkillDetail'
import { useAdminSkillClient } from '../../../../hooks/useAdminSkillClient'

interface SkillStudioSectionProps {
  accessToken: string
}

export const SkillStudioSection: React.FC<SkillStudioSectionProps> = ({ accessToken }) => {
  const client = useAdminSkillClient(accessToken)
  const admin = useSkillAdmin(client)

  return (
    <div className="gba:space-y-4" data-testid="skill-studio-section">
      <SectionHeader
        icon={<GearIcon className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />}
        title="Skill Studio"
      />

      {admin.view === 'list' && (
        <SkillList
          skills={admin.skills}
          total={admin.total}
          isLoading={admin.isLoading}
          searchQuery={admin.searchQuery}
          onSearch={admin.handleSearch}
          onCreate={admin.navigateToCreate}
          onView={admin.loadSkillDetail}
          error={admin.error}
          onClearError={admin.clearError}
        />
      )}

      {admin.view === 'create' && (
        <SkillForm onSave={admin.createSkill} onCancel={admin.navigateToList} isSaving={admin.isLoading} />
      )}

      {admin.view === 'edit' && admin.selectedSkill && (
        <SkillForm
          skill={admin.selectedSkill}
          onSave={payload => admin.updateSkill(admin.selectedSkill!.skill_id, payload)}
          onCancel={admin.navigateToList}
          isSaving={admin.isLoading}
        />
      )}

      {admin.view === 'detail' && admin.selectedSkill && (
        <SkillDetail
          skill={admin.selectedSkill}
          canEdit
          onEdit={admin.navigateToEdit}
          onDelete={admin.deleteSkill}
          onUploadFile={file => admin.uploadFile(admin.selectedSkill!.skill_id, file)}
          onDeleteFile={path => admin.removeFile(admin.selectedSkill!.skill_id, path)}
          onFetchFileBinary={path => client.fetchSkillFileBinary(admin.selectedSkill!.skill_id, path)}
          onAssignTools={toolIds => admin.assignTools(admin.selectedSkill!.skill_id, toolIds)}
          onRemoveTool={toolId => admin.removeTool(admin.selectedSkill!.skill_id, toolId)}
          uploading={admin.isLoading}
        />
      )}
    </div>
  )
}
