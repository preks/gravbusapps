import { normalizeGeneratedLearningQuiz } from '../learningQuizReviewMapper'

describe('learningQuizReviewMapper', () => {
  it('normalizes generated quiz content into editable questions', () => {
    const result = normalizeGeneratedLearningQuiz({
      success: true,
      quiz: {
        title: 'Security quiz',
        description: 'Security basics',
        questions: [
          {
            id: 'q_1',
            question: 'Which practice is secure?',
            type: 'MCQ_SINGLE',
            choices: [
              { id: 'A', label: 'Use MFA' },
              { id: 'B', label: 'Share passwords' }
            ],
            correct_answer: 'Use MFA',
            explanation: 'MFA reduces account compromise risk.',
            topic: 'Access'
          }
        ]
      },
      scoring_grid: {
        pass_threshold: 80,
        per_question: { '1': { points: 1 } },
        band_definitions: [{ label: 'Pass', min: 80 }]
      },
      coverage_report: {
        covered_topics: ['Access'],
        uncovered_topics: ['Incident response']
      }
    })

    expect(result).toEqual(
      expect.objectContaining({
        title: 'Security quiz',
        description: 'Security basics',
        passThreshold: 80,
        maxAttempts: 1,
        coveredTopics: ['Access'],
        uncoveredTopics: ['Incident response'],
        questions: [
          expect.objectContaining({
            id: 'q_1',
            orderNo: 1,
            prompt: 'Which practice is secure?',
            questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
            options: [
              { key: 'A', text: 'Use MFA' },
              { key: 'B', text: 'Share passwords' }
            ],
            correctOptionKeys: ['A'],
            explanation: 'MFA reduces account compromise risk.',
            topic: 'Access'
          })
        ],
        scoringGrid: {
          perQuestion: { '1': { points: 1 } },
          bandDefinitions: { bands: [{ label: 'Pass', min: 80 }] }
        }
      })
    )
  })

  it('filters unusable questions and generates option keys for simple choices', () => {
    const result = normalizeGeneratedLearningQuiz({
      quiz: {
        title: 'Quiz',
        questions: [
          { id: 'empty' },
          {
            prompt: 'True or false?',
            question_type: 'TRUE_FALSE',
            correctAnswer: 'True'
          },
          {
            prompt: 'Pick one',
            options: ['First', 'Second'],
            answer: 'Second'
          }
        ]
      }
    })

    expect(result.questions).toHaveLength(2)
    expect(result.questions[0]).toEqual(
      expect.objectContaining({
        questionType: 'TRUE_FALSE_LEARNING_QUESTION',
        options: [
          { key: 'TRUE', text: 'True' },
          { key: 'FALSE', text: 'False' }
        ],
        correctOptionKeys: ['TRUE']
      })
    )
    expect(result.questions[1]).toEqual(
      expect.objectContaining({
        options: [
          { key: 'A', text: 'First' },
          { key: 'B', text: 'Second' }
        ],
        correctOptionKeys: ['B']
      })
    )
  })

  it('parses stringified JSON answer choices from agent output', () => {
    const result = normalizeGeneratedLearningQuiz({
      quiz: {
        title: 'Creatine quiz',
        questions: [
          {
            prompt: 'Which cognitive benefits were observed?',
            options: [
              JSON.stringify([
                { key: 'A', text: 'Reduced oxygen utilization and increased mental fatigue' },
                { key: 'B', text: 'Improved memory and processing speed' }
              ])
            ],
            correct_answer: 'B'
          }
        ]
      }
    })

    expect(result.questions[0].options).toEqual([
      { key: 'A', text: 'Reduced oxygen utilization and increased mental fatigue' },
      { key: 'B', text: 'Improved memory and processing speed' }
    ])
    expect(result.questions[0].correctOptionKeys).toEqual(['B'])
  })
})
