import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { ReadableStream } from 'stream/web'
import { TextDecoder } from 'util'
import { FlowStudioChatPanel } from './FlowStudioChatPanel'
import { useFlowStudioStore } from '../hooks/useFlowStudioStore'

const sendFlowQueryMock = jest.fn()

;(global as any).TextDecoder = TextDecoder

jest.mock('@/common/components/ai-builder', () => ({
  CreateChatPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CreateChatMessageUser: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CreateChatMessageAssistant: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/business-apps/core/create/apps/ai-builder/pages/session-detail-page/components/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>
}))

jest.mock('@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatar', () => ({
  useEmployeeAvatar: () => ({ employeeData: undefined })
}))

jest.mock('@/common/network/custom-flow-engine/useCustomFlowEngineClient', () => {
  const actual = jest.requireActual('@/common/network/custom-flow-engine/CustomFlowEngineFlowsClient')
  return {
    useCustomFlowEngineClient: () => ({
      flows: {
        agentic: {
          sendFlowQuery: (...args: unknown[]) => sendFlowQueryMock(...args),
          parseFlowStreamDataLine: actual.parseFlowStreamDataLine
        }
      }
    })
  }
})

function createSseStream(events: unknown[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      const body = `${events.map(event => `data: ${JSON.stringify(event)}`).join('\n')}\n\n`
      controller.enqueue(new Uint8Array(Buffer.from(body, 'utf-8')))
      controller.close()
    }
  })
}

const canonicalTemplate = {
  name: 'AI Applied Flow',
  version: 1,
  steps: [
    {
      reference: 'step_0',
      type: 'TASK',
      title: 'AI Task',
      assignment: {
        assignmentMode: 'ASSIGN_SINGLE',
        targets: {
          users: ['user-123']
        }
      },
      nextStep: null
    }
  ]
}

describe('FlowStudioChatPanel', () => {
  beforeEach(() => {
    useFlowStudioStore.getState().resetStore()
    sendFlowQueryMock.mockReset()
  })

  it('applies the canvas only after the applied stage arrives', async () => {
    sendFlowQueryMock.mockResolvedValue(
      createSseStream([
        { type: 'tool_result', toolName: 'set_flow_draft', toolResult: { success: true, template: canonicalTemplate } },
        { type: 'done' }
      ])
    )

    const firstRender = render(<FlowStudioChatPanel accessToken="token" initialPrompt="Create flow" />)

    await waitFor(() => expect(sendFlowQueryMock).toHaveBeenCalled())
    await waitFor(() => expect(useFlowStudioStore.getState().chatMessages.length).toBeGreaterThan(0))

    expect(useFlowStudioStore.getState().templateName).toBe('Untitled Flow')
    expect(useFlowStudioStore.getState().templateId).toBeUndefined()
    firstRender.unmount()

    sendFlowQueryMock.mockResolvedValue(
      createSseStream([
        {
          type: 'stage',
          stage: 'applied',
          stageStatus: 'complete',
          stageData: { template: canonicalTemplate }
        },
        { type: 'done' }
      ])
    )

    render(<FlowStudioChatPanel accessToken="token" initialPrompt="Refine flow" />)

    await waitFor(() => expect(sendFlowQueryMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(useFlowStudioStore.getState().templateName).toBe('AI Applied Flow'))
    expect(useFlowStudioStore.getState().nodes.length).toBeGreaterThan(2)
  })
})
