import React from 'react';
import { useStore } from '../store';
import { Activity, Car, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function TrafficFlow() {
  const { store } = useStore();

  const roadData = store.roads.map(r => ({
    ...r,
    utilization: Math.round((r.currentFlow / r.capacity) * 100)
  }));

  const congestedRoads = roadData.filter(r => r.congestionLevel > 70);
  const blockedRoads = roadData.filter(r => r.status === 'blocked');

  const chartData = roadData.map(r => ({
    name: r.name.length > 15 ? r.name.slice(0, 15) + '...' : r.name,
    flow: r.currentFlow,
    capacity: r.capacity,
    congestion: r.congestionLevel
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            TrafficFlow Monitor
          </h1>
          <p className="text-xs text-slate-400">Vehicle flow monitoring, congestion detection, and anomaly alerts</p>
        </div>
        <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
          📊 SIMULATION DATA
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs text-slate-400">Total Roads</p>
          <p className="text-2xl font-bold">{store.roads.length}</p>
          <p className="text-xs text-slate-500">monitored segments</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs text-slate-400">Congested</p>
          <p className="text-2xl font-bold text-orange-400">{congestedRoads.length}</p>
          <p className="text-xs text-slate-500">&gt;70% capacity</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs text-slate-400">Blocked</p>
          <p className="text-2xl font-bold text-red-400">{blockedRoads.length}</p>
          <p className="text-xs text-slate-500">impassable</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs text-slate-400">Avg Congestion</p>
          <p className="text-2xl font-bold">{Math.round(roadData.reduce((s, r) => s + r.congestionLevel, 0) / roadData.length)}%</p>
          <p className="text-xs text-slate-500">across all roads</p>
        </div>
      </div>

      {/* Congestion chart */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Road Flow vs Capacity</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="capacity" fill="#334155" name="Capacity" radius={[4, 4, 0, 0]} />
            <Bar dataKey="flow" fill="#06b6d4" name="Current Flow" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Road details table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Road Segment Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-2 pr-4">Road</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Flow</th>
                <th className="pb-2 pr-4">Capacity</th>
                <th className="pb-2 pr-4">Congestion</th>
                <th className="pb-2">Alert</th>
              </tr>
            </thead>
            <tbody>
              {roadData.map(road => (
                <tr key={road.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-2 pr-4 font-medium">{road.name}</td>
                  <td className="py-2 pr-4 capitalize">{road.type}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      road.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                      road.status === 'congested' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{road.status}</span>
                  </td>
                  <td className="py-2 pr-4">{road.currentFlow}</td>
                  <td className="py-2 pr-4">{road.capacity}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded">
                        <div className={`h-full rounded ${
                          road.congestionLevel > 80 ? 'bg-red-500' :
                          road.congestionLevel > 60 ? 'bg-orange-500' :
                          road.congestionLevel > 40 ? 'bg-amber-500' : 'bg-green-500'
                        }`} style={{ width: `${road.congestionLevel}%` }}></div>
                      </div>
                      <span>{road.congestionLevel}%</span>
                    </div>
                  </td>
                  <td className="py-2">
                    {road.congestionLevel > 70 && (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Traffic Alerts
        </h3>
        <div className="space-y-2">
          {store.alerts.filter(a => a.category === 'congested_road' || a.category === 'blocked_route').map(alert => (
            <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
              <div className="flex-1">
                <p className="text-sm">{alert.title}</p>
                <p className="text-xs text-slate-400">{alert.evidence}</p>
              </div>
              <span className="text-xs px-2 py-0.5 bg-slate-600 rounded">{alert.dataSource}</span>
            </div>
          ))}
          {store.alerts.filter(a => a.category === 'congested_road' || a.category === 'blocked_route').length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No active traffic alerts</p>
          )}
        </div>
      </div>
    </div>
  );
}
