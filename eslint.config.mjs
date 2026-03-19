import config from '@newwork/eslint-config/react-internal'

const TEST_IGNORE_PATTERNS = new Set(['**/*.test.ts', '**/*.test.tsx'])

export default config.map(entry =>
  Array.isArray(entry?.ignores)
    ? {
        ...entry,
        ignores: entry.ignores.filter(pattern => !TEST_IGNORE_PATTERNS.has(pattern))
      }
    : entry
)
