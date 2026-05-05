import React, { useState, useCallback, useEffect } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { type UseReportFiltersReturn } from '../hooks'
import { useReportViewPreferences } from '../hooks/useReportViewPreferences'
import { resolveReportSubSections, type SubSection } from '../utils/subSectionHelpers'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { InvestmentReportPanel } from './InvestmentReportPanel'

/**
 * Props for GenericReportTab component
 */
interface GenericReportTabProps extends BusinessAppContextProps {
  /** Investment group catalog code. */
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
 *   1. Discovers sub-sections from catalog hierarchy.
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
  // Sub-section discovery (strategy is derived from the catalog)
  const [currentSection, setCurrentSection] = useState<string>('')
  const [subSections, setSubSections] = useState<SubSection[]>([])
  const [subSectionsLoading, setSubSectionsLoading] = useState(true)

  useEffect(() => {
    if (!catalogData) {
      setSubSectionsLoading(true)
      setSubSections([])
      setCurrentSection('')
      return
    }

    setSubSectionsLoading(true)
    try {
      const sections = resolveReportSubSections(investmentGroup, catalogData)
      setSubSections(sections)
      setCurrentSection(previousSection => {
        if (sections.length === 0) return ''
        if (previousSection && sections.some(section => section.code === previousSection)) return previousSection

        const urlParams = new URLSearchParams(globalThis.location.search)
        const investmentTypeFromUrl = urlParams.get('investmentType')
        if (investmentTypeFromUrl && sections.some(section => section.code === investmentTypeFromUrl)) {
          return investmentTypeFromUrl
        }

        return sections[0].code
      })
    } catch (error) {
      console.error(`Error loading sub-sections for ${investmentGroup}:`, error)
      setSubSections([])
      setCurrentSection('')
    } finally {
      setSubSectionsLoading(false)
    }
  }, [investmentGroup, catalogData])

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
      <div className="gba:flex gba:min-h-64 gba:items-center gba:justify-center">
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  if (subSections.length === 0) {
    return (
      <div className="gba:flex gba:min-h-64 gba:items-center gba:justify-center">
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
