import { InputType, type InputBlock } from '@/common/network/flows/FlowTemplateClient'
import { coerceFormDataBySchema, toSerializableFileValue } from './flowLaunchUtils'

describe('flowLaunchUtils', () => {
  it('keeps uploaded file references as serializable launcher values', () => {
    const uploadedFile = {
      path: '/tenant/files/abc',
      fileId: 'abc',
      appName: 'flow-launcher',
      folderPath: '/flows/demo/launcher/attachment',
      uploadedAt: '2026-03-10T12:00:00.000Z',
      accessScope: 'tenant',
      fileMetadata: {
        originalFileName: 'attachment.pdf',
        mimeType: 'application/pdf'
      }
    }

    expect(toSerializableFileValue(uploadedFile)).toEqual(uploadedFile)
  })

  it('removes raw File objects from the launch payload and preserves uploaded references', () => {
    const fileInput: InputBlock = {
      type: InputType.FILE,
      name: 'attachment',
      label: 'Attachment'
    }
    const numberInput: InputBlock = {
      type: InputType.NUMBER,
      name: 'amount',
      label: 'Amount'
    }
    const rawFile = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    const uploadedFile = {
      path: '/tenant/files/xyz',
      fileId: 'xyz',
      fileMetadata: {
        originalFileName: 'invoice.pdf',
        mimeType: 'application/pdf'
      }
    }

    expect(
      coerceFormDataBySchema([fileInput, numberInput], {
        attachment: rawFile,
        amount: '42'
      })
    ).toEqual({
      attachment: undefined,
      amount: 42
    })

    expect(
      coerceFormDataBySchema([fileInput], {
        attachment: uploadedFile
      })
    ).toEqual({
      attachment: uploadedFile
    })
  })
})
