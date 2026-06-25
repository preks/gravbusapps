/**
 * IrmEntityImportView
 *
 * IRM-flavored import view. Wires the shared `EntityImportView` with the
 * IRM submission strategy.
 *
 * Enforced catalog selects (lead Status / Source / Rating, Investment Type,
 * Liquid Fund Type, …) are driven by `ImportConfig.enforcedSelects` and
 * resolved inside `EntityImportView` — this wrapper never touches them
 * directly.
 *
 * No campaign selection (CRM-only). Used by all IRM data-import screens.
 */

import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { useIrmImportSubmissionStrategy } from '@/common/components/common-relations/apps/data-import/hooks'
import { useInvestmentTypes } from '@/common/data/investment/hooks/useInvestmentTypes'
import {
  aggregateInvestmentGroupContext,
  type InvestmentGroupAnalyzerContext
} from '@/common/components/common-relations/apps/data-import/utils/aggregateInvestmentGroupContext'
import type { ImportAnalyzerContext } from '@/common/components/common-relations/apps/data-import/services'
import { EntityImportView } from './EntityImportView'

export interface IrmEntityImportViewProps extends BusinessAppContextProps {
  config: ImportConfig
  headerTitle: string
  headerDescription: string
  entityType: string
  entityTypeSingular: string
  /**
   * Additional enforced fields to merge with catalog-based enforced
   * selects during conversion. Used for GraphQL entity-based selects
   * (like InvestmentCompanyGroup) that can't use CatalogSelect.
   */
  additionalEnforcedFields?: Record<string, string>
  /** Slot for custom select components rendered on the upload step */
  customSelectsSlot?: React.ReactNode
  onBack?: () => void
  'data-testid'?: string
}

export const IrmEntityImportView: React.FC<IrmEntityImportViewProps> = ({
  config,
  headerTitle,
  headerDescription,
  entityType,
  entityTypeSingular,
  additionalEnforcedFields,
  customSelectsSlot,
  enableInvestmentCompanyGroupSelection = false,
  onBack,
  'data-testid': testId = 'irm-entity-import-view',
  ...context
}) => {
  const submissionStrategy = useIrmImportSubmissionStrategy(config)
  // Fetch the full InvestmentGroup → Type → LiquidFundType subtree once
  // and aggregate the LLM-only context (`requiredSubtypeKey` +
  // dynamic `additionalProperties.*` paths) for Flowbot. The aggregation
  // is a pure function; the context is silently forwarded — never shown
  // to the user.
  const { types: allInvestmentTypes } = useInvestmentTypes(context)
  const analyzerContext = useMemo<ImportAnalyzerContext>(() => {
    const aggregated: InvestmentGroupAnalyzerContext = aggregateInvestmentGroupContext(
      config.investmentGroupRef,
      allInvestmentTypes
    )
    return {
      requiredSubtypeKey: aggregated.requiredSubtypeKey,
      additionalPropertiesFields: aggregated.additionalPropertiesFields,
      tileFieldKeys: aggregated.tileFieldKeys
    }
  }, [config.investmentGroupRef, allInvestmentTypes])

  return (
    <EntityImportView
      config={config}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      entityType={entityType}
      entityTypeSingular={entityTypeSingular}
      enableInvestmentCompanyGroupSelection={enableInvestmentCompanyGroupSelection}
      submissionStrategy={submissionStrategy}
      analyzerContext={analyzerContext}
      additionalEnforcedFields={additionalEnforcedFields}
      customSelectsSlot={customSelectsSlot}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default IrmEntityImportView
