export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
}

export const CATEGORIES_REPOSITORY = Symbol('CATEGORIES_REPOSITORY');

export interface CategoriesRepository {
  listActive(): Promise<CategoryRecord[]>;
}
