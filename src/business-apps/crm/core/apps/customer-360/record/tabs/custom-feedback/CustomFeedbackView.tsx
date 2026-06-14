import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import { ChatTeardropTextIcon, PlusIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import customer360I18n from '../../../_i18n'
import type { Customer360Subject } from '../../../data/types'
import {
  executeCrmCustomFeedback,
  saveCrmCustomFeedbackTemplate,
  type CrmCustomFeedbackExecutionResult,
  type CrmFeedbackFormField
} from '../../../data/record/crmCustomFeedbackClient'
import CustomFeedbackFieldEditor, { fieldNeedsOptions, type DraftFeedbackField } from './CustomFeedbackFieldEditor'
import CustomFeedbackResults from './CustomFeedbackResults'
import CustomFeedbackSurveySettings from './CustomFeedbackSurveySettings'

type FeedbackSubmitMode = 'execute' | 'save' | 'draft' | 'save-and-run'

// TODO(customer-feedback): Restore this hidden tab after product finalizes CRM custom survey UX and backend result DTOs.
export interface CustomFeedbackViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
}

const newField = (): DraftFeedbackField => ({
  id: globalThis.crypto?.randomUUID?.() || `field-${Date.now()}`,
  label: '',
  type: 'TEXTAREA',
  required: false,
  optionsText: ''
})

function parseAccountIds(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  )
}

function toFieldName(label: string, fallback: string): string {
  const parts: string[] = []
  for (const char of label.trim().toLowerCase()) {
    const isAlphaNumeric = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9')
    if (isAlphaNumeric) {
      parts.push(char)
    } else if (parts.length > 0 && parts[parts.length - 1] !== '_') {
      parts.push('_')
    }
  }

  if (parts[parts.length - 1] === '_') {
    parts.pop()
  }

  const normalized = parts.join('')
  return normalized || fallback
}

function parseOptions(value: string): Array<{ value: string; label: string }> {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  ).map(option => ({
    value: toFieldName(option, option),
    label: option
  }))
}

function hasAssignees(assignees: { users?: string[] }): boolean {
  return Boolean(assignees.users?.length)
}

function isValidField(field: CrmFeedbackFormField): boolean {
  if (!field.label || !field.name) return false
  if (fieldNeedsOptions(field.type)) return Boolean(field.options?.length)
  return true
}

function parseMetadata(campaignId: string, metadataText: string): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {}
  if (campaignId.trim()) metadata.campaignId = campaignId.trim()
  if (metadataText.trim()) {
    Object.assign(metadata, JSON.parse(metadataText))
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined
}

function payloadCanSubmit(params: {
  mode: FeedbackSubmitMode
  surveyName: string
  templateId: string
  initiatorId: string
  accountIds: string[]
  assignees: { users?: string[] }
  form: CrmFeedbackFormField[]
}): boolean {
  const hasForm = params.form.length > 0
  const hasTemplateId = params.templateId.trim().length > 0
  const hasSurveyName = params.surveyName.trim().length > 0
  const hasExecutionContext =
    Boolean(params.initiatorId) && params.accountIds.length > 0 && hasAssignees(params.assignees)

  if (params.mode === 'save') return hasSurveyName && hasForm
  if (params.mode === 'draft') return (hasSurveyName || hasTemplateId) && (hasForm || hasTemplateId)
  if (hasTemplateId && params.mode === 'execute') return hasExecutionContext
  return hasSurveyName && hasExecutionContext && hasForm
}

function toFormFields(fields: DraftFeedbackField[]): CrmFeedbackFormField[] {
  return fields
    .map((field, index) => {
      const label = field.label.trim()
      const formField: CrmFeedbackFormField = {
        type: field.type,
        name: toFieldName(label, `field_${index + 1}`),
        label,
        required: field.required
      }

      if (fieldNeedsOptions(field.type)) {
        formField.options = parseOptions(field.optionsText)
      }

      return formField
    })
    .filter(isValidField)
}

const CustomFeedbackView: React.FC<CustomFeedbackViewProps> = ({ accessToken, userInfo, subject }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const [surveyName, setSurveyName] = useState('')
  const [accountIdsText, setAccountIdsText] = useState(subject.id)
  const [templateId, setTemplateId] = useState('')
  const [namespaceValue, setNamespaceValue] = useState('crm.customer360')
  const [campaignId, setCampaignId] = useState('')
  const [metadataText, setMetadataText] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [assigneeEmployees, setAssigneeEmployees] = useState<EmployeeLiteOption[]>([])
  const [fields, setFields] = useState<DraftFeedbackField[]>([newField()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [results, setResults] = useState<CrmCustomFeedbackExecutionResult[]>([])

  const accountIds = useMemo(() => parseAccountIds(accountIdsText), [accountIdsText])
  const formFields = useMemo(() => toFormFields(fields), [fields])
  const assignees = useMemo(
    () => ({ users: assigneeEmployees.map(employee => employee.userId).filter(Boolean) as string[] }),
    [assigneeEmployees]
  )
  const initiatorId = String(userInfo?.id || '')

  const updateField = useCallback((fieldId: string, patch: Partial<DraftFeedbackField>) => {
    setFields(current => current.map(field => (field.id === fieldId ? { ...field, ...patch } : field)))
  }, [])

  const removeField = useCallback((fieldId: string) => {
    setFields(current => {
      const next = current.filter(field => field.id !== fieldId)
      return next.length > 0 ? next : [newField()]
    })
  }, [])

  const buildPayload = useCallback(
    (flags: { saveAsTemplate?: boolean; saveAsDraft?: boolean; execute?: boolean }) => ({
      surveyName: surveyName.trim() || undefined,
      initiatorId: initiatorId || undefined,
      accountIds,
      assignees,
      form: formFields.length > 0 ? formFields : undefined,
      metadata: parseMetadata(campaignId, metadataText),
      templateId: templateId.trim() || undefined,
      namespace: namespaceValue.trim() || undefined,
      ...flags
    }),
    [accountIds, assignees, campaignId, formFields, initiatorId, metadataText, namespaceValue, surveyName, templateId]
  )

  const canSubmitMode = useCallback(
    (mode: FeedbackSubmitMode) =>
      payloadCanSubmit({
        mode,
        surveyName,
        templateId,
        initiatorId,
        accountIds,
        assignees,
        form: formFields
      }),
    [accountIds, assignees, formFields, initiatorId, surveyName, templateId]
  )

  const submit = useCallback(
    async (mode: FeedbackSubmitMode) => {
      setSubmitting(true)
      setError(null)
      setMessage(null)
      setResults([])
      try {
        const flags = {
          saveAsTemplate: mode === 'save' || mode === 'save-and-run',
          saveAsDraft: mode === 'draft',
          execute: mode === 'execute' || mode === 'save-and-run'
        }
        const payload = buildPayload(flags)
        const response =
          mode === 'save' || mode === 'draft'
            ? await saveCrmCustomFeedbackTemplate(accessToken, payload)
            : await executeCrmCustomFeedback(accessToken, payload)

        setMessage(response.message || t('feedback-success'))
        setResults(response.results)
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : t('feedback-error'))
      } finally {
        setSubmitting(false)
      }
    },
    [accessToken, buildPayload, t]
  )

  return (
    <div className="gba:col-span-12 gba:space-y-4" data-testid="customer-360-custom-feedback-view">
      <Card variant="surface">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <ChatTeardropTextIcon className="gba:size-5 gba:text-primary" />
            <CardTitle>{t('feedback-title')}</CardTitle>
          </div>
          <CardDescription>{t('feedback-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <CustomFeedbackSurveySettings
            accessToken={accessToken}
            surveyName={surveyName}
            templateId={templateId}
            accountIdsText={accountIdsText}
            namespaceValue={namespaceValue}
            campaignId={campaignId}
            metadataText={metadataText}
            assigneeIds={assigneeIds}
            t={t}
            onSurveyNameChange={setSurveyName}
            onTemplateIdChange={setTemplateId}
            onAccountIdsTextChange={setAccountIdsText}
            onNamespaceValueChange={setNamespaceValue}
            onCampaignIdChange={setCampaignId}
            onMetadataTextChange={setMetadataText}
            onAssigneeIdsChange={setAssigneeIds}
            onAssigneeEmployeesChange={setAssigneeEmployees}
          />

          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
              <h3 className="gba:text-sm gba:font-medium">{t('feedback-fields-title')}</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFields(current => [...current, newField()])}
                data-testid="customer-360-feedback-add-field"
              >
                <PlusIcon className="gba:size-4" />
                {t('feedback-add-field')}
              </Button>
            </div>

            {fields.map(field => (
              <CustomFeedbackFieldEditor
                key={field.id}
                field={field}
                t={t}
                onUpdate={updateField}
                onRemove={removeField}
              />
            ))}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t('error-title')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {message ? (
            <Alert variant="default">
              <AlertTitle>{t('feedback-success-title')}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <CustomFeedbackResults results={results} t={t} />

          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Button
              type="button"
              onClick={() => submit('execute')}
              disabled={!canSubmitMode('execute') || submitting}
              data-testid="customer-360-feedback-execute"
            >
              {t('feedback-run')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit('save')}
              disabled={!canSubmitMode('save') || submitting}
            >
              {t('feedback-save-template')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit('draft')}
              disabled={!canSubmitMode('draft') || submitting}
            >
              {t('feedback-save-draft')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit('save-and-run')}
              disabled={!canSubmitMode('save-and-run') || submitting}
            >
              {t('feedback-save-and-run')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomFeedbackView
export { CustomFeedbackView }
