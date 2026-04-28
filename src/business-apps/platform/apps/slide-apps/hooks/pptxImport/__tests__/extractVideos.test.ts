import { extractVideoElements } from '../extractVideos'
import { parseXML } from '../ooxmlUtils'
import type { SlideRelationships } from '../types'

function slideXml(spXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
           xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">
      <p:cSld><p:spTree>${spXml}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractVideoElements', () => {
  const relationships: SlideRelationships = {
    images: new Map([['rIdPoster', 'ppt/media/poster.png']]),
    videos: new Map([['rIdVideo', 'ppt/media/video1.mp4']]),
    hyperlinks: new Map(),
    chartPaths: new Map()
  }

  const media = new Map<string, string>([
    ['ppt/media/poster.png', 'data:image/png;base64,POSTER'],
    ['ppt/media/video1.mp4', 'data:video/mp4;base64,VIDEO']
  ])

  it('extracts embedded package videos as file videos with poster images', () => {
    const xml = slideXml(`
      <p:pic>
        <p:nvPicPr>
          <p:nvPr>
            <p:extLst>
              <p:ext uri="{DAA4B4D4-6D71-4841-9B42-3DE7FCFB1A07}">
                <p14:media r:embed="rIdVideo"/>
              </p:ext>
            </p:extLst>
          </p:nvPr>
        </p:nvPicPr>
        <p:blipFill><a:blip r:embed="rIdPoster"/></p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="1828800" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const videos = extractVideoElements(xml, relationships, media)
    expect(videos).toHaveLength(1)
    expect(videos[0].videoKind).toBe('file')
    expect(videos[0].src).toBe('data:video/mp4;base64,VIDEO')
    expect(videos[0].sourceUrl).toBe('ppt/media/video1.mp4')
    expect(videos[0].previewImageUrl).toBe('data:image/png;base64,POSTER')
    expect(videos[0].position.x).toBeCloseTo(96, 0)
    expect(videos[0].position.y).toBeCloseTo(48, 0)
  })

  it('extracts linked YouTube videos as embed videos', () => {
    const xml = slideXml(`
      <p:pic>
        <p:nvPicPr>
          <p:nvPr>
            <a:videoFile r:link="rIdLinked" contentType="video/mp4"/>
          </p:nvPr>
        </p:nvPicPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="1828800" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const linkedRelationships: SlideRelationships = {
      images: new Map(),
      videos: new Map([['rIdLinked', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ']]),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }

    const videos = extractVideoElements(xml, linkedRelationships, media)
    expect(videos).toHaveLength(1)
    expect(videos[0].videoKind).toBe('embed')
    expect(videos[0].embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0')
    expect(videos[0].sourceUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(videos[0].previewImageUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('warns and skips unsupported linked video URLs', () => {
    const xml = slideXml(`
      <p:pic>
        <p:nvPicPr>
          <p:nvPr>
            <a:videoFile r:link="rIdLinked"/>
          </p:nvPr>
        </p:nvPicPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="1828800" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const linkedRelationships: SlideRelationships = {
      images: new Map(),
      videos: new Map([['rIdLinked', 'https://example.com/watch/video-page']]),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }
    const messages: Array<{ type: string; message: string; params?: Record<string, string> }> = []

    const videos = extractVideoElements(xml, linkedRelationships, media, messages, 0)
    expect(videos).toHaveLength(0)
    expect(messages).toEqual([
      {
        type: 'warning',
        message: 'parser-video-linked-unsupported',
        params: { slide: '1' }
      }
    ])
  })
})
