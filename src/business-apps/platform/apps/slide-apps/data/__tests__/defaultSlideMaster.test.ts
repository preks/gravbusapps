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
    'layout-presentation-title': 'Click to add title',
    'layout-section-title': 'Click to add section title',
    'layout-section-description': 'Click to add section description',
    'layout-key-points': 'Click to add text\\nClick to add text\\nClick to add text',
    'layout-left-column-points': 'Click to add text\\nClick to add text\\nClick to add text',
    'layout-right-column-points': 'Click to add text\\nClick to add text\\nClick to add text',
    'layout-strengths': 'Click to add text\\nClick to add text\\nClick to add text',
    'layout-main-content-points': 'Click to add text\\nClick to add text\\nClick to add text',
    'layout-caption-text': 'Click to add caption or supporting text',
    'layout-image-caption': 'Click to add caption',
    'layout-image-description': 'Click to add image description',
    'layout-image-alt': 'Click to add image',
    'layout-option-a': 'Click to add heading',
    'layout-option-b': 'Click to add heading'
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
    'layout-presentation-title': 'Klicken, um Titel hinzuzufügen',
    'layout-section-title': 'Klicken, um Abschnittstitel hinzuzufügen',
    'layout-section-description': 'Klicken, um Abschnittsbeschreibung hinzuzufügen',
    'layout-key-points':
      'Klicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen',
    'layout-left-column-points':
      'Klicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen',
    'layout-right-column-points':
      'Klicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen',
    'layout-strengths': 'Klicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen',
    'layout-main-content-points':
      'Klicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen\\nKlicken, um Text hinzuzufügen',
    'layout-caption-text': 'Klicken, um Beschriftung oder Begleittext hinzuzufügen',
    'layout-image-caption': 'Klicken, um Beschriftung hinzuzufügen',
    'layout-image-description': 'Klicken, um Bildbeschreibung hinzuzufügen',
    'layout-image-alt': 'Klicken, um Bild hinzuzufügen',
    'layout-option-a': 'Klicken, um Überschrift hinzuzufügen',
    'layout-option-b': 'Klicken, um Überschrift hinzuzufügen'
  }
} as const

function makeTranslator(locale: keyof typeof translations) {
  return (key: string) => translations[locale][key as keyof (typeof translations)[typeof locale]] ?? key
}

function translated(locale: keyof typeof translations, key: keyof (typeof translations)[keyof typeof translations]) {
  return translations[locale][key].replace(/\\n/g, '\n')
}

function getTextElements(layout: SlideLayout): TextElement[] {
  return layout.elements.filter((element): element is TextElement => element.type === 'text')
}

function getPlaceholderTextElements(layout: SlideLayout): TextElement[] {
  return getTextElements(layout).filter(element => {
    return Boolean(element.placeholderText)
  })
}

describe('defaultSlideMaster', () => {
  const theme = getThemeById('corporate')

  it('seeds built-in content layouts with placeholder metadata instead of real text', () => {
    const master = createDefaultSlideMaster(theme, makeTranslator('en'))
    const layout = master.layouts.find(candidate => candidate.id === 'title-content')

    expect(layout).toBeDefined()

    const body = getPlaceholderTextElements(layout!).find(
      element => element.placeholderText === translated('en', 'layout-key-points')
    )
    expect(body).toBeDefined()
    expect(body?.content).toBe('')
    expect(body?.placeholderText).toBe(translated('en', 'layout-key-points'))
    expect(body?.paragraphs).toBeUndefined()
  })

  it('refreshes built-in default layouts with the active locale before insertion', () => {
    const staleEnglishMasters = [createDefaultSlideMaster(theme, makeTranslator('en'))]

    const found = resolveLayoutForNewSlide(staleEnglishMasters, theme, 'title-content', makeTranslator('de'))

    expect(found?.master.id).toBe(DEFAULT_MASTER_ID)

    const body = getPlaceholderTextElements(found!.layout).find(
      element => element.placeholderText === translated('de', 'layout-key-points')
    )
    expect(body).toBeDefined()
    expect(body?.content).toBe('')
    expect(body?.placeholderText).toBe(translated('de', 'layout-key-points'))
    expect(body?.paragraphs).toBeUndefined()
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

  it('deep clones seeded layout elements so placeholder metadata does not leak between slides', () => {
    const master = createDefaultSlideMaster(theme, makeTranslator('en'))
    const layout = master.layouts.find(candidate => candidate.id === 'two-content')

    const { elements: firstElements } = cloneLayoutToSlide(layout!, master)
    const { elements: secondElements } = cloneLayoutToSlide(layout!, master)
    const firstBody = firstElements.find(
      (element): element is TextElement =>
        element.type === 'text' && element.placeholderText === translated('en', 'layout-left-column-points')
    )
    const secondBody = secondElements.find(
      (element): element is TextElement =>
        element.type === 'text' && element.placeholderText === translated('en', 'layout-left-column-points')
    )

    expect(firstBody).not.toBe(secondBody)

    if (!firstBody || !secondBody) {
      throw new Error('Expected cloned body text elements with placeholder metadata')
    }

    firstBody.placeholderText = 'Changed first slide'
    expect(secondBody.placeholderText).toBe(translated('en', 'layout-left-column-points'))
  })
})
