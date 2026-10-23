import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ROLE_PERMISSIONS } from '../types';
import { Shield, LayoutDashboard, Map, Users, AlertTriangle, Route, Siren, FlaskConical, Activity, ClipboardList, History, FileText, Settings, BookOpen, LogOut, Menu, X, Bell, Camera } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Centre', icon: LayoutDashboard },
  { id: 'ai-detection', label: 'AI Detection', icon: Camera },
  { id: 'map', label: 'Event Map', icon: Map },
  { id: 'crowd', label: 'Crowd Monitor', icon: Users },
  { id: 'traffic', label: 'Traffic Flow', icon: Activity },
  { id: 'risk', label: 'Risk Engine', icon: AlertTriangle },
  { id: 'routes', label: 'Route Planner', icon: Route },
  { id: 'emergency', label: 'Emergency Corridor', icon: Siren },
  { id: 'signals', label: 'Signal Advisory', icon: Settings },
  { id: 'scenario', label: 'Scenario Lab', icon: FlaskConical },
  { id: 'alerts', label: 'Alerts & Incidents', icon: ClipboardList },
  { id: 'gates', label: 'Gate Management', icon: Users },
  { id: 'audit', label: 'Audit Log', icon: History },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'help', label: 'Help & Docs', icon: BookOpen },
];

export default function Layout() {
  const { store, setStore } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  
  const currentPage = location.pathname.replace('/', '') || 'dashboard';
  const onNavigate = (page: string) => navigate(`/${page}`);

  // Filter navigation items based on user role permissions
  const userRole = store.currentUser?.role || 'auditor';
  const allowedPages = ROLE_PERMISSIONS[userRole];
  const filteredNavItems = NAV_ITEMS.filter(item => allowedPages.includes(item.id));

  const unreadAlerts = store.alerts.filter(a => a.status === 'active').length;

  const handleLogout = () => {
    setStore(prev => ({
      ...prev,
      currentUser: null,
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: prev.currentUser?.id || 'system',
        action: 'logout',
        entityType: 'user',
        entityId: prev.currentUser?.id || 'system',
        details: `User logged out`
      }]
    }));
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#070b1a] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-[#0d1429] border-r border-[#1c2a4f] flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-[#1c2a4f] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-sm text-amber-400 tracking-wide">CrowdShield AI</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Operations Center</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-400 border-r-2 border-amber-400' 
                    : 'text-slate-400 hover:bg-[#162042] hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        {sidebarOpen && store.currentUser && (
          <div className="p-3 border-t border-[#1c2a4f]">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20">
                {store.currentUser.displayName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-slate-200">{store.currentUser.displayName}</p>
                <p className="text-slate-500 capitalize text-[10px] uppercase tracking-wider">{store.currentUser.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-[#0d1429] border-b border-[#1c2a4f] flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded hover:bg-[#162042] text-slate-400 hover:text-slate-200 transition-colors">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></div>
              <span className="text-xs text-slate-400">
                {store.event.name} • <span className="text-emerald-400 font-medium">{store.event.status.toUpperCase()}</span>
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 font-medium">
              SIMULATION
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Simulation controls */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Speed:</span>
              <button 
                onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, speed: Math.max(0.5, prev.simulation.speed - 0.5) } }))}
                className="px-2 py-0.5 bg-[#162042] rounded hover:bg-[#1c2a4f] text-slate-300 transition-colors"
              >-</button>
              <span className="w-8 text-center text-amber-400 font-medium">{store.simulation.speed}x</span>
              <button 
                onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, speed: Math.min(5, prev.simulation.speed + 0.5) } }))}
                className="px-2 py-0.5 bg-[#162042] rounded hover:bg-[#1c2a4f] text-slate-300 transition-colors"
              >+</button>
              <button
                onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, running: !prev.simulation.running } }))}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  store.simulation.running 
                    ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30' 
                    : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                }`}
              >
                {store.simulation.running ? '⏸ Pause' : '▶ Start'}
              </button>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotif(!showNotif)}
                className="relative p-2 rounded hover:bg-[#162042] transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-400" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold shadow-lg shadow-rose-500/50">
                    {unreadAlerts}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#0d1429] border border-[#1c2a4f] rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-[#1c2a4f] font-medium text-sm text-amber-400">Active Alerts</div>
                  {store.alerts.filter(a => a.status === 'active').slice(0, 5).map(alert => (
                    <div key={alert.id} className="p-3 border-b border-[#1c2a4f]/50 hover:bg-[#162042] cursor-pointer transition-colors" onClick={() => { onNavigate('alerts'); setShowNotif(false); }}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                        <span className="text-xs font-medium truncate text-slate-200">{alert.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">{alert.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleLogout} className="p-2 rounded hover:bg-[#162042] text-slate-500 hover:text-rose-400 transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 bg-[#070b1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
