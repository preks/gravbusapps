/**
 * Slide Themes - Professional presentation themes using Spectacle theming
 */

export interface SlideTheme {
  id: string
  name: string
  preview: {
    primary: string
    secondary: string
    background: string
  }
  theme: {
    colors: {
      primary: string
      secondary: string
      tertiary: string
      quaternary: string
    }
    fonts: {
      header: string
      text: string
      monospace: string
    }
    fontSizes: {
      h1: string
      h2: string
      h3: string
      text: string
      monospace: string
    }
  }
}

export const SLIDE_THEMES: SlideTheme[] = [
  {
    id: 'corporate',
    name: 'Corporate Blue',
    preview: { primary: '#1e40af', secondary: '#3b82f6', background: '#ffffff' },
    theme: {
      colors: {
        primary: '#1e3a5f',
        secondary: '#3b82f6',
        tertiary: '#f8fafc',
        quaternary: '#60a5fa'
      },
      fonts: {
        header: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
        text: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
        monospace: '"Fira Code", "Monaco", monospace'
      },
      fontSizes: {
        h1: '72px',
        h2: '56px',
        h3: '40px',
        text: '32px',
        monospace: '24px'
      }
    }
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    preview: { primary: '#f8fafc', secondary: '#94a3b8', background: '#0f172a' },
    theme: {
      colors: {
        primary: '#f8fafc',
        secondary: '#94a3b8',
        tertiary: '#0f172a',
        quaternary: '#3b82f6'
      },
      fonts: {
        header: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
        text: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
        monospace: '"Fira Code", "Monaco", monospace'
      },
      fontSizes: {
        h1: '72px',
        h2: '56px',
        h3: '40px',
        text: '32px',
        monospace: '24px'
      }
    }
  },
  {
    id: 'newwork-dark',
    name: 'NEWWORK Dark',
    preview: { primary: '#e91e8c', secondary: '#f5a623', background: '#0a0a0a' },
    theme: {
      colors: {
        primary: '#ffffff',
        secondary: '#e91e8c',
        tertiary: '#0a0a0a',
        quaternary: '#f5a623'
      },
      fonts: {
        header: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
        text: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
        monospace: '"Fira Code", "Monaco", monospace'
      },
      fontSizes: {
        h1: '72px',
        h2: '56px',
        h3: '40px',
        text: '32px',
        monospace: '24px'
      }
    }
  },
  {
    id: 'newwork-light',
    name: 'NEWWORK Light',
    preview: { primary: '#1e3a5f', secondary: '#e91e8c', background: '#ffffff' },
    theme: {
      colors: {
        primary: '#1e3a5f',
        secondary: '#e91e8c',
        tertiary: '#ffffff',
        quaternary: '#f5a623'
      },
      fonts: {
        header: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
        text: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
        monospace: '"Fira Code", "Monaco", monospace'
      },
      fontSizes: {
        h1: '72px',
        h2: '56px',
        h3: '40px',
        text: '32px',
        monospace: '24px'
      }
    }
  },
  {
    id: 'nature',
    name: 'Nature Green',
    preview: { primary: '#166534', secondary: '#22c55e', background: '#f0fdf4' },
    theme: {
      colors: {
        primary: '#14532d',
        secondary: '#22c55e',
        tertiary: '#f0fdf4',
        quaternary: '#4ade80'
      },
      fonts: {
        header: '"Merriweather", Georgia, serif',
        text: '"Source Sans Pro", "Helvetica Neue", sans-serif',
        monospace: '"Fira Code", "Monaco", monospace'
      },
      fontSizes: {
        h1: '68px',
        h2: '52px',
        h3: '38px',
        text: '30px',
        monospace: '22px'
      }
    }
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    preview: { primary: '#9a3412', secondary: '#f97316', background: '#fff7ed' },
    theme: {
      colors: {
        primary: '#7c2d12',
        secondary: '#f97316',
        tertiary: '#fff7ed',
        quaternary: '#fb923c'
      },
      fonts: {
        header: '"Poppins", "Helvetica Neue", sans-serif',
        text: '"Open Sans", "Helvetica Neue", sans-serif',
        monospace: '"JetBrains Mono", "Monaco", monospace'
      },
      fontSizes: {
        h1: '70px',
        h2: '54px',
        h3: '40px',
        text: '32px',
        monospace: '24px'
      }
    }
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    preview: { primary: '#0e7490', secondary: '#06b6d4', background: '#ecfeff' },
    theme: {
      colors: {
        primary: '#164e63',
        secondary: '#06b6d4',
        tertiary: '#ecfeff',
        quaternary: '#22d3ee'
      },
      fonts: {
        header: '"Nunito", "Helvetica Neue", sans-serif',
        text: '"Nunito", "Helvetica Neue", sans-serif',
        monospace: '"Fira Code", "Monaco", monospace'
      },
      fontSizes: {
        h1: '72px',
        h2: '56px',
        h3: '40px',
        text: '32px',
        monospace: '24px'
      }
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    preview: { primary: '#18181b', secondary: '#71717a', background: '#fafafa' },
    theme: {
      colors: {
        primary: '#18181b',
        secondary: '#71717a',
        tertiary: '#fafafa',
        quaternary: '#a1a1aa'
      },
      fonts: {
        header: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
        text: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
        monospace: '"SF Mono", "Monaco", monospace'
      },
      fontSizes: {
        h1: '64px',
        h2: '48px',
        h3: '36px',
        text: '28px',
        monospace: '22px'
      }
    }
  },
  {
    id: 'gradient',
    name: 'Gradient Purple',
    preview: { primary: '#7c3aed', secondary: '#a855f7', background: '#faf5ff' },
    theme: {
      colors: {
        primary: '#581c87',
        secondary: '#a855f7',
        tertiary: '#faf5ff',
        quaternary: '#c084fc'
      },
      fonts: {
        header: '"DM Sans", "Helvetica Neue", sans-serif',
        text: '"DM Sans", "Helvetica Neue", sans-serif',
        monospace: '"JetBrains Mono", "Monaco", monospace'
      },
      fontSizes: {
        h1: '76px',
        h2: '58px',
        h3: '42px',
        text: '32px',
        monospace: '24px'
      }
    }
  }
]

export const getThemeById = (id: string): SlideTheme => {
  return SLIDE_THEMES.find(t => t.id === id) || SLIDE_THEMES[0]
}

export default SLIDE_THEMES
