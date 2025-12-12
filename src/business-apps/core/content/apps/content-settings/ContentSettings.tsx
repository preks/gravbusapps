import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PiFileText, PiFolder, PiTag, PiSmiley } from 'react-icons/pi'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import CategoryDataPage from './pages/category-data/CategoryDataPage'
import TagDataPage from './pages/tag-data/TagDataPage'
import TypeDataPage from './pages/type-data/TypeDataPage'
import ReactionDataPage from './pages/reaction-data/ReactionDataPage'

export interface ContentSettingsProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const ContentSettings: React.FC<ContentSettingsProps> = ({ className, prefixDataTestId, ...context }) => {
  const { t } = useTranslation()
  const [inlinePage, setInlinePage] = React.useState<{ key: string } | null>(null)

  // Read page from URL query params
  useEffect(() => {
    const params = new URLSearchParams(globalThis.window.location.search)
    const page = params.get('page')
    if (page) {
      setInlinePage({ key: page })
    }
  }, [])

  // Update URL when inline page changes
  useEffect(() => {
    if (inlinePage) {
      const url = new URL(globalThis.window.location.href)
      url.searchParams.set('page', inlinePage.key)
      globalThis.window.history.pushState({}, '', url.toString())
    } else {
      const url = new URL(globalThis.window.location.href)
      url.searchParams.delete('page')
      globalThis.window.history.pushState({}, '', url.toString())
    }
  }, [inlinePage])

  const cards = [
    {
      title: t('content.categories', 'Content Categories'),
      description: t('content.categories_description', 'Organize articles and content with hierarchical categories'),
      icon: PiFolder,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('content.manage_categories', 'Manage Categories'),
          onClick: () => setInlinePage({ key: 'categories' })
        }
      ]
    },
    {
      title: t('content.tags', 'Content Tags'),
      description: t('content.tags_description', 'Tag content for better discoverability and filtering'),
      icon: PiTag,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('content.manage_tags', 'Manage Tags'),
          onClick: () => setInlinePage({ key: 'tags' })
        }
      ]
    },
    {
      title: t('content.reactions', 'Content Reactions'),
      description: t('content.reactions_description', 'Configure emoji and custom reactions for user engagement'),
      icon: PiSmiley,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('content.manage_reactions', 'Manage Reactions'),
          onClick: () => setInlinePage({ key: 'reactions' })
        }
      ]
    },
    {
      title: t('content.types', 'Content Types'),
      description: t('content.types_description', 'Define different types of content entries'),
      icon: PiFileText,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('content.manage_types', 'Manage Types'),
          onClick: () => setInlinePage({ key: 'types' })
        }
      ]
    }
  ]

  if (inlinePage?.key === 'categories') {
    return (
      <CategoryDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-ContentCategorySettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  if (inlinePage?.key === 'tags') {
    return (
      <TagDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-ContentTagSettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  if (inlinePage?.key === 'reactions') {
    return (
      <ReactionDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-ContentReactionSettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  if (inlinePage?.key === 'types') {
    return (
      <TypeDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-ContentTypeSettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  return (
    <SettingsLayout
      headerPhosphorIcon={{
        icon: PiFileText,
        variant: 'info',
        size: 'lg',
        label: 'Content Settings'
      }}
      headerLabel={t('content.content_settings', 'Content Settings')}
      cards={cards}
      className={className}
      prefixDataTestId={prefixDataTestId}
      searchPlaceholder={t('common.search_placeholder', 'Search settings...')}
    />
  )
}

export default ContentSettings
export { ContentSettings }
