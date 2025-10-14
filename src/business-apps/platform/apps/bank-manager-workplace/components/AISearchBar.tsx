/**
 * AI-Powered Search/Command Bar
 * Natural language understanding with context-aware navigation
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Badge
} from '@newwork/nw-design-system'
import {
  MagnifyingGlass,
  User,
  Users,
  FileText,
  CalendarBlank,
  CurrencyDollar,
  ChartBar,
  CheckCircle,
  Sparkle
} from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface AISearchBarProps {
  onOpenChat?: (prefilledMessage: string) => void
}

interface SearchResult {
  id: string
  title: string
  description?: string
  category: 'action' | 'navigation' | 'entity' | 'ai-suggestion'
  icon: React.ReactNode
  action: () => void
  keywords: string[]
  aiScore?: number
}

export const AISearchBar: React.FC<AISearchBarProps> = ({ onOpenChat }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(open => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // AI-Powered search results based on natural language
  const searchResults: SearchResult[] = useMemo(() => {
    const allResults: SearchResult[] = [
      // Quick Actions - With Real Navigation
      {
        id: 'approve-expenses',
        title: 'Spesenanträge genehmigen',
        description: '5 offene Genehmigungen',
        category: 'action',
        icon: <CheckCircle className="gba:h-4 gba:w-4" />,
        action: () => {
          const url = buildPlatformUrl('/platform/fin/expenses/manager-expenses')
          navigateTo(url)
        },
        keywords: ['spesen', 'expenses', 'genehmigen', 'approve', 'ausgaben', 'kosten']
      },
      {
        id: 'review-absences',
        title: 'Urlaubsanträge prüfen',
        description: 'Team-Abwesenheiten',
        category: 'action',
        icon: <CalendarBlank className="gba:h-4 gba:w-4" />,
        action: () => {
          const url = buildPlatformUrl('/platform/hr/absences/manager-absences')
          navigateTo(url)
        },
        keywords: ['urlaub', 'vacation', 'kalender', 'calendar', 'abwesenheit', 'absence', 'prüfen', 'frei']
      },
      {
        id: 'team-performance',
        title: 'Team Performance',
        description: 'Analytics und Insights',
        category: 'action',
        icon: <ChartBar className="gba:h-4 gba:w-4" />,
        action: () => {
          const url = buildPlatformUrl('/platform/hr/human-resources', { view: 'analytics' })
          navigateTo(url)
        },
        keywords: ['performance', 'team', 'analytics', 'leistung', 'auswertung', 'statistik']
      },

      // Banking-Specific Actions (Currently show message, can be connected to real apps later)
      {
        id: 'loans-applications',
        title: 'Kreditanträge bearbeiten',
        description: 'Ausstehende Anträge prüfen',
        category: 'action',
        icon: <FileText className="gba:h-4 gba:w-4" />,
        action: () => {
          alert('Kreditanträge-Modul: Hier würden die ausstehenden Kreditanträge angezeigt. Diese Funktion ist in Entwicklung.')
        },
        keywords: ['kredit', 'kredite', 'loan', 'loans', 'darlehen', 'antrag', 'anträge', 'application']
      },

      // Navigation - Real Platform Links
      {
        id: 'nav-hr',
        title: 'Human Resources',
        description: 'Mitarbeiter-Verwaltung',
        category: 'navigation',
        icon: <Users className="gba:h-4 gba:w-4" />,
        action: () => {
          const url = buildPlatformUrl('/platform/hr/human-resources')
          navigateTo(url)
        },
        keywords: ['team', 'mitarbeiter', 'employees', 'hr', 'personal', 'kollegen']
      },
      {
        id: 'nav-customers',
        title: 'CRM - Kunden',
        description: 'Kundenbeziehungen verwalten',
        category: 'navigation',
        icon: <User className="gba:h-4 gba:w-4" />,
        action: () => {
          const url = buildPlatformUrl('/platform/crm/customer-relations', { view: 'accounts' })
          navigateTo(url)
        },
        keywords: ['kunden', 'customers', 'crm', 'accounts', 'kundenbeziehungen', 'vip']
      },
      {
        id: 'nav-opportunities',
        title: 'Opportunities',
        description: 'Verkaufschancen und Pipeline',
        category: 'navigation',
        icon: <CurrencyDollar className="gba:h-4 gba:w-4" />,
        action: () => {
          const url = buildPlatformUrl('/platform/crm/customer-relations', { view: 'opportunities' })
          navigateTo(url)
        },
        keywords: ['opportunities', 'verkaufschancen', 'pipeline', 'sales', 'verkauf', 'deal']
      }
    ]

    // Filter results based on search query
    if (!search.trim()) {
      // Show all results when no search
      return allResults
    }

    const searchLower = search.toLowerCase()
    const filtered = allResults.filter(result =>
      result.title.toLowerCase().includes(searchLower) ||
      result.description?.toLowerCase().includes(searchLower) ||
      result.keywords.some(keyword => keyword.includes(searchLower))
    )

    // Sort by relevance (exact match first, then AI score)
    return filtered.sort((a, b) => {
      const aExact = a.keywords.some(k => k === searchLower)
      const bExact = b.keywords.some(k => k === searchLower)
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return (b.aiScore || 0) - (a.aiScore || 0)
    })
  }, [search, onOpenChat])

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      'ai-suggestion': [],
      action: [],
      navigation: [],
      entity: []
    }

    searchResults.forEach(result => {
      groups[result.category].push(result)
    })

    return groups
  }, [searchResults])

  return (
    <>
      {/* AI-Themed Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="gba:relative gba:flex gba:items-center gba:gap-3 gba:w-full gba:max-w-3xl gba:mx-auto gba:px-6 gba:py-5 gba:bg-card gba:border-2 gba:border-primary gba:rounded-xl hover:gba:shadow-xl gba:transition-all gba:group"
        data-testid="ai-search-trigger"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.15), 0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.3), 0 8px 12px rgba(0, 0, 0, 0.15)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.15), 0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* AI Sparkle Icon */}
        <Sparkle className="gba:h-6 gba:w-6 gba:text-primary group-hover:gba:scale-110 gba:transition-transform" weight="duotone" />
        
        {/* Search text */}
        <span className="gba:text-sm gba:font-medium gba:flex-1 gba:text-left gba:text-foreground">
          Suche: "Kredit", "Spesen", "Urlaub", "Team", "Kunden"...
        </span>
        
        {/* Keyboard shortcut badge */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant="secondary" className="gba:text-xs gba:font-mono">
            ⌘K
          </Badge>
          <MagnifyingGlass className="gba:h-5 gba:w-5 gba:text-primary" />
        </div>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Suchen Sie nach Aktionen oder Seiten..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            <div className="gba:py-6 gba:text-center gba:text-sm">
              <Sparkle className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
              <p className="gba:text-muted-foreground">Keine Ergebnisse gefunden.</p>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                Versuchen Sie: "Kredit", "Spesen", "Urlaub", "Team", "Kunden"
              </p>
            </div>
          </CommandEmpty>

          {/* Quick Actions */}
          {groupedResults.action.length > 0 && (
            <>
              <CommandGroup heading="Schnellaktionen">
                {groupedResults.action.map(result => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => {
                      result.action()
                      setOpen(false)
                    }}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      {result.icon}
                      <div>
                        <span>{result.title}</span>
                        {result.description && (
                          <p className="gba:text-xs gba:text-muted-foreground">{result.description}</p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Navigation */}
          {groupedResults.navigation.length > 0 && (
            <>
              <CommandGroup heading="Navigation">
                {groupedResults.navigation.map(result => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => {
                      result.action()
                      setOpen(false)
                    }}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      {result.icon}
                      <div>
                        <span>{result.title}</span>
                        {result.description && (
                          <p className="gba:text-xs gba:text-muted-foreground">{result.description}</p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

