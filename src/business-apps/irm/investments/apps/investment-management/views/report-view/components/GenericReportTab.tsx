import React, { useState, useCallback, useEffect } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { type UseReportFiltersReturn } from '../hooks'
import { useReportViewPreferences } from '../hooks/useReportViewPreferences'
import { getReportGroupConfiguration } from '../config/reportGroupConfigurations'
import { getSubSectionsForStrategy, type SubSection } from '../utils/subSectionHelpers'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { InvestmentReportPanel } from './InvestmentReportPanel'

/**
 * Props for GenericReportTab component
 */
interface GenericReportTabProps extends BusinessAppContextProps {
  /** Investment group code (e.g., 'EQUITY', 'REAL_ESTATE', 'LIQUID_FUND') */
  investmentGroup: string
  /** Display label for the group */
  groupLabel: string
  /** Shared filters from parent ReportView */
  reportFilters: UseReportFiltersReturn
  /** Callback when currencies are discovered */
  onCurrenciesUpdate: (currencies: string[]) => void
  /** Catalog data (shared across all tabs) */
  catalogData: any
  /** Whether this tab is currently active */
  enabled: boolean
  /** Data test ID prefix */
  dataTestId?: string
}

/**
 * Generic Report Tab Component
 *
 * Orchestrates the portfolio-level report view for a single investment group:
 *   1. Discovers sub-sections via the group's `subSectionStrategy`.
 *   2. Syncs the current sub-section to the URL.
 *   3. Delegates the rendering of the toolbar + filtered table to
 *      {@link InvestmentReportPanel}, which contains the truly group-agnostic
 *      logic (catalog-driven filters, dynamic columns, sorting, exports, …).
 *
 * The same panel is used by the investment record's Reports tab — see
 * `InvestmentReportsTab` — so all configurable/generic report behavior stays
 * in one place.
 */
export const GenericReportTab: React.FC<GenericReportTabProps> = ({
  investmentGroup,
  groupLabel,
  reportFilters,
  onCurrenciesUpdate,
  catalogData,
  enabled,
  accessToken,
  userInfo,
  dataTestId = 'generic-report-tab'
}) => {
  const config = getReportGroupConfiguration(investmentGroup)

  // Sub-section discovery (strategy is per-group)
  const [currentSection, setCurrentSection] = useState<string>('')
  const [subSections, setSubSections] = useState<SubSection[]>([])
  const [subSectionsLoading, setSubSectionsLoading] = useState(true)

  useEffect(() => {
    const loadSubSections = async () => {
      if (!accessToken) {
        setSubSectionsLoading(false)
        return
      }

      setSubSectionsLoading(true)
      try {
        let sections = await getSubSectionsForStrategy(config.subSectionStrategy, investmentGroup, accessToken)

        // Auto-fallback: if a group declares 'investmentTypes' but has none in
        // catalog (fields live at the group level), fall back to a single
        // synthetic 'overview' section so the panel still renders.
        if (sections.length === 0 && config.subSectionStrategy === 'investmentTypes') {
          sections = await getSubSectionsForStrategy('none', investmentGroup, accessToken)
        }

        setSubSections(sections)

        if (sections.length > 0 && !currentSection) {
          const urlParams = new URLSearchParams(globalThis.location.search)
          const investmentTypeFromUrl = urlParams.get('investmentType')

          if (investmentTypeFromUrl && sections.some(s => s.code === investmentTypeFromUrl)) {
            setCurrentSection(investmentTypeFromUrl)
          } else {
            setCurrentSection(sections[0].code)
          }
        }
      } catch (error) {
        console.error(`Error loading sub-sections for ${investmentGroup}:`, error)
        setSubSections([])
      } finally {
        setSubSectionsLoading(false)
      }
    }

    loadSubSections()
  }, [config.subSectionStrategy, investmentGroup, accessToken])

  // URL sync — keeps the active sub-section reflected in `?investmentType=...`
  const updateUrl = useCallback((investmentType: string) => {
    try {
      const currentUrl = new URL(globalThis.location.href)
      const params: Record<string, string> = {}

      currentUrl.searchParams.forEach((value, key) => {
        params[key] = value
      })

      params.investmentType = investmentType

      const newUrl = buildPlatformUrl(currentUrl.pathname, params)

      if (globalThis.history?.replaceState) {
        globalThis.history.replaceState({}, '', newUrl)
      }
    } catch (error) {
      console.warn('Failed to update URL:', error)
    }
  }, [])

  const handleSectionChange = useCallback(
    (code: string) => {
      setCurrentSection(code)
      updateUrl(code)
    },
    [updateUrl]
  )

  const [searchBySection, setSearchBySection] = useState<Record<string, string>>({})
  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchBySection(prev => ({ ...prev, [currentSection]: search }))
    },
    [currentSection]
  )

  const { preferencesBySection, savePreferencePatch } = useReportViewPreferences(investmentGroup, subSections)

  const handleSortingChange = useCallback(
    (sorting: Array<{ id: string; desc: boolean }>) => {
      savePreferencePatch(currentSection, { sorting })
    },
    [currentSection, savePreferencePatch]
  )

  const handleFiltersChange = useCallback(
    (filters: Record<string, any>) => {
      savePreferencePatch(currentSection, { filters })
    },
    [currentSection, savePreferencePatch]
  )

  const handleVisibleColumnsChange = useCallback(
    (visibleColumns: string[]) => {
      savePreferencePatch(currentSection, { visibleColumns })
    },
    [currentSection, savePreferencePatch]
  )

  // Browser back/forward navigation support
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(globalThis.location.search)
      const investmentTypeFromUrl = urlParams.get('investmentType')
      if (investmentTypeFromUrl && subSections.some(s => s.code === investmentTypeFromUrl)) {
        setCurrentSection(investmentTypeFromUrl)
      }
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [subSections])

  // Loading / empty states
  if (subSectionsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  if (subSections.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <div className="gba:text-center gba:text-muted-foreground">No report categories found for {groupLabel}</div>
      </div>
    )
  }

  return (
    <InvestmentReportPanel
      key={currentSection}
      investmentGroup={investmentGroup}
      groupLabel={groupLabel}
      sections={subSections}
      currentSection={currentSection}
      onSectionChange={handleSectionChange}
      showSectionBar
      initialSearch={searchBySection[currentSection]}
      onSearchChange={handleSearchChange}
      initialSorting={preferencesBySection[currentSection]?.sorting ?? null}
      onSortingChange={handleSortingChange}
      initialFilters={preferencesBySection[currentSection]?.filters ?? {}}
      onFiltersChange={handleFiltersChange}
      initialVisibleColumns={preferencesBySection[currentSection]?.visibleColumns ?? null}
      onVisibleColumnsChange={handleVisibleColumnsChange}
      reportFilters={reportFilters}
      catalogData={catalogData}
      enabled={enabled}
      onCurrenciesUpdate={onCurrenciesUpdate}
      accessToken={accessToken}
      userInfo={userInfo}
      dataTestId={dataTestId}
      primaryAction={
        <AppAction
          variant="create-primary"
          contexts={[
            {
              context: FlowContextName.investmentReportCreate,
              contextData: {}
            }
          ]}
          accessToken={accessToken || ''}
          data-testid="report-view-add-report-action"
        >
          {getTranslationFromI18nKeyAndLabel('investment.reports.addReport', 'Add Report')}
        </AppAction>
      }
    />
  )
}

export default GenericReportTab
