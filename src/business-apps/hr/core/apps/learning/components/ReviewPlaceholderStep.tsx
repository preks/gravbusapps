import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { normalizeGeneratedLearningQuiz } from '../services/learningQuizReviewMapper'
import type { GeneratedLearningQuizContent } from '../services/learningQuizGeneratorApi'
import type { EditableLearningOption, EditableLearningQuestion, EditableLearningQuiz } from '../types'
import translations from '../_i18n'

interface ReviewPlaceholderStepProps {
  generatedContent: GeneratedLearningQuizContent | null
  initialQuiz?: EditableLearningQuiz | null
  isPublishing: boolean
  publishError: string | null
  publishSuccess: boolean
  notice?: string
  publishLabel?: string
  onChangeSource?: () => void
  onRegenerate?: () => void
  onPublish: (quiz: EditableLearningQuiz) => void
}

const OPTION_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function getNextOptionKey(options: EditableLearningOption[]): string {
  const usedKeys = new Set(options.map(option => option.key))
  return OPTION_KEYS.find(key => !usedKeys.has(key)) ?? String(options.length + 1)
}

function validateQuiz(quiz: EditableLearningQuiz): string | null {
  if (quiz.title.trim().length < 3) return 'learning-review-validation-title'
  if (!Number.isInteger(quiz.maxAttempts) || quiz.maxAttempts < 1) return 'learning-review-validation-max-attempts'
  if (quiz.questions.length === 0) return 'learning-review-validation-questions'

  for (const question of quiz.questions) {
    if (!question.prompt.trim()) return 'learning-review-validation-question-prompt'
    if (question.options.length < 2) return 'learning-review-validation-options'
    if (question.options.some(option => !option.text.trim())) return 'learning-review-validation-option-text'
    if (question.correctOptionKeys.length === 0) return 'learning-review-validation-correct-answer'
  }

  return null
}

function getPublishButtonLabel(
  isPublishing: boolean,
  publishLabel: string | undefined,
  t: (key: string) => string
): string {
  if (isPublishing) return t('learning-review-publishing')
  return publishLabel ?? t('learning-review-publish')
}

function updateQuestionOption(
  question: EditableLearningQuestion,
  optionKey: string,
  text: string
): EditableLearningQuestion {
  if (question.options.every(option => option.key !== optionKey)) return question
  return {
    ...question,
    options: question.options.map(option => (option.key === optionKey ? { ...option, text } : option))
  }
}

function addQuestionOption(question: EditableLearningQuestion): EditableLearningQuestion {
  return {
    ...question,
    options: [...question.options, { key: getNextOptionKey(question.options), text: '' }]
  }
}

function removeQuestionOption(question: EditableLearningQuestion, optionKey: string): EditableLearningQuestion {
  return {
    ...question,
    options: question.options.filter(option => option.key !== optionKey),
    correctOptionKeys: question.correctOptionKeys.filter(key => key !== optionKey)
  }
}

export const ReviewPlaceholderStep: React.FC<ReviewPlaceholderStepProps> = ({
  generatedContent,
  initialQuiz,
  isPublishing,
  publishError,
  publishSuccess,
  notice,
  publishLabel,
  onChangeSource,
  onRegenerate,
  onPublish
}) => {
  const { t } = useTranslation(translations)
  const [quiz, setQuiz] = useState<EditableLearningQuiz>(
    () => initialQuiz ?? normalizeGeneratedLearningQuiz(generatedContent)
  )
  const validationError = useMemo(() => validateQuiz(quiz), [quiz])

  useEffect(() => {
    setQuiz(initialQuiz ?? normalizeGeneratedLearningQuiz(generatedContent))
  }, [generatedContent, initialQuiz])

  const updateQuestion = (questionId: string, updates: Partial<EditableLearningQuestion>) => {
    setQuiz(current => ({
      ...current,
      questions: current.questions.map(question =>
        question.id === questionId ? { ...question, ...updates } : question
      )
    }))
  }

  const updateOption = (questionId: string, optionKey: string, text: string) => {
    setQuiz(current => ({
      ...current,
      questions: current.questions.map(question =>
        question.id === questionId ? updateQuestionOption(question, optionKey, text) : question
      )
    }))
  }

  const addOption = (questionId: string) => {
    setQuiz(current => ({
      ...current,
      questions: current.questions.map(question =>
        question.id === questionId ? addQuestionOption(question) : question
      )
    }))
  }

  const removeOption = (questionId: string, optionKey: string) => {
    setQuiz(current => ({
      ...current,
      questions: current.questions.map(question =>
        question.id === questionId ? removeQuestionOption(question, optionKey) : question
      )
    }))
  }

  const removeQuestion = (questionId: string) => {
    setQuiz(current => ({
      ...current,
      questions: current.questions
        .filter(question => question.id !== questionId)
        .map((question, index) => ({ ...question, orderNo: index + 1 }))
    }))
  }

  const updateCorrectAnswer = (question: EditableLearningQuestion, optionKey: string, checked: boolean) => {
    if (question.questionType === 'MCQ_MULTI_LEARNING_QUESTION') {
      const correctOptionKeys = checked
        ? [...question.correctOptionKeys, optionKey]
        : question.correctOptionKeys.filter(key => key !== optionKey)
      updateQuestion(question.id, { correctOptionKeys: Array.from(new Set(correctOptionKeys)) })
      return
    }

    updateQuestion(question.id, { correctOptionKeys: [optionKey] })
  }

  return (
    <Card data-testid="learning-review-placeholder">
      <CardHeader>
        <CardTitle>{t('learning-builder-step-review')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-5">
        {notice && (
          <div className="gba:rounded-lg gba:bg-muted gba:px-4 gba:py-3 gba:text-sm" data-testid="learning-edit-notice">
            {notice}
          </div>
        )}
        {(onChangeSource || onRegenerate) && (
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {onChangeSource && (
              <Button
                type="button"
                variant="outline"
                onClick={onChangeSource}
                data-testid="learning-change-source-button"
              >
                {t('learning-edit-change-source')}
              </Button>
            )}
            {onRegenerate && (
              <Button
                type="button"
                variant="outline"
                onClick={onRegenerate}
                data-testid="learning-regenerate-quiz-button"
              >
                {t('learning-edit-regenerate-quiz')}
              </Button>
            )}
          </div>
        )}
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium" htmlFor="learning-review-title-input">
            {t('learning-review-title-label')}
          </label>
          <Input
            id="learning-review-title-input"
            value={quiz.title}
            onChange={event => setQuiz(current => ({ ...current, title: event.target.value }))}
            data-testid="learning-review-title-input"
          />
        </div>

        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium" htmlFor="learning-review-description-input">
            {t('learning-review-description-label')}
          </label>
          <Textarea
            id="learning-review-description-input"
            value={quiz.description}
            onChange={event => setQuiz(current => ({ ...current, description: event.target.value }))}
            rows={3}
            data-testid="learning-review-description-input"
          />
        </div>

        <dl className="gba:grid gba:grid-cols-3 gba:gap-3 gba:text-sm">
          <div className="gba:rounded-lg gba:bg-muted gba:p-3">
            <dt className="gba:text-muted-foreground">{t('learning-review-question-count')}</dt>
            <dd className="gba:font-medium" data-testid="learning-review-question-count">
              {quiz.questions.length}
            </dd>
          </div>
          <div className="gba:rounded-lg gba:bg-muted gba:p-3">
            <dt className="gba:text-muted-foreground">{t('learning-review-pass-threshold')}</dt>
            <dd className="gba:mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={quiz.passThreshold}
                onChange={event => setQuiz(current => ({ ...current, passThreshold: Number(event.target.value || 0) }))}
                data-testid="learning-review-pass-threshold-input"
              />
            </dd>
          </div>
          <div className="gba:rounded-lg gba:bg-muted gba:p-3">
            <dt className="gba:text-muted-foreground">{t('learning-review-max-attempts')}</dt>
            <dd className="gba:mt-1">
              <Input
                type="number"
                min={1}
                step={1}
                value={quiz.maxAttempts}
                onChange={event => setQuiz(current => ({ ...current, maxAttempts: Number(event.target.value || 0) }))}
                data-testid="learning-review-max-attempts-input"
              />
            </dd>
          </div>
        </dl>

        <div className="gba:space-y-1">
          <h4 className="gba:text-sm gba:font-medium">{t('learning-review-covered-topics')}</h4>
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground" data-testid="learning-review-covered-topics">
            {quiz.coveredTopics.length > 0 ? quiz.coveredTopics.join(', ') : t('learning-review-no-covered-topics')}
          </p>
        </div>

        <div className="gba:space-y-4">
          {quiz.questions.map((question, questionIndex) => (
            <div
              key={question.id}
              className="gba:space-y-4 gba:rounded-lg gba:border gba:p-4"
              data-testid={`learning-review-question-${questionIndex}`}
            >
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                <h4 className="gba:text-sm gba:font-semibold">
                  {t('learning-review-question-heading')} {questionIndex + 1}
                </h4>
                <Button type="button" variant="outline" onClick={() => removeQuestion(question.id)}>
                  {t('learning-review-remove-question')}
                </Button>
              </div>

              <div className="gba:space-y-2">
                <label className="gba:text-sm gba:font-medium" htmlFor={`learning-question-prompt-${question.id}`}>
                  {t('learning-review-question-prompt-label')}
                </label>
                <Textarea
                  id={`learning-question-prompt-${question.id}`}
                  value={question.prompt}
                  onChange={event => updateQuestion(question.id, { prompt: event.target.value })}
                  rows={3}
                  data-testid={`learning-review-question-prompt-${questionIndex}`}
                />
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                <div className="gba:space-y-2">
                  <label className="gba:text-sm gba:font-medium" htmlFor={`learning-question-topic-${question.id}`}>
                    {t('learning-review-question-topic-label')}
                  </label>
                  <Input
                    id={`learning-question-topic-${question.id}`}
                    value={question.topic}
                    onChange={event => updateQuestion(question.id, { topic: event.target.value })}
                    data-testid={`learning-review-question-topic-${questionIndex}`}
                  />
                </div>
                <div className="gba:space-y-2">
                  <label className="gba:text-sm gba:font-medium" htmlFor={`learning-question-points-${question.id}`}>
                    {t('learning-review-question-points-label')}
                  </label>
                  <Input
                    id={`learning-question-points-${question.id}`}
                    type="number"
                    min={0}
                    value={question.points}
                    onChange={event => updateQuestion(question.id, { points: Number(event.target.value || 0) })}
                    data-testid={`learning-review-question-points-${questionIndex}`}
                  />
                </div>
              </div>

              <div className="gba:space-y-2">
                <label className="gba:text-sm gba:font-medium" htmlFor={`learning-question-explanation-${question.id}`}>
                  {t('learning-review-question-explanation-label')}
                </label>
                <Textarea
                  id={`learning-question-explanation-${question.id}`}
                  value={question.explanation}
                  onChange={event => updateQuestion(question.id, { explanation: event.target.value })}
                  rows={2}
                  data-testid={`learning-review-question-explanation-${questionIndex}`}
                />
              </div>

              <div className="gba:space-y-3">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <h5 className="gba:text-sm gba:font-medium">{t('learning-review-options-heading')}</h5>
                  <Button type="button" variant="outline" onClick={() => addOption(question.id)}>
                    {t('learning-review-add-option')}
                  </Button>
                </div>

                {question.options.map((option, optionIndex) => (
                  <div key={option.key} className="gba:flex gba:items-center gba:gap-3">
                    <input
                      type={question.questionType === 'MCQ_MULTI_LEARNING_QUESTION' ? 'checkbox' : 'radio'}
                      name={`correct-${question.id}`}
                      checked={question.correctOptionKeys.includes(option.key)}
                      onChange={event => updateCorrectAnswer(question, option.key, event.target.checked)}
                      aria-label={t('learning-review-correct-answer-label')}
                      data-testid={`learning-review-question-${questionIndex}-correct-${optionIndex}`}
                    />
                    <Input
                      value={option.text}
                      onChange={event => updateOption(question.id, option.key, event.target.value)}
                      data-testid={`learning-review-question-${questionIndex}-option-${optionIndex}`}
                    />
                    <Button type="button" variant="outline" onClick={() => removeOption(question.id, option.key)}>
                      {t('learning-review-remove-option')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {(validationError || publishError) && (
          <div
            className="gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive"
            role="alert"
          >
            {publishError || (validationError ? t(validationError) : null)}
          </div>
        )}

        {publishSuccess && (
          <div
            className="gba:rounded-lg gba:bg-primary/10 gba:px-4 gba:py-3 gba:text-sm"
            data-testid="learning-publish-success"
          >
            {t('learning-review-publish-success')}
          </div>
        )}

        <div className="gba:flex gba:justify-end">
          <Button
            type="button"
            disabled={Boolean(validationError) || isPublishing || publishSuccess}
            onClick={() => onPublish(quiz)}
            data-testid="learning-review-publish-button"
          >
            {getPublishButtonLabel(isPublishing, publishLabel, t)}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
