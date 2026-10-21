import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Map, Users, AlertTriangle, Route, Siren, FlaskConical, Activity, Bell, Menu, X, LogOut, Play, Pause, RotateCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ============ DATA ============
const ZONES = [
  { id: 'z1', name: 'Main Temple', capacity: 8000, area: 5000, lat: 25.356, lng: 82.990, count: 6500 },
  { id: 'z2', name: 'River Ghats', capacity: 12000, area: 8000, lat: 25.353, lng: 82.992, count: 8000 },
  { id: 'z3', name: 'Food Court', capacity: 4000, area: 3000, lat: 25.358, lng: 82.987, count: 2800 },
  { id: 'z4', name: 'North Parking', capacity: 2000, area: 10000, lat: 25.362, lng: 82.985, count: 1200 },
  { id: 'z5', name: 'Stage Area', capacity: 6000, area: 4000, lat: 25.359, lng: 82.993, count: 4200 },
  { id: 'z6', name: 'Medical Hub', capacity: 500, area: 2000, lat: 25.355, lng: 82.985, count: 150 },
  { id: 'z7', name: 'Exhibition', capacity: 9000, area: 6000, lat: 25.360, lng: 82.988, count: 5500 },
  { id: 'z8', name: 'North Entry', capacity: 5000, area: 2500, lat: 25.364, lng: 82.989, count: 3200 },
];

const GATES = [
  { id: 'g1', name: 'North Gate A', lat: 25.365, lng: 82.988, capacity: 3000, inflow: 2400, outflow: 1800, open: true },
  { id: 'g2', name: 'North Gate B', lat: 25.365, lng: 82.991, capacity: 2500, inflow: 2100, outflow: 0, open: true },
  { id: 'g3', name: 'East Gate', lat: 25.3555, lng: 82.996, capacity: 2000, inflow: 1200, outflow: 1500, open: true },
  { id: 'g4', name: 'South Gate', lat: 25.3475, lng: 82.991, capacity: 3500, inflow: 2800, outflow: 2200, open: true },
  { id: 'g5', name: 'West Gate', lat: 25.3555, lng: 82.983, capacity: 2000, inflow: 0, outflow: 1600, open: true },
];

const ROADS = [
  { id: 'r1', name: 'Temple Road', from: 'g1', to: 'z1', status: 'open', congestion: 64 },
  { id: 'r2', name: 'Ghat Access', from: 'z1', to: 'z2', status: 'open', congestion: 75 },
  { id: 'r3', name: 'Food Court Link', from: 'g1', to: 'z3', status: 'open', congestion: 50 },
  { id: 'r4', name: 'North Parking Rd', from: 'g1', to: 'z4', status: 'congested', congestion: 90 },
  { id: 'r5', name: 'South Approach', from: 'g4', to: 'z5', status: 'open', congestion: 62 },
  { id: 'r6', name: 'Emergency Corridor', from: 'z6', to: 'z1', status: 'open', congestion: 15 },
  { id: 'r7', name: 'Blocked Road', from: 'z4', to: 'z7', status: 'blocked', congestion: 100 },
  { id: 'r8', name: 'West Exit', from: 'z1', to: 'g5', status: 'open', congestion: 57 },
];

const ALERTS_INIT = [
  { id: 1, title: 'Critical density in Main Temple', severity: 'critical', status: 'active', time: '2 min ago', zone: 'z1', desc: '6800+ people, 85% capacity' },
  { id: 2, title: 'North Parking Road congested', severity: 'critical', status: 'acknowledged', time: '5 min ago', zone: 'r4', desc: '90% capacity reached' },
  { id: 3, title: 'Blocked Road Alpha', severity: 'critical', status: 'acknowledged', time: '10 min ago', zone: 'r7', desc: 'Road blocked, diversion active' },
  { id: 4, title: 'Stage Area high density', severity: 'warning', status: 'active', time: '1 min ago', zone: 'z5', desc: '4200 people, 70% capacity' },
];

// ============ RISK ENGINE ============
function calcRisk(zone: any, multiplier: number) {
  const density = (zone.count * multiplier) / zone.area;
  const capacityRatio = (zone.count * multiplier) / zone.capacity;
  const densityScore = Math.min(100, capacityRatio * 100);
  const blockedNearby = ROADS.filter(r => r.status === 'blocked' && (r.from === zone.id || r.to === zone.id)).length;
  const blockedScore = blockedNearby * 40;
  const score = Math.round(densityScore * 0.7 + blockedScore * 0.3);
  const severity = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low';
  return { score, severity, density, capacityRatio };
}

// ============ ROUTING ============
function findRoute(fromId: string, toId: string, avoidBlocked: boolean) {
  const adj: Record<string, { to: string; road: any }[]> = {};
  ZONES.forEach(z => adj[z.id] = []);
  GATES.forEach(g => adj[g.id] = []);
  ROADS.forEach(r => {
    if (avoidBlocked && r.status === 'blocked') return;
    if (adj[r.from]) adj[r.from].push({ to: r.to, road: r });
    if (adj[r.to]) adj[r.to].push({ to: r.from, road: r });
  });
  const visited = new Set<string>();
  const dist: Record<string, number> = {};
  const prev: Record<string, string> = {};
  [...ZONES, ...GATES].forEach(n => { dist[n.id] = Infinity; });
  dist[fromId] = 0;
  for (let i = 0; i < 20; i++) {
    let cur = '', min = Infinity;
    Object.entries(dist).forEach(([id, d]) => { if (!visited.has(id) && d < min) { min = d; cur = id; } });
    if (!cur || cur === toId) break;
    visited.add(cur);
    (adj[cur] || []).forEach(({ to, road }) => {
      const cost = road.congestion + 50;
      if (dist[cur] + cost < dist[to]) { dist[to] = dist[cur] + cost; prev[to] = cur; }
    });
  }
  if (dist[toId] === Infinity) return null;
  const path: string[] = [];
  let c: string = toId;
  while (c && c !== fromId) { path.unshift(c); c = prev[c]; }
  path.unshift(fromId);
  return { path, cost: dist[toId] };
}

// ============ APP ============
export default function App() {
  const [page, setPage] = useState('dashboard');
  const [zones, setZones] = useState(ZONES);
  const [roads, setRoads] = useState(ROADS);
  const [alerts, setAlerts] = useState(ALERTS_INIT);
  const [running, setRunning] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [routeFrom, setRouteFrom] = useState('g1');
  const [routeTo, setRouteTo] = useState('z2');
  const [routeResult, setRouteResult] = useState<any>(null);
  const [scenarioChanges, setScenarioChanges] = useState<string[]>([]);

  // Simulation tick
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setZones(prev => prev.map(z => {
        const change = Math.round((Math.random() - 0.3) * 100 * multiplier);
        return { ...z, count: Math.max(0, Math.min(z.capacity * 1.5, z.count + change)) };
      }));
    }, 2000);
    return () => clearInterval(t);
  }, [running, multiplier]);

  const totalCrowd = zones.reduce((s, z) => s + z.count, 0);
  const criticalZones = zones.filter(z => calcRisk(z, multiplier).severity === 'critical').length;
  const activeAlerts = alerts.filter(a => a.status === 'active').length;

  const toggleRoad = (id: string) => {
    setRoads(prev => prev.map(r => r.id === id ? { ...r, status: r.status === 'blocked' ? 'open' : 'blocked', congestion: r.status === 'blocked' ? 50 : 100 } : r));
  };

  const calcRoute = () => {
    const route = findRoute(routeFrom, routeTo, true);
    setRouteResult(route);
  };

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Event Map', icon: Map },
    { id: 'crowd', label: 'Crowd Monitor', icon: Users },
    { id: 'risk', label: 'Risk Engine', icon: AlertTriangle },
    { id: 'routes', label: 'Route Planner', icon: Route },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'scenario', label: 'Scenario Lab', icon: FlaskConical },
    { id: 'traffic', label: 'Traffic', icon: Activity },
  ];

  const sevColor = (s: string) => s === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/30' : s === 'high' ? 'text-orange-400 bg-orange-500/10' : s === 'warning' ? 'text-amber-400 bg-amber-500/10' : 'text-green-400 bg-green-500/10';
  const densityColor = (score: number) => score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 35 ? '#eab308' : '#22c55e';

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center gap-2">
          <Shield className="w-7 h-7 text-cyan-400" />
          <div><h1 className="font-bold text-sm text-cyan-400">CrowdShield AI</h1><p className="text-[10px] text-slate-400">Crowd Safety Platform</p></div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(n => {
            const Icon = n.icon;
            return (
              <button key={n.id} onClick={() => setPage(n.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${page === n.id ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                <Icon className="w-4 h-4" />{n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-700 text-xs text-slate-400">
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">SIMULATION</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-400">Kumbh Mela 2026 Simulation</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setRunning(!running)} className={`px-3 py-1 rounded ${running ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {running ? '⏸ Pause' : '▶ Start'}
            </button>
            <span className="text-slate-400">Speed: {multiplier.toFixed(1)}x</span>
            <button onClick={() => setMultiplier(m => Math.max(0.5, m - 0.2))} className="px-2 py-0.5 bg-slate-700 rounded">-</button>
            <button onClick={() => setMultiplier(m => Math.min(3, m + 0.2))} className="px-2 py-0.5 bg-slate-700 rounded">+</button>
            <button onClick={() => { setZones(ZONES); setRoads(ROADS); setMultiplier(1); }} className="px-2 py-0.5 bg-slate-700 rounded">↺ Reset</button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4">
          {/* DASHBOARD */}
          {page === 'dashboard' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Command Centre</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Total Crowd', value: totalCrowd.toLocaleString(), color: 'cyan' },
                  { label: 'Active Zones', value: zones.length, color: 'blue' },
                  { label: 'Critical Zones', value: criticalZones, color: 'red' },
                  { label: 'Active Alerts', value: activeAlerts, color: 'amber' },
                  { label: 'Blocked Roads', value: roads.filter(r => r.status === 'blocked').length, color: 'red' },
                ].map((k, i) => (
                  <div key={i} className={`p-3 rounded-xl border bg-${k.color}-500/10 border-${k.color}-500/30 text-${k.color}-400`}>
                    <p className="text-xs opacity-80">{k.label}</p>
                    <p className="text-xl font-bold">{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <h3 className="text-sm font-semibold mb-3">Crowd Trend</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={zones.slice(0, 5).map(z => ({ name: z.name.slice(0, 10), count: z.count }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <h3 className="text-sm font-semibold mb-3">Zone Risk</h3>
                  <div className="space-y-2">
                    {zones.map(z => {
                      const risk = calcRisk(z, multiplier);
                      return (
                        <div key={z.id} className="flex items-center gap-2 text-xs">
                          <div className={`w-8 h-8 rounded flex items-center justify-center font-bold border ${sevColor(risk.severity)}`}>{risk.score}</div>
                          <span className="flex-1 truncate">{z.name}</span>
                          <span className="text-slate-400">{z.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-semibold mb-3">Recent Alerts</h3>
                {alerts.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded bg-slate-700/30 mb-2">
                    <span className={`w-2 h-2 rounded-full ${a.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <span className="flex-1 text-sm">{a.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${a.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{a.status}</span>
                    <span className="text-xs text-slate-500">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAP */}
          {page === 'map' && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Event Map</h2>
              <div className="h-[500px] rounded-xl overflow-hidden border border-slate-700 relative">
                <MapContainer center={[25.3565, 82.9895]} zoom={16} className="w-full h-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
                  {zones.map(z => {
                    const risk = calcRisk(z, multiplier);
                    return (
                      <CircleMarker key={z.id} center={[z.lat, z.lng]} radius={15 + (z.count / z.capacity) * 20}
                        pathOptions={{ color: densityColor(risk.score), fillColor: densityColor(risk.score), fillOpacity: 0.3, weight: 2 }}
                        eventHandlers={{ click: () => setSelectedZone(z.id) }}>
                        <Popup><div className="text-xs"><b>{z.name}</b><br />Count: {z.count}<br />Risk: {risk.score}/100 ({risk.severity})</div></Popup>
                      </CircleMarker>
                    );
                  })}
                  {GATES.map(g => (
                    <CircleMarker key={g.id} center={[g.lat, g.lng]} radius={7}
                      pathOptions={{ color: g.open ? '#22c55e' : '#ef4444', fillColor: g.open ? '#22c55e' : '#ef4444', fillOpacity: 0.8 }}>
                      <Popup><div className="text-xs"><b>{g.name}</b><br />In: {g.inflow}/hr | Out: {g.outflow}/hr</div></Popup>
                    </CircleMarker>
                  ))}
                  {roads.map(r => {
                    const from = [...ZONES, ...GATES].find(n => n.id === r.from);
                    const to = [...ZONES, ...GATES].find(n => n.id === r.to);
                    if (!from || !to) return null;
                    return (
                      <Polyline key={r.id} positions={[[from.lat, from.lng], [to.lat, to.lng]]}
                        pathOptions={{ color: r.status === 'blocked' ? '#ef4444' : r.status === 'congested' ? '#f97316' : '#06b6d4', weight: r.status === 'blocked' ? 4 : 2, dashArray: r.status === 'blocked' ? '8,4' : undefined }}>
                        <Popup><div className="text-xs"><b>{r.name}</b><br />Status: {r.status}<br />Congestion: {r.congestion}%</div></Popup>
                      </Polyline>
                    );
                  })}
                </MapContainer>
                <div className="absolute bottom-3 left-3 bg-slate-800/90 rounded-lg p-2 z-[1000] text-xs">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />Low</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" />Med</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500" />High</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />Critical</span>
                  </div>
                </div>
              </div>
              {selectedZone && (() => {
                const z = zones.find(zz => zz.id === selectedZone)!;
                const risk = calcRisk(z, multiplier);
                return (
                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <h3 className="font-semibold text-sm mb-2">{z.name}</h3>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="p-2 bg-slate-700/50 rounded"><p className="text-xs text-slate-400">Risk</p><p className={`text-xl font-bold ${sevColor(risk.severity).split(' ')[0]}`}>{risk.score}</p></div>
                      <div className="p-2 bg-slate-700/50 rounded"><p className="text-xs text-slate-400">Count</p><p className="text-xl font-bold text-cyan-400">{z.count}</p></div>
                      <div className="p-2 bg-slate-700/50 rounded"><p className="text-xs text-slate-400">Capacity</p><p className="text-xl font-bold">{z.capacity}</p></div>
                      <div className="p-2 bg-slate-700/50 rounded"><p className="text-xs text-slate-400">Usage</p><p className="text-xl font-bold">{Math.round(risk.capacityRatio * 100)}%</p></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* CROWD MONITOR */}
          {page === 'crowd' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Crowd Monitor</h2>
              <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">📊 SIMULATION DATA</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {zones.slice(0, 4).map(z => {
                  const risk = calcRisk(z, multiplier);
                  return (
                    <div key={z.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                      <p className="text-xs text-slate-400">{z.name}</p>
                      <p className="text-2xl font-bold text-cyan-400">{z.count.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">of {z.capacity} capacity</p>
                      <div className="w-full h-1.5 bg-slate-700 rounded mt-2">
                        <div className={`h-full rounded ${risk.severity === 'critical' ? 'bg-red-500' : risk.severity === 'high' ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, risk.capacityRatio * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-semibold mb-3">All Zones</h3>
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-400 border-b border-slate-700"><th className="pb-2 text-left">Zone</th><th className="pb-2 text-left">Count</th><th className="pb-2 text-left">Capacity</th><th className="pb-2 text-left">Density</th><th className="pb-2 text-left">Risk</th></tr></thead>
                  <tbody>
                    {zones.map(z => {
                      const risk = calcRisk(z, multiplier);
                      return (
                        <tr key={z.id} className="border-b border-slate-700/50">
                          <td className="py-2">{z.name}</td>
                          <td className="py-2">{z.count.toLocaleString()}</td>
                          <td className="py-2">{z.capacity.toLocaleString()}</td>
                          <td className="py-2">{risk.density.toFixed(2)}/m²</td>
                          <td className="py-2"><span className={`px-2 py-0.5 rounded ${sevColor(risk.severity)}`}>{risk.score}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RISK ENGINE */}
          {page === 'risk' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">CrowdPulse Risk Engine</h2>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <p className="text-xs text-slate-400 mb-3">Score = Density(70%) + Blocked Access(30%). Range: 0-100. Low(&lt;35), Moderate(35-59), High(60-79), Critical(≥80).</p>
                <div className="space-y-2">
                  {zones.map(z => {
                    const risk = calcRisk(z, multiplier);
                    return (
                      <div key={z.id} className="flex items-center gap-3 p-2 rounded bg-slate-700/30">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold border ${sevColor(risk.severity)}`}>{risk.score}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{z.name}</p>
                          <p className="text-xs text-slate-400">{z.count} people • {Math.round(risk.capacityRatio * 100)}% capacity</p>
                        </div>
                        <div className="w-32 h-2 bg-slate-700 rounded">
                          <div className={`h-full rounded ${risk.severity === 'critical' ? 'bg-red-500' : risk.severity === 'high' ? 'bg-orange-500' : risk.severity === 'moderate' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${risk.score}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Radar for top zone */}
              {(() => {
                const topZone = [...zones].sort((a, b) => calcRisk(b, multiplier).score - calcRisk(a, multiplier).score)[0];
                const risk = calcRisk(topZone, multiplier);
                const data = [
                  { factor: 'Density', score: Math.min(100, risk.capacityRatio * 100) },
                  { factor: 'Capacity', score: risk.capacityRatio * 100 },
                  { factor: 'Access', score: ROADS.filter(r => r.status === 'blocked' && (r.from === topZone.id || r.to === topZone.id)).length * 50 },
                  { factor: 'Growth', score: running ? 60 : 30 },
                  { factor: 'Duration', score: 40 },
                ];
                return (
                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <h3 className="text-sm font-semibold mb-3">Factor Breakdown — {topZone.name}</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={data}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#64748b' }} />
                        <Radar dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ROUTE PLANNER */}
          {page === 'routes' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Route Planner</h2>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <p className="text-xs text-slate-400 mb-3">Dijkstra's algorithm with congestion cost + blocked road avoidance.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-slate-400">From</label>
                    <select value={routeFrom} onChange={e => setRouteFrom(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm">
                      {[...GATES, ...zones].map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">To</label>
                    <select value={routeTo} onChange={e => setRouteTo(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm">
                      {[...GATES, ...zones].map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={calcRoute} className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded text-sm font-medium">Calculate Route</button>
                  </div>
                </div>
                {routeResult && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm font-medium text-green-400">✓ Route Found</p>
                    <p className="text-xs text-slate-300 mt-1">Path: {routeResult.path.map((id: string) => [...zones, ...GATES].find(n => n.id === id)?.name || id).join(' → ')}</p>
                    <p className="text-xs text-slate-400 mt-1">Cost: {routeResult.cost} (lower = better, accounts for congestion)</p>
                  </div>
                )}
                {routeResult === null && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">No route found — all paths blocked</p>
                  </div>
                )}
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-semibold mb-3">Road Status</h3>
                <div className="space-y-2">
                  {roads.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-2 rounded bg-slate-700/30 text-sm">
                      <span className={`w-2 h-2 rounded-full ${r.status === 'blocked' ? 'bg-red-500' : r.status === 'congested' ? 'bg-orange-500' : 'bg-green-500'}`} />
                      <span className="flex-1">{r.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${r.status === 'blocked' ? 'bg-red-500/20 text-red-400' : r.status === 'congested' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>{r.status}</span>
                      <button onClick={() => toggleRoad(r.id)} className="px-2 py-0.5 bg-slate-600 rounded text-xs hover:bg-slate-500">{r.status === 'blocked' ? 'Reopen' : 'Block'}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ALERTS */}
          {page === 'alerts' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Alerts & Incidents</h2>
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${a.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-slate-400">{a.desc}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${a.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{a.status}</span>
                      <span className="text-xs text-slate-500">{a.time}</span>
                      {a.status === 'active' && (
                        <button onClick={() => setAlerts(prev => prev.map(al => al.id === a.id ? { ...al, status: 'acknowledged' } : al))} className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs">Acknowledge</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCENARIO LAB */}
          {page === 'scenario' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Scenario Lab</h2>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-xs text-purple-400">
                Simulate what-if scenarios. All results are estimates, not real predictions.
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-semibold mb-3">Apply Changes</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {[
                    { label: '+30% Crowd', action: () => setMultiplier(m => m + 0.3) },
                    { label: '+50% Crowd', action: () => setMultiplier(m => m + 0.5) },
                    { label: '-20% Crowd', action: () => setMultiplier(m => Math.max(0.5, m - 0.2)) },
                    { label: 'Block Road', action: () => setRoads(prev => prev.map((r, i) => i === 1 ? { ...r, status: 'blocked', congestion: 100 } : r)) },
                    { label: 'Close Gate', action: () => setZones(prev => prev.map((z, i) => i === 0 ? { ...z, count: Math.round(z.count * 1.4) } : z)) },
                    { label: 'Reopen All', action: () => setRoads(prev => prev.map(r => r.status === 'blocked' ? { ...r, status: 'open', congestion: 50 } : r)) },
                  ].map((b, i) => (
                    <button key={i} onClick={b.action} className="px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-400 hover:bg-purple-500/20">{b.label}</button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-semibold mb-3">Current State</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={zones.map(z => ({ name: z.name.slice(0, 10), current: z.count, capacity: z.capacity, risk: calcRisk(z, multiplier).score }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="current" fill="#06b6d4" name="Current Count" />
                    <Bar dataKey="risk" fill="#a855f7" name="Risk Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TRAFFIC */}
          {page === 'traffic' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Traffic Flow</h2>
              <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">📊 SIMULATION</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-400">Open Roads</p>
                  <p className="text-2xl font-bold text-green-400">{roads.filter(r => r.status === 'open').length}</p>
                </div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-400">Congested</p>
                  <p className="text-2xl font-bold text-orange-400">{roads.filter(r => r.status === 'congested').length}</p>
                </div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-400">Blocked</p>
                  <p className="text-2xl font-bold text-red-400">{roads.filter(r => r.status === 'blocked').length}</p>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-semibold mb-3">Road Congestion</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={roads.map(r => ({ name: r.name, congestion: r.congestion }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="congestion" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-semibold mb-3">Road Details</h3>
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-400 border-b border-slate-700"><th className="pb-2 text-left">Road</th><th className="pb-2 text-left">Status</th><th className="pb-2 text-left">Congestion</th><th className="pb-2">Action</th></tr></thead>
                  <tbody>
                    {roads.map(r => (
                      <tr key={r.id} className="border-b border-slate-700/50">
                        <td className="py-2">{r.name}</td>
                        <td className="py-2"><span className={`px-2 py-0.5 rounded capitalize ${r.status === 'blocked' ? 'bg-red-500/20 text-red-400' : r.status === 'congested' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>{r.status}</span></td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-700 rounded"><div className={`h-full rounded ${r.congestion > 80 ? 'bg-red-500' : r.congestion > 60 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${r.congestion}%` }} /></div>
                            <span>{r.congestion}%</span>
                          </div>
                        </td>
                        <td className="py-2 text-right"><button onClick={() => toggleRoad(r.id)} className="px-2 py-0.5 bg-slate-600 rounded hover:bg-slate-500">{r.status === 'blocked' ? 'Reopen' : 'Block'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
