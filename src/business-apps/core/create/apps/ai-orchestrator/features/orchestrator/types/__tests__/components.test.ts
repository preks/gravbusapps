import { isCompletedBuildStatus } from '../components'

describe('isCompletedBuildStatus', () => {
  it('treats completed_with_warnings as completed', () => {
    expect(isCompletedBuildStatus('completed_with_warnings')).toBe(true)
  })

  it('keeps in-progress statuses incomplete', () => {
    expect(isCompletedBuildStatus('building')).toBe(false)
  })
})
