import { useCallback } from 'react'
import { saveLearningCourse, type SaveLearningCoursePayload } from '../services/learningCourseApi'
import { generateLearningQuizFromDocument } from '../services/learningQuizGeneratorApi'

export const useLearningCourseMutations = (accessToken: string | undefined) => {
  const save = useCallback(
    async (payload: SaveLearningCoursePayload) => {
      if (!accessToken) throw new Error('Missing access token')
      return saveLearningCourse(accessToken, payload)
    },
    [accessToken]
  )

  const generate = useCallback(
    async (courseId: string, contentEntryId: string) => {
      if (!accessToken) throw new Error('Missing access token')
      return generateLearningQuizFromDocument(accessToken, { courseId, contentEntryId, title: '' })
    },
    [accessToken]
  )

  return { save, generate }
}
