export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'dangerOutline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus-visible:ring-blue-500',
  secondary:
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-700 focus-visible:ring-gray-400',
  success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm focus-visible:ring-green-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-500',
  dangerOutline:
    'bg-white text-red-700 border border-red-200 hover:bg-red-50 hover:border-red-300 dark:bg-slate-800 dark:text-red-300 dark:border-red-900/60 dark:hover:bg-red-900/20 focus-visible:ring-red-400',
  ghost: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 focus-visible:ring-blue-500',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function btn(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}${extra ? ` ${extra}` : ''}`;
}

export const ICON_BTN =
  'w-9 h-9 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed';

export const ICON_BTN_DANGER =
  'w-9 h-9 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30 disabled:cursor-not-allowed';
