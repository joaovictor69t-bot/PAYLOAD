import { User, UserRole, WorkRecord, RecordMode, IndividualType } from '../types';

const KEYS = {
  USERS: 'pt_users_v2',
  RECORDS: 'pt_records_v2',
  SESSION: 'pt_session_v2',
};

// --- Utilities ---

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);
};

// --- Auth & User Management ---

const getStoredUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredUsers = (users: User[]) => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const initializeStorage = () => {
  const users = getStoredUsers();
  // Check if admin exists
  const adminExists = users.some(u => u.username === 'admin');
  if (!adminExists) {
    const admin: User = {
      id: generateUUID(),
      name: 'System Admin',
      username: 'admin',
      passwordHash: 'EVRI01', // Hardcoded as per requirements
      role: UserRole.ADMIN,
      createdAt: Date.now(),
    };
    users.push(admin);
    saveStoredUsers(users);
  }
};

export const authenticate = (username: string, password: string, role: UserRole): User | null => {
  const users = getStoredUsers();
  const user = users.find(u => u.username === username && u.passwordHash === password && u.role === role);
  return user || null;
};

export const registerUser = (name: string, username: string, password: string): User => {
  const users = getStoredUsers();
  if (users.some(u => u.username === username)) {
    throw new Error('Usuário já existe.');
  }
  
  const newUser: User = {
    id: generateUUID(),
    name,
    username,
    passwordHash: password,
    role: UserRole.DRIVER,
    createdAt: Date.now(),
  };
  
  users.push(newUser);
  saveStoredUsers(users);
  return newUser;
};

export const getAllDrivers = (): User[] => {
  return getStoredUsers().filter(u => u.role === UserRole.DRIVER);
};

// --- Records Management ---

const getStoredRecords = (): WorkRecord[] => {
  try {
    const raw = localStorage.getItem(KEYS.RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredRecords = (records: WorkRecord[]) => {
  localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
};

export const createRecord = (record: Omit<WorkRecord, 'id' | 'timestamp'>) => {
  const records = getStoredRecords();
  const newRecord: WorkRecord = {
    ...record,
    id: generateUUID(),
    timestamp: Date.now(),
  };
  records.push(newRecord);
  saveStoredRecords(records);
};

export const getUserRecords = (userId: string): WorkRecord[] => {
  const records = getStoredRecords();
  return records
    .filter(r => r.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date)); // Newest first
};

export const deleteRecord = (recordId: string) => {
  let records = getStoredRecords();
  records = records.filter(r => r.id !== recordId);
  saveStoredRecords(records);
};

// --- Calculation Logic ---

export const calculateIndividual = (parcels: number, collections: number) => {
  const parcelValue = parcels * 1.00;
  const collectionValue = collections * 0.80;
  return { parcelValue, collectionValue, total: parcelValue + collectionValue };
};

export const calculateDaily = (isTwoIDs: boolean, quantity: number): number => {
  if (!isTwoIDs) return 180.00;
  
  // Logic for 2 IDs
  if (quantity < 150) return 260.00;
  if (quantity <= 250) return 300.00; // 150 to 250
  return 360.00; // > 250
};

// --- CSV Export ---

export const generateCSV = (records: WorkRecord[], fileName: string) => {
  const headers = ['Data', 'Tipo', 'Modo', 'Qtd', 'Valor', 'Rotas', 'ID'];
  const rows = records.map(r => [
    r.date,
    r.type,
    r.mode,
    r.quantity.toString(),
    r.value.toFixed(2),
    r.routeNames || '-',
    r.id
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
