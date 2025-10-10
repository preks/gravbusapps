import { FlowTemplateClient, FlowTemplate } from '@/common/network/flows/FlowTemplateClient'

export class EmployeeLifecycleFlowService {
  static async listTemplates(accessToken: string, opts?: { limit?: number; offset?: number }) {
    const client = new FlowTemplateClient(accessToken)

    // Try backend filtering first, but add client-side filtering as fallback
    const result = await client.getTemplatesList({
      limit: opts?.limit ?? 50,
      offset: opts?.offset ?? 0,
      // filter by tag solution: employeeLifecycle
      tagFilters: { solution: 'employeeLifecycle' }
    })

    // Client-side filtering as fallback since backend filtering might not work
    const filteredTemplates = result.templates.filter(
      template => template.tags && template.tags.solution === 'employeeLifecycle'
    )

    return {
      ...result,
      templates: filteredTemplates,
      totalCount: filteredTemplates.length
    }
  }

  static async executeTemplate(
    accessToken: string,
    templateId: string,
    params: { initiator: string; context?: any }
  ): Promise<{ workflowId: string; templateId: string; workflowName: string }> {
    const client = new FlowTemplateClient(accessToken)
    const result = await client.executeWorkflow(templateId, {
      initiator: params.initiator,
      context: params.context
    })
    return result
  }
}
