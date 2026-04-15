import { act, renderHook, waitFor } from '@testing-library/react'
import { resolveNextResolvedState, useFileLock } from '../useFileLock'

describe('useFileLock', () => {
  it('reuses the previous state object when resolved lock state is unchanged', () => {
    const previousState = {
      lock: null,
      isLocking: false,
      isUnlocking: false,
      isChecking: false,
      error: null,
      canEdit: true,
      isLockedByMe: false
    }

    expect(resolveNextResolvedState(previousState, null, 'user-1')).toBe(previousState)
  })

  it('starts blocked when blockEditingUntilLockResolved is enabled', async () => {
    const apiService = {
      lockFile: jest.fn(),
      unlockFile: jest.fn(),
      getLockStatus: jest.fn().mockResolvedValue(null)
    }

    const { result } = renderHook(() =>
      useFileLock({
        entityId: 'sheet-1',
        entityType: 'spreadsheet_app',
        currentUserId: 'user-1',
        apiService,
        blockEditingUntilLockResolved: true,
        autoRefreshInterval: 0
      })
    )

    expect(result.current.canEdit).toBe(false)

    await waitFor(() => {
      expect(result.current.canEdit).toBe(true)
      expect(result.current.isChecking).toBe(false)
    })
  })

  it('sanitizes non-serializable lock args before API call', async () => {
    const apiService = {
      lockFile: jest.fn().mockResolvedValue({
        isLocked: true,
        lockedBy: 'user-1'
      }),
      unlockFile: jest.fn(),
      getLockStatus: jest.fn().mockResolvedValue(null)
    }

    const { result } = renderHook(() =>
      useFileLock({
        entityId: 'sheet-1',
        entityType: 'spreadsheet_app',
        currentUserId: 'user-1',
        apiService,
        autoRefreshInterval: 0
      })
    )

    const fakeEvent = { currentTarget: document.createElement('div') }

    await act(async () => {
      const ok = await result.current.acquireLock(fakeEvent as unknown as string, fakeEvent as unknown as number)
      expect(ok).toBe(true)
    })

    expect(apiService.lockFile).toHaveBeenCalledWith('sheet-1', {
      reason: undefined,
      durationMinutes: undefined
    })
    expect(result.current.isLockedByMe).toBe(true)
  })

  it('prevents edit when lock belongs to another user', async () => {
    const apiService = {
      lockFile: jest.fn(),
      unlockFile: jest.fn(),
      getLockStatus: jest.fn().mockResolvedValue({
        isLocked: true,
        lockedBy: 'user-2',
        lockedByName: 'Alice'
      })
    }

    const { result } = renderHook(() =>
      useFileLock({
        entityId: 'sheet-1',
        entityType: 'spreadsheet_app',
        currentUserId: 'user-1',
        apiService,
        autoRefreshInterval: 0
      })
    )

    await waitFor(() => {
      expect(result.current.lock?.isLocked).toBe(true)
      expect(result.current.isLockedByMe).toBe(false)
      expect(result.current.canEdit).toBe(false)
    })
  })
})
