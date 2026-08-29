export function resolveMonacoTheme(theme?: string): 'vs' | 'vs-dark' {
  return theme === 'dark' ? 'vs-dark' : 'vs';
}
