export const PRODUCT_CATEGORY_OPTIONS = [
  'Digital',
  'Physical',
  'Grocery',
  'Fashion',
  'Mobile',
  'Gadgets',
  'Beauty',
  'Health',
  'General'
];

export const SHOP_FILTER_CATEGORIES = ['All', ...PRODUCT_CATEGORY_OPTIONS.filter((category) => category !== 'General')];
