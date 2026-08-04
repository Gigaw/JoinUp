export interface CityRecord {
  id: string;
  slug: string;
  name: string;
  timeZone: string;
}

export const CITIES_REPOSITORY = Symbol('CITIES_REPOSITORY');

export interface CitiesRepository {
  listSupported(): Promise<CityRecord[]>;
}
