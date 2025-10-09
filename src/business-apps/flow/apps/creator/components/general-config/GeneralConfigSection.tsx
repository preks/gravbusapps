import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { AssignmentMode } from '../../types/flowTemplate'
import { ReminderConfig } from './ReminderConfig'
import { EscalationConfig } from './EscalationConfig'
import {
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'

/**
 * General configuration section for the flow template
 */
export const GeneralConfigSection: React.FC = () => {
  const { flowTemplate, updateTitle, updateDescription, updateAssignmentMode, updateType } = useFlowTemplateStore()

  return (
    <div className="gba:space-y-8" data-testid="general-config-section">
      {/* Basic Information */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
          {getTranslationFromI18nKeyAndLabel('flow.creator.general.basic_info', 'Basic Information')}
        </h3>

        <div className="gba:grid gba:grid-cols-1 gba:gap-4">
          {/* Template Name */}
          <div className="gba:space-y-2">
            <Label htmlFor="template-name">
              {getTranslationFromI18nKeyAndLabel('flow.creator.general.template_name', 'Definition Name')}
            </Label>
            <Input
              id="template-name"
              value={flowTemplate.name}
              onChange={e => updateTitle(e.target.value)}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'flow.creator.general.template_name_placeholder',
                'Enter definition name'
              )}
              data-testid="template-name-input"
            />
          </div>

          {/* Template Description */}
          <div className="gba:space-y-2">
            <Label htmlFor="template-description">
              {getTranslationFromI18nKeyAndLabel('flow.creator.general.template_description', 'Definition Description')}
            </Label>
            <Textarea
              id="template-description"
              value={flowTemplate.description || ''}
              onChange={e => updateDescription(e.target.value)}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'flow.creator.general.template_description_placeholder',
                'Enter definition description'
              )}
              rows={3}
              data-testid="template-description-input"
            />
          </div>

          {/* Template Type */}
          <div className="gba:space-y-2">
            <Label htmlFor="template-type">
              {getTranslationFromI18nKeyAndLabel('flow.creator.general.template_type', 'Definition Type')}
            </Label>
            <Select
              value={flowTemplate.type}
              onValueChange={(value: 'TEMPLATE' | 'SELF_SERVICE') => updateType(value)}
              data-testid="template-type-select"
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'flow.creator.general.select_template_type',
                    'Select definition type'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEMPLATE">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.general.template_type_template', 'Definition')}
                </SelectItem>
                <SelectItem value="SELF_SERVICE">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.general.template_type_self_service', 'Self-Service')}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="gba:text-sm gba:text-gray-500">
              {flowTemplate.type === 'TEMPLATE'
                ? getTranslationFromI18nKeyAndLabel(
                    'flow.creator.general.template_type_template_description',
                    'Definition flows require configuration before execution'
                  )
                : getTranslationFromI18nKeyAndLabel(
                    'flow.creator.general.template_type_self_service_description',
                    'Self-service flows can be launched directly with predefined inputs'
                  )}
            </p>
          </div>

          {/* Assignment Mode */}
          <div className="gba:space-y-2">
            <Label htmlFor="assignment-mode">
              {getTranslationFromI18nKeyAndLabel('flow.creator.general.assignment_mode', 'Assignment Mode')}
            </Label>
            <Select
              value={flowTemplate.assignmentMode}
              onValueChange={(value: AssignmentMode) => updateAssignmentMode(value)}
              data-testid="assignment-mode-select"
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'flow.creator.general.select_assignment_mode',
                    'Select assignment mode'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AssignmentMode.CLAIM}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.general.assignment_mode_claim', 'Claim')}
                </SelectItem>
                <SelectItem value={AssignmentMode.ASSIGN}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.general.assignment_mode_assign', 'Assign')}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="gba:text-sm gba:text-gray-500">
              {flowTemplate.assignmentMode === AssignmentMode.CLAIM
                ? getTranslationFromI18nKeyAndLabel(
                    'flow.creator.general.assignment_mode_claim_description',
                    'Tasks must be claimed before execution'
                  )
                : getTranslationFromI18nKeyAndLabel(
                    'flow.creator.general.assignment_mode_assign_description',
                    'Tasks are directly assigned to users'
                  )}
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Configuration */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
          {getTranslationFromI18nKeyAndLabel('flow.creator.general.advanced_config', 'Advanced Configuration')}
        </h3>

        <div className="gba:space-y-6">
          <ReminderConfig />
          <EscalationConfig />
        </div>
      </div>
    </div>
  )
}
