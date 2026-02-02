#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getScreenDirectories } from './utils/screenDiscovery.js'

const [inputFile, outputFile] = process.argv.slice(2)

if (!inputFile || !outputFile) {
  console.error('Usage: node scripts/map-files-to-screens.js <input-file> <output-file>')
  process.exit(1)
}

if (!fs.existsSync(inputFile)) {
  fs.writeFileSync(outputFile, '')
  process.exit(0)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const screenDirs = await getScreenDirectories({ cwd: projectRoot })

const inputLines = fs
  .readFileSync(inputFile, 'utf8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean)

const matched = new Set()

for (const line of inputLines) {
  const normalizedLine = line.replace(/\\/g, '/')
  for (const dir of screenDirs) {
    if (normalizedLine === dir || normalizedLine.startsWith(`${dir}/`)) {
      matched.add(dir)
      break
    }
  }
}

const output = Array.from(matched).sort().join('\n')
fs.writeFileSync(outputFile, output + (output.length ? '\n' : ''))
