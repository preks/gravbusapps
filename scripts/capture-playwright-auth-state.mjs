/**
 * One-time login capture for Playwright bundled Chromium.
 *
 * Usage:
 *   node scripts/capture-playwright-auth-state.mjs [url] [outputPath]
 *
 * Example:
 *   node scripts/capture-playwright-auth-state.mjs \
 *     "http://localhost:3001/platform/every-office/spreadsheets?appId=34b290ee-ca59-42bf-998f-4ca0a5127f94&view=viewer" \
 *     ".playwright-auth/newwork-local.json"
 */

import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const targetUrl =
  process.argv[2] ||
  'http://localhost:3001/platform/every-office/spreadsheets?appId=34b290ee-ca59-42bf-998f-4ca0a5127f94&view=viewer'
const outPath = path.resolve(process.argv[3] || '.playwright-auth/newwork-local.json')

async function main() {
  fs.mkdirSync(path.dirname(outPath), { recursive: true })

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('Open URL and complete login in the launched Chromium window:')
  console.log(targetUrl)
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 })

  console.log('\nWhen page is fully usable, press Enter in this terminal to save auth state...\n')

  await new Promise(resolve => {
    process.stdin.resume()
    process.stdin.once('data', () => resolve())
  })

  await context.storageState({ path: outPath })
  console.log(`Saved storage state to: ${outPath}`)

  await browser.close()
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
