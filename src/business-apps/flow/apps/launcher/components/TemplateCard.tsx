import React from 'react'
import { Card, Badge } from '@newwork/nw-design-system'
import { FileText, Clock, Users, CheckCircle } from 'lucide-react'
import { FlowTemplate } from '../types'

interface TemplateCardProps {
  template: FlowTemplate
  isSelected: boolean
  onClick: (template: FlowTemplate) => void
  'data-testid'?: string
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, isSelected, onClick, 'data-testid': testId }) => {
  const stepCount = template.steps?.length || 0
  const hasUserTasks = template.steps?.some(step => step.type === 'USER_TASK') || false
  const estimatedDuration = stepCount * 2 // Rough estimate: 2 hours per step

  // Get template-specific styling
  const getTemplateStyle = () => {
    const templateName = template.name?.toLowerCase() || ''

    if (templateName.includes('onboarding') || templateName.includes('employee onboarding')) {
      return { bg: 'gba:bg-green-50', text: 'gba:text-green-500' }
    } else if (templateName.includes('recruiting') || templateName.includes('hiring')) {
      return { bg: 'gba:bg-blue-50', text: 'gba:text-blue-500' }
    } else if (templateName.includes('approval') || templateName.includes('review')) {
      return { bg: 'gba:bg-purple-50', text: 'gba:text-purple-500' }
    } else if (templateName.includes('requisition') || templateName.includes('request')) {
      return { bg: 'gba:bg-orange-50', text: 'gba:text-orange-500' }
    } else {
      return { bg: 'gba:bg-gray-50', text: 'gba:text-gray-500' }
    }
  }

  const templateStyle = getTemplateStyle()

  return (
    <button
      onClick={() => onClick(template)}
      className={`gba:p-4 gba:rounded-lg gba:border gba:text-left gba:transition-all gba:duration-200 gba:w-full ${
        isSelected
          ? 'gba:border-blue-500 gba:bg-blue-50 gba:shadow-md'
          : 'gba:border-gray-200 gba:bg-white gba:hover:border-gray-300 gba:hover:shadow-sm'
      }`}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:gap-3">
        <div className={`gba:p-2 gba:rounded-md ${templateStyle.bg}`}>
          <FileText className={`gba:h-5 gba:w-5 ${templateStyle.text}`} />
        </div>
        <div className="gba:flex-1">
          <h5 className="gba:font-medium gba:text-sm gba:text-gray-900 gba:leading-tight">{template.name}</h5>
          <p className="gba:text-xs gba:text-gray-500 gba:mt-1">{template.description || 'No description available'}</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant="outline" className="gba:text-xs">
            {stepCount} steps
          </Badge>
          <Badge variant="outline" className="gba:text-xs">
            ~{estimatedDuration}h
          </Badge>
          {isSelected && <CheckCircle className="gba:h-4 gba:w-4 gba:text-blue-600" />}
        </div>
      </div>
    </button>
  )
}
