import { isSyncStructuralCommandSuccess, runUniverSyncStructuralCommand } from '../univerSyncStructuralCommand'

describe('univerSyncStructuralCommand', () => {
  it('isSyncStructuralCommandSuccess rejects thenables', () => {
    expect(isSyncStructuralCommandSuccess(true)).toBe(true)
    expect(isSyncStructuralCommandSuccess(false)).toBe(false)
    expect(isSyncStructuralCommandSuccess(Promise.resolve(true))).toBe(false)
  })

  it('runUniverSyncStructuralCommand requires syncExecuteCommand', () => {
    expect(runUniverSyncStructuralCommand({ executeCommand: jest.fn() }, 'sheet.command.insert-row', {})).toEqual({
      ok: false,
      reason: 'missing_sync_execute_command'
    })
  })

  it('runUniverSyncStructuralCommand fails when handler returns a promise', () => {
    expect(
      runUniverSyncStructuralCommand(
        { syncExecuteCommand: () => Promise.resolve(true) },
        'sheet.mutation.insert-row',
        {}
      )
    ).toEqual({ ok: false, reason: 'command_failed' })
  })

  it('runUniverSyncStructuralCommand catches syncExecuteCommand throws', () => {
    expect(
      runUniverSyncStructuralCommand(
        {
          syncExecuteCommand: () => {
            throw new TypeError('[CommandService]: Command handler should not return a promise.')
          }
        },
        'sheet.command.insert-row',
        {}
      )
    ).toEqual({ ok: false, reason: 'command_failed' })
  })
})
