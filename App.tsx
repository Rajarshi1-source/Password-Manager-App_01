import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Unlock, Plus, Home, Shield, Key, Settings, 
  LogOut, CreditCard, StickyNote, User, Eye, EyeOff,
  Copy, Trash2, Smartphone, Globe, Edit2, Users, Cloud, Check, Folder, ArrowRight, Zap, History, Menu, X, Star, FolderPlus, Search as SearchIcon, LayoutGrid, List as ListIcon, Fingerprint, AlertTriangle
} from 'lucide-react';
import { VaultItem, VaultItemType, AppScreen, BreachReport, UserProfile, ActivityLogEntry } from './types';
import * as CryptoService from './services/cryptoService';
import * as GeminiService from './services/geminiService';
import PasswordGenerator from './components/PasswordGenerator';
import SecurityDashboard from './components/SecurityDashboard';
import EmergencyAccess from './components/EmergencyAccess';
import TwoFactorSetup from './components/TwoFactorSetup';
import ActivityLog from './components/ActivityLog';

const DEMO_ITEMS: VaultItem[] = [
  { id: '1', type: VaultItemType.LOGIN, name: 'Google', folder: 'Personal', username: 'john.doe@gmail.com', password: 'Password123!', url: 'google.com', favorite: true, createdAt: Date.now() },
  { id: '2', type: VaultItemType.CARD, name: 'Visa Gold', folder: 'Finance', cardNumber: '4000 1234 5678 9010', expiry: '12/25', cvv: '123', favorite: false, createdAt: Date.now() },
];

const AUTO_LOCK_TIME_MS = 5 * 60 * 1000; // 5 Minutes
const WARNING_TIME_MS = 30 * 1000; // 30 Seconds warning

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [emailInput, setEmailInput] = useState('');
  const [masterInput, setMasterInput] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // UI State for Auth
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA State
  const [is2FAVerifying, setIs2FAVerifying] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [sensitiveActionPending, setSensitiveActionPending] = useState<{ type: 'VIEW' | 'DELETE', item: VaultItem } | null>(null);

  // App State
  const [activeScreen, setActiveScreen] = useState<AppScreen>('AUTH');
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | 'All'>('All');
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  
  // Search & Folders
  const [searchQuery, setSearchQuery] = useState('');
  const [knownFolders, setKnownFolders] = useState<string[]>(['Personal', 'Work', 'Finance', 'Social']);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Item Detail Visibility State
  const [itemPasswordVisible, setItemPasswordVisible] = useState(false);

  // Generator Modal State
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [generatorCallback, setGeneratorCallback] = useState<((pwd: string) => void) | null>(null);
  
  // Form State (Add/Edit)
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [newItemType, setNewItemType] = useState<VaultItemType>(VaultItemType.LOGIN);
  const [formData, setFormData] = useState<Partial<VaultItem>>({});
  const [showFormPassword, setShowFormPassword] = useState(false);
  
  // Analysis State
  const [analysis, setAnalysis] = useState<BreachReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Mobile Menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Session Timer
  const lastActivityRef = useRef<number>(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // --- Initialization & Session Management ---

  useEffect(() => {
    // Load User Profile
    const storedProfile = localStorage.getItem('securevault_user');
    if (storedProfile) {
      setUserProfile(JSON.parse(storedProfile));
      setAuthMode('LOGIN');
    } else {
      setAuthMode('SIGNUP');
    }

    // Load Logs
    const storedLogs = localStorage.getItem('securevault_logs');
    if (storedLogs) {
        setActivityLogs(JSON.parse(storedLogs));
    }
    
    // Load Custom Folders
    const storedFolders = localStorage.getItem('securevault_folders');
    if (storedFolders) {
        setKnownFolders(JSON.parse(storedFolders));
    }

    // Check "Remember Me" with simple obfuscation
    const savedAuthEnc = localStorage.getItem('securevault_saved_key');
    const savedEmail = localStorage.getItem('securevault_saved_email');
    if (savedAuthEnc && savedEmail && storedProfile) {
        const profile = JSON.parse(storedProfile);
        if (savedEmail === profile.email) {
            setEmailInput(savedEmail);
            try {
                const savedAuth = atob(savedAuthEnc);
                if (CryptoService.hashPassword(savedAuth) === profile.masterHash) {
                    setMasterInput(savedAuth);
                    completeLogin(savedAuth);
                }
            } catch (e) {
                console.warn("Failed to decode saved credentials");
            }
        }
    }
  }, []);

  // Idle Timer Logic
  useEffect(() => {
    const checkIdle = () => {
      if (!isAuthenticated) return;
      
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      if (timeSinceLastActivity > AUTO_LOCK_TIME_MS) {
        handleLogout('Auto-lock due to inactivity');
        setShowSessionWarning(false);
      } else if (timeSinceLastActivity > AUTO_LOCK_TIME_MS - WARNING_TIME_MS) {
        setShowSessionWarning(true);
      } else {
        setShowSessionWarning(false);
      }
    };

    const interval = setInterval(checkIdle, 1000);
    
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      // If warning was visible and user interacts, hide it
      setShowSessionWarning(false);
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    
    return () => {
        clearInterval(interval);
        window.removeEventListener('mousemove', updateActivity);
        window.removeEventListener('keydown', updateActivity);
        window.removeEventListener('click', updateActivity);
    };
  }, [isAuthenticated]);

  useEffect(() => {
      // Reset visibility when selection changes
      setItemPasswordVisible(false);
      setAnalysis(null);
  }, [selectedItem]);

  // --- Logging Helper ---

  const logActivity = (action: string, details?: string) => {
      const newLog: ActivityLogEntry = {
          id: Date.now().toString(),
          action,
          timestamp: Date.now(),
          details,
          ip: '192.168.1.X' // Mock IP
      };
      const updatedLogs = [...activityLogs, newLog];
      setActivityLogs(updatedLogs);
      localStorage.setItem('securevault_logs', JSON.stringify(updatedLogs));
  };

  // --- Actions ---

  const simulateSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const loadVault = () => {
    const stored = localStorage.getItem('securevault_data');
    if (stored) {
      try {
        const decrypted = CryptoService.decryptData(stored);
        setVaultItems(JSON.parse(decrypted));
      } catch (e) {
        console.error("Failed to decrypt vault");
        alert("Decryption failed. Data might be corrupted.");
      }
    } else {
      setVaultItems(DEMO_ITEMS);
    }
    simulateSync();
  };

  const saveVault = (items: VaultItem[]) => {
    try {
      const encrypted = CryptoService.encryptData(JSON.stringify(items));
      localStorage.setItem('securevault_data', encrypted);
      setVaultItems(items);
      simulateSync();
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterInput.length < 6) {
        alert("Master password must be at least 6 characters");
        return;
    }
    const hash = CryptoService.hashPassword(masterInput);
    const newProfile: UserProfile = {
        email: emailInput,
        masterHash: hash,
        biometricEnabled: false,
        twoFactorEnabled: false,
        passkeyRegistered: false
    };
    localStorage.setItem('securevault_user', JSON.stringify(newProfile));
    setUserProfile(newProfile);
    
    if (rememberMe) {
        localStorage.setItem('securevault_saved_key', btoa(masterInput));
        localStorage.setItem('securevault_saved_email', emailInput);
    }

    CryptoService.setSessionKey(masterInput);
    logActivity('Account Created', `User: ${emailInput}`);
    setIsAuthenticated(true);
    setActiveScreen('VAULT');
    loadVault();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    const hash = CryptoService.hashPassword(masterInput);
    if (hash === userProfile.masterHash && emailInput === userProfile.email) {
       if (userProfile.twoFactorEnabled) {
           setIs2FAVerifying(true);
       } else {
           completeLogin(masterInput);
       }
    } else {
      logActivity('Login Failed', 'Invalid credentials');
      alert("Invalid credentials.");
    }
  };

  const verify2FA = (e: React.FormEvent) => {
      e.preventDefault();
      if (twoFACode === '123456') {
          if (sensitiveActionPending) {
              if (sensitiveActionPending.type === 'VIEW') {
                  logActivity('View Password (2FA Verified)', sensitiveActionPending.item.name);
                  setItemPasswordVisible(true);
              } else if (sensitiveActionPending.type === 'DELETE') {
                  performDelete(sensitiveActionPending.item.id);
                  setActiveScreen('VAULT');
              }
              setSensitiveActionPending(null);
              setTwoFACode('');
          } else {
              completeLogin(masterInput);
              setIs2FAVerifying(false);
              setTwoFACode('');
          }
      } else {
          alert("Invalid 2FA Code (Use 123456)");
      }
  };

  const completeLogin = (key: string) => {
      CryptoService.setSessionKey(key);
      logActivity('Login Successful', 'Session started');
      
      if (rememberMe) {
        localStorage.setItem('securevault_saved_key', btoa(key));
        localStorage.setItem('securevault_saved_email', emailInput);
      } else {
        localStorage.removeItem('securevault_saved_key');
        localStorage.removeItem('securevault_saved_email');
      }

      setIsAuthenticated(true);
      setActiveScreen('VAULT');
      loadVault();
      setMasterInput(''); 
  };

  const handleLogout = (reason?: string) => {
      setIsAuthenticated(false);
      CryptoService.setSessionKey('');
      setActiveScreen('AUTH');
      setMasterInput('');
      logActivity('Logout', reason || 'User initiated');
  };

  const handleBiometricMock = () => {
    if (!userProfile?.passkeyRegistered) {
        alert("No Passkey registered. Please login with password and enable it in Settings.");
        return;
    }
    
    // Simulate WebAuthn Challenge
    setTimeout(() => {
        const mockKey = "demo123";
        CryptoService.setSessionKey(mockKey);
        logActivity('Biometric Login', 'Passkey verified');
        setIsAuthenticated(true);
        setActiveScreen('VAULT');
        loadVault();
    }, 1000);
  };
  
  const registerPasskey = () => {
      // Simulate Passkey Registration
      if (userProfile) {
          setTimeout(() => {
            const updated = { ...userProfile, passkeyRegistered: true };
            localStorage.setItem('securevault_user', JSON.stringify(updated));
            setUserProfile(updated);
            logActivity('Passkey Registered', 'Device Authenticator added');
            alert("Passkey registered successfully! You can now login with biometrics.");
          }, 1000);
      }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    
    let updatedList = [...vaultItems];
    
    // Ensure folder is in known folders if new
    if (formData.folder && !knownFolders.includes(formData.folder)) {
        const newFolders = [...knownFolders, formData.folder];
        setKnownFolders(newFolders);
        localStorage.setItem('securevault_folders', JSON.stringify(newFolders));
    }
    
    if (editingItem) {
        updatedList = updatedList.map(item => 
            item.id === editingItem.id 
            ? { ...item, ...formData, updatedAt: Date.now() } as VaultItem
            : item
        );
        logActivity('Item Updated', formData.name);
    } else {
        const newItem: VaultItem = {
            id: CryptoService.generateId(),
            type: newItemType,
            name: formData.name || 'Untitled',
            ...formData,
            favorite: false,
            createdAt: Date.now()
        } as VaultItem;
        updatedList.push(newItem);
        logActivity('Item Created', newItem.name);
    }

    saveVault(updatedList);
    setActiveScreen('VAULT');
    setFormData({});
    setEditingItem(null);
  };

  const startEdit = (item: VaultItem) => {
      setEditingItem(item);
      setNewItemType(item.type);
      setFormData(item);
      setShowFormPassword(false);
      setActiveScreen('EDIT_ITEM');
  };

  const requestDelete = (item: VaultItem) => {
      if (userProfile?.twoFactorEnabled) {
          setSensitiveActionPending({ type: 'DELETE', item });
          setIs2FAVerifying(true);
      } else {
          if (confirm(`Delete ${item.name}?`)) performDelete(item.id);
      }
  };

  const performDelete = (id: string) => {
      const item = vaultItems.find(i => i.id === id);
      const updated = vaultItems.filter(i => i.id !== id);
      saveVault(updated);
      setSelectedItem(null);
      logActivity('Item Deleted', item?.name || 'Unknown Item');
  };

  const analyzeCurrentPassword = async (pwd: string) => {
    setAnalyzing(true);
    const result = await GeminiService.analyzePasswordSecurity(pwd);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const enable2FA = () => {
      if (userProfile) {
          const updated = { ...userProfile, twoFactorEnabled: true };
          localStorage.setItem('securevault_user', JSON.stringify(updated));
          setUserProfile(updated);
          logActivity('2FA Enabled', 'Security setting updated');
          setActiveScreen('SETTINGS');
      }
  };

  const openGenerator = (callback: (pwd: string) => void) => {
      setGeneratorCallback(() => callback);
      setShowGeneratorModal(true);
  };

  const handleGeneratorSelect = (pwd: string) => {
      if (generatorCallback) generatorCallback(pwd);
      setShowGeneratorModal(false);
  };

  const simulateAutoFill = (item: VaultItem) => {
      logActivity('Auto-fill Used', `Domain: ${item.url || 'Unknown'}`);
      
      const toast = document.createElement('div');
      toast.className = "fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 animate-fade-in-down";
      toast.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> <span>Auto-filled <b>${item.name}</b></span>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
  };

  const handleSensitiveView = (item: VaultItem) => {
    if (itemPasswordVisible) {
        setItemPasswordVisible(false);
        return;
    }

    if (userProfile?.twoFactorEnabled) {
        setSensitiveActionPending({ type: 'VIEW', item });
        setIs2FAVerifying(true);
    } else {
        setItemPasswordVisible(true);
        logActivity('Password Revealed', item.name);
    }
  };
  
  const handleOpenCreateFolder = () => {
      setNewFolderInput('');
      setShowFolderModal(true);
  };

  const confirmCreateFolder = () => {
      if (newFolderInput.trim() && !knownFolders.includes(newFolderInput.trim())) {
          const updatedFolders = [...knownFolders, newFolderInput.trim()];
          setKnownFolders(updatedFolders);
          localStorage.setItem('securevault_folders', JSON.stringify(updatedFolders));
          logActivity('Folder Created', newFolderInput.trim());
          setShowFolderModal(false);
      } else if (knownFolders.includes(newFolderInput.trim())) {
          alert('Folder already exists');
      }
  };
  
  const toggleFavorite = (e: React.MouseEvent, item: VaultItem) => {
      e.stopPropagation();
      const updated = vaultItems.map(i => i.id === item.id ? { ...i, favorite: !i.favorite } : i);
      setVaultItems(updated); // Optimistic update
      saveVault(updated);
  };
  
  const copyToClipboard = (e: React.MouseEvent, text: string, label: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      logActivity(`${label} Copied`, 'Vault Action');
      
      const btn = e.currentTarget as HTMLButtonElement;
      const original = btn.innerHTML;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => btn.innerHTML = original, 1500);
  };

  const renderStrengthMeter = (score: number) => {
      let label = 'Weak';
      let color = 'bg-red-500';
      let textColor = 'text-red-400';
      if (score > 30) { label = 'Fair'; color = 'bg-yellow-500'; textColor = 'text-yellow-400'; }
      if (score > 60) { label = 'Good'; color = 'bg-blue-500'; textColor = 'text-blue-400'; }
      if (score > 80) { label = 'Strong'; color = 'bg-emerald-500'; textColor = 'text-emerald-400'; }

      return (
          <div className="mt-2">
            <div className="flex justify-between items-end mb-1">
                 <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Entropy</span>
                 <span className={`text-xs font-bold ${textColor}`}>{label}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${score}%` }}></div>
            </div>
          </div>
      );
  };

  // --- RENDERERS ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 relative">
          
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-full animate-bounce-slow">
              <Shield size={48} className="text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-white mb-2">SecureVault</h1>
          <p className="text-slate-400 text-center mb-8">
             {is2FAVerifying ? "Two-Factor Verification" : (authMode === 'LOGIN' ? "Welcome Back" : "Create Master Vault")}
          </p>
          
          {is2FAVerifying ? (
             <form onSubmit={verify2FA} className="space-y-4">
                 <div className="text-center mb-4">
                    <p className="text-sm text-slate-400 mb-2">Enter the code from your authenticator app</p>
                 </div>
                 <input
                    type="text"
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-center tracking-widest text-2xl font-mono focus:border-emerald-500 outline-none"
                    placeholder="000000"
                    autoFocus
                  />
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors">
                    Verify Identity
                  </button>
                  <button type="button" onClick={() => { setIs2FAVerifying(false); setSensitiveActionPending(null); }} className="w-full text-slate-400 py-2 hover:text-white">Cancel</button>
             </form>
          ) : (
            <form onSubmit={authMode === 'LOGIN' ? handleLogin : handleSignup} className="space-y-4">
                {authMode === 'SIGNUP' && showGeneratorModal && (
                    <div className="mb-4 bg-slate-900 p-4 rounded-xl border border-slate-700">
                         <PasswordGenerator compact onSelect={(pwd) => { setMasterInput(pwd); setShowGeneratorModal(false); }} onClose={() => setShowGeneratorModal(false)} />
                    </div>
                )}
                
                <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-300 block mb-1">Email Address</label>
                <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                    placeholder="name@example.com"
                    required
                />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                     <label htmlFor="password" className="text-sm font-medium text-slate-300">Master Password</label>
                     {authMode === 'SIGNUP' && !showGeneratorModal && (
                         <button type="button" onClick={() => setShowGeneratorModal(true)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                             <Key size={12}/> Generate
                         </button>
                     )}
                  </div>
                  <div className="relative">
                    <input
                        id="password"
                        type={showMasterPassword ? "text" : "password"}
                        name="password"
                        autoComplete={authMode === 'LOGIN' ? "current-password" : "new-password"}
                        value={masterInput}
                        onChange={(e) => setMasterInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pr-12 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                        placeholder="Enter password"
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowMasterPassword(!showMasterPassword)} 
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                        aria-label={showMasterPassword ? "Hide password" : "Show password"}
                    >
                        {showMasterPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  
                  <div className="flex items-center mt-3">
                      <input 
                        id="remember-me" 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500" 
                      />
                      <label htmlFor="remember-me" className="ml-2 text-sm text-slate-400 cursor-pointer">
                          Keep me logged in <span className="text-xs text-slate-600">(Unsafe for public devices)</span>
                      </label>
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-emerald-900/20">
                {authMode === 'LOGIN' ? 'Unlock Vault' : 'Create Vault'}
                </button>
            </form>
          )}

          {!is2FAVerifying && (
              <>
                <div className="mt-6 flex items-center justify-between">
                    <div className="h-px bg-slate-700 flex-1"></div>
                    <span className="px-4 text-slate-500 text-sm">OR</span>
                    <div className="h-px bg-slate-700 flex-1"></div>
                </div>

                <div className="space-y-3 mt-6">
                    <button onClick={handleBiometricMock} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors">
                        <Fingerprint size={20} /> Biometric / Passkey Login
                    </button>
                </div>
                
                <p className="mt-6 text-center text-slate-400 text-sm">
                    {authMode === 'LOGIN' ? "Don't have a vault?" : "Already have a vault?"}
                    <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')} className="ml-2 text-emerald-400 hover:underline font-medium">
                        {authMode === 'LOGIN' ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const renderHeader = () => (
     <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-300 hover:text-white">
                <Menu />
            </button>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {activeScreen === 'VAULT' ? 'My Vault' : 
                activeScreen === 'SETTINGS' ? 'Settings' : 
                activeScreen === 'EMERGENCY' ? 'Emergency' : 
                activeScreen === 'ACTIVITY' ? 'Logs' : 'Security'}
            </h2>
        </div>
        <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-xs ${isSyncing ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}>
                <Cloud size={14} />
                {isSyncing ? 'Syncing...' : 'Synced'}
            </div>
            {activeScreen === 'VAULT' && (
                <>
                <div className="hidden sm:flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                        <LayoutGrid size={16} />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-700 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                        <ListIcon size={16} />
                    </button>
                </div>
                <button onClick={() => { setEditingItem(null); setFormData({}); setShowFormPassword(false); setActiveScreen('EDIT_ITEM'); }} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg shadow-lg shadow-emerald-900/20 transition-transform hover:scale-105">
                <Plus size={24} />
                </button>
                </>
            )}
        </div>
      </header>
  );
  
  // Merge items' folders with known folders and deduplicate
  const getFolders = () => {
      const itemFolders = vaultItems.map(i => i.folder).filter(Boolean) as string[];
      return Array.from(new Set([...knownFolders, ...itemFolders]));
  };

  const renderVaultList = () => {
    const folders = getFolders();
    const filteredItems = vaultItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              item.username?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        if (selectedFolder === 'All') return true;
        if (selectedFolder === 'Favorites') return item.favorite;
        return item.folder === selectedFolder;
    });

    return (
      <div className="p-4 pb-24 max-w-6xl mx-auto">
        {renderHeader()}
        
        {/* Search & Filter */}
        <div className="mb-6 relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon size={18} className="text-slate-500" />
             </div>
             <input 
                placeholder="Search vault items..." 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500 transition-colors shadow-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
        </div>

        {/* Folder / Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4 items-center">
          <button 
             onClick={() => setSelectedFolder('All')}
             className={`px-4 py-1.5 rounded-full border text-sm whitespace-nowrap transition-colors ${selectedFolder === 'All' ? 'bg-white text-slate-900 border-white font-medium' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
          >
            All Items
          </button>
           <button 
             onClick={() => setSelectedFolder('Favorites')}
             className={`px-4 py-1.5 rounded-full border text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${selectedFolder === 'Favorites' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
          >
            <Star size={12} fill={selectedFolder === 'Favorites' ? 'currentColor' : 'none'} /> Favorites
          </button>
          
          <div className="w-px h-6 bg-slate-700 mx-1"></div>

          {folders.map(folder => (
            <button 
                key={folder} 
                onClick={() => setSelectedFolder(folder)}
                className={`px-4 py-1.5 rounded-full border text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${selectedFolder === folder ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
            >
                <Folder size={12} /> {folder}
            </button>
          ))}
          <button onClick={handleOpenCreateFolder} className="px-3 py-1.5 rounded-full border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center gap-1 text-sm whitespace-nowrap">
              <Plus size={14} /> New
          </button>
        </div>

        {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => { setSelectedItem(item); setActiveScreen('ITEM_DETAIL'); setAnalysis(null); }}
              className="bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm hover:shadow-lg flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-start justify-between mb-4 pl-2 relative z-10">
                  <div className={`p-3 rounded-xl ${item.type === VaultItemType.LOGIN ? 'bg-blue-500/10 text-blue-400' : item.type === VaultItemType.CARD ? 'bg-purple-500/10 text-purple-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {item.type === VaultItemType.LOGIN ? <Globe size={24} /> : item.type === VaultItemType.CARD ? <CreditCard size={24} /> : <StickyNote size={24} />}
                  </div>
                  <button 
                    onClick={(e) => toggleFavorite(e, item)}
                    className={`p-2 rounded-full hover:bg-slate-700 transition-colors ${item.favorite ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'}`}
                  >
                      <Star size={18} fill={item.favorite ? "currentColor" : "none"} />
                  </button>
              </div>
              
              <div className="mb-6 pl-2 relative z-10">
                  <h3 className="text-white font-bold text-lg leading-tight truncate">{item.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                      <p className="text-slate-400 text-sm truncate max-w-[150px]">{item.username || item.cardNumber || 'Secure Note'}</p>
                      {item.username && (
                          <button onClick={(e) => copyToClipboard(e, item.username!, 'Username')} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white bg-slate-700/50 p-1 rounded">
                              <Copy size={12} />
                          </button>
                      )}
                  </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 mt-auto pl-2 relative z-10">
                 {item.folder ? (
                    <span className="text-[10px] bg-slate-700/50 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1">
                        <Folder size={10} /> {item.folder}
                    </span>
                 ) : <span></span>}
                 
                 <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(item); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors" title="Edit">
                        <Edit2 size={14} />
                    </button>
                    {item.type === VaultItemType.LOGIN && (
                         <button onClick={(e) => { e.stopPropagation(); simulateAutoFill(item); }} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors" title="Auto-fill">
                             <Zap size={14} />
                         </button>
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>
        ) : (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-medium">Name</th>
                            <th className="p-4 font-medium hidden sm:table-cell">Details</th>
                            <th className="p-4 font-medium hidden sm:table-cell">Folder</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredItems.map(item => (
                            <tr key={item.id} onClick={() => { setSelectedItem(item); setActiveScreen('ITEM_DETAIL'); setAnalysis(null); }} className="hover:bg-slate-700/30 cursor-pointer group transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${item.type === VaultItemType.LOGIN ? 'bg-blue-500/10 text-blue-400' : item.type === VaultItemType.CARD ? 'bg-purple-500/10 text-purple-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                            {item.type === VaultItemType.LOGIN ? <Globe size={16} /> : item.type === VaultItemType.CARD ? <CreditCard size={16} /> : <StickyNote size={16} />}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{item.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-400 text-sm hidden sm:table-cell">
                                    {item.username || item.cardNumber || '-'}
                                </td>
                                <td className="p-4 hidden sm:table-cell">
                                    {item.folder ? <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{item.folder}</span> : '-'}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); startEdit(item); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={(e) => toggleFavorite(e, item)} className={`p-2 hover:bg-slate-700 rounded-lg transition-colors ${item.favorite ? 'text-yellow-400' : 'text-slate-400'}`}>
                                            <Star size={16} fill={item.favorite ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

          {filteredItems.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                  <div className="inline-block p-4 bg-slate-800 rounded-full mb-3">
                      {searchQuery ? <SearchIcon size={32} /> : <Folder size={32} />}
                  </div>
                  <p>{searchQuery ? `No results for "${searchQuery}"` : "No items found."}</p>
              </div>
          )}
      </div>
    );
  };

  const renderItemDetail = () => {
    if (!selectedItem) return null;
    return (
      <div className="p-4 pb-24 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
             <button onClick={() => setActiveScreen('VAULT')} className="text-slate-400 hover:text-white flex items-center gap-2 group px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
              <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={20}/> Back
            </button>
            <div className="flex gap-2">
                {selectedItem.type === VaultItemType.LOGIN && (
                    <button onClick={() => simulateAutoFill(selectedItem)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                        <Zap size={16} /> Auto-fill
                    </button>
                )}
                <button onClick={() => startEdit(selectedItem)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-slate-700">
                    <Edit2 size={16} /> Edit
                </button>
            </div>
        </div>
        
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="p-8 border-b border-slate-700 flex justify-between items-start bg-slate-800/50">
            <div>
               <h2 className="text-3xl font-bold text-white mb-2">{selectedItem.name}</h2>
               <div className="flex items-center gap-2">
                   <span className="text-sm text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 font-medium">{selectedItem.type}</span>
                   {selectedItem.folder && <span className="text-sm text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-900/30 flex items-center gap-1"><Folder size={12}/> {selectedItem.folder}</span>}
                   {selectedItem.favorite && <span className="text-yellow-400"><Star size={16} fill="currentColor"/></span>}
               </div>
            </div>
            <div className={`p-4 rounded-xl bg-slate-700/50 border border-slate-600`}>
              {selectedItem.type === VaultItemType.LOGIN ? <Globe size={32} className="text-blue-400" /> : <CreditCard size={32} className="text-purple-400" />}
            </div>
          </div>

          <div className="p-8 space-y-8">
            {selectedItem.username && (
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Username / Email</label>
                <div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-white text-lg font-medium">{selectedItem.username}</span>
                  <button onClick={(e) => copyToClipboard(e, selectedItem.username!, 'Username')} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
                      <Copy size={20} />
                  </button>
                </div>
              </div>
            )}

            {selectedItem.password && (
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Password</label>
                <div className="bg-slate-900 rounded-xl border border-slate-700 group overflow-hidden">
                  <div className="flex justify-between items-center p-4">
                     <span className="text-white font-mono text-lg">
                         {itemPasswordVisible ? selectedItem.password : '•'.repeat(Math.min(selectedItem.password.length, 20))}
                     </span>
                     <div className="flex gap-2">
                        <button onClick={() => handleSensitiveView(selectedItem)} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg" title={itemPasswordVisible ? "Hide" : "Show"}>
                            {itemPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                        <button onClick={() => analyzeCurrentPassword(selectedItem.password!)} className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                            <Shield size={14} /> Analyze
                        </button>
                        <button onClick={(e) => copyToClipboard(e, selectedItem.password!, 'Password')} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg" title="Copy Password">
                            <Copy size={20} />
                        </button>
                     </div>
                  </div>
                  {renderStrengthMeter(Math.min(selectedItem.password.length * 5 + (/[A-Z]/.test(selectedItem.password) ? 10 : 0) + (/[0-9]/.test(selectedItem.password) ? 10 : 0), 100))}
                </div>
              </div>
            )}

            {analyzing && <p className="text-sm text-blue-400 animate-pulse flex items-center gap-2"><Shield size={16}/> Analyzing password strength with Gemini...</p>}
            
            {analysis && (
               <div className={`p-5 rounded-xl border ${analysis.isSafe ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'} animate-fade-in`}>
                 <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {analysis.isSafe ? <Check size={20} className="text-emerald-500" /> : <Shield size={20} className="text-red-500" />}
                        <h4 className={`font-bold ${analysis.isSafe ? 'text-emerald-400' : 'text-red-400'}`}>Security Score: {analysis.score}/100</h4>
                    </div>
                    {analysis.breachCount > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20">Potential Leak</span>}
                 </div>
                 <p className="text-sm text-slate-300 leading-relaxed">{analysis.analysis}</p>
                 {renderStrengthMeter(analysis.score)}
               </div>
            )}

            {selectedItem.cardNumber && (
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Card Number</label>
                  <div className="text-white text-xl tracking-widest font-mono p-4 bg-slate-900 rounded-xl border border-slate-700">{selectedItem.cardNumber}</div>
               </div>
            )}
            
            {selectedItem.note && (
                <div>
                   <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Notes</label>
                   <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 min-h-[100px]">
                       <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedItem.note}</p>
                   </div>
                </div>
            )}

            <div className="pt-6 mt-6 border-t border-slate-700">
               <button onClick={() => requestDelete(selectedItem)} className="w-full py-4 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 font-medium">
                 <Trash2 size={18} /> Delete Item
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderItemForm = () => (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <button onClick={() => setActiveScreen('VAULT')} className="text-slate-400 hover:text-white mb-4">Cancel</button>
      <h2 className="text-2xl font-bold text-white mb-6">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>

      <div className="flex gap-4 mb-6">
        {[VaultItemType.LOGIN, VaultItemType.CARD, VaultItemType.NOTE].map(t => (
          <button 
            key={t}
            type="button"
            onClick={() => setNewItemType(t)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${newItemType === t ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveItem} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-400 font-medium ml-1 mb-1 block">Name</label>
                <input 
                placeholder="e.g. Netflix"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
                />
            </div>
            <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-400 font-medium ml-1 mb-1 block">Folder</label>
                <div className="relative">
                    <input 
                        list="folder-options"
                        placeholder="Select or Type..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                        value={formData.folder || ''}
                        onChange={e => setFormData({...formData, folder: e.target.value})}
                    />
                    <datalist id="folder-options">
                        {knownFolders.map(f => <option key={f} value={f} />)}
                    </datalist>
                </div>
            </div>
        </div>

        {newItemType === VaultItemType.LOGIN && (
          <>
            <div>
                <label className="text-xs text-slate-400 font-medium ml-1 mb-1 block">Username / Email</label>
                <input 
                placeholder="user@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                value={formData.username || ''}
                onChange={e => setFormData({...formData, username: e.target.value})}
                />
            </div>
            <div>
                <div className="flex justify-between items-center mb-1 ml-1">
                    <label className="text-xs text-slate-400 font-medium block">Password</label>
                    <button type="button" onClick={() => openGenerator((p) => setFormData({...formData, password: p}))} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium">
                        <Key size={12}/> Generate
                    </button>
                </div>
                <div className="relative">
                    <input 
                    type={showFormPassword ? "text" : "password"}
                    placeholder="Password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pr-10 text-white focus:border-emerald-500 outline-none transition-colors font-mono"
                    value={formData.password || ''}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowFormPassword(!showFormPassword)} 
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                        {showFormPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                {formData.password && renderStrengthMeter(Math.min(formData.password.length * 5 + (/[A-Z]/.test(formData.password) ? 10 : 0) + (/[0-9]/.test(formData.password) ? 10 : 0), 100))}
            </div>
            <div>
                <label className="text-xs text-slate-400 font-medium ml-1 mb-1 block">Website URL</label>
                <input 
                placeholder="https://example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                value={formData.url || ''}
                onChange={e => setFormData({...formData, url: e.target.value})}
                />
            </div>
          </>
        )}
        
        {newItemType === VaultItemType.CARD && (
          <>
             <input 
              placeholder="Card Number"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
              value={formData.cardNumber || ''}
              onChange={e => setFormData({...formData, cardNumber: e.target.value})}
            />
            {/* ... other card fields ... */}
          </>
        )}

        <div>
            <label className="text-xs text-slate-400 font-medium ml-1 mb-1 block">Notes</label>
            <textarea
                placeholder="Additional details..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none h-32 resize-none transition-colors"
                value={formData.note || ''}
                onChange={e => setFormData({...formData, note: e.target.value})}
            />
        </div>

        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl mt-6 shadow-lg shadow-emerald-900/20 transition-all">
          Save Item
        </button>
      </form>
    </div>
  );

  const renderSettings = () => (
      <div className="p-4 pb-24 max-w-2xl mx-auto space-y-6">
          {renderHeader()}
          
          <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                      <User size={20} className="text-emerald-500" /> Account
                  </h3>
              </div>
              <div className="p-4">
                  <p className="text-slate-400 text-sm">Email</p>
                  <p className="text-white mb-4">{userProfile?.email}</p>
                  <button onClick={() => handleLogout()} className="text-red-400 text-sm hover:underline">Sign Out</button>
              </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                      <Shield size={20} className="text-emerald-500" /> Security
                  </h3>
              </div>
              <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                      <div>
                          <p className="text-white">Biometric / Passkey Login</p>
                          <p className="text-slate-400 text-xs">Login without master password</p>
                      </div>
                      {userProfile?.passkeyRegistered ? (
                           <span className="text-emerald-500 text-sm font-bold flex items-center gap-1"><Check size={14}/> Active</span>
                      ) : (
                          <button onClick={registerPasskey} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors">Register Passkey</button>
                      )}
                  </div>
                  <div className="flex items-center justify-between">
                      <div>
                          <p className="text-white">Two-Factor Auth (MFA)</p>
                          <p className="text-slate-400 text-xs">Require TOTP for sensitive actions</p>
                      </div>
                      {userProfile?.twoFactorEnabled ? (
                          <span className="text-emerald-500 text-sm font-bold flex items-center gap-1"><Check size={14}/> Enabled</span>
                      ) : (
                        <button onClick={() => setActiveScreen('TWO_FACTOR')} className="bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-lg text-sm font-medium hover:bg-emerald-600/30">Enable</button>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* Session Warning Modal */}
      {showSessionWarning && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-start justify-center p-4 sm:p-6 pointer-events-none">
            <div className="bg-yellow-500/90 text-slate-900 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 pointer-events-auto animate-bounce-slow backdrop-blur-sm">
                <AlertTriangle size={24} className="shrink-0" />
                <div>
                    <h4 className="font-bold">Session Expiring Soon</h4>
                    <p className="text-sm font-medium opacity-90">Vault will auto-lock in 30 seconds due to inactivity.</p>
                </div>
                <button onClick={() => setShowSessionWarning(false)} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-800">
                    Stay Logged In
                </button>
            </div>
         </div>
      )}

      {/* Folder Creation Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 border border-slate-600 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative transform transition-all scale-100">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
               <FolderPlus size={24} className="text-emerald-500" /> New Folder
            </h3>
            <input 
              autoFocus
              type="text" 
              placeholder="Folder Name (e.g., Work)" 
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white mb-4 focus:border-emerald-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && confirmCreateFolder()}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowFolderModal(false)}
                className="flex-1 py-3 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmCreateFolder}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Modal for Sensitive Actions */}
      {sensitiveActionPending && is2FAVerifying && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-800 border border-slate-600 p-8 rounded-2xl w-full max-w-sm shadow-2xl relative">
                  <button onClick={() => { setSensitiveActionPending(null); setIs2FAVerifying(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                  <div className="flex flex-col items-center text-center">
                      <div className="bg-emerald-500/20 p-4 rounded-full mb-4 text-emerald-500"><Shield size={32}/></div>
                      <h3 className="text-xl font-bold text-white mb-2">Security Check</h3>
                      <p className="text-slate-400 text-sm mb-6">Enter your 2FA code to {sensitiveActionPending.type === 'DELETE' ? 'delete this item' : 'reveal this password'}.</p>
                      <form onSubmit={verify2FA} className="w-full">
                          <input
                            type="text"
                            maxLength={6}
                            value={twoFACode}
                            onChange={(e) => setTwoFACode(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-center tracking-widest text-xl font-mono focus:border-emerald-500 outline-none mb-4"
                            placeholder="000000"
                            autoFocus
                          />
                          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors">Confirm</button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* Global Generator Modal */}
      {showGeneratorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
               <h3 className="text-xl font-bold text-white mb-4">Generate Password</h3>
               <PasswordGenerator 
                   compact 
                   onSelect={handleGeneratorSelect} 
                   onClose={() => setShowGeneratorModal(false)}
               />
           </div>
        </div>
      )}

      {/* Sidebar for Desktop / Hidden on Mobile */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-slate-900/95 backdrop-blur border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
           <div className="flex items-center gap-2 text-emerald-500 font-bold text-xl mb-8">
             <Shield size={24} /> SecureVault
           </div>
           <nav className="space-y-1">
             <button onClick={() => { setActiveScreen('VAULT'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeScreen === 'VAULT' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Home size={20} /> My Vault
             </button>
             <button onClick={() => { setActiveScreen('GENERATOR'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeScreen === 'GENERATOR' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Key size={20} /> Generator
             </button>
             <button onClick={() => { setActiveScreen('SECURITY'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeScreen === 'SECURITY' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Shield size={20} /> Security
             </button>
             <button onClick={() => { setActiveScreen('ACTIVITY'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeScreen === 'ACTIVITY' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <History size={20} /> Activity Log
             </button>
             <button onClick={() => { setActiveScreen('EMERGENCY'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeScreen === 'EMERGENCY' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Users size={20} /> Emergency
             </button>
             <button onClick={() => { setActiveScreen('SETTINGS'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeScreen === 'SETTINGS' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Settings size={20} /> Settings
             </button>
           </nav>
           
           {/* Sidebar Folders */}
           {isAuthenticated && (
               <div className="mt-8">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-4">Folders</h4>
                   <div className="space-y-1">
                       {getFolders().map(folder => (
                           <button 
                                key={folder} 
                                onClick={() => { setActiveScreen('VAULT'); setSelectedFolder(folder); setMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${selectedFolder === folder && activeScreen === 'VAULT' ? 'text-emerald-400 bg-emerald-900/10' : 'text-slate-400 hover:text-white'}`}
                            >
                               <Folder size={16} /> {folder}
                           </button>
                       ))}
                       {getFolders().length === 0 && <p className="px-4 text-xs text-slate-600 italic">No folders created yet</p>}
                   </div>
               </div>
           )}

        </div>
        <div className="mt-auto p-6 border-t border-slate-800">
           <button onClick={() => handleLogout()} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors w-full">
              <LogOut size={18} /> Lock Vault
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="md:ml-64 min-h-screen">
        {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>}
        
        {activeScreen === 'VAULT' && renderVaultList()}
        {activeScreen === 'ITEM_DETAIL' && renderItemDetail()}
        {(activeScreen === 'EDIT_ITEM') && renderItemForm()}
        {activeScreen === 'GENERATOR' && <div className="p-4"><PasswordGenerator /></div>}
        {activeScreen === 'SECURITY' && <SecurityDashboard />}
        {activeScreen === 'ACTIVITY' && <ActivityLog logs={activityLogs} onClear={() => { setActivityLogs([]); localStorage.setItem('securevault_logs', '[]'); }} />}
        {activeScreen === 'EMERGENCY' && <EmergencyAccess />}
        {activeScreen === 'TWO_FACTOR' && <TwoFactorSetup onComplete={enable2FA} />}
        {activeScreen === 'SETTINGS' && renderSettings()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-6 py-3 flex justify-between items-center z-50 safe-area-bottom">
        <button onClick={() => setActiveScreen('VAULT')} className={`flex flex-col items-center gap-1 ${activeScreen === 'VAULT' || activeScreen === 'ITEM_DETAIL' ? 'text-emerald-500' : 'text-slate-500'}`}>
          <Home size={22} />
          <span className="text-[10px]">Vault</span>
        </button>
        <button onClick={() => setActiveScreen('GENERATOR')} className={`flex flex-col items-center gap-1 ${activeScreen === 'GENERATOR' ? 'text-emerald-500' : 'text-slate-500'}`}>
          <Key size={22} />
          <span className="text-[10px]">Gen</span>
        </button>
        <div className="w-px h-8 bg-slate-800"></div>
        <button onClick={() => setActiveScreen('SECURITY')} className={`flex flex-col items-center gap-1 ${activeScreen === 'SECURITY' || activeScreen === 'ACTIVITY' ? 'text-emerald-500' : 'text-slate-500'}`}>
          <Shield size={22} />
          <span className="text-[10px]">Safety</span>
        </button>
        <button onClick={() => setActiveScreen('EMERGENCY')} className={`flex flex-col items-center gap-1 ${activeScreen === 'EMERGENCY' ? 'text-emerald-500' : 'text-slate-500'}`}>
          <Users size={22} />
          <span className="text-[10px]">Contact</span>
        </button>
        <button onClick={() => setActiveScreen('SETTINGS')} className={`flex flex-col items-center gap-1 ${activeScreen === 'SETTINGS' ? 'text-emerald-500' : 'text-slate-500'}`}>
          <Settings size={22} />
          <span className="text-[10px]">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default App;