import {
  createLearningKnowledgeArticleFromDocx,
  listLearningKnowledgeArticles
} from '../learningKnowledgeArticlesService'

describe('learningKnowledgeArticlesService', () => {
  it('lists knowledge articles visible through ContentEntry GraphQL', async () => {
    const graphqlClient = {
      request: jest.fn().mockResolvedValue({
        ContentEntry: [
          {
            id: 'content-entry-1',
            title: 'Security Policy',
            preview: 'Security summary',
            content: '<p>Security</p>',
            updatedAt: '2026-05-26T08:00:00Z'
          }
        ]
      })
    }

    const result = await listLearningKnowledgeArticles('token', { graphqlClient })

    expect(graphqlClient.request).toHaveBeenCalledWith(expect.stringContaining('ListLearningKnowledgeArticles'), {
      limit: 100
    })
    expect(result).toEqual([
      {
        id: 'content-entry-1',
        title: 'Security Policy',
        preview: 'Security summary',
        content: '<p>Security</p>',
        updatedAt: '2026-05-26T08:00:00Z'
      }
    ])
  })

  it('creates a knowledge article from parsed DOCX content', async () => {
    const contentClient = {
      post: jest.fn().mockResolvedValue({
        contentEntry: {
          id: 'content-entry-2',
          title: 'Security course',
          preview: 'Security summary',
          content: '<p>Security</p>'
        }
      })
    }

    const result = await createLearningKnowledgeArticleFromDocx(
      'token',
      'employee-1',
      {
        fileName: 'security.docx',
        fileSize: 100,
        html: '<p>Security</p>',
        plainText: 'Security text',
        messages: []
      },
      'Security course',
      'Security summary',
      { contentClient }
    )

    expect(contentClient.post).toHaveBeenCalledWith(
      '/saveContentEntry',
      {
        changeMode: 'INSERT',
        contentEntry: expect.objectContaining({
          title: 'Security course',
          preview: 'Security summary',
          content: '<p>Security</p>',
          contentGroup: 'KNOWLEDGE_CONTENT_GROUP',
          role: 'ROOT_CONTENT_ROLE',
          creatorEmployee: 'employee-1',
          allowComment: false,
          allowReaction: false
        })
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    expect(result).toEqual({
      id: 'content-entry-2',
      title: 'Security course',
      preview: 'Security summary',
      content: '<p>Security</p>',
      updatedAt: undefined
    })
  })
})
