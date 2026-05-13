import { act, renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

import type { SpreadsheetMutationFacade } from '../../core'
import {
  createTestSpreadsheetApp,
  createTestSpreadsheetSheet
} from '../../core/test-fixtures/spreadsheetCoreTestFixtures'
import { useSpreadsheetCollectionSubmission } from '../useSpreadsheetCollectionSubmission'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('useSpreadsheetCollectionSubmission', () => {
  const toastSuccess = jest.mocked(toast.success)
  const toastError = jest.mocked(toast.error)

  beforeEach(() => {
    toastSuccess.mockClear()
    toastError.mockClear()
  })

  it('calls complete task and persists submitted-at on success', async () => {
    const completeExcelCollectionTask = jest.fn().mockResolvedValue({ success: true })
    const updateAppMetadata = jest.fn().mockResolvedValue(undefined)
    const mutationFacadeRef = {
      current: { updateAppMetadata } as unknown as SpreadsheetMutationFacade
    }
    const onAppUpdate = jest.fn()
    const onBack = jest.fn()
    const app = createTestSpreadsheetApp({
      createdBy: 'user-1',
      settings: {
        allowPublicAccess: false,
        requireAuthentication: true,
        excel_collection_copy: true
      }
    })
    const activeSheet = createTestSpreadsheetSheet()

    const { result } = renderHook(() =>
      useSpreadsheetCollectionSubmission({
        app,
        userId: 'user-1',
        activeSheet,
        mutationFacadeRef,
        onAppUpdate,
        onBack,
        getActiveSessionRows: () => [{ Name: 'Alice', _id: 'row-1' }],
        completeExcelCollectionTask,
        hasExcelCollectionTaskForApp: jest.fn().mockResolvedValue(false),
        fetchBulkCollectionResponses: jest.fn().mockResolvedValue(undefined),
        translateSubmitSuccess: () => 'ok',
        translateSubmitFailed: () => 'fail'
      })
    )

    expect(result.current.onSubmitCollection).toBeDefined()

    await act(async () => {
      await result.current.onSubmitCollection?.()
    })

    expect(completeExcelCollectionTask).toHaveBeenCalledWith(
      app.id,
      expect.objectContaining({ Name: 'Alice', __columnLabels__: expect.any(Object) })
    )
    await waitFor(() => expect(updateAppMetadata).toHaveBeenCalled())
    expect(onAppUpdate).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith('ok')
    expect(onBack).toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('shows error toast when completion fails', async () => {
    const completeExcelCollectionTask = jest.fn().mockResolvedValue({ success: false, error: 'workflow down' })

    const { result } = renderHook(() =>
      useSpreadsheetCollectionSubmission({
        app: createTestSpreadsheetApp({
          createdBy: 'user-1',
          settings: {
            allowPublicAccess: false,
            requireAuthentication: true,
            excel_collection_copy: true
          }
        }),
        userId: 'user-1',
        activeSheet: createTestSpreadsheetSheet(),
        mutationFacadeRef: { current: null },
        getActiveSessionRows: () => [],
        completeExcelCollectionTask,
        hasExcelCollectionTaskForApp: jest.fn().mockResolvedValue(false),
        fetchBulkCollectionResponses: jest.fn().mockResolvedValue(undefined),
        translateSubmitSuccess: () => 'ok',
        translateSubmitFailed: () => 'fail'
      })
    )

    await act(async () => {
      await result.current.onSubmitCollection?.()
    })

    expect(toastError).toHaveBeenCalledWith('workflow down')
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('exposes hasEnabledSheetCollectionAutomation from sheet automations', () => {
    const { result } = renderHook(() =>
      useSpreadsheetCollectionSubmission({
        app: createTestSpreadsheetApp(),
        userId: 'user-1',
        activeSheet: createTestSpreadsheetSheet({
          automations: [{ type: 'excel_collection', isEnabled: true } as any]
        }),
        mutationFacadeRef: { current: null },
        getActiveSessionRows: () => [],
        completeExcelCollectionTask: jest.fn(),
        hasExcelCollectionTaskForApp: jest.fn().mockResolvedValue(false),
        fetchBulkCollectionResponses: jest.fn().mockResolvedValue(undefined),
        translateSubmitSuccess: () => 'ok',
        translateSubmitFailed: () => 'fail'
      })
    )

    expect(result.current.hasEnabledSheetCollectionAutomation).toBe(true)
  })
})
