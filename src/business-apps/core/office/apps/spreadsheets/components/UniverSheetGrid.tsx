/**
 * UniverSheetGrid Component
 *
 * Wrapper that integrates Univer with our spreadsheet system.
 * Replaces FortuneSheetGrid; same props and ref contract for TableView and collaboration.
 */

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useState
} from 'react'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { useTranslation } from '@newwork/nw-design-system'
import spreadsheetTranslations from '../_i18n'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'
import type {
  DocumentParticipant,
  DocumentOperation
} from '../../../../../platform/apps/shared/services/CollaborationClient'
import type { CellsChangedCell } from '../services/SpreadsheetCollaborationManager'
import {
  buildWorkbookSnapshot,
  createUniverConversionContext,
  getHyperlinkUrlFromSelection,
  overlaySparseRowIndexMappings,
  transformAvatarFormulasInSnapshot,
  type ConversionContext,
  type UniverWorkbookSnapshot
} from '../utils/univerAdapter'
import {
  buildAbsoluteCellMatrixForRanges,
  normalizeCellMatrix,
  type SheetCellMatrix,
  type SheetRangeShape
} from './cellMatrixUtils'
import { isStyleOnlySheetMutationCommand, shouldScheduleSnapshotForMutation } from './snapshotTriggerUtils'

const isSpreadsheetGridRemoteApplyDebug = (): boolean => {
  try {
    return globalThis.localStorage?.getItem('debug:spreadsheet-apps') === '1'
  } catch {
    return false
  }
}

/** Gated remote-apply tracing: indices / A1 only — never log cell values. */
const debugRemoteApply = (phase: string, detail: Record<string, number | string | boolean | undefined>) => {
  if (!isSpreadsheetGridRemoteApplyDebug()) return
  console.debug('[UniverSheetGrid][remote-apply]', phase, detail)
}

// Match Univer's standard defaults for consistent cursor sizing before snapshot is read
const CURSOR_OVERLAY_ROW_HEIGHT_PX = 23
const CURSOR_OVERLAY_COL_WIDTH_PX = 73
const CURSOR_OVERLAY_HEADER_HEIGHT_PX = 28
const CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX = 48
const UNIVER_COMMAND_TYPE_MUTATION = 2
const REMOTE_ECHO_SUPPRESSION_TTL_MS = 800
const SELECTION_RECONCILE_LOCAL_EDIT_SUPPRESSION_MS = 400
const COPY_ORIGIN_RESTORE_WINDOW_MS = 30000
const GERMAN_NUMFMT_LOCALE = 'de_DE'
/** Same grid pattern as context-menu injection (`tryInjectViaGridContainer`): inner list lives in `univer-grid` + `gap-1`. */
const NUMFMT_GRID_ROW_SELECTOR = ':scope > div.univer-flex.univer-h-7'
/** Preview lives in the second span (`sheets-numfmt-ui` `Qn` / `MoreNumfmtType`); label stays in the first span. */
const NUMFMT_ROW_PREVIEW_SPAN_SELECTOR = ':scope > span.univer-text-xs'
const NUMFMT_MENU_ITEM_ROW_SELECTOR = 'div.univer-flex.univer-h-7'

/**
 * Univer locale overlay for German (the library ships no de-DE bundle).
 * We keep this scoped to the user-visible toolbar and number-format chrome that
 * otherwise falls back to English inside the spreadsheet canvas.
 */
const UNIVER_DE_LOCALE = {
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
const NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE: Record<string, string[]> = {
  'en-US': ['General', 'Formats', 'Currency', 'Date and time'],
  'de-DE': ['Allgemein', 'Formate', 'Währung', 'Datum und Uhrzeit']
}
const NUMFMT_MENU_GRID_ANCHOR_LABELS_DEFAULT = NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE['en-US']

/**
 * German-formatted preview values keyed by the label text visible in the menu.
 * Indexed by app locale because the label language changes with the Univer locale.
 */
const GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE: Record<string, Record<string, string>> = {
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

const GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE: Record<string, Record<string, string>> = {
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

/** Module-level active locale so static helpers (MutationObserver callbacks) can pick it up. */
let activeAppLocale = 'en-US'

function getNumfmtPreviewMap(): Record<string, string> {
  return GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE[activeAppLocale] ?? GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE['en-US']
}

function getNumfmtPatternMap(): Record<string, string> {
  return GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE[activeAppLocale] ?? GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE['en-US']
}

function getNumfmtAnchorLabels(): string[] {
  return NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE[activeAppLocale] ?? NUMFMT_MENU_GRID_ANCHOR_LABELS_DEFAULT
}

type UniverFontConfig = {
  value: string
  label: string
  category?: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting'
}

const UNIVER_FONT_CANDIDATES: UniverFontConfig[] = [
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

const UNIVER_FONT_FALLBACK_LIST: UniverFontConfig[] = UNIVER_FONT_CANDIDATES.filter(
  font =>
    font.value === 'Arial' || font.value === 'Times New Roman' || font.value === 'Tahoma' || font.value === 'Verdana'
)

function getSupportedUniverFonts(): UniverFontConfig[] {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.check !== 'function') {
    return UNIVER_FONT_FALLBACK_LIST
  }

  const supported = UNIVER_FONT_CANDIDATES.filter(font => {
    return document.fonts.check(`12px "${font.value}"`) || document.fonts.check(`12px ${font.value}`)
  })

  return supported.length > 0 ? supported : UNIVER_FONT_FALLBACK_LIST
}

type RemoteEchoSuppressionEntry = {
  expiresAt: number
  // Accept multiple candidate signatures because Univer may emit the post-apply
  // cell-change as a delta (e.g. `{v:null}` → 'blank') OR as the full cell state
  // (e.g. `{s:'styleId'}` → `j:{"s":"styleId"}`). A single signature would miss one.
  signatures: ReadonlySet<string>
}

const UNIVER_CELL_VALUE_KEYS = ['v', 'f', 'm', 'ct'] as const

function richCellPayloadHasValue(rich: Record<string, unknown>): boolean {
  for (const k of UNIVER_CELL_VALUE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rich, k)) return true
  }
  return false
}

function normalizeValueForEchoSignature(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('=')) return { f: trimmed }
    return value
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const obj = value as Record<string, unknown>
  if (typeof obj.f === 'string') {
    const trimmed = obj.f.trim()
    return { f: trimmed.startsWith('=') ? trimmed : `=${trimmed}` }
  }
  if (obj.v !== undefined) return obj.v
  if (obj.m !== undefined) return obj.m
  return value
}

function normalizeValueForGridWrite(value: unknown): unknown {
  const normalized = normalizeValueForEchoSignature(value)
  if (normalized === undefined || normalized === null) return ''
  if (typeof normalized === 'object' && normalized && !Array.isArray(normalized)) {
    const obj = normalized as Record<string, unknown>
    if (typeof obj.f === 'string') {
      return obj.f.trim().startsWith('=') ? obj.f.trim() : `=${obj.f.trim()}`
    }
  }
  return normalized
}

function toEchoSignature(value: unknown): string {
  const normalized = normalizeValueForEchoSignature(value)
  if (normalized === undefined) return 'u:'
  if (normalized === null) return 'n:'
  if (typeof normalized === 'string') return `s:${normalized}`
  if (typeof normalized === 'number') return `d:${normalized}`
  if (typeof normalized === 'boolean') return `b:${normalized ? 1 : 0}`
  try {
    return `j:${JSON.stringify(normalized)}`
  } catch {
    return `x:${String(normalized)}`
  }
}

function normalizeBlankLikeEchoSignature(signature: string | undefined): string {
  if (signature === 'u:' || signature === 'n:' || signature === 's:') return 'blank'
  return signature ?? 'missing'
}

function normalizeSelectionReconcileSignature(signature: string | undefined): string {
  return normalizeBlankLikeEchoSignature(signature)
}

function readAuthoritativeRowCellValue(row: Record<string, unknown>, column: SpreadsheetColumn): unknown {
  let value: unknown
  if (Object.prototype.hasOwnProperty.call(row, column.name)) {
    value = row[column.name]
  } else if (Object.prototype.hasOwnProperty.call(row, column.id)) {
    value = row[column.id]
  }
  if (value === undefined) {
    const rowKeys = Object.keys(row)
    const matchingKey = rowKeys.find(
      key => key.toLowerCase() === column.name.toLowerCase() || key.toLowerCase() === column.id.toLowerCase()
    )
    if (matchingKey) value = row[matchingKey]
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) return value
    const cellObject = value as Record<string, unknown>
    if ('v' in cellObject || 'f' in cellObject || 'm' in cellObject || 'ct' in cellObject) {
      return value
    }
    return ''
  }
  return value
}

function getAuthoritativeGridRowIndex(row: Record<string, unknown>, fallbackIndex: number): number {
  const raw = Number(row._gridRowIndex)
  return Number.isFinite(raw) && raw >= 0 ? Math.trunc(raw) : fallbackIndex
}

function buildAuthoritativeRowsByGridIndex(data: Record<string, unknown>[]): Map<number, Record<string, unknown>> {
  const rowsByGridIndex = new Map<number, Record<string, unknown>>()
  data.forEach((row, index) => {
    rowsByGridIndex.set(getAuthoritativeGridRowIndex(row, index), row)
  })
  return rowsByGridIndex
}

function getAuthoritativeGridRowExtent(data: Record<string, unknown>[]): number {
  return data.reduce((max, row, index) => Math.max(max, getAuthoritativeGridRowIndex(row, index) + 1), 0)
}

function buildAuthoritativeCellSignatureMap(
  data: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): Map<string, string> {
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  const signatures = new Map<string, string>()
  for (const [rowIndex, row] of buildAuthoritativeRowsByGridIndex(data).entries()) {
    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex++) {
      const value = readAuthoritativeRowCellValue(row, visibleColumns[colIndex]) ?? ''
      signatures.set(remoteEchoKey(rowIndex, colIndex), toEchoSignature(value))
    }
  }
  return signatures
}

function remoteEchoKey(row: number, col: number): string {
  return `${row}:${col}`
}

function pruneExpiredRecentMutationEntries(entries: Map<string, number>, now: number): void {
  for (const [key, expiresAt] of entries.entries()) {
    if (expiresAt <= now) {
      entries.delete(key)
    }
  }
}

// Prioritizes the cellRef (A1 notation) for cursor position, falling back to raw row:/col: entries.
// A1 references represent the sender's exact visual cell position and don't suffer from
// row-index drift between the data array and Univer grid.
function parseCursorPath(path?: string[]): { row: number; col: number } | null {
  if (!path || path.length === 0) return null

  const cellRefEntry = path.find(item => item.startsWith('cellRef:'))
  if (cellRefEntry) {
    const parsed = parseA1Reference(cellRefEntry.slice(8))
    if (parsed) return parsed
  }

  const colEntry = path.find(item => item.startsWith('col:'))
  if (!colEntry) return null
  const col = Number(colEntry.slice(4))
  if (!Number.isFinite(col) || col < 0) return null

  const rowEntry = path.find(item => item.startsWith('row:'))
  if (!rowEntry) return null
  const row = Number(rowEntry.slice(4))
  if (!Number.isFinite(row) || row < 0) return null
  return { row, col }
}

function parseLegacySpreadsheetCursorPath(
  path: string[] | undefined,
  sheetId: string,
  context: ConversionContext | null,
  columns: SpreadsheetColumn[]
): { row: number; col: number } | null {
  if (!path || path.length < 3 || path[0] !== sheetId || !context) return null

  const rowId = String(path[1] ?? '')
  const columnId = String(path[2] ?? '')
  if (!rowId || !columnId) return null

  const row = context.rowIdToIndex.get(rowId)
  if (row == null) return null

  const visibleColumns = columns.filter(column => column.isVisible !== false)
  const col = visibleColumns.findIndex(column => column.id === columnId || column.name === columnId)
  if (col < 0) return null

  return { row, col }
}

function parseA1Reference(cellRef: string): { row: number; col: number } | null {
  const normalized = cellRef.trim().toUpperCase()
  const singleCellMatch = /^([A-Z]+)(\d+)$/.exec(normalized)
  if (!singleCellMatch) return null
  const [, columnLetters, rowStr] = singleCellMatch
  const row = Number(rowStr) - 1
  if (!Number.isFinite(row) || row < 0) return null
  let col = 0
  for (let i = 0; i < columnLetters.length; i++) {
    col = col * 26 + (columnLetters.charCodeAt(i) - 64)
  }
  return { row, col: col - 1 }
}

function buildChangedCellSignature(cells: Array<{ rowId: string; columnName: string; value: unknown }>): string {
  return cells
    .map(cell => `${cell.rowId}:${cell.columnName}:${toEchoSignature(cell.value)}`)
    .sort()
    .join('|')
}

export function isClearLikeMutationCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  if (!normalized) return false

  return (
    normalized.includes('clear-range') ||
    normalized.includes('delete-selection') ||
    normalized.includes('deleteselectioncommand')
  )
}

function readWorksheetCellValue(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  row: number,
  col: number
): unknown {
  const cellRange = worksheet?.getRange?.(row, col)
  // Preserve formulas: when the live cell carries a formula, return the full
  // cell data so downstream persistence keeps `f`. Otherwise fall back to the
  // rendered scalar value. Without this, range-derived SheetValueChanged
  // payloads (e.g. recalculations) would store only the computed value and
  // overwrite the persisted formula on the next batch flush.
  const liveCellData = (cellRange as { getCellData?: () => Record<string, unknown> | undefined })?.getCellData?.()
  if (liveCellData && typeof liveCellData === 'object') {
    const liveFormula = (liveCellData as { f?: unknown }).f
    if (typeof liveFormula === 'string' && liveFormula.length > 0) {
      return liveCellData
    }
  }
  return (cellRange as { getValue?: () => unknown })?.getValue?.() ?? liveCellData?.v
}

function readFormulaFromUnknown(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.startsWith('=') ? trimmed : null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const f = (value as { f?: unknown }).f
  if (typeof f !== 'string') return null
  const trimmed = f.trim()
  if (trimmed.length === 0) return null
  return trimmed.startsWith('=') ? trimmed : `=${trimmed}`
}

function readPayloadFormula(
  payloadCellValue: SheetCellMatrix | undefined,
  rowIndex: number,
  colIndex: number
): string | null {
  if (!payloadCellValue) return null
  const row = payloadCellValue[rowIndex]
  if (!row || typeof row !== 'object') return null
  if (!Object.prototype.hasOwnProperty.call(row, colIndex)) return null
  return readFormulaFromUnknown((row as Record<number, unknown>)[colIndex])
}

function readLiveWorksheetFormula(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  rowIndex: number,
  colIndex: number
): string | null {
  if (!worksheet?.getRange) return null
  const liveCellData = (
    worksheet.getRange?.(rowIndex, colIndex) as { getCellData?: () => Record<string, unknown> } | undefined
  )?.getCellData?.()
  if (!liveCellData || typeof liveCellData !== 'object') return null
  return readFormulaFromUnknown(liveCellData)
}

/**
 * Preserve `f` (formula) on every cell in `cellValue` whenever the original
 * mutation payload OR the live worksheet still carries one. Two scenarios
 * silently drop formulas without this:
 *
 * 1. User-typed formulas: SetRangeValuesMutation payload has `{f, v}`, but
 *    `handleDetectedCellMutation` rebuilds `cellValue` via
 *    `deriveCellMatrixFromRanges` (which prefers the live scalar value via
 *    Univer's facade `getRange().getValue()`), discarding the payload's `f`
 *    and persisting only the rendered number.
 * 2. Recompute echoes: dependency change re-fires `SheetValueChanged` for the
 *    formula cell with only the new `v`. The live cell still has `f`, but the
 *    derived matrix carries only the scalar.
 *
 * Cells whose entry already declares `f` (including explicit `f: null` to
 * intentionally clear a formula when typing a literal value) are left
 * untouched so user clears still work.
 */
export function enrichCellMatrixWithLiveFormulas(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  cellValue: SheetCellMatrix,
  payloadCellValue?: SheetCellMatrix | undefined
): SheetCellMatrix {
  let nextValue: SheetCellMatrix | null = null
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (!Number.isFinite(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (!Number.isFinite(colIndex)) continue
      const entry = (rowCells as Record<number, unknown>)[colIndex]
      if (entry === null) continue
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        if (Object.prototype.hasOwnProperty.call(entry, 'f')) continue
      }
      const formula =
        readPayloadFormula(payloadCellValue, rowIndex, colIndex) ??
        readLiveWorksheetFormula(worksheet, rowIndex, colIndex)
      if (!formula) continue
      if (!nextValue) nextValue = { ...cellValue }
      const nextRow = { ...(nextValue[rowIndex] ?? {}) } as Record<number, unknown>
      let merged: Record<string, unknown>
      if (entry && typeof entry === 'object') {
        merged = { ...(entry as Record<string, unknown>), f: formula }
      } else if (entry === undefined) {
        merged = { f: formula }
      } else {
        merged = { v: entry, f: formula }
      }
      nextRow[colIndex] = merged as unknown
      nextValue[rowIndex] = nextRow as Record<number, unknown>
    }
  }
  return nextValue ?? cellValue
}

export function deriveCellMatrixFromRanges(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  ranges: SheetRangeShape[],
  maxCells = 10000,
  preserveUndefinedAsNull = false
): SheetCellMatrix | undefined {
  const derived: SheetCellMatrix = {}
  let visited = 0

  const limitReached = () => visited > maxCells
  const addCellValue = (row: number, col: number) => {
    visited += 1
    if (limitReached()) return
    if (preserveUndefinedAsNull) {
      if (!derived[row]) derived[row] = {}
      derived[row][col] = null
      return
    }
    const value = readWorksheetCellValue(worksheet, row, col)
    if (value === undefined) return
    if (!derived[row]) derived[row] = {}
    derived[row][col] = value
  }

  for (const range of ranges) {
    for (let r = range.startRow; r <= range.endRow && !limitReached(); r++) {
      for (let c = range.startColumn; c <= range.endColumn && !limitReached(); c++) {
        addCellValue(r, c)
      }
    }
    if (limitReached()) {
      break
    }
  }
  return Object.keys(derived).length > 0 ? derived : undefined
}

function getNewRowIndices(cellValue: SheetCellMatrix, ctx: ConversionContext, rowOffset: number): number[] {
  return Object.keys(cellValue)
    .map(k => Number(k))
    .filter(ri => !Number.isNaN(ri) && ctx.rowIndexToId.get(ri + rowOffset) === undefined)
    .sort((a, b) => a - b)
}

function buildNewRowsFromCellMatrix(params: {
  newRowIndices: number[]
  cellValue: SheetCellMatrix
  ctx: ConversionContext
  colOffset: number
  rowOffset: number
  getClientRowId: (globalRowIndex: number) => string
}): Record<string, unknown>[] {
  const { newRowIndices, cellValue, ctx, colOffset, rowOffset, getClientRowId } = params
  return newRowIndices.map(rowIndex => {
    const rowCells = cellValue[rowIndex]
    const globalRowIndex = rowIndex + rowOffset
    const row: Record<string, unknown> = {
      _id: getClientRowId(globalRowIndex),
      // Preserve the user's visual grid row so snapshot/bootstrap can keep sparse
      // empty rows above newly-created rows instead of compacting them upward.
      _gridRowIndex: globalRowIndex
    }
    if (!rowCells || typeof rowCells !== 'object') return row

    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const columnName =
        ctx.columnIndexToName.get(colIndex + colOffset) ?? ctx.columnIndexToId.get(colIndex + colOffset)
      if (columnName === undefined) continue
      const cell = rowCells[colIndex]
      row[columnName] = cell ?? { v: '' }
    }
    return row
  })
}

/**
 * Extract changed cells from a Univer value-change event.
 *
 * Returns univerRow/univerCol alongside the logical rowId/columnName. The Univer grid indices
 * are the sender's actual visual position and get transmitted as an A1 cellRef in the collaboration
 * operation. The receiver uses this cellRef to update the correct Univer cell, avoiding a bug where
 * data-array-index-based resolution wrote to the wrong row after row additions/deletions caused
 * the data array and Univer grid to drift out of sync.
 */
/** Univer may emit `{ s: ... }` style-only cell payloads; those must not become row-model writes. */
function isPersistableCellDataMutationValue(value: unknown): boolean {
  if (value === undefined) return false
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  return 'v' in o || 'f' in o || 'm' in o || 'ct' in o
}

/** Includes style-only `{ s }` mutations so collaboration can broadcast formatting without row persistence. */
function isCollabWireCellMutationValue(value: unknown): boolean {
  if (isPersistableCellDataMutationValue(value)) return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return 's' in (value as object)
}

function collectCollabWireEntries(params: {
  cellValue: SheetCellMatrix
  ctx: ConversionContext
  rowOffset: number
  colOffset: number
  shouldSuppress?: (rowIndex: number, colIndex: number, value: unknown) => boolean
}): Array<{ rowId: string; columnName: string; univerRow: number; univerCol: number }> {
  const { cellValue, ctx, rowOffset, colOffset, shouldSuppress } = params
  const out: Array<{ rowId: string; columnName: string; univerRow: number; univerCol: number }> = []
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    const globalRowIndex = rowIndex + rowOffset
    const rowId = ctx.rowIndexToId.get(globalRowIndex)
    if (rowId === undefined) continue

    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const globalColIndex = colIndex + colOffset
      const columnName = ctx.columnIndexToName.get(globalColIndex) ?? ctx.columnIndexToId.get(globalColIndex)
      if (columnName === undefined) continue
      const cell = rowCells[colIndex]
      if (!isCollabWireCellMutationValue(cell)) continue
      if (shouldSuppress?.(globalRowIndex, globalColIndex, cell) === true) continue
      out.push({ rowId, columnName, univerRow: globalRowIndex, univerCol: globalColIndex })
    }
  }
  return out
}

function extractWorkbookStylesFromSnapshot(snapshot: Record<string, unknown> | null): Record<string, unknown> {
  if (!snapshot?.styles || typeof snapshot.styles !== 'object' || Array.isArray(snapshot.styles)) return {}
  return snapshot.styles as Record<string, unknown>
}

function buildCollabCellsChangedPayload(params: {
  sheetId: string
  entries: Array<{ rowId: string; columnName: string; univerRow: number; univerCol: number }>
  workbookSnapshot: Record<string, unknown> | null
  facadeWorkbook: {
    getActiveSheet?: () => {
      getRange?: (row: number, col: number) => { getCellData?: () => unknown }
    }
  } | null
}): CellsChangedCell[] {
  const { entries, workbookSnapshot, facadeWorkbook } = params
  const stylesMap = extractWorkbookStylesFromSnapshot(workbookSnapshot)
  const fSheet = facadeWorkbook?.getActiveSheet?.()
  if (!fSheet || typeof fSheet.getRange !== 'function') return []

  const wire: CellsChangedCell[] = []
  for (const entry of entries) {
    let cellData: Record<string, unknown> | null = null
    try {
      const raw = fSheet.getRange(entry.univerRow, entry.univerCol)?.getCellData?.()
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        cellData = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
      }
    } catch {
      cellData = null
    }
    if (!cellData || Object.keys(cellData).length === 0) continue

    // Values are persisted via HTTP batch and rebroadcast authoritatively by the server
    // (`batch_operations` → `set_cell`/`set_range`/`clear_cell`). This channel is now
    // style-only: strip value keys so we never conflict with the authoritative value path.
    for (const k of UNIVER_CELL_VALUE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(cellData, k)) {
        delete (cellData as Record<string, unknown>)[k]
      }
    }
    if (Object.keys(cellData).length === 0) continue

    const styleKey = typeof cellData.s === 'string' && cellData.s.length > 0 ? cellData.s : null
    const styleDef = styleKey ? stylesMap[styleKey] : undefined
    const univerStyles =
      styleKey && styleDef && typeof styleDef === 'object' ? { [styleKey]: styleDef as unknown } : undefined

    const trimmedRef = toA1Reference(entry.univerRow, entry.univerCol).trim()
    const base: CellsChangedCell = {
      rowId: entry.rowId,
      column: entry.columnName,
      cellRef: trimmedRef || undefined,
      univerCell: cellData,
      ...(univerStyles ? { univerStyles: univerStyles as Record<string, unknown> } : {})
    }

    wire.push(base)
  }

  return wire
}

function buildCollabWireSignature(
  entries: Array<{ rowId: string; columnName: string; univerRow: number; univerCol: number }>,
  cellValue: SheetCellMatrix
): string {
  // IMPORTANT: include the actual cell payload (style/value signature) so rapid successive
  // style changes on the same cell (e.g. bold then italic within the 1500ms dedup window)
  // don't collapse to a single signature and suppress the second emit. Without this, only
  // the first change would broadcast and peer tabs would miss subsequent updates.
  return entries
    .map(e => {
      const cell = cellValue?.[e.univerRow]?.[e.univerCol]
      const contentSig = normalizeBlankLikeEchoSignature(toEchoSignature(cell))
      return `${e.rowId}\t${e.columnName}\t${e.univerRow}\t${e.univerCol}\t${contentSig}`
    })
    .join('|')
}

function collectChangedCells(params: {
  cellValue: SheetCellMatrix
  ctx: ConversionContext
  rowOffset: number
  colOffset: number
  shouldSuppress?: (rowIndex: number, colIndex: number, value: unknown) => boolean
}): Array<{ rowId: string; columnName: string; value: unknown; univerRow: number; univerCol: number }> {
  const { cellValue, ctx, rowOffset, colOffset, shouldSuppress } = params
  const changedCells: Array<{
    rowId: string
    columnName: string
    value: unknown
    univerRow: number
    univerCol: number
  }> = []
  const normalizeChangedCellValue = (value: unknown): unknown =>
    value === undefined ? undefined : normalizeValueForEchoSignature(value)
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    const globalRowIndex = rowIndex + rowOffset
    const rowId = ctx.rowIndexToId.get(globalRowIndex)
    if (rowId === undefined) continue

    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const globalColIndex = colIndex + colOffset
      const columnName = ctx.columnIndexToName.get(globalColIndex) ?? ctx.columnIndexToId.get(globalColIndex)
      if (columnName === undefined) continue
      const cell = rowCells[colIndex]
      if (!isPersistableCellDataMutationValue(cell)) continue
      if (shouldSuppress?.(globalRowIndex, globalColIndex, cell) === true) continue
      changedCells.push({
        rowId,
        columnName,
        value: normalizeChangedCellValue(cell),
        univerRow: globalRowIndex,
        univerCol: globalColIndex
      })
    }
  }
  return changedCells
}

export type WorkbookSnapshotLifecycleEvent =
  | { phase: 'checkpoint_scheduled' }
  | { phase: 'checkpoint_settled'; ok: boolean }

export interface UniverSheetGridProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  initialSnapshot?: Record<string, unknown> | null
  snapshotSeed?: string
  authoritativeDataSyncToken?: number
  workbookRemountKey?: string
  multiSheetWorkbookMode?: boolean
  onActiveWorksheetChange?: (sheetId: string, sheetName: string) => void
  /**
   * Multi-sheet context resolver. In `multiSheetWorkbookMode`, cell mutations
   * can target any worksheet Univer holds in memory, not just `props.sheet`.
   * When Univer reports a change on sheet X, this resolver tells us which
   * columns and rows to use to build the conversion context (rowIndex → rowId
   * mapping, column index → columnName, etc.) so we emit the right delta.
   *
   * Should return `null` for unknown sheet ids; the grid will fall back to the
   * single-sheet `sheet`/`data`/`columns` props in that case.
   */
  getSheetContext?: (sheetId: string) => {
    columns: SpreadsheetColumn[]
    data: Record<string, unknown>[]
  } | null
  /**
   * Fires after Univer inserts a worksheet via its native sheet-bar (+ button,
   * insertSheet/ InsertSheetCommand). The host should persist a matching backend
   * SpreadsheetSheet with the same id so /operations/batch and future snapshots
   * stay in sync.
   */
  onUniverSheetInserted?: (payload: { sheetId: string; sheetName: string; index: number }) => void
  /** Fires after Univer removes a worksheet via its native sheet-bar. */
  onUniverSheetRemoved?: (payload: { sheetId: string }) => void
  /** Fires after Univer renames a worksheet (SetWorksheetNameCommand). */
  onUniverSheetRenamed?: (payload: { sheetId: string; sheetName: string }) => void
  columns: SpreadsheetColumn[]
  isReadOnly: boolean
  onCellChange: (rowId: string, columnId: string, value: unknown, sheetId?: string) => void
  onCellsChange?: (cells: Array<{ rowId: string; columnName: string; value: unknown; sheetId?: string }>) => void
  onSnapshotRequested?: () => Promise<void> | void
  /** Fires when a throttled Univer workbook snapshot is scheduled or when the snapshot request finishes (success or failure). */
  onWorkbookSnapshotLifecycle?: (event: WorkbookSnapshotLifecycleEvent) => void
  onDataChange: (data: Record<string, unknown>[], sheetId?: string) => void
  onOpenCommentRequest?: () => void
  commentedCells?: Array<{
    cellReference: string
    content: string
    createdByName?: string
    createdByAvatar?: string
    createdAt?: string
  }>
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  onFormulaEvaluated?: (rowId: string, columnId: string, result: unknown) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  onCursorEmit?: (position: { path: string[] }) => void
  collaborationEnabled?: boolean
  onDimensionsChange?: (payload: CellDimensionsPayload) => void
  height?: string | number
  width?: string | number
}

export interface CellDimensionsPayload {
  sheetId: string
  defaultColWidth: number
  defaultRowHeight: number
  columnData: Record<string | number, { w?: number }>
  rowData: Record<string | number, { h?: number }>
  rowHeaderWidth: number
  columnHeaderHeight: number
  zoomRatio: number
}

/** When set from live collab with a sender `cellRef`, row index must not be replaced by `rowIdToIndex`. */
export type ApplyRemoteCellUpdateOptions = {
  useSenderA1Row?: boolean
  /** Full Univer cell payload (preferred over scalar `value` when present). */
  univerCell?: Record<string, unknown> | null
  /** Style definitions to register before applying a cell that references them by id. */
  univerStyles?: Record<string, unknown> | null
}

export interface UniverSheetGridHandle {
  applyRemoteCellUpdate: (
    rowIndex: number,
    colIndex: number,
    value: unknown,
    rowId?: string,
    options?: ApplyRemoteCellUpdateOptions
  ) => void
  forceAuthoritativeReapply: () => void
  getWorkbookSnapshot: () => Record<string, unknown> | null
  getVisibleRangeValues: (rowCount: number, colCount: number) => Record<number, Record<number, unknown>> | null
  applyRemoteDimensions: (payload: CellDimensionsPayload) => void
  getActiveCellReference: () => string | null
  requestSnapshotCheckpoint: (force?: boolean) => void
}

function toA1Reference(row: number, col: number): string {
  if (row < 0 || col < 0) return ''
  let column = col
  let letters = ''
  while (column >= 0) {
    letters = String.fromCharCode((column % 26) + 65) + letters
    column = Math.floor(column / 26) - 1
  }
  return `${letters}${row + 1}`
}

function formatCommentTime(value?: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString()
}

function getInitials(name?: string): string {
  const n = (name || '').trim()
  if (!n) return 'U'
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || 'U'
}

const COMMENT_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'

const CONTEXT_MENU_ANCHOR_LABELS = ['Copy Special', 'Paste Special', 'Clear', 'Insert', 'Delete', 'Freeze', 'Protect']

/** True for inputs the browser should handle (copy/paste) outside the grid container. */
function isDomTextEditingTarget(target: unknown): boolean {
  if (!(target instanceof Element)) return false
  const el = target
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((el as HTMLElement).isContentEditable) return true
  const role = el.getAttribute('role')
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

function distanceToRect(x: number, y: number, rect: DOMRect): number {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0
  return Math.hypot(dx, dy)
}

function getOrCreateClientRowId(globalRowIndex: number, idMap: Map<number, string>): string {
  let clientRowId = idMap.get(globalRowIndex)
  if (clientRowId) return clientRowId
  try {
    clientRowId = `client_${crypto.randomUUID()}`
  } catch {
    clientRowId = `client_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
  idMap.set(globalRowIndex, clientRowId)
  return clientRowId
}

interface SnapshotDimensions {
  defaultColWidth: number
  defaultRowHeight: number
  columnData: Record<string | number, { w?: number }>
  rowData: Record<string | number, { h?: number }>
  rowHeaderWidth: number
  columnHeaderHeight: number
  zoomRatio: number
}

type ActiveSelectionPosition = {
  sheetId: string
  row: number
  col: number
}

function areDimensionMapsEqual(
  a: Record<string | number, { w?: number; h?: number }>,
  b: Record<string | number, { w?: number; h?: number }>,
  key: 'w' | 'h'
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const entryKey of aKeys) {
    if (!(entryKey in b)) return false
    const aValue = a[entryKey]?.[key]
    const bValue = b[entryKey]?.[key]
    if ((aValue ?? null) !== (bValue ?? null)) return false
  }
  return true
}

function areSnapshotDimensionsEqual(a: SnapshotDimensions | null, b: SnapshotDimensions | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.defaultColWidth === b.defaultColWidth &&
    a.defaultRowHeight === b.defaultRowHeight &&
    a.rowHeaderWidth === b.rowHeaderWidth &&
    a.columnHeaderHeight === b.columnHeaderHeight &&
    a.zoomRatio === b.zoomRatio &&
    areDimensionMapsEqual(a.columnData, b.columnData, 'w') &&
    areDimensionMapsEqual(a.rowData, b.rowData, 'h')
  )
}

function extractDimensionsFromSnapshot(snap: Record<string, unknown>): SnapshotDimensions | null {
  const sheetOrder = snap?.sheetOrder as string[] | undefined
  const sheets = snap?.sheets as Record<string, Record<string, unknown>> | undefined
  const firstSheetId = sheetOrder?.[0]
  let sheetSnap: Record<string, unknown> | undefined
  if (firstSheetId && sheets) {
    sheetSnap = sheets[firstSheetId]
  } else if (sheets) {
    sheetSnap = Object.values(sheets)[0]
  }
  if (!sheetSnap) return null
  const rawCol = sheetSnap.columnData as Record<string | number, { w?: number }> | undefined
  const rawRow = sheetSnap.rowData as Record<string | number, { h?: number }> | undefined
  const rowHeader = sheetSnap.rowHeader as { width?: number } | undefined
  const columnHeader = sheetSnap.columnHeader as { height?: number } | undefined
  const zoomRatio = (sheetSnap.zoomRatio as number | undefined) ?? 1
  return {
    defaultColWidth: (sheetSnap.defaultColumnWidth as number | undefined) ?? CURSOR_OVERLAY_COL_WIDTH_PX,
    defaultRowHeight: (sheetSnap.defaultRowHeight as number | undefined) ?? CURSOR_OVERLAY_ROW_HEIGHT_PX,
    columnData: rawCol ?? {},
    rowData: rawRow ?? {},
    rowHeaderWidth: rowHeader?.width ?? CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX,
    columnHeaderHeight: columnHeader?.height ?? CURSOR_OVERLAY_HEADER_HEIGHT_PX,
    zoomRatio
  }
}

function extractActiveRangePosition(workbook: unknown): { row: number; col: number } | null {
  const activeRange =
    (workbook as { getActiveRange?: () => unknown } | null | undefined)?.getActiveRange?.() ??
    (workbook as { getActiveSheet?: () => { getActiveRange?: () => unknown } } | null | undefined)
      ?.getActiveSheet?.()
      ?.getActiveRange?.()
  if (!activeRange) return null
  const rangeRecord = activeRange as {
    getRow?: () => number
    getColumn?: () => number
    getRange?: () => { startRow?: number; startColumn?: number }
    startRow?: number
    startColumn?: number
    row?: number
    column?: number
  }
  const nestedRange = rangeRecord.getRange?.()
  const row = rangeRecord.getRow?.() ?? nestedRange?.startRow ?? rangeRecord.startRow ?? rangeRecord.row
  const col = rangeRecord.getColumn?.() ?? nestedRange?.startColumn ?? rangeRecord.startColumn ?? rangeRecord.column
  if (typeof row !== 'number' || typeof col !== 'number') return null
  return { row, col }
}

function areCursorRectsEqual(
  a: Record<string, { top: number; left: number; width: number; height: number }>,
  b: Record<string, { top: number; left: number; width: number; height: number }>
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    const ra = a[key]
    const rb = b[key]
    if (!rb) return false
    if (
      Math.abs(ra.top - rb.top) > 0.5 ||
      Math.abs(ra.left - rb.left) > 0.5 ||
      Math.abs(ra.width - rb.width) > 0.5 ||
      Math.abs(ra.height - rb.height) > 0.5
    ) {
      return false
    }
  }
  return true
}

function createContextMenuItem(
  template: HTMLElement,
  markerAttr: string,
  className: string,
  label: string,
  onClick: () => void
): HTMLElement {
  const item = template.cloneNode(true) as HTMLElement
  item.setAttribute(markerAttr, 'true')
  item.classList.add(className)
  item.querySelectorAll('[aria-haspopup="true"]').forEach(node => node.removeAttribute('aria-haspopup'))
  item.innerHTML = ''
  item.classList.remove('univer-justify-between')
  item.classList.add('univer-flex', 'univer-items-center', 'univer-gap-3', 'univer-justify-start', 'univer-text-sm')
  item.style.justifyContent = 'flex-start'
  const iconWrap = document.createElement('span')
  iconWrap.className =
    'univer-text-base univer-flex univer-flex-shrink-0 univer-items-center univer-justify-center univer-h-6 univer-min-w-6'
  iconWrap.style.color = 'var(--univer-primary-600, #2563eb)'
  iconWrap.innerHTML = COMMENT_ICON_SVG
  const labelEl = document.createElement('span')
  labelEl.className =
    'univer-flex-1 univer-min-w-0 univer-max-w-full univer-break-words univer-text-left univer-text-sm univer-leading-4'
  labelEl.textContent = label
  labelEl.style.whiteSpace = 'nowrap'
  labelEl.style.wordBreak = 'normal'
  labelEl.style.overflowWrap = 'normal'
  labelEl.style.fontFamily = 'inherit'
  labelEl.style.fontSize = 'inherit'
  labelEl.style.fontWeight = 'inherit'
  item.appendChild(iconWrap)
  item.appendChild(labelEl)
  item.style.whiteSpace = 'nowrap'
  item.style.wordBreak = 'normal'
  item.style.overflowWrap = 'normal'
  item.addEventListener('click', onClick)
  return item
}

function tryInjectViaMenuGroupList(markerAttr: string, createItem: (template: HTMLElement) => HTMLElement): boolean {
  const listSelectors = '.univer-menu-item-group-list, .rc-menu-item-group-list, [class*="menu-item-group-list"]'
  const univerLists = Array.from(document.querySelectorAll<HTMLElement>(listSelectors)).filter(
    list => !list.querySelector(`[${markerAttr}]`)
  )
  for (const list of univerLists) {
    const items = list.querySelectorAll<HTMLElement>('.univer-menu-item, li, [role="menuitem"]')
    const firstItem = items[0]
    if (!firstItem) continue
    const listText = (list.textContent || '').toLowerCase()
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => listText.includes(lbl.toLowerCase()))) continue
    const item = createItem(firstItem)
    if (document.querySelector(`[${markerAttr}]`)) return true
    list.prepend(item)
    return true
  }
  return false
}

function findGridInsertParent(grid: HTMLElement): HTMLElement {
  const firstChild = grid.firstElementChild as HTMLElement | null
  if (!firstChild) return grid
  const firstText = (firstChild.textContent || '').toLowerCase()
  const firstIsIconRow =
    firstText.includes('copy') && !firstText.includes('copy special') && !firstText.includes('insert')
  if (!firstIsIconRow) return grid
  for (let sib = firstChild.nextElementSibling; sib; sib = sib.nextElementSibling) {
    const sibText = ((sib as HTMLElement).textContent || '').toLowerCase()
    if (CONTEXT_MENU_ANCHOR_LABELS.some(lbl => sibText.includes(lbl.toLowerCase()))) {
      return sib as HTMLElement
    }
  }
  return grid
}

function tryInjectViaGridContainer(markerAttr: string, createItem: (template: HTMLElement) => HTMLElement): boolean {
  const gridContainers = Array.from(
    document.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')
  ).filter(el => {
    if (el.querySelector(`[${markerAttr}]`)) return false
    const gridText = (el.textContent || '').toLowerCase()
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => gridText.includes(lbl.toLowerCase()))) return false
    if (gridText.includes('copy') && !gridText.includes('copy special') && !gridText.includes('insert')) return false
    const childGrids = el.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')
    for (const child of childGrids) {
      if (child === el) continue
      const childText = (child.textContent || '').toLowerCase()
      if (CONTEXT_MENU_ANCHOR_LABELS.some(lbl => childText.includes(lbl.toLowerCase()))) return false
    }
    return true
  })
  for (const grid of gridContainers) {
    const insertParent = findGridInsertParent(grid)
    const template = insertParent.querySelector<HTMLElement>(
      'button, [role="button"], .univer-menu-item, [class*="menu-item"]'
    )
    if (!template) continue
    if (document.querySelector(`[${markerAttr}]`)) return true
    const item = createItem(template)
    insertParent.prepend(item)
    return true
  }
  return false
}

function findMenuItemCandidate(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el
  for (let d = 0; d < 6 && current; d++) {
    const cls = (current.getAttribute('class') || '').toLowerCase()
    const role = current.getAttribute('role')
    const tag = current.tagName.toLowerCase()
    if (role === 'menuitem' || cls.includes('menu-item') || tag === 'li' || tag === 'button') {
      return current
    }
    current = current.parentElement
  }
  return null
}

function tryInjectViaTextSearch(
  anchorX: number,
  anchorY: number,
  markerAttr: string,
  createItem: (template: HTMLElement) => HTMLElement
): boolean {
  const allElements = Array.from(document.querySelectorAll<HTMLElement>('body *'))
  const anchorCandidates: HTMLElement[] = []
  for (const el of allElements) {
    const text = (el.textContent || '').trim()
    if (!text) continue
    if (el.closest('[style*="display: none"]') || el.closest('.rc-menu-hidden')) continue
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => text.includes(lbl))) continue
    const candidate = findMenuItemCandidate(el)
    if (candidate) anchorCandidates.push(candidate)
  }
  if (anchorCandidates.length === 0) return false
  const closest = anchorCandidates
    .map(el => ({ el, dist: distanceToRect(anchorX, anchorY, el.getBoundingClientRect()) }))
    .sort((a, b) => a.dist - b.dist)[0]?.el
  if (!closest) return false
  const parent = closest.parentElement
  if (!parent || parent.querySelector(`[${markerAttr}]`)) return true
  const item = createItem(closest)
  if (document.querySelector(`[${markerAttr}]`)) return true
  closest.before(item)
  return true
}

function tryInjectContextMenuItem(
  anchorX: number,
  anchorY: number,
  markerAttr: string,
  createItem: (template: HTMLElement) => HTMLElement
): boolean {
  if (document.querySelector(`[${markerAttr}]`)) return true
  return (
    tryInjectViaMenuGroupList(markerAttr, createItem) ||
    tryInjectViaGridContainer(markerAttr, createItem) ||
    tryInjectViaTextSearch(anchorX, anchorY, markerAttr, createItem)
  )
}

/**
 * Hides the "Protect Rows And Columns" item from Univer's context menu.
 * The feature is not supported in this app; leaving it visible confuses users.
 * Walks all nested grids/sections to find the leaf item, not a parent container.
 */
function hideProtectContextMenuItem(): void {
  if (typeof document === 'undefined') return
  const candidates = document.querySelectorAll<HTMLElement>(
    'button, [role="button"], [role="menuitem"], .univer-menu-item, [class*="menu-item"], [class*="univer-h-8"]'
  )
  for (const el of candidates) {
    if (el.style.display === 'none') continue
    const spans = el.querySelectorAll('span')
    for (const span of spans) {
      if (span.children.length > 0) continue
      const text = (span.textContent || '').trim()
      if (/^protect/i.test(text)) {
        el.style.display = 'none'
        break
      }
    }
  }
}

const HIDDEN_RIBBON_TABS = ['data', 'daten']

/**
 * Hides unwanted tabs from Univer's ribbon dropdown.
 * Walks text nodes to find the tab title, then hides the closest clickable ancestor.
 */
function hideUnwantedRibbonTabs(): void {
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

function scheduleContextMenuInjectionPoll(run: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      globalThis.setTimeout(run, 0)
    })
  })
}

/**
 * Apply German number-format locale on the active workbook.
 * Returns false if skipped or failed (caller may retry after Univer injector is ready).
 */
function applyGermanNumfmtLocale(workbook: unknown, opts?: { silent?: boolean }): boolean {
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
function scheduleApplyGermanNumfmtLocale(univerAPI: { getActiveWorkbook?: () => unknown }): void {
  const tryApply = (): boolean => {
    const wb = univerAPI.getActiveWorkbook?.()
    return Boolean(wb && applyGermanNumfmtLocale(wb, { silent: true }))
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (tryApply()) return
      globalThis.setTimeout(() => {
        if (tryApply()) return
        globalThis.setTimeout(() => {
          tryApply()
        }, 150)
      }, 0)
    })
  })
}

function normalizeMenuText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function extractFormatMenuLabel(text: string): string | null {
  const normalized = normalizeMenuText(text)
  const previewMap = getNumfmtPreviewMap()
  const labels = Object.keys(previewMap).sort((a, b) => b.length - a.length)
  for (const label of labels) {
    if (normalized === label || normalized.startsWith(`${label} `)) return label
  }
  return null
}

export function getGermanNumfmtPattern(label: string): string | undefined {
  return getNumfmtPatternMap()[label]
}

/**
 * Locates the number-format dropdown list container using the same grid heuristic as
 * `tryInjectViaGridContainer`, but keyed on format-menu anchors and excluding cell context menus.
 */
function findNumfmtFormatMenuGrids(): HTMLElement[] {
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

function patchGermanNumfmtMenuPreview(): void {
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
const CHINESE_DATE_LABEL_REPLACEMENTS: Record<string, Record<string, string>> = {
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

const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/

/**
 * Gravity Platform hosts remote apps in a pane that uses plain Tailwind (`overflow-auto`, no `gba:`).
 * That outer pane scrolls the whole embedded UI so Univer's sheet-tab footer scrolls away.
 * Also, a `min-h-dvh` / oversized viewer can exceed the pane height while the shell still scrolls.
 * Patch: stop outer vertical scrolling and size the spreadsheet viewer root to the pane height.
 */
function patchEmbeddedSpreadsheetHostLayout(gridHost: HTMLElement): (() => void) | undefined {
  if (typeof document === 'undefined') return undefined

  let el: HTMLElement | null = gridHost.parentElement
  let scrollShell: HTMLElement | null = null
  while (el && el !== document.body) {
    const st = getComputedStyle(el)
    const cls = typeof el.className === 'string' ? el.className : ''
    const isGbaWrapper = cls.includes('gba:')
    const overflowsVertically =
      (st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1
    if (overflowsVertically && !isGbaWrapper) {
      scrollShell = el
      break
    }
    el = el.parentElement
  }

  if (!scrollShell) return undefined

  const prevShellOverflow = scrollShell.style.overflow
  const prevShellMinHeight = scrollShell.style.minHeight
  scrollShell.style.overflow = 'hidden'
  if (!scrollShell.style.minHeight) {
    scrollShell.style.minHeight = '0'
  }

  const viewerRoot = gridHost.closest<HTMLElement>('[data-testid="spreadsheet-app-viewer"], [data-testid$="-viewer"]')

  let restoreViewer: (() => void) | undefined
  if (viewerRoot && scrollShell.contains(viewerRoot)) {
    const slotHeight = scrollShell.clientHeight
    if (slotHeight > 0) {
      viewerRoot.style.setProperty('max-height', `${slotHeight}px`, 'important')
      viewerRoot.style.setProperty('height', `${slotHeight}px`, 'important')
      viewerRoot.style.setProperty('min-height', '0', 'important')
      restoreViewer = () => {
        viewerRoot.style.removeProperty('max-height')
        viewerRoot.style.removeProperty('height')
        viewerRoot.style.removeProperty('min-height')
      }
    }
  }

  return () => {
    scrollShell.style.overflow = prevShellOverflow
    scrollShell.style.minHeight = prevShellMinHeight
    if (!prevShellOverflow) scrollShell.style.removeProperty('overflow')
    if (!prevShellMinHeight) scrollShell.style.removeProperty('min-height')
    restoreViewer?.()
  }
}

function patchChineseDateLabels(): void {
  if (typeof document === 'undefined') return
  const replacements = CHINESE_DATE_LABEL_REPLACEMENTS[activeAppLocale] ?? CHINESE_DATE_LABEL_REPLACEMENTS['en-US']
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

export const UniverSheetGrid = forwardRef<UniverSheetGridHandle, UniverSheetGridProps>(
  function UniverSheetGrid(props, ref) {
    const { t, locale: appLocale } = useTranslation(spreadsheetTranslations)
    activeAppLocale = appLocale

    const {
      sheet,
      data,
      columns,
      initialSnapshot,
      onCellChange,
      onCellsChange,
      onSnapshotRequested,
      onDataChange,
      onCursorEmit
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    /** Host element must be in state so the Univer bootstrap effect re-runs after the ref attaches (avoids one-shot `if (!containerRef.current) return` with no re-subscribe). */
    const [gridHostEl, setGridHostEl] = useState<HTMLDivElement | null>(null)
    // If a persisted snapshot initializes to a blank sheet (no canvas), retry once with a row-built snapshot.
    const [forceRowSnapshotSeed, setForceRowSnapshotSeed] = useState(0)
    const [authoritativeReapplySeed, setAuthoritativeReapplySeed] = useState(0)
    const setGridHostRef = useCallback((node: HTMLDivElement | null) => {
      containerRef.current = node
      setGridHostEl(node)
    }, [])

    useLayoutEffect(() => {
      if (!gridHostEl) return undefined
      let cleanup: (() => void) | undefined
      const run = () => {
        if (!gridHostEl.isConnected) return
        cleanup?.()
        cleanup = patchEmbeddedSpreadsheetHostLayout(gridHostEl)
      }
      run()
      const t0 = window.setTimeout(run, 0)
      const t1 = window.setTimeout(run, 100)
      const raf = window.requestAnimationFrame(run)
      return () => {
        window.clearTimeout(t0)
        window.clearTimeout(t1)
        window.cancelAnimationFrame(raf)
        cleanup?.()
      }
    }, [gridHostEl])

    // Tracks whether this sheet is the currently active editor on the page.
    // Needed for published screens where the host app may register global shortcuts (e.g. Cmd+B).
    const isSheetInteractionActiveRef = useRef<boolean>(false)
    const univerAPIRef = useRef<ReturnType<typeof createUniver>['univerAPI'] | null>(null)
    const remoteEchoSuppressionRef = useRef<Map<string, RemoteEchoSuppressionEntry>>(new Map())
    const isApplyingRemoteUpdateRef = useRef(false)
    const isDirtyRef = useRef(false)
    const hasEditedRef = useRef(false)
    const lastCellValueMutationAtRef = useRef(0)
    const snapshotRequestInFlightRef = useRef<Promise<void> | null>(null)
    const snapshotRequestQueuedRef = useRef(false)
    const snapshotCheckpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const snapshotCheckpointScheduledAtRef = useRef<number | null>(null)
    const snapshotFirstDirtyAtRef = useRef<number | null>(null)
    const snapshotLastRequestedAtRef = useRef<number>(0)
    const requestSnapshotCheckpointRef = useRef<((force?: boolean) => void) | null>(null)
    const scheduleSnapshotCheckpointRef = useRef<((delayMs?: number) => void) | null>(null)
    const lastSyncedGridCellSignaturesRef = useRef<Map<string, string>>(new Map())
    const lastSyncedGridRowCountRef = useRef(0)
    const lastSyncedGridColumnCountRef = useRef(0)
    const lastProcessedAuthoritativeDataSyncTokenRef = useRef<number>(props.authoritativeDataSyncToken ?? 0)
    const lastProcessedAuthoritativeReapplySeedRef = useRef(0)
    const skipNextAuthoritativeSyncAfterSnapshotInitRef = useRef(false)
    const newRowClientIdByIndexRef = useRef<Map<number, string>>(new Map())
    const recentLocalMutationSignaturesRef = useRef<Map<string, number>>(new Map())
    const recentLocallyMutatedGridCellsRef = useRef<Map<string, number>>(new Map())
    const activeSelectionRef = useRef<ActiveSelectionPosition | null>(null)
    const copiedSelectionAnchorRef = useRef<(ActiveSelectionPosition & { copiedAt: number }) | null>(null)
    const contextRef = useRef<ReturnType<typeof createUniverConversionContext> | null>(null)
    const propsRef = useRef({
      sheet,
      data,
      columns,
      initialSnapshot,
      collaborationEnabled: props.collaborationEnabled ?? false,
      onOperationEmit: props.onOperationEmit,
      getSheetContext: props.getSheetContext,
      multiSheetWorkbookMode: props.multiSheetWorkbookMode ?? false
    })
    propsRef.current = {
      sheet,
      data,
      columns,
      initialSnapshot,
      collaborationEnabled: props.collaborationEnabled ?? false,
      onOperationEmit: props.onOperationEmit,
      getSheetContext: props.getSheetContext,
      multiSheetWorkbookMode: props.multiSheetWorkbookMode ?? false
    }
    const callbacksRef = useRef({
      onCellChange,
      onCellsChange,
      onSnapshotRequested,
      onWorkbookSnapshotLifecycle: props.onWorkbookSnapshotLifecycle,
      onDataChange,
      onCursorEmit,
      onOperationEmit: props.onOperationEmit,
      onDimensionsChange: props.onDimensionsChange,
      onOpenCommentRequest: props.onOpenCommentRequest,
      onActiveWorksheetChange: props.onActiveWorksheetChange,
      onUniverSheetInserted: props.onUniverSheetInserted,
      onUniverSheetRemoved: props.onUniverSheetRemoved,
      onUniverSheetRenamed: props.onUniverSheetRenamed
    })
    callbacksRef.current = {
      onCellChange,
      onCellsChange,
      onSnapshotRequested,
      onWorkbookSnapshotLifecycle: props.onWorkbookSnapshotLifecycle,
      onDataChange,
      onCursorEmit,
      onOperationEmit: props.onOperationEmit,
      onDimensionsChange: props.onDimensionsChange,
      onOpenCommentRequest: props.onOpenCommentRequest,
      onActiveWorksheetChange: props.onActiveWorksheetChange,
      onUniverSheetInserted: props.onUniverSheetInserted,
      onUniverSheetRemoved: props.onUniverSheetRemoved,
      onUniverSheetRenamed: props.onUniverSheetRenamed
    }
    const readOnlyRef = useRef(props.isReadOnly)
    readOnlyRef.current = props.isReadOnly
    const lastEmittedCursorPathRef = useRef<string>('')
    const pendingInitialCursorPathRef = useRef<string>('')
    const lastEmittedWorksheetIdRef = useRef<string>('')
    // Univer fires insert-sheet / set-worksheet-name mutations while the workbook
    // is bootstrapping (Univer seeds the initial worksheets through the same
    // command pipeline). Ignore those until the initial paint settles; otherwise
    // we would try to "create" the exact sheets we just loaded.
    const univerBootstrapCompleteRef = useRef<boolean>(false)
    const recentSheetMutationIdsRef = useRef<Set<string>>(new Set())
    // Caches actual column widths and row heights read from the workbook snapshot so that
    // cursor overlays match the real rendered cell dimensions (not hardcoded constants).
    const cellDimensionsRef = useRef<{
      defaultColWidth: number
      defaultRowHeight: number
      columnData: Record<string | number, { w?: number }>
      rowData: Record<string | number, { h?: number }>
      rowHeaderWidth: number
      columnHeaderHeight: number
      zoomRatio: number
    } | null>(null)
    // Tracks viewport scroll used by Univer canvas rendering.
    const sheetScrollRef = useRef<{ scrollLeft: number; scrollTop: number }>({ scrollLeft: 0, scrollTop: 0 })
    // Allows the Univer init effect to trigger a cursor position refresh on scroll
    const refreshCursorRectsRef = useRef<(() => void) | null>(null)
    const refreshCommentRectsRef = useRef<(() => void) | null>(null)
    const updateCellDimensionsRef = useRef<(() => void) | null>(null)
    const [cursorRects, setCursorRects] = useState<
      Record<string, { top: number; left: number; width: number; height: number }>
    >({})
    const [commentRects, setCommentRects] = useState<
      Record<string, { top: number; left: number; width: number; height: number }>
    >({})
    const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
    const legacyCursorContext = useMemo(() => createUniverConversionContext(columns, data), [columns, data])
    const remoteCursorOverlays = useMemo(
      () =>
        (props.participants ?? [])
          .map(participant => {
            const parsed =
              parseCursorPath(participant.cursor?.path) ||
              parseLegacySpreadsheetCursorPath(participant.cursor?.path, sheet.id, legacyCursorContext, columns)
            if (!parsed) return null
            return {
              id: `${participant.socketId || participant.userId}`,
              userName: participant.userName || t('editor-user-fallback'),
              userColor: participant.userColor || '#4ECDC4',
              row: parsed.row,
              col: parsed.col
            }
          })
          .filter(
            (entry): entry is { id: string; userName: string; userColor: string; row: number; col: number } => !!entry
          ),
      [columns, legacyCursorContext, props.participants, sheet.id]
    )

    useEffect(() => {
      if (props.collaborationEnabled) {
        lastEmittedCursorPathRef.current = ''
        pendingInitialCursorPathRef.current = ''
      }
    }, [props.collaborationEnabled, sheet.id, props.snapshotSeed])
    const supportedUniverFonts = useMemo(() => getSupportedUniverFonts(), [])
    const commentOverlays = useMemo(
      () =>
        (props.commentedCells ?? [])
          .map(comment => {
            const parsed = parseA1Reference(comment.cellReference)
            if (!parsed) return null
            return {
              id: comment.cellReference,
              ref: comment.cellReference,
              row: parsed.row,
              col: parsed.col,
              content: comment.content,
              createdByName: comment.createdByName,
              createdByAvatar: comment.createdByAvatar,
              createdAt: comment.createdAt
            }
          })
          .filter(
            (
              entry
            ): entry is {
              id: string
              ref: string
              row: number
              col: number
              content: string
              createdByName?: string
              createdByAvatar?: string
              createdAt?: string
            } => !!entry
          ),
      [props.commentedCells]
    )

    const resolveCellRect = useCallback(
      (row: number, col: number): { top: number; left: number; width: number; height: number } | null => {
        const api = univerAPIRef.current
        const container = containerRef.current
        if (!api || !container) return null
        try {
          const workbook = api.getActiveWorkbook?.()
          const worksheet = workbook?.getActiveSheet?.()
          if (!worksheet) return null

          // Univer's snapshot stores logical (unzoomed) dimensions. Multiply by
          // zoomRatio to get the rendered pixel size on the canvas.
          const dims = cellDimensionsRef.current
          const zoom = dims?.zoomRatio ?? 1
          const rowHeaderWidth = (dims?.rowHeaderWidth ?? CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX) * zoom
          const columnHeaderHeight = (dims?.columnHeaderHeight ?? CURSOR_OVERLAY_HEADER_HEIGHT_PX) * zoom
          const getColumnWidth = (c: number): number =>
            (dims?.columnData[c]?.w ?? dims?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX) * zoom
          const getRowHeight = (r: number): number =>
            (dims?.rowData[r]?.h ?? dims?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX) * zoom

          let cellLeft = 0
          for (let c = 0; c < col; c++) cellLeft += getColumnWidth(c)
          let cellTop = 0
          for (let r = 0; r < row; r++) cellTop += getRowHeight(r)

          const containerBox = container.getBoundingClientRect()

          const scrollState = (
            worksheet as {
              getScrollState?: () => {
                sheetViewStartRow?: number
                sheetViewStartColumn?: number
                offsetX?: number
                offsetY?: number
              }
            }
          ).getScrollState?.()
          let scrollLeftFromState: number | undefined
          let scrollTopFromState: number | undefined
          if (scrollState) {
            const startCol = Math.max(0, scrollState.sheetViewStartColumn ?? 0)
            const startRow = Math.max(0, scrollState.sheetViewStartRow ?? 0)
            let left = 0
            let top = 0
            for (let c = 0; c < startCol; c++) left += getColumnWidth(c)
            for (let r = 0; r < startRow; r++) top += getRowHeight(r)
            // offsetX/offsetY from Univer's viewport are in logical units; scale by zoom
            left += (scrollState.offsetX ?? 0) * zoom
            top += (scrollState.offsetY ?? 0) * zoom
            scrollLeftFromState = left
            scrollTopFromState = top
          }
          const scrollLeft =
            typeof scrollLeftFromState === 'number' && Number.isFinite(scrollLeftFromState)
              ? scrollLeftFromState
              : sheetScrollRef.current.scrollLeft
          const scrollTop =
            typeof scrollTopFromState === 'number' && Number.isFinite(scrollTopFromState)
              ? scrollTopFromState
              : sheetScrollRef.current.scrollTop

          // The main canvas sits below the Univer toolbar and formula bar.
          // Use canvas.top for the vertical anchor. The sheet fills the container
          // horizontally from x=0, so the horizontal anchor is the row header width.
          const canvases = Array.from(container.querySelectorAll<HTMLCanvasElement>('canvas'))
          const mainCanvas = canvases.reduce<HTMLCanvasElement | null>((best, c) => {
            if (!best) return c
            return c.width * c.height > best.width * best.height ? c : best
          }, null)

          if (mainCanvas) {
            const canvasBox = mainCanvas.getBoundingClientRect()
            const result = {
              top: canvasBox.top - containerBox.top + columnHeaderHeight + cellTop - scrollTop,
              left: rowHeaderWidth + cellLeft - scrollLeft,
              width: getColumnWidth(col),
              height: getRowHeight(row)
            }

            if ((globalThis as Record<string, unknown>).__debugCursorRect) {
              console.debug('[resolveCellRect]', {
                row,
                col,
                zoom,
                rawHeaderW: dims?.rowHeaderWidth,
                rawHeaderH: dims?.columnHeaderHeight,
                headerW: rowHeaderWidth,
                headerH: columnHeaderHeight,
                cellLeft,
                cellTop,
                scrollLeft,
                scrollTop,
                canvasTop: canvasBox.top,
                containerTop: containerBox.top,
                canvasLeft: canvasBox.left,
                containerLeft: containerBox.left,
                result
              })
            }

            return result
          }

          return null
        } catch {
          return null
        }
      },
      []
    )

    useEffect(() => {
      if (remoteCursorOverlays.length === 0) {
        refreshCursorRectsRef.current = null
        setCursorRects({})
        return
      }
      const refresh = () => {
        const next: Record<string, { top: number; left: number; width: number; height: number }> = {}
        for (const cursor of remoteCursorOverlays) {
          const rect = resolveCellRect(cursor.row, cursor.col)
          if (rect) next[cursor.id] = rect
        }
        setCursorRects(prev => (areCursorRectsEqual(prev, next) ? prev : next))
      }
      refreshCursorRectsRef.current = refresh
      refresh()
      const onResize = () => refresh()
      const onScroll = () => refresh()
      globalThis.addEventListener('resize', onResize)
      globalThis.addEventListener('scroll', onScroll, true)
      return () => {
        refreshCursorRectsRef.current = null
        globalThis.removeEventListener('resize', onResize)
        globalThis.removeEventListener('scroll', onScroll, true)
      }
    }, [remoteCursorOverlays, resolveCellRect])

    useEffect(() => {
      if (commentOverlays.length === 0) {
        refreshCommentRectsRef.current = null
        setCommentRects({})
        setHoveredCommentId(null)
        return
      }
      const refresh = () => {
        const next: Record<string, { top: number; left: number; width: number; height: number }> = {}
        for (const marker of commentOverlays) {
          const rect = resolveCellRect(marker.row, marker.col)
          if (rect) next[marker.id] = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        }
        setCommentRects(prev => {
          const prevKeys = Object.keys(prev)
          const nextKeys = Object.keys(next)
          if (prevKeys.length !== nextKeys.length) return next
          for (const key of nextKeys) {
            const p = prev[key]
            const n = next[key]
            if (!p) return next
            if (
              Math.abs(p.top - n.top) > 0.5 ||
              Math.abs(p.left - n.left) > 0.5 ||
              Math.abs(p.width - n.width) > 0.5 ||
              Math.abs((p.height ?? 0) - (n.height ?? 0)) > 0.5
            ) {
              return next
            }
          }
          return prev
        })
      }
      refreshCommentRectsRef.current = refresh
      refresh()
      // Retry when Univer canvas isn't ready yet — resolveCellRect can return null initially
      const retryId = globalThis.setTimeout(() => {
        refresh()
      }, 300)
      const onResize = () => refresh()
      const onScroll = () => refresh()
      globalThis.addEventListener('resize', onResize)
      globalThis.addEventListener('scroll', onScroll, true)
      return () => {
        globalThis.clearTimeout(retryId)
        refreshCommentRectsRef.current = null
        globalThis.removeEventListener('resize', onResize)
        globalThis.removeEventListener('scroll', onScroll, true)
      }
    }, [commentOverlays, resolveCellRect])

    // Re-read Univer dimensions and refresh overlays when the browser zoom changes.
    // Browser zoom alters getBoundingClientRect values but doesn't fire Univer commands,
    // so overlays drift unless we explicitly recalculate.
    useEffect(() => {
      let currentDpr = globalThis.devicePixelRatio ?? 1
      let mqCleanup: (() => void) | undefined
      const listen = () => {
        const mq = globalThis.matchMedia?.(`(resolution: ${currentDpr}dppx)`)
        if (!mq) return
        const handler = () => {
          currentDpr = globalThis.devicePixelRatio ?? 1
          updateCellDimensionsRef.current?.()
          refreshCursorRectsRef.current?.()
          refreshCommentRectsRef.current?.()
          mqCleanup?.()
          listen()
        }
        mq.addEventListener('change', handler, { once: true })
        mqCleanup = () => mq.removeEventListener('change', handler)
      }
      listen()
      return () => mqCleanup?.()
    }, [])

    useEffect(() => {
      if (!hoveredCommentId) return
      const stillExists = commentOverlays.some(marker => marker.id === hoveredCommentId)
      if (!stillExists) setHoveredCommentId(null)
    }, [commentOverlays, hoveredCommentId])

    // Callers should prefer passing A1-resolved coordinates (from cellRef) directly as rowIndex/colIndex.
    // The rowId fallback attempts to re-resolve via contextRef, but contextRef tracks the data prop
    // (not the Univer workbook), so it can be wrong vs the sender's cellRef — use `useSenderA1Row` from collab.
    const applyRemoteCellUpdate = useCallback(
      (rowIndex: number, colIndex: number, value: unknown, rowId?: string, options?: ApplyRemoteCellUpdateOptions) => {
        const tryApply = (attempt: number) => {
          try {
            const api = univerAPIRef.current
            if (!api) {
              if (attempt < 2) {
                debugRemoteApply('schedule_retry', {
                  reason: 'no_api',
                  attempt,
                  row0: rowIndex,
                  col0: colIndex,
                  a1: toA1Reference(rowIndex, colIndex)
                })
                globalThis.setTimeout(() => tryApply(attempt + 1), 150)
                return
              }
              console.warn('[UniverSheetGrid] applyRemoteCellUpdate: Univer API unavailable after retries')
              debugRemoteApply('give_up', { reason: 'no_api', row0: rowIndex, col0: colIndex })
              return
            }
            let resolvedRow = rowIndex
            if (!options?.useSenderA1Row && rowId && contextRef.current) {
              const gridIndex = contextRef.current.rowIdToIndex.get(rowId)
              if (gridIndex !== undefined) {
                resolvedRow = gridIndex
              } else {
                const d = propsRef.current.data
                const fallback = d.findIndex(r => {
                  const ids = [r._rowUuid, r._id, r.id].map(v => (v == null ? '' : String(v))).filter(Boolean)
                  return ids.includes(rowId)
                })
                if (fallback >= 0) resolvedRow = fallback
              }
            }
            const expiresAt = Date.now() + REMOTE_ECHO_SUPPRESSION_TTL_MS
            const key = remoteEchoKey(resolvedRow, colIndex)
            const echoSource =
              options?.univerCell && typeof options.univerCell === 'object' ? options.univerCell : value
            const signatureCandidates = new Set<string>()
            signatureCandidates.add(normalizeBlankLikeEchoSignature(toEchoSignature(echoSource)))
            // Authoritative clears (`clear_cell` / blank value over `batch_operations`) surface as
            // blank-like cell-change events after apply, so add the 'blank' candidate for them.
            // Style-only `cells_changed` payloads no longer need this — we merge style without
            // touching `v`/`f`/`m`, so no blank-like event is generated on the receiver.
            if (value === null || value === undefined || value === '') {
              signatureCandidates.add('blank')
            }
            remoteEchoSuppressionRef.current.set(key, {
              expiresAt,
              signatures: signatureCandidates
            })
            globalThis.setTimeout(() => {
              const current = remoteEchoSuppressionRef.current.get(key)
              if (current?.expiresAt === expiresAt) {
                remoteEchoSuppressionRef.current.delete(key)
              }
            }, REMOTE_ECHO_SUPPRESSION_TTL_MS + 50)

            const workbook = api.getActiveWorkbook()
            if (!workbook) {
              if (attempt < 2) {
                debugRemoteApply('schedule_retry', {
                  reason: 'no_workbook',
                  attempt,
                  row0: resolvedRow,
                  col0: colIndex,
                  a1: toA1Reference(resolvedRow, colIndex)
                })
                globalThis.setTimeout(() => tryApply(attempt + 1), 150)
                return
              }
              console.warn('[UniverSheetGrid] applyRemoteCellUpdate: no active workbook after retries')
              debugRemoteApply('give_up', { reason: 'no_workbook', row0: resolvedRow, col0: colIndex })
              return
            }
            const worksheet = workbook.getActiveSheet()
            if (!worksheet) {
              if (attempt < 2) {
                debugRemoteApply('schedule_retry', {
                  reason: 'no_worksheet',
                  attempt,
                  row0: resolvedRow,
                  col0: colIndex,
                  a1: toA1Reference(resolvedRow, colIndex)
                })
                globalThis.setTimeout(() => tryApply(attempt + 1), 150)
                return
              }
              console.warn('[UniverSheetGrid] applyRemoteCellUpdate: no active worksheet after retries')
              debugRemoteApply('give_up', { reason: 'no_worksheet', row0: resolvedRow, col0: colIndex })
              return
            }
            debugRemoteApply('sync_path', {
              attempt,
              row0: resolvedRow,
              col0: colIndex,
              a1: toA1Reference(resolvedRow, colIndex),
              usedRowId: Boolean(rowId && !options?.useSenderA1Row)
            })
            const range = worksheet.getRange(resolvedRow, colIndex)
            if (!range) {
              console.warn('[UniverSheetGrid] applyRemoteCellUpdate: getRange returned null', { resolvedRow, colIndex })
              debugRemoteApply('sync_getRange_null', {
                row0: resolvedRow,
                col0: colIndex,
                a1: toA1Reference(resolvedRow, colIndex),
                attempt
              })
              return
            }
            // Defer setValue so React/state updates from commitLocalSheetData (same collab tick) and
            // any microtasks Univer schedules from prior cells run first — avoids sporadic blank cells
            // under fast remote bursts (same refs applied, withA1Applied=1, but UI missing a value).
            const rowForApply = resolvedRow
            const colForApply = colIndex
            debugRemoteApply('queue_setValue_microtask', {
              row0: rowForApply,
              col0: colForApply,
              a1: toA1Reference(rowForApply, colForApply),
              attempt
            })
            queueMicrotask(() => {
              isApplyingRemoteUpdateRef.current = true
              try {
                debugRemoteApply('microtask_begin', {
                  row0: rowForApply,
                  col0: colForApply,
                  a1: toA1Reference(rowForApply, colForApply)
                })
                const apiQ = univerAPIRef.current
                if (!apiQ) {
                  debugRemoteApply('microtask_skip', { reason: 'no_api', row0: rowForApply, col0: colForApply })
                  return
                }
                const wbQ = apiQ.getActiveWorkbook()
                if (!wbQ) {
                  debugRemoteApply('microtask_skip', { reason: 'no_workbook', row0: rowForApply, col0: colForApply })
                  return
                }
                const wsQ = wbQ.getActiveSheet?.()
                if (!wsQ) {
                  debugRemoteApply('microtask_skip', { reason: 'no_worksheet', row0: rowForApply, col0: colForApply })
                  return
                }
                const rQ = wsQ.getRange(rowForApply, colForApply)
                if (!rQ) {
                  debugRemoteApply('microtask_skip', {
                    reason: 'getRange_null',
                    row0: rowForApply,
                    col0: colForApply,
                    a1: toA1Reference(rowForApply, colForApply)
                  })
                  return
                }
                debugRemoteApply('setValue_call', {
                  row0: rowForApply,
                  col0: colForApply,
                  a1: toA1Reference(rowForApply, colForApply)
                })
                const optStyles = options?.univerStyles
                if (optStyles && typeof optStyles === 'object') {
                  const keys = Object.keys(optStyles)
                  if (keys.length > 0) {
                    const fw = wbQ as { addStyles?: (s: Record<string, unknown>) => void }
                    try {
                      fw.addStyles?.(optStyles)
                    } catch (styleErr) {
                      console.warn('[UniverSheetGrid] addStyles (remote collab) failed:', styleErr)
                    }
                  }
                }
                const rich = options?.univerCell
                if (rich && typeof rich === 'object' && Object.keys(rich).length > 0) {
                  const richObj = rich as Record<string, unknown>
                  if (!richCellPayloadHasValue(richObj)) {
                    // Style-only payload: merge style into the existing cell and keep the value.
                    // Value changes (including deletes) now arrive exclusively via the server's
                    // authoritative `batch_operations` broadcast (`set_cell`/`clear_cell`), so
                    // `cells_changed` must never affect `v`/`f`/`m` on the receiver.
                    try {
                      const current = (rQ.getCellData?.() as Record<string, unknown> | null | undefined) ?? {}
                      const merged = { ...current, ...richObj }
                      // Univer's post-apply cell-change reports the merged cell (including the
                      // preserved `v`/`f`/`m`). The initial suppression entry only covers the rich
                      // payload signature — without adding the merged-cell signature, our local
                      // change-detection here would MISS the match and persist the stale value via
                      // HTTP batch, which the server would then broadcast back → the sender would
                      // see its delete "come back". Augment before firing setValue.
                      const echoEntry = remoteEchoSuppressionRef.current.get(key)
                      if (echoEntry && Date.now() <= echoEntry.expiresAt) {
                        const next = new Set(echoEntry.signatures)
                        next.add(normalizeBlankLikeEchoSignature(toEchoSignature(merged)))
                        for (const k of UNIVER_CELL_VALUE_KEYS) {
                          if (Object.prototype.hasOwnProperty.call(current, k)) {
                            next.add(
                              normalizeBlankLikeEchoSignature(toEchoSignature((current as Record<string, unknown>)[k]))
                            )
                          }
                        }
                        remoteEchoSuppressionRef.current.set(key, { ...echoEntry, signatures: next })
                      }
                      rQ.setValue(merged as any)
                    } catch {
                      rQ.setValue(richObj as any)
                    }
                  } else {
                    rQ.setValue(richObj as any)
                  }
                } else {
                  const scalar = normalizeValueForGridWrite(value)
                  try {
                    const current = rQ.getCellData?.() as Record<string, unknown> | null | undefined
                    const keepStyle = current && typeof current === 'object' && 's' in current && current.s != null
                    if (keepStyle) {
                      // IMPORTANT: Univer's `SetRangeValuesMutation` merges the payload with
                      // the existing cell — a MISSING key is left untouched, only an EXPLICIT
                      // `null` clears the key. Therefore to clear `v`/`f`/`m` while keeping the
                      // style, we must pass `null` values (matching Univer's own clear command
                      // which emits `{v:null, p:null, f:null, si:null, custom:null}`).
                      const merged: Record<string, unknown> = { ...current }
                      if (typeof scalar === 'string' && scalar.startsWith('=')) {
                        merged.f = scalar
                        merged.v = null
                        merged.p = null
                        merged.si = null
                      } else if (scalar === '' || scalar == null) {
                        merged.v = null
                        merged.f = null
                        merged.p = null
                        merged.si = null
                        merged.custom = null
                      } else {
                        merged.v = scalar as unknown
                        merged.f = null
                        merged.p = null
                        merged.si = null
                      }
                      rQ.setValue(merged as any)
                    } else {
                      rQ.setValue(scalar as any)
                    }
                  } catch {
                    rQ.setValue(scalar as any)
                  }
                }
                debugRemoteApply('setValue_done', {
                  row0: rowForApply,
                  col0: colForApply,
                  a1: toA1Reference(rowForApply, colForApply)
                })
              } catch (e) {
                console.error('[UniverSheetGrid] applyRemoteCellUpdate error:', e)
                debugRemoteApply('microtask_error', {
                  row0: rowForApply,
                  col0: colForApply,
                  message: e instanceof Error ? e.message : 'unknown'
                })
              } finally {
                isApplyingRemoteUpdateRef.current = false
                debugRemoteApply('microtask_finally', { row0: rowForApply, col0: colForApply })
              }
            })
          } catch (e) {
            console.error('[UniverSheetGrid] applyRemoteCellUpdate error:', e)
            debugRemoteApply('tryApply_throw', {
              row0: rowIndex,
              col0: colIndex,
              message: e instanceof Error ? e.message : 'unknown'
            })
          }
        }
        tryApply(0)
      },
      []
    )

    const getWorkbookSnapshot = useCallback((): Record<string, unknown> | null => {
      const api = univerAPIRef.current
      if (!api) return null
      try {
        const workbook = api.getActiveWorkbook()
        if (!workbook) return null
        const wb = workbook as unknown as {
          save?: () => unknown
          getSnapshot?: () => unknown
          snapshot?: unknown
          _workbook?: {
            getStyles?: () => { toJSON?: () => Record<string, unknown> } | undefined
            getSnapshot?: () => Record<string, unknown> | undefined
          }
        }
        const rawSnapshot = wb.save?.() ?? wb.getSnapshot?.() ?? wb.snapshot
        if (!rawSnapshot || typeof rawSnapshot !== 'object') return null

        // Safety net: Univer's FWorkbook.save() deep-clones workbook._snapshot, but that
        // _snapshot.styles can drift from the live Styles registry in edge cases (e.g. a
        // snapshot replacement after bootstrap while the live registry keeps mutating).
        // Rehydrate from the authoritative Styles instance so cell `s` refs always resolve.
        try {
          const snapshotObj = rawSnapshot as Record<string, unknown>
          const snapshotStylesKeys = Object.keys((snapshotObj.styles as Record<string, unknown>) ?? {})
          const liveStyles = wb._workbook?.getStyles?.()?.toJSON?.()
          const liveStylesKeys = liveStyles ? Object.keys(liveStyles) : []
          if (liveStyles && liveStylesKeys.length > snapshotStylesKeys.length) {
            snapshotObj.styles = { ...(snapshotObj.styles as Record<string, unknown> | undefined), ...liveStyles }
          }
        } catch {
          // Non-fatal; fall back to raw snapshot if style rehydration fails.
        }

        // Ensure payload is JSON-serializable before sending to API.
        try {
          return structuredClone(rawSnapshot as Record<string, unknown>)
        } catch {
          try {
            return JSON.parse(JSON.stringify(rawSnapshot)) as Record<string, unknown>
          } catch (cloneError) {
            console.error('[UniverSheetGrid] snapshot is not serializable:', cloneError)
            return null
          }
        }
      } catch (e) {
        console.error('[UniverSheetGrid] getWorkbookSnapshot error:', e)
        return null
      }
    }, [])

    const getWorkbookSnapshotRef = useRef(getWorkbookSnapshot)
    getWorkbookSnapshotRef.current = getWorkbookSnapshot

    const applyRemoteDimensions = useCallback(
      (payload: CellDimensionsPayload) => {
        if (payload.sheetId !== sheet.id) return
        const currentColumnData = cellDimensionsRef.current?.columnData ?? {}
        // Preserve the LOCAL zoom ratio — zoom is a per-client preference that
        // must not be overwritten by another collaborator's dimension broadcast.
        const localZoom = cellDimensionsRef.current?.zoomRatio ?? 1
        cellDimensionsRef.current = {
          defaultColWidth: payload.defaultColWidth,
          defaultRowHeight: payload.defaultRowHeight,
          // Column widths are synchronized through durable column metadata. Applying
          // snapshot-derived columnData here can reintroduce an older width after a newer resize.
          columnData: currentColumnData,
          rowData: payload.rowData ?? {},
          rowHeaderWidth: payload.rowHeaderWidth,
          columnHeaderHeight: payload.columnHeaderHeight,
          zoomRatio: localZoom
        }
        const currentRowData = cellDimensionsRef.current?.rowData ?? {}
        const nextDimensions = {
          defaultColWidth: payload.defaultColWidth,
          defaultRowHeight: payload.defaultRowHeight,
          // Column widths are synchronized through durable column metadata. Applying
          // snapshot-derived columnData here can reintroduce an older width after a newer resize.
          columnData: currentColumnData,
          rowData: payload.rowData ?? {},
          rowHeaderWidth: payload.rowHeaderWidth,
          columnHeaderHeight: payload.columnHeaderHeight,
          zoomRatio: localZoom
        }
        if (areSnapshotDimensionsEqual(cellDimensionsRef.current, nextDimensions)) {
          return
        }
        cellDimensionsRef.current = nextDimensions
        const api = univerAPIRef.current
        const worksheet = api?.getActiveWorkbook?.()?.getActiveSheet?.()
        if (
          worksheet &&
          typeof (worksheet as { setColumnWidth?: (col: number, w: number) => unknown }).setColumnWidth === 'function'
        ) {
          const ws = worksheet as {
            setColumnWidth: (col: number, w: number) => unknown
            setRowHeight: (row: number, h: number) => unknown
          }
          Object.entries(payload.rowData ?? {}).forEach(([rowStr, meta]) => {
            const h = meta?.h
            const currentHeight =
              typeof currentRowData[rowStr]?.h === 'number' && Number.isFinite(currentRowData[rowStr]?.h)
                ? Math.round(currentRowData[rowStr].h as number)
                : null
            const nextHeight = typeof h === 'number' && Number.isFinite(h) ? Math.round(h) : null
            if (nextHeight != null && nextHeight > 0 && currentHeight !== nextHeight) {
              ws.setRowHeight(Number(rowStr), h)
            }
          })
        }
        refreshCursorRectsRef.current?.()
        refreshCommentRectsRef.current?.()
      },
      [sheet.id]
    )

    const getVisibleRangeValues = useCallback(
      (rowCount: number, colCount: number): Record<number, Record<number, unknown>> | null => {
        const api = univerAPIRef.current
        if (!api) return null
        try {
          const workbook = api.getActiveWorkbook()
          const worksheet = workbook?.getActiveSheet?.()
          if (!worksheet) return null

          const values: Record<number, Record<number, unknown>> = {}
          const safeRowCount = Math.max(0, Math.min(rowCount, 1000))
          let effectiveMaxCol = Math.max(0, Math.min(colCount, 256))
          for (let row = 0; row < safeRowCount; row++) {
            for (let col = 0; col < effectiveMaxCol; col++) {
              try {
                const range = worksheet.getRange?.(row, col)
                const value =
                  (range as { getValue?: () => unknown })?.getValue?.() ??
                  (range as { getCellData?: () => { v?: unknown } })?.getCellData?.()?.v
                if (value === undefined) continue
                if (!values[row]) values[row] = {}
                values[row][col] = value
              } catch {
                effectiveMaxCol = col
                break
              }
            }
          }
          return values
        } catch (e) {
          console.error('[UniverSheetGrid] getVisibleRangeValues error:', e)
          return null
        }
      },
      []
    )

    const getActiveCellReference = useCallback((): string | null => {
      const active =
        activeSelectionRef.current ?? extractActiveRangePosition(univerAPIRef.current?.getActiveWorkbook?.())
      if (!active) return null
      const a1 = toA1Reference(active.row, active.col)
      return a1 || null
    }, [])

    const toCellDimensionsPayload = useCallback(
      (dims: SnapshotDimensions): CellDimensionsPayload => ({
        sheetId: sheet.id,
        defaultColWidth: dims.defaultColWidth,
        defaultRowHeight: dims.defaultRowHeight,
        columnData: dims.columnData,
        rowData: dims.rowData,
        rowHeaderWidth: dims.rowHeaderWidth,
        columnHeaderHeight: dims.columnHeaderHeight,
        zoomRatio: dims.zoomRatio
      }),
      [sheet.id]
    )

    useEffect(() => {
      const container = containerRef.current
      if (!container || props.isReadOnly) return

      const customMarkerAttr = 'data-univer-custom-comment-item'
      const customClassName = 'univer-custom-comment-item'
      const openLinkMarkerAttr = 'data-univer-open-link-item'
      const openLinkClassName = 'univer-open-link-item'
      let contextMenuObserver: MutationObserver | null = null

      const createCommentItem = (template: HTMLElement) =>
        createContextMenuItem(template, customMarkerAttr, customClassName, 'Add comment', () => {
          callbacksRef.current.onOpenCommentRequest?.()
        })

      const injectComment = (x: number, y: number) =>
        tryInjectContextMenuItem(x, y, customMarkerAttr, createCommentItem)
      const injectOpenLink = (x: number, y: number) => {
        const wb = univerAPIRef.current?.getActiveWorkbook?.()
        const active = activeSelectionRef.current ?? extractActiveRangePosition(wb)
        if (active == null) return false
        const { data, columns, sheet } = propsRef.current
        let cellFormula: string | null = null
        try {
          const snap =
            (wb as { save?: () => unknown; getSnapshot?: () => unknown })?.save?.() ??
            (wb as { getSnapshot?: () => unknown })?.getSnapshot?.()
          const sheets =
            snap && typeof snap === 'object'
              ? ((snap as Record<string, unknown>).sheets as Record<
                  string,
                  { cellData?: Record<number | string, Record<number | string, { f?: string }>> }
                >)
              : null
          const sheetId =
            sheet?.id ??
            (Array.isArray((snap as Record<string, unknown>)?.sheetOrder)
              ? (snap as { sheetOrder: string[] }).sheetOrder[0]
              : '')
          const ws = sheetId ? sheets?.[sheetId] : null
          const rowCells = ws?.cellData?.[active.row] ?? ws?.cellData?.[String(active.row)]
          const cell =
            rowCells && typeof rowCells === 'object' ? (rowCells[active.col] ?? rowCells[String(active.col)]) : null
          if (cell?.f) cellFormula = cell.f
        } catch {
          /* ignore */
        }
        const url = getHyperlinkUrlFromSelection(active.row, active.col, data, columns, cellFormula)
        if (!url) return false
        return tryInjectContextMenuItem(x, y, openLinkMarkerAttr, (template: HTMLElement) =>
          createContextMenuItem(template, openLinkMarkerAttr, openLinkClassName, t('link-editor-open-link'), () => {
            window.open(url, '_blank', 'noopener,noreferrer')
          })
        )
      }

      const stopObserver = () => {
        if (contextMenuObserver) {
          contextMenuObserver.disconnect()
          contextMenuObserver = null
        }
      }

      const pollInjection = (x: number, y: number, attempts: { count: number }, maxAttempts: number) => {
        attempts.count += 1
        hideProtectContextMenuItem()
        injectOpenLink(x, y)
        if (injectComment(x, y)) {
          stopObserver()
          return
        }
        if (attempts.count < maxAttempts) {
          globalThis.setTimeout(() => pollInjection(x, y, attempts, maxAttempts), 50)
        } else {
          stopObserver()
        }
      }

      const onNativeContextMenu = (e: MouseEvent) => {
        const x = e.clientX
        const y = e.clientY
        const attempts = { count: 0 }
        stopObserver()
        contextMenuObserver = new MutationObserver(() => {
          hideProtectContextMenuItem()
          injectOpenLink(x, y)
          if (injectComment(x, y)) stopObserver()
        })
        contextMenuObserver.observe(document.body, { childList: true, subtree: true })
        scheduleContextMenuInjectionPoll(() => pollInjection(x, y, attempts, 40))
      }

      container.addEventListener('contextmenu', onNativeContextMenu, true)
      return () => {
        stopObserver()
        container.removeEventListener('contextmenu', onNativeContextMenu, true)
      }
    }, [props.isReadOnly])

    useEffect(() => {
      if (props.isReadOnly) return
      if (!gridHostEl) return

      const applyGermanPatternToActiveRange = (label: string) => {
        const pattern = getGermanNumfmtPattern(label)
        if (!pattern) return
        const workbook = univerAPIRef.current?.getActiveWorkbook?.() as
          | { getActiveRange?: () => { setNumberFormat?: (nextPattern: string) => unknown } | null }
          | undefined
        const range = workbook?.getActiveRange?.()
        if (!range || typeof range.setNumberFormat !== 'function') return
        try {
          range.setNumberFormat(pattern)
        } catch (error) {
          console.error('[UniverSheetGrid] setNumberFormat override failed:', error)
        }
      }

      /**
       * Toolbar overflow (⋮) and Radix popovers often mount outside `containerRef`. A capture listener
       * on the grid host never runs, so we observe `document.body` and rAF-debounce patches — including
       * `characterData` so React text updates are re-overridden.
       */
      let rafScheduled = 0
      const scheduleNumfmtMenuPatch = () => {
        if (rafScheduled !== 0) return
        rafScheduled = globalThis.requestAnimationFrame(() => {
          rafScheduled = 0
          patchGermanNumfmtMenuPreview()
          patchChineseDateLabels()
          hideUnwantedRibbonTabs()
        })
      }

      const observer = new globalThis.MutationObserver(() => {
        scheduleNumfmtMenuPatch()
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      scheduleNumfmtMenuPatch()

      /** Univer re-applies `Dt(pattern)` to preview spans on render; re-patch on a timer while the sheet is mounted. */
      const numfmtPreviewIntervalId = globalThis.setInterval(() => {
        patchGermanNumfmtMenuPreview()
        patchChineseDateLabels()
        hideUnwantedRibbonTabs()
      }, 200)

      const onNumfmtMenuItemClickCapture = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null
        if (!target) return
        const row = target.closest(NUMFMT_MENU_ITEM_ROW_SELECTOR) as HTMLElement | null
        if (!row) return
        const grids = findNumfmtFormatMenuGrids()
        if (!grids.some(g => g.contains(row))) return
        const labelSpan = row.querySelector<HTMLElement>(':scope > span:first-child')
        const label = labelSpan ? normalizeMenuText(labelSpan.textContent || '') : null
        if (!label) return
        globalThis.setTimeout(() => {
          applyGermanPatternToActiveRange(label)
          scheduleNumfmtMenuPatch()
        }, 0)
      }

      document.addEventListener('click', onNumfmtMenuItemClickCapture, true)

      return () => {
        observer.disconnect()
        globalThis.clearInterval(numfmtPreviewIntervalId)
        if (rafScheduled !== 0) {
          globalThis.cancelAnimationFrame(rafScheduled)
          rafScheduled = 0
        }
        document.removeEventListener('click', onNumfmtMenuItemClickCapture, true)
      }
    }, [props.isReadOnly, gridHostEl])

    useEffect(() => {
      const container = containerRef.current
      if (!container) return
      const handleLinkClick = () => {
        const wb = univerAPIRef.current?.getActiveWorkbook?.()
        const active = activeSelectionRef.current ?? extractActiveRangePosition(wb)
        if (active == null) return
        const { data, columns, sheet } = propsRef.current
        let cellFormula: string | null = null
        try {
          const snap =
            (wb as { save?: () => unknown; getSnapshot?: () => unknown })?.save?.() ??
            (wb as { getSnapshot?: () => unknown })?.getSnapshot?.()
          const sheets =
            snap && typeof snap === 'object'
              ? ((snap as Record<string, unknown>).sheets as Record<
                  string,
                  { cellData?: Record<number | string, Record<number | string, { f?: string }>> }
                >)
              : null
          const sheetId =
            sheet?.id ??
            (Array.isArray((snap as Record<string, unknown>)?.sheetOrder)
              ? (snap as { sheetOrder: string[] }).sheetOrder[0]
              : '')
          const ws = sheetId ? sheets?.[sheetId] : null
          const rowCells = ws?.cellData?.[active.row] ?? ws?.cellData?.[String(active.row)]
          const cell =
            rowCells && typeof rowCells === 'object' ? (rowCells[active.col] ?? rowCells[String(active.col)]) : null
          if (cell?.f) cellFormula = cell.f
        } catch {
          /* ignore */
        }
        const url = getHyperlinkUrlFromSelection(active.row, active.col, data, columns, cellFormula)
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
      }
      const onCaptureClick = (e: MouseEvent) => {
        if (e.detail > 1) return
        if (!container.contains(e.target as Node)) return
        globalThis.setTimeout(handleLinkClick, 50)
      }
      document.addEventListener('click', onCaptureClick, true)
      return () => document.removeEventListener('click', onCaptureClick, true)
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        applyRemoteCellUpdate,
        forceAuthoritativeReapply: () => {
          lastSyncedGridCellSignaturesRef.current = new Map()
          setAuthoritativeReapplySeed(prev => prev + 1)
        },
        getWorkbookSnapshot,
        getVisibleRangeValues,
        applyRemoteDimensions,
        getActiveCellReference,
        requestSnapshotCheckpoint: (force = false) => {
          requestSnapshotCheckpointRef.current?.(force)
        }
      }),
      [applyRemoteCellUpdate, getWorkbookSnapshot, getVisibleRangeValues, applyRemoteDimensions, getActiveCellReference]
    )

    const flushQueuedSnapshotRequest = useCallback(() => {
      if (!snapshotRequestQueuedRef.current) return
      snapshotRequestQueuedRef.current = false
      if (!isDirtyRef.current) return
      requestSnapshotCheckpointRef.current?.(true)
    }, [])

    // Keep conversion context in sync when data/columns change (e.g. after save) so value-change handler maps indices correctly.
    useEffect(() => {
      if (!univerAPIRef.current) return
      contextRef.current = createUniverConversionContext(columns, data)
    }, [data, columns])

    // Rebuild the authoritative signature cache when the rendered `data`/
    // `columns` changed WITHOUT the parent bumping `authoritativeDataSyncToken`.
    // Token bumps are the parent's signal that the data change is authoritative
    // (local edits via `handleCellsChange`, backend round-trips for new rows,
    // reloads, bulk-row ops) — for those, `handleDetectedCellMutation` already
    // seeded the signature map with the post-edit values and the re-apply
    // effect below should diff against that baseline. But non-authoritative
    // data changes still update the `data` prop: tab switch swaps `data`/
    // `columns` to the new sheet's rows directly via `setLocalSheetData`, and
    // entity-backed sheets replace `data` when the entity query resettles —
    // neither bumps the token. Without rebuilding for those paths the re-apply
    // effect would diff the new sheet's values against the previous sheet's
    // signatures and fire `applyRemoteCellUpdate` for every row that differs
    // between the two sheets (visible as the whole-grid blink on edits after
    // a tab switch, because the first keystroke bumps the token and the
    // accumulated false positives finally flush). The prior "rebuild only on
    // sheet-id change" variant didn't work either: sheet switches complete
    // across two renders (first with the new `sheet.id` but stale `data`
    // still pointing at the previous sheet, then with the refreshed `data`),
    // so the sheet-id-gated rebuild ran on the stale data and the correct
    // data-ready render was skipped because the id hadn't moved.
    //
    // Tracking the last-seen token lets us distinguish the two classes
    // cleanly: if `data`/`columns` changed but the token did NOT, rebuild
    // (it's a sheet switch / entity refresh / similar non-authoritative
    // source and the cache is stale). If the token DID change, leave the
    // cache alone so `handleDetectedCellMutation`'s seed survives the
    // two-phase drag-fill commit lifecycle.
    const lastObservedAuthoritativeTokenForRebuildRef = useRef<number>(props.authoritativeDataSyncToken ?? 0)
    useEffect(() => {
      if (!univerAPIRef.current) return
      const currentToken = props.authoritativeDataSyncToken ?? 0
      const tokenChanged = currentToken !== lastObservedAuthoritativeTokenForRebuildRef.current
      lastObservedAuthoritativeTokenForRebuildRef.current = currentToken
      if (tokenChanged) return
      lastSyncedGridCellSignaturesRef.current = buildAuthoritativeCellSignatureMap(data, columns)
      lastSyncedGridRowCountRef.current = data.length
      lastSyncedGridColumnCountRef.current = columns.filter(column => column.isVisible !== false).length
    }, [data, columns, props.authoritativeDataSyncToken])

    useEffect(() => {
      const api = univerAPIRef.current
      if (!api) return
      const nextToken = props.authoritativeDataSyncToken ?? 0
      const shouldSyncWorkbook =
        nextToken !== lastProcessedAuthoritativeDataSyncTokenRef.current ||
        authoritativeReapplySeed !== lastProcessedAuthoritativeReapplySeedRef.current
      if (!shouldSyncWorkbook) return
      const visibleColumns = columns.filter(column => column.isVisible !== false)
      const isForcedAuthoritativeReapply = authoritativeReapplySeed !== lastProcessedAuthoritativeReapplySeedRef.current
      if (skipNextAuthoritativeSyncAfterSnapshotInitRef.current && !isForcedAuthoritativeReapply) {
        // Snapshot-based remounts already carry the live workbook values/styles.
        // Replaying every authoritative cell immediately afterward via setValue()
        // can strip style-only details like font color from the restored cells.
        skipNextAuthoritativeSyncAfterSnapshotInitRef.current = false
        lastSyncedGridCellSignaturesRef.current = buildAuthoritativeCellSignatureMap(data, columns)
        lastSyncedGridRowCountRef.current = getAuthoritativeGridRowExtent(data)
        lastSyncedGridColumnCountRef.current = visibleColumns.length
        lastProcessedAuthoritativeDataSyncTokenRef.current = nextToken
        lastProcessedAuthoritativeReapplySeedRef.current = authoritativeReapplySeed
        debugRemoteApply('skip_authoritative_reapply_after_snapshot_init', {
          rowCount: data.length,
          columnCount: visibleColumns.length,
          token: nextToken
        })
        return
      }
      // Mutate the existing signature map in place rather than building a
      // replacement. The seed planted by `handleDetectedCellMutation` for
      // rows that are still en-route through `processUniverDataChange`'s
      // async backend round-trip (drag-fill expansion, paste extension)
      // lives in this map at coordinates beyond the current `data.length`.
      // Replacing the whole map with only the currently-addressable rows
      // would drop those seeds, so when the backend commit eventually
      // appends the created rows and re-enters this effect with a larger
      // `data`, `previousSignatures.get(key)` would be `undefined` for
      // exactly the drag-filled cells and `applyRemoteCellUpdate` would
      // redraw cells Univer already paints correctly — the whole-grid
      // blink. We still prune out-of-range entries that no longer belong
      // (row/column shrinkage from a remote delete) so the map doesn't
      // grow unbounded.
      const signatures = lastSyncedGridCellSignaturesRef.current
      const previousRowCount = lastSyncedGridRowCountRef.current
      const previousColumnCount = lastSyncedGridColumnCountRef.current
      const rowsByGridIndex = buildAuthoritativeRowsByGridIndex(data)
      const nextRowCount = getAuthoritativeGridRowExtent(data)
      const maxRowCount = Math.max(previousRowCount, nextRowCount)
      const maxColumnCount = Math.max(previousColumnCount, visibleColumns.length)
      const nowForLocalMutationCheck = Date.now()
      for (let rowIndex = 0; rowIndex < maxRowCount; rowIndex++) {
        const row = rowsByGridIndex.get(rowIndex)
        const rowInBounds = rowsByGridIndex.has(rowIndex)
        for (let colIndex = 0; colIndex < maxColumnCount; colIndex++) {
          const column = visibleColumns[colIndex]
          const colInBounds = colIndex < visibleColumns.length
          const key = remoteEchoKey(rowIndex, colIndex)
          if (!rowInBounds || !colInBounds) {
            signatures.delete(key)
            if (isForcedAuthoritativeReapply) {
              applyRemoteCellUpdate(rowIndex, colIndex, '')
            }
            continue
          }
          const nextValue = row && column ? (readAuthoritativeRowCellValue(row, column) ?? '') : ''
          const nextSignature = toEchoSignature(nextValue)
          const previousSignature = signatures.get(key)
          signatures.set(key, nextSignature)
          if (previousSignature === nextSignature && !isForcedAuthoritativeReapply) continue
          // Defense in depth: skip `applyRemoteCellUpdate` when the user just mutated
          // this cell locally. Univer already holds the edited value from the user's
          // direct interaction (typing, drag-fill, paste), so re-dispatching a
          // `SetRangeValuesMutation` for the same coordinate forces Univer to re-tear
          // down and redraw that cell — the visible "whole-grid blink" observed on
          // drag-fill and fast multi-cell typing.
          const localMutationExpiresAt = recentLocallyMutatedGridCellsRef.current.get(key) ?? 0
          if (localMutationExpiresAt > nowForLocalMutationCheck && !isForcedAuthoritativeReapply) continue
          applyRemoteCellUpdate(rowIndex, colIndex, nextValue)
        }
      }

      lastSyncedGridRowCountRef.current = nextRowCount
      lastSyncedGridColumnCountRef.current = visibleColumns.length
      lastProcessedAuthoritativeDataSyncTokenRef.current = nextToken
      lastProcessedAuthoritativeReapplySeedRef.current = authoritativeReapplySeed
    }, [applyRemoteCellUpdate, authoritativeReapplySeed, columns, data, props.authoritativeDataSyncToken])

    useEffect(() => {
      const api = univerAPIRef.current
      const worksheet = api?.getActiveWorkbook?.()?.getActiveSheet?.()
      if (
        !worksheet ||
        typeof (worksheet as { setColumnWidth?: (col: number, w: number) => unknown }).setColumnWidth !== 'function'
      ) {
        return
      }

      const ws = worksheet as { setColumnWidth: (col: number, w: number) => unknown }
      const nextColumnData = { ...(cellDimensionsRef.current?.columnData ?? {}) }
      const visibleColumns = columns.filter(column => column.isVisible !== false)
      let hasMaterialWidthChange = false
      visibleColumns.forEach((column, index) => {
        if (typeof column.width === 'number' && Number.isFinite(column.width) && column.width > 0) {
          const currentWidth =
            typeof nextColumnData[index]?.w === 'number' && Number.isFinite(nextColumnData[index]?.w)
              ? Math.round(nextColumnData[index].w as number)
              : null
          const nextWidth = Math.round(column.width)
          if (currentWidth === nextWidth) return
          hasMaterialWidthChange = true
          ws.setColumnWidth(index, column.width)
          nextColumnData[index] = { ...(nextColumnData[index] ?? {}), w: column.width }
        }
      })
      if (!hasMaterialWidthChange) {
        return
      }
      cellDimensionsRef.current = cellDimensionsRef.current
        ? { ...cellDimensionsRef.current, columnData: nextColumnData }
        : {
            defaultColWidth: CURSOR_OVERLAY_COL_WIDTH_PX,
            defaultRowHeight: CURSOR_OVERLAY_ROW_HEIGHT_PX,
            columnData: nextColumnData,
            rowData: {},
            rowHeaderWidth: 48,
            columnHeaderHeight: 28,
            zoomRatio: 1
          }
    }, [columns])

    // Fallback interval: separate from Univer lifecycle so it keeps running even if the Univer effect re-runs.
    useEffect(() => {
      const FALLBACK_INTERVAL_MS = 60000
      const id = setInterval(() => {
        if (!isDirtyRef.current) return
        const req = requestSnapshotCheckpointRef.current
        if (!req || snapshotRequestInFlightRef.current) return
        req()
      }, FALLBACK_INTERVAL_MS)
      return () => clearInterval(id)
    }, [])

    // Background tabs heavily throttle timers; the debounced snapshot checkpoint can be skipped or delayed
    // long enough that users see "Unsaved" without univer-snapshot traffic. Re-arm when the tab is visible again.
    useEffect(() => {
      if (typeof document === 'undefined') return
      const onVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return
        if (readOnlyRef.current) return
        const schedule = scheduleSnapshotCheckpointRef.current
        if (!schedule || !isDirtyRef.current) return
        schedule(5000)
      }
      document.addEventListener('visibilitychange', onVisibilityChange)
      return () => document.removeEventListener('visibilitychange', onVisibilityChange)
    }, [])

    useEffect(() => {
      setForceRowSnapshotSeed(0)
    }, [sheet.id, props.snapshotSeed])

    // Recreate Univer only when the workbook identity/bootstrap changes.
    // In multi-sheet mode the remount key stays stable across tab switches so the shared
    // workbook instance keeps unsaved in-memory sheet state instead of resetting per tab.
    useEffect(() => {
      if (!gridHostEl) return
      newRowClientIdByIndexRef.current.clear()
      lastEmittedWorksheetIdRef.current = ''
      const { sheet: s, data: d, columns: c, initialSnapshot: initialSnapshotForSheet } = propsRef.current
      let snapshotForInit: UniverWorkbookSnapshot
      const initializedFromProvidedSnapshot =
        Boolean(initialSnapshotForSheet && typeof initialSnapshotForSheet === 'object') && forceRowSnapshotSeed === 0
      try {
        if (initializedFromProvidedSnapshot) {
          snapshotForInit = initialSnapshotForSheet as UniverWorkbookSnapshot
          transformAvatarFormulasInSnapshot(snapshotForInit as unknown as Record<string, unknown>, c)
        } else {
          snapshotForInit = buildWorkbookSnapshot(s, d, c)
        }
      } catch (e) {
        console.error('[UniverSheetGrid] buildWorkbookSnapshot error:', e)
        return
      }
      contextRef.current = createUniverConversionContext(c, d)
      lastSyncedGridCellSignaturesRef.current = buildAuthoritativeCellSignatureMap(d, c)
      lastSyncedGridRowCountRef.current = getAuthoritativeGridRowExtent(d)
      lastSyncedGridColumnCountRef.current = c.filter(column => column.isVisible !== false).length
      lastProcessedAuthoritativeDataSyncTokenRef.current = props.authoritativeDataSyncToken ?? 0
      skipNextAuthoritativeSyncAfterSnapshotInitRef.current = initializedFromProvidedSnapshot

      const univerLocaleData =
        appLocale === 'de-DE'
          ? mergeLocales(UniverPresetSheetsCoreEnUS, UNIVER_DE_LOCALE)
          : mergeLocales(UniverPresetSheetsCoreEnUS)

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: univerLocaleData
        },
        presets: [
          UniverSheetsCorePreset({
            container: gridHostEl,
            customFontFamily: {
              override: true,
              list: supportedUniverFonts
            }
          })
        ]
      })

      const initDims = extractDimensionsFromSnapshot(snapshotForInit as unknown as Record<string, unknown>)
      if (initDims) cellDimensionsRef.current = initDims

      univerAPIRef.current = univerAPI
      try {
        univerAPI.createWorkbook(snapshotForInit as unknown as Record<string, unknown>)
        scheduleApplyGermanNumfmtLocale(univerAPI)
      } catch (error) {
        console.error('[UniverSheetGrid] createWorkbook error:', error)
        if (initialSnapshotForSheet && forceRowSnapshotSeed === 0) {
          console.warn('[UniverSheetGrid] Falling back to row-built snapshot after createWorkbook failure')
          setForceRowSnapshotSeed(Date.now())
        }
        univerAPI.dispose()
        univerAPIRef.current = null
        contextRef.current = null
        lastSyncedGridCellSignaturesRef.current = new Map()
        lastSyncedGridRowCountRef.current = 0
        lastSyncedGridColumnCountRef.current = 0
        lastProcessedAuthoritativeDataSyncTokenRef.current = props.authoritativeDataSyncToken ?? 0
        skipNextAuthoritativeSyncAfterSnapshotInitRef.current = false
        return
      }

      const getActiveWorksheetIdFromUniver = (): string | null => {
        try {
          const wb = univerAPIRef.current?.getActiveWorkbook?.() as
            | {
                getActiveSheet?: () => { getSheetId?: () => string }
              }
            | undefined
          const activeWorksheet = wb?.getActiveSheet?.()
          return activeWorksheet?.getSheetId?.() ?? null
        } catch {
          return null
        }
      }

      const selectCellInWorksheet = (worksheetId: string, row: number, col: number): void => {
        try {
          const wb = univerAPIRef.current?.getActiveWorkbook?.() as
            | {
                getSheetBySheetId?: (id: string) => {
                  getRange?: (row: number, col: number) => unknown
                  setActiveSelection?: (range: unknown) => unknown
                  setActiveRange?: (range: unknown) => unknown
                } | null
              }
            | undefined
          const worksheet = wb?.getSheetBySheetId?.(worksheetId)
          const range = worksheet?.getRange?.(row, col)
          if (!range) return
          ;(worksheet.setActiveSelection ?? worksheet.setActiveRange)?.(range)
          activeSelectionRef.current = { sheetId: worksheetId, row, col }
        } catch {
          /* ignore */
        }
      }

      const captureCopiedSelectionAnchor = (): void => {
        const workbook = univerAPIRef.current?.getActiveWorkbook?.()
        const worksheetId = getActiveWorksheetIdFromUniver()
        const cachedActive = activeSelectionRef.current
        const active =
          cachedActive && cachedActive.sheetId === worksheetId ? cachedActive : extractActiveRangePosition(workbook)
        if (!worksheetId || !active) return
        copiedSelectionAnchorRef.current = {
          sheetId: worksheetId,
          row: active.row,
          col: active.col,
          copiedAt: Date.now()
        }
      }

      const restoreCopiedSelectionAnchorOnSheetSwitch = (worksheetId: string): void => {
        const anchor = copiedSelectionAnchorRef.current
        if (!anchor || anchor.sheetId === worksheetId) return
        if (Date.now() - anchor.copiedAt > COPY_ORIGIN_RESTORE_WINDOW_MS) {
          copiedSelectionAnchorRef.current = null
          return
        }

        globalThis.setTimeout(() => {
          const latest = copiedSelectionAnchorRef.current
          if (!latest || latest.sheetId === worksheetId) return
          selectCellInWorksheet(worksheetId, latest.row, latest.col)
        }, 0)
      }

      const emitWorksheetFromUniver = () => {
        try {
          const wb = univerAPIRef.current?.getActiveWorkbook?.() as
            | {
                getActiveSheet?: () => { getSheetId?: () => string; getSheetName?: () => string }
              }
            | undefined
          const activeWorksheet = wb?.getActiveSheet?.()
          const worksheetId = activeWorksheet?.getSheetId?.()
          if (!worksheetId || worksheetId === lastEmittedWorksheetIdRef.current) return
          lastEmittedWorksheetIdRef.current = worksheetId
          const worksheetName =
            typeof activeWorksheet?.getSheetName === 'function' ? activeWorksheet.getSheetName() : ''
          restoreCopiedSelectionAnchorOnSheetSwitch(worksheetId)
          callbacksRef.current.onActiveWorksheetChange?.(worksheetId, worksheetName)
        } catch {
          /* ignore */
        }
      }

      univerBootstrapCompleteRef.current = false
      queueMicrotask(() => {
        try {
          const wb = univerAPI.getActiveWorkbook?.() as { setActiveSheet?: (id: string) => void } | undefined
          wb?.setActiveSheet?.(s.id)
        } catch {
          /* ignore */
        }
        emitWorksheetFromUniver()
      })
      // Short delay: swallow any insert-sheet/set-worksheet-name mutations that
      // fire during Univer's bootstrap before we start forwarding them to the
      // backend. 500ms is generous; user sheet creation happens only on click.
      const bootstrapSettleTimer = globalThis.setTimeout(() => {
        univerBootstrapCompleteRef.current = true
      }, 500)
      const canvasHealthTimeout = globalThis.setTimeout(() => {
        const host = containerRef.current
        const hasCanvas = Boolean(host?.querySelector('canvas'))
        if (hasCanvas) return
        if (!initialSnapshotForSheet || forceRowSnapshotSeed !== 0) return
        console.warn('[UniverSheetGrid] No canvas after snapshot bootstrap; retrying with row-built snapshot', {
          sheetId: s.id,
          columns: c.length,
          rows: d.length
        })
        setForceRowSnapshotSeed(Date.now())
      }, 1500)

      // Re-read from Univer after it hydrates (handles column/row resizes, Excel imports, etc.)
      const updateCellDimensions = (): { changed: boolean; dimensions: SnapshotDimensions | null } => {
        try {
          const wb = univerAPIRef.current?.getActiveWorkbook() as unknown as {
            save?: () => Record<string, unknown>
            getSnapshot?: () => Record<string, unknown>
          } | null
          const snap = wb?.save?.() ?? wb?.getSnapshot?.()
          const d = snap ? extractDimensionsFromSnapshot(snap) : null
          if (!d) return { changed: false, dimensions: null }
          const changed = !areSnapshotDimensionsEqual(cellDimensionsRef.current, d)
          cellDimensionsRef.current = d
          if (changed) {
            refreshCursorRectsRef.current?.()
            refreshCommentRectsRef.current?.()
          }
          return { changed, dimensions: d }
        } catch {
          return { changed: false, dimensions: null }
        }
      }
      updateCellDimensionsRef.current = updateCellDimensions
      setTimeout(updateCellDimensions, 200)

      const SNAPSHOT_TIMEOUT_MS = 10000
      /** Shorter throttle so formatting-heavy sessions hit the server before users close the tab. */
      const AUTO_SNAPSHOT_THROTTLE_MS = 2000
      const AUTO_SNAPSHOT_MAX_WAIT_MS = 12000
      const requestSnapshotCheckpoint = (force = false) => {
        const onSnapshotRequestedCb = callbacksRef.current.onSnapshotRequested
        if (!onSnapshotRequestedCb) return
        if (!force && !isDirtyRef.current) return
        if (snapshotRequestInFlightRef.current) {
          snapshotRequestQueuedRef.current = true
          return
        }
        if (snapshotCheckpointTimerRef.current) {
          clearTimeout(snapshotCheckpointTimerRef.current)
          snapshotCheckpointTimerRef.current = null
        }
        snapshotCheckpointScheduledAtRef.current = null
        try {
          callbacksRef.current.onWorkbookSnapshotLifecycle?.({ phase: 'checkpoint_scheduled' })
          snapshotLastRequestedAtRef.current = Date.now()
          const result = onSnapshotRequestedCb()
          const promise = Promise.resolve(result) as Promise<void>
          snapshotRequestInFlightRef.current = promise
          const timeoutId = setTimeout(() => {
            if (snapshotRequestInFlightRef.current === promise) {
              snapshotRequestInFlightRef.current = null
              flushQueuedSnapshotRequest()
            }
          }, SNAPSHOT_TIMEOUT_MS)
          void promise
            .then(() => {
              isDirtyRef.current = false
              hasEditedRef.current = false
              snapshotFirstDirtyAtRef.current = null
              callbacksRef.current.onWorkbookSnapshotLifecycle?.({ phase: 'checkpoint_settled', ok: true })
            })
            .catch(() => {
              callbacksRef.current.onWorkbookSnapshotLifecycle?.({ phase: 'checkpoint_settled', ok: false })
              // Keep dirty; we'll retry on the next trigger.
              scheduleSnapshotCheckpoint(AUTO_SNAPSHOT_THROTTLE_MS)
            })
            .finally(() => {
              clearTimeout(timeoutId)
              snapshotRequestInFlightRef.current = null
              flushQueuedSnapshotRequest()
            })
        } catch {
          // Keep dirty
          callbacksRef.current.onWorkbookSnapshotLifecycle?.({ phase: 'checkpoint_settled', ok: false })
          scheduleSnapshotCheckpoint(AUTO_SNAPSHOT_THROTTLE_MS)
          flushQueuedSnapshotRequest()
        }
      }
      // Pace frontend snapshot saves, but guarantee they are emitted within a bounded
      // window while the workbook stays dirty.
      const scheduleSnapshotCheckpoint = (preferredDelayMs = AUTO_SNAPSHOT_THROTTLE_MS) => {
        const onSnapshotRequestedCb = callbacksRef.current.onSnapshotRequested
        if (!onSnapshotRequestedCb || !isDirtyRef.current) return

        const now = Date.now()
        if (snapshotFirstDirtyAtRef.current == null) {
          snapshotFirstDirtyAtRef.current = now
        }
        const earliestAllowedAt = snapshotLastRequestedAtRef.current + AUTO_SNAPSHOT_THROTTLE_MS
        const preferredAt = now + Math.max(0, preferredDelayMs)
        const maxWaitAt = snapshotFirstDirtyAtRef.current + AUTO_SNAPSHOT_MAX_WAIT_MS
        const dueAt = Math.min(maxWaitAt, Math.max(earliestAllowedAt, preferredAt))

        if (
          snapshotCheckpointTimerRef.current &&
          snapshotCheckpointScheduledAtRef.current != null &&
          snapshotCheckpointScheduledAtRef.current <= dueAt
        ) {
          return
        }
        if (snapshotCheckpointTimerRef.current) {
          clearTimeout(snapshotCheckpointTimerRef.current)
        }
        snapshotCheckpointScheduledAtRef.current = dueAt
        snapshotCheckpointTimerRef.current = setTimeout(
          () => {
            snapshotCheckpointTimerRef.current = null
            snapshotCheckpointScheduledAtRef.current = null
            requestSnapshotCheckpoint(true)
          },
          Math.max(0, dueAt - Date.now())
        )
        callbacksRef.current.onWorkbookSnapshotLifecycle?.({ phase: 'checkpoint_scheduled' })
      }
      requestSnapshotCheckpointRef.current = requestSnapshotCheckpoint
      scheduleSnapshotCheckpointRef.current = scheduleSnapshotCheckpoint
      const markDirtyAndScheduleSnapshot = () => {
        isDirtyRef.current = true
        hasEditedRef.current = true
        scheduleSnapshotCheckpoint()
      }
      const handleDetectedCellMutation = ({
        source,
        payloadCellValue,
        ranges
      }: {
        source: 'sheet-value-changed' | 'command-executed' | 'selection-reconcile' | 'sheet-edit-ended'
        payloadCellValue: SheetCellMatrix | undefined
        ranges: SheetRangeShape[]
      }): boolean => {
        const workbook = univerAPIRef.current?.getActiveWorkbook()
        const worksheet = workbook?.getActiveSheet()
        // Prefer reading the post-mutation value directly from the worksheet. Some
        // mutation payloads can still carry the previous cell value, which causes live
        // collaboration to briefly show stale data until the later authoritative
        // persistence broadcast arrives.
        const worksheetCellValue = deriveCellMatrixFromRanges(worksheet, ranges)
        const baseCellValue = buildAbsoluteCellMatrixForRanges(ranges, worksheetCellValue, payloadCellValue)
        if (!baseCellValue) {
          return false
        }
        // Preserve formulas across both user-typed edits (payload carries `{f, v}`
        // but `worksheetCellValue` overwrote it with the rendered scalar) and
        // recompute echoes (payload carries only `v`; live worksheet still has
        // `f`). Without this, persistence drops `f` and reload shows only the
        // computed value — also leaking to collaborators.
        const cellValue = enrichCellMatrixWithLiveFormulas(worksheet, baseCellValue, payloadCellValue)

        const rowOffset = 0
        const colOffset = 0
        const now = Date.now()
        pruneExpiredRecentMutationEntries(recentLocallyMutatedGridCellsRef.current, now)
        const shouldSuppress = (globalRowIndex: number, globalColIndex: number, value: unknown): boolean => {
          const key = remoteEchoKey(globalRowIndex, globalColIndex)
          const entry = remoteEchoSuppressionRef.current.get(key)
          if (!entry) return false
          if (now > entry.expiresAt) {
            remoteEchoSuppressionRef.current.delete(key)
            return false
          }
          return entry.signatures.has(normalizeBlankLikeEchoSignature(toEchoSignature(value)))
        }

        let hasNonSuppressedCell = false
        for (const rowKey of Object.keys(cellValue)) {
          const rowIndex = Number(rowKey)
          if (Number.isNaN(rowIndex)) continue
          const rowCells = cellValue[rowIndex]
          if (!rowCells || typeof rowCells !== 'object') continue
          const globalRowIndex = rowIndex + rowOffset
          for (const colKey of Object.keys(rowCells)) {
            const colIndex = Number(colKey)
            if (Number.isNaN(colIndex)) continue
            const globalColIndex = colIndex + colOffset
            const cell = rowCells[colIndex]
            if (!shouldSuppress(globalRowIndex, globalColIndex, cell)) {
              hasNonSuppressedCell = true
              break
            }
          }
          if (hasNonSuppressedCell) break
        }

        if (!hasNonSuppressedCell) {
          return false
        }

        if (source === 'selection-reconcile') {
          let allCellsWereRecentlyMutatedLocally = true
          for (const rowKey of Object.keys(cellValue)) {
            const rowIndex = Number(rowKey)
            if (Number.isNaN(rowIndex)) continue
            const rowCells = cellValue[rowIndex]
            if (!rowCells || typeof rowCells !== 'object') continue
            for (const colKey of Object.keys(rowCells)) {
              const colIndex = Number(colKey)
              if (Number.isNaN(colIndex)) continue
              const key = remoteEchoKey(rowIndex + rowOffset, colIndex + colOffset)
              const expiresAt = recentLocallyMutatedGridCellsRef.current.get(key) ?? 0
              if (expiresAt <= now) {
                allCellsWereRecentlyMutatedLocally = false
                break
              }
            }
            if (!allCellsWereRecentlyMutatedLocally) break
          }
          if (allCellsWereRecentlyMutatedLocally) {
            return false
          }
        }

        if (source === 'selection-reconcile') {
          let hasAuthoritativeDiff = false
          for (const rowKey of Object.keys(cellValue)) {
            const rowIndex = Number(rowKey)
            if (Number.isNaN(rowIndex)) continue
            const rowCells = cellValue[rowIndex]
            if (!rowCells || typeof rowCells !== 'object') continue
            for (const colKey of Object.keys(rowCells)) {
              const colIndex = Number(colKey)
              if (Number.isNaN(colIndex)) continue
              const nextSignature = normalizeSelectionReconcileSignature(toEchoSignature(rowCells[colIndex]))
              const authoritativeSignature = normalizeSelectionReconcileSignature(
                lastSyncedGridCellSignaturesRef.current.get(remoteEchoKey(rowIndex, colIndex))
              )
              if (authoritativeSignature !== nextSignature) {
                hasAuthoritativeDiff = true
                break
              }
            }
            if (hasAuthoritativeDiff) break
          }

          if (!hasAuthoritativeDiff) {
            return false
          }
        }

        lastCellValueMutationAtRef.current = now
        const {
          onCellChange: onCellChangeCb,
          onCellsChange: onCellsChangeCb,
          onDataChange: onDataChangeCb
        } = callbacksRef.current

        // In multi-sheet workbook mode Univer may report a mutation on any
        // worksheet it holds in memory, not just the one mirrored via props.
        // Resolve the mutation's *actual* sheet id and build its context
        // on-the-fly so rowIndex→rowId and colIndex→columnName mapping targets
        // the correct sheet. Falls back to the single-sheet contextRef when no
        // resolver is provided or the active sheet matches props.
        const univerActiveSheetId = worksheet?.getSheetId?.() ?? null
        const propSheetId = propsRef.current.sheet.id
        const targetSheetId =
          propsRef.current.multiSheetWorkbookMode && univerActiveSheetId ? univerActiveSheetId : propSheetId
        const useResolvedContext =
          propsRef.current.multiSheetWorkbookMode &&
          typeof propsRef.current.getSheetContext === 'function' &&
          targetSheetId !== propSheetId

        let ctxBefore = contextRef.current
        let contextColumns = propsRef.current.columns
        let currentData = propsRef.current.data
        if (useResolvedContext) {
          const resolved = propsRef.current.getSheetContext?.(targetSheetId) ?? null
          if (resolved) {
            contextColumns = resolved.columns
            currentData = resolved.data
            ctxBefore = createUniverConversionContext(resolved.columns, resolved.data)
          }
        }
        if (!ctxBefore) return false
        const newRowIndices = getNewRowIndices(cellValue, ctxBefore, rowOffset)
        const pendingNewRowsUpdate =
          newRowIndices.length > 0 && onDataChangeCb
            ? (() => {
                const newRows = buildNewRowsFromCellMatrix({
                  newRowIndices,
                  cellValue,
                  ctx: ctxBefore,
                  colOffset,
                  rowOffset,
                  getClientRowId: (globalRowIndex: number) =>
                    getOrCreateClientRowId(globalRowIndex, newRowClientIdByIndexRef.current)
                })
                const nextData = [...currentData, ...newRows]
                const nextContext = overlaySparseRowIndexMappings(
                  createUniverConversionContext(contextColumns, nextData),
                  newRowIndices.map(rowIndex => {
                    const globalRowIndex = rowIndex + rowOffset
                    return {
                      rowIndex: globalRowIndex,
                      rowId: getOrCreateClientRowId(globalRowIndex, newRowClientIdByIndexRef.current)
                    }
                  })
                )
                return { nextData, nextContext }
              })()
            : null

        const ctx = pendingNewRowsUpdate?.nextContext ?? ctxBefore
        const changedCells = collectChangedCells({ cellValue, ctx, rowOffset, colOffset, shouldSuppress })
        const collabEntries =
          propsRef.current.collaborationEnabled && propsRef.current.onOperationEmit
            ? collectCollabWireEntries({ cellValue, ctx, rowOffset, colOffset, shouldSuppress })
            : []

        if (changedCells.length === 0 && collabEntries.length === 0) {
          return false
        }

        if (pendingNewRowsUpdate && onDataChangeCb && changedCells.length > 0) {
          onDataChangeCb(pendingNewRowsUpdate.nextData, targetSheetId)
          // Only materialize inferred rows after we confirmed a real cell mutation.
          // Skip overwriting contextRef when the mutation targeted a non-active
          // sheet; contextRef represents the active sheet's ctx for single-sheet
          // paths and rebuilding it with the wrong sheet's data would break
          // subsequent active-sheet mutations.
          if (!useResolvedContext) {
            contextRef.current = pendingNewRowsUpdate.nextContext
          }
        }

        const signature =
          changedCells.length > 0
            ? buildChangedCellSignature(changedCells)
            : `collab:${buildCollabWireSignature(collabEntries, cellValue)}`
        for (const [existingSignature, at] of recentLocalMutationSignaturesRef.current.entries()) {
          if (now - at > 1500) {
            recentLocalMutationSignaturesRef.current.delete(existingSignature)
          }
        }
        if (recentLocalMutationSignaturesRef.current.has(signature)) return true
        recentLocalMutationSignaturesRef.current.set(signature, now)
        if (source !== 'selection-reconcile') {
          for (const rowKey of Object.keys(cellValue)) {
            const rowIndex = Number(rowKey)
            if (Number.isNaN(rowIndex)) continue
            const rowCells = cellValue[rowIndex]
            if (!rowCells || typeof rowCells !== 'object') continue
            for (const colKey of Object.keys(rowCells)) {
              const colIndex = Number(colKey)
              if (Number.isNaN(colIndex)) continue
              recentLocallyMutatedGridCellsRef.current.set(
                remoteEchoKey(rowIndex + rowOffset, colIndex + colOffset),
                now + SELECTION_RECONCILE_LOCAL_EDIT_SUPPRESSION_MS
              )
            }
          }
        }

        // Seed `lastSyncedGridCellSignaturesRef` with each locally-mutated cell's
        // post-edit signature before `onCellsChangeCb` triggers the parent's
        // `commitLocalSheetData` → `authoritativeDataSyncToken` bump → authoritative
        // re-apply effect (the one around `applyRemoteCellUpdate` / `setValue`
        // below). Without this seed, the effect's `previousSignatures` cache still
        // holds the pre-edit baseline for these exact cells, the "signature
        // unchanged" fast-path falls through, and `applyRemoteCellUpdate` re-dispatches
        // Univer's `SetRangeValuesMutation` for a cell Univer already has in the
        // just-typed state. That redundant mutation forces a full cell/grid
        // redraw — observable as the whole-grid flicker on first-keystroke in
        // column A, on drag-fill series expansion, and on fast typing bursts
        // (each burst adds a new "existing row was mutated" commit whose re-apply
        // then re-writes every just-typed cell). We only seed when the mutation
        // targets the sheet this grid is currently rendering, because the
        // signature cache + re-apply effect are scoped to the active sheet's
        // data/columns and a non-active mutation would corrupt the active
        // sheet's diff baseline.
        if (!useResolvedContext && changedCells.length > 0) {
          for (const cell of changedCells) {
            lastSyncedGridCellSignaturesRef.current.set(
              remoteEchoKey(cell.univerRow, cell.univerCol),
              toEchoSignature(cell.value)
            )
          }
        }

        const emitCollabIfNeeded = (): void => {
          const { collaborationEnabled, onOperationEmit } = propsRef.current
          if (!collaborationEnabled || !onOperationEmit || collabEntries.length === 0) return
          const snap = getWorkbookSnapshotRef.current?.() ?? null
          const facadeWb = univerAPIRef.current?.getActiveWorkbook?.() ?? null
          const wire = buildCollabCellsChangedPayload({
            sheetId: targetSheetId,
            entries: collabEntries,
            workbookSnapshot: snap,
            facadeWorkbook: facadeWb
          })
          if (wire.length === 0) return
          onOperationEmit({
            type: 'cells_changed',
            data: { sheetId: targetSheetId, cells: wire },
            broadcastOnly: true
          } as DocumentOperation)
        }

        let handledPersistable = false
        if (changedCells.length > 0) {
          // Attach the resolved sheetId to every emitted cell so downstream
          // batch grouping routes to the correct backend sheet, regardless of
          // which sheet React currently considers active.
          const stampedCells = changedCells.map(cell => ({ ...cell, sheetId: targetSheetId }))
          if (onCellsChangeCb) {
            onCellsChangeCb(stampedCells)
            handledPersistable = true
          } else if (onCellChangeCb) {
            for (const cell of stampedCells) {
              onCellChangeCb(cell.rowId, cell.columnName, cell.value, targetSheetId)
            }
            handledPersistable = true
          }
        }

        emitCollabIfNeeded()

        return handledPersistable || collabEntries.length > 0
      }
      const reconcileSingleCell = (
        row: number | undefined,
        col: number | undefined,
        source: 'selection-reconcile' | 'sheet-edit-ended'
      ): void => {
        if (typeof row !== 'number' || typeof col !== 'number') return
        handleDetectedCellMutation({
          source,
          payloadCellValue: undefined,
          ranges: [
            {
              startRow: row,
              endRow: row,
              startColumn: col,
              endColumn: col
            }
          ]
        })
      }
      const handleSheetScroll = (scrollLeft: number, scrollTop: number) => {
        sheetScrollRef.current = { scrollLeft, scrollTop }
        refreshCursorRectsRef.current?.()
        refreshCommentRectsRef.current?.()
      }
      let scrollStateReadBlockedUntil = 0
      const syncScrollFromWorksheet = () => {
        if (Date.now() < scrollStateReadBlockedUntil) return
        const workbook = univerAPI.getActiveWorkbook?.()
        const worksheet = workbook?.getActiveSheet?.()
        if (!worksheet) return
        const dims = cellDimensionsRef.current
        const zoom = dims?.zoomRatio ?? 1
        const getColumnWidth = (c: number): number =>
          (dims?.columnData[c]?.w ?? dims?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX) * zoom
        const getRowHeight = (r: number): number =>
          (dims?.rowData[r]?.h ?? dims?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX) * zoom
        let scrollState:
          | {
              sheetViewStartRow?: number
              sheetViewStartColumn?: number
              offsetX?: number
              offsetY?: number
            }
          | undefined
        try {
          scrollState = (
            worksheet as
              | {
                  getScrollState?: () => {
                    sheetViewStartRow?: number
                    sheetViewStartColumn?: number
                    offsetX?: number
                    offsetY?: number
                  }
                }
              | undefined
          )?.getScrollState?.()
        } catch {
          // Univer can throw while DI graph is still bootstrapping; retry shortly.
          scrollStateReadBlockedUntil = Date.now() + 500
          return
        }
        if (!scrollState) return
        const startCol = Math.max(0, scrollState.sheetViewStartColumn ?? 0)
        const startRow = Math.max(0, scrollState.sheetViewStartRow ?? 0)
        let left = 0
        let top = 0
        for (let c = 0; c < startCol; c++) left += getColumnWidth(c)
        for (let r = 0; r < startRow; r++) top += getRowHeight(r)
        left += (scrollState.offsetX ?? 0) * zoom
        top += (scrollState.offsetY ?? 0) * zoom
        if (Number.isFinite(left) && Number.isFinite(top)) {
          handleSheetScroll(left, top)
        }
      }
      // Seed initial scroll and keep in sync through events + lightweight polling fallback.
      syncScrollFromWorksheet()
      const scrollEventName = (univerAPI as { Event?: { Scroll?: string } }).Event?.Scroll ?? 'Scroll'
      const scrollEventDisposable = (
        univerAPI as {
          addEvent?(
            event: string,
            cb: (p: {
              sheetViewStartRow?: number
              sheetViewStartColumn?: number
              offsetX?: number
              offsetY?: number
            }) => void
          ): { dispose(): void }
        }
      ).addEvent?.(scrollEventName, () => {
        syncScrollFromWorksheet()
      })
      const activeWorksheet = univerAPI.getActiveWorkbook?.()?.getActiveSheet?.()
      const worksheetScrollDisposable = (
        activeWorksheet as {
          onScroll?: (cb: (s: unknown) => void) => { dispose(): void }
        }
      )?.onScroll?.(() => {
        syncScrollFromWorksheet()
      })
      const scrollPollIntervalId = setInterval(syncScrollFromWorksheet, 120)
      const activeWorksheetPollIntervalId = props.multiSheetWorkbookMode
        ? setInterval(emitWorksheetFromUniver, 150)
        : null

      // Univer's native sheet bar "+" button dispatches `sheet.command.insert-sheet`
      // without a sheet id, so Univer auto-generates a short random id (non-UUID).
      // Our backend validates `CreateSheetDto.id` as `@IsUUID()` and the
      // `spreadsheet_sheets.id` column is a Postgres uuid. Injecting a UUID into
      // `params.sheet.id` *before* the command handler runs keeps the Univer
      // worksheet id and the backend row id identical without any BE schema change.
      // The facade re-emits `r.params` by reference (see @univerjs/core facade.js),
      // so mutating `event.params.sheet.id` here is observed by the command handler.
      const beforeCommandEventKey =
        (univerAPI as { Event?: { BeforeCommandExecute?: string } }).Event?.BeforeCommandExecute ??
        'BeforeCommandExecute'
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const generateSheetUuid = (): string => {
        const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
        if (cryptoRef?.randomUUID) return cryptoRef.randomUUID()
        return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, ch => {
          const r = (Math.random() * 16) | 0
          const v = ch === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      }
      const beforeCommandDisposable = (
        univerAPI as {
          addEvent?(
            event: string,
            cb: (p: { id?: string; params?: unknown; cancel?: boolean }) => void
          ): { dispose(): void }
        }
      ).addEvent?.(beforeCommandEventKey, event => {
        if (event?.id !== 'sheet.command.insert-sheet') return
        const params = event.params as { unitId?: string; index?: number; sheet?: { id?: unknown } } | undefined
        const newId = generateSheetUuid()
        if (!params) {
          // Univer's native "+" button in the sheet bar dispatches the command with
          // `params === undefined`. We can't mutate `undefined`, so cancel the
          // original dispatch and re-execute immediately with explicit params.
          // The re-dispatch re-enters this hook but takes the "already a UUID"
          // fast path and proceeds normally.
          // Pin `index` to the current sheet count so the new tab appends to
          // the end, and precompute a unique "Sheet N" name instead of letting
          // Univer fall back to its internal counter (which can yield odd names
          // like "Sheet11" depending on prior attempts).
          event.cancel = true
          const workbook = (
            univerAPI as {
              getActiveWorkbook?: () =>
                | {
                    getSheets?: () => Array<{
                      getName?: () => string
                      getMaxColumns?: () => number
                      getMaxRows?: () => number
                    }>
                  }
                | null
                | undefined
            }
          ).getActiveWorkbook?.()
          const existingSheets = workbook?.getSheets?.() ?? []
          const existingNames = new Set(
            existingSheets.map(s => (typeof s?.getName === 'function' ? s.getName() : '')).filter(Boolean)
          )
          let candidate = existingSheets.length + 1
          let nextName = `Sheet${candidate}`
          while (existingNames.has(nextName)) {
            candidate += 1
            nextName = `Sheet${candidate}`
          }
          // Univer's DEFAULT_WORKSHEET_COLUMN_COUNT is 20 (A–T) and DEFAULT_WORKSHEET_ROW_COUNT
          // is 1000. When we re-dispatch without explicit dimensions, the new sheet gets those
          // defaults — which visibly shrinks the column range to T on brand-new tabs compared
          // to existing sheets that were bootstrapped with 26+ columns. Mirror the first
          // existing sheet's dimensions so new tabs feel consistent with the rest of the book.
          const referenceSheet = existingSheets[0]
          const referenceColumnCount =
            typeof referenceSheet?.getMaxColumns === 'function' ? referenceSheet.getMaxColumns() : 0
          const referenceRowCount = typeof referenceSheet?.getMaxRows === 'function' ? referenceSheet.getMaxRows() : 0
          const newColumnCount = Math.max(referenceColumnCount, 26)
          const newRowCount = Math.max(referenceRowCount, 1000)
          const rerun = (univerAPI as { executeCommand?: (id: string, p: unknown) => unknown }).executeCommand
          if (typeof rerun === 'function') {
            queueMicrotask(() => {
              try {
                rerun.call(univerAPI, 'sheet.command.insert-sheet', {
                  index: existingSheets.length,
                  sheet: {
                    id: newId,
                    name: nextName,
                    columnCount: newColumnCount,
                    rowCount: newRowCount
                  }
                })
                // Univer's `sheet.command.insert-sheet` handler inserts the
                // worksheet but does NOT activate it — only the facade
                // `fWorkbook.insertSheet()` helper follows up with a separate
                // set-active-sheet operation. Because we had to cancel the
                // original "+" click to inject a UUID, that follow-up never
                // runs and the sheet bar keeps the OLD tab highlighted. Flip
                // the active sheet here so the user sees the new tab
                // immediately (and so the React-side setActiveSheetId flip in
                // `handleUniverSheetInserted` doesn't fight Univer: the sync
                // effect in this component would otherwise call
                // setActiveSheet(newId) a tick later and cause a visible
                // flicker on the very first cell edit).
                const activeWb = (
                  univerAPI as {
                    getActiveWorkbook?: () => { setActiveSheet?: (idOrSheet: string) => unknown } | null | undefined
                  }
                ).getActiveWorkbook?.()
                activeWb?.setActiveSheet?.(newId)
              } catch (err) {
                console.warn('[UniverSheetGrid] failed to re-dispatch insert-sheet with UUID', err)
              }
            })
          }
          return
        }
        if (!params.sheet) {
          ;(params as { sheet?: { id?: unknown } }).sheet = { id: newId }
          return
        }
        const existing = params.sheet.id
        if (typeof existing === 'string' && UUID_REGEX.test(existing)) return
        params.sheet.id = newId
      })

      const commandEventKey =
        (univerAPI as { Event?: { CommandExecuted?: string } }).Event?.CommandExecuted ?? 'CommandExecuted'
      const commandDisposable = (
        univerAPI as {
          addEvent?(
            event: string,
            cb: (p: { type?: number; id?: string; commandId?: string; params?: unknown }) => void
          ): { dispose(): void }
        }
      ).addEvent?.(commandEventKey, (event: { type?: number; id?: string; commandId?: string; params?: unknown }) => {
        const commandId = String(event?.id ?? event?.commandId ?? '').toLowerCase()
        const params = event?.params as
          | {
              cellValue?: unknown
              range?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
            }
          | undefined
        if (commandId.includes('copy') && !commandId.includes('paste')) {
          captureCopiedSelectionAnchor()
        }
        if (commandId.includes('comment') || commandId.includes('thread')) {
          callbacksRef.current.onOpenCommentRequest?.()
        }
        queueMicrotask(emitWorksheetFromUniver)

        // Propagate Univer's native sheet lifecycle (via its + / right-click /
        // double-click handlers) back to the host so the backend can persist a
        // matching SpreadsheetSheet row. We listen on MUTATIONs because only the
        // final committed form carries the full sheet payload / id.
        if (univerBootstrapCompleteRef.current && event?.type === UNIVER_COMMAND_TYPE_MUTATION) {
          if (commandId === 'sheet.mutation.insert-sheet') {
            const p = event.params as
              | {
                  index?: number
                  sheet?: { id?: string; name?: string }
                }
              | undefined
            const sheetId = p?.sheet?.id
            if (sheetId && !recentSheetMutationIdsRef.current.has(`ins:${sheetId}`)) {
              recentSheetMutationIdsRef.current.add(`ins:${sheetId}`)
              callbacksRef.current.onUniverSheetInserted?.({
                sheetId,
                sheetName: p?.sheet?.name ?? 'Sheet',
                index: p?.index ?? 0
              })
            }
          } else if (commandId === 'sheet.mutation.remove-sheet') {
            const p = event.params as { subUnitId?: string } | undefined
            const sheetId = p?.subUnitId
            if (sheetId && !recentSheetMutationIdsRef.current.has(`rm:${sheetId}`)) {
              recentSheetMutationIdsRef.current.add(`rm:${sheetId}`)
              callbacksRef.current.onUniverSheetRemoved?.({ sheetId })
            }
          } else if (commandId === 'sheet.mutation.set-worksheet-name') {
            const p = event.params as { subUnitId?: string; name?: string } | undefined
            if (p?.subUnitId && typeof p.name === 'string') {
              callbacksRef.current.onUniverSheetRenamed?.({ sheetId: p.subUnitId, sheetName: p.name })
            }
          }
        }
        if (readOnlyRef.current) return
        if (isApplyingRemoteUpdateRef.current) return

        const t = event?.type
        const commandPayloadCellValue = normalizeCellMatrix(params?.cellValue)
        const commandRanges = Array.isArray(params?.range) ? params.range : []
        if (
          t === UNIVER_COMMAND_TYPE_MUTATION &&
          (commandPayloadCellValue || commandRanges.length > 0) &&
          !isStyleOnlySheetMutationCommand(commandId)
        ) {
          handleDetectedCellMutation({
            source: 'command-executed',
            payloadCellValue: commandPayloadCellValue,
            ranges: commandRanges
          })
        }

        const { changed: dimensionsChanged, dimensions } = updateCellDimensions()
        if (dimensionsChanged) {
          if (dimensions) {
            callbacksRef.current.onDimensionsChange?.(toCellDimensionsPayload(dimensions))
          }
          markDirtyAndScheduleSnapshot()
        }
        // Only MUTATION (type 2) represents an actual data change. COMMAND (type 0)
        // includes selection/navigation commands which must not trigger snapshots.
        const shouldCheckpointSnapshot = shouldScheduleSnapshotForMutation({
          commandType: t,
          mutationCommandType: UNIVER_COMMAND_TYPE_MUTATION,
          commandId,
          params,
          now: Date.now(),
          lastCellValueMutationAt: lastCellValueMutationAtRef.current
        })
        if (shouldCheckpointSnapshot) {
          markDirtyAndScheduleSnapshot()
          if (isStyleOnlySheetMutationCommand(commandId)) {
            queueMicrotask(() => requestSnapshotCheckpoint(true))
          }
        }
      })
      const eventKey =
        (univerAPI as { Event?: { SheetValueChanged?: string } }).Event?.SheetValueChanged ?? 'SheetValueChanged'
      const valueChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.(eventKey, (rawParams: unknown) => {
        if (readOnlyRef.current) return
        // Suppress re-entry while applyRemoteCellUpdate is writing into Univer.
        // Without this guard, the setValue() inside applyRemoteCellUpdate re-enters
        // handleDetectedCellMutation and causes a redundant HTTP persist and/or a
        // style-only cells_changed rebroadcast, which in turn triggers another merge
        // on the peer tab and produces the "delete echo" ping-pong.
        if (isApplyingRemoteUpdateRef.current) return
        const params = rawParams as {
          effectedRanges?: Array<{
            getRange?: () => { startRow: number; endRow: number; startColumn: number; endColumn: number }
          }>
          payload?: {
            id?: string
            params?: {
              cellValue?: Record<number, Record<number, { v?: unknown }>>
              range?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
            }
          }
        }
        const payload = params?.payload
        const preserveUndefinedAsNull = isClearLikeMutationCommand(String(payload?.id ?? ''))
        let cellValue = normalizeCellMatrix(payload?.params?.cellValue)
        const workbook = univerAPIRef.current?.getActiveWorkbook()
        const worksheet = workbook?.getActiveSheet()
        const ranges = (payload?.params?.range ??
          params.effectedRanges?.map(r => r.getRange?.()).filter(Boolean) ??
          []) as Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>

        if (preserveUndefinedAsNull) {
          cellValue = deriveCellMatrixFromRanges(worksheet, ranges, 10000, true)
        } else if (!cellValue) {
          // Fallback: derive changed values from effected ranges when mutation payload
          // does not provide `cellValue` (observed in some Univer command variants).
          cellValue = deriveCellMatrixFromRanges(worksheet, ranges)
        }
        if (!cellValue) return
        // Formula preservation happens centrally inside handleDetectedCellMutation
        // (covers both this path and the command-executed path).
        handleDetectedCellMutation({
          source: 'sheet-value-changed',
          payloadCellValue: cellValue,
          ranges
        })
      })
      const sheetEditEndedEventKey =
        (univerAPI as { Event?: { SheetEditEnded?: string } }).Event?.SheetEditEnded ?? 'SheetEditEnded'
      const sheetEditEndedDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.(sheetEditEndedEventKey, (rawParams: unknown) => {
        if (readOnlyRef.current) return
        const params = rawParams as
          | {
              row?: number
              col?: number
              startRow?: number
              startColumn?: number
              cell?: { row?: number; col?: number; actualRow?: number; actualColumn?: number }
              range?: { startRow?: number; startColumn?: number }
            }
          | undefined
        const cell = params?.cell
        const range = params?.range
        // Never fall back to the current active selection here. After a slow edit ends,
        // Univer may already have moved selection to the next cell, which can duplicate
        // the just-typed value into a neighbor. Selection-based reconciliation runs separately.
        const row = cell?.actualRow ?? cell?.row ?? params?.row ?? params?.startRow ?? range?.startRow
        const col = cell?.actualColumn ?? cell?.col ?? params?.col ?? params?.startColumn ?? range?.startColumn
        reconcileSingleCell(row, col, 'sheet-edit-ended')
      })
      const selectionEventKey =
        (univerAPI as { Event?: { SelectionMoveEnd?: string } }).Event?.SelectionMoveEnd ?? 'SelectionMoveEnd'

      let pendingCursorEmitTimeoutId: ReturnType<typeof setTimeout> | null = null
      let pendingCursorSelectionSyncTimeoutId: ReturnType<typeof setTimeout> | null = null

      // Emits cursor position using A1 notation (cellRef) as the primary coordinate.
      // row:/col: entries are kept for backward compatibility.
      const emitCursorByRowCol = (sheetId: string, startRow: number, startColumn: number) => {
        activeSelectionRef.current = { sheetId, row: startRow, col: startColumn }
        const onCursorEmitCb = callbacksRef.current.onCursorEmit
        if (!onCursorEmitCb) return
        const a1 = toA1Reference(startRow, startColumn)
        const path = [`cellRef:${a1}`, `row:${startRow}`, `col:${startColumn}`]
        const signature = path.join('|')
        if (lastEmittedCursorPathRef.current === signature) return
        lastEmittedCursorPathRef.current = signature
        onCursorEmitCb({ path })
      }
      const emitCursorFromWorksheetSelection = () => {
        const workbook = univerAPIRef.current?.getActiveWorkbook?.()
        const worksheet = workbook?.getActiveSheet?.()
        const worksheetId = (worksheet as { getSheetId?: () => string } | undefined)?.getSheetId?.()
        if (!worksheetId) return
        const selection = (
          worksheet as { getSelection?: () => { getCurrentCell?: () => unknown } | null } | undefined
        )?.getSelection?.()
        const currentCell = selection?.getCurrentCell?.() as
          | { actualRow?: number; actualColumn?: number; row?: number; column?: number }
          | undefined
        const row = currentCell?.actualRow ?? currentCell?.row
        const col = currentCell?.actualColumn ?? currentCell?.column
        if (typeof row === 'number' && typeof col === 'number') {
          const previous = activeSelectionRef.current
          if (previous && previous.sheetId === worksheetId && (previous.row !== row || previous.col !== col)) {
            reconcileSingleCell(previous.row, previous.col, 'selection-reconcile')
          }
          emitCursorByRowCol(worksheetId, row, col)
          return
        }
        const fromRange = extractActiveRangePosition(workbook)
        if (fromRange) {
          const previous = activeSelectionRef.current
          if (
            previous &&
            previous.sheetId === worksheetId &&
            (previous.row !== fromRange.row || previous.col !== fromRange.col)
          ) {
            reconcileSingleCell(previous.row, previous.col, 'selection-reconcile')
          }
          emitCursorByRowCol(worksheetId, fromRange.row, fromRange.col)
        }
      }
      const scheduleCursorEmitFromWorksheetSelection = (delayMs = 80) => {
        if (pendingCursorSelectionSyncTimeoutId) {
          clearTimeout(pendingCursorSelectionSyncTimeoutId)
          pendingCursorSelectionSyncTimeoutId = null
        }
        pendingCursorSelectionSyncTimeoutId = setTimeout(() => {
          pendingCursorSelectionSyncTimeoutId = null
          emitCursorFromWorksheetSelection()
        }, delayMs)
      }
      const emitCursorFromSelectionEvent = () => {
        scheduleCursorEmitFromWorksheetSelection(80)
      }
      const selectionDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.(selectionEventKey, emitCursorFromSelectionEvent)
      const selectionChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.('SelectionChanged', emitCursorFromSelectionEvent)
      const currentSelectionChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.('CurrentSelectionChanged', emitCursorFromSelectionEvent)
      const captureCopyFromDomEvent = () => {
        captureCopiedSelectionAnchor()
      }
      document.addEventListener('copy', captureCopyFromDomEvent, true)
      const startupCursorPollStartedAt = Date.now()
      const cursorPollIntervalId = setInterval(() => {
        if (lastEmittedCursorPathRef.current) {
          clearInterval(cursorPollIntervalId)
          return
        }
        if (Date.now() - startupCursorPollStartedAt > 3000) {
          clearInterval(cursorPollIntervalId)
          return
        }
        emitCursorFromWorksheetSelection()
      }, 250)

      const dispose = () => {
        requestSnapshotCheckpointRef.current = null
        scheduleSnapshotCheckpointRef.current = null
        snapshotRequestQueuedRef.current = false
        clearTimeout(canvasHealthTimeout)
        clearTimeout(bootstrapSettleTimer)
        univerBootstrapCompleteRef.current = false
        recentSheetMutationIdsRef.current = new Set()
        if (snapshotCheckpointTimerRef.current) {
          clearTimeout(snapshotCheckpointTimerRef.current)
          snapshotCheckpointTimerRef.current = null
        }
        snapshotCheckpointScheduledAtRef.current = null
        snapshotFirstDirtyAtRef.current = null
        try {
          valueChangeDisposable?.dispose()
        } catch {}
        try {
          sheetEditEndedDisposable?.dispose()
        } catch {}
        try {
          selectionDisposable?.dispose()
        } catch {}
        try {
          selectionChangeDisposable?.dispose()
        } catch {}
        try {
          currentSelectionChangeDisposable?.dispose()
        } catch {}
        document.removeEventListener('copy', captureCopyFromDomEvent, true)
        if (pendingCursorEmitTimeoutId) {
          clearTimeout(pendingCursorEmitTimeoutId)
          pendingCursorEmitTimeoutId = null
        }
        if (pendingCursorSelectionSyncTimeoutId) {
          clearTimeout(pendingCursorSelectionSyncTimeoutId)
          pendingCursorSelectionSyncTimeoutId = null
        }
        try {
          scrollEventDisposable?.dispose?.()
        } catch {}
        try {
          worksheetScrollDisposable?.dispose?.()
        } catch {}
        clearInterval(scrollPollIntervalId)
        if (activeWorksheetPollIntervalId) {
          clearInterval(activeWorksheetPollIntervalId)
        }
        clearInterval(cursorPollIntervalId)
        try {
          commandDisposable?.dispose?.()
        } catch {}
        try {
          beforeCommandDisposable?.dispose?.()
        } catch {}
        sheetScrollRef.current = { scrollLeft: 0, scrollTop: 0 }
        univerAPI.dispose()
        univerAPIRef.current = null
        contextRef.current = null
        lastSyncedGridCellSignaturesRef.current = new Map()
        lastSyncedGridRowCountRef.current = 0
        lastSyncedGridColumnCountRef.current = 0
        lastProcessedAuthoritativeDataSyncTokenRef.current = props.authoritativeDataSyncToken ?? 0
      }

      return dispose
    }, [
      props.workbookRemountKey ?? sheet.id,
      props.snapshotSeed,
      props.isReadOnly,
      gridHostEl,
      forceRowSnapshotSeed,
      supportedUniverFonts,
      appLocale
    ])

    useEffect(() => {
      if (!props.multiSheetWorkbookMode) return
      try {
        const wb = univerAPIRef.current?.getActiveWorkbook?.() as
          | {
              getActiveSheet?: () => { getSheetId?: () => string }
              setActiveSheet?: (id: string) => void
            }
          | undefined
        const activeWorksheetId = wb?.getActiveSheet?.()?.getSheetId?.()
        if (activeWorksheetId === sheet.id) return
        wb?.setActiveSheet?.(sheet.id)
      } catch {
        /* ignore */
      }
    }, [props.multiSheetWorkbookMode, sheet.id])

    // Track "active sheet" based on pointer/focus so we can hijack shortcuts even when
    // Univer's canvas selection doesn't move DOM focus (common in published embeds).
    useEffect(() => {
      const updateInteractionActive = (target: EventTarget | null) => {
        const container = containerRef.current
        if (!container) return
        isSheetInteractionActiveRef.current = target instanceof Node && container.contains(target)
      }

      const onPointerDownCapture = (e: PointerEvent) => updateInteractionActive(e.target)
      const onFocusInCapture = (e: FocusEvent) => updateInteractionActive(e.target)

      globalThis.addEventListener('pointerdown', onPointerDownCapture, true)
      globalThis.addEventListener('focusin', onFocusInCapture, true)
      return () => {
        globalThis.removeEventListener('pointerdown', onPointerDownCapture, true)
        globalThis.removeEventListener('focusin', onFocusInCapture, true)
      }
    }, [])

    // Hijack Cmd/Ctrl+B at the window capture phase so host apps can't intercept it first.
    // We execute the Univer command directly, so we don't need the native event to reach the sheet DOM.
    useEffect(() => {
      const onKeyDownCapture = (e: KeyboardEvent) => {
        if (props.isReadOnly) return
        const api = univerAPIRef.current
        const container = containerRef.current
        if (!api || !container) return

        const activeEl = typeof document !== 'undefined' ? document.activeElement : null
        if (isDomTextEditingTarget(activeEl) && activeEl instanceof Element && !container.contains(activeEl)) {
          return
        }

        const inSheet =
          (activeEl instanceof Element && container.contains(activeEl)) || isSheetInteractionActiveRef.current
        if (!inSheet) return

        const isMod = e.metaKey || e.ctrlKey
        if (!isMod) return

        if (e.key.toLowerCase() !== 'b') return

        e.preventDefault()
        e.stopImmediatePropagation()
        e.stopPropagation()
        // Prefer Univer's built-in command (handles edit mode vs selection mode),
        // but fall back to explicitly toggling the active range's fontWeight so the
        // shortcut still works even if focus routing in the host app is unusual.
        try {
          const didExecute = api.syncExecuteCommand('sheet.command.set-range-bold')
          if (didExecute) return
        } catch {
          // continue to fallback
        }

        try {
          const wb = api.getActiveWorkbook?.()
          const range =
            (wb as { getActiveRange?: () => any } | null | undefined)?.getActiveRange?.() ??
            (wb as { getActiveSheet?: () => any } | null | undefined)?.getActiveSheet?.()?.getActiveRange?.()
          if (!range) return
          const style = (range as { getCellStyleData?: () => { bl?: number } | null })?.getCellStyleData?.()
          const isBold = style?.bl === 1
          ;(range as { setFontWeight?: (v: 'normal' | 'bold' | null) => unknown })?.setFontWeight?.(
            isBold ? 'normal' : 'bold'
          )
        } catch {
          // Ignore — shortcut is best-effort in published embeds
        }
      }

      globalThis.addEventListener('keydown', onKeyDownCapture, true)
      return () => globalThis.removeEventListener('keydown', onKeyDownCapture, true)
    }, [props.isReadOnly])

    // If sheet turns read-only while focused, drop the active interaction flag so
    // host/global shortcuts don't keep targeting the grid.
    useEffect(() => {
      if (!props.isReadOnly) return
      isSheetInteractionActiveRef.current = false
    }, [props.isReadOnly])

    // When embedded in a published platform, the host may use Cmd+B etc. for its own actions.
    // Hijack these shortcuts when the user is focused inside the spreadsheet so Univer handles them.
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!containerRef.current?.contains(e.target as Node)) return
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null
      if (isDomTextEditingTarget(activeEl) && activeEl instanceof Element && !containerRef.current.contains(activeEl)) {
        return
      }
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return
      const key = e.key.toLowerCase()
      const spreadsheetShortcuts = ['b', 'i', 'u', 'c', 'v', 'x', 'z', 'y']
      if (spreadsheetShortcuts.includes(key)) {
        e.stopPropagation()
      }
    }, [])

    const forwardReadOnlyOverlayWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
      // Keep the read-only overlay to block edits/clicks, but forward wheel/trackpad
      // gestures so users can still navigate large sheets in view mode.
      e.preventDefault()
      e.stopPropagation()

      const overlay = e.currentTarget
      const previousPointerEvents = overlay.style.pointerEvents
      overlay.style.pointerEvents = 'none'
      const target = globalThis.document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      overlay.style.pointerEvents = previousPointerEvents

      if (!target) return

      target.dispatchEvent(
        new WheelEvent('wheel', {
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          bubbles: true,
          cancelable: true
        })
      )
    }, [])

    return (
      <div
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:overflow-hidden"
        style={{ height: props.height ?? '100%', width: props.width ?? '100%' }}
        onKeyDown={handleKeyDown}
      >
        <div ref={setGridHostRef} className="gba:w-full gba:h-full" data-testid="univer-sheet-grid-container" />
        {props.isReadOnly && (
          <div
            data-testid="univer-readonly-overlay"
            className="gba:absolute gba:inset-0 gba:z-30 gba:cursor-not-allowed"
            onWheel={forwardReadOnlyOverlayWheel}
            aria-hidden="true"
          />
        )}
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:z-20">
          {remoteCursorOverlays.map(cursor =>
            (() => {
              const rect = cursorRects[cursor.id]
              const fallbackZoom = cellDimensionsRef.current?.zoomRatio ?? 1
              const top = rect
                ? rect.top
                : CURSOR_OVERLAY_HEADER_HEIGHT_PX * fallbackZoom +
                  cursor.row * CURSOR_OVERLAY_ROW_HEIGHT_PX * fallbackZoom
              const left = rect
                ? rect.left
                : CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX * fallbackZoom +
                  cursor.col * CURSOR_OVERLAY_COL_WIDTH_PX * fallbackZoom
              const width = rect ? rect.width : CURSOR_OVERLAY_COL_WIDTH_PX * fallbackZoom
              const height = rect ? rect.height : CURSOR_OVERLAY_ROW_HEIGHT_PX * fallbackZoom
              return (
                <div
                  key={cursor.id}
                  className="gba:absolute gba:rounded-sm"
                  style={{
                    top,
                    left,
                    width,
                    height,
                    border: `2px solid ${cursor.userColor}`,
                    boxShadow: `0 0 8px ${cursor.userColor}33`
                  }}
                >
                  <div
                    className="gba:absolute gba:-top-2 gba:-right-2 gba:h-5 gba:min-w-5 gba:px-1 gba:text-[9px] gba:leading-5 gba:font-semibold gba:text-white gba:rounded-full gba:text-center gba:whitespace-nowrap gba:shadow-sm"
                    style={{ backgroundColor: cursor.userColor }}
                    title={cursor.userName}
                  >
                    {getInitials(cursor.userName)}
                  </div>
                </div>
              )
            })()
          )}
        </div>
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:z-10">
          {commentOverlays.map(marker => {
            const rect = commentRects[marker.id]
            const top = rect ? rect.top : CURSOR_OVERLAY_HEADER_HEIGHT_PX + marker.row * CURSOR_OVERLAY_ROW_HEIGHT_PX
            const leftBase = rect
              ? rect.left
              : CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX + marker.col * CURSOR_OVERLAY_COL_WIDTH_PX
            const width = rect ? rect.width : CURSOR_OVERLAY_COL_WIDTH_PX
            return (
              <React.Fragment key={marker.id}>
                <div
                  className="gba:absolute gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-blue-500 gba:border gba:border-white gba:shadow-sm"
                  style={{
                    top: Math.max(0, top + 2),
                    left: Math.max(0, leftBase + width - 12)
                  }}
                  title={`Comment: ${marker.ref}`}
                  data-testid="univer-cell-comment-badge"
                />
                <div
                  className="gba:absolute gba:pointer-events-auto gba:cursor-pointer"
                  style={{
                    top: Math.max(0, top),
                    left: Math.max(0, leftBase + width - 24),
                    width: 24,
                    height: 24
                  }}
                  onMouseEnter={() => setHoveredCommentId(marker.id)}
                  onMouseLeave={() => setHoveredCommentId(prev => (prev === marker.id ? null : prev))}
                />
              </React.Fragment>
            )
          })}
          {(() => {
            if (!hoveredCommentId) return null
            const marker = commentOverlays.find(entry => entry.id === hoveredCommentId)
            if (!marker) return null
            const rect = commentRects[marker.id]
            if (!rect) return null
            const top = rect.top
            const left = rect.left
            const author = marker.createdByName || t('editor-user-fallback')
            const avatar = marker.createdByAvatar
            const time = formatCommentTime(marker.createdAt)
            return (
              <div
                className="gba:absolute gba:w-[260px] gba:max-w-[65vw] gba:rounded-2xl gba:border gba:bg-card gba:p-4 gba:shadow-xl"
                style={{ top: Math.max(8, top - 164), left: Math.max(8, left - 24) }}
                data-testid="univer-cell-comment-hover-card"
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={author}
                      className="gba:h-9 gba:w-9 gba:rounded-full gba:object-cover gba:border"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-full gba:bg-emerald-800 gba:text-xs gba:font-semibold gba:text-white">
                      {getInitials(author)}
                    </div>
                  )}
                  <div className="gba:flex gba:flex-col">
                    <div className="gba:text-sm gba:leading-none gba:font-semibold">{author}</div>
                    {time && <div className="gba:text-xs gba:leading-none gba:text-muted-foreground">{time}</div>}
                  </div>
                </div>
                <div className="gba:mt-3 gba:text-sm gba:leading-snug">{marker.content || ''}</div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }
)

export default UniverSheetGrid
