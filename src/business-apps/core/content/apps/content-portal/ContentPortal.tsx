import React, { useState, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TabSwitch, TabSwitchList, TabSwitchTrigger, TabSwitchContent, useTranslation } from '@newwork/nw-design-system'
import { Home, Newspaper, BookOpen, FileText, MessageCircleQuestion } from 'lucide-react'
import translations from './_i18n'
import NewsView from './views/news-view'
import HomeView from './views/home-view'
import KnowledgeView from './views/knowledge-view'
import DocumentView from './views/document-view'
import QuestionView from './views/question-view'
import { BannerCarousel, BannerVariant, BannerConfig } from './components/shared/Banner'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'

export interface ContentPortalProps extends BusinessAppContextProps {
  tab?: string
}

const CATALOG_IDENTIFIER = 'ContentReaction'

const ContentPortal: React.FC<ContentPortalProps> = context => {
  const { t } = useTranslation(translations)
  const { accessToken } = context
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [allowedReactions, setAllowedReactions] = useState<string[]>([])
  const [reactionCatalogMap, setReactionCatalogMap] = useState<Record<string, string>>({}) // unified code -> catalog ID

  // Load allowed reactions from catalog (once for entire app)
  useEffect(() => {
    const loadReactions = async () => {
      try {
        const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
          limit: 100,
          offset: 0
        })

        console.log('🔥 ContentPortal - Fetched catalog entries:', {
          totalEntries: result.entries.length,
          entries: result.entries.map(e => ({
            id: e.id,
            type: e.type,
            additionalValue2: e.additionalValue2,
            parentEntryId: e.parentEntryId,
            displayOrder: e.displayOrder
          }))
        })

        // Build map for both vote reactions (+1/-1) and emoji reactions
        const catalogMap: Record<string, string> = {}
        const allowedCodes: string[] = []

        result.entries.forEach(entry => {
          // Map ALL reactions (including +1/-1 for both voting AND emoji picker)
          if (entry.type === 'EMOJI' && !entry.parentEntryId && entry.additionalValue2 && entry.id) {
            const unifiedCode = entry.additionalValue2
            catalogMap[unifiedCode] = entry.id
            allowedCodes.push(unifiedCode)

            // Also map +1/-1 by their special keys for VoteButtons
            if (entry.id === 'ContentReaction:v1:+1') {
              catalogMap['+1'] = entry.id
            } else if (entry.id === 'ContentReaction:v1:-1') {
              catalogMap['-1'] = entry.id
            }
          }
        })

        // Sort emoji codes by display order
        const sortedCodes = [...allowedCodes].sort((a, b) => {
          const entryA = result.entries.find(e => e.additionalValue2 === a)
          const entryB = result.entries.find(e => e.additionalValue2 === b)
          return (entryA?.displayOrder || 0) - (entryB?.displayOrder || 0)
        })

        setAllowedReactions(sortedCodes)
        setReactionCatalogMap(catalogMap)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Fallback to default reactions
        setAllowedReactions([
          '1f44d', // 👍
          '2764-fe0f', // ❤️
          '1f602', // 😂
          '1f44f', // 👏
          '1f525', // 🔥
          '1f389', // 🎉
          '1f64f', // 🙏
          '1f440' // 👀
        ])
      }
    }

    if (accessToken) {
      loadReactions()
    }
  }, [accessToken, fetchCatalogEntriesByIdentifier])

  // Initialize activeTab from props or URL query parameter
  const initialTab = useMemo(() => {
    return context.tab || new URLSearchParams(window.location.search).get('tab') || 'home'
  }, [context.tab])

  const [activeTab, setActiveTab] = useState(initialTab)

  // Tab order for carousel-style animation
  const tabOrder = ['home', 'news', 'knowledge', 'documents', 'questions']
  const activeTabIndex = tabOrder.indexOf(activeTab)

  // Update URL when tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', activeTab)
      window.history.replaceState({}, '', url.toString())
    }
  }, [activeTab])

  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
  }

  // Format current date for Intranet
  const formattedDate = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  // Determine appropriate greeting for Intranet
  const greeting = useMemo(() => {
    const localTimeHours = new Date().getHours()
    if (localTimeHours >= 5 && localTimeHours < 12) return t('greeting-morning')
    if (localTimeHours >= 12 && localTimeHours < 18) return t('greeting-afternoon')
    if (localTimeHours >= 18 && localTimeHours < 22) return t('greeting-evening')
    return t('greeting-generic')
  }, [t])

  const handleNavigate = (tab: string) => {
    handleTabChange(tab)
  }

  // Helper function to get banner configuration for any tab
  const getBannerConfig = (tab: string): BannerConfig => {
    switch (tab) {
      case 'home':
        return {
          variant: BannerVariant.INTRANET,
          title: t('intranet-welcome-title'),
          subtitle: t('intranet-welcome-subtitle'),
          children: (
            <div className="gba:flex gba:flex-col gba:items-end">
              <span className="gba:text-lg gba:md:text-xl gba:text-white gba:font-medium gba:text-right gba:font-bold">
                {greeting}
              </span>
              <span className="gba:text-sm gba:text-white gba:opacity-80 gba:text-right">{formattedDate}</span>
            </div>
          )
        }
      case 'news':
        return {
          variant: BannerVariant.NEWS,
          title: t('news-welcome-title'),
          subtitle: t('news-welcome-subtitle')
        }
      case 'knowledge':
        return {
          variant: BannerVariant.KNOWLEDGE,
          title: t('knowledge-welcome-title'),
          subtitle: t('knowledge-welcome-subtitle')
        }
      case 'documents':
        return {
          variant: BannerVariant.DOCUMENT,
          title: t('document-welcome-title'),
          subtitle: t('document-welcome-subtitle')
        }
      case 'questions':
        return {
          variant: BannerVariant.QUESTION,
          title: t('question-welcome-title'),
          subtitle: t('question-welcome-subtitle')
        }
      default:
        return {
          variant: BannerVariant.INTRANET,
          title: t('intranet-welcome-title'),
          subtitle: t('intranet-welcome-subtitle')
        }
    }
  }

  // Get all banner configs for carousel
  const bannerConfigs = useMemo(() => tabOrder.map(tab => getBannerConfig(tab)), [t, greeting, formattedDate])

  return (
    <div className="gba:min-h-screen gba:flex gba:flex-col gba:w-full gba:bg-background" data-testid="intranet">
      {/* Dynamic Banner Carousel */}
      <BannerCarousel configs={bannerConfigs} activeIndex={activeTabIndex} />

      <TabSwitch value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <div className="gba:bg-card gba:border-b gba:border-border gba:sticky gba:top-0 gba:z-10">
          <div className="gba:max-w-[1300px] gba:mx-auto gba:px-4">
            <TabSwitchList>
              <TabSwitchTrigger
                value="home"
                startIcon={<Home className="gba:w-4 gba:h-4" />}
                data-testid="intranet-tab-home"
              >
                {t('home')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="news"
                startIcon={<Newspaper className="gba:w-4 gba:h-4" />}
                data-testid="intranet-tab-news"
              >
                {t('news')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="knowledge"
                startIcon={<BookOpen className="gba:w-4 gba:h-4" />}
                data-testid="intranet-tab-knowledge"
              >
                {t('knowledge')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="documents"
                startIcon={<FileText className="gba:w-4 gba:h-4" />}
                data-testid="intranet-tab-documents"
              >
                {t('documents')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="questions"
                startIcon={<MessageCircleQuestion className="gba:w-4 gba:h-4" />}
                data-testid="intranet-tab-questions"
              >
                {t('questions')}
              </TabSwitchTrigger>
            </TabSwitchList>
          </div>
        </div>

        <TabSwitchContent value="home" data-testid="intranet-content-home" keepMounted>
          <HomeView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            onNavigate={handleNavigate}
            hideBanner
            currentTab="home"
            allowedReactions={allowedReactions}
            reactionCatalogMap={reactionCatalogMap}
          />
        </TabSwitchContent>

        <TabSwitchContent value="news" data-testid="intranet-content-news" keepMounted>
          <NewsView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="news"
            allowedReactions={allowedReactions}
            reactionCatalogMap={reactionCatalogMap}
          />
        </TabSwitchContent>

        <TabSwitchContent value="knowledge" data-testid="intranet-content-knowledge" keepMounted>
          <KnowledgeView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            onNavigate={handleNavigate}
            hideBanner
            currentTab="knowledge"
            allowedReactions={allowedReactions}
            reactionCatalogMap={reactionCatalogMap}
          />
        </TabSwitchContent>

        <TabSwitchContent value="documents" data-testid="intranet-content-documents" keepMounted>
          <DocumentView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="documents"
            allowedReactions={allowedReactions}
            reactionCatalogMap={reactionCatalogMap}
          />
        </TabSwitchContent>

        <TabSwitchContent value="questions" data-testid="intranet-content-questions" keepMounted>
          <QuestionView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="questions"
            allowedReactions={allowedReactions}
            reactionCatalogMap={reactionCatalogMap}
          />
        </TabSwitchContent>
      </TabSwitch>
    </div>
  )
}

export default ContentPortal
