import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import { executeContentPromptByJson } from '@/common/data/content/prompts'

export interface ContentEntryInput {
  title?: string
  preview?: string
  content?: string
  picture?: string | null
  contentGroupRef?: string
  contentTypeRef?: string
  contentCategoryRefs?: string[]
  contentCategoryNames?: string[]
  contentTagRefs?: string[]
  contentTagNames?: string[]
}

export interface ContentEntryOutput {
  title: string
  preview: string
  content: string
  picture?: string | null
  contentTypeRef?: string
  contentCategoryRefs?: string[]
  contentCategoryNames?: string[]
  contentTagRefs?: string[]
  contentTagNames?: string[]
}

export class ContentEntryAIService {
  constructor(accessToken: string) {
    promptManagerClient.setAccessToken(accessToken)
    graphQLClient.setAccessToken(accessToken)
  }

  /**
   * Verifies catalog entry IDs by extracting catalog info from ID format
   * ID format: <identifier>:<version>:<code>
   */
  private async verifyCatalogEntryIds(entryIds: string[]): Promise<string[]> {
    if (!entryIds || entryIds.length === 0) {
      return []
    }

    console.log('[ContentEntryAIService] Verifying catalog entry IDs:', entryIds)

    // Group IDs by catalog (identifier:version)
    const catalogGroups = new Map<string, string[]>()

    for (const id of entryIds) {
      // Parse ID format: <identifier>:<version>:<code>
      const parts = id.split(':')
      if (parts.length >= 2) {
        const identifier = parts[0]
        const version = parts[1] || 'v1'
        const catalogKey = `${identifier}:${version}`

        if (!catalogGroups.has(catalogKey)) {
          catalogGroups.set(catalogKey, [])
        }
        catalogGroups.get(catalogKey)!.push(id)
      } else {
        console.warn(
          '[ContentEntryAIService] Invalid catalog entry ID format (expected <identifier>:<version>:<code>):',
          id
        )
      }
    }

    console.log('[ContentEntryAIService] Grouped catalog entries by catalog:', Object.fromEntries(catalogGroups))

    // Verify all groups in parallel
    const verificationPromises = Array.from(catalogGroups.entries()).map(async ([catalogKey, ids]) => {
      const [identifier, version] = catalogKey.split(':')

      const query = `
          query verifyCatalogEntries($ids: [String!]!, $identifier: String!, $version: String!) {
            CatalogEntry(
              where: {
                _and: [
                  { id: { _in: $ids } },
                  { catalog: { 
                    _and: [
                      { identifier: { _eq: $identifier } },
                      { version: { _eq: $version } }
                    ]
                  }},
                  { isDeleted: { _neq: true } }
                ]
              }
            ) {
              id
            }
          }
        `

      try {
        console.log(`[ContentEntryAIService] Verifying ${ids.length} entries for catalog ${catalogKey}:`, ids)
        const response = await graphQLClient.request<{ CatalogEntry: Array<{ id: string }> }>(query, {
          ids,
          identifier,
          version
        })
        const verifiedIds = response.CatalogEntry.map(entry => entry.id)
        const invalidIds = ids.filter(id => !verifiedIds.includes(id))

        if (invalidIds.length > 0) {
          console.warn(`[ContentEntryAIService] Invalid catalog entry IDs for ${catalogKey}:`, invalidIds)
        }

        console.log(
          `[ContentEntryAIService] Verified ${verifiedIds.length}/${ids.length} entries for ${catalogKey}:`,
          verifiedIds
        )
        return verifiedIds
      } catch (error) {
        console.error(`[ContentEntryAIService] Error verifying catalog entries for ${catalogKey}:`, error)
        return []
      }
    })

    const verifiedIdsArrays = await Promise.all(verificationPromises)
    const allVerifiedIds = verifiedIdsArrays.flat()
    console.log('[ContentEntryAIService] Verification complete. Verified IDs:', allVerifiedIds)
    return allVerifiedIds
  }

  async executeContentEntryOperation(
    operation: 'generate' | 'refine',
    userPrompt: string,
    existingContent?: ContentEntryInput
  ): Promise<ContentEntryOutput> {
    console.log('[ContentEntryAIService] Starting AI operation:', { operation, userPrompt })
    console.log('[ContentEntryAIService] Input catalog data:', {
      contentGroupRef: existingContent?.contentGroupRef,
      contentTypeRef: existingContent?.contentTypeRef,
      contentCategoryRefs: existingContent?.contentCategoryRefs,
      contentCategoryNames: existingContent?.contentCategoryNames,
      contentTagRefs: existingContent?.contentTagRefs,
      contentTagNames: existingContent?.contentTagNames
    })

    const userParams: {
      operation: string
      userPrompt: string
      title: string
      preview: string
      content: string
      picture: string | null
      contentGroupRef?: string
      contentTypeRef?: string
      contentCategoryRefs?: string[]
      contentCategoryNames?: string[]
      contentTagRefs?: string[]
      contentTagNames?: string[]
    } = {
      operation,
      userPrompt,
      title: existingContent?.title || '',
      preview: existingContent?.preview || '',
      content: existingContent?.content || '',
      picture: existingContent?.picture || null,
      contentGroupRef: existingContent?.contentGroupRef,
      contentTypeRef: existingContent?.contentTypeRef,
      contentCategoryRefs: existingContent?.contentCategoryRefs,
      contentCategoryNames: existingContent?.contentCategoryNames,
      contentTagRefs: existingContent?.contentTagRefs,
      contentTagNames: existingContent?.contentTagNames
    }

    const response = await executeContentPromptByJson(promptManagerClient, 'ContentArticleWriter', {
      user_params: userParams
    })
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    const rawOutput = JSON.parse(content) as ContentEntryOutput

    console.log('[ContentEntryAIService] AI Response (raw):', {
      title: rawOutput.title,
      preview: rawOutput.preview,
      contentTypeRef: rawOutput.contentTypeRef,
      contentCategoryRefs: rawOutput.contentCategoryRefs,
      contentCategoryNames: rawOutput.contentCategoryNames,
      contentTagRefs: rawOutput.contentTagRefs,
      contentTagNames: rawOutput.contentTagNames
    })

    // Verify all catalog references in parallel
    console.log('[ContentEntryAIService] Starting catalog verification...')
    const [verifiedTypeRef, verifiedCategoryRefs, verifiedTagRefs] = await Promise.all([
      rawOutput.contentTypeRef
        ? this.verifyCatalogEntryIds([rawOutput.contentTypeRef]).then(ids => ids[0])
        : Promise.resolve(undefined),
      rawOutput.contentCategoryRefs ? this.verifyCatalogEntryIds(rawOutput.contentCategoryRefs) : Promise.resolve([]),
      rawOutput.contentTagRefs ? this.verifyCatalogEntryIds(rawOutput.contentTagRefs) : Promise.resolve([])
    ])

    const finalOutput: ContentEntryOutput = {
      ...rawOutput,
      contentTypeRef: verifiedTypeRef,
      contentCategoryRefs: verifiedCategoryRefs,
      contentTagRefs: verifiedTagRefs
      // Names bleiben unverändert (werden im pre-submit erstellt)
    }

    console.log('[ContentEntryAIService] Verification results:', {
      contentTypeRef: {
        requested: rawOutput.contentTypeRef,
        verified: verifiedTypeRef,
        valid: rawOutput.contentTypeRef === verifiedTypeRef
      },
      contentCategoryRefs: {
        requested: rawOutput.contentCategoryRefs,
        verified: verifiedCategoryRefs,
        invalid: rawOutput.contentCategoryRefs?.filter(ref => !verifiedCategoryRefs.includes(ref)) || []
      },
      contentTagRefs: {
        requested: rawOutput.contentTagRefs,
        verified: verifiedTagRefs,
        invalid: rawOutput.contentTagRefs?.filter(ref => !verifiedTagRefs.includes(ref)) || []
      },
      contentCategoryNames: rawOutput.contentCategoryNames,
      contentTagNames: rawOutput.contentTagNames
    })

    console.log('[ContentEntryAIService] Final output:', {
      contentTypeRef: finalOutput.contentTypeRef,
      contentCategoryRefs: finalOutput.contentCategoryRefs,
      contentCategoryNames: finalOutput.contentCategoryNames,
      contentTagRefs: finalOutput.contentTagRefs,
      contentTagNames: finalOutput.contentTagNames
    })

    return finalOutput
  }
}
