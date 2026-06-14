import React from 'react'
import { Input, Label, Textarea } from '@newwork/nw-design-system'
import MultiEmployeeSelect from '@/components/multi-employee-select/MultiEmployeeSelect'
import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'

// TODO(customer-feedback): Validate these settings against final reusable survey/template UX before exposing the tab.
interface CustomFeedbackSurveySettingsProps {
  accessToken: string
  surveyName: string
  templateId: string
  accountIdsText: string
  namespaceValue: string
  campaignId: string
  metadataText: string
  assigneeIds: string[]
  t: (key: string) => string
  onSurveyNameChange: (value: string) => void
  onTemplateIdChange: (value: string) => void
  onAccountIdsTextChange: (value: string) => void
  onNamespaceValueChange: (value: string) => void
  onCampaignIdChange: (value: string) => void
  onMetadataTextChange: (value: string) => void
  onAssigneeIdsChange: (value: string[]) => void
  onAssigneeEmployeesChange: (employees: EmployeeLiteOption[]) => void
}

const CustomFeedbackSurveySettings: React.FC<CustomFeedbackSurveySettingsProps> = ({
  accessToken,
  surveyName,
  templateId,
  accountIdsText,
  namespaceValue,
  campaignId,
  metadataText,
  assigneeIds,
  t,
  onSurveyNameChange,
  onTemplateIdChange,
  onAccountIdsTextChange,
  onNamespaceValueChange,
  onCampaignIdChange,
  onMetadataTextChange,
  onAssigneeIdsChange,
  onAssigneeEmployeesChange
}) => (
  <>
    <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
      <div className="gba:space-y-2">
        <Label htmlFor="feedback-survey-name">{t('feedback-survey-name')}</Label>
        <Input
          id="feedback-survey-name"
          value={surveyName}
          onChange={event => onSurveyNameChange(event.target.value)}
          data-testid="customer-360-feedback-survey-name"
        />
      </div>
      <div className="gba:space-y-2">
        <Label htmlFor="feedback-template-id">{t('feedback-template-id')}</Label>
        <Input
          id="feedback-template-id"
          value={templateId}
          onChange={event => onTemplateIdChange(event.target.value)}
          data-testid="customer-360-feedback-template-id"
        />
      </div>
    </div>

    <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
      <div className="gba:space-y-2">
        <Label htmlFor="feedback-account-ids">{t('feedback-account-ids')}</Label>
        <Textarea
          id="feedback-account-ids"
          value={accountIdsText}
          onChange={event => onAccountIdsTextChange(event.target.value)}
          data-testid="customer-360-feedback-account-ids"
        />
        <p className="gba:text-xs gba:text-muted-foreground">{t('feedback-account-ids-help')}</p>
      </div>
      <div className="gba:space-y-2">
        <Label>{t('feedback-assignees')}</Label>
        <MultiEmployeeSelect
          accessToken={accessToken}
          value={assigneeIds}
          onValueChange={onAssigneeIdsChange}
          onEmployeesChange={onAssigneeEmployeesChange}
          data-testid="customer-360-feedback-assignees"
        />
      </div>
    </div>

    <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
      <div className="gba:space-y-2">
        <Label htmlFor="feedback-namespace">{t('feedback-namespace')}</Label>
        <Input
          id="feedback-namespace"
          value={namespaceValue}
          onChange={event => onNamespaceValueChange(event.target.value)}
          data-testid="customer-360-feedback-namespace"
        />
      </div>
      <div className="gba:space-y-2">
        <Label htmlFor="feedback-campaign-id">{t('feedback-campaign-id')}</Label>
        <Input
          id="feedback-campaign-id"
          value={campaignId}
          onChange={event => onCampaignIdChange(event.target.value)}
          data-testid="customer-360-feedback-campaign-id"
        />
      </div>
    </div>

    <div className="gba:space-y-2">
      <Label htmlFor="feedback-metadata">{t('feedback-metadata')}</Label>
      <Textarea
        id="feedback-metadata"
        value={metadataText}
        onChange={event => onMetadataTextChange(event.target.value)}
        data-testid="customer-360-feedback-metadata"
      />
    </div>
  </>
)

export default CustomFeedbackSurveySettings
export { CustomFeedbackSurveySettings }
