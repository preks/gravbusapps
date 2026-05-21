import { toAppActionProps } from '../adapters'

describe('toAppActionProps', () => {
  it('maps contract action menu into AppAction props', () => {
    const props = toAppActionProps(
      {
        variant: 'LIST_ITEM',
        contexts: [
          {
            context: 'employee',
            contextData: {
              employeeId: 'EMP-1'
            }
          }
        ],
        customActions: [
          {
            id: 'open-help',
            label: 'Open help',
            target: {
              kind: 'COMMAND',
              commandId: 'help.open'
            }
          }
        ],
        lazyLoad: true
      },
      () => undefined
    )

    expect(props).not.toBeNull()
    expect(props?.variant).toBe('list-item')
    expect(props?.contexts?.[0].context).toBe('employee')
    expect(props?.customActions?.length).toBe(1)
  })
})
