import React, { useState } from 'react';
import { useStore } from '../store';
import { findShortestPath } from '../engine';
import { Route, MapPin, AlertCircle, CheckCircle, Navigation } from 'lucide-react';

export default function RoutePlanner() {
  const { store, setStore } = useStore();
  const [origin, setOrigin] = useState(store.graphNodes[0]?.id || '');
  const [destination, setDestination] = useState(store.graphNodes[6]?.id || '');
  const [travelMode, setTravelMode] = useState<'pedestrian' | 'vehicle' | 'both'>('pedestrian');
  const [avoidBlocked, setAvoidBlocked] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [alternativeResult, setAlternativeResult] = useState<any>(null);

  const handleCalculate = () => {
    const route = findShortestPath(store.graphNodes, store.graphEdges, origin, destination, travelMode, avoidBlocked);
    setResult(route);

    // If route found, also find alternative avoiding congested edges
    if (route) {
      const congestedEdges = store.graphEdges.filter(e => e.congestionCost > 80);
      const modifiedEdges = store.graphEdges.map(e => 
        congestedEdges.find(ce => ce.id === e.id) 
          ? { ...e, status: 'congested' as const, congestionCost: e.congestionCost * 2 }
          : e
      );
      const alt = findShortestPath(store.graphNodes, modifiedEdges, origin, destination, travelMode, avoidBlocked);
      setAlternativeResult(alt);
    }
  };

  const getNodeName = (id: string) => {
    const node = store.graphNodes.find(n => n.id === id);
    const zone = store.zones.find(z => z.id === id);
    const gate = store.gates.find(g => g.id === id);
    return zone?.name || gate?.name || node?.type || id;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Route className="w-6 h-6 text-cyan-400" />
          Intelligent Route Recommendations
        </h1>
        <p className="text-xs text-slate-400">Graph-based routing with congestion awareness and blocked-road avoidance</p>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <p className="text-xs text-slate-400 mb-3">
          Uses Dijkstra's algorithm on the event road graph. Edges store distance, travel mode, congestion cost, and closure status.
          Blocked roads are excluded from routing when avoidance is enabled.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Origin</label>
            <select value={origin} onChange={e => setOrigin(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm">
              <optgroup label="Gates">
                {store.graphNodes.filter(n => n.type === 'gate').map(n => (
                  <option key={n.id} value={n.id}>{getNodeName(n.id)}</option>
                ))}
              </optgroup>
              <optgroup label="Zones">
                {store.graphNodes.filter(n => n.type === 'zone_center').map(n => (
                  <option key={n.id} value={n.id}>{getNodeName(n.id)}</option>
                ))}
              </optgroup>
              <optgroup label="Other">
                {store.graphNodes.filter(n => n.type === 'parking' || n.type === 'emergency').map(n => (
                  <option key={n.id} value={n.id}>{getNodeName(n.id)}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Destination</label>
            <select value={destination} onChange={e => setDestination(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm">
              <optgroup label="Gates">
                {store.graphNodes.filter(n => n.type === 'gate').map(n => (
                  <option key={n.id} value={n.id}>{getNodeName(n.id)}</option>
                ))}
              </optgroup>
              <optgroup label="Zones">
                {store.graphNodes.filter(n => n.type === 'zone_center').map(n => (
                  <option key={n.id} value={n.id}>{getNodeName(n.id)}</option>
                ))}
              </optgroup>
              <optgroup label="Other">
                {store.graphNodes.filter(n => n.type === 'parking' || n.type === 'emergency').map(n => (
                  <option key={n.id} value={n.id}>{getNodeName(n.id)}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Travel Mode</label>
            <select value={travelMode} onChange={e => setTravelMode(e.target.value as any)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm">
              <option value="pedestrian">Pedestrian</option>
              <option value="vehicle">Vehicle</option>
              <option value="both">Any</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Options</label>
            <label className="flex items-center gap-2 text-sm mt-2">
              <input type="checkbox" checked={avoidBlocked} onChange={e => setAvoidBlocked(e.target.checked)} className="rounded" />
              Avoid blocked roads
            </label>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" /> Calculate Route
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Primary route */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Recommended Route
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-slate-700/50 rounded text-center">
                  <p className="text-xs text-slate-400">Distance</p>
                  <p className="text-lg font-bold">{result.distance}m</p>
                </div>
                <div className="p-2 bg-slate-700/50 rounded text-center">
                  <p className="text-xs text-slate-400">Est. Time</p>
                  <p className="text-lg font-bold">{Math.round(result.time)}s</p>
                </div>
                <div className="p-2 bg-slate-700/50 rounded text-center">
                  <p className="text-xs text-slate-400">Nodes</p>
                  <p className="text-lg font-bold">{result.path.length}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-2">Route Path:</p>
                <div className="flex flex-wrap gap-1">
                  {result.path.map((nodeId: string, i: number) => (
                    <React.Fragment key={nodeId}>
                      <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">{getNodeName(nodeId)}</span>
                      {i < result.path.length - 1 && <span className="text-slate-500">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-400">
                  <strong>Why this route:</strong> Shortest path considering current congestion levels. 
                  All edges are open and suitable for {travelMode} travel.
                </p>
              </div>

              <p className="text-xs text-slate-500">
                Source: Simulation-based graph routing. Travel times are estimated from simulated congestion, not real-time traffic data.
              </p>
            </div>
          </div>

          {/* Alternative route */}
          {alternativeResult && alternativeResult.path.join(',') !== result.path.join(',') && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Alternative Route (Lower Congestion)
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-slate-700/50 rounded text-center">
                    <p className="text-xs text-slate-400">Distance</p>
                    <p className="text-lg font-bold">{alternativeResult.distance}m</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded text-center">
                    <p className="text-xs text-slate-400">Est. Time</p>
                    <p className="text-lg font-bold">{Math.round(alternativeResult.time)}s</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded text-center">
                    <p className="text-xs text-slate-400">Nodes</p>
                    <p className="text-lg font-bold">{alternativeResult.path.length}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-2">Route Path:</p>
                  <div className="flex flex-wrap gap-1">
                    {alternativeResult.path.map((nodeId: string, i: number) => (
                      <React.Fragment key={nodeId}>
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">{getNodeName(nodeId)}</span>
                        {i < alternativeResult.path.length - 1 && <span className="text-slate-500">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-xs text-amber-400">
                    <strong>Why alternative:</strong> Avoids highly congested segments. May be longer in distance 
                    but could be faster during peak congestion.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {result === null && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <Route className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Select origin and destination, then calculate to see route recommendations</p>
        </div>
      )}

      {result === undefined && result !== null && (
        <div className="bg-slate-800 rounded-xl border border-red-500/30 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">No feasible route found</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            All paths between the selected origin and destination are blocked or unsuitable for the chosen travel mode.
            {store.simulation.blockedRoads.length > 0 && ` Currently blocked: ${store.simulation.blockedRoads.map(id => store.roads.find(r => r.id === id)?.name).join(', ')}.`}
          </p>
        </div>
      )}

      {/* Blocked roads info */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Current Road Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {store.roads.map(road => (
            <div key={road.id} className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
              road.status === 'blocked' ? 'bg-red-500/10 border border-red-500/30' :
              road.status === 'congested' ? 'bg-orange-500/10 border border-orange-500/30' :
              'bg-slate-700/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                road.status === 'blocked' ? 'bg-red-500' : road.status === 'congested' ? 'bg-orange-500' : 'bg-green-500'
              }`}></span>
              <span className="flex-1">{road.name}</span>
              <span className="capitalize text-slate-400">{road.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
