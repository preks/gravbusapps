import { dedupeLearningQuizQuestions } from '../useLearningQuizQuestions'

describe('dedupeLearningQuizQuestions', () => {
  it('keeps one learner question per order number', () => {
    const questions = dedupeLearningQuizQuestions([
      {
        id: 'question-2-a',
        orderNo: 2,
        prompt: 'Second',
        questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
        options: [],
        points: 1
      },
      {
        id: 'question-2-b',
        orderNo: 2,
        prompt: 'Second duplicate',
        questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
        options: [],
        points: 1
      },
      {
        id: 'question-1',
        orderNo: 1,
        prompt: 'First',
        questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
        options: [],
        points: 1
      }
    ])

    expect(questions.map(question => question.id)).toEqual(['question-1', 'question-2-a'])
  })
})
