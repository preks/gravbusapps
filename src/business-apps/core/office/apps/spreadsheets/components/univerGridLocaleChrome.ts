import { getUniverGridUiSession } from './univerGridUiSession'
import { CONTEXT_MENU_ANCHOR_LABELS } from './univerGridContextMenuDom'

const GERMAN_NUMFMT_LOCALE = 'de_DE'
/** Same grid pattern as context-menu injection (`tryInjectViaGridContainer`): inner list lives in `univer-grid` + `gap-1`. */
const NUMFMT_GRID_ROW_SELECTOR = ':scope > div.univer-flex.univer-h-7'
/** Preview lives in the second span (`sheets-numfmt-ui` `Qn` / `MoreNumfmtType`); label stays in the first span. */
const NUMFMT_ROW_PREVIEW_SPAN_SELECTOR = ':scope > span.univer-text-xs'
export const NUMFMT_MENU_ITEM_ROW_SELECTOR = 'div.univer-flex.univer-h-7'

/**
 * Univer locale overlay for German (the library ships no de-DE bundle).
 * We keep this scoped to the user-visible toolbar and number-format chrome that
 * otherwise falls back to English inside the spreadsheet canvas.
 */
export const UNIVER_DE_LOCALE = {
  design: {
    Confirm: {
      cancel: 'Abbrechen',
      confirm: 'OK'
    },
    CascaderList: {
      empty: 'Keine'
    },
    Select: {
      empty: 'Keine'
    },
    ColorPicker: {
      more: 'Weitere Farben',
      cancel: 'Abbrechen',
      confirm: 'OK'
    }
  },
  sheets: {
    tabs: {
      sheetCopy: '(Kopie{0})',
      sheet: 'Tabelle'
    }
  },
  definedName: {
    managerTitle: 'Benannte Bereiche',
    managerDescription:
      'Erstelle einen benannten Bereich, indem du Zellen oder Formeln auswählst und den gewünschten Namen in das Textfeld einträgst.',
    addButton: 'Benannten Bereich hinzufügen',
    featureTitle: 'Benannte Bereiche',
    ratioRange: 'Bereich',
    ratioFormula: 'Formel',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    scopeWorkbook: 'Arbeitsmappe',
    inputNamePlaceholder: 'Bitte gib einen Namen ein (keine Leerzeichen erlaubt)',
    inputCommentPlaceholder: 'Bitte gib einen Kommentar ein',
    inputRangePlaceholder: 'Bitte gib einen Bereich ein (keine Leerzeichen erlaubt)',
    inputFormulaPlaceholder: 'Bitte gib eine Formel ein (keine Leerzeichen erlaubt)',
    nameEmpty: 'Der Name darf nicht leer sein',
    nameDuplicate: 'Der Name existiert bereits',
    formulaOrRefStringEmpty: 'Formel oder Bezugszeichenkette darf nicht leer sein',
    formulaOrRefStringInvalid: 'Ungültige Formel oder Bezugszeichenkette',
    defaultName: 'BenannterBereich',
    updateButton: 'Aktualisieren',
    deleteButton: 'Löschen',
    deleteConfirmText: 'Möchtest du diesen benannten Bereich wirklich löschen?',
    nameConflict: 'Der Name steht im Konflikt mit einem Funktionsnamen',
    nameInvalid: 'Der Name ist ungültig',
    nameSheetConflict: 'Der Name steht im Konflikt mit einem Tabellennamen'
  },
  permission: {
    toolbarMenu: 'Schutz',
    panel: {
      title: 'Zeilen und Spalten schützen',
      name: 'Name',
      protectedRange: 'Geschützter Bereich',
      permissionDirection: 'Berechtigungsbeschreibung',
      permissionDirectionPlaceholder: 'Berechtigungsbeschreibung eingeben',
      editPermission: 'Bearbeitungsberechtigungen',
      onlyICanEdit: 'Nur ich kann bearbeiten',
      designedUserCanEdit: 'Bestimmte Personen können bearbeiten',
      viewPermission: 'Anzeigeberechtigungen',
      othersCanView: 'Andere können ansehen',
      noOneElseCanView: 'Niemand sonst kann ansehen',
      designedPerson: 'Bestimmte Personen',
      addPerson: 'Person hinzufügen',
      canEdit: 'Kann bearbeiten',
      canView: 'Kann ansehen',
      delete: 'Löschen',
      currentSheet: 'Aktuelle Tabelle',
      allSheet: 'Alle Tabellen',
      edit: 'Bearbeiten',
      Print: 'Drucken',
      Comment: 'Kommentar',
      Copy: 'Kopieren',
      SetCellStyle: 'Zellformat festlegen',
      SetCellValue: 'Zellwert festlegen',
      SetHyperLink: 'Hyperlink festlegen',
      Sort: 'Sortieren',
      Filter: 'Filtern',
      PivotTable: 'Pivot-Tabelle',
      FloatImage: 'Schwebendes Bild',
      RowHeightColWidth: 'Zeilenhöhe und Spaltenbreite',
      RowHeightColWidthReadonly: 'Zeilenhöhe und Spaltenbreite (schreibgeschützt)',
      FilterReadonly: 'Filter (schreibgeschützt)',
      nameError: 'Der Name darf nicht leer sein',
      created: 'Erstellt',
      iCanEdit: 'Ich kann bearbeiten',
      iCanNotEdit: 'Ich kann nicht bearbeiten',
      iCanView: 'Ich kann ansehen',
      iCanNotView: 'Ich kann nicht ansehen',
      emptyRangeError: 'Der Bereich darf nicht leer sein',
      rangeOverlapError: 'Bereiche dürfen sich nicht überlappen',
      rangeOverlapOverPermissionError:
        'Der Bereich darf sich nicht mit einem Bereich überlappen, der dieselben Berechtigungen hat',
      InsertHyperlink: 'Hyperlink einfügen',
      SetRowStyle: 'Zeilenformat festlegen',
      SetColumnStyle: 'Spaltenformat festlegen',
      InsertColumn: 'Spalte einfügen',
      InsertRow: 'Zeile einfügen',
      DeleteRow: 'Zeile löschen',
      DeleteColumn: 'Spalte löschen',
      EditExtraObject: 'Zusätzliches Objekt bearbeiten'
    },
    dialog: {
      allowUserToEdit: 'Nutzer:innen Bearbeitung erlauben',
      allowedPermissionType: 'Erlaubte Berechtigungstypen',
      setCellValue: 'Zellwert festlegen',
      setCellStyle: 'Zellformat festlegen',
      copy: 'Kopieren',
      alert: 'Hinweis',
      search: 'Suchen',
      alertContent:
        'Dieser Bereich ist geschützt und es sind derzeit keine Bearbeitungsberechtigungen verfügbar. Wenn du bearbeiten möchtest, wende dich bitte an die Erstellerin/den Ersteller.',
      userEmpty: 'Keine bestimmten Personen. Teile den Link, um bestimmte Personen einzuladen.',
      listEmpty: 'Du hast noch keine Bereiche oder Tabellen als geschützt eingerichtet.'
    }
  },
  align: {
    left: 'Links',
    center: 'Zentriert',
    right: 'Rechts',
    top: 'Oben',
    middle: 'Mittig',
    bottom: 'Unten'
  },
  textWrap: {
    overflow: 'Überlauf',
    wrap: 'Umbruch',
    clip: 'Abschneiden'
  },
  textRotate: {
    none: 'Keine',
    angleUp: 'Nach oben neigen',
    angleDown: 'Nach unten neigen',
    vertical: 'Vertikal stapeln',
    rotationUp: 'Nach oben drehen',
    rotationDown: 'Nach unten drehen'
  },
  merge: {
    all: 'Alles verbinden',
    vertical: 'Vertikal verbinden',
    horizontal: 'Horizontal verbinden',
    cancel: 'Verbindung aufheben'
  },
  rightClick: {
    clearAll: 'Alles löschen',
    clearContent: 'Inhalte löschen',
    clearFormat: 'Formatierungen löschen',
    clearSelection: 'Löschen'
  },
  'common-edit': 'Allgemeine Bearbeitungs-Shortcuts',
  'sheet-view': 'Blattansicht',
  shortcut: {
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    cut: 'Ausschneiden',
    copy: 'Kopieren',
    paste: 'Einfügen',
    'shortcut-panel': 'Shortcut-Panel umschalten',
    sheet: {
      'zoom-in': 'Vergrößern',
      'zoom-out': 'Verkleinern',
      'reset-zoom': 'Zoomstufe zurücksetzen',
      'select-up-cell': 'Zelle darüber auswählen',
      'select-below-cell': 'Zelle darunter auswählen',
      'select-left-cell': 'Linke Zelle auswählen',
      'select-right-cell': 'Rechte Zelle auswählen',
      'select-next-cell': 'Nächste Zelle auswählen',
      'select-previous-cell': 'Vorherige Zelle auswählen',
      'select-up-value-cell': 'Darüberliegende Zelle mit Wert auswählen',
      'select-below-value-cell': 'Darunterliegende Zelle mit Wert auswählen',
      'select-left-value-cell': 'Linke Zelle mit Wert auswählen',
      'select-right-value-cell': 'Rechte Zelle mit Wert auswählen',
      'expand-selection-down': 'Auswahl nach unten erweitern',
      'expand-selection-up': 'Auswahl nach oben erweitern',
      'expand-selection-left': 'Auswahl nach links erweitern',
      'expand-selection-right': 'Auswahl nach rechts erweitern',
      'expand-selection-to-left-gap': 'Auswahl bis zur linken Lücke erweitern',
      'expand-selection-to-below-gap': 'Auswahl bis zur unteren Lücke erweitern',
      'expand-selection-to-right-gap': 'Auswahl bis zur rechten Lücke erweitern',
      'expand-selection-to-up-gap': 'Auswahl bis zur oberen Lücke erweitern',
      'select-all': 'Alles auswählen',
      'toggle-editing': 'Bearbeitung umschalten',
      'delete-and-start-editing': 'Löschen und Bearbeitung starten',
      'abort-editing': 'Bearbeitung abbrechen',
      'break-line': 'Zeilenumbruch einfügen',
      'set-bold': 'Fett umschalten',
      'start-editing': 'Bearbeitung starten (Auswahl im Editor)',
      'set-italic': 'Kursiv umschalten',
      'set-underline': 'Unterstreichen umschalten',
      'set-strike-through': 'Durchgestrichen umschalten'
    }
  },
  'shortcut-panel': {
    title: 'Tastenkürzel'
  },
  'toggle-shortcut-panel': 'Shortcut-Panel umschalten',
  ribbon: {
    start: 'Start',
    startDesc: 'Arbeitsblatt einrichten und grundlegende Einstellungen festlegen.',
    formulas: 'Formeln',
    formulasDesc: 'Funktionen und Formeln für Datenberechnungen verwenden.'
  },
  formula: {
    insert: {
      more: 'Weitere Funktionen...',
      tooltip: 'Funktionen'
    },
    moreFunctions: {
      allFunctions: 'Alle Funktionen',
      searchFunctionPlaceholder: 'Funktion suchen',
      syntax: 'SYNTAX'
    },
    prompt: {
      helpExample: 'BEISPIEL',
      required: 'Erforderlich.'
    }
  },
  toolbar: {
    font: 'Schriftart',
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    bold: 'Fett',
    italic: 'Kursiv',
    underline: 'Unterstrichen',
    strikethrough: 'Durchgestrichen',
    fontSize: 'Schriftgröße',
    fontSizeDecrease: 'Schriftgröße verkleinern',
    fontSizeIncrease: 'Schriftgröße vergrößern',
    formatPainter: 'Format übertragen',
    alignLeft: 'Linksbündig',
    alignCenter: 'Zentriert',
    alignRight: 'Rechtsbündig',
    alignJustify: 'Blocksatz',
    border: {
      main: 'Rahmen',
      right: 'Rahmenstil'
    },
    fillColor: {
      main: 'Füllfarbe',
      right: 'Farbe auswählen'
    },
    textColor: {
      main: 'Textfarbe',
      right: 'Farbe auswählen'
    },
    resetColor: 'Zurücksetzen',
    horizontalAlignMode: {
      main: 'Horizontal ausrichten',
      right: 'Ausrichtung'
    },
    verticalAlignMode: {
      main: 'Vertikal ausrichten',
      right: 'Ausrichtung'
    },
    textRotateMode: {
      main: 'Text drehen',
      right: 'Textdrehung'
    },
    mergeCell: {
      main: 'Zellen verbinden',
      right: 'Verbindungsart auswählen'
    }
  },
  sheet: {
    numfmt: {
      title: 'Zahlenformat',
      numfmtType: 'Formattypen',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      general: 'Allgemein',
      accounting: 'Buchhaltung',
      text: 'Text',
      number: 'Zahl',
      percent: 'Prozentsatz',
      scientific: 'Wissenschaftlich',
      currency: 'Währung',
      date: 'Datum',
      time: 'Uhrzeit',
      thousandthPercentile: 'Tausendertrennzeichen',
      preview: 'Vorschau',
      dateTime: 'Datum und Uhrzeit',
      decimalLength: 'Dezimalstellen',
      currencyType: 'Währungssymbol',
      moreFmt: 'Formate',
      financialValue: 'Finanzieller Wert',
      roundingCurrency: 'Währung gerundet',
      timeDuration: 'Zeitdauer',
      currencyDes:
        'Das Währungsformat wird für allgemeine Geldbeträge verwendet. Das Buchhaltungsformat richtet Dezimalstellen und Währungssymbole in einer Spalte aus.',
      accountingDes:
        'Das Buchhaltungsformat richtet eine Spalte von Werten an Währungssymbolen und Dezimalstellen aus.',
      dateType: 'Datumstyp',
      dateDes: 'Das Datumsformat stellt Datums- und Zeitreihenwerte als Datumswerte dar.',
      negType: 'Negativer Zahlentyp',
      generalDes: 'Das Standardformat enthält kein bestimmtes Zahlenformat.',
      thousandthPercentileDes:
        'Das Prozentformat wird zur Darstellung gewöhnlicher Zahlen verwendet. Währungs- und Buchhaltungsformate bieten spezialisierte Formate für Geldwertberechnungen.',
      addDecimal: 'Dezimalstellen erhöhen',
      subtractDecimal: 'Dezimalstellen verringern',
      customFormat: 'Benutzerdefiniertes Format',
      customFormatDes: 'Benutzerdefinierte Zahlenformate basierend auf vorhandenen Formaten erstellen.'
    }
  }
}

/**
 * Anchors that identify the number-format dropdown (not the cell context menu).
 * Indexed by app locale so the grid finder works regardless of Univer's UI language.
 */
export const NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE: Record<string, string[]> = {
  'en-US': ['General', 'Formats', 'Currency', 'Date and time'],
  'de-DE': ['Allgemein', 'Formate', 'Währung', 'Datum und Uhrzeit']
}
export const NUMFMT_MENU_GRID_ANCHOR_LABELS_DEFAULT = NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE['en-US']

/**
 * German-formatted preview values keyed by the label text visible in the menu.
 * Indexed by app locale because the label language changes with the Univer locale.
 */
export const GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE: Record<string, Record<string, string>> = {
  'en-US': {
    Percentage: '122000,00%',
    Scientific: '1,22E+03',
    Accounting: '1.220,00 EUR',
    'Financial value': '1.220,00',
    Currency: '1.220,00 EUR',
    'Rounding up the currency': '1.220 EUR',
    Date: '04.05.1903',
    Time: '00:00:00',
    'Date and time': '04.05.1903 00:00'
  },
  'de-DE': {
    Prozentsatz: '122000,00%',
    Wissenschaftlich: '1,22E+03',
    Buchhaltung: '1.220,00 EUR',
    'Finanzieller Wert': '1.220,00',
    Währung: '1.220,00 EUR',
    'Währung gerundet': '1.220 EUR',
    Datum: '04.05.1903',
    Uhrzeit: '00:00:00',
    'Datum und Uhrzeit': '04.05.1903 00:00'
  }
}

export const GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE: Record<string, Record<string, string>> = {
  'en-US': {
    Accounting: '#,##0.00 "EUR"',
    'Financial value': '#,##0.00',
    Currency: '#,##0.00 "EUR"',
    'Rounding up the currency': '#,##0 "EUR"',
    Date: 'dd.mm.yyyy',
    Time: 'hh:mm:ss',
    'Date and time': 'dd.mm.yyyy hh:mm'
  },
  'de-DE': {
    Buchhaltung: '#,##0.00 "EUR"',
    'Finanzieller Wert': '#,##0.00',
    Währung: '#,##0.00 "EUR"',
    'Währung gerundet': '#,##0 "EUR"',
    Datum: 'dd.mm.yyyy',
    Uhrzeit: 'hh:mm:ss',
    'Datum und Uhrzeit': 'dd.mm.yyyy hh:mm'
  }
}

export const MERGE_MENU_SOURCE_LABELS_BY_LOCALE: Record<
  string,
  { merge: string[]; unmerge: string[]; hidden: string[] }
> = {
  'en-US': {
    merge: ['Merge all'],
    unmerge: ['Cancel merge'],
    hidden: ['Vertical merge', 'Horizontal merge']
  },
  'de-DE': {
    merge: ['Alles verbinden'],
    unmerge: ['Verbindung aufheben'],
    hidden: ['Vertikal verbinden', 'Horizontal verbinden']
  }
}

export function getNumfmtPreviewMap(): Record<string, string> {
  const { appLocale } = getUniverGridUiSession()
  return GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE[appLocale] ?? GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE['en-US']
}

export function getNumfmtPatternMap(): Record<string, string> {
  const { appLocale } = getUniverGridUiSession()
  return GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE[appLocale] ?? GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE['en-US']
}

export function getNumfmtAnchorLabels(): string[] {
  const { appLocale } = getUniverGridUiSession()
  return NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE[appLocale] ?? NUMFMT_MENU_GRID_ANCHOR_LABELS_DEFAULT
}

export type UniverFontConfig = {
  value: string
  label: string
  category?: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting'
}

export const UNIVER_FONT_CANDIDATES: UniverFontConfig[] = [
  { value: 'Arial', label: 'fontFamily.arial', category: 'sans-serif' },
  { value: 'Times New Roman', label: 'fontFamily.times-new-roman', category: 'serif' },
  { value: 'Tahoma', label: 'fontFamily.tahoma', category: 'sans-serif' },
  { value: 'Verdana', label: 'fontFamily.verdana', category: 'sans-serif' },
  { value: 'Microsoft YaHei', label: 'fontFamily.microsoft-yahei', category: 'sans-serif' },
  { value: 'SimSun', label: 'fontFamily.simsun', category: 'serif' },
  { value: 'SimHei', label: 'fontFamily.simhei', category: 'sans-serif' },
  { value: 'Kaiti', label: 'fontFamily.kaiti', category: 'serif' },
  { value: 'FangSong', label: 'fontFamily.fangsong', category: 'serif' },
  { value: 'NSimSun', label: 'fontFamily.nsimsun', category: 'serif' },
  { value: 'STXinwei', label: 'fontFamily.stxinwei', category: 'serif' },
  { value: 'STXingkai', label: 'fontFamily.stxingkai', category: 'serif' },
  { value: 'STLiti', label: 'fontFamily.stliti', category: 'serif' }
]

export const UNIVER_FONT_FALLBACK_LIST: UniverFontConfig[] = UNIVER_FONT_CANDIDATES.filter(
  font =>
    font.value === 'Arial' || font.value === 'Times New Roman' || font.value === 'Tahoma' || font.value === 'Verdana'
)

export function getSupportedUniverFonts(): UniverFontConfig[] {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.check !== 'function') {
    return UNIVER_FONT_FALLBACK_LIST
  }

  const supported = UNIVER_FONT_CANDIDATES.filter(font => {
    return document.fonts.check(`12px "${font.value}"`) || document.fonts.check(`12px ${font.value}`)
  })

  return supported.length > 0 ? supported : UNIVER_FONT_FALLBACK_LIST
}
export const HIDDEN_RIBBON_TABS = ['data', 'daten']

/**
 * Hides unwanted tabs from Univer's ribbon dropdown.
 * Walks text nodes to find the tab title, then hides the closest clickable ancestor.
 */
export function hideUnwantedRibbonTabs(): void {
  if (typeof document === 'undefined') return
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = (node.textContent || '').trim().toLowerCase()
      return HIDDEN_RIBBON_TABS.includes(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
  })
  let textNode: Text | null = null
  while ((textNode = walker.nextNode() as Text | null)) {
    let el: HTMLElement | null = textNode.parentElement
    for (let depth = 0; depth < 8 && el; depth++) {
      const cls = el.getAttribute('class') || ''
      if (
        cls.includes('univer-cursor-pointer') ||
        cls.includes('univer-rounded') ||
        el.getAttribute('role') === 'tab'
      ) {
        if (el.style.display !== 'none') el.style.display = 'none'
        break
      }
      el = el.parentElement
    }
  }
}

/**
 * Apply German number-format locale on the active workbook.
 * Returns false if skipped or failed (caller may retry after Univer injector is ready).
 */
export function applyGermanNumfmtLocale(workbook: unknown, opts?: { silent?: boolean }): boolean {
  const workbookWithNumfmt = (workbook as { setNumfmtLocal?: (locale: string) => unknown } | null | undefined) ?? null
  if (typeof workbookWithNumfmt?.setNumfmtLocal !== 'function') return false
  try {
    workbookWithNumfmt.setNumfmtLocal.call(workbook, GERMAN_NUMFMT_LOCALE)
    return true
  } catch (error) {
    if (!opts?.silent) {
      console.error('[UniverSheetGrid] setNumfmtLocal failed:', error)
    }
    return false
  }
}

/**
 * Univer's workbook can expose setNumfmtLocal before the internal injector is wired;
 * calling immediately after createWorkbook throws (e.g. reading '_injector' of undefined).
 * Defer and retry briefly; failures are silent so devtools are not spammed for this race.
 */
export function scheduleApplyGermanNumfmtLocale(
  univerAPI: { getActiveWorkbook?: () => unknown },
  isAlive: () => boolean = () => true
): void {
  const tryApply = (): boolean => {
    if (!isAlive()) return true
    const wb = univerAPI.getActiveWorkbook?.()
    return Boolean(wb && applyGermanNumfmtLocale(wb, { silent: true }))
  }

  requestAnimationFrame(() => {
    if (!isAlive()) return
    requestAnimationFrame(() => {
      if (!isAlive()) return
      if (tryApply()) return
      globalThis.setTimeout(() => {
        if (!isAlive()) return
        if (tryApply()) return
        globalThis.setTimeout(() => {
          tryApply()
        }, 150)
      }, 0)
    })
  })
}

export function normalizeMenuText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function findMenuLabelElement(item: HTMLElement): HTMLElement | null {
  const spans = Array.from(item.querySelectorAll<HTMLElement>('span')).filter(span => span.children.length === 0)
  return spans.find(span => normalizeMenuText(span.textContent || '').length > 0) ?? null
}

export function simplifyMergeDropdownMenu(): void {
  if (typeof document === 'undefined') return
  const { appLocale, mergeMenuLabels } = getUniverGridUiSession()
  const sourceLabels = MERGE_MENU_SOURCE_LABELS_BY_LOCALE[appLocale] ?? MERGE_MENU_SOURCE_LABELS_BY_LOCALE['en-US']
  const candidates = document.querySelectorAll<HTMLElement>(
    'button, [role="button"], [role="menuitem"], .univer-menu-item, [class*="menu-item"], [class*="univer-h-8"]'
  )
  for (const item of candidates) {
    const labelEl = findMenuLabelElement(item)
    const label = normalizeMenuText(labelEl?.textContent || '')
    if (!label) continue
    if (sourceLabels.merge.includes(label)) {
      labelEl!.textContent = mergeMenuLabels.merge
      continue
    }
    if (sourceLabels.unmerge.includes(label)) {
      labelEl!.textContent = mergeMenuLabels.unmerge
      continue
    }
    if (sourceLabels.hidden.includes(label)) {
      item.style.display = 'none'
    }
  }
}

export function getGermanNumfmtPattern(label: string): string | undefined {
  return getNumfmtPatternMap()[label]
}

/**
 * Locates the number-format dropdown list container using the same grid heuristic as
 * `tryInjectViaGridContainer`, but keyed on format-menu anchors and excluding cell context menus.
 */
export function findNumfmtFormatMenuGrids(): HTMLElement[] {
  const anchorLabels = getNumfmtAnchorLabels()
  return Array.from(document.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')).filter(
    el => {
      const gridText = (el.textContent || '').toLowerCase()
      if (CONTEXT_MENU_ANCHOR_LABELS.some(lbl => gridText.includes(lbl.toLowerCase()))) return false
      if (!anchorLabels.every(lbl => gridText.includes(lbl.toLowerCase()))) return false
      const childGrids = el.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')
      for (const child of childGrids) {
        if (child === el) continue
        const childText = (child.textContent || '').toLowerCase()
        if (anchorLabels.every(lbl => childText.includes(lbl.toLowerCase()))) return false
      }
      return true
    }
  )
}

export function patchGermanNumfmtMenuPreview(): void {
  if (typeof document === 'undefined') return
  const grids = findNumfmtFormatMenuGrids()
  if (grids.length === 0) return
  const previewMap = getNumfmtPreviewMap()
  for (const grid of grids) {
    const rows = grid.querySelectorAll<HTMLElement>(NUMFMT_GRID_ROW_SELECTOR)
    for (const row of rows) {
      const labelSpan = row.querySelector<HTMLElement>(':scope > span:first-child')
      if (!labelSpan) continue
      const label = normalizeMenuText(labelSpan.textContent || '')
      if (!label || !(label in previewMap)) continue
      const preview = previewMap[label]
      const previewSpan = row.querySelector<HTMLElement>(NUMFMT_ROW_PREVIEW_SPAN_SELECTOR)
      if (!previewSpan) continue
      if (normalizeMenuText(previewSpan.textContent || '') === normalizeMenuText(preview)) continue
      previewSpan.textContent = preview
    }
  }
}

/**
 * Univer's date format list (`DATEFMTLISG`) contains hardcoded Chinese labels
 * (年, 月, 日, 下午/上午). Replace them with locale-appropriate text so no
 * Chinese ever appears in the UI.
 */
export const CHINESE_DATE_LABEL_REPLACEMENTS: Record<string, Record<string, string>> = {
  'en-US': {
    '1930年08月05日': 'Aug 05, 1930',
    '8月5日': 'Aug 5',
    '下午01:30': '01:30 PM',
    '下午1:30': '1:30 PM',
    '下午1:30:30': '1:30:30 PM',
    '08-05 下午 01:30': '08-05 01:30 PM'
  },
  'de-DE': {
    '1930年08月05日': '05.08.1930',
    '8月5日': '5. Aug.',
    '下午01:30': '13:30',
    '下午1:30': '13:30',
    '下午1:30:30': '13:30:30',
    '08-05 下午 01:30': '05.08. 13:30'
  }
}

export const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/

export function patchChineseDateLabels(): void {
  if (typeof document === 'undefined') return
  const { appLocale } = getUniverGridUiSession()
  const replacements = CHINESE_DATE_LABEL_REPLACEMENTS[appLocale] ?? CHINESE_DATE_LABEL_REPLACEMENTS['en-US']
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent && CHINESE_CHAR_REGEX.test(node.textContent)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    }
  })
  let textNode: Text | null = null
  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent ?? ''
    const replacement = replacements[text.trim()]
    if (replacement) {
      textNode.textContent = replacement
    }
  }
}
