export interface CategoryStyle {
  color: string;
  label: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'Café': { color: '#C8793A', label: 'Café' },
  Restaurant: { color: '#E1552E', label: 'Restaurant' },
  Bar: { color: '#8B4B9C', label: 'Bar' },
  Pub: { color: '#6B3FA0', label: 'Pub' },
  'Fast Food': { color: '#DFA22E', label: 'Fast Food' },
  Library: { color: '#2F7A6B', label: 'Library' },
  Park: { color: '#4C9A5B', label: 'Park' },
  Museum: { color: '#3B5BA5', label: 'Museum' },
  'Shopping Mall': { color: '#5B6B7D', label: 'Shopping Mall' },
};

const FALLBACK_STYLE: CategoryStyle = { color: '#78716C', label: 'Place' };

export function getCategoryStyle(categoryName: string | null): CategoryStyle {
  if (!categoryName) return FALLBACK_STYLE;
  return CATEGORY_STYLES[categoryName] ?? { ...FALLBACK_STYLE, label: categoryName };
}
