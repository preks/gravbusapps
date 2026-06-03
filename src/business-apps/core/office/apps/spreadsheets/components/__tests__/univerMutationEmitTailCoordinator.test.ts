import { createMutationEmitTailCoordinator } from '../univerMutationEmitTailCoordinator'

describe('createMutationEmitTailCoordinator', () => {
  it('runs enqueued work sequentially per tail key', async () => {
    const coordinator = createMutationEmitTailCoordinator()
    const order: string[] = []

    const first = coordinator.enqueue('sheet-1', async () => {
      order.push('a-start')
      await new Promise<void>(resolve => {
        globalThis.setTimeout(() => {
          order.push('a-end')
          resolve()
        }, 20)
      })
    })

    const second = coordinator.enqueue('sheet-1', async () => {
      order.push('b')
    })

    await Promise.all([first, second])
    expect(order).toEqual(['a-start', 'a-end', 'b'])
  })

  it('awaitTail blocks until in-flight enqueue completes', async () => {
    const coordinator = createMutationEmitTailCoordinator()
    let materialized = false

    void coordinator.enqueue('sheet-1', async () => {
      await new Promise<void>(resolve => {
        globalThis.setTimeout(() => {
          materialized = true
          resolve()
        }, 15)
      })
    })

    expect(materialized).toBe(false)
    await coordinator.awaitTail('sheet-1')
    expect(materialized).toBe(true)
  })

  it('does not serialize unrelated tail keys', async () => {
    const coordinator = createMutationEmitTailCoordinator()
    const order: string[] = []

    await Promise.all([
      coordinator.enqueue('sheet-a', async () => {
        order.push('a')
      }),
      coordinator.enqueue('sheet-b', async () => {
        order.push('b')
      })
    ])

    expect(order).toContain('a')
    expect(order).toContain('b')
    expect(order.length).toBe(2)
  })
})
