import { getFigureDataAttributes, getImageFigureAttributesFromElement } from './styleUtils'

const defaults = {
  align: 'left' as const,
  wrapMode: 'inline' as const,
  anchorMode: 'inline' as const,
  display: 'inline' as const,
  distance: 0
}

describe('styleUtils custom image crop attrs', () => {
  it('serializes crop and layout attrs onto the figure', () => {
    expect(
      getFigureDataAttributes({
        cropTop: 0.1,
        cropRight: 0.2,
        cropBottom: 0.05,
        cropLeft: 0.15,
        rotation: 45,
        wrapMode: 'front',
        anchorMode: 'fixed'
      })
    ).toMatchObject({
      'data-image-crop-top': '0.1',
      'data-image-crop-right': '0.2',
      'data-image-crop-bottom': '0.05',
      'data-image-crop-left': '0.15',
      'data-image-rotation': '45',
      'data-image-wrap': 'front',
      'data-image-anchor': 'fixed'
    })
  })

  it('reads crop and layout attrs back from figure markup', () => {
    const figure = document.createElement('figure')
    const image = document.createElement('img')

    image.setAttribute('src', 'data:image/png;base64,abc')
    image.setAttribute('width', '240')
    image.setAttribute('height', '120')
    figure.setAttribute('data-image-crop-top', '0.1')
    figure.setAttribute('data-image-crop-right', '0.2')
    figure.setAttribute('data-image-crop-bottom', '0.05')
    figure.setAttribute('data-image-crop-left', '0.15')
    figure.setAttribute('data-image-rotation', '30')
    figure.setAttribute('data-image-wrap', 'square-right')
    figure.setAttribute('data-image-anchor', 'fixed')
    figure.appendChild(image)

    expect(getImageFigureAttributesFromElement(figure, defaults)).toMatchObject({
      src: 'data:image/png;base64,abc',
      width: 240,
      height: 120,
      cropTop: 0.1,
      cropRight: 0.2,
      cropBottom: 0.05,
      cropLeft: 0.15,
      rotation: 30,
      wrapMode: 'square-right',
      anchorMode: 'fixed'
    })
  })

  it('reads crop and layout attrs back from inline span markup', () => {
    const wrapper = document.createElement('span')
    const image = document.createElement('img')
    const caption = document.createElement('span')

    wrapper.setAttribute('data-node-type', 'custom-image')
    wrapper.setAttribute('data-image-wrap', 'behind')
    wrapper.setAttribute('data-image-anchor', 'move-with-text')
    wrapper.setAttribute('data-image-offset-x', '18')
    wrapper.setAttribute('data-image-offset-y', '-4')
    caption.setAttribute('data-image-caption-text', 'true')
    caption.textContent = 'Example caption'
    image.setAttribute('src', 'data:image/png;base64,def')
    image.setAttribute('width', '180')
    image.setAttribute('height', '90')
    wrapper.append(image, caption)

    expect(getImageFigureAttributesFromElement(wrapper, defaults)).toMatchObject({
      src: 'data:image/png;base64,def',
      width: 180,
      height: 90,
      wrapMode: 'behind',
      anchorMode: 'move-with-text',
      offsetX: 18,
      offsetY: -4,
      caption: 'Example caption'
    })
  })
})
