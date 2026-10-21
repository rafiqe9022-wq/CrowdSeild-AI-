import React, { useState } from 'react';
import { useStore } from '../store';
import { History, Download, FileText, Filter } from 'lucide-react';

export function AuditLog() {
  const { store } = useStore();
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = actionFilter === 'all'
    ? store.auditLog
    : store.auditLog.filter(l => l.action.includes(actionFilter));

  const sortedLogs = [...filteredLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-cyan-400" />
          Audit Log
        </h1>
        <p className="text-xs text-slate-400">Complete record of all system actions, decisions, and state changes</p>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
        >
          <option value="all">All Actions</option>
          <option value="login">Logins</option>
          <option value="alert">Alert Actions</option>
          <option value="gate">Gate Changes</option>
          <option value="road">Road Changes</option>
          <option value="emergency">Emergency</option>
          <option value="signal">Signal Advisory</option>
          <option value="scenario">Scenarios</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto">{sortedLogs.length} entries</span>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700 bg-slate-800">
                <th className="p-3 pr-4">Timestamp</th>
                <th className="p-3 pr-4">User</th>
                <th className="p-3 pr-4">Action</th>
                <th className="p-3 pr-4">Entity</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.slice(0, 50).map(log => (
                <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="p-3 pr-4 text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3 pr-4">
                    {log.userId === 'system' ? (
                      <span className="text-slate-500">System</span>
                    ) : (
                      <span>{store.auditLog.find(l => l.userId === log.userId)?.userId || log.userId}</span>
                    )}
                  </td>
                  <td className="p-3 pr-4">
                    <span className="px-2 py-0.5 bg-slate-700 rounded text-[10px]">{log.action}</span>
                  </td>
                  <td className="p-3 pr-4 text-slate-400">{log.entityType}/{log.entityId.slice(0, 12)}</td>
                  <td className="p-3 text-slate-300 max-w-xs truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function Reports() {
  const { store } = useStore();

  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const alertReport = store.alerts.map(a => ({
    id: a.id,
    title: a.title,
    severity: a.severity,
    category: a.category,
    status: a.status,
    timestamp: a.timestamp,
    source: a.dataSource
  }));

  const zoneReport = store.zones.map(z => {
    const latest = store.observations.filter(o => o.zoneId === z.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return {
      zone: z.name,
      type: z.type,
      capacity: z.capacity,
      currentCount: latest?.estimatedCount || 0,
      utilization: latest ? Math.round((latest.estimatedCount / z.capacity) * 100) + '%' : 'N/A',
      density: latest?.density.toFixed(3) || '0'
    };
  });

  const roadReport = store.roads.map(r => ({
    road: r.name,
    type: r.type,
    status: r.status,
    flow: r.currentFlow,
    capacity: r.capacity,
    congestion: r.congestionLevel + '%'
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-cyan-400" />
          Reports & Exports
        </h1>
        <p className="text-xs text-slate-400">Generate and export reports based on persisted data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Alert Report */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-2">Alert Summary Report</h3>
          <p className="text-xs text-slate-400 mb-3">{store.alerts.length} total alerts</p>
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-red-400">Critical:</span>
              <span>{store.alerts.filter(a => a.severity === 'critical').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-amber-400">Warning:</span>
              <span>{store.alerts.filter(a => a.severity === 'warning').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-400">Resolved:</span>
              <span>{store.alerts.filter(a => a.status === 'resolved').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Active:</span>
              <span>{store.alerts.filter(a => a.status === 'active').length}</span>
            </div>
          </div>
          <button onClick={() => exportCSV(alertReport, 'crowdshield_alerts.csv')} className="w-full px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-cyan-500/30">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>

        {/* Zone Report */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-2">Zone Density Report</h3>
          <p className="text-xs text-slate-400 mb-3">{store.zones.length} zones monitored</p>
          <div className="space-y-1 mb-3">
            {store.zones.slice(0, 4).map(z => {
              const latest = store.observations.filter(o => o.zoneId === z.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              return (
                <div key={z.id} className="flex justify-between text-xs">
                  <span className="truncate text-slate-300">{z.name}</span>
                  <span>{latest?.estimatedCount || 0}</span>
                </div>
              );
            })}
          </div>
          <button onClick={() => exportCSV(zoneReport, 'crowdshield_zones.csv')} className="w-full px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-cyan-500/30">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>

        {/* Road Report */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-2">Traffic Flow Report</h3>
          <p className="text-xs text-slate-400 mb-3">{store.roads.length} road segments</p>
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-green-400">Open:</span>
              <span>{store.roads.filter(r => r.status === 'open').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-orange-400">Congested:</span>
              <span>{store.roads.filter(r => r.status === 'congested').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-400">Blocked:</span>
              <span>{store.roads.filter(r => r.status === 'blocked').length}</span>
            </div>
          </div>
          <button onClick={() => exportCSV(roadReport, 'crowdshield_roads.csv')} className="w-full px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-cyan-500/30">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Full data tables */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Recent Alert History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Title</th>
                <th className="pb-2 pr-4">Severity</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {store.alerts.map(a => (
                <tr key={a.id} className="border-b border-slate-700/50">
                  <td className="py-2 pr-4">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="py-2 pr-4 max-w-xs truncate">{a.title}</td>
                  <td className="py-2 pr-4 capitalize">{a.severity}</td>
                  <td className="py-2 pr-4 capitalize">{a.status}</td>
                  <td className="py-2">{a.dataSource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function Help() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Help & System Documentation</h1>
        <p className="text-xs text-slate-400">CrowdShield AI — Quick reference and known limitations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3 text-cyan-400">🎯 Guided Demo (5 minutes)</h3>
          <ol className="space-y-2 text-xs text-slate-300">
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">1.</span> Open Command Centre — review current conditions and active alerts</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">2.</span> Start simulation (top bar) — watch crowd zone move from moderate to high risk</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">3.</span> Open Risk Engine — see which factors caused the score increase</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">4.</span> Check Alerts — review suggested actions for active alerts</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">5.</span> Open Event Map — see density heatmap and click zones for details</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">6.</span> Use Route Planner — find alternative routes avoiding blocked roads</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">7.</span> Run Scenario Lab — compare baseline vs proposed changes</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">8.</span> Block a road in Gate Management — verify route engine avoids it</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">9.</span> Register emergency vehicle — see priority route calculation</li>
            <li className="flex gap-2"><span className="text-cyan-400 font-bold">10.</span> Acknowledge alert and check Audit Log — verify full traceability</li>
          </ol>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3 text-cyan-400">📋 Features</h3>
          <ul className="space-y-1 text-xs text-slate-300">
            <li>• CrowdPulse Risk Engine — explainable 0-100 scoring with 6 weighted factors</li>
            <li>• Graph-based routing (Dijkstra's) with congestion awareness</li>
            <li>• Blocked road avoidance in route calculations</li>
            <li>• What-if Scenario Lab with baseline comparison</li>
            <li>• Emergency vehicle priority routing</li>
            <li>• Signal timing recommendations with constraints</li>
            <li>• Full alert workflow: create → acknowledge → resolve</li>
            <li>• Complete audit trail for all actions</li>
            <li>• CSV export for reports</li>
            <li>• Role-based access (5 roles)</li>
            <li>• Interactive Leaflet map with density heatmap</li>
            <li>• Simulation engine with configurable parameters</li>
          </ul>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3 text-amber-400">⚠️ Known Limitations</h3>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• All data is simulated — no real camera feeds or traffic sensors</li>
            <li>• Risk scores are decision-support, not certified safety predictions</li>
            <li>• No real traffic signal control</li>
            <li>• No real emergency vehicle dispatch</li>
            <li>• Computer vision uses simulated counts (demo mode)</li>
            <li>• Travel times are estimated from simulated congestion</li>
            <li>• Projections use simple linear extrapolation</li>
            <li>• Data persists in browser localStorage only</li>
          </ul>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3 text-cyan-400">🔧 Technology Stack</h3>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• Frontend: React 18 + TypeScript + Tailwind CSS</li>
            <li>• Maps: Leaflet + react-leaflet + OpenStreetMap</li>
            <li>• Charts: Recharts</li>
            <li>• Routing: Custom Dijkstra's algorithm implementation</li>
            <li>• State: React Context + localStorage persistence</li>
            <li>• Build: Vite</li>
            <li>• Icons: Lucide React</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
