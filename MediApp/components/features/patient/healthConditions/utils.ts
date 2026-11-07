export const getCategoryIcon = (category?: string) => {
  const categoryLower = category?.toLowerCase() || '';
  if (categoryLower.includes('cardio')) return 'heart';
  if (categoryLower.includes('respiratory')) return 'lungs';
  if (categoryLower.includes('endocrine')) return 'diabetes';
  if (categoryLower.includes('neurological')) return 'brain';
  if (categoryLower.includes('digestive')) return 'stomach';
  if (categoryLower.includes('musculoskeletal')) return 'bone';
  return 'medical-bag';
};
