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
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-green-400 bg-green-500/10 border-green-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Command Centre</h1>
          <p className="text-sm text-slate-400">
            {store.event.name} • {store.event.startDate} to {store.event.endDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs text-amber-400">
            📊 SIMULATION DATA
          </span>
          <span className="px-3 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
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
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Crowd Density Trend (Selected Zones)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={crowdTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Main Temple Area" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="River Ghats" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Food Court Zone" stroke="#eab308" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Stage & Performance Area" stroke="#a855f7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Congestion */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Road Congestion Levels
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trafficData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={100} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="congestion" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gate Flow + Zone Risk */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Gate Inflow/Outflow */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3">Gate Flow (people/hour)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inflow" fill="#22c55e" name="Inflow" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" fill="#3b82f6" name="Outflow" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Risk Summary */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Zone Risk Overview
          </h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {zoneRisks.sort((a, b) => b.risk.score - a.risk.score).map(({ zone, risk }) => (
              <div key={zone.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border ${getRiskColor(risk.severity)}`}>
                  {risk.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{zone.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{risk.severity} • {risk.trend.replace('_', ' ')}</p>
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
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Recent Alerts</h3>
        <div className="space-y-2">
          {store.alerts.slice(0, 5).map(alert => (
            <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-700">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
              }`}></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{alert.title}</p>
                <p className="text-xs text-slate-400 truncate">{alert.description}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                alert.status === 'active' ? 'bg-red-500/20 text-red-400' :
                alert.status === 'acknowledged' ? 'bg-amber-500/20 text-amber-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {alert.status}
              </span>
              <span className="text-xs text-slate-500 flex-shrink-0">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-slate-600 rounded flex-shrink-0">
                {alert.dataSource}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Route Status */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Siren className="w-4 h-4 text-red-400" />
          Emergency Access Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-xs text-green-400">Emergency Corridor</p>
            <p className="text-lg font-bold text-green-400">OPEN</p>
            <p className="text-xs text-slate-400">15% utilization</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
            <p className="text-xs text-slate-400">Active Emergency Vehicles</p>
            <p className="text-lg font-bold">{store.emergencyVehicles.filter(v => v.status === 'en_route').length}</p>
            <p className="text-xs text-slate-400">simulated</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-400">Blocked Routes</p>
            <p className="text-lg font-bold text-red-400">{blockedRoads.length}</p>
            <p className="text-xs text-slate-400">{blockedRoads.map(r => r.name).join(', ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sublabel, color }: { icon: any; label: string; value: string; sublabel: string; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    red: 'text-red-400 bg-red-500/10 border-red-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    green: 'text-green-400 bg-green-500/10 border-green-500/30',
  };

  return (
    <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-60">{sublabel}</p>
    </div>
  );
}
