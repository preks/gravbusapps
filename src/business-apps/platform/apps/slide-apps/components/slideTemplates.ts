/**
 * Slide Templates - Professional slide layouts
 */

export interface SlideTemplate {
  id: string
  name: string
  icon: string
  description: string
  defaultContent: {
    title: string
    subtitle?: string
    content?: string
    bullets?: string[]
    code?: string
    imageUrl?: string
  }
}

export const SLIDE_TEMPLATES: SlideTemplate[] = [
  {
    id: 'title',
    name: 'Title Slide',
    icon: '🎯',
    description: 'Perfect for opening your presentation',
    defaultContent: {
      title: 'Your Presentation Title',
      subtitle: 'Click to add subtitle'
    }
  },
  {
    id: 'title-bullets',
    name: 'Title & Bullets',
    icon: '📋',
    description: 'Title with bullet points for key ideas',
    defaultContent: {
      title: 'Key Points',
      bullets: ['First important point', 'Second important point', 'Third important point']
    }
  },
  {
    id: 'two-column',
    name: 'Two Columns',
    icon: '📊',
    description: 'Split content into two columns',
    defaultContent: {
      title: 'Comparison',
      content: 'Left column content here\n---\nRight column content here'
    }
  },
  {
    id: 'image-text',
    name: 'Image & Text',
    icon: '🖼️',
    description: 'Image with descriptive text',
    defaultContent: {
      title: 'Visual Content',
      content: 'Add descriptive text for your image',
      imageUrl: ''
    }
  },
  {
    id: 'code',
    name: 'Code Block',
    icon: '💻',
    description: 'Showcase code with syntax highlighting',
    defaultContent: {
      title: 'Code Example',
      code: 'const greeting = "Hello, World!";\nconsole.log(greeting);'
    }
  },
  {
    id: 'quote',
    name: 'Quote',
    icon: '💬',
    description: 'Feature an inspiring quote',
    defaultContent: {
      title: '',
      content: '"The only way to do great work is to love what you do."\n— Steve Jobs'
    }
  },
  {
    id: 'section',
    name: 'Section Break',
    icon: '📑',
    description: 'Divide your presentation into sections',
    defaultContent: {
      title: 'Section Title',
      subtitle: 'Section description or context'
    }
  },
  {
    id: 'blank',
    name: 'Blank',
    icon: '⬜',
    description: 'Start with a clean slate',
    defaultContent: {
      title: '',
      content: ''
    }
  },
  {
    id: 'numbered',
    name: 'Numbered List',
    icon: '🔢',
    description: 'Ordered list for steps or priorities',
    defaultContent: {
      title: 'Step by Step',
      bullets: ['Step one - Getting started', 'Step two - Implementation', 'Step three - Review and refine']
    }
  },
  {
    id: 'agenda',
    name: 'Agenda',
    icon: '📅',
    description: 'Outline your presentation agenda',
    defaultContent: {
      title: 'Agenda',
      bullets: ['Introduction', 'Main Topic', 'Demo', 'Q&A', 'Next Steps']
    }
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    icon: '🙏',
    description: 'End your presentation with gratitude',
    defaultContent: {
      title: 'Thank You!',
      subtitle: 'Questions? Contact: your@email.com'
    }
  },
  {
    id: 'stats',
    name: 'Statistics',
    icon: '📈',
    description: 'Highlight key numbers and metrics',
    defaultContent: {
      title: 'Key Metrics',
      bullets: ['95% Customer Satisfaction', '2x Revenue Growth', '50+ Happy Clients']
    }
  }
]

export const getTemplateById = (id: string): SlideTemplate => {
  return SLIDE_TEMPLATES.find(t => t.id === id) || SLIDE_TEMPLATES[0]
}

export default SLIDE_TEMPLATES
