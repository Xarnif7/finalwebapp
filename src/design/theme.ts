export const theme = {
  radii: {
    card: '1rem', // rounded-2xl
    pill: '9999px',
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  shadows: {
    card: '0 10px 25px -10px rgba(0,0,0,0.15)',
    hover: '0 16px 40px -12px rgba(0,0,0,0.18)',
  },
  container: {
    maxWidth: '80rem', // max-w-7xl
    paddingX: '1rem',
  },
  gradients: {
    soft: 'linear-gradient(180deg, rgba(247,249,252,1) 0%, rgba(241,245,249,1) 100%)',
  },
} as const;

export type Theme = typeof theme;


