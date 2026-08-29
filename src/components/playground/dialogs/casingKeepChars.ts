export const getKeepCharsKey = (fieldKey: string) => `${fieldKey}KeepChars`;

export const parseKeepCharsInput = (value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const chars = trimmed
    .split(/[\s,;]+/g)
    .flatMap((part) => Array.from(part.trim()))
    .filter(Boolean);

  return Array.from(new Set(chars));
};

export const formatKeepCharsInput = (value: unknown): string => {
  if (!Array.isArray(value)) return '';

  return value
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .join(', ');
};
