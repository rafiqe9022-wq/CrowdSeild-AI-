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
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-slate-800 border-r border-slate-700 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <Shield className="w-8 h-8 text-cyan-400 flex-shrink-0" />
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-sm text-cyan-400">CrowdShield AI</h1>
              <p className="text-[10px] text-slate-400">Crowd Safety Platform</p>
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        {sidebarOpen && store.currentUser && (
          <div className="p-3 border-t border-slate-700">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                {store.currentUser.displayName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{store.currentUser.displayName}</p>
                <p className="text-slate-400 capitalize">{store.currentUser.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded hover:bg-slate-700">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-slate-400">
                {store.event.name} • {store.event.status.toUpperCase()}
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
              SIMULATION DATA
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Simulation controls */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Speed:</span>
              <button 
                onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, speed: Math.max(0.5, prev.simulation.speed - 0.5) } }))}
                className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600"
              >-</button>
              <span className="w-8 text-center">{store.simulation.speed}x</span>
              <button 
                onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, speed: Math.min(5, prev.simulation.speed + 0.5) } }))}
                className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600"
              >+</button>
              <button
                onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, running: !prev.simulation.running } }))}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  store.simulation.running 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {store.simulation.running ? '⏸ Pause' : '▶ Start'}
              </button>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotif(!showNotif)}
                className="relative p-2 rounded hover:bg-slate-700"
              >
                <Bell className="w-5 h-5 text-slate-300" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                    {unreadAlerts}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-slate-700 font-medium text-sm">Active Alerts</div>
                  {store.alerts.filter(a => a.status === 'active').slice(0, 5).map(alert => (
                    <div key={alert.id} className="p-3 border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer" onClick={() => { onNavigate('alerts'); setShowNotif(false); }}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                        <span className="text-xs font-medium truncate">{alert.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">{alert.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleLogout} className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
