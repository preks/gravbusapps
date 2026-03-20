import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@newwork/nw-design-system'
import type { AlertRuleCreateRequest, AlertAction } from '../../types/agentMesh'

interface AlertRuleFormProps {
  formData: AlertRuleCreateRequest
  onFormDataChange: (data: AlertRuleCreateRequest) => void
  onSubmit: () => void
  onCancel: () => void
}

export const AlertRuleForm = ({ formData, onFormDataChange, onSubmit, onCancel }: AlertRuleFormProps) => {
  const toggleAction = (actionType: AlertAction['type']) => {
    const currentActions = formData.actions || []
    const existingIndex = currentActions.findIndex(a => a.type === actionType)
    if (existingIndex >= 0) {
      onFormDataChange({
        ...formData,
        actions: currentActions.filter((_, idx) => idx !== existingIndex)
      })
    } else {
      onFormDataChange({
        ...formData,
        actions: [...currentActions, { type: actionType, config: {} }]
      })
    }
  }

  return (
    <Card data-testid="alert-rules-manager-form">
      <CardHeader>
        <CardTitle>Create Alert Rule</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div>
          <label
            className="gba:text-sm gba:font-medium gba:text-foreground"
            data-testid="alert-rules-manager-form-name-label"
          >
            Name
          </label>
          <Input
            value={formData.name}
            onChange={e => onFormDataChange({ ...formData, name: e.target.value })}
            placeholder="Rule name"
            data-testid="alert-rules-manager-form-name-input"
            className="gba:mt-1"
          />
        </div>

        <div>
          <label
            className="gba:text-sm gba:font-medium gba:text-foreground"
            data-testid="alert-rules-manager-form-agent-label"
          >
            Agent (optional)
          </label>
          <Input
            value={formData.agent_id || ''}
            onChange={e => onFormDataChange({ ...formData, agent_id: e.target.value || undefined })}
            placeholder="Agent ID"
            data-testid="alert-rules-manager-form-agent-input"
            className="gba:mt-1"
          />
        </div>

        <div>
          <label
            className="gba:text-sm gba:font-medium gba:text-foreground"
            data-testid="alert-rules-manager-form-metric-label"
          >
            Metric
          </label>
          <select
            value={formData.metric}
            onChange={e => onFormDataChange({ ...formData, metric: e.target.value })}
            data-testid="alert-rules-manager-form-metric-select"
            className="gba:w-full gba:mt-1 gba:px-3 gba:py-2 gba:border gba:border-border gba:rounded-md gba:bg-background gba:text-foreground"
          >
            <option value="response_time_p95">Response Time (P95)</option>
            <option value="error_rate">Error Rate</option>
            <option value="token_usage">Token Usage</option>
            <option value="availability">Availability</option>
          </select>
        </div>

        <div className="gba:flex gba:gap-4">
          <div className="gba:flex-1">
            <label
              className="gba:text-sm gba:font-medium gba:text-foreground"
              data-testid="alert-rules-manager-form-operator-label"
            >
              Operator
            </label>
            <select
              value={formData.operator}
              onChange={e => onFormDataChange({ ...formData, operator: e.target.value })}
              data-testid="alert-rules-manager-form-operator-select"
              className="gba:w-full gba:mt-1 gba:px-3 gba:py-2 gba:border gba:border-border gba:rounded-md gba:bg-background gba:text-foreground"
            >
              <option value="gt">&gt;</option>
              <option value="lt">&lt;</option>
              <option value="eq">=</option>
            </select>
          </div>
          <div className="gba:flex-1">
            <label
              className="gba:text-sm gba:font-medium gba:text-foreground"
              data-testid="alert-rules-manager-form-threshold-label"
            >
              Threshold
            </label>
            <Input
              type="number"
              value={formData.threshold}
              onChange={e => onFormDataChange({ ...formData, threshold: parseFloat(e.target.value) || 0 })}
              data-testid="alert-rules-manager-form-threshold-input"
              className="gba:mt-1"
            />
          </div>
        </div>

        <div>
          <label
            className="gba:text-sm gba:font-medium gba:text-foreground"
            data-testid="alert-rules-manager-form-actions-label"
          >
            Actions
          </label>
          <div className="gba:mt-2 gba:space-y-2">
            <label className="gba:flex gba:items-center gba:gap-2">
              <input
                type="checkbox"
                checked={(formData.actions || []).some(a => a.type === 'dashboard')}
                onChange={() => toggleAction('dashboard')}
                data-testid="alert-rules-manager-form-action-dashboard"
              />
              <span className="gba:text-sm gba:text-foreground">Dashboard Notification</span>
            </label>
            <label className="gba:flex gba:items-center gba:gap-2">
              <input
                type="checkbox"
                checked={(formData.actions || []).some(a => a.type === 'notification')}
                onChange={() => toggleAction('notification')}
                data-testid="alert-rules-manager-form-action-notification"
              />
              <span className="gba:text-sm gba:text-foreground">Email/Slack Notification</span>
            </label>
            <label className="gba:flex gba:items-center gba:gap-2">
              <input
                type="checkbox"
                checked={(formData.actions || []).some(a => a.type === 'flow')}
                onChange={() => toggleAction('flow')}
                data-testid="alert-rules-manager-form-action-flow"
              />
              <span className="gba:text-sm gba:text-foreground">Trigger Flow</span>
            </label>
          </div>
        </div>

        <div className="gba:flex gba:gap-2 gba:justify-end">
          <Button variant="outline" onClick={onCancel} data-testid="alert-rules-manager-form-cancel-button">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!formData.name} data-testid="alert-rules-manager-form-submit-button">
            Create Rule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
