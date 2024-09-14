
export function isDevelopment(): boolean {
  return import.meta.env.VITE_NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return import.meta.env.VITE_NODE_ENV === 'production';
}

export function isDte(): boolean {
  return import.meta.env.VITE_NODE_ENV === 'dte';
}

