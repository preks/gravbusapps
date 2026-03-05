import React from 'react'
import {
  Spinner,
  Alert,
  Badge,
  IconAvatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  EmptyState
} from '@newwork/nw-design-system'
import { TrendingUp } from 'lucide-react'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import DynamicInvestmentFields from './DynamicInvestmentFields'
import { TrendUpIcon } from '@phosphor-icons/react'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import { createGetPages } from '../utils'
import { getFlowContextForInvestment } from '@/common/data/investment/utils/investmentGroupRouting'

interface InvestmentSectionProps extends Partial<BusinessAppContextProps> {
  investmentId?: string
  investment?: Investment
  investments?: Investment[]
  className?: string
  'data-testid'?: string
  actionButtonProps?: {
    contextsArray?: FlowContextName[]
    externalContextData?: Record<string, any>
    prefixDataTestId?: string
  }
  recordUrl?: string
  isLoading?: boolean
  error?: string | null
  fields?: any[] // Optional fields from parent component (Lead/Opportunity records)
}

interface InvestmentDisplayProps {
  investment: Investment
  className?: string
  'data-testid'?: string
  businessAppContext?: BusinessAppContextProps
  onTitleClick?: () => void
  fields?: any[] // Optional fields from parent component
}

interface InvestmentStateProps {
  isLoading?: boolean
  error?: string | null
  isEmpty?: boolean
  className?: string
}

const extractBusinessAppContext = (props: Partial<BusinessAppContextProps>): BusinessAppContextProps | undefined => {
  if (!props.accessToken) {
    return undefined
  }

  return props as BusinessAppContextProps
}

const createTitleClickHandler = (recordUrl?: string) => {
  if (!recordUrl) {
    return undefined
  }
  return () => navigateTo(recordUrl)
}

const InvestmentStateHandler: React.FC<InvestmentStateProps> = ({ isLoading, error, isEmpty, className = '' }) => {
  if (isLoading) {
    return (
      <div className={`gba:w-full ${className}`} data-testid="investment-section-loading">
        <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
          <Spinner size="sm" className="gba:mr-1" />
          <span className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('crm.common.loadingInvestment', 'Loading investment data...')}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`gba:w-full ${className}`} data-testid="investment-section-error">
        <Alert variant="destructive">
          <div>
            <strong>{getTranslationFromI18nKeyAndLabel('crm.common.error', 'Error')}</strong>
            <div>
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.investment.loadError',
                'Failed to load investment information'
              )}
              : {error}
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className={`gba:w-full ${className}`} data-testid="investment-section-empty">
        <EmptyState
          type="no-data"
          title={getTranslationFromI18nKeyAndLabel('crm.investments.noInvestmentTitle', 'No Investment Data')}
          description={getTranslationFromI18nKeyAndLabel(
            'crm.investments.noInvestmentDescription',
            'There are no investments linked to this record yet.'
          )}
          config={{
            configs: {
              'no-data': {
                type: 'no-data',
                title: getTranslationFromI18nKeyAndLabel('crm.investments.noInvestmentTitle', 'No Investment Data'),
                description: getTranslationFromI18nKeyAndLabel(
                  'crm.investments.noInvestmentDescription',
                  'There are no investments linked to this record yet.'
                ),
                icon: TrendingUp,
                size: 'sm'
              }
            }
          }}
          compact
          data-testid="investment-section-empty-state"
        />
      </div>
    )
  }

  return null
}

const InvestmentDisplay: React.FC<InvestmentDisplayProps> = ({
  investment,
  className = '',
  'data-testid': dataTestId = 'investment-section',
  businessAppContext,
  onTitleClick,
  fields
}) => {
  return (
    <div className={`gba:w-full gba:h-full ${className}`} data-testid={dataTestId}>
      <div className="gba:flex gba:flex-col gba:gap-6">
        {/* Main Info Section */}
        <div className="gba:flex gba:flex-col gba:gap-3">
          <div className="gba:flex gba:gap-3 gba:items-center">
            <IconAvatar icon={TrendUpIcon} variant="default" size="lg" title="Investment" />
            <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:gap-2.5 gba:items-center">
                {onTitleClick ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={onTitleClick}
                          className="gba:text-sm gba:font-semibold gba:text-card-foreground gba:truncate gba:min-w-0 gba:cursor-pointer gba:hover:underline gba:text-left gba:bg-transparent gba:border-none gba:p-0 gba:flex-1"
                          data-testid="investment-name-clickable"
                        >
                          {investment?.name ||
                            investment?.displayName ||
                            getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="gba:max-w-xs gba:break-words">
                          {investment?.name ||
                            investment?.displayName ||
                            getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <h3
                    className="gba:text-sm gba:font-semibold gba:text-card-foreground gba:truncate gba:flex-1"
                    data-testid="investment-name"
                  >
                    {investment?.name ||
                      investment?.displayName ||
                      getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')}
                  </h3>
                )}

                {/* Investment Role and Stake Type Badges */}
                {(() => {
                  // investmentRole is an array, get first role if available
                  const firstRole: any = Array.isArray(investment?.investmentRole)
                    ? investment.investmentRole[0]
                    : investment?.investmentRole
                  // Handle both full Investment entity (nested catalog) and Lead/Opportunity (direct catalog)
                  const roleValue =
                    firstRole?.investmentRole?.value ||
                    firstRole?.investmentRole?.code ||
                    firstRole?.value ||
                    firstRole?.code
                  const stakeValue = investment?.investmentStakeType?.value || investment?.investmentStakeType?.code

                  const hasValidRole = roleValue?.trim() && !roleValue.toLowerCase().includes('not set')
                  const hasValidStake = stakeValue?.trim() && !stakeValue.toLowerCase().includes('not set')

                  if (!hasValidRole && !hasValidStake) {
                    return null
                  }

                  return (
                    <div className="gba:flex gba:gap-2">
                      {hasValidRole && <Badge variant="outline">{roleValue}</Badge>}
                      {hasValidStake && <Badge variant="outline">{stakeValue}</Badge>}
                    </div>
                  )
                })()}
              </div>

              {/* Investment Group and Type - combined in single badge */}
              {(() => {
                const groupValue = investment?.investmentGroup?.value || investment?.investmentGroup?.code
                const typeValue = investment?.investmentType?.value || investment?.investmentType?.code
                const combinedValue = [groupValue, typeValue].filter(Boolean).join(' • ')

                if (combinedValue) {
                  return <Badge variant="ext1">{combinedValue}</Badge>
                }
                return null
              })()}
            </div>
          </div>
        </div>

        {/* Dynamic Investment Fields */}
        <DynamicInvestmentFields
          investmentData={investment}
          accessToken={businessAppContext?.accessToken || ''}
          fields={fields}
        />
      </div>
    </div>
  )
}

const InvestmentSection: React.FC<InvestmentSectionProps> = ({
  investment,
  investments,
  className = '',
  isLoading = false,
  error = null,
  recordUrl,
  fields,
  ...props
}) => {
  const investmentList = Array.isArray(investments) ? investments.filter(Boolean) : []
  const displayInvestment = investment || (investmentList.length > 0 ? investmentList[0] : null)

  const stateHandler = (
    <InvestmentStateHandler isLoading={isLoading} error={error} isEmpty={!displayInvestment} className={className} />
  )

  if (isLoading || error || !displayInvestment) {
    return stateHandler
  }

  return (
    <InvestmentDisplay
      investment={displayInvestment}
      className={className}
      data-testid={props['data-testid'] || 'investment-section'}
      businessAppContext={extractBusinessAppContext(props)}
      onTitleClick={createTitleClickHandler(recordUrl)}
      fields={fields}
    />
  )
}

// Static properties for SectionWrapper
;(InvestmentSection as any).sectionTitle = 'Investment Information'
;(InvestmentSection as any).getPages = createGetPages<Investment, InvestmentSectionProps>(
  (props: InvestmentSectionProps) => props.investments,
  (props: InvestmentSectionProps) => props.investment
)
;(InvestmentSection as any).renderPage = (pageData: any, _pageIndex: number, props: InvestmentSectionProps) => {
  const { className = '', isLoading = false, error = null, recordUrl, fields } = props

  const stateHandler = (
    <InvestmentStateHandler isLoading={isLoading} error={error} isEmpty={!pageData} className={className} />
  )

  if (isLoading || error || !pageData) {
    return stateHandler
  }

  // Only generate dynamic URL if recordUrl is explicitly provided or not set in props
  // If recordUrl is explicitly undefined, don't auto-generate (for Lead/Opportunity records)
  let dynamicRecordUrl: string | undefined
  if ('recordUrl' in props && recordUrl === undefined) {
    // Explicitly disabled navigation (Lead/Opportunity)
    dynamicRecordUrl = undefined
  } else if (recordUrl) {
    // Use provided recordUrl
    dynamicRecordUrl = recordUrl
  } else {
    // Auto-generate for carousel items (Account/Contact/Investment records)
    dynamicRecordUrl = pageData?.id
      ? buildPlatformUrl('/platform/irm/investment-record', { investmentId: pageData.id })
      : undefined
  }

  return (
    <InvestmentDisplay
      investment={pageData}
      className={className}
      data-testid="investment-section"
      businessAppContext={extractBusinessAppContext(props)}
      onTitleClick={createTitleClickHandler(dynamicRecordUrl)}
      fields={fields}
    />
  )
}
;(InvestmentSection as any).getActionButtonConfig = (
  pageData: any,
  _pageIndex: number,
  props: InvestmentSectionProps
) => {
  const { accessToken, actionButtonProps } = props

  if (!actionButtonProps || !accessToken) {
    return null
  }

  return {
    type: 'AppActionButton' as const,
    config: {
      contextsArray: actionButtonProps.contextsArray || [getFlowContextForInvestment(pageData)],
      externalContextData: {
        ...actionButtonProps.externalContextData,
        investmentId: pageData?.id // Override with current page investmentId (must come after spread)
      },
      prefixDataTestId: actionButtonProps.prefixDataTestId || 'investment-section-action',
      emptyStateBehavior: 'enable' as const,
      deferMainContextRequestsUntilClick: true
    }
  }
}

export default InvestmentSection
