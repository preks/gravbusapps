import React, { useState, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  TabSwitch,
  TabSwitchList,
  TabSwitchTrigger,
  TabSwitchContent,
  useTranslation,
  Badge
} from '@newwork/nw-design-system'
import { Home, Newspaper, BookOpen, MessageCircleQuestion, TrendingUp, Shield } from 'lucide-react'
import translations from './_i18n'
import NewsView from './views/news-view'
import HomeView from './views/home-view'
import KnowledgeView from './views/knowledge-view'
import PoliciesView from './views/policies-view'
import QuestionView from './views/question-view'
import EngagementView from './views/engagement-view'
import { EveryPagesHero } from './components/shared/EveryPagesHero'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { usePortalTranslation } from './hooks/usePortalTranslation'
import { AiTranslationButton } from '@/common/components/content'
import { useUserEngagement } from './hooks/useUserEngagement'

export interface ContentPortalProps extends BusinessAppContextProps {
  tab?: string
}

const CATALOG_IDENTIFIER = 'ContentReaction'

const ContentPortal: React.FC<ContentPortalProps> = context => {
  const { t } = useTranslation(translations)
  const { accessToken, tab } = context
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [allowedReactions, setAllowedReactions] = useState<string[]>([])
  const [reactionCatalogMap, setReactionCatalogMap] = useState<Record<string, string>>({}) // unified code -> catalog ID

  // Portal translation hook
  const { targetLanguage, translatedItems, isTranslating, translateAllContent, setTargetLanguage, resetTranslation } =
    usePortalTranslation(accessToken)

  // Get user engagement score for badge
  const userId = context.userInfo?.id
  const { engagementData } = useUserEngagement(userId, accessToken)

  // Load allowed reactions from catalog (once for entire app)
  useEffect(() => {
    const loadReactions = async () => {
      try {
        const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
          limit: 100,
          offset: 0
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
        const getDisplayOrder = (code: string): number => {
          const entry = result.entries.find(e => e.additionalValue2 === code)
          return entry?.displayOrder || 0
        }
        const sortByDisplayOrder = (a: string, b: string): number => {
          return getDisplayOrder(a) - getDisplayOrder(b)
        }
        const sortedCodes = [...allowedCodes].sort(sortByDisplayOrder)

        setAllowedReactions(sortedCodes)
        setReactionCatalogMap(catalogMap)
      } catch (error) {
        // Fallback to default reactions
        console.error('Error loading reactions catalog:', error)
      }
    }

    if (accessToken) {
      loadReactions()
    }
  }, [accessToken, fetchCatalogEntriesByIdentifier])

  // Initialize activeTab from props or URL query parameter
  const initialTab = useMemo(() => {
    return tab || new URLSearchParams(globalThis.window.location.search).get('tab') || 'home'
  }, [tab])

  const [activeTab, setActiveTab] = useState(initialTab)

  // Update URL when tab changes
  useEffect(() => {
    if (globalThis.window !== undefined) {
      const url = new URL(globalThis.window.location.href)
      url.searchParams.set('tab', activeTab)
      globalThis.window.history.replaceState({}, '', url.toString())
    }
  }, [activeTab])

  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    // Reset translation when switching tabs
    resetTranslation()
  }

  // Handle language selection for translation
  // Views will automatically trigger translation when targetLanguage is set
  const handleLanguageSelect = (languageId: string) => {
    // Set targetLanguage - views will detect this and call onTranslate with their items
    setTargetLanguage(languageId)
  }

  // Stabilize props to prevent unnecessary re-renders
  const stableAllowedReactions = useMemo(() => allowedReactions, [allowedReactions.join(',')])
  const stableReactionCatalogMap = useMemo(() => reactionCatalogMap, [JSON.stringify(reactionCatalogMap)])
  const stableTranslatedItems = useMemo(() => translatedItems, [JSON.stringify(translatedItems)])

  return (
    <div className="gba:min-h-screen gba:flex gba:flex-col gba:w-full gba:bg-background" data-testid="intranet">
      {/* EveryPages Hero - adapts to active tab */}
      <EveryPagesHero activeTab={activeTab} data-testid="everypages-hero" />

      <TabSwitch value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <div className="gba:bg-card gba:border-b gba:border-border gba:sticky gba:top-0 gba:z-10">
          <div className="gba:max-w-[1300px] gba:mx-auto gba:px-4">
            <div className="gba:flex gba:items-center gba:justify-between">
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
                  value="policies"
                  startIcon={<Shield className="gba:w-4 gba:h-4" />}
                  data-testid="intranet-tab-policies"
                >
                  {t('policies')}
                </TabSwitchTrigger>
                {/* Documents tab hidden - code preserved for future use */}
                <TabSwitchTrigger
                  value="questions"
                  startIcon={<MessageCircleQuestion className="gba:w-4 gba:h-4" />}
                  data-testid="intranet-tab-questions"
                >
                  {t('questions')}
                </TabSwitchTrigger>
                <TabSwitchTrigger
                  value="engagement"
                  startIcon={<TrendingUp className="gba:w-4 gba:h-4" />}
                  data-testid="intranet-tab-engagement"
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span>{t('engagement')}</span>
                    {engagementData.totalScore > 0 && (
                      <Badge variant="secondary" className="gba:text-xs">
                        {engagementData.totalScore}
                      </Badge>
                    )}
                  </div>
                </TabSwitchTrigger>
              </TabSwitchList>
              {activeTab !== 'engagement' && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <AiTranslationButton
                    detectedLanguage={null}
                    targetLanguage={targetLanguage}
                    isDetecting={false}
                    isTranslating={isTranslating}
                    accessToken={accessToken}
                    onLanguageSelect={handleLanguageSelect}
                    data-testid="portal-translation-button"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <TabSwitchContent value="home" data-testid="intranet-content-home">
          <HomeView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="home"
            allowedReactions={stableAllowedReactions}
            reactionCatalogMap={stableReactionCatalogMap}
            targetLanguage={targetLanguage}
            translatedItems={stableTranslatedItems}
            onTranslate={translateAllContent}
          />
        </TabSwitchContent>

        <TabSwitchContent value="news" data-testid="intranet-content-news">
          <NewsView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="news"
            allowedReactions={stableAllowedReactions}
            reactionCatalogMap={stableReactionCatalogMap}
            targetLanguage={targetLanguage}
            translatedItems={stableTranslatedItems}
            onTranslate={translateAllContent}
          />
        </TabSwitchContent>

        <TabSwitchContent value="knowledge" data-testid="intranet-content-knowledge">
          <KnowledgeView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="knowledge"
            reactionCatalogMap={stableReactionCatalogMap}
            targetLanguage={targetLanguage}
            translatedItems={stableTranslatedItems}
            onTranslate={translateAllContent}
          />
        </TabSwitchContent>

        <TabSwitchContent value="policies" data-testid="intranet-content-policies">
          <PoliciesView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="policies"
          />
        </TabSwitchContent>

        {/* Documents content hidden - code preserved for future use
        <TabSwitchContent value="documents" data-testid="intranet-content-documents">
          <DocumentView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            targetLanguage={targetLanguage}
            translatedItems={stableTranslatedItems}
            onTranslate={translateAllContent}
          />
        </TabSwitchContent>
        */}

        <TabSwitchContent value="questions" data-testid="intranet-content-questions">
          <QuestionView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="questions"
            reactionCatalogMap={stableReactionCatalogMap}
            targetLanguage={targetLanguage}
            translatedItems={stableTranslatedItems}
            onTranslate={translateAllContent}
          />
        </TabSwitchContent>

        <TabSwitchContent value="engagement" data-testid="intranet-content-engagement">
          <EngagementView accessToken={context.accessToken} userInfo={context.userInfo} />
        </TabSwitchContent>
      </TabSwitch>
    </div>
  )
}

export default ContentPortal
