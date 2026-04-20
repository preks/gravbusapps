/**
 * Registration Script for Document Reviewer
 *
 * Registers the document_observer tool and document_reviewer agent
 * in Prompt Manager.
 *
 * Usage:
 * 1. Open browser console on https://newwork-dev.newwork.com
 * 2. Get your access token from localStorage or Keycloak
 * 3. Run: await registerDocumentReviewer(accessToken, workspaceId, modelId)
 *
 * Or import and call from your code:
 * import { registerDocumentReviewer } from '@/business-apps/ai/apps/document-reviewer/scripts/register-document-reviewer'
 */

import { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { DOCUMENT_OBSERVER_FUNCTION_CODE } from '../definitions/document-observer-tool'
import { createDocumentReviewerAgent, DOCUMENT_REVIEWER_AGENT_ID } from '../definitions/document-reviewer-agent'

export interface RegisterDocumentReviewerResult {
  success: boolean
  toolCode?: string
  agentId?: string
  error?: string
}

function createAuthorizedPromptManagerClient(accessToken: string) {
  const promptManagerClient = new PromptManagerClient()
  promptManagerClient.setAccessToken(accessToken)
  return promptManagerClient
}

/**
 * Register the Document Reviewer tool and agent in Prompt Manager
 *
 * @param accessToken - Valid access token for Prompt Manager API
 * @param workspaceId - ID of the workspace to register in
 * @param modelId - ID of the AI model to use (e.g., GPT-4)
 */
export async function registerDocumentReviewer(
  accessToken: string,
  workspaceId: string,
  modelId: string
): Promise<RegisterDocumentReviewerResult> {
  try {
    const promptManagerClient = createAuthorizedPromptManagerClient(accessToken)

    console.log('🔧 [DocumentReviewer] Starting registration...')
    console.log(
      `ℹ️ [DocumentReviewer] Tool '${DOCUMENT_OBSERVER_FUNCTION_CODE}' is expected to come from functions-service (not persisted in prompt-manager).`
    )

    // Step 2: Check if agent already exists
    console.log('🤖 [DocumentReviewer] Checking for existing agent...')
    const existingAgents = await promptManagerClient.getPrompts({
      promptName: DOCUMENT_REVIEWER_AGENT_ID,
      workspaceId,
      limit: 1
    })

    let agentId: string

    if (existingAgents.data?.length > 0) {
      agentId = existingAgents.data[0]._id!
      console.log(`✅ [DocumentReviewer] Agent already exists: ${agentId}`)

      // Update the agent to ensure it has the latest configuration
      console.log('🔄 [DocumentReviewer] Updating agent configuration...')
      const agentConfig = createDocumentReviewerAgent(workspaceId, modelId)
      await promptManagerClient.putPrompt(agentId, {
        description: agentConfig.description,
        type: 'chat',
        systemContent: agentConfig.systemContent,
        userContent: agentConfig.userContent,
        tools: agentConfig.tools,
        modelId: agentConfig.modelId,
        modelSettings: agentConfig.modelSettings,
        responseSchema: agentConfig.responseSchema,
        revisionMessage: 'Updated document reviewer configuration'
      })
      console.log(`✅ [DocumentReviewer] Agent updated: ${agentId}`)
    } else {
      // Create the agent
      console.log('🤖 [DocumentReviewer] Creating document_reviewer agent...')
      const agentConfig = createDocumentReviewerAgent(workspaceId, modelId)
      const agentResult = await promptManagerClient.createPrompt(agentConfig)
      agentId = agentResult._id!
      console.log(`✅ [DocumentReviewer] Agent created: ${agentId}`)
    }

    console.log('🎉 [DocumentReviewer] Registration complete!')
    console.log('   Tool Code:', DOCUMENT_OBSERVER_FUNCTION_CODE)
    console.log('   Agent ID:', agentId)

    return {
      success: true,
      toolCode: DOCUMENT_OBSERVER_FUNCTION_CODE,
      agentId
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ [DocumentReviewer] Registration failed:', errorMessage)

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Unregister the Document Reviewer (for cleanup)
 */
export async function unregisterDocumentReviewer(
  accessToken: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const promptManagerClient = createAuthorizedPromptManagerClient(accessToken)

    console.log('🗑️ [DocumentReviewer] Starting cleanup...')

    // Find and delete agent
    const agents = await promptManagerClient.getPrompts({
      promptName: DOCUMENT_REVIEWER_AGENT_ID,
      workspaceId,
      limit: 1
    })

    if (agents.data?.length > 0) {
      await promptManagerClient.deletePrompt(agents.data[0]._id!)
      console.log('✅ [DocumentReviewer] Agent deleted')
    }
    console.log(`ℹ️ [DocumentReviewer] Tool '${DOCUMENT_OBSERVER_FUNCTION_CODE}' is managed by functions-service.`)

    console.log('🎉 [DocumentReviewer] Cleanup complete!')

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ [DocumentReviewer] Cleanup failed:', errorMessage)

    return { success: false, error: errorMessage }
  }
}

/**
 * Get registration status
 */
export async function getDocumentReviewerStatus(
  accessToken: string,
  workspaceId: string
): Promise<{ toolConfigured: boolean; agentExists: boolean; toolCode?: string; agentId?: string }> {
  const promptManagerClient = createAuthorizedPromptManagerClient(accessToken)

  const agents = await promptManagerClient.getPrompts({ promptName: DOCUMENT_REVIEWER_AGENT_ID, workspaceId, limit: 1 })

  return {
    toolConfigured: true,
    agentExists: (agents.data?.length || 0) > 0,
    toolCode: DOCUMENT_OBSERVER_FUNCTION_CODE,
    agentId: agents.data?.[0]?._id
  }
}

// Export for browser console usage
if (typeof globalThis.window !== 'undefined') {
  ;(globalThis as any).registerDocumentReviewer = registerDocumentReviewer
  ;(globalThis as any).unregisterDocumentReviewer = unregisterDocumentReviewer
  ;(globalThis as any).getDocumentReviewerStatus = getDocumentReviewerStatus

  console.log(
    '📝 Document Reviewer registration functions loaded.\n' +
      'Usage:\n' +
      '  await registerDocumentReviewer(accessToken, workspaceId, modelId)\n' +
      '  await getDocumentReviewerStatus(accessToken, workspaceId)\n' +
      '  await unregisterDocumentReviewer(accessToken, workspaceId)'
  )
}

export default registerDocumentReviewer
