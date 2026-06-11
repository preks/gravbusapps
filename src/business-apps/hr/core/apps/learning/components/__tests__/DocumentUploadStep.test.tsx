import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DocumentUploadStep, validateLearningSourceFile } from '../DocumentUploadStep'
import {
  createLearningKnowledgeArticleFromDocx,
  listLearningKnowledgeArticles
} from '../../services/learningKnowledgeArticlesService'
import { saveLearningCourse } from '../../services/learningCourseApi'

void React

const mockParseFile = jest.fn()

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  FormControl: ({ children }: any) => <>{children}</>,
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: ({ children }: any) => <p role="alert">{children}</p>,
  Input: (props: any) => <input {...props} />,
  Textarea: (props: any) => <textarea {...props} />,
  useTranslation: () => ({ t: (key: string) => key })
}))

jest.mock('@/business-apps/core/office/apps/documents/hooks/useWordParser', () => ({
  useWordParser: () => ({
    parseFile: mockParseFile
  })
}))

jest.mock('../../services/learningKnowledgeArticlesService', () => ({
  createLearningKnowledgeArticleFromDocx: jest.fn(),
  listLearningKnowledgeArticles: jest.fn()
}))

jest.mock('../../services/learningCourseApi', () => ({
  saveLearningCourse: jest.fn(),
  resolveSavedLearningCourseId: jest.fn(() => 'course-1'),
  resolveSavedLearningCourseVersion: jest.fn(() => 2)
}))

const mockCreateLearningKnowledgeArticleFromDocx = createLearningKnowledgeArticleFromDocx as jest.Mock
const mockListLearningKnowledgeArticles = listLearningKnowledgeArticles as jest.Mock
const mockSaveLearningCourse = saveLearningCourse as jest.Mock

const context = {
  accessToken: 'token',
  userInfo: {
    id: 'user-1',
    employeeDetails: {
      employeeId: 'employee-1'
    }
  }
} as any

describe('DocumentUploadStep', () => {
  beforeEach(() => {
    mockCreateLearningKnowledgeArticleFromDocx.mockReset()
    mockListLearningKnowledgeArticles.mockReset()
    mockSaveLearningCourse.mockReset()
    mockParseFile.mockReset()
    mockListLearningKnowledgeArticles.mockResolvedValue([])
    mockCreateLearningKnowledgeArticleFromDocx.mockResolvedValue({ id: 'content-entry-1', title: 'Security Handbook' })
    mockParseFile.mockResolvedValue({
      fileName: 'security.docx',
      fileSize: 1,
      html: '<p>Security</p>',
      plainText: 'Security'
    })
    mockSaveLearningCourse.mockResolvedValue({ id: 'course-1' })
  })

  it('validates supported document files', () => {
    expect(validateLearningSourceFile(null)).toBe('learning-upload-file-required')
    expect(validateLearningSourceFile(new File(['x'], 'source.txt', { type: 'text/plain' }))).toBe(
      'learning-upload-file-type-error'
    )
    expect(validateLearningSourceFile(new File(['x'], 'source.pdf', { type: 'application/pdf' }))).toBe(
      'learning-upload-file-pdf-deferred'
    )
    expect(
      validateLearningSourceFile(
        new File(['x'], 'source.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
      )
    ).toBeNull()
  })

  it('keeps submit disabled until title and file are provided', () => {
    render(<DocumentUploadStep context={context} onCreated={jest.fn()} />)

    expect(screen.getByTestId('learning-upload-submit-button')).toBeDisabled()

    fireEvent.change(screen.getByTestId('learning-course-title-input'), { target: { value: 'Security course' } })
    expect(screen.getByTestId('learning-upload-submit-button')).toBeDisabled()

    fireEvent.change(screen.getByTestId('learning-source-file-input'), {
      target: {
        files: [
          new File(['x'], 'security.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          })
        ]
      }
    })
    expect(screen.getByTestId('learning-upload-submit-button')).not.toBeDisabled()
  })

  it('rejects PDF uploads until article extraction is supported', () => {
    render(<DocumentUploadStep context={context} onCreated={jest.fn()} />)

    fireEvent.change(screen.getByTestId('learning-course-title-input'), { target: { value: 'Security course' } })
    fireEvent.change(screen.getByTestId('learning-source-file-input'), {
      target: { files: [new File(['x'], 'security.pdf', { type: 'application/pdf' })] }
    })

    expect(screen.getByTestId('learning-upload-submit-button')).toBeDisabled()
    expect(screen.getByText('learning-upload-file-pdf-deferred')).toBeInTheDocument()
  })

  it('parses a DOCX, creates a knowledge article and returns the course draft', async () => {
    const onCreated = jest.fn()
    render(<DocumentUploadStep context={context} onCreated={onCreated} />)

    const docxFile = new File(['x'], 'security.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
    fireEvent.change(screen.getByTestId('learning-course-title-input'), { target: { value: 'Security course' } })
    fireEvent.change(screen.getByTestId('learning-course-description-input'), { target: { value: 'Security summary' } })
    fireEvent.change(screen.getByTestId('learning-source-file-input'), {
      target: { files: [docxFile] }
    })
    fireEvent.click(screen.getByTestId('learning-upload-submit-button'))

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({
        courseId: 'course-1',
        sourceDocumentId: 'content-entry-1',
        title: 'Security course',
        ownerEmployeeId: 'employee-1',
        maxAttempts: 1,
        version: 2
      })
    )

    expect(mockParseFile).toHaveBeenCalledWith(docxFile)
    expect(mockCreateLearningKnowledgeArticleFromDocx).toHaveBeenCalledWith(
      'token',
      'employee-1',
      expect.objectContaining({ fileName: 'security.docx' }),
      'Security course',
      'Security summary'
    )
    expect(mockSaveLearningCourse).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        changeMode: 'INSERT',
        learningCourse: expect.objectContaining({
          title: 'Security course',
          sourceDocumentId: 'content-entry-1',
          ownerEmployeeId: 'employee-1',
          status: 'DRAFT_LEARNING_COURSE'
        })
      })
    )
  })

  it('creates a draft course from an existing knowledge article without uploading a file', async () => {
    mockListLearningKnowledgeArticles.mockResolvedValue([{ id: 'content-entry-existing-1', title: 'Existing Policy' }])
    const onCreated = jest.fn()
    render(<DocumentUploadStep context={context} onCreated={onCreated} />)

    fireEvent.change(screen.getByTestId('learning-course-title-input'), { target: { value: 'Existing doc course' } })
    fireEvent.click(screen.getByTestId('learning-source-mode-existing'))
    await waitFor(() => expect(screen.getByText('Existing Policy')).toBeInTheDocument())
    fireEvent.change(screen.getByTestId('learning-existing-document-select'), {
      target: { value: 'content-entry-existing-1' }
    })
    fireEvent.click(screen.getByTestId('learning-upload-submit-button'))

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({
        courseId: 'course-1',
        sourceDocumentId: 'content-entry-existing-1',
        title: 'Existing doc course',
        ownerEmployeeId: 'employee-1',
        maxAttempts: 1,
        version: 2
      })
    )

    expect(mockCreateLearningKnowledgeArticleFromDocx).not.toHaveBeenCalled()
    expect(mockSaveLearningCourse).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        learningCourse: expect.objectContaining({
          sourceDocumentId: 'content-entry-existing-1',
          title: 'Existing doc course'
        })
      })
    )
  })
})
