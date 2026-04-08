import { useCallback, useState } from 'react'
import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import type { ArtifactFile } from '../../../types/fabric'

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

function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < line.length) {
    // Line comments
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', value: line.slice(i) })
      break
    }
    if (line[i] === '#') {
      tokens.push({ type: 'comment', value: line.slice(i) })
      break
    }
    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const q = line[i]
      let j = i + 1
      while (j < line.length && (line[j] !== q || line[j - 1] === '\\')) j++
      tokens.push({ type: 'str', value: line.slice(i, j + 1) })
      i = j + 1
      continue
    }
    // Numbers
    if (/[0-9]/.test(line[i]) && (i === 0 || /[\s,([\-+*/=]/.test(line[i - 1]))) {
      let j = i
      while (j < line.length && /[0-9._xXa-fA-F]/.test(line[j])) j++
      tokens.push({ type: 'num', value: line.slice(i, j) })
      i = j
      continue
    }
    // Words (keywords, booleans, identifiers)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++
      const word = line.slice(i, j)
      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'kw', value: word })
      } else if (word === 'true' || word === 'false' || word === 'null' || word === 'undefined' || word === 'None') {
        tokens.push({ type: 'bool', value: word })
      } else {
        tokens.push({ type: 'text', value: word })
      }
      i = j
      continue
    }
    // Operators
    if (/[=<>!+\-*/&|^%~]/.test(line[i])) {
      tokens.push({ type: 'op', value: line[i] })
      i++
      continue
    }
    // Plain text
    const last = tokens[tokens.length - 1]
    if (last?.type === 'text') {
      last.value += line[i]
    } else {
      tokens.push({ type: 'text', value: line[i] })
    }
    i++
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
    h ^= payload.charCodeAt(p)
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
              <span className="gba:text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon className="gba:h-3.5 gba:w-3.5" />
              Copy
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
