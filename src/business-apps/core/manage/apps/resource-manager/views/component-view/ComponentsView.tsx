import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DataDisplay, Button } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ComponentTab } from './tabs/component-tab/ComponentTab'
import { ComponentDebugTab, DEBUG_VIEW_IDS, type DebugViewId } from './tabs/debug-tab/ComponentDebugTab'

interface ComponentsViewProps extends BusinessAppContextProps {
  'data-testid'?: string
  onNavigateTo?: (view: string, params?: { tab?: string; subview?: string }) => void
}

const VALID_SECTIONS = ['components', 'debug'] as const
type SectionKey = (typeof VALID_SECTIONS)[number]

const DEBUG_VIEW_OPTIONS = [
  { value: DEBUG_VIEW_IDS[0], label: 'Without CDN index' },
  { value: DEBUG_VIEW_IDS[1], label: 'CDN without Components' },
  { value: DEBUG_VIEW_IDS[2], label: 'No path' }
] as const

const COMPONENTS_SORTABLE_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'screenKey', label: 'Screen Key' },
  { id: 'type', label: 'Type' },
  { id: 'updatedAt', label: 'Updated' },
  { id: 'createdAt', label: 'Created' }
]

export const ComponentsView: React.FC<ComponentsViewProps> = ({
  'data-testid': dataTestId = 'components-view',
  ...context
}) => {
  const getInitialSection = useCallback((): SectionKey => {
    if (typeof window === 'undefined') return 'components'
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')
    const tab = urlParams.get('tab')
    if (view === 'components' && tab && VALID_SECTIONS.includes(tab as SectionKey)) return tab as SectionKey
    return 'components'
  }, [])

  const getInitialDebugSubview = useCallback((): DebugViewId => {
    if (typeof window === 'undefined') return 'missing-in-cdn'
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')
    const tab = urlParams.get('tab')
    const subview = urlParams.get('subview')
    if (view === 'components' && tab === 'debug' && subview && DEBUG_VIEW_IDS.includes(subview as DebugViewId)) {
      return subview as DebugViewId
    }
    return 'missing-in-cdn'
  }, [])

  const [activeSection, setActiveSection] = useState<SectionKey>(getInitialSection())
  const [componentsSearchValue, setComponentsSearchValue] = useState('')
  const [componentsSorting, setComponentsSorting] = useState<Array<{ id: string; desc: boolean }>>([
    { id: 'updatedAt', desc: true }
  ])
  const [componentsVisibleColumns, setComponentsVisibleColumns] = useState<string[]>([
    'type',
    'name',
    'componentPath',
    'version',
    'updatedAt'
  ])
  const [componentsAvailableColumns, setComponentsAvailableColumns] = useState<Array<{ id: string; label: string }>>([
    { id: 'type', label: 'Type' },
    { id: 'name', label: 'Name' },
    { id: 'componentPath', label: 'Component Path' },
    { id: 'version', label: 'Tenant Version' },
    { id: 'updatedAt', label: 'Updated' }
  ])
  const [addComponent, setAddComponent] = useState<(() => void) | null>(null)
  const [componentsCount, setComponentsCount] = useState<number | undefined>(undefined)
  const [componentsLoading, setComponentsLoading] = useState(false)
  const [debugCount, setDebugCount] = useState<number | undefined>(undefined)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugSubview, setDebugSubview] = useState<DebugViewId>('missing-in-cdn')

  const currentSearchValue = activeSection === 'components' ? componentsSearchValue : ''
  const handleSearchChange = useCallback(
    (value: string) => {
      if (activeSection === 'components') setComponentsSearchValue(value)
    },
    [activeSection]
  )

  const updateUrl = useCallback((tab: string, subview?: string) => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('view', 'components')
    urlParams.set('tab', tab)
    if (tab === 'debug' && subview) {
      urlParams.set('subview', subview)
    } else {
      urlParams.delete('subview')
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`)
  }, [])

  const handleSectionChange = useCallback(
    (section: string) => {
      if (!section || section === activeSection) return
      if (VALID_SECTIONS.includes(section as SectionKey)) {
        setActiveSection(section as SectionKey)
        if (section === 'debug') {
          setDebugSubview(getInitialDebugSubview())
          updateUrl(section, getInitialDebugSubview())
        } else {
          updateUrl(section)
        }
      }
    },
    [activeSection, updateUrl, getInitialDebugSubview]
  )

  const handleDebugViewChange = useCallback(
    (view: string) => {
      if (DEBUG_VIEW_IDS.includes(view as DebugViewId)) {
        setDebugSubview(view as DebugViewId)
        updateUrl('debug', view)
      }
    },
    [updateUrl]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (getInitialSection() === 'debug') setDebugSubview(getInitialDebugSubview())
  }, [getInitialSection, getInitialDebugSubview])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handlePopState = () => {
      setActiveSection(getInitialSection())
      if (getInitialSection() === 'debug') setDebugSubview(getInitialDebugSubview())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getInitialSection, getInitialDebugSubview])

  const handleAddComponentChange = useCallback((fn: (() => void) | null) => {
    setAddComponent(() => fn)
  }, [])

  const handleToolbarConfigChange = useCallback(
    (config: {
      sortableColumns?: Array<{ id: string; label: string }>
      availableColumns?: Array<{ id: string; label: string }>
    }) => {
      if (config.availableColumns?.length) {
        setComponentsAvailableColumns(config.availableColumns)
        const ids = config.availableColumns.map(c => c.id)
        const azureCols = ['devVersion', 'prodVersion'].filter(id => ids.includes(id))
        if (azureCols.length > 0) {
          setComponentsVisibleColumns(prev => {
            const missing = azureCols.filter(id => !prev.includes(id))
            if (missing.length === 0) return prev
            const versionIndex = prev.indexOf('version')
            const insertIndex = versionIndex >= 0 ? versionIndex + 1 : prev.length
            const next = [...prev]
            missing.forEach((id, i) => next.splice(insertIndex + i, 0, id))
            return next
          })
        }
      }
    },
    []
  )

  const primaryAction = useMemo(() => {
    if (activeSection === 'components') {
      return (
        <Button
          variant="default"
          size="sm"
          onClick={() => addComponent?.()}
          disabled={componentsLoading}
          data-testid={`${dataTestId}-create-component-button`}
        >
          <PlusIcon className="gba:h-4 gba:w-4 gba:mr-1" />
          Create Component
        </Button>
      )
    }
    return undefined
  }, [activeSection, addComponent, componentsLoading, dataTestId])

  const debugViewOptions = useMemo(() => DEBUG_VIEW_OPTIONS.map(o => ({ value: o.value, label: o.label })), [])
  const dataDisplayKey = `components-view-${activeSection}${activeSection === 'debug' ? `-${debugSubview}` : ''}`

  return (
    <div data-testid={dataTestId}>
      <DataDisplay
        key={dataDisplayKey}
        titleSections={[
          {
            id: 'components',
            label: 'Components',
            metadata: { count: componentsCount, isLoading: componentsLoading }
          },
          {
            id: 'debug',
            label: 'Debug',
            metadata: { count: debugCount, isLoading: debugLoading }
          }
        ]}
        currentSection={activeSection}
        onSectionChange={handleSectionChange}
        searchValue={currentSearchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder={activeSection === 'components' ? 'Search screens...' : undefined}
        sorting={activeSection === 'components' ? componentsSorting : undefined}
        sortableColumns={activeSection === 'components' ? COMPONENTS_SORTABLE_COLUMNS : undefined}
        onSortingChange={activeSection === 'components' ? setComponentsSorting : undefined}
        availableColumns={activeSection === 'components' ? componentsAvailableColumns : undefined}
        visibleColumns={activeSection === 'components' ? componentsVisibleColumns : undefined}
        onVisibleColumnsChange={activeSection === 'components' ? setComponentsVisibleColumns : undefined}
        toolbarDensity="default"
        enableLiveFiltering={activeSection === 'components'}
        viewOptions={activeSection === 'debug' ? debugViewOptions : undefined}
        currentView={activeSection === 'debug' ? debugSubview : undefined}
        onViewChange={activeSection === 'debug' ? handleDebugViewChange : undefined}
        primaryAction={primaryAction}
      >
        {activeSection === 'components' && (
          <div className={activeSection === 'components' ? '' : 'gba:hidden'}>
            <ComponentTab
              {...context}
              data-testid={`${dataTestId}-component-tab`}
              searchValue={componentsSearchValue}
              onSearchChange={setComponentsSearchValue}
              sorting={componentsSorting}
              onSortingChange={setComponentsSorting}
              visibleColumns={componentsVisibleColumns}
              onVisibleColumnsChange={setComponentsVisibleColumns}
              onCountChange={setComponentsCount}
              onLoadingChange={setComponentsLoading}
              onAddComponentChange={handleAddComponentChange}
              onToolbarConfigChange={handleToolbarConfigChange}
            />
          </div>
        )}
        {activeSection === 'debug' && (
          <div className={activeSection === 'debug' ? '' : 'gba:hidden'}>
            <ComponentDebugTab
              {...context}
              data-testid={`${dataTestId}-debug`}
              currentView={debugSubview}
              onViewChange={handleDebugViewChange}
              onCountChange={setDebugCount}
              onLoadingChange={setDebugLoading}
              isActive={activeSection === 'debug'}
            />
          </div>
        )}
      </DataDisplay>
    </div>
  )
}
