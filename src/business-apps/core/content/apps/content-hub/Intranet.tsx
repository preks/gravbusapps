import React, { useState, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TabSwitch, TabSwitchList, TabSwitchTrigger, TabSwitchContent } from '@newwork/nw-design-system'
import { useTranslation } from 'react-i18next'
import { Home, Newspaper, BookOpen, FileText, MessageCircleQuestion } from 'lucide-react'
import NewsView from './views/news-view'
import HomeView from './views/home-view'
import KnowledgeView from './views/knowledge-view'
import DocumentView from './views/document-view'
import QuestionView from './views/question-view'
import { BannerCarousel, BannerVariant, BannerConfig } from './components/shared/Banner'

export interface IntranetProps extends BusinessAppContextProps {
  tab?: string
}

const Intranet: React.FC<IntranetProps> = context => {
  const { t } = useTranslation('content')

  // Initialize activeTab from props or URL query parameter
  const initialTab = useMemo(() => {
    return context.tab || new URLSearchParams(window.location.search).get('tab') || 'intranet'
  }, [context.tab])

  const [activeTab, setActiveTab] = useState(initialTab)

  // Tab order for carousel-style animation
  const tabOrder = ['intranet', 'news', 'knowledge', 'documents', 'questions']
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
    if (localTimeHours >= 5 && localTimeHours < 12) return t('greeting_morning')
    if (localTimeHours >= 12 && localTimeHours < 18) return t('greeting_afternoon')
    if (localTimeHours >= 18 && localTimeHours < 22) return t('greeting_evening')
    return t('greeting_generic')
  }, [t])

  const handleNavigate = (tab: string) => {
    handleTabChange(tab)
  }

  // Helper function to get banner configuration for any tab
  const getBannerConfig = (tab: string): BannerConfig => {
    switch (tab) {
      case 'intranet':
        return {
          variant: BannerVariant.INTRANET,
          title: t('intranet_welcome_title'),
          subtitle: t('intranet_welcome_subtitle'),
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
          title: t('news_welcome_title'),
          subtitle: t('news_welcome_subtitle')
        }
      case 'knowledge':
        return {
          variant: BannerVariant.KNOWLEDGE,
          title: t('knowledge_welcome_title'),
          subtitle: t('knowledge_welcome_subtitle')
        }
      case 'documents':
        return {
          variant: BannerVariant.DOCUMENT,
          title: t('document_welcome_title'),
          subtitle: t('document_welcome_subtitle')
        }
      case 'questions':
        return {
          variant: BannerVariant.QUESTION,
          title: t('question_welcome_title', 'Q&A Forum'),
          subtitle: t('question_welcome_subtitle', 'Ask questions and share knowledge')
        }
      default:
        return {
          variant: BannerVariant.INTRANET,
          title: t('intranet_welcome_title'),
          subtitle: t('intranet_welcome_subtitle')
        }
    }
  }

  // Get all banner configs for carousel
  const bannerConfigs = useMemo(() => tabOrder.map(tab => getBannerConfig(tab)), [t, greeting, formattedDate])

  return (
    <div className="gba:min-h-screen gba:flex gba:flex-col gba:w-full gba:bg-background" data-testid="content-hub">
      {/* Dynamic Banner Carousel */}
      <BannerCarousel configs={bannerConfigs} activeIndex={activeTabIndex} />

      <TabSwitch value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <div className="gba:bg-card gba:border-b gba:border-border gba:sticky gba:top-0 gba:z-10">
          <div className="gba:max-w-[1300px] gba:mx-auto gba:px-4">
            <TabSwitchList>
              <TabSwitchTrigger
                value="intranet"
                startIcon={<Home className="gba:w-4 gba:h-4" />}
                data-testid="content-hub-tab-intranet"
              >
                {t('intranet')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="news"
                startIcon={<Newspaper className="gba:w-4 gba:h-4" />}
                data-testid="content-hub-tab-news"
              >
                {t('news')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="knowledge"
                startIcon={<BookOpen className="gba:w-4 gba:h-4" />}
                data-testid="content-hub-tab-knowledge"
              >
                {t('knowledge')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="documents"
                startIcon={<FileText className="gba:w-4 gba:h-4" />}
                data-testid="content-hub-tab-documents"
              >
                {t('documents')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="questions"
                startIcon={<MessageCircleQuestion className="gba:w-4 gba:h-4" />}
                data-testid="content-hub-tab-questions"
              >
                {t('questions', 'Questions')}
              </TabSwitchTrigger>
            </TabSwitchList>
          </div>
        </div>

        <TabSwitchContent value="intranet" data-testid="content-hub-content-intranet">
          <HomeView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            onNavigate={handleNavigate}
            hideBanner
            currentTab="intranet"
          />
        </TabSwitchContent>

        <TabSwitchContent value="news" data-testid="content-hub-content-news">
          <NewsView accessToken={context.accessToken} userInfo={context.userInfo} hideBanner currentTab="news" />
        </TabSwitchContent>

        <TabSwitchContent value="knowledge" data-testid="content-hub-content-knowledge">
          <KnowledgeView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            onNavigate={handleNavigate}
            hideBanner
            currentTab="knowledge"
          />
        </TabSwitchContent>

        <TabSwitchContent value="documents" data-testid="content-hub-content-documents">
          <DocumentView
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            hideBanner
            currentTab="documents"
          />
        </TabSwitchContent>

        <TabSwitchContent value="questions" data-testid="content-hub-content-questions">
          <QuestionView accessToken={context.accessToken} hideBanner currentTab="questions" />
        </TabSwitchContent>
      </TabSwitch>
    </div>
  )
}

export default Intranet
