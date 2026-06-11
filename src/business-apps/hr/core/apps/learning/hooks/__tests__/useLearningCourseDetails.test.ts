import { mapLearningCourseDetailsFromApi } from '../useLearningCourseDetails'

describe('useLearningCourseDetails', () => {
  it('maps latest persisted version data into editable quiz state', () => {
    const details = mapLearningCourseDetailsFromApi({
      id: 'course-1',
      version: 4,
      title: 'Published course',
      description: 'Description',
      status: 'PUBLISHED_LEARNING_COURSE',
      sourceDocumentId: 'source-1',
      passThreshold: '70',
      maxAttempts: 2,
      allowRetake: false,
      anonymous: false,
      ownerEmployeeId: 'employee-1',
      learningMaterials: [
        { id: 'material-1', contentDocumentId: 'material-source-1', role: 'PRIMARY_LEARNING_MATERIAL' }
      ],
      learningCourseVersions: [
        {
          id: 'version-3',
          versionNo: 3,
          snapshot: {
            maxAttempts: 4,
            coveredTopics: ['Policy'],
            uncoveredTopics: ['Security']
          },
          learningScoringGrids: [
            {
              id: 'grid-1',
              passThreshold: '80',
              perQuestion: { '1': { points: 2 } },
              bandDefinitions: { bands: [{ label: 'Pass' }] }
            }
          ],
          learningQuestions: [
            {
              id: 'question-1',
              orderNo: 1,
              prompt: 'What is correct?',
              questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
              options: {
                choices: [
                  { key: 'A', text: 'Correct' },
                  { key: 'B', text: 'Wrong' }
                ]
              },
              correctKeys: { keys: ['A'] },
              points: '2',
              explanation: 'Because it is correct.'
            }
          ]
        }
      ]
    })

    expect(details.sourceDocumentId).toBe('material-source-1')
    expect(details.latestVersion?.versionNo).toBe(3)
    expect(details.quiz).toEqual(
      expect.objectContaining({
        title: 'Published course',
        passThreshold: 80,
        maxAttempts: 4,
        coveredTopics: ['Policy'],
        questions: [
          expect.objectContaining({
            prompt: 'What is correct?',
            options: [
              { key: 'A', text: 'Correct' },
              { key: 'B', text: 'Wrong' }
            ],
            correctOptionKeys: ['A'],
            points: 2
          })
        ]
      })
    )
  })

  it('supports legacy persisted option shapes and deduplicates repeated question rows', () => {
    const details = mapLearningCourseDetailsFromApi({
      id: 'course-1',
      version: 1,
      title: 'Creatine course',
      description: 'Description',
      status: 'PUBLISHED_LEARNING_COURSE',
      sourceDocumentId: 'source-1',
      passThreshold: 70,
      maxAttempts: 2,
      allowRetake: false,
      anonymous: false,
      ownerEmployeeId: 'employee-1',
      learningCourseVersions: [
        {
          id: 'version-1',
          versionNo: 1,
          learningScoringGrids: [],
          learningQuestions: [
            {
              id: 'legacy-question-2',
              orderNo: 2,
              prompt: 'Which cognitive benefits have been observed?',
              questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
              options: {
                options: [
                  { key: 'A', text: 'Reduced oxygen utilization and increased fatigue.' },
                  { key: 'B', text: 'Improved memory and processing speed.' }
                ]
              },
              correctKeys: { correctOptionKeys: ['B'] },
              points: 1,
              explanation: 'Legacy shape.'
            },
            {
              id: 'new-question-2',
              orderNo: 2,
              prompt: 'Which cognitive benefits have been observed?',
              questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
              options: {
                choices: [
                  { key: 'A', text: 'Reduced oxygen utilization and increased fatigue.' },
                  { key: 'B', text: 'Improved memory and processing speed.' }
                ]
              },
              correctKeys: { keys: ['B'] },
              points: 1,
              explanation: 'New shape.'
            },
            {
              id: 'question-3',
              orderNo: 3,
              prompt: 'How does creatine support glucose management?',
              questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
              options: {
                options: JSON.stringify([
                  { key: 'A', text: 'By eliminating insulin production.' },
                  { key: 'B', text: 'By increasing GLUT-4 translocation.' }
                ])
              },
              correctKeys: { correctOptionKeys: ['B'] },
              points: 1,
              explanation: 'Stringified persisted shape.'
            }
          ]
        }
      ]
    })

    expect(details.quiz.questions).toHaveLength(2)
    expect(details.quiz.questions[0]).toEqual(
      expect.objectContaining({
        id: 'new-question-2',
        orderNo: 2,
        options: [
          { key: 'A', text: 'Reduced oxygen utilization and increased fatigue.' },
          { key: 'B', text: 'Improved memory and processing speed.' }
        ],
        correctOptionKeys: ['B']
      })
    )
    expect(details.quiz.questions[1]).toEqual(
      expect.objectContaining({
        orderNo: 3,
        options: [
          { key: 'A', text: 'By eliminating insulin production.' },
          { key: 'B', text: 'By increasing GLUT-4 translocation.' }
        ],
        correctOptionKeys: ['B']
      })
    )
  })
})
