import { generateLearningQuizFromDocument } from '../learningQuizGeneratorApi'

describe('generateLearningQuizFromDocument', () => {
  it('only sends declared parameters and keeps knowledge article metadata in context', async () => {
    const client = {
      setAccessToken: jest.fn(),
      getPrompts: jest.fn().mockResolvedValue({ data: [{ _id: 'prompt-1' }] }),
      getPromptParameters: jest.fn().mockResolvedValue({
        system_parameters: [],
        user_parameters: ['num_questions', 'difficulty']
      }),
      executePromptWithOptions: jest.fn().mockResolvedValue({ content: '{}' })
    }

    await generateLearningQuizFromDocument(
      'token',
      {
        courseId: 'course-1',
        contentEntryId: 'content-entry-1',
        title: 'Security course',
        passThreshold: 70
      },
      client
    )

    expect(client.setAccessToken).toHaveBeenCalledWith('token')
    expect(client.getPromptParameters).toHaveBeenCalledWith('prompt-1')
    expect(client.executePromptWithOptions).toHaveBeenCalledWith('prompt-1', {
      userParams: {
        num_questions: 10,
        difficulty: 'INTERMEDIATE'
      },
      context: expect.objectContaining({
        learning_course_id: 'course-1',
        content_entry_id: 'content-entry-1',
        source_document_id: 'content-entry-1',
        source_type: 'knowledge_article',
        title: 'Security course'
      })
    })
  })

  it('sends content_entry_id when the prompt declares it as a user parameter', async () => {
    const client = {
      setAccessToken: jest.fn(),
      getPrompts: jest.fn().mockResolvedValue({ data: [{ _id: 'prompt-1' }] }),
      getPromptParameters: jest.fn().mockResolvedValue({
        system_parameters: [],
        user_parameters: ['content_entry_id']
      }),
      executePromptWithOptions: jest.fn().mockResolvedValue({ content: '{}' })
    }

    await generateLearningQuizFromDocument(
      'token',
      {
        courseId: 'course-1',
        contentEntryId: 'content-entry-1',
        title: 'Security course'
      },
      client
    )

    expect(client.executePromptWithOptions).toHaveBeenCalledWith('prompt-1', {
      userParams: {
        content_entry_id: 'content-entry-1'
      },
      context: expect.objectContaining({
        learning_course_id: 'course-1',
        content_entry_id: 'content-entry-1',
        source_document_id: 'content-entry-1',
        source_type: 'knowledge_article',
        title: 'Security course'
      })
    })
  })

  it('sends the knowledge article id as content_document_id when the deployed prompt still declares the legacy parameter', async () => {
    const client = {
      setAccessToken: jest.fn(),
      getPrompts: jest.fn().mockResolvedValue({ data: [{ _id: 'prompt-1' }] }),
      getPromptParameters: jest.fn().mockResolvedValue({
        system_parameters: [],
        user_parameters: ['content_document_id']
      }),
      executePromptWithOptions: jest.fn().mockResolvedValue({ content: '{}' })
    }

    await generateLearningQuizFromDocument(
      'token',
      {
        courseId: 'course-1',
        contentEntryId: 'content-entry-1',
        title: 'Security course'
      },
      client
    )

    expect(client.executePromptWithOptions).toHaveBeenCalledWith('prompt-1', {
      userParams: {
        content_document_id: 'content-entry-1'
      },
      context: expect.objectContaining({
        content_document_id: 'content-entry-1',
        content_entry_id: 'content-entry-1',
        source_type: 'knowledge_article'
      })
    })
  })

  it('sends content_entry_id when the prompt declares it as a system parameter', async () => {
    const client = {
      setAccessToken: jest.fn(),
      getPrompts: jest.fn().mockResolvedValue({ data: [{ _id: 'prompt-1' }] }),
      getPromptParameters: jest.fn().mockResolvedValue({
        system_parameters: ['content_entry_id'],
        user_parameters: []
      }),
      executePromptWithOptions: jest.fn().mockResolvedValue({ content: '{}' })
    }

    await generateLearningQuizFromDocument(
      'token',
      {
        courseId: 'course-1',
        contentEntryId: 'content-entry-1',
        title: 'Security course'
      },
      client
    )

    expect(client.executePromptWithOptions).toHaveBeenCalledWith('prompt-1', {
      systemParams: {
        content_entry_id: 'content-entry-1'
      },
      context: expect.objectContaining({
        content_entry_id: 'content-entry-1',
        source_type: 'knowledge_article'
      })
    })
  })
})
