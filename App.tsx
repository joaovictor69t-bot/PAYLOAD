import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole, WorkRecord, RecordMode, IndividualType, MonthlyGroup } from './types';
import * as StorageService from './services/storage';
import { Button, Card, Input, Modal, ErrorBoundary } from './components/UI';
import { 
  IconPlus, IconHistory, IconCamera, 
  IconTrash, IconDownload, IconChevronDown, IconLogOut, IconSearch, IconHome 
} from './components/Icons';

// --- Login View ---
const LoginView = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [activeTab, setActiveTab] = useState<'DRIVER' | 'ADMIN'>('DRIVER');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'DRIVER' && isRegistering) {
        if (!name || !username || !password) throw new Error('Preencha todos os campos');
        const newUser = await StorageService.registerUser(name, username, password);
        onLogin(newUser);
      } else {
        // Login Logic
        const role = activeTab === 'DRIVER' ? UserRole.DRIVER : UserRole.ADMIN;
        const user = await StorageService.authenticate(username, password, role);
        if (user) {
          onLogin(user);
        } else {
          throw new Error('Credenciais inválidas.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-600 tracking-tight">PayLoad</h1>
          <p className="text-gray-500 mt-2">Gestão de entregas simplificada</p>
        </div>

        <Card className="p-1 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'DRIVER' ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab('DRIVER'); setIsRegistering(false); setError(''); }}
            >
              Entregador
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'ADMIN' ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab('ADMIN'); setIsRegistering(false); setError(''); }}
            >
              Administrador
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            
            <div className="mb-4">
              {isRegistering && activeTab === 'DRIVER' && (
                <div className="mb-4">
                  <Input 
                    label="Nome Completo" 
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <Input 
                  label="Usuário" 
                  placeholder="Nome de usuário" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white"
                />
                
                <Input 
                  label="Senha" 
                  type="password" 
                  placeholder="Sua senha" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg mb-4">{error}</div>}

            <Button fullWidth type="submit" size="lg" disabled={loading}>
              {loading ? 'Carregando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
            </Button>

            {activeTab === 'DRIVER' && (
              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  {isRegistering ? 'Já tenho conta? Login' : 'Não tem conta? Cadastre-se'}
                </button>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

// --- Dashboard View ---
const DashboardView = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const data = await StorageService.getUserRecords(user.id);
        setRecords(data);
      } catch (error) {
        console.error("Failed to fetch records", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [user.id]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const monthRecords = records.filter(r => r.date.startsWith(currentMonthStr));
    const totalEarnings = monthRecords.reduce((acc, curr) => acc + curr.value, 0);
    
    // Calculate unique days worked
    const uniqueDays = new Set(monthRecords.map(r => r.date)).size;
    const dailyAvg = uniqueDays > 0 ? totalEarnings / uniqueDays : 0;

    return { totalEarnings, dailyAvg };
  }, [records]);

  if (loading) return <div className="text-center p-10 text-gray-500">Carregando dados...</div>;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white shadow-lg shadow-brand-200/50">
        <h2 className="text-brand-100 text-sm font-medium uppercase tracking-wider mb-1">Ganhos do Mês</h2>
        <div className="text-4xl font-bold mb-4">{StorageService.formatCurrency(stats.totalEarnings)}</div>
        <div className="flex items-center text-brand-100 text-sm bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
          <span>Média Diária: {StorageService.formatCurrency(stats.dailyAvg)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/new-record')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mb-3 text-brand-600">
            <IconPlus />
          </div>
          <span className="font-semibold text-gray-800">Novo Registro</span>
        </button>

        <button 
          onClick={() => navigate('/history')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 text-blue-600">
            <IconHistory />
          </div>
          <span className="font-semibold text-gray-800">Histórico</span>
        </button>
      </div>

      {/* Recent Activity Mini List */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3 px-1">Atividade Recente</h3>
        {records.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
            Nenhum registro ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 3).map(r => (
              <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                <div>
                  <div className="font-medium text-gray-800">
                    {r.mode === RecordMode.DAILY ? 'Daily' : (r.type === IndividualType.PARCEL ? 'Parcels' : 'Collections')}
                  </div>
                  <div className="text-xs text-gray-500">{StorageService.formatDate(r.date)}</div>
                </div>
                <div className="font-bold text-brand-600">{StorageService.formatCurrency(r.value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- New Record (Calculator) View ---
const CalculatorView = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  
  // State
  const [mode, setMode] = useState<RecordMode>(RecordMode.INDIVIDUAL);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Individual
  const [parcels, setParcels] = useState('');
  const [collections, setCollections] = useState('');
  
  // Daily
  const [isTwoIDs, setIsTwoIDs] = useState(false);
  const [dailyQty, setDailyQty] = useState('');
  const [routeId1, setRouteId1] = useState('');
  const [routeId2, setRouteId2] = useState('');
  
  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Computed Values for Preview
  const previewValue = useMemo(() => {
    if (mode === RecordMode.INDIVIDUAL) {
      const p = parseInt(parcels) || 0;
      const c = parseInt(collections) || 0;
      return StorageService.calculateIndividual(p, c).total;
    } else {
      const qty = parseInt(dailyQty) || 0;
      return StorageService.calculateDaily(isTwoIDs, qty);
    }
  }, [mode, parcels, collections, isTwoIDs, dailyQty]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotos(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const handleSave = async () => {
    if (!date) return alert('Selecione uma data');
    setLoading(true);

    try {
      if (mode === RecordMode.INDIVIDUAL) {
        const pQty = parseInt(parcels);
        const cQty = parseInt(collections);
        
        if (!pQty && !cQty) throw new Error('Preencha ao menos parcelas ou coletas.');

        const promises = [];
        if (pQty > 0) {
          promises.push(StorageService.createRecord({
            userId: user.id, date, mode, type: IndividualType.PARCEL,
            quantity: pQty, value: pQty * 1.00, photos,
            routeNames: routeId1, 
            isTwoIDs: false
          }));
        }
        if (cQty > 0) {
          promises.push(StorageService.createRecord({
            userId: user.id, date, mode, type: IndividualType.COLLECTION,
            quantity: cQty, value: cQty * 0.80, photos, 
            routeNames: routeId1, 
            isTwoIDs: false
          }));
        }
        await Promise.all(promises);

      } else {
        // Daily
        const qty = parseInt(dailyQty) || 0;
        if (isTwoIDs && (!routeId1 || !routeId2)) throw new Error('Digite os IDs das duas rotas.');
        
        const finalRouteNames = isTwoIDs ? `${routeId1} + ${routeId2}` : routeId1;
        // Allows saving routeId1 even if single ID
        const singleRouteName = !isTwoIDs && routeId1 ? routeId1 : undefined;

        await StorageService.createRecord({
          userId: user.id, date, mode, type: IndividualType.DAILY_FLAT,
          quantity: isTwoIDs ? qty : 1, 
          value: previewValue,
          isTwoIDs,
          routeNames: finalRouteNames || singleRouteName,
          photos
        });
      }
      navigate('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 animate-fade-in">
      <div className="flex items-center mb-6">
         <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full">
           <IconChevronDown className="rotate-90 w-6 h-6" />
         </button>
         <h1 className="text-2xl font-bold text-gray-800 ml-2">Novo Registro</h1>
      </div>

      <Card className="p-6 space-y-6">
        {/* Toggle Mode */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === RecordMode.INDIVIDUAL ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
            onClick={() => setMode(RecordMode.INDIVIDUAL)}
           >
             Individual
           </button>
           <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === RecordMode.DAILY ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
            onClick={() => setMode(RecordMode.DAILY)}
           >
             Daily
           </button>
        </div>

        <Input type="date" label="Data" value={date} onChange={e => setDate(e.target.value)} />

        {mode === RecordMode.INDIVIDUAL ? (
          <div className="space-y-4">
             <Input 
              label="ID Rota (Opcional)" 
              value={routeId1} 
              onChange={e => setRouteId1(e.target.value)} 
              placeholder="Ex: 101"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Parcelas (£1.00)" type="number" inputMode="numeric"
                value={parcels} onChange={e => setParcels(e.target.value)} 
                placeholder="0"
              />
              <Input 
                label="Coletas (£0.80)" type="number" inputMode="numeric"
                value={collections} onChange={e => setCollections(e.target.value)} 
                placeholder="0"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-6 mb-4">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" checked={!isTwoIDs} onChange={() => setIsTwoIDs(false)} className="accent-brand-600 w-5 h-5"/>
                 <span className="text-gray-700 font-medium">1 ID</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" checked={isTwoIDs} onChange={() => setIsTwoIDs(true)} className="accent-brand-600 w-5 h-5"/>
                 <span className="text-gray-700 font-medium">2 IDs</span>
               </label>
            </div>

            <div className="space-y-4 animate-fade-in">
              {isTwoIDs ? (
                <div className="grid grid-cols-2 gap-3">
                    <Input 
                        label="ID Rota 1" 
                        value={routeId1} 
                        onChange={e => setRouteId1(e.target.value)} 
                        placeholder="Ex: 101"
                    />
                    <Input 
                        label="ID Rota 2" 
                        value={routeId2} 
                        onChange={e => setRouteId2(e.target.value)} 
                        placeholder="Ex: 102"
                    />
                </div>
              ) : (
                 <Input 
                    label="ID Rota" 
                    value={routeId1} 
                    onChange={e => setRouteId1(e.target.value)} 
                    placeholder="Ex: 101"
                />
              )}

              {isTwoIDs ? (
                <>
                  <Input 
                    label="Quantidade Total" 
                    type="number" inputMode="numeric"
                    value={dailyQty} 
                    onChange={e => setDailyQty(e.target.value)} 
                  />
                  <div className="text-xs text-gray-500 bg-white/50 p-2 rounded border border-blue-100">
                    {'<'} 150: £260 | 150-250: £300 | {'>'} 250: £360
                  </div>
                </>
              ) : (
                  <p className="text-sm text-gray-500">Valor fixo: £180.00</p>
              )}
            </div>
          </div>
        )}

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comprovantes</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <label className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-brand-300 rounded-lg flex flex-col items-center justify-center text-brand-500 cursor-pointer hover:bg-brand-50 transition-colors">
              <IconCamera className="w-6 h-6 mb-1"/>
              <span className="text-xs">Add</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            {photos.map((p, i) => (
              <div key={i} className="relative w-20 h-20 flex-shrink-0">
                <img src={p} alt="Proof" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                <button 
                  onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                >
                  <IconTrash className="w-3 h-3"/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Total Preview */}
        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-gray-500 font-medium">Total Estimado</span>
          <span className="text-3xl font-bold text-brand-600">{StorageService.formatCurrency(previewValue)}</span>
        </div>

        <Button fullWidth size="lg" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Registro'}
        </Button>
      </Card>
    </div>
  );
};

// --- History View ---
const HistoryView = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await StorageService.getUserRecords(user.id);
      setRecords(data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { refresh(); }, [user.id]);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este registro?')) {
      await StorageService.deleteRecord(id);
      refresh();
    }
  };

  const groupedRecords: MonthlyGroup[] = useMemo(() => {
    const groups: { [key: string]: MonthlyGroup } = {};
    
    records.forEach(r => {
      const monthKey = r.date.substring(0, 7); // YYYY-MM
      const dateObj = new Date(r.date);
      const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      if (!groups[monthKey]) {
        groups[monthKey] = { monthKey, label, total: 0, records: [] };
      }
      groups[monthKey].records.push(r);
      groups[monthKey].total += r.value;
    });

    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [records]);

  if (loading && records.length === 0) return <div className="text-center p-10 text-gray-400">Carregando histórico...</div>;

  return (
    <div className="pb-24 animate-fade-in">
       <div className="flex items-center mb-6 justify-between">
         <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full">
              <IconChevronDown className="rotate-90 w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 ml-2">Histórico</h1>
         </div>
      </div>

      <div className="space-y-6">
        {groupedRecords.length === 0 && <p className="text-center text-gray-500 mt-10">Nenhum histórico disponível.</p>}
        
        {groupedRecords.map(group => (
          <div key={group.monthKey} className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{group.label}</h3>
                <span className="text-sm text-brand-600 font-semibold">{StorageService.formatCurrency(group.total)}</span>
              </div>
              <button 
                onClick={() => StorageService.generateCSV(group.records, `Payload_${user.username}_${group.monthKey}`)}
                className="text-xs flex items-center gap-1 text-gray-500 hover:text-brand-600 bg-white border border-gray-200 px-2 py-1 rounded"
              >
                <IconDownload className="w-3 h-3" /> CSV
              </button>
            </div>

            {group.records.map(r => (
              <Card key={r.id} className="overflow-hidden transition-all">
                <div 
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-mono">{StorageService.formatDate(r.date)}</span>
                    <span className="font-medium text-gray-800">
                      {r.mode === RecordMode.DAILY 
                        ? (r.isTwoIDs ? `Daily (2 IDs)` : 'Daily (1 ID)') 
                        : (r.type === IndividualType.PARCEL ? 'Individual (Parcel)' : 'Individual (Coleta)')
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-brand-600">{StorageService.formatCurrency(r.value)}</span>
                    <IconChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === r.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {expandedId === r.id && (
                  <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <div><span className="font-semibold">Qtd:</span> {r.quantity}</div>
                      {r.routeNames && <div><span className="font-semibold">Rotas:</span> {r.routeNames}</div>}
                    </div>
                    
                    {r.photos.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {r.photos.map((p, idx) => (
                          <img 
                            key={idx} 
                            src={p} 
                            onClick={() => setModalImage(p)}
                            className="w-12 h-12 object-cover rounded border border-gray-200 cursor-zoom-in" 
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="pt-2 flex justify-end">
                      <button onClick={() => handleDelete(r.id)} className="text-red-600 text-xs flex items-center gap-1 hover:underline">
                        <IconTrash className="w-3 h-3"/> Apagar Registro
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ))}
      </div>

      <Modal isOpen={!!modalImage} onClose={() => setModalImage(null)}>
        {modalImage && <img src={modalImage} className="w-full h-auto rounded-lg" alt="Full size" />}
      </Modal>
    </div>
  );
};

// --- Admin Panel View ---
const AdminView = () => {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await StorageService.getAllDrivers();
        setDrivers(data);
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGlobalExport = async () => {
    setExportLoading(true);
    let allRecords: WorkRecord[] = [];
    try {
      for (const d of drivers) {
        const recs = await StorageService.getUserRecords(d.id);
        allRecords = [...allRecords, ...recs];
      }
      StorageService.generateCSV(allRecords, `Payload_GLOBAL_EXPORT_${new Date().toISOString().split('T')[0]}`);
    } catch(err) {
      alert("Erro ao exportar");
    } finally {
      setExportLoading(false);
    }
  };

  if (selectedDriver) {
    return (
      <div>
        <div className="bg-brand-900 text-white p-4 -mx-4 -mt-4 mb-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedDriver(null)} className="p-1 hover:bg-brand-800 rounded">
              <IconChevronDown className="rotate-90 w-5 h-5"/>
            </button>
            <div>
              <h2 className="font-bold">{selectedDriver.name}</h2>
              <p className="text-xs text-brand-200">@{selectedDriver.username}</p>
            </div>
          </div>
        </div>
        <HistoryView user={selectedDriver} />
      </div>
    );
  }

  if (loading) return <div className="text-center p-10 text-gray-500">Carregando motoristas...</div>;

  return (
    <div className="pb-20 animate-fade-in">
       <h1 className="text-2xl font-bold text-gray-800 mb-6">Painel Admin</h1>

       <div className="flex gap-2 mb-6">
         <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-2.5 text-gray-400 w-5 h-5"/>
            <input 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Buscar motorista..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <Button variant="secondary" onClick={handleGlobalExport} className="whitespace-nowrap" disabled={exportLoading}>
           {exportLoading ? '...' : <IconDownload className="w-5 h-5"/>}
         </Button>
       </div>

       <div className="space-y-3">
         {filteredDrivers.map(d => (
           <Card key={d.id} className="p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDriver(d)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold">
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{d.name}</div>
                  <div className="text-xs text-gray-500">@{d.username}</div>
                </div>
              </div>
              <IconChevronDown className="-rotate-90 text-gray-400 w-5 h-5"/>
           </Card>
         ))}
       </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial check for admin presence in DB
    const init = async () => {
       try {
         // Race condition: If Supabase takes longer than 5s, we stop loading anyway to show Login
         const timeout = new Promise(resolve => setTimeout(resolve, 5000));
         const dbInit = StorageService.initializeStorage();
         
         await Promise.race([dbInit, timeout]);
       } catch (error) {
         console.error("Initialization error:", error);
       } finally {
         setLoading(false);
       }
    };
    init();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Iniciando sistema...</div>;

  return (
    <HashRouter>
        <div className="max-w-md mx-auto min-h-screen bg-gray-50 shadow-2xl relative">
          
          {/* Header (Only if logged in) */}
          {currentUser && (
            <header className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                 <span className="font-bold text-gray-800">PayLoad</span>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right">
                   <div className="text-xs text-gray-400">Olá,</div>
                   <div className="text-sm font-bold text-gray-800 leading-none">{currentUser.username}</div>
                 </div>
                 <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
                   <IconLogOut className="w-6 h-6" />
                 </button>
              </div>
            </header>
          )}

          <main className="p-4">
            <Routes>
              {!currentUser ? (
                <Route path="*" element={<LoginView onLogin={handleLogin} />} />
              ) : (
                <>
                  {currentUser.role === UserRole.ADMIN ? (
                    <Route path="*" element={<AdminView />} />
                  ) : (
                    <>
                      <Route path="/" element={<DashboardView user={currentUser} />} />
                      <Route path="/new-record" element={<CalculatorView user={currentUser} />} />
                      <Route path="/history" element={<HistoryView user={currentUser} />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                  )}
                </>
              )}
            </Routes>
          </main>

          {/* Bottom Nav (Only for drivers) */}
          {currentUser && currentUser.role === UserRole.DRIVER && (
            <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-3 pb-safe z-30">
              <NavItem to="/" icon={<IconHome />} label="Início" />
              <NavItem to="/new-record" icon={<IconPlus />} label="Novo" />
              <NavItem to="/history" icon={<IconHistory />} label="Histórico" />
            </nav>
          )}
        </div>
    </HashRouter>
  );
}

const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const navigate = useNavigate();

  return (
    <button 
      onClick={() => navigate(to)}
      className={`flex flex-col items-center gap-1 ${isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className={`& > svg { w-6 h-6 }`}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
};