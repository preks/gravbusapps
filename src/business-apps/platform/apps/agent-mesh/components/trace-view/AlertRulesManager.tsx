import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { AlertRule, AlertRuleCreateRequest } from '../../types/agentMesh'
import { AlertRuleForm } from './AlertRuleForm'

interface AlertRulesManagerProps {
  accessToken: string
}

export const AlertRulesManager = ({ accessToken }: AlertRulesManagerProps) => {
  const promptManagerClient = usePromptManagerClient(accessToken)
  const [showForm, setShowForm] = useState(false)
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<AlertRuleCreateRequest>({
    name: '',
    metric: 'response_time_p95',
    operator: 'gt',
    threshold: 0,
    window_minutes: 60,
    actions: []
  })

  const loadRules = useCallback(async () => {
    try {
      setLoading(true)
      const data = await promptManagerClient.getAlertRules()
      setRules(data)
    } catch (err) {
      console.error('Failed to load alert rules:', err)
    } finally {
      setLoading(false)
    }
  }, [promptManagerClient])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const handleSubmit = async () => {
    try {
      await promptManagerClient.createAlertRule(formData)
      setShowForm(false)
      resetForm()
      await loadRules()
    } catch (err) {
      console.error('Failed to create alert rule:', err)
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      await promptManagerClient.deleteAlertRule(ruleId)
      await loadRules()
    } catch (err) {
      console.error('Failed to delete alert rule:', err)
    }
  }

  const handleToggleStatus = async (rule: AlertRule) => {
    try {
      const newStatus = rule.status === 'active' ? 'paused' : 'active'
      await promptManagerClient.updateAlertRule(rule.rule_id, { status: newStatus })
      await loadRules()
    } catch (err) {
      console.error('Failed to toggle alert rule:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      metric: 'response_time_p95',
      operator: 'gt',
      threshold: 0,
      window_minutes: 60,
      actions: []
    })
  }

  const getMetricLabel = (metric: string): string => {
    switch (metric) {
      case 'response_time_p95':
        return 'Response Time (P95)'
      case 'error_rate':
        return 'Error Rate'
      case 'token_usage':
        return 'Token Usage'
      case 'availability':
        return 'Availability'
      default:
        return metric
    }
  }

  const getOperatorLabel = (operator: string): string => {
    switch (operator) {
      case 'gt':
        return '>'
      case 'lt':
        return '<'
      case 'eq':
        return '='
      default:
        return operator
    }
  }

  return (
    <div className="gba:space-y-4" data-testid="alert-rules-manager">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="alert-rules-manager-title">
          Alert Rules
        </h2>
        <Button onClick={() => setShowForm(!showForm)} data-testid="alert-rules-manager-new-button">
          {showForm ? 'Cancel' : 'New Rule'}
        </Button>
      </div>

      {/* New Rule Form */}
      {showForm && (
        <AlertRuleForm
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            resetForm()
          }}
        />
      )}

      {/* Rules Table */}
      <Card data-testid="alert-rules-manager-table">
        <CardHeader>
          <CardTitle>Active Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner />
            </div>
          ) : rules.length === 0 ? (
            <div
              className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8"
              data-testid="alert-rules-manager-table-empty"
            >
              No alert rules configured
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full" data-testid="alert-rules-manager-table-content">
                <thead>
                  <tr className="gba:border-b gba:border-border">
                    <th className="gba:text-left gba:py-2 gba:px-4 gba:text-sm gba:font-medium gba:text-foreground">
                      Name
                    </th>
                    <th className="gba:text-left gba:py-2 gba:px-4 gba:text-sm gba:font-medium gba:text-foreground">
                      Metric
                    </th>
                    <th className="gba:text-left gba:py-2 gba:px-4 gba:text-sm gba:font-medium gba:text-foreground">
                      Condition
                    </th>
                    <th className="gba:text-left gba:py-2 gba:px-4 gba:text-sm gba:font-medium gba:text-foreground">
                      Status
                    </th>
                    <th className="gba:text-right gba:py-2 gba:px-4 gba:text-sm gba:font-medium gba:text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr
                      key={rule.rule_id}
                      className="gba:border-b gba:border-border gba:hover:bg-accent"
                      data-testid={`alert-rules-manager-table-row-${rule.rule_id}`}
                    >
                      <td
                        className="gba:py-2 gba:px-4 gba:text-sm gba:text-foreground"
                        data-testid={`alert-rules-manager-table-row-${rule.rule_id}-name`}
                      >
                        {rule.name}
                      </td>
                      <td
                        className="gba:py-2 gba:px-4 gba:text-sm gba:text-foreground"
                        data-testid={`alert-rules-manager-table-row-${rule.rule_id}-metric`}
                      >
                        {getMetricLabel(rule.metric)}
                      </td>
                      <td
                        className="gba:py-2 gba:px-4 gba:text-sm gba:text-foreground"
                        data-testid={`alert-rules-manager-table-row-${rule.rule_id}-condition`}
                      >
                        {getOperatorLabel(rule.operator)} {rule.threshold}
                      </td>
                      <td
                        className="gba:py-2 gba:px-4"
                        data-testid={`alert-rules-manager-table-row-${rule.rule_id}-status`}
                      >
                        <Badge variant={rule.status === 'active' ? 'success' : 'secondary'}>{rule.status}</Badge>
                      </td>
                      <td className="gba:py-2 gba:px-4">
                        <div className="gba:flex gba:gap-2 gba:justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(rule)}
                            data-testid={`alert-rules-manager-table-row-${rule.rule_id}-toggle-button`}
                          >
                            {rule.status === 'active' ? 'Pause' : 'Activate'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(rule.rule_id)}
                            data-testid={`alert-rules-manager-table-row-${rule.rule_id}-delete-button`}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
