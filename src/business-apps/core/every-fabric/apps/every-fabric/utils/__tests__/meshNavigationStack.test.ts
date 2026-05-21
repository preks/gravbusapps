import {
  MAX_STACK_DEPTH,
  current,
  goToIndex,
  pop,
  push,
  replaceTop,
  snapshotsEqual,
  type MeshNavSnapshot
} from '../meshNavigationStack'

const company: MeshNavSnapshot = { scope: 'company', fullscreen: false }
const user: MeshNavSnapshot = { scope: 'user', userId: 'u1', fullscreen: false }
const session: MeshNavSnapshot = { scope: 'session', sessionId: 's1', fullscreen: false }

describe('meshNavigationStack', () => {
  describe('snapshotsEqual', () => {
    it('treats missing userId and undefined as equal', () => {
      expect(snapshotsEqual(company, { scope: 'company', userId: undefined, fullscreen: false })).toBe(true)
    })
    it('detects scope difference', () => {
      expect(snapshotsEqual(company, user)).toBe(false)
    })
    it('detects fullscreen flag difference', () => {
      expect(snapshotsEqual(company, { ...company, fullscreen: true })).toBe(false)
    })
    it('ignores label when comparing identity', () => {
      expect(snapshotsEqual(user, { ...user, label: 'Maria' })).toBe(true)
    })
  })

  describe('push', () => {
    it('appends new snapshot when stack is empty', () => {
      expect(push([], company)).toEqual([company])
    })
    it('dedupes against top of stack', () => {
      const stack = [company]
      expect(push(stack, { ...company })).toBe(stack)
    })
    it('does push when scope changes', () => {
      const next = push([company], user)
      expect(next).toHaveLength(2)
      expect(current(next)).toEqual(user)
    })
    it('updates label in-place when identity matches but label differs', () => {
      const next = push([user], { ...user, label: 'Maria' })
      expect(next).toHaveLength(1)
      expect(current(next)?.label).toBe('Maria')
    })
    it('caps stack at MAX_STACK_DEPTH', () => {
      let stack: MeshNavSnapshot[] = []
      for (let i = 0; i < MAX_STACK_DEPTH + 5; i++) {
        stack = push(stack, { scope: 'user', userId: `u${i}`, fullscreen: false })
      }
      expect(stack).toHaveLength(MAX_STACK_DEPTH)
      expect(current(stack)?.userId).toBe(`u${MAX_STACK_DEPTH + 4}`)
    })
  })

  describe('replaceTop', () => {
    it('replaces the top without changing length', () => {
      const next = replaceTop([company, user], session)
      expect(next).toEqual([company, session])
    })
    it('initializes stack when empty', () => {
      expect(replaceTop([], company)).toEqual([company])
    })
  })

  describe('pop', () => {
    it('removes the top entry', () => {
      expect(pop([company, user])).toEqual([company])
    })
    it('is a no-op at root', () => {
      const stack = [company]
      expect(pop(stack)).toBe(stack)
    })
  })

  describe('goToIndex', () => {
    it('truncates to the requested index', () => {
      expect(goToIndex([company, user, session], 0)).toEqual([company])
      expect(goToIndex([company, user, session], 1)).toEqual([company, user])
    })
    it('is a no-op when index already at top', () => {
      const stack = [company, user]
      expect(goToIndex(stack, 1)).toBe(stack)
    })
    it('ignores out-of-range indices', () => {
      const stack = [company, user]
      expect(goToIndex(stack, -1)).toBe(stack)
      expect(goToIndex(stack, 5)).toBe(stack)
    })
  })

  describe('fullscreen flag', () => {
    it('preserves fullscreen across pushes when toggled separately', () => {
      const stack = push(push([], company), { ...user, fullscreen: true })
      expect(current(stack)?.fullscreen).toBe(true)
      const popped = pop(stack)
      expect(current(popped)?.fullscreen).toBe(false)
    })
  })
})
