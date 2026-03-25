import React, { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, Input, ScrollArea } from '@newwork/nw-design-system'
import { PlayIcon, ArticleNyTimesIcon, ChatCircleIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { BusinessAppInfo } from '../../ide-main-menu'
import {
  type MenuConfiguration,
  buildSearchTokens,
  resolveNodeConfiguration,
  renderConfiguredPhosphorIcon
} from '../../ide-main-menu/menuConfiguration'

export interface GlobalSearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessApps: BusinessAppInfo[]
  menuConfiguration?: MenuConfiguration
  onAppSelect: (app: BusinessAppInfo) => void
}

type BusinessAppType = BusinessAppInfo['type']

const getTypeIcon = (type: BusinessAppType) => {
  switch (type) {
    case 'app':
      return <PlayIcon size={16} className="gba:text-info" />
    case 'record':
      return <PlayIcon size={16} className="gba:text-destructive" />
    case 'form':
      return <ArticleNyTimesIcon size={16} className="gba:text-success" />
    case 'popup':
      return <ChatCircleIcon size={16} className="gba:text-warning" />
    case 'window':
      return <ArticleNyTimesIcon size={16} className="gba:text-destructive" />
    default:
      return <PlayIcon size={16} className="gba:text-primary" />
  }
}

const getTypeLabel = (type: BusinessAppType): string => {
  switch (type) {
    case 'app':
      return 'App'
    case 'record':
      return 'Record'
    case 'form':
      return 'Form'
    case 'popup':
      return 'Popup'
    case 'window':
      return 'Window'
    default:
      return 'App'
  }
}

export const GlobalSearchCommand: React.FC<GlobalSearchCommandProps> = ({
  open,
  onOpenChange,
  businessApps,
  menuConfiguration,
  onAppSelect
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const getAppPath = (businessApp: BusinessAppInfo): string =>
    businessApp.subModule ? `${businessApp.module}/${businessApp.subModule}` : businessApp.module

  const searchMetadataByScreenKey = useMemo(() => {
    const metadataMap = new Map<
      string,
      {
        searchTitle: string
        searchSubtitle: string
        searchTokens: string[]
        icon: React.ReactNode | null
      }
    >()

    businessApps.forEach(businessApp => {
      const appConfiguration = resolveNodeConfiguration(menuConfiguration, [
        `app:${businessApp.screenKey}`,
        businessApp.screenKey,
        getAppPath(businessApp)
      ])
      const searchTitle = appConfiguration.searchLabel ?? appConfiguration.menuLabel ?? businessApp.name
      const searchSubtitle =
        appConfiguration.menuLabel ??
        `${businessApp.module}${businessApp.subModule ? ` › ${businessApp.subModule}` : ''}`
      const searchTokens = buildSearchTokens(
        searchTitle,
        searchSubtitle,
        businessApp.name,
        businessApp.module,
        businessApp.subModule,
        businessApp.path,
        appConfiguration.searchKeywords,
        appConfiguration.searchTags
      )

      metadataMap.set(businessApp.screenKey, {
        searchTitle,
        searchSubtitle,
        searchTokens,
        icon: renderConfiguredPhosphorIcon(appConfiguration.icon, { size: 16 })
      })
    })

    return metadataMap
  }, [businessApps, menuConfiguration])

  const filteredApps = useMemo(() => {
    if (!query) return businessApps.slice(0, 20)

    const lowerQuery = query.toLowerCase()
    return businessApps
      .filter(app => {
        const searchMetadata = searchMetadataByScreenKey.get(app.screenKey)
        if (!searchMetadata) {
          return false
        }

        return searchMetadata.searchTokens.some(searchToken => searchToken.includes(lowerQuery))
      })
      .slice(0, 50)
  }, [query, businessApps, searchMetadataByScreenKey])

  const groupedResults = useMemo(() => {
    const groups: Record<BusinessAppType, BusinessAppInfo[]> = {
      app: [],
      record: [],
      form: [],
      popup: [],
      window: []
    }

    filteredApps.forEach(app => {
      groups[app.type].push(app)
    })

    return groups
  }, [filteredApps])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = (app: BusinessAppInfo) => {
    onAppSelect(app)
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredApps.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filteredApps[selectedIndex]) {
      e.preventDefault()
      handleSelect(filteredApps[selectedIndex])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[650px] gba:p-0 gba:gap-0" onKeyDown={handleKeyDown}>
        <div className="gba:flex gba:items-center gba:border-b gba:border-border gba:px-4 gba:py-3">
          <MagnifyingGlassIcon size={20} className="gba:text-muted-foreground gba:mr-2" />
          <Input
            placeholder="Search apps, records, forms, windows, popups..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="gba:border-0 gba:focus-visible:ring-0 gba:focus-visible:ring-offset-0 gba:px-0"
            autoFocus
          />
          <kbd className="gba:ml-2 gba:px-2 gba:py-1 gba:text-xs gba:bg-muted gba:rounded">ESC</kbd>
        </div>

        <ScrollArea className="gba:max-h-[400px]">
          {filteredApps.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-muted-foreground">
              <MagnifyingGlassIcon size={48} className="gba:mx-auto gba:mb-3 gba:opacity-50" />
              <p className="gba:text-sm">No results found</p>
              {query && <p className="gba:text-xs gba:mt-1">Try a different search term</p>}
            </div>
          ) : (
            <div className="gba:p-2">
              {(['app', 'record', 'form', 'window', 'popup'] as BusinessAppType[]).map(type => {
                const apps = groupedResults[type]
                if (apps.length === 0) return null

                return (
                  <div key={type} className="gba:mb-3">
                    <div className="gba:px-2 gba:py-1 gba:text-xs gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                      {getTypeIcon(type)}
                      {getTypeLabel(type)}s ({apps.length})
                    </div>
                    {apps.map(app => {
                      const globalIndex = filteredApps.indexOf(app)
                      const isSelected = globalIndex === selectedIndex

                      return (
                        <button
                          key={app.screenKey}
                          onClick={() => handleSelect(app)}
                          className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-md gba:text-left gba:transition-colors ${
                            isSelected ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-accent/50'
                          }`}
                          data-testid={`search-result-${app.screenKey}`}
                        >
                          {searchMetadataByScreenKey.get(app.screenKey)?.icon ?? getTypeIcon(app.type)}
                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:text-sm gba:font-medium gba:truncate">
                              {searchMetadataByScreenKey.get(app.screenKey)?.searchTitle ?? app.name}
                            </div>
                            <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                              {searchMetadataByScreenKey.get(app.screenKey)?.searchSubtitle ??
                                `${app.module}${app.subModule ? ` › ${app.subModule}` : ''}`}
                            </div>
                          </div>
                          <kbd className="gba:px-2 gba:py-0.5 gba:text-xs gba:bg-muted gba:rounded gba:opacity-50">
                            {getTypeLabel(app.type).slice(0, 1)}
                          </kbd>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <div className="gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border gba:px-4 gba:py-2 gba:text-xs gba:text-muted-foreground">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-1">
              <kbd className="gba:px-1.5 gba:py-0.5 gba:bg-muted gba:rounded">↑</kbd>
              <kbd className="gba:px-1.5 gba:py-0.5 gba:bg-muted gba:rounded">↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <kbd className="gba:px-1.5 gba:py-0.5 gba:bg-muted gba:rounded">↵</kbd>
              <span>to select</span>
            </div>
          </div>
          <div className="gba:text-[10px]">{filteredApps.length} results</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
