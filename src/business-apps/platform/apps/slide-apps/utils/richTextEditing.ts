import type {
  FontStyle,
  RichParagraphBulletType,
  RichParagraphNumberingStyle,
  FontWeight,
  RichTextParagraph,
  RichTextRun,
  ShapeInText,
  TextAlign,
  TextDecoration,
  TextElement
} from '../components/slideElements'
import { getListGeometryForLevel } from './richTextLists'

export interface RichTextSelectionRange {
  start: number
  end: number
}

export interface TextEditDelta {
  start: number
  deletedLength: number
  insertedLength: number
}

export type TextFormattingToggleState = 'on' | 'off' | 'mixed'

export type RichTextEditable = Pick<
  TextElement,
  | 'content'
  | 'paragraphs'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecoration'
  | 'textAlign'
  | 'color'
  | 'lineHeight'
  | 'textTransform'
>

export interface RichTextFormattingUpdate
  extends Partial<
    Pick<
      TextElement,
      | 'fontFamily'
      | 'fontSize'
      | 'fontWeight'
      | 'fontStyle'
      | 'textDecoration'
      | 'textAlign'
      | 'color'
      | 'textTransform'
    >
  > {
  bulletType?: RichParagraphBulletType
  bulletChar?: string
  numberingStyle?: RichParagraphNumberingStyle
  numberStartAt?: number
  indentLevel?: number
  listLeftMargin?: number
  listIndent?: number
}

export interface ResolvedTextFormattingState extends RichTextFormattingUpdate {
  isFontFamilyMixed?: boolean
  isFontSizeMixed?: boolean
  isColorMixed?: boolean
  isTextAlignMixed?: boolean
  isTextTransformMixed?: boolean
  isBulletTypeMixed?: boolean
  isNumberingStyleMixed?: boolean
  fontWeightState?: TextFormattingToggleState
  fontStyleState?: TextFormattingToggleState
  underlineState?: TextFormattingToggleState
  strikethroughState?: TextFormattingToggleState
}

type RichTextRunStyle = Pick<
  RichTextRun,
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecoration'
  | 'color'
  | 'backgroundColor'
  | 'textTransform'
>

const CHARACTER_STYLE_KEYS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'color',
  'textTransform'
] as const

const PARAGRAPH_STYLE_KEYS = [
  'textAlign',
  'bulletType',
  'bulletChar',
  'numberingStyle',
  'numberStartAt',
  'indentLevel',
  'listLeftMargin',
  'listIndent'
] as const

export function isRichTextFormattingUpdate(updates: Partial<TextElement>): updates is RichTextFormattingUpdate {
  return (
    CHARACTER_STYLE_KEYS.some(key => updates[key] !== undefined) ||
    PARAGRAPH_STYLE_KEYS.some(key => (updates as RichTextFormattingUpdate)[key] !== undefined)
  )
}

export function hasCharacterRichTextFormattingUpdate(
  updates: Partial<TextElement>
): updates is RichTextFormattingUpdate {
  return CHARACTER_STYLE_KEYS.some(key => updates[key] !== undefined)
}

export function getCharacterRichTextFormattingUpdate(updates: RichTextFormattingUpdate): RichTextFormattingUpdate {
  return CHARACTER_STYLE_KEYS.reduce<RichTextFormattingUpdate>((acc, key) => {
    if (updates[key] !== undefined) {
      acc[key] = updates[key]
    }
    return acc
  }, {})
}

function getParagraphRichTextFormattingUpdate(updates: RichTextFormattingUpdate): RichTextFormattingUpdate {
  return PARAGRAPH_STYLE_KEYS.reduce<RichTextFormattingUpdate>((acc, key) => {
    if (updates[key] !== undefined) {
      acc[key] = updates[key]
    }
    return acc
  }, {})
}

function hasParagraphRichTextFormattingUpdate(updates: RichTextFormattingUpdate): boolean {
  return PARAGRAPH_STYLE_KEYS.some(key => updates[key] !== undefined)
}

function cloneParagraphs(paragraphs: RichTextParagraph[]): RichTextParagraph[] {
  return paragraphs.map(paragraph => ({
    ...paragraph,
    runs: paragraph.runs.map(run => ({ ...run }))
  }))
}

function alignmentFromTextAlign(textAlign: TextAlign): RichTextParagraph['alignment'] {
  return textAlign
}

function fallbackRunStyle(source: RichTextEditable): RichTextRunStyle {
  return {
    fontFamily: source.fontFamily,
    fontSize: source.fontSize,
    fontWeight: source.fontWeight,
    fontStyle: source.fontStyle,
    textDecoration: source.textDecoration,
    color: source.color,
    textTransform: source.textTransform
  }
}

function styleFromRun(run: RichTextRun, source: RichTextEditable): RichTextRunStyle {
  return {
    ...fallbackRunStyle(source),
    fontFamily: run.fontFamily ?? source.fontFamily,
    fontSize: run.fontSize ?? source.fontSize,
    fontWeight: run.fontWeight ?? source.fontWeight,
    fontStyle: run.fontStyle ?? source.fontStyle,
    textDecoration: run.textDecoration ?? source.textDecoration,
    color: run.color ?? source.color,
    backgroundColor: run.backgroundColor,
    textTransform: run.textTransform ?? source.textTransform
  }
}

function compactRunStyle(style: RichTextRunStyle): Omit<RichTextRun, 'text'> {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textDecoration: style.textDecoration,
    color: style.color,
    backgroundColor: style.backgroundColor,
    textTransform: style.textTransform
  }
}

function sameRunStyle(a: RichTextRun, b: RichTextRun): boolean {
  return (
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.textDecoration === b.textDecoration &&
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor &&
    a.hyperlink === b.hyperlink &&
    a.textTransform === b.textTransform
  )
}

export function getRichTextContent(paragraphs: RichTextParagraph[]): string {
  return paragraphs.map(paragraph => paragraph.runs.map(run => run.text).join('')).join('\n')
}

export function getTextEditDelta(previousContent: string, nextContent: string): TextEditDelta {
  let start = 0
  while (
    start < previousContent.length &&
    start < nextContent.length &&
    previousContent[start] === nextContent[start]
  ) {
    start += 1
  }

  let previousEnd = previousContent.length
  let nextEnd = nextContent.length
  while (previousEnd > start && nextEnd > start && previousContent[previousEnd - 1] === nextContent[nextEnd - 1]) {
    previousEnd -= 1
    nextEnd -= 1
  }

  return {
    start,
    deletedLength: previousEnd - start,
    insertedLength: nextEnd - start
  }
}

export function normalizeRichTextParagraphs(source: RichTextEditable): RichTextParagraph[] {
  if (source.paragraphs && source.paragraphs.length > 0) {
    return cloneParagraphs(source.paragraphs).map(normalizeParagraphListStyle)
  }

  const style = compactRunStyle(fallbackRunStyle(source))
  return (source.content || '').split('\n').map(line =>
    normalizeParagraphListStyle({
      runs: [{ text: line, ...style }],
      alignment: alignmentFromTextAlign(source.textAlign),
      lineHeight: source.lineHeight
    })
  )
}

export function mergeAdjacentRichTextRuns(paragraphs: RichTextParagraph[]): RichTextParagraph[] {
  return paragraphs.map(paragraph => {
    const runs = paragraph.runs.reduce<RichTextRun[]>((merged, run) => {
      const previous = merged[merged.length - 1]
      if (previous && sameRunStyle(previous, run)) {
        previous.text += run.text
      } else {
        merged.push({ ...run })
      }
      return merged
    }, [])
    return normalizeParagraphListStyle({ ...paragraph, runs: runs.length > 0 ? runs : [{ text: '' }] })
  })
}

function sortedRange(range: RichTextSelectionRange): RichTextSelectionRange {
  return {
    start: Math.min(range.start, range.end),
    end: Math.max(range.start, range.end)
  }
}

function contentLengthFromParagraphs(paragraphs: RichTextParagraph[]): number {
  return getRichTextContent(paragraphs).length
}

function styleAtOffset(paragraphs: RichTextParagraph[], source: RichTextEditable, offset: number): RichTextRunStyle {
  let cursor = 0
  for (const paragraph of paragraphs) {
    for (const run of paragraph.runs) {
      const runStart = cursor
      const runEnd = runStart + run.text.length
      if (offset >= runStart && offset < runEnd) return styleFromRun(run, source)
      cursor = runEnd
    }
    cursor += 1
  }
  return fallbackRunStyle(source)
}

function paragraphStyleAtOffset(
  paragraphs: RichTextParagraph[],
  source: RichTextEditable,
  offset: number
): Omit<RichTextParagraph, 'runs'> {
  let cursor = 0
  for (const paragraph of paragraphs) {
    const paragraphLength = paragraph.runs.reduce((sum, run) => sum + run.text.length, 0)
    const paragraphEnd = cursor + paragraphLength
    if (offset <= paragraphEnd) {
      return {
        alignment: paragraph.alignment ?? alignmentFromTextAlign(source.textAlign),
        indentLevel: paragraph.indentLevel,
        bulletType: paragraph.bulletType,
        bulletChar: paragraph.bulletChar,
        numberingStyle: paragraph.numberingStyle,
        numberStartAt: paragraph.numberStartAt,
        listLeftMargin: paragraph.listLeftMargin,
        listIndent: paragraph.listIndent,
        lineHeight: paragraph.lineHeight ?? source.lineHeight,
        spaceBefore: paragraph.spaceBefore,
        spaceAfter: paragraph.spaceAfter
      }
    }
    cursor = paragraphEnd + 1
  }

  return {
    alignment: alignmentFromTextAlign(source.textAlign),
    lineHeight: source.lineHeight
  }
}

function normalizeParagraphListStyle(paragraph: RichTextParagraph): RichTextParagraph {
  const bulletType = paragraph.bulletType ?? 'none'

  if (bulletType === 'bullet') {
    const indentLevel = paragraph.indentLevel ?? 0
    const geometry =
      paragraph.listLeftMargin !== undefined || paragraph.listIndent !== undefined
        ? {}
        : getListGeometryForLevel(indentLevel)

    return {
      ...paragraph,
      bulletType,
      bulletChar: paragraph.bulletChar ?? '•',
      numberingStyle: undefined,
      numberStartAt: undefined,
      ...geometry
    }
  }

  if (bulletType === 'number') {
    const indentLevel = paragraph.indentLevel ?? 0
    const geometry =
      paragraph.listLeftMargin !== undefined || paragraph.listIndent !== undefined
        ? {}
        : getListGeometryForLevel(indentLevel)

    return {
      ...paragraph,
      bulletType,
      bulletChar: undefined,
      numberingStyle: paragraph.numberingStyle ?? 'arabicPeriod',
      ...geometry
    }
  }

  return {
    ...paragraph,
    bulletType: 'none',
    bulletChar: undefined,
    numberingStyle: undefined,
    numberStartAt: undefined,
    listLeftMargin: undefined,
    listIndent: undefined
  }
}

function applyParagraphFormattingUpdate(
  paragraph: RichTextParagraph,
  updates: RichTextFormattingUpdate
): RichTextParagraph {
  let nextParagraph: RichTextParagraph = { ...paragraph }

  if (updates.textAlign !== undefined) {
    nextParagraph.alignment = updates.textAlign
  }

  if (updates.indentLevel !== undefined) {
    nextParagraph.indentLevel = Math.max(0, updates.indentLevel)
  }

  if (updates.listLeftMargin !== undefined) {
    nextParagraph.listLeftMargin = Math.max(0, updates.listLeftMargin)
  }

  if (updates.listIndent !== undefined) {
    nextParagraph.listIndent = updates.listIndent
  }

  const nextBulletType =
    updates.bulletType ??
    (updates.bulletChar !== undefined
      ? 'bullet'
      : updates.numberingStyle !== undefined || updates.numberStartAt !== undefined
        ? 'number'
        : nextParagraph.bulletType)

  if (nextBulletType !== undefined) {
    nextParagraph.bulletType = nextBulletType
  }

  if (updates.bulletChar !== undefined) {
    nextParagraph.bulletChar = updates.bulletChar
  }

  if (updates.numberingStyle !== undefined) {
    nextParagraph.numberingStyle = updates.numberingStyle
  }

  if (updates.numberStartAt !== undefined) {
    nextParagraph.numberStartAt = updates.numberStartAt
  }

  if (
    updates.indentLevel !== undefined &&
    updates.listLeftMargin === undefined &&
    updates.listIndent === undefined &&
    (nextParagraph.bulletType ?? 'none') !== 'none'
  ) {
    const geometry = getListGeometryForLevel(nextParagraph.indentLevel ?? 0)
    nextParagraph = {
      ...nextParagraph,
      ...geometry
    }
  }

  return normalizeParagraphListStyle(nextParagraph)
}

function isListRepresentationUpdate(updates: RichTextFormattingUpdate): boolean {
  return updates.bulletType !== undefined || updates.bulletChar !== undefined || updates.numberingStyle !== undefined
}

function uniformValue<T>(values: T[]): { value: T | undefined; mixed: boolean } {
  if (values.length === 0) return { value: undefined, mixed: false }
  const first = values[0]
  const mixed = values.some(value => value !== first)
  return { value: mixed ? undefined : first, mixed }
}

function resolveToggleState(matches: boolean[]): TextFormattingToggleState {
  if (matches.length === 0) return 'off'
  if (matches.every(Boolean)) return 'on'
  if (matches.every(match => !match)) return 'off'
  return 'mixed'
}

export function replaceRichTextContent<T extends RichTextEditable>(source: T, nextContent: string): T {
  const previousParagraphs = normalizeRichTextParagraphs(source)
  const previousLength = Math.max(0, contentLengthFromParagraphs(previousParagraphs) - 1)
  let globalOffset = 0

  const paragraphs = nextContent.split('\n').map(line => {
    const paragraphStyle = paragraphStyleAtOffset(previousParagraphs, source, Math.min(globalOffset, previousLength))
    const runs: RichTextRun[] = []
    for (const char of line) {
      const style = compactRunStyle(styleAtOffset(previousParagraphs, source, Math.min(globalOffset, previousLength)))
      const previous = runs[runs.length - 1]
      if (previous && sameRunStyle(previous, { text: char, ...style })) {
        previous.text += char
      } else {
        runs.push({ text: char, ...style })
      }
      globalOffset += 1
    }
    globalOffset += 1
    return {
      ...paragraphStyle,
      runs: runs.length > 0 ? runs : [{ text: '', ...compactRunStyle(fallbackRunStyle(source)) }],
      alignment: paragraphStyle.alignment ?? alignmentFromTextAlign(source.textAlign),
      lineHeight: paragraphStyle.lineHeight ?? source.lineHeight
    }
  })

  return { ...source, content: nextContent, paragraphs: mergeAdjacentRichTextRuns(paragraphs) }
}

export function applyRichTextFormatting<T extends RichTextEditable>(
  source: T,
  updates: RichTextFormattingUpdate,
  selection?: RichTextSelectionRange | null
): T {
  const paragraphs = normalizeRichTextParagraphs(source)
  const paragraphRanges: Array<{ start: number; end: number; paragraphLength: number }> = paragraphs.map(paragraph => {
    const paragraphLength = paragraph.runs.reduce((sum, run) => sum + run.text.length, 0)
    return { start: 0, end: 0, paragraphLength }
  })
  let paragraphCursor = 0
  paragraphRanges.forEach(rangeInfo => {
    rangeInfo.start = paragraphCursor
    rangeInfo.end = paragraphCursor + rangeInfo.paragraphLength
    paragraphCursor = rangeInfo.end + 1
  })
  const contentLength = contentLengthFromParagraphs(paragraphs)
  const range = selection ? sortedRange(selection) : null
  const hasRange = !!range && range.end > range.start
  const hasCollapsedSelection = !!range && range.end === range.start
  const characterUpdates = CHARACTER_STYLE_KEYS.reduce<Partial<RichTextRun>>((acc, key) => {
    if (updates[key] !== undefined) {
      acc[key] = updates[key] as never
    }
    return acc
  }, {})
  const paragraphUpdates = getParagraphRichTextFormattingUpdate(updates)
  const hasParagraphUpdates = hasParagraphRichTextFormattingUpdate(paragraphUpdates)
  const activeParagraphIndex = hasCollapsedSelection
    ? paragraphRanges.findIndex(
        paragraphRange => range.start >= paragraphRange.start && range.start <= paragraphRange.end
      )
    : -1
  const paragraphIndicesToUpdate = new Set<number>()

  if (hasParagraphUpdates) {
    if (!selection) {
      paragraphs.forEach((_, index) => paragraphIndicesToUpdate.add(index))
    } else if (hasRange) {
      paragraphRanges.forEach((paragraphRange, index) => {
        if (range.start <= paragraphRange.end && range.end >= paragraphRange.start) {
          paragraphIndicesToUpdate.add(index)
        }
      })
    } else if (hasCollapsedSelection && activeParagraphIndex >= 0) {
      const activeParagraph = paragraphs[activeParagraphIndex]
      if (isListRepresentationUpdate(paragraphUpdates) && (activeParagraph.bulletType ?? 'none') !== 'none') {
        let startIndex = activeParagraphIndex
        let endIndex = activeParagraphIndex

        while (startIndex > 0 && (paragraphs[startIndex - 1].bulletType ?? 'none') !== 'none') {
          startIndex -= 1
        }
        while (endIndex < paragraphs.length - 1 && (paragraphs[endIndex + 1].bulletType ?? 'none') !== 'none') {
          endIndex += 1
        }

        for (let index = startIndex; index <= endIndex; index += 1) {
          paragraphIndicesToUpdate.add(index)
        }
      } else {
        paragraphIndicesToUpdate.add(activeParagraphIndex)
      }
    }
  }
  const sourceLevelUpdates = {
    ...getCharacterRichTextFormattingUpdate(updates),
    ...(selection ? {} : updates.textAlign !== undefined ? { textAlign: updates.textAlign } : {})
  }

  const nextSource = selection ? { ...source } : ({ ...source, ...sourceLevelUpdates } as T)
  let paragraphStart = 0
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    const paragraphLength = paragraph.runs.reduce((sum, run) => sum + run.text.length, 0)
    const paragraphEnd = paragraphStart + paragraphLength
    let nextParagraph: RichTextParagraph = { ...paragraph, runs: [] }
    const shouldApplyParagraphUpdates = hasParagraphUpdates && paragraphIndicesToUpdate.has(paragraphIndex)

    if (shouldApplyParagraphUpdates) {
      nextParagraph = {
        ...applyParagraphFormattingUpdate(paragraph, paragraphUpdates),
        runs: []
      }
    }

    let runStart = paragraphStart
    for (const run of paragraph.runs) {
      const runEnd = runStart + run.text.length
      const applyStart = hasRange ? Math.max(range.start, runStart) : selection ? runEnd : runStart
      const applyEnd = hasRange ? Math.min(range.end, runEnd) : selection ? runEnd : runEnd

      if (Object.keys(characterUpdates).length === 0 || applyStart >= applyEnd) {
        nextParagraph.runs.push({ ...run })
      } else {
        const beforeLength = applyStart - runStart
        const selectedLength = applyEnd - applyStart
        if (beforeLength > 0) {
          nextParagraph.runs.push({ ...run, text: run.text.slice(0, beforeLength) })
        }
        nextParagraph.runs.push({
          ...run,
          ...characterUpdates,
          text: run.text.slice(beforeLength, beforeLength + selectedLength)
        })
        if (applyEnd < runEnd) {
          nextParagraph.runs.push({ ...run, text: run.text.slice(beforeLength + selectedLength) })
        }
      }

      runStart = runEnd
    }

    paragraphStart = paragraphEnd + 1
    return nextParagraph
  })

  return {
    ...nextSource,
    content: getRichTextContent(nextParagraphs).slice(0, contentLength),
    paragraphs: mergeAdjacentRichTextRuns(nextParagraphs)
  }
}

export function applyCaretFormattingToInsertedText<T extends RichTextEditable>(
  source: T,
  pendingFormatting: RichTextFormattingUpdate | null | undefined,
  editDelta: TextEditDelta
): T {
  if (!pendingFormatting || editDelta.insertedLength <= 0) return source

  const characterUpdates = getCharacterRichTextFormattingUpdate(pendingFormatting)
  if (!hasCharacterRichTextFormattingUpdate(characterUpdates as Partial<TextElement>)) {
    return source
  }

  return applyRichTextFormatting(source, characterUpdates, {
    start: editDelta.start,
    end: editDelta.start + editDelta.insertedLength
  })
}

export function getRichTextStyleAtRange<T extends RichTextEditable>(
  source: T,
  selection?: RichTextSelectionRange | null
): ResolvedTextFormattingState {
  const paragraphs = normalizeRichTextParagraphs(source)
  const range = selection ? sortedRange(selection) : null
  const contentLength = contentLengthFromParagraphs(paragraphs)
  const offset = range ? Math.max(0, Math.min(range.start, contentLength - 1)) : 0
  let paragraphStart = 0
  let textAlign: TextAlign | undefined = source.textAlign
  let activeParagraph: RichTextParagraph | null = null

  if (!range || range.end <= range.start) {
    const runStyle = styleAtOffset(paragraphs, source, offset)

    for (const paragraph of paragraphs) {
      const paragraphLength = paragraph.runs.reduce((sum, run) => sum + run.text.length, 0)
      const paragraphEnd = paragraphStart + paragraphLength
      if (offset >= paragraphStart && offset <= paragraphEnd) {
        textAlign =
          paragraph.alignment === 'justify' || !paragraph.alignment
            ? source.textAlign
            : (paragraph.alignment as TextAlign)
        activeParagraph = paragraph
        break
      }
      paragraphStart = paragraphEnd + 1
    }

    return {
      fontFamily: runStyle.fontFamily,
      fontSize: runStyle.fontSize,
      fontWeight: runStyle.fontWeight as FontWeight,
      fontStyle: runStyle.fontStyle as FontStyle,
      textDecoration: runStyle.textDecoration as TextDecoration,
      textAlign,
      color: runStyle.color,
      textTransform: runStyle.textTransform,
      bulletType: activeParagraph?.bulletType ?? 'none',
      bulletChar: activeParagraph?.bulletChar,
      numberingStyle: activeParagraph?.numberingStyle,
      numberStartAt: activeParagraph?.numberStartAt,
      indentLevel: activeParagraph?.indentLevel,
      listLeftMargin: activeParagraph?.listLeftMargin,
      listIndent: activeParagraph?.listIndent,
      fontWeightState: runStyle.fontWeight === 'bold' ? 'on' : 'off',
      fontStyleState: runStyle.fontStyle === 'italic' ? 'on' : 'off',
      underlineState: runStyle.textDecoration === 'underline' ? 'on' : 'off',
      strikethroughState: runStyle.textDecoration === 'line-through' ? 'on' : 'off'
    }
  }

  const touchedRunStyles: RichTextRunStyle[] = []
  const touchedParagraphAlignments: TextAlign[] = []
  const touchedBulletTypes: Array<RichParagraphBulletType | undefined> = []
  const touchedNumberingStyles: Array<RichParagraphNumberingStyle | undefined> = []

  for (const paragraph of paragraphs) {
    const paragraphLength = paragraph.runs.reduce((sum, run) => sum + run.text.length, 0)
    const paragraphEnd = paragraphStart + paragraphLength
    const touchesParagraph = range.start <= paragraphEnd && range.end >= paragraphStart
    if (touchesParagraph) {
      touchedParagraphAlignments.push(
        paragraph.alignment === 'justify' || !paragraph.alignment
          ? source.textAlign
          : (paragraph.alignment as TextAlign)
      )
      touchedBulletTypes.push(paragraph.bulletType ?? 'none')
      touchedNumberingStyles.push(paragraph.numberingStyle)
    }

    let runStart = paragraphStart
    for (const run of paragraph.runs) {
      const runEnd = runStart + run.text.length
      const applyStart = Math.max(range.start, runStart)
      const applyEnd = Math.min(range.end, runEnd)
      if (applyStart < applyEnd) {
        touchedRunStyles.push(styleFromRun(run, source))
      }
      runStart = runEnd
    }

    paragraphStart = paragraphEnd + 1
  }

  if (touchedRunStyles.length === 0) {
    return getRichTextStyleAtRange(source, { start: range.start, end: range.start })
  }

  const fontFamilies = uniformValue(touchedRunStyles.map(style => style.fontFamily))
  const fontSizes = uniformValue(touchedRunStyles.map(style => style.fontSize))
  const colors = uniformValue(touchedRunStyles.map(style => style.color))
  const textTransforms = uniformValue(touchedRunStyles.map(style => style.textTransform))
  const alignments = uniformValue(touchedParagraphAlignments)
  const bulletTypes = uniformValue(touchedBulletTypes)
  const numberingStyles = uniformValue(touchedNumberingStyles)

  return {
    fontFamily: fontFamilies.value,
    fontSize: fontSizes.value,
    color: colors.value,
    textTransform: textTransforms.value,
    textAlign: alignments.value,
    bulletType: bulletTypes.value,
    numberingStyle: numberingStyles.value,
    isFontFamilyMixed: fontFamilies.mixed,
    isFontSizeMixed: fontSizes.mixed,
    isColorMixed: colors.mixed,
    isTextTransformMixed: textTransforms.mixed,
    isTextAlignMixed: alignments.mixed,
    isBulletTypeMixed: bulletTypes.mixed,
    isNumberingStyleMixed: numberingStyles.mixed,
    fontWeightState: resolveToggleState(touchedRunStyles.map(style => style.fontWeight === 'bold')),
    fontStyleState: resolveToggleState(touchedRunStyles.map(style => style.fontStyle === 'italic')),
    underlineState: resolveToggleState(touchedRunStyles.map(style => style.textDecoration === 'underline')),
    strikethroughState: resolveToggleState(touchedRunStyles.map(style => style.textDecoration === 'line-through'))
  }
}

export function createDefaultShapeText(overrides: Partial<ShapeInText> = {}): ShapeInText {
  return {
    content: '',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'center',
    verticalAlign: 'middle',
    color: '#1e293b',
    lineHeight: 1.3,
    letterSpacing: 0,
    padding: 8,
    ...overrides
  }
}
