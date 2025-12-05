import { User, UserRole, WorkRecord, RecordMode, IndividualType } from '../types';
import { supabase } from './supabase';

// --- Utilities ---

export const generateUUID = (): string => {
  return crypto.randomUUID();
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);
};

// --- Auth & User Management ---

export const initializeStorage = async () => {
  try {
    // Check if admin exists. If table doesn't exist, this might throw or return error.
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single();

    // If "PGRST116" code, it means no rows returned (which is fine, we create admin).
    // If other error (like table missing), we log and return to avoid crashing the whole app.
    if (error && error.code !== 'PGRST116') {
      console.warn("Skipping admin seed due to database error (Table might be missing):", error.message);
      return;
    }

    if (!users) { 
      const admin = {
        name: 'System Admin',
        username: 'admin',
        password_hash: 'EVRI01',
        role: UserRole.ADMIN,
        created_at: Date.now(),
      };
      await supabase.from('users').insert([admin]);
    }
  } catch (err) {
    console.warn("Initialize storage failed safely:", err);
  }
};

export const authenticate = async (username: string, password: string, role: UserRole): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password_hash', password)
    .eq('role', role)
    .single();

  if (error || !data) return null;

  // Map Supabase column names to Typescript interface
  return {
    id: data.id,
    name: data.name,
    username: data.username,
    passwordHash: data.password_hash,
    role: data.role as UserRole,
    createdAt: data.created_at
  };
};

export const registerUser = async (name: string, username: string, password: string): Promise<User> => {
  // Check if user exists
  const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
  
  if (existing) {
    throw new Error('Usuário já existe.');
  }
  
  const newUser = {
    name,
    username,
    password_hash: password,
    role: UserRole.DRIVER,
    created_at: Date.now(),
  };
  
  const { data, error } = await supabase.from('users').insert([newUser]).select().single();
  
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    name: data.name,
    username: data.username,
    passwordHash: data.password_hash,
    role: data.role as UserRole,
    createdAt: data.created_at
  };
};

export const getAllDrivers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', UserRole.DRIVER);

  if (error) return [];

  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    username: d.username,
    passwordHash: d.password_hash,
    role: d.role as UserRole,
    createdAt: d.created_at
  }));
};

// --- Records Management ---

export const createRecord = async (record: Omit<WorkRecord, 'id' | 'timestamp'>) => {
  const newRecord = {
    user_id: record.userId,
    date: record.date,
    mode: record.mode,
    type: record.type,
    quantity: record.quantity,
    value: record.value,
    route_names: record.routeNames,
    is_two_ids: record.isTwoIDs,
    photos: record.photos, // Supabase text[] handles array of strings
    timestamp: Date.now(),
  };

  const { error } = await supabase.from('work_records').insert([newRecord]);
  if (error) throw new Error('Erro ao salvar registro: ' + error.message);
};

export const getUserRecords = async (userId: string): Promise<WorkRecord[]> => {
  const { data, error } = await supabase
    .from('work_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) return [];

  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    mode: r.mode as RecordMode,
    type: r.type as IndividualType,
    quantity: r.quantity,
    value: r.value,
    routeNames: r.route_names,
    isTwoIDs: r.is_two_ids,
    photos: r.photos || [],
    timestamp: r.timestamp
  }));
};

export const deleteRecord = async (recordId: string) => {
  const { error } = await supabase.from('work_records').delete().eq('id', recordId);
  if (error) throw new Error('Erro ao deletar registro');
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