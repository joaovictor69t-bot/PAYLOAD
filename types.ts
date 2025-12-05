export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
}

export interface User {
  id: string;
  name: string;
  username: string;
  passwordHash: string; // Simple storage for demo
  role: UserRole;
  createdAt: number;
}

export enum RecordMode {
  INDIVIDUAL = 'INDIVIDUAL',
  DAILY = 'DAILY', // Previously "AREA"
}

export enum IndividualType {
  PARCEL = 'PARCEL',
  COLLECTION = 'COLLECTION',
  DAILY_FLAT = 'DAILY_FLAT', // For Daily mode records
}

export interface WorkRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mode: RecordMode;
  type: IndividualType;
  
  // Logic fields
  quantity: number; // For parcels/collections/total items in daily
  value: number; // Calculated GBP value
  
  // Daily specific
  routeNames?: string; // For 2 IDs
  isTwoIDs?: boolean;

  photos: string[]; // Base64 strings
  timestamp: number;
}

export interface AppState {
  currentUser: User | null;
}

export type MonthlyGroup = {
  monthKey: string; // YYYY-MM
  label: string; // "December 2024"
  total: number;
  records: WorkRecord[];
};
