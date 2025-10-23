/**
 * Fix Forge's vite.config.ts by uploading the correct version from local repo
 * This updates the base repository file in Forge's database
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FORGE_API_URL = process.env.FORGE_API_URL || 'https://forge-api-production-db58.up.railway.app'
const REPO_ID = '168cd931-0e04-4f64-a496-fcb4af916612'

async function main() {
  // Read local vite.config.ts
  const viteConfigPath = path.join(__dirname, '..', 'vite.config.ts')
  const content = fs.readFileSync(viteConfigPath, 'utf-8')

  // Calculate SHA256
  const sha256 = crypto.createHash('sha256').update(content).digest('hex')
  const sizeBytes = Buffer.byteLength(content, 'utf-8')

  console.log('📋 Local vite.config.ts:')
  console.log(`   Size: ${sizeBytes} bytes`)
  console.log(`   SHA256: ${sha256}`)
  console.log(`   Contains "exports: 'auto'": ${content.includes("exports: 'auto'")}`)

  // Upload to Forge
  console.log('\n🚀 Uploading to Forge...')
  const response = await fetch(`${FORGE_API_URL}/api/files/${REPO_ID}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filePath: 'vite.config.ts',
      content,
      sizeBytes,
      sha256
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upload failed: ${response.status} ${error}`)
  }

  const result = await response.json()
  console.log('✅ Upload successful:', result)

  // Verify by reading back
  console.log('\n🔍 Verifying...')
  const verifyResponse = await fetch(`${FORGE_API_URL}/api/files/${REPO_ID}/vite.config.ts`)

  if (!verifyResponse.ok) {
    throw new Error(`Verification failed: ${verifyResponse.status}`)
  }

  const { content: uploadedContent } = await verifyResponse.json()
  const match = uploadedContent === content

  console.log(`   Match: ${match}`)
  console.log(`   Contains "exports: 'auto'": ${uploadedContent.includes("exports: 'auto'")}`)

  if (match) {
    console.log('\n✅ SUCCESS! Forge now has the correct vite.config.ts')
    console.log('   You can now publish from AI Builder without the workaround!')
  } else {
    console.log('\n❌ WARNING: Content mismatch - something went wrong')
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
