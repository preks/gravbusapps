import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--nw-background))',
  			foreground: 'hsl(var(--nw-foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--nw-card))',
  				foreground: 'hsl(var(--nw-card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--nw-popover))',
  				foreground: 'hsl(var(--nw-popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--nw-primary))',
  				foreground: 'hsl(var(--nw-primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--nw-secondary))',
  				foreground: 'hsl(var(--nw-secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--nw-muted))',
  				foreground: 'hsl(var(--nw-muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--nw-accent))',
  				foreground: 'hsl(var(--nw-accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--nw-destructive))',
  				foreground: 'hsl(var(--nw-destructive-foreground))'
  			},
  			border: 'hsl(var(--nw-border))',
  			input: 'hsl(var(--nw-input))',
  			ring: 'hsl(var(--nw-ring))',
  			chart: {
  				'1': 'hsl(var(--nw-chart-1))',
  				'2': 'hsl(var(--nw-chart-2))',
  				'3': 'hsl(var(--nw-chart-3))',
  				'4': 'hsl(var(--nw-chart-4))',
  				'5': 'hsl(var(--nw-chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--nw-sidebar-background))',
  				foreground: 'hsl(var(--nw-sidebar-foreground))',
  				primary: 'hsl(var(--nw-sidebar-primary))',
  				'primary-foreground': 'hsl(var(--nw-sidebar-primary-foreground))',
  				accent: 'hsl(var(--nw-sidebar-accent))',
  				'accent-foreground': 'hsl(var(--nw-sidebar-accent-foreground))',
  				border: 'hsl(var(--nw-sidebar-border))',
  				ring: 'hsl(var(--nw-sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--nw-radius)',
  			md: 'calc(var(--nw-radius) - 2px)',
  			sm: 'calc(var(--nw-radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--nw-radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--nw-radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
