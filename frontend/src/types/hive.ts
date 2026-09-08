export interface Hive {
  _id: string;
  hiveId: string;
  beekeeperId: string;
  hiveType: string;
  location?: {
    latitude: number;
    longitude: number;
    region: string;
  };
  installationDate?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}