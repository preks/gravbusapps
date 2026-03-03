/**
 * Normalizes dictation transcript: number words to digits, spoken punctuation to symbols.
 * Language-aware for en, de, ro (and fallback to en).
 */

const PUNCTUATION_MAP: Record<string, Record<string, string>> = {
  en: {
    comma: ',',
    period: '.',
    'full stop': '.',
    dot: '.',
    exclamation: '!',
    'exclamation mark': '!',
    question: '?',
    'question mark': '?',
    colon: ':',
    semicolon: ';',
    apostrophe: "'",
    quote: '"',
    'open quote': '"',
    'close quote': '"',
    'new line': '\n',
    'new paragraph': '\n\n',
    hyphen: '-',
    dash: '–',
    'open parenthesis': '(',
    'close parenthesis': ')',
    'open bracket': '[',
    'close bracket': ']'
  },
  de: {
    komma: ',',
    punkt: '.',
    ausrufezeichen: '!',
    fragezeichen: '?',
    doppelpunkt: ':',
    semikolon: ';',
    apostroph: "'",
    anführungszeichen: '"',
    'neue zeile': '\n',
    'neuer absatz': '\n\n',
    bindestrich: '-',
    'runde klammer auf': '(',
    'runde klammer zu': ')'
  },
  ro: {
    virgulă: ',',
    virgula: ',',
    punct: '.',
    semnul: '.',
    exclamare: '!',
    întrebare: '?',
    'două puncte': ':',
    'punct și virgulă': ';',
    apostrof: "'",
    'linie nouă': '\n',
    'paragraf nou': '\n\n',
    cratimă: '-',
    'paranteză deschisă': '(',
    'paranteză închisă': ')'
  }
}

// English number words for parsing (lowercase)
const EN_ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9
}
const EN_TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19
}
const EN_TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
}
const EN_HUNDRED = 'hundred'
const EN_THOUSAND = 'thousand'
const EN_MILLION = 'million'

function parseEnglishNumberWords(words: string[]): number | null {
  if (words.length === 0) return null
  let total = 0
  let current = 0
  let i = 0
  while (i < words.length) {
    const w = words[i].toLowerCase()
    if (EN_ONES[w] !== undefined) {
      current += EN_ONES[w]
      i++
    } else if (EN_TEENS[w] !== undefined) {
      current += EN_TEENS[w]
      i++
    } else if (EN_TENS[w] !== undefined) {
      current += EN_TENS[w]
      i++
      if (i < words.length && EN_ONES[words[i].toLowerCase()] !== undefined) {
        current += EN_ONES[words[i].toLowerCase()]
        i++
      }
    } else if (w === EN_HUNDRED) {
      current = (current || 1) * 100
      i++
    } else if (w === EN_THOUSAND) {
      total += (current || 1) * 1000
      current = 0
      i++
    } else if (w === EN_MILLION) {
      total += (current || 1) * 1_000_000
      current = 0
      i++
    } else {
      return null
    }
  }
  return total + current
}

// German: eins, zwei, drei, ... zehn, elf, zwölf, ... zwanzig, einundzwanzig, hundert, tausend
const DE_ONES: Record<string, number> = {
  null: 0,
  eins: 1,
  ein: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  fünf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9
}
const DE_TEENS: Record<string, number> = {
  zehn: 10,
  elf: 11,
  zwölf: 12,
  dreizehn: 13,
  vierzehn: 14,
  fünfzehn: 15,
  sechzehn: 16,
  siebzehn: 17,
  achtzehn: 18,
  neunzehn: 19
}
const DE_TENS: Record<string, number> = {
  zwanzig: 20,
  dreißig: 30,
  vierzig: 40,
  fünfzig: 50,
  sechzig: 60,
  siebzig: 70,
  achtzig: 80,
  neunzig: 90
}

function parseGermanNumberWords(words: string[]): number | null {
  if (words.length === 0) return null
  let total = 0
  let current = 0
  let i = 0
  while (i < words.length) {
    const w = words[i].toLowerCase()
    if (DE_ONES[w] !== undefined) {
      current += DE_ONES[w]
      i++
    } else if (DE_TEENS[w] !== undefined) {
      current += DE_TEENS[w]
      i++
    } else if (DE_TENS[w] !== undefined) {
      current += DE_TENS[w]
      i++
      if (i < words.length && DE_ONES[words[i].toLowerCase()] !== undefined) {
        current += DE_ONES[words[i].toLowerCase()]
        i++
      }
    } else if (w === 'hundert') {
      current = (current || 1) * 100
      i++
    } else if (w === 'tausend') {
      total += (current || 1) * 1000
      current = 0
      i++
    } else if (w === 'million' || w === 'millionen') {
      total += (current || 1) * 1_000_000
      current = 0
      i++
    } else {
      return null
    }
  }
  return total + current
}

// Romanian: zero, unu, doi, trei, ... zece, unsprezece, douăzeci, ... sută, mie
const RO_ONES: Record<string, number> = {
  zero: 0,
  unu: 1,
  una: 1,
  doi: 2,
  două: 2,
  trei: 3,
  patru: 4,
  cinci: 5,
  șase: 6,
  șapte: 7,
  opt: 8,
  nouă: 9
}
const RO_TEENS: Record<string, number> = {
  zece: 10,
  unsprezece: 11,
  doisprezece: 12,
  treisprezece: 13,
  patrusprezece: 14,
  cincisprezece: 15,
  șaisprezece: 16,
  șaptesprezece: 17,
  optsprezece: 18,
  nouăsprezece: 19
}
const RO_TENS: Record<string, number> = {
  douăzeci: 20,
  treizeci: 30,
  patruzeci: 40,
  cincizeci: 50,
  șaizeci: 60,
  șaptezeci: 70,
  optzeci: 80,
  nouăzeci: 90
}

function parseRomanianNumberWords(words: string[]): number | null {
  if (words.length === 0) return null
  let total = 0
  let current = 0
  let i = 0
  while (i < words.length) {
    const w = words[i].toLowerCase()
    if (RO_ONES[w] !== undefined) {
      current += RO_ONES[w]
      i++
    } else if (RO_TEENS[w] !== undefined) {
      current += RO_TEENS[w]
      i++
    } else if (RO_TENS[w] !== undefined) {
      current += RO_TENS[w]
      i++
      if (i < words.length && RO_ONES[words[i].toLowerCase()] !== undefined) {
        current += RO_ONES[words[i].toLowerCase()]
        i++
      }
    } else if (w === 'sută' || w === 'sute') {
      current = (current || 1) * 100
      i++
    } else if (w === 'mie' || w === 'mii') {
      total += (current || 1) * 1000
      current = 0
      i++
    } else if (w === 'milion' || w === 'milioane') {
      total += (current || 1) * 1_000_000
      current = 0
      i++
    } else {
      return null
    }
  }
  return total + current
}

function parseNumberWords(words: string[], lang: string): number | null {
  if (lang === 'de') return parseGermanNumberWords(words)
  if (lang === 'ro') return parseRomanianNumberWords(words)
  return parseEnglishNumberWords(words)
}

/** True if segment contains tens, teens, hundred, thousand, or million (compound number). */
function isCompoundNumberRun(words: string[], lang: string): boolean {
  const lower = words.map(w => w.toLowerCase())
  if (lang === 'de') {
    const scale = [
      'zehn',
      'elf',
      'zwölf',
      'dreizehn',
      'vierzehn',
      'fünfzehn',
      'sechzehn',
      'siebzehn',
      'achtzehn',
      'neunzehn',
      'zwanzig',
      'dreißig',
      'vierzig',
      'fünfzig',
      'sechzig',
      'siebzig',
      'achtzig',
      'neunzig',
      'hundert',
      'tausend',
      'million',
      'millionen'
    ]
    return lower.some(w => scale.includes(w))
  }
  if (lang === 'ro') {
    const scale = [
      'zece',
      'unsprezece',
      'doisprezece',
      'treisprezece',
      'patrusprezece',
      'cincisprezece',
      'șaisprezece',
      'șaptesprezece',
      'optsprezece',
      'nouăsprezece',
      'douăzeci',
      'treizeci',
      'patruzeci',
      'cincizeci',
      'șaizeci',
      'șaptezeci',
      'optzeci',
      'nouăzeci',
      'sută',
      'sute',
      'mie',
      'mii',
      'milion',
      'milioane'
    ]
    return lower.some(w => scale.includes(w))
  }
  const scale = [
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
    'hundred',
    'thousand',
    'million'
  ]
  return lower.some(w => scale.includes(w))
}

function applyPunctuationReplacements(text: string, lang: string): string {
  const map = PUNCTUATION_MAP[lang] ?? PUNCTUATION_MAP.en
  let out = text
  const byLength = Object.keys(map).sort((a, b) => b.length - a.length)
  for (const phrase of byLength) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    out = out.replace(re, map[phrase])
  }
  return out
}

/** Remove space immediately before punctuation that should follow the previous word. */
function trimSpaceBeforePunctuation(text: string): string {
  return text.replace(/\s+([,.!?;:\])"'])/g, '$1')
}

/**
 * Split transcript into segments. Only convert number words to digits when the run
 * is a compound number (e.g. "twenty three", "one hundred"). Leave digit-word
 * sequences as words so "one two three" stays "one two three" and "one sentence"
 * stays "one sentence".
 */
function replaceNumberPhrases(text: string, lang: string): string {
  const words = text.split(/\s+/)
  const result: string[] = []
  let i = 0
  while (i < words.length) {
    let j = i
    let num: number | null = null
    const segment: string[] = []
    while (j < words.length) {
      segment.push(words[j])
      const n = parseNumberWords(segment, lang)
      if (n !== null) {
        num = n
        j++
      } else {
        break
      }
    }
    if (num !== null && segment.length > 0 && isCompoundNumberRun(segment, lang)) {
      result.push(String(num))
      i = j
    } else if (num !== null && segment.length > 0) {
      result.push(...segment)
      i = j
    } else {
      result.push(words[i])
      i++
    }
  }
  return result.join(' ')
}

/**
 * Normalize dictation transcript for the given language:
 * - Replaces spoken punctuation (e.g. "comma" -> ",") per language
 * - Converts number words to digits (e.g. "twenty three" -> "23")
 *
 * @param transcript Raw transcript from speech recognition
 * @param language BCP 47 locale (e.g. en-US, de-DE, ro-RO); base language used for rules
 */
export function normalizeDictationTranscript(transcript: string, language: string): string {
  if (!transcript.trim()) return transcript
  const base = language.split('-')[0]?.toLowerCase() ?? 'en'
  const lang = PUNCTUATION_MAP[base] ? base : 'en'
  let out = transcript
  out = applyPunctuationReplacements(out, lang)
  out = trimSpaceBeforePunctuation(out)
  out = replaceNumberPhrases(out, lang)
  return out
}
