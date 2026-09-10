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
  'Clothing Shop': { color: '#452E8A', label: 'Clothing Shop' },
  'Shoe Shop': { color: '#87A0C9', label: 'Shoe Shop' },
  Supermarket: { color: '#8B7923', label: 'Supermarket' },
  'Convenience Store': { color: '#98D78E', label: 'Convenience Store' },
  Bakery: { color: '#9BCA49', label: 'Bakery' },
  'Jewelry Shop': { color: '#86276D', label: 'Jewelry Shop' },
  'Electronics Shop': { color: '#5454D4', label: 'Electronics Shop' },
  'Cosmetics Shop': { color: '#D864B5', label: 'Cosmetics Shop' },
  Bookshop: { color: '#2E5214', label: 'Bookshop' },
  Hairdresser: { color: '#B83D74', label: 'Hairdresser' },
  'Beauty Salon': { color: '#D67185', label: 'Beauty Salon' },
  Pharmacy: { color: '#229CB4', label: 'Pharmacy' },
  Bank: { color: '#173F6D', label: 'Bank' },
  Cinema: { color: '#6B176D', label: 'Cinema' },
};

const FALLBACK_STYLE: CategoryStyle = { color: '#78716C', label: 'Place' };

export function getCategoryStyle(categoryName: string | null): CategoryStyle {
  if (!categoryName) return FALLBACK_STYLE;
  return CATEGORY_STYLES[categoryName] ?? { ...FALLBACK_STYLE, label: categoryName };
}
