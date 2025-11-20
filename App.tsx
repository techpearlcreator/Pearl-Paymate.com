
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    PlusCircle,
    History,
    Building2,
    LogOut,
    Users,
    CheckCircle,
    XCircle,
    Banknote,
    Sparkles,
    Menu,
    Smartphone,
    ArrowRight,
    Settings,
    Search,
    ChevronRight,
    Receipt,
    Trash2,
    UploadCloud,
    QrCode,
    Image as ImageIcon,
    Download,
    ExternalLink,
    Clock,
    Shield,
    Eye,
    Bell,
    FileText,
    Zap,
    LifeBuoy,
    Mail,
    MessageCircle,
    Send,
    DownloadCloud
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { User, Team, Branch, Bill, UserRole, BillStatus, BillCategory, Notification } from './types';
import {
    apiLogin, apiRegister, apiCreateTeam, apiJoinTeam,
    apiGetBills, apiGetBranches, apiUploadBill, apiUpdateBillStatus, apiAddBranch, apiGetTeamMembers, apiGetNotifications, apiMarkAllRead
} from './services/dataService';
import { analyzeBills } from './services/geminiService';
import { Button, Input, Card, Badge, Modal, Select } from './components/Shared';

// --- CHART SETUP ---
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

// --- HELPER ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// --- APP CONFIGURATION ---
// CHANGE YOUR APP NAME HERE
const APP_NAME = "Pearl Paymate";
// REPLACE THIS WITH YOUR ACTUAL WHATSAPP SUPPORT NUMBER (International format without +)
const SUPPORT_PHONE_NUMBER = "916369510851";

// --- ASSETS CONFIGURATION ---
// UPDATE THESE LINES TO CHANGE LOGO AND BACKGROUND
const LOGO_URL = "p2.png";
const AUTH_BACKGROUND_URL = "background-office.jpg";

// --- MAIN APP COMPONENT ---

export default function App() {
    return (
        <HashRouter>
            <AuthProvider>
                <MainLayout />
            </AuthProvider>
        </HashRouter>
    );
}

// --- CONTEXT ---
const AuthContext = React.createContext<{
    user: User | null;
    team: Team | null;
    role: UserRole;
    login: (u: User) => void;
    logout: () => void;
    setTeam: (t: Team) => void;
}>({} as any);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [team, setTeam] = useState<Team | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('tf_user');
        const storedTeam = localStorage.getItem('tf_team');
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedTeam) setTeam(JSON.parse(storedTeam));
    }, []);

    const login = (u: User) => {
        setUser(u);
        localStorage.setItem('tf_user', JSON.stringify(u));
    };

    const logout = () => {
        setUser(null);
        setTeam(null);
        localStorage.removeItem('tf_user');
        localStorage.removeItem('tf_team');
    };

    const updateTeam = (t: Team) => {
        setTeam(t);
        localStorage.setItem('tf_team', JSON.stringify(t));
    };

    const role = user && team && team.adminId === user.id ? UserRole.ADMIN : UserRole.MEMBER;

    return (
        <AuthContext.Provider value={{ user, team, role, login, logout, setTeam: updateTeam }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- INSTALL PROMPT COMPONENT ---
const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstall, setShowInstall] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowInstall(false);
    };

    if (!showInstall) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 z-50 animate-in slide-in-from-bottom-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center gap-4 max-w-md border border-slate-700">
                <div className="p-3 bg-ocean/20 rounded-xl text-ocean shrink-0">
                    <DownloadCloud size={24} />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-lg">Install App</h4>
                    <p className="text-slate-300 text-sm mt-1">Install {APP_NAME} on your device for a faster experience and quick access.</p>
                </div>
                <div className="flex gap-2 mt-2 md:mt-0 w-full md:w-auto">
                    <button
                        onClick={() => setShowInstall(false)}
                        className="flex-1 md:flex-none px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Later
                    </button>
                    <button
                        onClick={handleInstall}
                        className="flex-1 md:flex-none bg-ocean hover:bg-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-cyan-900/20 transition-all"
                    >
                        Install Now
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- LAYOUT ---
const MainLayout = () => {
    const { user, team } = React.useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifs, setShowNotifs] = useState(false);

    // Poll for notifications
    useEffect(() => {
        if (!user) return;
        const fetchNotifs = () => {
            apiGetNotifications(user.id).then(setNotifications);
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [user]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkRead = () => {
        if (user) {
            apiMarkAllRead(user.id).then(() => {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            });
        }
    };

    if (!user) return <AuthScreen />;
    if (!team) return <TeamSelectScreen />;

    return (
        <div className="flex h-screen bg-gray-50 w-full font-sans selection:bg-cyan-100 selection:text-cyan-900">
            {/* Install PWA Prompt */}
            <InstallPrompt />

            {/* Sidebar for Desktop/Tablet */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-6 py-4 md:px-8 md:py-5 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="md:hidden w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                            {team.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight tracking-tight">{team.name}</h1>
                            <p className="text-sm text-slate-500 flex items-center gap-1 font-medium"><Users size={14} /> {user.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl border border-gray-200">
                            <Clock size={16} className="text-gray-500" />
                            <span className="text-sm text-gray-600 font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>

                        {/* Help Icon */}
                        <button
                            onClick={() => navigate('/support')}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                            title="Customer Support"
                        >
                            <LifeBuoy size={24} />
                        </button>

                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors relative"
                                onClick={() => { setShowNotifs(!showNotifs); if (unreadCount > 0) handleMarkRead(); }}
                            >
                                <Bell size={24} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-ocean text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifs && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-[400px] overflow-y-auto p-2">
                                        <div className="px-4 py-3 border-b border-gray-50">
                                            <h3 className="font-bold text-gray-800">Notifications</h3>
                                        </div>
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 text-sm">No new notifications</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.id} className={`p-3 rounded-xl mb-1 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-cyan-50/50' : ''}`}>
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'success' ? 'bg-green-500' : n.type === 'warning' ? 'bg-red-500' : 'bg-ocean'}`}></div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{n.title}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleTimeString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <ProfileMenu />
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-10 no-scrollbar bg-gray-50/50">
                    <div className="mx-auto w-full max-w-[1800px]">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/bills" element={<BillList />} />
                            <Route path="/upload" element={<UploadBill />} />
                            <Route path="/admin" element={<AdminPanel />} />
                            <Route path="/team" element={<TeamProfile />} />
                            <Route path="/support" element={<CustomerSupport />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </div>
                </main>

                {/* Bottom Navigation (Mobile Only) */}
                <BottomNav />
            </div>
        </div>
    );
};

const Sidebar = () => {
    const { role } = React.useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const navItemClass = (path: string) => `flex items-center gap-4 px-5 py-4 rounded-xl transition-all font-medium text-base mb-1.5 ${location.pathname === path
        ? 'bg-slate-800 text-white shadow-lg shadow-slate-200/50'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`;

    return (
        <div className="hidden md:flex flex-col w-72 lg:w-80 bg-white border-r border-gray-200 h-full p-6 transition-all duration-300 ease-in-out">
            <div className="mb-10 px-2 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-slate-200">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    {/* Fallback if image missing */}
                    <div className="w-full h-full bg-primary flex items-center justify-center absolute top-0 left-0 -z-10">
                        <LayoutDashboard className="text-white" size={24} />
                    </div>
                </div>
                <span className="font-bold text-2xl tracking-tight text-slate-900">{APP_NAME}</span>
            </div>

            <nav className="flex-1">
                <p className="px-5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Menu</p>
                <button onClick={() => navigate('/')} className={navItemClass('/')}>
                    <LayoutDashboard size={22} />
                    <span>Dashboard</span>
                </button>
                <button onClick={() => navigate('/upload')} className={navItemClass('/upload')}>
                    <PlusCircle size={22} />
                    <span>Upload Expense</span>
                </button>
                <button onClick={() => navigate('/bills')} className={navItemClass('/bills')}>
                    <History size={22} />
                    <span>Transactions</span>
                </button>
                <button onClick={() => navigate('/team')} className={navItemClass('/team')}>
                    <Users size={22} />
                    <span>Team Details</span>
                </button>

                {role === UserRole.ADMIN && (
                    <>
                        <p className="px-5 text-xs font-bold text-slate-400 uppercase tracking-wider mt-10 mb-4">Management</p>
                        <button onClick={() => navigate('/admin')} className={navItemClass('/admin')}>
                            <Building2 size={22} />
                            <span>Admin Panel</span>
                        </button>
                    </>
                )}

                <div className="mt-auto pt-10">
                    <button onClick={() => navigate('/support')} className={navItemClass('/support')}>
                        <LifeBuoy size={22} />
                        <span>Customer Service</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}

const BottomNav = () => {
    const { role } = React.useContext(AuthContext);
    const navClass = ({ isActive }: { isActive: boolean }) =>
        `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${isActive ? 'text-ocean' : 'text-gray-400 hover:text-gray-600'}`;
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-20 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-5 h-full max-w-md mx-auto px-2 pb-2">
                <button onClick={() => navigate('/')} className={navClass({ isActive: location.pathname === '/' })}>
                    <LayoutDashboard size={22} strokeWidth={2} className={location.pathname === '/' ? 'fill-cyan-50' : ''} />
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                <button onClick={() => navigate('/upload')} className={navClass({ isActive: location.pathname === '/upload' })}>
                    <PlusCircle size={22} strokeWidth={2} className={location.pathname === '/upload' ? 'fill-cyan-50' : ''} />
                    <span className="text-[10px] font-bold">Add</span>
                </button>
                <button onClick={() => navigate('/bills')} className={navClass({ isActive: location.pathname === '/bills' })}>
                    <History size={22} strokeWidth={2} className={location.pathname === '/bills' ? 'fill-cyan-50' : ''} />
                    <span className="text-[10px] font-bold">History</span>
                </button>
                <button onClick={() => navigate('/team')} className={navClass({ isActive: location.pathname === '/team' })}>
                    <Users size={22} strokeWidth={2} className={location.pathname === '/team' ? 'fill-cyan-50' : ''} />
                    <span className="text-[10px] font-bold">Team</span>
                </button>
                {role === UserRole.ADMIN ? (
                    <button onClick={() => navigate('/admin')} className={navClass({ isActive: location.pathname === '/admin' })}>
                        <Building2 size={22} strokeWidth={2} className={location.pathname === '/admin' ? 'fill-cyan-50' : ''} />
                        <span className="text-[10px] font-bold">Admin</span>
                    </button>
                ) : (
                    <div className="flex items-center justify-center opacity-0">.</div>
                )}
            </div>
        </nav>
    );
}

const ProfileMenu = () => {
    const { logout } = React.useContext(AuthContext);
    return (
        <button onClick={logout} className="flex items-center gap-2 text-slate-500 hover:text-ocean transition-colors pl-4 border-l border-gray-200" title="Logout">
            <span className="text-base font-medium hidden md:inline">Sign Out</span>
            <LogOut size={20} />
        </button>
    )
}

// --- SCREENS ---

// 1. Auth Screen
const AuthScreen = () => {
    const { login } = React.useContext(AuthContext);
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const u = isLogin
                ? await apiLogin(formData.email, formData.password)
                : await apiRegister({ id: crypto.randomUUID(), ...formData });
            login(u);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
            {/* UPDATED BACKGROUND IMAGE - Uses constant AUTH_BACKGROUND_URL */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{ backgroundImage: `url('${AUTH_BACKGROUND_URL}')` }}
            ></div>
            <Card className="w-full max-w-md p-8 md:p-10 shadow-2xl border-0 relative z-10">
                <div className="text-center mb-8">
                    {/* LOGO CHANGE - Uses constant LOGO_URL */}
                    <div className="w-24 h-24 mx-auto mb-6 relative">
                        <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        {/* Fallback icon if logo.png is missing */}
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-primary rounded-2xl -z-10">
                            <LayoutDashboard size={40} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{APP_NAME}</h1>
                    <p className="text-slate-500 text-base mt-2">Manage team expenses effortlessly</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && <Input placeholder="Full Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />}
                    <Input type="email" placeholder="Email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    <Input type="password" placeholder="Password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    <Button type="submit" className="w-full py-4 text-base shadow-lg shadow-slate-200" isLoading={loading}>{isLogin ? 'Sign In' : 'Create Account'}</Button>
                </form>
                <p className="text-center mt-8 text-base text-slate-600">
                    {isLogin ? "New here?" : "Already have an account?"}
                    <button onClick={() => setIsLogin(!isLogin)} className="text-ocean font-bold ml-1 hover:underline">
                        {isLogin ? "Sign Up" : "Login"}
                    </button>
                </p>
            </Card>
        </div>
    );
};

// 2. Team Select Screen
const TeamSelectScreen = () => {
    const { user, setTeam } = React.useContext(AuthContext);
    const [mode, setMode] = useState<'create' | 'join'>('join');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ name: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            if (mode === 'create') {
                const newTeam: Team = {
                    id: crypto.randomUUID(),
                    name: data.name,
                    joinPassword: data.password,
                    adminId: user.id,
                    memberIds: [user.id]
                };
                const t = await apiCreateTeam(newTeam);
                setTeam(t);
            } else {
                const t = await apiJoinTeam(user.id, data.name, data.password);
                setTeam(t);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-lg shadow-xl border border-gray-100 p-8 md:p-10">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900">{mode === 'create' ? 'Create a Team' : 'Join a Team'}</h2>
                    <p className="text-base text-gray-500 mt-2">Collaborate with your organization</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input placeholder="Team Name" required value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
                    <Input type="password" placeholder="Team Password" required value={data.password} onChange={e => setData({ ...data, password: e.target.value })} />
                    <Button className="w-full py-4" isLoading={loading}>{mode === 'create' ? 'Create Team' : 'Join Team'}</Button>
                </form>
                <div className="mt-8 flex gap-2 bg-gray-100 p-1.5 rounded-xl">
                    <button
                        className={`flex-1 py-3 text-base font-bold rounded-lg transition-all ${mode === 'join' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setMode('join')}
                    >
                        Join Existing
                    </button>
                    <button
                        className={`flex-1 py-3 text-base font-bold rounded-lg transition-all ${mode === 'create' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setMode('create')}
                    >
                        Create New
                    </button>
                </div>
            </Card>
        </div>
    );
};

// 3. Dashboard
const Dashboard = () => {
    const { team } = React.useContext(AuthContext);
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiInsight, setAiInsight] = useState<string>('');
    const [aiLoading, setAiLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (team) {
            apiGetBills(team.id).then(b => {
                setBills(b);
                setLoading(false);
            });
        }
    }, [team]);

    const stats = useMemo(() => {
        return {
            total: bills.reduce((sum, b) => sum + b.amount, 0),
            pending: bills.filter(b => b.status === BillStatus.PENDING).reduce((sum, b) => sum + b.amount, 0),
            paid: bills.filter(b => b.status === BillStatus.PAID).reduce((sum, b) => sum + b.amount, 0),
            rejected: bills.filter(b => b.status === BillStatus.REJECTED).length,
            pendingCount: bills.filter(b => b.status === BillStatus.PENDING).length
        };
    }, [bills]);

    const getAiInsights = async () => {
        setAiLoading(true);
        const insight = await analyzeBills(bills, "Provide a quick financial summary and point out any unusual spending patterns.");
        setAiInsight(insight);
        setAiLoading(false);
    };

    const chartData = {
        labels: ['Paid', 'Pending', 'Rejected'],
        datasets: [{
            data: [
                bills.filter(b => b.status === BillStatus.PAID).length,
                bills.filter(b => b.status === BillStatus.PENDING).length,
                bills.filter(b => b.status === BillStatus.REJECTED).length,
            ],
            backgroundColor: ['#0ea5e9', '#f59e0b', '#ef4444'], // Ocean, Amber, Red
            borderWidth: 0
        }]
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    font: {
                        size: 14
                    }
                }
            }
        }
    };

    return (
        <div className="space-y-8 md:space-y-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {/* PRIMARY DARK BLUE CARD */}
                <Card className="bg-primary text-white border-none relative overflow-hidden group hover:shadow-lg hover:shadow-slate-300 transition-all h-full min-h-[180px] flex flex-col justify-center">
                    <div className="absolute -right-6 -bottom-6 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110"><Banknote size={120} /></div>
                    <p className="text-slate-300 text-sm font-bold uppercase tracking-wider relative z-10">Total Requested</p>
                    <h3 className="text-3xl md:text-4xl font-bold mt-2 relative z-10">${stats.total.toFixed(0)}</h3>
                </Card>

                {/* SECONDARY OCEAN BLUE CARD */}
                <Card className="bg-ocean text-white border-none relative overflow-hidden group hover:shadow-lg hover:shadow-cyan-200 transition-all h-full min-h-[180px] flex flex-col justify-center">
                    <div className="absolute -right-6 -bottom-6 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110"><CheckCircle size={120} /></div>
                    <p className="text-cyan-50 text-sm font-bold uppercase tracking-wider relative z-10">Total Paid</p>
                    <h3 className="text-3xl md:text-4xl font-bold mt-2 relative z-10">${stats.paid.toFixed(0)}</h3>
                </Card>

                <Card className="hover:shadow-md transition-all border-l-8 border-l-amber-400 h-full min-h-[180px] flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Pending Review</p>
                            <h3 className="text-3xl md:text-4xl font-bold text-slate-800 mt-2">{stats.pendingCount} <span className="text-base text-slate-400 font-normal">Bills</span></h3>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><History size={32} /></div>
                    </div>
                </Card>

                <Card className="hover:shadow-md transition-all border-l-8 border-l-slate-300 h-full min-h-[180px] flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Pending Amount</p>
                            <h3 className="text-3xl md:text-4xl font-bold text-slate-800 mt-2">${stats.pending.toFixed(0)}</h3>
                        </div>
                        <div className="bg-slate-100 p-3 rounded-xl text-slate-600"><Banknote size={32} /></div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
                <div className="lg:col-span-1">
                    <Card title="Status Overview" className="h-full min-h-[400px]">
                        <div className="h-64 md:h-80 flex items-center justify-center">
                            {bills.length > 0 ? <Doughnut data={chartData} options={chartOptions} /> : <p className="text-gray-400 text-base">No data available</p>}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-blue-100 h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-white blur-3xl opacity-50 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                        <div className="flex items-start gap-6 relative z-10">
                            <div className="bg-white p-4 rounded-2xl text-ocean shrink-0 shadow-sm mt-1">
                                <Sparkles size={32} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 text-xl md:text-2xl">AI Financial Insight</h3>
                                {aiInsight ? (
                                    <div className="mt-6 text-base md:text-lg text-slate-800 bg-white/80 p-8 rounded-2xl animate-in fade-in border border-slate-100 shadow-sm leading-relaxed">
                                        <p className="whitespace-pre-line">{aiInsight}</p>
                                    </div>
                                ) : (
                                    <p className="text-slate-600 mt-3 text-base md:text-lg leading-relaxed max-w-2xl">Get a smart summary of your team's spending habits. The AI analyzes categories, trends, and highlights potential anomalies in your billing history.</p>
                                )}
                                {!aiInsight && (
                                    <Button onClick={getAiInsights} isLoading={aiLoading} variant="primary" className="mt-8 px-8 text-base">
                                        Generate Smart Report
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 text-xl md:text-2xl">Recent Activity</h3>
                    <button onClick={() => navigate('/bills')} className="text-base text-ocean font-medium hover:underline flex items-center gap-1">View All <ChevronRight size={20} /></button>
                </div>
                <div className="grid gap-4">
                    {bills.slice(0, 3).map(bill => (
                        <Card key={bill.id} className="flex flex-row items-center justify-between p-6 hover:shadow-md transition-all cursor-pointer">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl ${bill.category === BillCategory.PETROL ? 'bg-amber-500' :
                                    bill.category === BillCategory.FOOD ? 'bg-ocean' :
                                        bill.category === BillCategory.TRAVEL ? 'bg-primary' : 'bg-slate-500'
                                    }`}>
                                    {bill.category[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-900">{bill.title}</h4>
                                    <p className="text-sm text-slate-500">{new Date(bill.createdAt).toLocaleDateString()} • {bill.userName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-xl text-slate-900">${bill.amount}</p>
                                <Badge color={bill.status === 'APPROVED' || bill.status === 'PAID' ? 'green' : bill.status === 'REJECTED' ? 'red' : 'yellow'}>{bill.status}</Badge>
                            </div>
                        </Card>
                    ))}
                    {bills.length === 0 && <p className="text-center text-slate-500 py-10">No recent activity.</p>}
                </div>
            </div>
        </div>
    );
};

// 4. Bill List Screen (Enhanced with Details View)
const BillList = () => {
    const { team } = React.useContext(AuthContext);
    const [bills, setBills] = useState<Bill[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const [viewBill, setViewBill] = useState<Bill | null>(null);
    const [tab, setTab] = useState<'details' | 'proof'>('details');

    useEffect(() => {
        if (team) apiGetBills(team.id).then(setBills);
    }, [team]);

    const filteredBills = bills.filter(b => filter === 'ALL' ? true : b.status === filter);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-slate-900">Transactions</h2>
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                    {['ALL', 'PENDING', 'PAID', 'REJECTED'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === f ? 'bg-slate-900 text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4">
                {filteredBills.map(bill => (
                    <Card key={bill.id} className="group hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-slate-500">
                                    {bill.category === 'Petrol' ? <Banknote size={20} /> : <Receipt size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">{bill.title}</h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">{bill.category}</span>
                                        <span>{new Date(bill.createdAt).toLocaleDateString()}</span>
                                        <span>by {bill.userName}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 border-gray-100 pt-4 md:pt-0">
                                <div className="text-right">
                                    <p className="text-xl font-bold text-slate-900">${bill.amount}</p>
                                    {bill.status === BillStatus.PAID && bill.paymentMethod && (
                                        <p className="text-xs font-bold text-ocean mt-0.5 flex items-center justify-end gap-1">
                                            {bill.paymentMethod === 'UPI' ? <QrCode size={12} /> : <Building2 size={12} />}
                                            {bill.paymentMethod === 'UPI' ? 'UPI' : 'Bank Transfer'}
                                        </p>
                                    )}
                                    {!bill.paymentMethod && bill.branchId && <p className="text-xs text-gray-400">Branch ID: {bill.branchId.substring(0, 4)}...</p>}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge color={
                                        bill.status === BillStatus.PAID ? 'green' :
                                            bill.status === BillStatus.APPROVED ? 'blue' :
                                                bill.status === BillStatus.REJECTED ? 'red' : 'yellow'
                                    }>{bill.status}</Badge>

                                    <button
                                        onClick={() => { setViewBill(bill); setTab('details'); }}
                                        className="text-xs flex items-center gap-1 text-ocean hover:underline font-medium"
                                    >
                                        <Eye size={12} /> View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
                {filteredBills.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <History size={32} />
                        </div>
                        <p className="text-slate-500 font-medium">No transactions found for this filter.</p>
                    </div>
                )}
            </div>

            {/* View Details Modal */}
            <Modal isOpen={!!viewBill} onClose={() => setViewBill(null)} title="Transaction Details">
                {viewBill && (
                    <div className="space-y-4">
                        <div className="flex gap-2 mb-4 border-b border-gray-100 pb-1">
                            <button
                                onClick={() => setTab('details')}
                                className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors ${tab === 'details' ? 'text-ocean border-b-2 border-ocean' : 'text-gray-500'}`}
                            >
                                Bill Details
                            </button>
                            {viewBill.status === BillStatus.PAID && (
                                <button
                                    onClick={() => setTab('proof')}
                                    className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors ${tab === 'proof' ? 'text-ocean border-b-2 border-ocean' : 'text-gray-500'}`}
                                >
                                    Payment Proof
                                </button>
                            )}
                        </div>

                        {tab === 'details' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                                    <div>
                                        <p className="text-sm text-slate-500">Status</p>
                                        <Badge color={viewBill.status === 'PAID' ? 'green' : viewBill.status === 'REJECTED' ? 'red' : 'yellow'}>{viewBill.status}</Badge>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500">Total Amount</p>
                                        <p className="text-2xl font-bold text-slate-900">${viewBill.amount}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500">Category:</span> <span className="font-medium">{viewBill.category}</span></div>
                                    <div><span className="text-slate-500">Date:</span> <span className="font-medium">{new Date(viewBill.createdAt).toLocaleDateString()}</span></div>
                                    <div className="col-span-2"><span className="text-slate-500">Description:</span> <p className="font-medium mt-1 p-2 bg-gray-50 rounded-lg">{viewBill.description || 'No description provided.'}</p></div>
                                    {viewBill.rejectionReason && <div className="col-span-2 text-red-600"><span className="font-bold">Rejection Reason:</span> {viewBill.rejectionReason}</div>}
                                </div>

                                <div>
                                    <p className="text-sm text-slate-500 mb-2">Attached Bill Image</p>
                                    {viewBill.imageUrl ? (
                                        <img src={viewBill.imageUrl} alt="Bill" className="w-full rounded-xl border border-gray-200" />
                                    ) : (
                                        <div className="h-32 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">No Image Attached</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {tab === 'proof' && viewBill.status === BillStatus.PAID && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3 text-green-800">
                                    <CheckCircle className="shrink-0" />
                                    <div>
                                        <p className="font-bold">Payment Completed</p>
                                        <p className="text-sm">Paid on {viewBill.paidAt ? new Date(viewBill.paidAt).toLocaleString() : 'Unknown Date'}</p>
                                    </div>
                                </div>

                                {viewBill.paymentMethod && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Payment Method</p>
                                        <div className="flex items-center gap-2 font-bold text-slate-800">
                                            {viewBill.paymentMethod === 'UPI' ? <QrCode size={18} className="text-ocean" /> : <Building2 size={18} className="text-ocean" />}
                                            {viewBill.paymentMethod === 'UPI' ? 'UPI Transfer' : 'Bank Account Transfer'}
                                        </div>
                                    </div>
                                )}

                                {viewBill.transactionId && (
                                    <div>
                                        <p className="text-sm text-slate-500">Transaction ID</p>
                                        <p className="font-mono font-medium bg-gray-100 p-2 rounded">{viewBill.transactionId}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm text-slate-500 mb-2">Payment Screenshot</p>
                                    {viewBill.paymentScreenshotUrl ? (
                                        <img src={viewBill.paymentScreenshotUrl} alt="Proof" className="w-full rounded-xl border border-gray-200" />
                                    ) : (
                                        <div className="h-32 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">No Screenshot Available</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

// 5. Upload Bill Screen (Enhanced AI Visuals)
const UploadBill = () => {
    const { user, team } = React.useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [data, setData] = useState<Partial<Bill>>({
        amount: 0,
        description: '',
        title: '',
        category: BillCategory.OTHER,
        branchId: ''
    });
    const [preview, setPreview] = useState<string | null>(null);
    // Removed AI processing state
    const navigate = useNavigate();

    useEffect(() => {
        if (team) apiGetBranches(team.id).then(setBranches);
    }, [team]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setData({ ...data, imageUrl: base64 });
            setPreview(base64);
        }
    };

    // Removed handleDescriptionBlur function (AI Suggestion)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !team || !data.amount || !data.branchId) {
            alert("Please fill all required fields");
            return;
        }
        setLoading(true);
        try {
            const bill: Bill = {
                id: crypto.randomUUID(),
                teamId: team.id,
                userId: user.id,
                userName: user.name,
                status: BillStatus.PENDING,
                createdAt: Date.now(),
                title: data.title || 'Expense',
                amount: Number(data.amount),
                category: data.category as BillCategory,
                description: data.description || '',
                imageUrl: data.imageUrl,
                branchId: data.branchId
            };
            await apiUploadBill(bill);
            navigate('/bills');
        } catch (err) {
            alert("Error uploading bill");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card title="New Expense Request">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-ocean hover:bg-cyan-50 transition-all cursor-pointer relative group">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        {preview ? (
                            <div className="relative">
                                <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-sm" />
                                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white font-bold flex items-center gap-2"><UploadCloud /> Change Image</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400">
                                <div className="bg-gray-100 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                    <UploadCloud size={32} className="text-gray-400" />
                                </div>
                                <p className="font-bold text-slate-600">Click to Upload Bill Image</p>
                                <p className="text-xs mt-1">JPG, PNG supported</p>
                            </div>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Input label="Expense Title" placeholder="e.g. Client Lunch" value={data.title} onChange={e => setData({ ...data, title: e.target.value })} required />
                        <Input label="Amount ($)" type="number" placeholder="0.00" value={data.amount || ''} onChange={e => setData({ ...data, amount: Number(e.target.value) })} required />
                    </div>

                    <div className="relative">
                        <div className="flex justify-between mb-2">
                            <label className="block text-sm md:text-base font-medium text-slate-700">Description</label>
                            {/* Removed AI analyzing indicators */}
                        </div>
                        <textarea
                            className="w-full px-4 py-3 md:py-4 rounded-xl border border-gray-300 bg-white text-gray-900 text-base placeholder:text-gray-400 focus:border-ocean focus:ring-2 focus:ring-cyan-100 outline-none transition-all h-28 resize-none"
                            placeholder="Describe the expense (e.g. 'Filled gas for company van')."
                            value={data.description}
                            onChange={e => setData({ ...data, description: e.target.value })}
                        // Removed onBlur handler
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Select label="Category" value={data.category} onChange={e => setData({ ...data, category: e.target.value as BillCategory })}>
                            {Object.values(BillCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>

                        <Select label="Branch" value={data.branchId} onChange={e => setData({ ...data, branchId: e.target.value })} required>
                            <option value="">Select Branch</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </Select>
                    </div>

                    <Button className="w-full mt-4" isLoading={loading}>Submit Request</Button>
                </form>
            </Card>
        </div>
    );
};

// 6. Admin Panel (Correct Button Order: Pay -> Reject)
const AdminPanel = () => {
    const { team } = React.useContext(AuthContext);
    const [bills, setBills] = useState<Bill[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionType, setActionType] = useState<'reject' | 'view'>('view');

    // Payment States
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [payBill, setPayBill] = useState<Bill | null>(null);
    const [payBranch, setPayBranch] = useState<Branch | null>(null);
    const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
    const [txnId, setTxnId] = useState('');
    const [paying, setPaying] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'BANK'>('UPI');

    const refresh = () => {
        if (team) {
            apiGetBills(team.id).then(setBills);
            apiGetBranches(team.id).then(setBranches);
        }
    };

    useEffect(() => {
        refresh();
    }, [team]);

    const handleStatus = async (id: string, status: BillStatus, reason?: string) => {
        await apiUpdateBillStatus(id, status, reason);
        setSelectedBill(null);
        refresh();
    };

    const openPayModal = (bill: Bill) => {
        const branch = branches.find(b => b.id === bill.branchId);
        if (branch) {
            setPayBill(bill);
            setPayBranch(branch);
            setPaymentScreenshot('');
            setTxnId('');
            setPaymentMethod('UPI');
            setPayModalOpen(true);
        } else {
            alert("Branch information missing for this bill.");
        }
    };

    const handleMarkAsPaid = async () => {
        if (!payBill || !paymentScreenshot) {
            alert("Please upload a payment screenshot before marking as paid.");
            return;
        }
        setPaying(true);
        try {
            await apiUpdateBillStatus(payBill.id, BillStatus.PAID, undefined, {
                screenshotUrl: paymentScreenshot,
                txnId: txnId,
                paymentMethod: paymentMethod // Passing payment method to API
            });
            setPayModalOpen(false);
            refresh();
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        } finally {
            setPaying(false);
        }
    };

    const handlePaymentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setPaymentScreenshot(base64);
        }
    };

    const pendingBills = bills.filter(b => b.status === BillStatus.PENDING);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-slate-900">Admin Dashboard</h2>
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full font-bold">{pendingBills.length} Pending Requests</div>
            </div>

            <div className="grid gap-4">
                {pendingBills.map(bill => (
                    <Card key={bill.id} className="border-l-4 border-l-amber-400">
                        <div className="flex flex-col lg:flex-row justify-between gap-6">
                            <div className="flex gap-4">
                                {bill.imageUrl ? (
                                    <img src={bill.imageUrl} alt="Bill" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                                ) : (
                                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                        <ImageIcon size={32} />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900">{bill.title}</h3>
                                    <p className="text-slate-600 font-medium">${bill.amount} • {bill.category}</p>
                                    <p className="text-sm text-slate-500 mt-1">By {bill.userName} on {new Date(bill.createdAt).toLocaleDateString()}</p>
                                    <p className="text-sm text-slate-500 mt-1 italic">"{bill.description}"</p>
                                    <div className="mt-2 text-xs font-bold text-gray-400 bg-gray-100 inline-block px-2 py-1 rounded">
                                        Branch: {branches.find(b => b.id === bill.branchId)?.name || 'Unknown'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 h-fit self-end lg:self-center">
                                {/* Button Order: Pay First, Then Reject */}
                                <Button onClick={() => openPayModal(bill)} className="bg-ocean hover:bg-cyan-600 py-2 px-4 text-sm shadow-none">
                                    <QrCode size={16} className="mr-2" /> Pay Bill
                                </Button>
                                <Button onClick={() => { setSelectedBill(bill); setActionType('reject'); }} className="bg-red-600 hover:bg-red-700 py-2 px-4 text-sm shadow-none">
                                    <XCircle size={16} className="mr-2" /> Reject
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
                {pendingBills.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                        <p className="text-xl font-bold text-slate-900">All caught up!</p>
                        <p className="text-slate-500">No pending bills to review.</p>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            <Modal isOpen={!!selectedBill && actionType === 'reject'} onClose={() => setSelectedBill(null)} title="Reject Bill">
                <p className="mb-4 text-slate-600">Please provide a reason for rejecting this expense.</p>
                <Input placeholder="Reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setSelectedBill(null)}>Cancel</Button>
                    <Button variant="danger" onClick={() => selectedBill && handleStatus(selectedBill.id, BillStatus.REJECTED, rejectReason)}>Confirm Reject</Button>
                </div>
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Process Payment">
                {payBill && payBranch && (
                    <div className="space-y-6">
                        {/* Toggle Switch */}
                        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-xl">
                            <button
                                onClick={() => setPaymentMethod('UPI')}
                                className={`py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${paymentMethod === 'UPI' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <QrCode size={16} /> UPI Transfer
                            </button>
                            <button
                                onClick={() => setPaymentMethod('BANK')}
                                className={`py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${paymentMethod === 'BANK' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Building2 size={16} /> Bank Transfer
                            </button>
                        </div>

                        {/* Content Container */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-center">

                            {paymentMethod === 'UPI' ? (
                                // UPI VIEW
                                <div className="text-center animate-in fade-in">
                                    {payBranch.upiId ? (
                                        <>
                                            <div className="bg-white p-3 inline-block rounded-2xl border border-gray-100 shadow-inner mb-4">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${payBranch.upiId}&pn=${payBranch.holderName}&am=${payBill.amount}&cu=INR`)}`}
                                                    alt="UPI QR"
                                                    className="w-48 h-48 mx-auto rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-xl text-slate-900">Scan to pay <span className="text-ocean">${payBill.amount}</span></p>
                                                <p className="text-sm text-slate-500">to <span className="font-medium text-slate-800">{payBranch.holderName}</span></p>
                                                <div className="flex items-center justify-center gap-2 mt-2 bg-gray-50 py-1.5 px-3 rounded-lg mx-auto w-fit">
                                                    <p className="text-xs font-mono text-slate-600">{payBranch.upiId}</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-8">
                                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <QrCode size={32} />
                                            </div>
                                            <p className="text-red-500 font-bold mb-2">No UPI ID Found</p>
                                            <p className="text-sm text-gray-500">Switch to 'Bank Transfer' or add a UPI ID in Team Settings.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // BANK TRANSFER VIEW
                                <div className="text-left space-y-5 animate-in fade-in">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-blue-50 text-ocean rounded-full flex items-center justify-center">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Transfer Amount</p>
                                            <p className="text-2xl font-bold text-slate-900">${payBill.amount}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Beneficiary Name</p>
                                            <p className="text-base font-bold text-slate-800">{payBranch.holderName || 'Not Set'}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Account Number</p>
                                                <p className="text-base font-mono font-bold text-slate-800">{payBranch.accountNumber || 'Not Set'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">IFSC Code</p>
                                                <p className="text-base font-mono font-bold text-slate-800">{payBranch.ifsc || 'Not Set'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-center text-gray-400 mt-2">Use these details to initiate a standard bank transfer (NEFT/IMPS/RTGS).</p>
                                </div>
                            )}
                        </div>

                        {/* Upload Proof Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h4 className="font-bold text-slate-800">Payment Confirmation</h4>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Payment Screenshot (Required)</label>
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-300 text-slate-700 px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-2">
                                        <UploadCloud size={18} />
                                        <span>{paymentScreenshot ? 'Change Image' : 'Choose Image'}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePaymentFile} />
                                    </label>
                                    {paymentScreenshot && <span className="text-sm text-green-600 font-bold flex items-center gap-1"><CheckCircle size={14} /> Uploaded</span>}
                                </div>
                                {paymentScreenshot && (
                                    <div className="mt-2 h-20 w-20 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={paymentScreenshot} className="w-full h-full object-cover" alt="preview" />
                                    </div>
                                )}
                            </div>

                            <Input
                                label="Transaction ID (Optional)"
                                placeholder="e.g. UPI Ref No."
                                value={txnId}
                                onChange={e => setTxnId(e.target.value)}
                            />

                            <Button
                                className="w-full mt-2"
                                onClick={handleMarkAsPaid}
                                isLoading={paying}
                                disabled={!paymentScreenshot}
                            >
                                Mark as Paid
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// 7. Team Profile Screen
const TeamProfile = () => {
    const { team, role } = React.useContext(AuthContext);
    const [members, setMembers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [showAddBranch, setShowAddBranch] = useState(false);
    const [newBranch, setNewBranch] = useState<Partial<Branch>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (team) {
            apiGetTeamMembers(team.memberIds).then(setMembers);
            apiGetBranches(team.id).then(setBranches);
        }
    }, [team]);

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!team || !newBranch.name) return;
        setLoading(true);
        try {
            const b: Branch = {
                id: crypto.randomUUID(),
                teamId: team.id,
                name: newBranch.name!,
                holderName: newBranch.holderName || '',
                accountNumber: newBranch.accountNumber || '',
                ifsc: newBranch.ifsc || '',
                upiId: newBranch.upiId || '', // Added UPI ID handling
                managerName: newBranch.managerName || ''
            };
            await apiAddBranch(b);
            setBranches([...branches, b]);
            setShowAddBranch(false);
            setNewBranch({});
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Team Header */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">{team?.name}</h2>
                    <p className="text-slate-500 mt-1 flex items-center gap-2"><Shield size={16} className="text-ocean" /> Team Code: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-slate-800 font-bold">{team?.joinPassword}</span></p>
                </div>
                <div className="flex -space-x-4">
                    {members.map((m, i) => (
                        <div key={m.id} className="w-12 h-12 rounded-full border-4 border-white bg-gradient-to-br from-primary to-ocean flex items-center justify-center text-white font-bold text-lg shadow-sm" title={m.name}>
                            {m.name[0]}
                        </div>
                    ))}
                    <div className="w-12 h-12 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-slate-500 font-bold text-xs shadow-sm">
                        +{members.length}
                    </div>
                </div>
            </div>

            {/* Branches Section */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Branch Accounts</h3>
                    {role === UserRole.ADMIN && (
                        <Button onClick={() => setShowAddBranch(true)} className="py-2 px-4 text-sm">
                            <PlusCircle size={18} className="mr-2" /> Add Branch
                        </Button>
                    )}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map(branch => (
                        <Card key={branch.id} className="hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <button className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
                            </div>
                            <h4 className="font-bold text-lg text-slate-900 mb-1">{branch.name}</h4>
                            <p className="text-sm text-slate-500 mb-4">{branch.managerName || 'No Manager Assigned'}</p>

                            <div className="space-y-2 bg-gray-50 p-3 rounded-xl text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Account:</span>
                                    <span className="font-mono font-medium">{branch.accountNumber || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">IFSC:</span>
                                    <span className="font-mono font-medium">{branch.ifsc || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">UPI ID:</span>
                                    <span className="font-mono font-medium text-ocean">{branch.upiId || 'Not Set'}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {branches.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-slate-500">No branches configured yet.</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={showAddBranch} onClose={() => setShowAddBranch(false)} title="Add New Branch">
                <form onSubmit={handleAddBranch} className="space-y-4">
                    <Input placeholder="Branch Name (e.g. Downtown Office)" value={newBranch.name || ''} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} required />
                    <Input placeholder="Manager Name" value={newBranch.managerName || ''} onChange={e => setNewBranch({ ...newBranch, managerName: e.target.value })} />

                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Banking Details</p>
                        <Input placeholder="Account Holder Name" className="mb-4" value={newBranch.holderName || ''} onChange={e => setNewBranch({ ...newBranch, holderName: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <Input placeholder="Account Number" value={newBranch.accountNumber || ''} onChange={e => setNewBranch({ ...newBranch, accountNumber: e.target.value })} />
                            <Input placeholder="IFSC Code" value={newBranch.ifsc || ''} onChange={e => setNewBranch({ ...newBranch, ifsc: e.target.value })} />
                        </div>
                        <Input placeholder="UPI ID (e.g. name@upi)" value={newBranch.upiId || ''} onChange={e => setNewBranch({ ...newBranch, upiId: e.target.value })} />
                        <p className="text-xs text-gray-500 mt-1 ml-1">Required for QR Code payments</p>
                    </div>

                    <Button className="w-full mt-4" isLoading={loading}>Save Branch</Button>
                </form>
            </Modal>
        </div>
    );
};

// 8. Customer Support Screen
const CustomerSupport = () => {
    const { user } = React.useContext(AuthContext);
    const [report, setReport] = useState({
        name: user?.name || '',
        type: 'Technical Issue',
        message: ''
    });

    const handleWhatsAppReport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!report.message) return;

        const text = `*Customer Support Report*\n\n*Name:* ${report.name}\n*Type:* ${report.type}\n*Message:* ${report.message}`;
        const encodedText = encodeURIComponent(text);
        // Using the placeholder support number defined at the top of App.tsx
        const url = `https://wa.me/${SUPPORT_PHONE_NUMBER}?text=${encodedText}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-cyan-50 text-ocean rounded-full flex items-center justify-center mx-auto mb-4">
                    <LifeBuoy size={32} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Customer Service</h2>
                <p className="text-slate-500 mt-2 text-lg">We are here to help you with any issues or questions.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Contact Info */}
                <Card className="h-full">
                    <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2">
                        <Mail className="text-ocean" /> Email Support
                    </h3>
                    <div className="space-y-4">
                        <p className="text-slate-600">For general inquiries, partnership proposals, or detailed technical support, please drop us an email.</p>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-sm text-gray-400 mb-1 font-bold uppercase tracking-wider">Email Address</p>
                            <p className="text-lg font-bold text-slate-800">techpearlcreator@gmail.com</p>
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => window.location.href = "mailto:techpearlcreator@gmail.com"}
                        >
                            Send Email
                        </Button>
                    </div>
                </Card>

                {/* Report Form */}
                <Card className="h-full border-t-4 border-t-green-500">
                    <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2">
                        <MessageCircle className="text-green-500" /> Instant WhatsApp Support
                    </h3>
                    <form onSubmit={handleWhatsAppReport} className="space-y-4">
                        <Input
                            label="Your Name"
                            value={report.name}
                            onChange={e => setReport({ ...report, name: e.target.value })}
                            required
                        />
                        <Select
                            label="Issue Type"
                            value={report.type}
                            onChange={e => setReport({ ...report, type: e.target.value })}
                        >
                            <option>Technical Issue</option>
                            <option>Billing / Payment</option>
                            <option>Account Access</option>
                            <option>Feature Request</option>
                            <option>Other</option>
                        </Select>
                        <div className="w-full">
                            <label className="block text-sm md:text-base font-medium text-slate-700 mb-2">Message</label>
                            <textarea
                                className="w-full px-4 py-3 md:py-4 rounded-xl border border-gray-300 bg-white text-gray-900 text-base placeholder:text-gray-400 focus:border-ocean focus:ring-2 focus:ring-cyan-100 outline-none transition-all h-32 resize-none"
                                placeholder="Describe your issue in detail..."
                                value={report.message}
                                onChange={e => setReport({ ...report, message: e.target.value })}
                                required
                            />
                        </div>
                        <Button className="w-full bg-[#25D366] hover:bg-[#1ebc57] border-none text-white shadow-md shadow-green-100">
                            <Send size={18} className="mr-2" /> Send via WhatsApp
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};
