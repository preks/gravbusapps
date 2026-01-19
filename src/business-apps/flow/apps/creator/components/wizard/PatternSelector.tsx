import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { Button } from 'antd'
import {
  Shield,
  Megaphone,
  Target,
  MessageSquare,
  FileText,
  HandHeart,
  UserCheck,
  GitBranch,
  CheckSquare,
  LucideIcon
} from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessPattern, BusinessPatternCategory } from '../../types/businessPatterns'
import {
  APPROVAL_PATTERNS,
  INFORMATION_PATTERNS,
  TASK_COORDINATION_PATTERNS,
  DECISION_MAKING_PATTERNS,
  SURVEY_PATTERNS,
  REQUEST_RESPONSE_PATTERNS
} from '../../data/businessPatterns'
import { useWizardStore } from '../../hooks/useWizardStore'

interface PatternSelectorProps {
  onNext: () => void
  'data-testid'?: string
}

// Icon mapping for Lucide icons
const ICON_MAP: Record<string, LucideIcon> = {
  Shield: Shield,
  Megaphone: Megaphone,
  Target: Target,
  MessageSquare: MessageSquare,
  FileText: FileText,
  HandHeart: HandHeart,
  UserCheck: UserCheck,
  GitBranch: GitBranch,
  CheckSquare: CheckSquare
}

const CATEGORY_INFO = {
  [BusinessPatternCategory.APPROVAL]: {
    title: 'Approval Workflows',
    description: 'Get authorization and sign-offs from stakeholders',
    icon: 'Shield',
    color: '#3B82F6'
  },
  [BusinessPatternCategory.INFORMATION]: {
    title: 'Information Distribution',
    description: 'Share announcements and updates across teams',
    icon: 'Megaphone',
    color: '#10B981'
  },
  [BusinessPatternCategory.TASK_COORDINATION]: {
    title: 'Task Coordination',
    description: 'Assign and track work across team members',
    icon: 'Target',
    color: '#F59E0B'
  },
  [BusinessPatternCategory.DECISION_MAKING]: {
    title: 'Decision Making',
    description: 'Gather insights and feedback for informed decisions',
    icon: 'MessageSquare',
    color: '#8B5CF6'
  },
  [BusinessPatternCategory.SURVEY]: {
    title: 'Surveys',
    description: 'Collect feedback and opinions through structured surveys',
    icon: 'FileText',
    color: '#EF4444'
  },
  [BusinessPatternCategory.REQUEST_RESPONSE]: {
    title: 'Request & Response',
    description: 'Submit requests and manage responses efficiently',
    icon: 'HandHeart',
    color: '#06B6D4'
  }
}

const PATTERNS_BY_CATEGORY = {
  [BusinessPatternCategory.APPROVAL]: APPROVAL_PATTERNS,
  [BusinessPatternCategory.INFORMATION]: INFORMATION_PATTERNS,
  [BusinessPatternCategory.TASK_COORDINATION]: TASK_COORDINATION_PATTERNS,
  [BusinessPatternCategory.DECISION_MAKING]: DECISION_MAKING_PATTERNS,
  [BusinessPatternCategory.SURVEY]: SURVEY_PATTERNS,
  [BusinessPatternCategory.REQUEST_RESPONSE]: REQUEST_RESPONSE_PATTERNS
}

// Helper function to render Lucide icons
const renderIcon = (iconName: string, className?: string, style?: React.CSSProperties) => {
  const IconComponent = ICON_MAP[iconName]
  if (!IconComponent) {
    console.warn(`Icon "${iconName}" not found in ICON_MAP`)
    return (
      <div className={className} style={style}>
        ?
      </div>
    )
  }
  return <IconComponent className={className} style={style} />
}

/**
 * Pattern selector component for choosing business workflow patterns
 */
export const PatternSelector: React.FC<PatternSelectorProps> = ({
  onNext,
  'data-testid': testId = 'pattern-selector'
}) => {
  const [expandedCategory, setExpandedCategory] = useState<BusinessPatternCategory | null>(null)
  const [hoveredPattern, setHoveredPattern] = useState<string | null>(null)
  const { selectedPattern, selectPattern } = useWizardStore()

  const handleCategoryClick = (category: BusinessPatternCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category)
  }

  const handlePatternClick = (pattern: BusinessPattern) => {
    selectPattern(pattern)
  }

  return (
    <div className="gba:space-y-6 gba:p-4 gba:w-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:text-center gba:mb-8" data-testid={`${testId}-header`}>
        <h2 className="gba:text-2xl gba:md:text-3xl gba:font-bold gba:text-gray-900 gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('flow.wizard.selectPattern', 'Select Flow Pattern')}
        </h2>
        <p className="gba:text-gray-600 gba:text-base gba:md:text-lg gba:max-w-2xl gba:mx-auto">
          {getTranslationFromI18nKeyAndLabel(
            'flow.wizard.selectPatternDescription',
            'Choose a business pattern that best matches your flow needs'
          )}
        </p>
      </div>

      {/* Category Grid */}
      <div
        className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4 gba:md:gap-6"
        data-testid={`${testId}-categories`}
      >
        {Object.entries(CATEGORY_INFO).map(([category, info]) => {
          const patterns = PATTERNS_BY_CATEGORY[category as BusinessPatternCategory]
          const isExpanded = expandedCategory === category

          return (
            <div key={category} className="gba:space-y-3" data-testid={`${testId}-category-${category}`}>
              {/* Category Card */}
              <Card
                className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:hover:shadow-lg ${
                  isExpanded ? 'gba:ring-2 gba:ring-blue-500' : ''
                }`}
                onClick={() => handleCategoryClick(category as BusinessPatternCategory)}
                data-testid={`${testId}-category-card-${category}`}
              >
                <CardHeader className="gba:pb-3">
                  <div className="gba:flex gba:items-center gba:space-x-3">
                    <div
                      className="gba:w-10 gba:h-10 gba:rounded-full gba:flex gba:items-center gba:justify-center"
                      style={{ backgroundColor: `${info.color}20` }}
                    >
                      {renderIcon(info.icon, 'gba:w-5 gba:h-5', { color: info.color })}
                    </div>
                    <div className="gba:flex-1">
                      <CardTitle className="gba:text-lg gba:font-semibold">{info.title}</CardTitle>
                      <p className="gba:text-sm gba:text-gray-600 gba:mt-1">{info.description}</p>
                    </div>
                    <div className="gba:text-gray-400">{isExpanded ? '▼' : '▶'}</div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="gba:pt-0">
                    <div className="gba:space-y-3">
                      {patterns.map((pattern: BusinessPattern) => (
                        <div
                          key={pattern.id}
                          className={`gba:p-4 gba:rounded-lg gba:border-2 gba:cursor-pointer gba:transition-all gba:duration-200 ${
                            selectedPattern?.id === pattern.id
                              ? 'gba:border-blue-500 gba:bg-blue-50'
                              : hoveredPattern === pattern.id
                                ? 'gba:border-gray-300 gba:bg-gray-50'
                                : 'gba:border-gray-200 gba:hover:border-gray-300'
                          }`}
                          onClick={e => {
                            e.stopPropagation()
                            handlePatternClick(pattern)
                          }}
                          onMouseEnter={() => setHoveredPattern(pattern.id)}
                          onMouseLeave={() => setHoveredPattern(null)}
                          data-testid={`${testId}-pattern-${pattern.id}`}
                        >
                          <div className="gba:flex gba:items-start gba:space-x-3">
                            <div className="gba:mt-1">
                              {renderIcon(pattern.icon, 'gba:w-6 gba:h-6', { color: pattern.color })}
                            </div>
                            <div className="gba:flex-1">
                              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                                <h4 className="gba:font-semibold gba:text-gray-900">{pattern.title}</h4>
                                {selectedPattern?.id === pattern.id && (
                                  <Badge variant="default" className="gba:bg-blue-500 gba:text-white">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                              <p className="gba:text-sm gba:text-gray-600 gba:mb-3">{pattern.description}</p>

                              {/* Use Cases */}
                              <div className="gba:space-y-2">
                                <p className="gba:text-xs gba:font-medium gba:text-gray-700 gba:uppercase gba:tracking-wide">
                                  Use Cases:
                                </p>
                                <div className="gba:flex gba:flex-wrap gba:gap-1">
                                  {pattern.useCases.slice(0, 3).map((useCase: string, index: number) => (
                                    <Badge key={index} variant="outline" className="gba:text-xs gba:px-2 gba:py-1">
                                      {useCase}
                                    </Badge>
                                  ))}
                                  {pattern.useCases.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="gba:text-xs gba:px-2 gba:py-1 gba:text-gray-500"
                                    >
                                      +{pattern.useCases.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
