import React from 'react'
import { Card, Badge, Button, Separator } from '@newwork/nw-design-system'
import { User, CheckCircle, XCircle, Clock, FileText, MessageSquare, Calendar, Eye } from 'lucide-react'

interface SimulationPreviewProps {
  step: any
  stepIndex: number
  simulationData?: any
  userPerspective: string
  availableUsers: Array<{
    id: string
    name: string
    role: string
  }>
  onClose: () => void
  'data-testid'?: string
}

export const SimulationPreview: React.FC<SimulationPreviewProps> = ({
  step,
  stepIndex,
  simulationData,
  userPerspective,
  availableUsers,
  onClose,
  'data-testid': testId = 'simulation-preview'
}) => {
  const getCurrentUser = () => {
    return availableUsers.find(user => user.id === userPerspective) || availableUsers[0]
  }

  const getStepTypeIcon = (stepType: string) => {
    switch (stepType) {
      case 'TASK':
        return <User className="gba:w-5 gba:h-5" />
      case 'APPROVAL':
        return <CheckCircle className="gba:w-5 gba:h-5" />
      case 'INFORMATION':
        return <MessageSquare className="gba:w-5 gba:h-5" />
      case 'ACKNOWLEDGE':
        return <FileText className="gba:w-5 gba:h-5" />
      default:
        return <Eye className="gba:w-5 gba:h-5" />
    }
  }

  const getStepTypeColor = (stepType: string) => {
    switch (stepType) {
      case 'TASK':
        return 'var(--color-primary-500)'
      case 'APPROVAL':
        return 'var(--color-warning-500)'
      case 'INFORMATION':
        return 'var(--color-info-500)'
      case 'ACKNOWLEDGE':
        return 'var(--color-success-500)'
      default:
        return 'var(--color-surface-disabled)'
    }
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'APPROVED':
        return <CheckCircle className="gba:w-4 gba:h-4" style={{ color: 'var(--color-success-500)' }} />
      case 'REJECTED':
        return <XCircle className="gba:w-4 gba:h-4" style={{ color: 'var(--color-danger-500)' }} />
      case 'COMPLETED':
        return <CheckCircle className="gba:w-4 gba:h-4" style={{ color: 'var(--color-success-500)' }} />
      default:
        return <Clock className="gba:w-4 gba:h-4" style={{ color: 'var(--color-warning-500)' }} />
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'APPROVED':
      case 'COMPLETED':
        return 'var(--color-success-500)'
      case 'REJECTED':
        return 'var(--color-danger-500)'
      default:
        return 'var(--color-warning-500)'
    }
  }

  const currentUser = getCurrentUser()

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Step Header */}
      <Card
        className="gba:shadow-sm gba:border gba:border-gray-200"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
            <div className="gba:flex gba:items-start gba:gap-4">
              <div
                className="gba:p-2 gba:rounded-lg"
                style={{
                  backgroundColor: `${getStepTypeColor(step.type)}20`,
                  color: getStepTypeColor(step.type)
                }}
              >
                {getStepTypeIcon(step.type)}
              </div>

              <div>
                <h3 className="gba:text-xl gba:font-bold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {step.title}
                </h3>

                <div className="gba:flex gba:gap-2 gba:mb-3">
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: getStepTypeColor(step.type),
                      color: 'var(--color-on-primary)',
                      border: 'none'
                    }}
                  >
                    {step.type}
                  </Badge>

                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: 'var(--color-primary-100)',
                      color: 'var(--color-primary-700)',
                      border: 'none'
                    }}
                  >
                    Step {stepIndex + 1}
                  </Badge>
                </div>
              </div>
            </div>

            {simulationData && (
              <div
                className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg"
                style={{
                  backgroundColor: `${getResultColor(simulationData.result)}20`,
                  color: getResultColor(simulationData.result)
                }}
              >
                {getResultIcon(simulationData.result)}
                <span className="gba:font-medium gba:text-sm">{simulationData.result}</span>
              </div>
            )}
          </div>

          {/* User Perspective */}
          <div
            className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              border: `1px solid var(--color-border-default)`
            }}
          >
            <div
              className="gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center"
              style={{
                backgroundColor: 'var(--color-primary-500)',
                color: 'var(--color-on-primary)'
              }}
            >
              <User className="gba:w-4 gba:h-4" />
            </div>

            <div>
              <p className="gba:font-medium gba:text-sm" style={{ color: 'var(--color-text-primary)' }}>
                Viewing as: {currentUser.name}
              </p>
              <p className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {currentUser.role}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Step Message */}
      {step.message && (
        <Card
          className="gba:shadow-sm gba:border gba:border-gray-200"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <h4
              className="gba:text-lg gba:font-medium gba:mb-3 gba:flex gba:items-center gba:gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <MessageSquare className="gba:w-4 gba:h-4" />
              Message
            </h4>

            <div
              className="gba:p-4 gba:rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                border: `1px solid var(--color-border-default)`
              }}
            >
              <p className="gba:leading-relaxed gba:whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                {step.message}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Form Data */}
      {step.inputs && step.inputs.length > 0 && (
        <Card
          className="gba:shadow-sm gba:border gba:border-gray-200"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <h4
              className="gba:text-lg gba:font-medium gba:mb-4 gba:flex gba:items-center gba:gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <FileText className="gba:w-4 gba:h-4" />
              Form Fields
              {simulationData && (
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: 'var(--color-success-100)',
                    color: 'var(--color-success-700)',
                    border: 'none',
                    fontSize: 'var(--font-size-xs)'
                  }}
                >
                  {Object.keys(simulationData.formData || {}).length > 0 ? 'Filled' : 'Empty'}
                </Badge>
              )}
            </h4>

            <div className="gba:space-y-4">
              {step.inputs.map((input: any, index: number) => {
                const fieldName = input.name || `input_${index}`
                const fieldValue = simulationData?.formData?.[fieldName]

                return (
                  <div
                    key={index}
                    className="gba:p-4 gba:rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      border: `1px solid var(--color-border-default)`
                    }}
                  >
                    <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                      <label className="gba:font-medium gba:text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {input.label}
                      </label>

                      {fieldValue !== undefined && fieldValue !== '' && (
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: 'var(--color-primary-100)',
                            color: 'var(--color-primary-700)',
                            border: 'none',
                            fontSize: 'var(--font-size-xs)'
                          }}
                        >
                          Answered
                        </Badge>
                      )}
                    </div>

                    {input.placeholder && (
                      <p className="gba:text-xs gba:mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {input.placeholder}
                      </p>
                    )}

                    <div
                      className="gba:p-3 gba:rounded gba:min-h-[40px] gba:flex gba:items-center"
                      style={{
                        backgroundColor: 'var(--color-surface-primary)',
                        border: `1px solid var(--color-border-default)`
                      }}
                    >
                      {fieldValue !== undefined && fieldValue !== '' ? (
                        <span className="gba:text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue)}
                        </span>
                      ) : (
                        <span className="gba:text-sm gba:italic" style={{ color: 'var(--color-text-secondary)' }}>
                          No answer provided
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Links */}
      {step.links && step.links.length > 0 && (
        <Card
          className="gba:shadow-sm gba:border gba:border-gray-200"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <h4 className="gba:text-lg gba:font-medium gba:mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Related Links
            </h4>

            <div className="gba:space-y-2">
              {step.links.map((link: any, index: number) => (
                <div
                  key={index}
                  className="gba:p-3 gba:rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: `1px solid var(--color-border-default)`
                  }}
                >
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gba:text-blue-600 gba:underline gba:hover:text-blue-800"
                    >
                      {link.name || link.url}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-text-primary)' }}>{link.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Simulation Summary */}
      {simulationData && (
        <Card
          className="gba:shadow-sm gba:border gba:border-gray-200"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)',
            borderLeft: `4px solid ${getResultColor(simulationData.result)}`
          }}
        >
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <h4
              className="gba:text-lg gba:font-medium gba:mb-4 gba:flex gba:items-center gba:gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {getResultIcon(simulationData.result)}
              Simulation Result
            </h4>

            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
              <div>
                <label className="gba:text-xs gba:font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  RESULT
                </label>
                <p className="gba:font-semibold" style={{ color: getResultColor(simulationData.result) }}>
                  {simulationData.result}
                </p>
              </div>

              <div>
                <label className="gba:text-xs gba:font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  COMPLETED BY
                </label>
                <p className="gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {currentUser.name}
                </p>
              </div>

              <div>
                <label className="gba:text-xs gba:font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  COMPLETED AT
                </label>
                <p
                  className="gba:font-semibold gba:flex gba:items-center gba:gap-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <Calendar className="gba:w-3 gba:h-3" />
                  {new Date(simulationData.completedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Footer */}
      <div className="gba:flex gba:justify-end gba:pt-4">
        <Button variant="outline" onClick={onClose} data-testid={`${testId}-close-button`}>
          Close Preview
        </Button>
      </div>
    </div>
  )
}
