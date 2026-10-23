import React, { useState } from 'react';
import { Shield, Users, Eye, EyeOff } from 'lucide-react';
import { useStore, DEMO_USERS } from '../store';
import { User } from '../types';

export default function Login() {
  const { store, setStore } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleLogin = () => {
    const user = DEMO_USERS.find(u => u.username === username && u.demoPassword === password);
    if (user) {
      setStore(prev => ({
        ...prev,
        currentUser: user,
        auditLog: [...prev.auditLog, {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: user.id,
          action: 'login',
          entityType: 'user',
          entityId: user.id,
          details: `User ${user.displayName} logged in`
        }]
      }));
    } else {
      setError('Invalid credentials. Try a demo account below.');
    }
  };

  const handleDemoLogin = (user: User) => {
    setStore(prev => ({
      ...prev,
      currentUser: user,
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: user.id,
        action: 'demo_login',
        entityType: 'user',
        entityId: user.id,
        details: `Demo login as ${user.displayName} (${user.role})`
      }]
    }));
  };

  return (
    <div className="min-h-screen bg-[#070b1a] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white">CrowdShield AI</h1>
              <p className="text-amber-400 text-sm">Intelligent Crowd Safety & Traffic Management</p>
            </div>
          </div>
          <p className="text-slate-400 max-w-lg mx-auto text-sm">
            Predict–Explain–Simulate–Act. A decision-support platform for crowd safety monitoring, 
            traffic flow management, and emergency response coordination at large public events.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs text-amber-400">Demo Mode — All data is simulated</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Login form */}
          <div className="bg-[#111b36] rounded-xl border border-[#1c2a4f] p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200">
              <Users className="w-5 h-5 text-amber-400" />
              Sign In
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1429] border border-[#1c2a4f] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1429] border border-[#1c2a4f] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                    placeholder="Enter password"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-rose-400 text-sm">{error}</p>}
              <button
                onClick={handleLogin}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-amber-500/20"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Demo accounts */}
          <div className="bg-[#111b36] rounded-xl border border-[#1c2a4f] p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Quick Demo Access</h2>
            <p className="text-sm text-slate-400 mb-4">Select a role to explore the platform with appropriate permissions:</p>
            
            <div className="space-y-2">
              {DEMO_USERS.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleDemoLogin(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#0d1429]/50 hover:bg-[#162042] border border-[#1c2a4f] hover:border-amber-500/50 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-violet-500/20">
                    {user.displayName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-200">{user.displayName}</p>
                    <p className="text-xs text-slate-500 capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                  <span className="text-xs text-amber-400">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>CrowdShield AI is a decision-support prototype. It does not control real traffic signals, direct real crowds, or contact real emergency services.</p>
          <p className="mt-1">All data shown is simulated for demonstration purposes. Actual emergency procedures must follow approved safety plans.</p>
        </div>
      </div>
    </div>
  );
}
