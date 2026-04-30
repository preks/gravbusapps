import type { SlideLayout, SlideMaster } from '../../types/slideMaster'
import type { TextElement } from '../../components/slideElements'
import { createTextElement } from '../../components/slideElements'
import { getThemeById } from '../../components/slideThemes'
import {
  DEFAULT_MASTER_ID,
  cloneLayoutToSlide,
  createDefaultSlideMaster,
  resolveLayoutForNewSlide
} from '../defaultSlideMaster'

const translations = {
  en: {
    'editor-placeholder-title': 'Click to add title',
    'editor-placeholder-subtitle': 'Click to add subtitle',
    'layout-name-default-theme': 'Default Theme',
    'layout-name-title-slide': 'Title Slide',
    'layout-name-title-content': 'Title and Content',
    'layout-name-section-header': 'Section Header',
    'layout-name-two-content': 'Two Content',
    'layout-name-comparison': 'Comparison',
    'layout-name-title-only': 'Title Only',
    'layout-name-blank': 'Blank',
    'layout-name-content-caption': 'Content with Caption',
    'layout-name-picture-caption': 'Picture with Caption',
    'layout-presentation-title': 'Presentation Title',
    'layout-section-title': 'Section Title',
    'layout-section-description': 'Description or context for this section',
    'layout-key-points': 'First key point\\nSecond key point\\nThird key point',
    'layout-left-column-points': 'Left column point 1\\nLeft column point 2\\nLeft column point 3',
    'layout-right-column-points': 'Right column point 1\\nRight column point 2\\nRight column point 3',
    'layout-strengths': 'Strength one\\nStrength two\\nStrength three',
    'layout-main-content-points': 'Main content point 1\\nMain content point 2\\nMain content point 3',
    'layout-caption-text': 'Add a caption or additional context for the main content.',
    'layout-image-caption': 'Image Caption',
    'layout-image-description': 'Add a description for the image shown on the left.',
    'layout-image-alt': 'Click to add image',
    'layout-option-a': 'Option A',
    'layout-option-b': 'Option B'
  },
  de: {
    'editor-placeholder-title': 'Klicken, um Titel hinzuzufügen',
    'editor-placeholder-subtitle': 'Klicken, um Untertitel hinzuzufügen',
    'layout-name-default-theme': 'Standarddesign',
    'layout-name-title-slide': 'Titelfolie',
    'layout-name-title-content': 'Titel und Inhalt',
    'layout-name-section-header': 'Abschnittsüberschrift',
    'layout-name-two-content': 'Zwei Inhalte',
    'layout-name-comparison': 'Vergleich',
    'layout-name-title-only': 'Nur Titel',
    'layout-name-blank': 'Leer',
    'layout-name-content-caption': 'Inhalt mit Beschriftung',
    'layout-name-picture-caption': 'Bild mit Beschriftung',
    'layout-presentation-title': 'Präsentationstitel',
    'layout-section-title': 'Abschnittstitel',
    'layout-section-description': 'Beschreibung oder Kontext für diesen Abschnitt',
    'layout-key-points': 'Erster Kernpunkt\\nZweiter Kernpunkt\\nDritter Kernpunkt',
    'layout-left-column-points': 'Linke Spalte Punkt 1\\nLinke Spalte Punkt 2\\nLinke Spalte Punkt 3',
    'layout-right-column-points': 'Rechte Spalte Punkt 1\\nRechte Spalte Punkt 2\\nRechte Spalte Punkt 3',
    'layout-strengths': 'Stärke eins\\nStärke zwei\\nStärke drei',
    'layout-main-content-points': 'Hauptinhalt Punkt 1\\nHauptinhalt Punkt 2\\nHauptinhalt Punkt 3',
    'layout-caption-text': 'Fügen Sie eine Beschriftung oder zusätzlichen Kontext hinzu.',
    'layout-image-caption': 'Bildbeschriftung',
    'layout-image-description': 'Fügen Sie eine Beschreibung für das links gezeigte Bild hinzu.',
    'layout-image-alt': 'Klicken, um Bild hinzuzufügen',
    'layout-option-a': 'Option A',
    'layout-option-b': 'Option B'
  }
} as const

function makeTranslator(locale: keyof typeof translations) {
  return (key: string) => translations[locale][key as keyof (typeof translations)[typeof locale]] ?? key
}

function getTextElements(layout: SlideLayout): TextElement[] {
  return layout.elements.filter((element): element is TextElement => element.type === 'text')
}

function getBulletedTextElements(layout: SlideLayout): TextElement[] {
  return getTextElements(layout).filter(element => {
    return Boolean(element.paragraphs?.some(paragraph => paragraph.bulletType === 'bullet'))
  })
}

describe('defaultSlideMaster', () => {
  const theme = getThemeById('corporate')

  it('seeds built-in content layouts with real bullet paragraphs', () => {
    const master = createDefaultSlideMaster(theme, makeTranslator('en'))
    const layout = master.layouts.find(candidate => candidate.id === 'title-content')

    expect(layout).toBeDefined()

    const [body] = getBulletedTextElements(layout!)
    expect(body.content).toBe('First key point\nSecond key point\nThird key point')
    expect(body.paragraphs).toEqual([
      expect.objectContaining({ bulletType: 'bullet', runs: [{ text: 'First key point' }] }),
      expect.objectContaining({ bulletType: 'bullet', runs: [{ text: 'Second key point' }] }),
      expect.objectContaining({ bulletType: 'bullet', runs: [{ text: 'Third key point' }] })
    ])
  })

  it('refreshes built-in default layouts with the active locale before insertion', () => {
    const staleEnglishMasters = [createDefaultSlideMaster(theme, makeTranslator('en'))]

    const found = resolveLayoutForNewSlide(staleEnglishMasters, theme, 'title-content', makeTranslator('de'))

    expect(found?.master.id).toBe(DEFAULT_MASTER_ID)

    const [body] = getBulletedTextElements(found!.layout)
    expect(body.content).toBe('Erster Kernpunkt\nZweiter Kernpunkt\nDritter Kernpunkt')
    expect(body.paragraphs?.map(paragraph => paragraph.runs[0]?.text)).toEqual([
      'Erster Kernpunkt',
      'Zweiter Kernpunkt',
      'Dritter Kernpunkt'
    ])
  })

  it('stores canonical theme font names for seeded layouts instead of raw CSS stacks', () => {
    const themedMaster = createDefaultSlideMaster(getThemeById('nature'), makeTranslator('en'))
    const layout = themedMaster.layouts.find(candidate => candidate.id === 'title-content')

    expect(layout).toBeDefined()

    const textElements = getTextElements(layout!)
    expect(textElements[0]?.fontFamily).toBe('Merriweather')
    expect(textElements[1]?.fontFamily).toBe('Source Sans Pro')
  })

  it('leaves custom masters untouched when resolving insertion layouts', () => {
    const customLayout: SlideLayout = {
      id: 'title-content',
      name: 'Custom Layout',
      masterId: 'custom-master',
      elements: [
        createTextElement({
          id: 'custom-title',
          content: 'Custom heading'
        })
      ],
      background: { type: 'solid', color: '#ffffff' },
      isCustom: true
    }
    const customMaster: SlideMaster = {
      id: 'custom-master',
      name: 'Custom Master',
      sharedElements: [],
      background: { type: 'solid', color: '#ffffff' },
      layouts: [customLayout]
    }

    const found = resolveLayoutForNewSlide([customMaster], theme, 'title-content', makeTranslator('de'))

    expect(found?.master).toBe(customMaster)
    expect(found?.layout).toBe(customLayout)
    expect((found?.layout.elements[0] as TextElement).content).toBe('Custom heading')
  })

  it('deep clones seeded layout elements so bullet paragraphs do not leak between slides', () => {
    const master = createDefaultSlideMaster(theme, makeTranslator('en'))
    const layout = master.layouts.find(candidate => candidate.id === 'two-content')

    const { elements: firstElements } = cloneLayoutToSlide(layout!, master)
    const { elements: secondElements } = cloneLayoutToSlide(layout!, master)
    const firstBody = firstElements.find(
      (element): element is TextElement => element.type === 'text' && Boolean(element.paragraphs?.length)
    )
    const secondBody = secondElements.find(
      (element): element is TextElement => element.type === 'text' && Boolean(element.paragraphs?.length)
    )

    expect(firstBody?.paragraphs).not.toBe(secondBody?.paragraphs)

    if (!firstBody?.paragraphs || !secondBody?.paragraphs) {
      throw new Error('Expected cloned body text elements with paragraphs')
    }

    firstBody.paragraphs[0].runs[0].text = 'Changed first slide'
    expect(secondBody.paragraphs[0].runs[0].text).toBe('Left column point 1')
  })
})
