import React from 'react';
import { useStore } from '../store';
import { calculateRiskScore } from '../engine';
import { Users, AlertTriangle, MapPin, Car, Siren, Clock, TrendingUp, Activity, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Dashboard() {
  const { store } = useStore();

  // Calculate risk for each zone
  const zoneRisks = store.zones.map(zone => {
    const risk = calculateRiskScore(zone, store.observations, store.gates, store.roads, store.simulation.blockedRoads);
    return { zone, risk };
  });

  const activeAlerts = store.alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const zonesNeedingAttention = zoneRisks.filter(z => z.risk.severity === 'high' || z.risk.severity === 'critical');
  const congestedRoads = store.roads.filter(r => r.congestionLevel > 70);
  const blockedRoads = store.roads.filter(r => r.status === 'blocked');
  const totalCrowd = store.zones.reduce((sum, zone) => {
    const latest = store.observations.filter(o => o.zoneId === zone.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return sum + (latest?.estimatedCount || 0);
  }, 0);

  // Generate chart data
  const crowdTrend = Array.from({ length: 10 }, (_, i) => {
    const time = new Date(Date.now() - (9 - i) * 5 * 60000);
    const zones = store.zones.slice(0, 4);
    const point: any = { time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    zones.forEach(zone => {
      const obs = store.observations.filter(o => o.zoneId === zone.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      point[zone.name] = obs[i]?.estimatedCount || 0;
    });
    return point;
  });

  const trafficData = store.roads.map(r => ({
    name: r.name.length > 12 ? r.name.slice(0, 12) + '...' : r.name,
    congestion: r.congestionLevel,
    flow: r.currentFlow
  }));

  const gateData = store.gates.filter(g => g.status === 'open').map(g => ({
    name: g.name,
    inflow: g.currentInflow,
    outflow: g.currentOutflow
  }));

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Centre</h1>
          <p className="text-sm text-slate-400">
            {store.event.name} • {store.event.startDate} to {store.event.endDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs text-amber-400 font-medium">
            📊 SIMULATION DATA
          </span>
          <span className="px-3 py-1 bg-[#111b36] border border-[#1c2a4f] rounded-full text-xs text-slate-300">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard icon={Users} label="Total Crowd" value={totalCrowd.toLocaleString()} sublabel="estimated" color="cyan" />
        <KPICard icon={MapPin} label="Active Zones" value={store.zones.length.toString()} sublabel="monitored" color="blue" />
        <KPICard icon={AlertTriangle} label="Need Attention" value={zonesNeedingAttention.length.toString()} sublabel="high/critical risk" color="orange" />
        <KPICard icon={Car} label="Congested Roads" value={congestedRoads.length.toString()} sublabel={`${blockedRoads.length} blocked`} color="red" />
        <KPICard icon={Siren} label="Active Alerts" value={activeAlerts.length.toString()} sublabel={`${criticalAlerts.length} critical`} color="red" />
        <KPICard icon={Clock} label="Pending Review" value={store.alerts.filter(a => a.status === 'active').length.toString()} sublabel="acknowledgements" color="amber" />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Crowd Trend */}
        <div className="bg-[#111b36] rounded-xl border border-[#1c2a4f] p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-slate-200">Crowd Density Trend (Selected Zones)</span>
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={crowdTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2a4f" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#0d1429', border: '1px solid #1c2a4f', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Main Temple Area" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="River Ghats" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Food Court Zone" stroke="#eab308" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Stage & Performance Area" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Congestion */}
        <div className="bg-[#111b36] rounded-xl border border-[#1c2a4f] p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-200">Road Congestion Levels</span>
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trafficData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2a4f" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} width={100} />
              <Tooltip contentStyle={{ background: '#0d1429', border: '1px solid #1c2a4f', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }} />
              <Bar dataKey="congestion" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gate Flow + Zone Risk */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Gate Inflow/Outflow */}
        <div className="bg-[#111b36] rounded-xl border border-[#1c2a4f] p-4">
          <h3 className="text-sm font-semibold mb-3 text-slate-200">Gate Flow (people/hour)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2a4f" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#0d1429', border: '1px solid #1c2a4f', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inflow" fill="#10b981" name="Inflow" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" fill="#3b82f6" name="Outflow" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Risk Summary */}
        <div className="bg-[#111b36] rounded-xl border border-[#1c2a4f] p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-slate-200">Zone Risk Overview</span>
          </h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {zoneRisks.sort((a, b) => b.risk.score - a.risk.score).map(({ zone, risk }) => (
              <div key={zone.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#0d1429]/50">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border ${getRiskColor(risk.severity)}`}>
                  {risk.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-200">{zone.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{risk.severity} • {risk.trend.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">
                    {store.observations.filter(o => o.zoneId === zone.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.estimatedCount || 0} people
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-[#111b36] rounded-xl border border-[#1c2a4f] p-4">
        <h3 className="text-sm font-semibold mb-3 text-slate-200">Recent Alerts</h3>
        <div className="space-y-2">
          {store.alerts.slice(0, 5).map(alert => (
            <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0d1429]/50 border border-[#1c2a4f]">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                alert.severity === 'critical' ? 'bg-rose-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
              }`}></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-slate-200">{alert.title}</p>
                <p className="text-xs text-slate-500 truncate">{alert.description}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                alert.status === 'active' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                alert.status === 'acknowledged' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {alert.status}
              </span>
              <span className="text-xs text-slate-500 flex-shrink-0">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-[#162042] border border-[#1c2a4f] rounded flex-shrink-0 text-slate-400">
                {alert.dataSource}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Route Status */}
      <div className="bg-[#111b36] rounded-xl border border-[#1c2a4f] p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Siren className="w-4 h-4 text-rose-400" />
          <span className="text-slate-200">Emergency Access Status</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs text-emerald-400">Emergency Corridor</p>
            <p className="text-lg font-bold text-emerald-400">OPEN</p>
            <p className="text-xs text-slate-500">15% utilization</p>
          </div>
          <div className="p-3 rounded-lg bg-[#0d1429]/50 border border-[#1c2a4f]">
            <p className="text-xs text-slate-500">Active Emergency Vehicles</p>
            <p className="text-lg font-bold text-slate-200">{store.emergencyVehicles.filter(v => v.status === 'en_route').length}</p>
            <p className="text-xs text-slate-500">simulated</p>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <p className="text-xs text-rose-400">Blocked Routes</p>
            <p className="text-lg font-bold text-rose-400">{blockedRoads.length}</p>
            <p className="text-xs text-slate-500">{blockedRoads.map(r => r.name).join(', ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sublabel, color }: { icon: any; label: string; value: string; sublabel: string; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    red: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  };

  return (
    <div className={`p-3 rounded-xl border ${colorClasses[color]} bg-[#111b36]`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs opacity-80 text-slate-300">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs opacity-60 text-slate-500">{sublabel}</p>
    </div>
  );
}
