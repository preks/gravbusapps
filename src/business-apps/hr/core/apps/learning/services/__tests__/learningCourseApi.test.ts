import { resolveSavedLearningCourseId, resolveSavedLearningCourseVersion } from '../learningCourseApi'

describe('learningCourseApi', () => {
  it('prefers the persisted course id over the process instance id', () => {
    expect(
      resolveSavedLearningCourseId({
        id: 'process-instance-id',
        learningCourse: {
          id: 'learning-course-id'
        }
      })
    ).toBe('learning-course-id')
  })

  it('falls back to the top-level id for older responses', () => {
    expect(resolveSavedLearningCourseId({ id: 'learning-course-id' })).toBe('learning-course-id')
  })

  it('resolves the nested persisted course version', () => {
    expect(
      resolveSavedLearningCourseVersion({
        id: 'process-instance-id',
        learningCourse: {
          id: 'learning-course-id',
          version: 3
        }
      })
    ).toBe(3)
  })
})
