/**
 * Centralized Theme Constants
 * All colors and design tokens should be defined here
 */

// Brand Colors
export const BRAND_COLORS = {
  primary: {
    DEFAULT: '#4f46e5', // Indigo-600
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  secondary: {
    DEFAULT: '#7c3aed', // Violet-600
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
} as const;

// Semantic Colors
export const SEMANTIC_COLORS = {
  success: {
    DEFAULT: '#10b981', // Emerald-500
    light: '#d1fae5',   // Emerald-100
    dark: '#047857',    // Emerald-700
  },
  error: {
    DEFAULT: '#ef4444', // Red-500
    light: '#fee2e2',   // Red-100
    dark: '#b91c1c',    // Red-700
  },
  warning: {
    DEFAULT: '#f59e0b', // Amber-500
    light: '#fef3c7',   // Amber-100
    dark: '#b45309',    // Amber-700
  },
  info: {
    DEFAULT: '#3b82f6', // Blue-500
    light: '#dbeafe',   // Blue-100
    dark: '#1d4ed8',    // Blue-700
  },
} as const;

// Neutral Colors (Gray Palette)
export const NEUTRAL_COLORS = {
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
} as const;

// Status Colors (for badges, indicators)
export const THEME_STATUS_COLORS = {
  pending: {
    bg: '#fef3c7',      // Amber-100
    text: '#92400e',    // Amber-800
    border: '#fcd34d',  // Amber-300
  },
  priced: {
    bg: '#dbeafe',      // Blue-100
    text: '#1e40af',    // Blue-800
    border: '#93c5fd',  // Blue-300
  },
  approved: {
    bg: '#d1fae5',      // Emerald-100
    text: '#065f46',    // Emerald-800
    border: '#6ee7b7',  // Emerald-300
  },
  rejected: {
    bg: '#fee2e2',      // Red-100
    text: '#991b1b',    // Red-800
    border: '#fca5a5',  // Red-300
  },
  completed: {
    bg: '#ede9fe',      // Violet-100
    text: '#5b21b6',    // Violet-800
    border: '#c4b5fd',  // Violet-300
  },
} as const;

// Typography
export const TYPOGRAPHY = {
  fontFamily: {
    sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-geist-mono)', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
} as const;

// Spacing & Sizing
export const SPACING = {
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
} as const;

// Shadows
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

// Export all theme constants
export const THEME = {
  colors: {
    brand: BRAND_COLORS,
    semantic: SEMANTIC_COLORS,
    neutral: NEUTRAL_COLORS,
    status: THEME_STATUS_COLORS,
  },
  typography: TYPOGRAPHY,
  spacing: SPACING,
  shadows: SHADOWS,
} as const;

export default THEME;
