export type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
};

export type SortOption = 'name' | 'size' | 'created';
export type SortDirection = 'asc' | 'desc';
export type DocumentFilterType = 'all' | 'pdf' | 'image' | 'document';
