import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Modern Dark theme colors - Improved
        vscode: {
          bg: {
            primary: '#0d1117',
            secondary: '#161b22',
            tertiary: '#1f2937',
            elevated: '#2d333b',
            card: '#1a1f28',
          },
          text: {
            primary: '#e6edf3',
            secondary: '#9198a1',
            muted: '#6e7681',
          },
          accent: {
            blue: '#58a6ff',
            green: '#3fb950',
            yellow: '#f0c674',
            red: '#ff7b72',
            purple: '#bc8cff',
            orange: '#ff9e64',
          },
          border: {
            primary: '#30363d',
            focus: '#58a6ff',
            hover: '#3d444d',
          },
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Noto Sans', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
