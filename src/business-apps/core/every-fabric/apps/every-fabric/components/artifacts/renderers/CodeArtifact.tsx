import { useCallback, useState } from 'react'
import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import type { ArtifactFile } from '../../../types/fabric'
import translations from '../../../_i18n'

// ─── Minimal token-based syntax highlighter ──────────────────────────────────
// Handles: keywords, strings, comments, numbers, booleans/null, operators

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'class',
  'import',
  'export',
  'from',
  'default',
  'new',
  'this',
  'async',
  'await',
  'try',
  'catch',
  'throw',
  'typeof',
  'instanceof',
  'in',
  'of',
  'interface',
  'type',
  'extends',
  'implements',
  'readonly',
  'public',
  'private',
  'protected',
  'static',
  'abstract',
  'def',
  'lambda',
  'pass',
  'yield',
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'ON',
  'AS',
  'AND',
  'OR',
  'NOT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'TABLE',
  'INDEX',
  'WITH'
])

type TokenType = 'kw' | 'str' | 'comment' | 'num' | 'bool' | 'op' | 'text'

interface Token {
  type: TokenType
  value: string
}

interface ParsedToken {
  token: Token
  nextIndex: number
}

function readCommentToken(line: string, index: number): ParsedToken | null {
  if (line[index] === '/' && line[index + 1] === '/') {
    return { token: { type: 'comment', value: line.slice(index) }, nextIndex: line.length }
  }
  if (line[index] === '#') {
    return { token: { type: 'comment', value: line.slice(index) }, nextIndex: line.length }
  }
  return null
}

function readStringToken(line: string, index: number): ParsedToken | null {
  const quote = line[index]
  if (quote !== '"' && quote !== "'" && quote !== '`') {
    return null
  }

  let j = index + 1
  while (j < line.length && (line[j] !== quote || line[j - 1] === '\\')) j += 1
  return {
    token: { type: 'str', value: line.slice(index, j + 1) },
    nextIndex: j + 1
  }
}

function readNumberToken(line: string, index: number): ParsedToken | null {
  const current = line[index]
  const previous = line[index - 1]
  const startsWithDigit = /\d/.test(current)
  const isBoundary = index === 0 || /[\s,([\-+*/=]/.test(previous)
  if (!startsWithDigit || !isBoundary) {
    return null
  }

  let j = index
  while (j < line.length && /[\d._xXa-fA-F]/.test(line[j])) j += 1
  return {
    token: { type: 'num', value: line.slice(index, j) },
    nextIndex: j
  }
}

function readWordToken(line: string, index: number): ParsedToken | null {
  if (!/[a-zA-Z_$]/.test(line[index])) {
    return null
  }

  let j = index
  while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j += 1
  const word = line.slice(index, j)

  if (KEYWORDS.has(word)) {
    return { token: { type: 'kw', value: word }, nextIndex: j }
  }
  if (word === 'true' || word === 'false' || word === 'null' || word === 'undefined' || word === 'None') {
    return { token: { type: 'bool', value: word }, nextIndex: j }
  }
  return { token: { type: 'text', value: word }, nextIndex: j }
}

function appendPlainTextToken(tokens: Token[], value: string): void {
  const last = tokens[tokens.length - 1]
  if (last?.type === 'text') {
    last.value += value
    return
  }
  tokens.push({ type: 'text', value })
}

function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < line.length) {
    const comment = readCommentToken(line, i)
    if (comment) {
      tokens.push(comment.token)
      break
    }

    const stringToken = readStringToken(line, i)
    if (stringToken) {
      tokens.push(stringToken.token)
      i = stringToken.nextIndex
      continue
    }

    const numberToken = readNumberToken(line, i)
    if (numberToken) {
      tokens.push(numberToken.token)
      i = numberToken.nextIndex
      continue
    }

    const wordToken = readWordToken(line, i)
    if (wordToken) {
      tokens.push(wordToken.token)
      i = wordToken.nextIndex
      continue
    }

    if (/[=<>!+\-*/&|^%~]/.test(line[i])) {
      tokens.push({ type: 'op', value: line[i] })
      i += 1
      continue
    }

    appendPlainTextToken(tokens, line[i])
    i += 1
  }
  return tokens
}

const TOKEN_COLOR: Record<TokenType, string> = {
  kw: '#818cf8', // indigo
  str: '#86efac', // green
  comment: '#6b7280', // gray
  num: '#fb923c', // orange
  bool: '#f472b6', // pink
  op: '#94a3b8', // slate
  text: '#e2e8f0' // off-white
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightLine(line: string): string {
  const tokens = tokenize(line)
  return tokens.map(t => `<span style="color:${TOKEN_COLOR[t.type]}">${escapeHtml(t.value)}</span>`).join('')
}

function codeLineRowKey(line: string, rowIndex: number): string {
  const payload = `${rowIndex}\0${line}`
  let h = 2166136261
  for (let p = 0; p < payload.length; p++) {
    h ^= payload.codePointAt(p) ?? 0
    h = Math.imul(h, 16777619)
  }
  return `code-row-${(h >>> 0).toString(36)}`
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface CodeArtifactProps {
  file: ArtifactFile
  content: string | null
  /** Required for registry typing; display does not depend on preview vs code for raw code artifacts */
  viewMode: 'preview' | 'code'
  /** Language override (used when CodeArtifact renders another artifact's source) */
  language?: string
}

function resolveArtifactDisplayName(file: ArtifactFile): string {
  if (typeof file.name === 'string' && file.name.trim()) return file.name
  if (typeof file.path === 'string' && file.path.trim()) {
    return file.path.split('/').filter(Boolean).pop() ?? 'artifact.txt'
  }
  return 'artifact.txt'
}

const CodeArtifact: React.FC<CodeArtifactProps> = ({ file, content, viewMode, language }) => {
  const { t } = useTranslation(translations)
  const [copied, setCopied] = useState(false)
  const safeContent = typeof content === 'string' ? content : ''
  const safeName = resolveArtifactDisplayName(file)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(safeContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [safeContent])

  const lang = language ?? safeName.split('.').pop() ?? ''
  const lines = safeContent.split('\n')
  const lineNumWidth = String(lines.length).length

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:bg-slate-950"
      data-testid="fabric-code-artifact"
      data-view-mode={viewMode}
    >
      {/* Language badge + copy */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-b gba:border-white/10 gba:shrink-0">
        <span className="gba:text-[11px] gba:font-mono gba:font-medium gba:text-slate-400 gba:uppercase gba:tracking-wider">
          {lang || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-xs gba:font-medium gba:text-slate-400 gba:hover:text-slate-200 gba:hover:bg-white/10 gba:transition-colors"
          data-testid="fabric-code-copy"
        >
          {copied ? (
            <>
              <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-green-400" weight="bold" />
              <span className="gba:text-green-400">{t('artifact-copied')}</span>
            </>
          ) : (
            <>
              <CopyIcon className="gba:h-3.5 gba:w-3.5" />
              {t('artifact-copy')}
            </>
          )}
        </button>
      </div>

      {/* Code lines */}
      <div className="gba:flex-1 gba:overflow-auto">
        <pre className="gba:p-0 gba:m-0 gba:text-[12px] gba:leading-[1.75] gba:font-mono gba:select-text">
          {lines.map((line, i) => (
            <div
              key={codeLineRowKey(line, i)}
              className="gba:flex gba:items-start gba:hover:bg-white/5 gba:transition-colors"
            >
              <span
                className="gba:shrink-0 gba:select-none gba:py-0 gba:px-4 gba:text-slate-600 gba:text-right gba:tabular-nums"
                style={{ minWidth: `${lineNumWidth + 3}ch` }}
              >
                {i + 1}
              </span>
              <span
                className="gba:flex-1 gba:py-0 gba:pr-6 gba:whitespace-pre gba:text-slate-200"
                dangerouslySetInnerHTML={{ __html: highlightLine(line) || '&nbsp;' }}
              />
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}

export default CodeArtifact
