import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import { useStore } from '../store';
import { calculateRiskScore } from '../engine';
import 'leaflet/dist/leaflet.css';

export default function MapPage() {
  const { store } = useStore();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showLayers, setShowLayers] = useState({ zones: true, gates: true, roads: true, incidents: true, cameras: false });
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const zoneRisks = store.zones.map(zone => ({
    zone,
    risk: calculateRiskScore(zone, store.observations, store.gates, store.roads, store.simulation.blockedRoads)
  }));

  const getDensityColor = (zoneId: string) => {
    const risk = zoneRisks.find(zr => zr.zone.id === zoneId);
    if (!risk) return '#22c55e';
    if (risk.risk.score >= 80) return '#ef4444';
    if (risk.risk.score >= 60) return '#f97316';
    if (risk.risk.score >= 35) return '#eab308';
    return '#22c55e';
  };

  const getDensityRadius = (zoneId: string) => {
    const zone = store.zones.find(z => z.id === zoneId);
    const latest = store.observations.filter(o => o.zoneId === zoneId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (!zone || !latest) return 20;
    const ratio = latest.estimatedCount / zone.capacity;
    return 15 + ratio * 30;
  };

  const filteredZones = riskFilter === 'all' 
    ? zoneRisks 
    : zoneRisks.filter(zr => riskFilter === 'high' ? zr.risk.score >= 60 : zr.risk.score < 60);

  const selectedZoneData = selectedZone ? zoneRisks.find(zr => zr.zone.id === selectedZone) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold">Interactive Event Map</h1>
          <p className="text-xs text-slate-400">Crowd density heatmap and operational overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
            SIMULATION
          </span>
          <select 
            value={riskFilter} 
            onChange={e => setRiskFilter(e.target.value)}
            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs"
          >
            <option value="all">All Zones</option>
            <option value="high">High Risk Only</option>
            <option value="low">Normal Only</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-700 relative">
          <MapContainer 
            center={[25.3565, 82.9895]} 
            zoom={16} 
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Zones */}
            {showLayers.zones && filteredZones.map(({ zone, risk }) => (
              <CircleMarker
                key={zone.id}
                center={[zone.center.lat, zone.center.lng]}
                radius={getDensityRadius(zone.id)}
                pathOptions={{
                  color: getDensityColor(zone.id),
                  fillColor: getDensityColor(zone.id),
                  fillOpacity: 0.3,
                  weight: 2
                }}
                eventHandlers={{ click: () => setSelectedZone(zone.id) }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{zone.name}</strong><br/>
                    Risk Score: {risk.score}/100 ({risk.severity})<br/>
                    Crowd: {store.observations.filter(o => o.zoneId === zone.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.estimatedCount || 0}<br/>
                    Capacity: {zone.capacity}<br/>
                    Trend: {risk.trend.replace('_', ' ')}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Gates */}
            {showLayers.gates && store.gates.map(gate => (
              <CircleMarker
                key={gate.id}
                center={[gate.location.lat, gate.location.lng]}
                radius={8}
                pathOptions={{
                  color: gate.status === 'open' ? '#22c55e' : gate.status === 'restricted' ? '#eab308' : '#ef4444',
                  fillColor: gate.status === 'open' ? '#22c55e' : gate.status === 'restricted' ? '#eab308' : '#ef4444',
                  fillOpacity: 0.8,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>🚪 {gate.name}</strong><br/>
                    Type: {gate.type}<br/>
                    Status: {gate.status}<br/>
                    Inflow: {gate.currentInflow}/hr<br/>
                    Outflow: {gate.currentOutflow}/hr<br/>
                    Capacity: {gate.capacity}/hr
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Roads */}
            {showLayers.roads && store.roads.map(road => {
              const fromNode = store.graphNodes.find(n => n.id === road.fromNode);
              const toNode = store.graphNodes.find(n => n.id === road.toNode);
              if (!fromNode || !toNode) return null;
              
              const color = road.status === 'blocked' ? '#ef4444' : road.status === 'congested' ? '#f97316' : '#06b6d4';
              
              return (
                <Polyline
                  key={road.id}
                  positions={[[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]]}
                  pathOptions={{ color, weight: road.status === 'blocked' ? 4 : 2, dashArray: road.status === 'blocked' ? '10, 5' : undefined }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>🛣️ {road.name}</strong><br/>
                      Status: {road.status}<br/>
                      Congestion: {road.congestionLevel}%<br/>
                      Flow: {road.currentFlow}/{road.capacity}
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* Blocked road markers */}
            {showLayers.incidents && store.roads.filter(r => r.status === 'blocked').map(road => {
              const fromNode = store.graphNodes.find(n => n.id === road.fromNode);
              const toNode = store.graphNodes.find(n => n.id === road.toNode);
              if (!fromNode || !toNode) return null;
              const midLat = (fromNode.lat + toNode.lat) / 2;
              const midLng = (fromNode.lng + toNode.lng) / 2;
              return (
                <CircleMarker
                  key={`blocked-${road.id}`}
                  center={[midLat, midLng]}
                  radius={10}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.8 }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>⚠️ BLOCKED</strong><br/>
                      {road.name}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Layer controls */}
          <div className="absolute top-3 right-3 bg-slate-800/90 backdrop-blur rounded-lg border border-slate-700 p-2 z-[1000]">
            <p className="text-xs font-medium mb-2 text-slate-300">Layers</p>
            {Object.entries(showLayers).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 text-xs py-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => setShowLayers(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  className="rounded"
                />
                <span className="capitalize">{key}</span>
              </label>
            ))}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-800/90 backdrop-blur rounded-lg border border-slate-700 p-2 z-[1000]">
            <p className="text-xs font-medium mb-1 text-slate-300">Density</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Low</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Moderate</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> High</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Critical</span>
            </div>
          </div>
        </div>

        {/* Zone detail panel */}
        {selectedZoneData && (
          <div className="w-72 bg-slate-800 rounded-xl border border-slate-700 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{selectedZoneData.zone.name}</h3>
              <button onClick={() => setSelectedZone(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-700/50">
                <p className="text-xs text-slate-400">Risk Score</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${
                    selectedZoneData.risk.severity === 'critical' ? 'text-red-400' :
                    selectedZoneData.risk.severity === 'high' ? 'text-orange-400' :
                    selectedZoneData.risk.severity === 'moderate' ? 'text-amber-400' : 'text-green-400'
                  }`}>{selectedZoneData.risk.score}</span>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    selectedZoneData.risk.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    selectedZoneData.risk.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    selectedZoneData.risk.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
                  }`}>{selectedZoneData.risk.severity}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-700/50">
                <p className="text-xs text-slate-400">Current Crowd</p>
                <p className="text-lg font-bold">
                  {store.observations.filter(o => o.zoneId === selectedZone).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.estimatedCount || 0}
                </p>
                <p className="text-xs text-slate-400">of {selectedZoneData.zone.capacity} capacity</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-700/50">
                <p className="text-xs text-slate-400">Trend</p>
                <p className="text-sm font-medium capitalize">{selectedZoneData.risk.trend.replace('_', ' ')}</p>
                {selectedZoneData.risk.projection && (
                  <p className="text-xs text-slate-400 mt-1">
                    Projected: ~{selectedZoneData.risk.projection} people (5min)
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-700/50">
                <p className="text-xs text-slate-400 mb-2">Risk Factors</p>
                {selectedZoneData.risk.factors.map((f, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs">
                      <span>{f.name}</span>
                      <span className="text-slate-400">{Math.round(f.contribution)}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-600 rounded mt-0.5">
                      <div className="h-full bg-cyan-500 rounded" style={{ width: `${Math.min(100, f.contribution / f.weight)}%` }}></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{f.description}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-slate-700/50">
                <p className="text-xs text-slate-400">Data Source</p>
                <p className="text-xs font-medium">
                  {store.observations.filter(o => o.zoneId === selectedZone).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.source || 'N/A'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Freshness: {selectedZoneData.risk.dataFreshness}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
