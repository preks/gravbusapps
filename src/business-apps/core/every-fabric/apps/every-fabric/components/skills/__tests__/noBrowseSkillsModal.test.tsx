/**
 * Global guard: the legacy Browse Skills popup ("BrowseSkillsModal") must never appear again.
 *
 * This test is deliberately strict: it asserts both that the source file is gone and that
 * no component in the every-fabric tree mounts an element with the legacy modal testid.
 */
import fs from 'fs'
import path from 'path'

const EVERY_FABRIC_DIR = path.resolve(__dirname, '../../..')
const LEGACY_MODAL_PATH = path.join(EVERY_FABRIC_DIR, 'components/skills/BrowseSkillsModal.tsx')

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.jest-cache' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      yield full
    }
  }
}

function isExcluded(file: string): boolean {
  // Exclude this guard test itself so its own string literals don't trigger it.
  if (file === __filename) return true
  // Test files are allowed to contain *negative* assertions (e.g. queryByTestId('browse-skills-modal'))
  // and jest.mock references used to prove the legacy modal is absent. We only police application source.
  if (file.includes(`${path.sep}__tests__${path.sep}`)) return true
  if (/\.test\.(ts|tsx)$/.test(file)) return true
  // Docs directory contains a legacy plan; ignore non-code artifacts.
  if (file.includes(`${path.sep}docs${path.sep}`)) return true
  return false
}

describe('BrowseSkillsModal is fully retired', () => {
  it('the source file has been deleted', () => {
    expect(fs.existsSync(LEGACY_MODAL_PATH)).toBe(false)
  })

  it('no application file in the every-fabric app imports or references BrowseSkillsModal', () => {
    const offenders: string[] = []
    for (const file of walk(EVERY_FABRIC_DIR)) {
      if (isExcluded(file)) continue
      const contents = fs.readFileSync(file, 'utf8')
      if (/BrowseSkillsModal/.test(contents)) {
        offenders.push(path.relative(EVERY_FABRIC_DIR, file))
      }
    }
    expect(offenders).toEqual([])
  })

  it('no application file in the every-fabric app references the legacy browse-skills-modal testid', () => {
    const offenders: string[] = []
    for (const file of walk(EVERY_FABRIC_DIR)) {
      if (isExcluded(file)) continue
      const contents = fs.readFileSync(file, 'utf8')
      if (/browse-skills-modal/.test(contents)) {
        offenders.push(path.relative(EVERY_FABRIC_DIR, file))
      }
    }
    expect(offenders).toEqual([])
  })
})
