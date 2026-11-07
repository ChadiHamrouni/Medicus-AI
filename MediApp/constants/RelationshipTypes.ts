/**
 * Relationship types for emergency contacts and dependents.
 */
export const RELATIONSHIP_TYPES: { key: string; value: string }[] = [
  { key: 'main', value: 'Main' },
  { key: 'spouse', value: 'Spouse' },
  { key: 'child', value: 'Child' },
  { key: 'parent', value: 'Parent' },
  { key: 'sibling', value: 'Sibling' },
  { key: 'grandparent', value: 'Grandparent' },
  { key: 'grandchild', value: 'Grandchild' },
  { key: 'guardian', value: 'Guardian' },
  { key: 'other', value: 'Other' },
];

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]['key'];
