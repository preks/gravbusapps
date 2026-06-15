import { buildFlowDetailPath, buildFlowDetailShareUrl, buildFlowTriggerFocusTaskId } from './flowDetailShareLinks'

describe('flowDetailShareLinks', () => {
  it('builds flow detail path with flowId only', () => {
    expect(buildFlowDetailPath('632e93bf-d40f-4965-b2d2-c165c97a1d0b')).toBe(
      '/platform/apps/flow/apps/detail?flowId=632e93bf-d40f-4965-b2d2-c165c97a1d0b'
    )
  })

  it('builds flow detail path with flowId and taskId (task-only when taskId is a UUID)', () => {
    expect(buildFlowDetailPath('632e93bf-d40f-4965-b2d2-c165c97a1d0b', '4694a31c-5f5f-30a7-992b-a13cc9f7f8ad')).toBe(
      '/platform/apps/flow/apps/detail?taskId=4694a31c-5f5f-30a7-992b-a13cc9f7f8ad'
    )
  })

  it('keeps flowId for synthetic trigger focus task ids', () => {
    expect(
      buildFlowDetailPath('632e93bf-d40f-4965-b2d2-c165c97a1d0b', 'start-632e93bf-d40f-4965-b2d2-c165c97a1d0b')
    ).toBe(
      '/platform/apps/flow/apps/detail?flowId=632e93bf-d40f-4965-b2d2-c165c97a1d0b&taskId=start-632e93bf-d40f-4965-b2d2-c165c97a1d0b'
    )
  })

  it('prefixes origin when building absolute share url in browser', () => {
    const originalWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { origin: 'https://newwork-dev.newwork.com' } }
    })

    expect(buildFlowDetailShareUrl('flow-1', 'task-1')).toBe(
      'https://newwork-dev.newwork.com/platform/apps/flow/apps/detail?flowId=flow-1&taskId=task-1'
    )

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow
    })
  })

  it('builds trigger focus task id', () => {
    expect(buildFlowTriggerFocusTaskId('632e93bf-d40f-4965-b2d2-c165c97a1d0b')).toBe(
      'start-632e93bf-d40f-4965-b2d2-c165c97a1d0b'
    )
  })
})
