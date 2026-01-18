import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import {
  BuildingIcon,
  CalendarIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckSquareIcon,
  FolderIcon,
  GridFourIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import { InvestmentPortalDocuments } from './InvestmentPortalDocuments'
import { InvestmentPortalTasks } from './InvestmentPortalTasks'
import { InvestmentPortalTiles } from './InvestmentPortalTiles'

interface InvestmentExpandableCardProps extends BusinessAppContextProps {
  investment: Investment
  prefixDataTestId?: string
  defaultExpanded?: boolean
  showExpandButton?: boolean
  isExpandedFromUrl?: boolean
  activeTabFromUrl?: string
  onExpandChange?: (investmentId: string, isExpanded: boolean) => void
  onTabChange?: (investmentId: string, tab: string) => void
}

export const InvestmentExpandableCard: React.FC<InvestmentExpandableCardProps> = ({
  investment,
  accessToken,
  userInfo,
  additionalData,
  prefixDataTestId = 'InvestmentExpandableCard',
  defaultExpanded = false,
  showExpandButton = true,
  isExpandedFromUrl,
  activeTabFromUrl,
  onExpandChange,
  onTabChange
}) => {
  const [isExpanded, setIsExpanded] = useState(isExpandedFromUrl ?? defaultExpanded)
  const [activeTab, setActiveTab] = useState(activeTabFromUrl ?? 'documents')

  // Sync with URL state changes
  useEffect(() => {
    if (isExpandedFromUrl !== undefined) {
      setIsExpanded(isExpandedFromUrl)
    }
  }, [isExpandedFromUrl])

  useEffect(() => {
    if (activeTabFromUrl) {
      setActiveTab(activeTabFromUrl)
    }
  }, [activeTabFromUrl])

  // Format date to show only date part (no time)
  const formatDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return '-'

    const formatted = formatDate(dateString, 'date.short')

    // If formatDate returns ISO string (fallback), extract just the date part
    if (formatted?.includes('T')) {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }

    return formatted || '-'
  }

  // Handle expand/collapse with URL update
  const handleExpandToggle = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onExpandChange?.(investment.id, newExpanded)
  }

  // Handle tab change with URL update
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    onTabChange?.(investment.id, tab)
  }

  // Handle keyboard interaction for expandable header
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showExpandButton && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      handleExpandToggle()
    }
  }

  // Compute aria-label to avoid nested ternary
  const headerAriaLabel = showExpandButton
    ? `${isExpanded ? 'Collapse' : 'Expand'} ${investment.name} investment details`
    : undefined

  return (
    <Card
      data-testid={formatDataTestId(prefixDataTestId, investment.id)}
      className="gba:border gba:border-border gba:bg-card gba:transition-all gba:duration-200"
    >
      <CardContent className="gba:p-0">
        {/* Header - Always visible */}
        {showExpandButton ? (
          <button
            type="button"
            className="gba:w-full gba:p-6 gba:flex gba:items-center gba:justify-between gba:gap-4 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:text-left"
            onClick={handleExpandToggle}
            onKeyDown={handleKeyDown}
            aria-expanded={isExpanded}
            aria-label={headerAriaLabel}
          >
            <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
              {/* Avatar */}
              <Avatar size="lg" className="gba:flex-shrink-0">
                {investment.investmentAccount?.pictureThumbnail ? (
                  <AvatarImage
                    src={`data:image/jpeg;base64,${investment.investmentAccount.pictureThumbnail}`}
                    alt={investment.investmentAccount.name || investment.name}
                  />
                ) : null}
                <AvatarFallback className="gba:bg-gradient-to-br gba:from-primary/15 gba:to-primary/5 gba:text-primary">
                  <BuildingIcon size={28} weight="duotone" />
                </AvatarFallback>
              </Avatar>

              {/* Investment Info */}
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1">
                  <h3 className="gba:m-0 gba:text-xl gba:font-bold gba:text-foreground">{investment.name}</h3>
                  {investment.investmentGroup?.value && (
                    <Badge variant="secondary" className="gba:text-xs">
                      {investment.investmentGroup.value}
                    </Badge>
                  )}
                  {investment.investmentType?.value && (
                    <Badge variant="secondary" className="gba:text-xs">
                      {investment.investmentType.value}
                    </Badge>
                  )}
                  {investment.investmentStatus?.value && (
                    <Badge variant="outline" className="gba:text-xs">
                      {investment.investmentStatus.value}
                    </Badge>
                  )}
                </div>

                <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:flex-wrap">
                  {investment.code && <span className="gba:font-medium">{investment.code}</span>}
                  {investment.investmentAccount?.name && (
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <BuildingIcon size={14} weight="duotone" />
                      <span>{investment.investmentAccount.name}</span>
                    </div>
                  )}
                  {investment.acquisitionDate && (
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <CalendarIcon size={14} weight="duotone" />
                      <span>{formatDateOnly(investment.acquisitionDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expand Button */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
              {isExpanded ? <CaretUpIcon size={20} /> : <CaretDownIcon size={20} />}
            </div>
          </button>
        ) : (
          <div className="gba:p-6 gba:flex gba:items-center gba:justify-between gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
              {/* Avatar */}
              <Avatar size="lg" className="gba:flex-shrink-0">
                {investment.investmentAccount?.pictureThumbnail ? (
                  <AvatarImage
                    src={`data:image/jpeg;base64,${investment.investmentAccount.pictureThumbnail}`}
                    alt={investment.investmentAccount.name || investment.name}
                  />
                ) : null}
                <AvatarFallback className="gba:bg-gradient-to-br gba:from-primary/15 gba:to-primary/5 gba:text-primary">
                  <BuildingIcon size={28} weight="duotone" />
                </AvatarFallback>
              </Avatar>

              {/* Investment Info */}
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1">
                  <h3 className="gba:m-0 gba:text-xl gba:font-bold gba:text-foreground">{investment.name}</h3>
                  {investment.investmentGroup?.value && (
                    <Badge variant="secondary" className="gba:text-xs">
                      {investment.investmentGroup.value}
                    </Badge>
                  )}
                  {investment.investmentType?.value && (
                    <Badge variant="secondary" className="gba:text-xs">
                      {investment.investmentType.value}
                    </Badge>
                  )}
                  {investment.investmentStatus?.value && (
                    <Badge variant="outline" className="gba:text-xs">
                      {investment.investmentStatus.value}
                    </Badge>
                  )}
                </div>

                <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:flex-wrap">
                  {investment.code && <span className="gba:font-medium">{investment.code}</span>}
                  {investment.investmentAccount?.name && (
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <BuildingIcon size={14} weight="duotone" />
                      <span>{investment.investmentAccount.name}</span>
                    </div>
                  )}
                  {investment.acquisitionDate && (
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <CalendarIcon size={14} weight="duotone" />
                      <span>{formatDateOnly(investment.acquisitionDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Content - Documents & Tasks */}
        {(isExpanded || !showExpandButton) && (
          <div className="gba:border-t gba:border-border gba:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
              <TabsList className="gba:mb-4">
                <TabsTrigger value="documents" startIcon={<FolderIcon size={16} />}>
                  {getTranslationFromI18nKeyAndLabel('documents.title', 'Documents')}
                </TabsTrigger>
                <TabsTrigger value="tasks" startIcon={<CheckSquareIcon size={16} />}>
                  {getTranslationFromI18nKeyAndLabel('tasks.title', 'Tasks')}
                </TabsTrigger>
                <TabsTrigger value="tiles" startIcon={<GridFourIcon size={16} />}>
                  {getTranslationFromI18nKeyAndLabel('tiles.title', 'Tiles')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents">
                <InvestmentPortalDocuments
                  investmentId={investment.id}
                  context={{
                    accessToken,
                    userInfo,
                    additionalData
                  }}
                />
              </TabsContent>

              <TabsContent value="tasks">
                <InvestmentPortalTasks
                  investmentId={investment.id}
                  context={{
                    accessToken,
                    userInfo,
                    additionalData
                  }}
                />
              </TabsContent>

              <TabsContent value="tiles">
                <InvestmentPortalTiles
                  investmentId={investment.id}
                  investment={investment}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  additionalData={additionalData}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
