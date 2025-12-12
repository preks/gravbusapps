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

import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { DOCUMENT_OBSERVER_TOOL } from '../definitions/document-observer-tool'
import { createDocumentReviewerAgent, DOCUMENT_REVIEWER_AGENT_ID } from '../definitions/document-reviewer-agent'

export interface RegisterDocumentReviewerResult {
  success: boolean
  toolId?: string
  agentId?: string
  error?: string
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
    promptManagerClient.setAccessToken(accessToken)

    console.log('🔧 [DocumentReviewer] Starting registration...')

    // Step 1: Check if tool already exists
    console.log('📦 [DocumentReviewer] Checking for existing tool...')
    const existingTools = await promptManagerClient.getTools({
      toolName: DOCUMENT_OBSERVER_TOOL.name,
      limit: 1
    })

    let toolId: string

    if (existingTools.data?.length > 0) {
      toolId = existingTools.data[0]._id!
      console.log(`✅ [DocumentReviewer] Tool already exists: ${toolId}`)
    } else {
      // Create the tool
      console.log('📦 [DocumentReviewer] Creating document_observer tool...')
      const toolResult = await promptManagerClient.createFunctionTool(DOCUMENT_OBSERVER_TOOL)
      toolId = toolResult._id!
      console.log(`✅ [DocumentReviewer] Tool created: ${toolId}`)
    }

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
    console.log('   Tool ID:', toolId)
    console.log('   Agent ID:', agentId)

    return {
      success: true,
      toolId,
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
    promptManagerClient.setAccessToken(accessToken)

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

    // Find and delete tool
    const tools = await promptManagerClient.getTools({
      toolName: DOCUMENT_OBSERVER_TOOL.name,
      limit: 1
    })

    if (tools.data?.length > 0) {
      await promptManagerClient.deleteFunctionTool(tools.data[0]._id!)
      console.log('✅ [DocumentReviewer] Tool deleted')
    }

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
): Promise<{ toolExists: boolean; agentExists: boolean; toolId?: string; agentId?: string }> {
  promptManagerClient.setAccessToken(accessToken)

  const [tools, agents] = await Promise.all([
    promptManagerClient.getTools({ toolName: DOCUMENT_OBSERVER_TOOL.name, limit: 1 }),
    promptManagerClient.getPrompts({ promptName: DOCUMENT_REVIEWER_AGENT_ID, workspaceId, limit: 1 })
  ])

  return {
    toolExists: (tools.data?.length || 0) > 0,
    agentExists: (agents.data?.length || 0) > 0,
    toolId: tools.data?.[0]?._id,
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
