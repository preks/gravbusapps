import { ContentGroup } from '../types/contentEnums'

export const CONTENT_GROUP_OPTIONS: { value: ContentGroup; label: string }[] = [
  { value: ContentGroup.NEWS, label: 'News' },
  { value: ContentGroup.KNOWLEDGE, label: 'Knowledge' },
  { value: ContentGroup.GLOSSARY, label: 'Glossary' },
  { value: ContentGroup.QUESTION, label: 'Question' },
  { value: ContentGroup.DOCUMENT, label: 'Document' },
  { value: ContentGroup.POLICY, label: 'Policy' }
]

export const CONTENT_GROUP_LABEL: Record<ContentGroup, string> = {
  [ContentGroup.UNKNOWN]: 'Unknown',
  [ContentGroup.NEWS]: 'News',
  [ContentGroup.KNOWLEDGE]: 'Knowledge',
  [ContentGroup.GLOSSARY]: 'Glossary',
  [ContentGroup.QUESTION]: 'Question',
  [ContentGroup.DOCUMENT]: 'Document',
  [ContentGroup.POLICY]: 'Policy'
}
