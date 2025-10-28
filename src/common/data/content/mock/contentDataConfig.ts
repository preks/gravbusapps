/**
 * Content Data Configuration for Mock GraphQL Client
 * Registers content-related entities with the data registry
 */
import { dataRegistry } from '@/common/network/graphql-mock/core/dataRegistry'
import {
  mockContentGroups,
  mockContentTypes,
  mockContentCategories,
  mockContentTags,
  mockDocumentTypes
} from './catalogs'
import { mockContentEntries } from './contentEntries'
import {
  mockContentEntryCategories,
  mockContentEntryTags,
  mockContentDocuments,
  mockContentEntryReactions
} from './contentRelations'

/**
 * Register all content-related entities
 */
export const registerContentData = () => {
  // Combine all catalog entries for main CatalogEntry registry
  const allContentCatalogEntries = [
    ...mockContentGroups,
    ...mockContentTypes,
    ...mockContentCategories,
    ...mockContentTags,
    ...mockDocumentTypes
  ]

  // Register specific content catalog types
  dataRegistry.register('ContentGroup', {
    source: {
      data: mockContentGroups,
      defaultSort: [{ sortOrder: 'ASC' }]
    }
  })

  dataRegistry.register('ContentType', {
    source: {
      data: mockContentTypes,
      defaultSort: [{ sortOrder: 'ASC' }]
    }
  })

  dataRegistry.register('ContentCategory', {
    source: {
      data: mockContentCategories,
      defaultSort: [{ sortOrder: 'ASC' }]
    }
  })

  dataRegistry.register('ContentTag', {
    source: {
      data: mockContentTags,
      defaultSort: [{ sortOrder: 'ASC' }]
    }
  })

  dataRegistry.register('ContentDocumentType', {
    source: {
      data: mockDocumentTypes,
      defaultSort: [{ sortOrder: 'ASC' }]
    }
  })

  // Register main content entry entity
  dataRegistry.register('ContentEntry', {
    source: {
      data: mockContentEntries,
      defaultSort: [{ createdAt: 'DESC' }]
    },
    aliases: [
      'ContentEntries',
      'Article', // Backward compatibility
      'ArticleEmployeeView' // Backward compatibility
    ]
  })

  // Register content entry categories
  dataRegistry.register('ContentEntryCategory', {
    source: {
      data: mockContentEntryCategories,
      defaultSort: [{ createdAt: 'DESC' }]
    }
  })

  // Register content entry tags
  dataRegistry.register('ContentEntryTag', {
    source: {
      data: mockContentEntryTags,
      defaultSort: [{ createdAt: 'DESC' }]
    }
  })

  // Register content documents
  dataRegistry.register('ContentDocument', {
    source: {
      data: mockContentDocuments,
      defaultSort: [{ createdAt: 'DESC' }]
    }
  })

  // Register content entry reactions
  dataRegistry.register('ContentEntryReaction', {
    source: {
      data: mockContentEntryReactions,
      defaultSort: [{ createdAt: 'DESC' }]
    }
  })

  // Update global CatalogEntry registry to include content catalogs
  const existingCatalogConfig = dataRegistry.getEntity('CatalogEntry')
  if (existingCatalogConfig) {
    const existingData = existingCatalogConfig.source.data || []
    dataRegistry.register('CatalogEntry', {
      source: {
        data: [...existingData, ...allContentCatalogEntries],
        defaultSort: [{ value: 'ASC' }]
      },
      aliases: existingCatalogConfig.aliases
    })
  } else {
    dataRegistry.register('CatalogEntry', {
      source: {
        data: allContentCatalogEntries,
        defaultSort: [{ value: 'ASC' }]
      },
      aliases: ['Catalog']
    })
  }

  console.log('✅ Content data registered with mock GraphQL client')
}
