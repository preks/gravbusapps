import { act, renderHook, waitFor } from '@testing-library/react'
import { useCustomDataChat } from './useCustomDataChat'
import { InputType } from '../types'

describe('useCustomDataChat', () => {
  it('separates thinking from the final response and stores the proposal', async () => {
    const proposal = {
      entities: [
        {
          entityName: 'Order',
          displayName: 'Order',
          description: 'Sales order',
          columns: [{ type: InputType.TEXT, fieldName: 'name', label: 'Name' }]
        }
      ],
      relationships: []
    }
    const onGenerate = jest.fn(async (_request, options) => {
      options.onEvent({ type: 'thinking', content: 'Reading namespace graph' })
      options.onEvent({ type: 'response', content: 'Built a draft model.' })
      options.onEvent({
        type: 'stage',
        stage: 'proposal_ready',
        stageStatus: 'complete',
        content: 'Built a draft model.',
        proposal
      })
      options.onEvent({ type: 'done' })
    })

    const { result } = renderHook(() => useCustomDataChat(onGenerate, jest.fn(), jest.fn()))

    act(() => {
      result.current.setInputValue('Create an order entity')
    })

    await act(async () => {
      await result.current.sendMessage()
    })

    await waitFor(() => {
      expect(result.current.pendingProposal).toEqual(proposal)
    })

    expect(result.current.messages).toEqual([
      {
        id: expect.any(String),
        role: 'user',
        content: 'Create an order entity'
      },
      expect.objectContaining({
        role: 'assistant',
        content: 'Built a draft model.',
        thinkingContent: 'Reading namespace graph',
        proposal,
        isLoading: false
      })
    ])
  })

  it('applies the pending proposal and clears it afterwards', async () => {
    const proposal = {
      entities: [
        {
          entityName: 'Order',
          displayName: 'Order',
          description: 'Sales order',
          columns: [{ type: InputType.TEXT, fieldName: 'name', label: 'Name' }]
        }
      ],
      relationships: []
    }
    const onGenerate = jest.fn(async (_request, options) => {
      options.onEvent({
        type: 'stage',
        stage: 'proposal_ready',
        stageStatus: 'complete',
        content: 'Built a draft model.',
        proposal
      })
      options.onEvent({ type: 'done' })
    })
    const onCreate = jest.fn().mockResolvedValue({
      success: true,
      namespace: 'sales',
      createdEntityNames: ['Order'],
      updatedEntityNames: [],
      deletedEntityNames: [],
      downgradedEntityNames: [],
      proposal
    })
    const onSuccess = jest.fn()

    const { result } = renderHook(() => useCustomDataChat(onGenerate, onCreate, onSuccess))

    act(() => {
      result.current.setInputValue('Create an order entity')
    })

    await act(async () => {
      await result.current.sendMessage()
    })

    await act(async () => {
      await result.current.applyProposal()
    })

    expect(onCreate).toHaveBeenCalledWith(proposal)
    expect(onSuccess).toHaveBeenCalled()
    expect(result.current.pendingProposal).toBeNull()
    expect(result.current.messages[result.current.messages.length - 1]).toEqual(
      expect.objectContaining({
        role: 'assistant',
        content: 'Applied model: 1 created, 0 updated, 0 deleted.',
        result: expect.objectContaining({
          createdEntityNames: ['Order']
        })
      })
    )
  })
})
