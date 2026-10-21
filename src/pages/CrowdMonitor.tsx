import React, { useState } from 'react';
import { useStore } from '../store';
import { calculateRiskScore } from '../engine';
import { Camera, Upload, Monitor, TrendingUp, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function CrowdMonitor() {
  const { store, setStore } = useStore();
  const [selectedZone, setSelectedZone] = useState(store.zones[0]?.id || '');
  const [inputMode, setInputMode] = useState<'simulation' | 'video' | 'camera'>('simulation');
  const [videoStatus, setVideoStatus] = useState<'idle' | 'processing' | 'done'>('idle');

  const zone = store.zones.find(z => z.id === selectedZone);
  const observations = store.observations
    .filter(o => o.zoneId === selectedZone)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const latest = observations[observations.length - 1];
  const risk = zone ? calculateRiskScore(zone, store.observations, store.gates, store.roads, store.simulation.blockedRoads) : null;

  const chartData = observations.map(o => ({
    time: new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    count: o.estimatedCount,
    density: (o.density * 100).toFixed(2),
    confidence: (o.confidence * 100).toFixed(0)
  }));

  const handleVideoUpload = () => {
    setVideoStatus('processing');
    setTimeout(() => {
      setVideoStatus('done');
      // Add a simulated observation from "video analysis"
      if (zone) {
        const newObs = {
          id: `obs-video-${Date.now()}`,
          zoneId: zone.id,
          timestamp: new Date().toISOString(),
          estimatedCount: Math.round((latest?.estimatedCount || 1000) * (0.9 + Math.random() * 0.2)),
          density: 0,
          source: 'video' as const,
          confidence: 0.65 + Math.random() * 0.15
        };
        newObs.density = newObs.estimatedCount / zone.area;
        setStore(prev => ({
          ...prev,
          observations: [...prev.observations, newObs]
        }));
      }
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Crowd Density Monitoring</h1>
          <p className="text-xs text-slate-400">Estimate crowd levels using simulation, video analysis, or camera feeds</p>
        </div>
        <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
          {inputMode === 'simulation' ? '📊 SIMULATION' : inputMode === 'video' ? '📹 UPLOADED VIDEO' : '📷 CAMERA FEED'}
        </span>
      </div>

      {/* Input mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('simulation')}
          className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${inputMode === 'simulation' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}
        >
          <Monitor className="w-4 h-4" /> Simulation
        </button>
        <button
          onClick={() => setInputMode('video')}
          className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${inputMode === 'video' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}
        >
          <Upload className="w-4 h-4" /> Video Upload
        </button>
        <button
          onClick={() => setInputMode('camera')}
          className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${inputMode === 'camera' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}
        >
          <Camera className="w-4 h-4" /> Camera Feed
        </button>
      </div>

      {/* Zone selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Zone:</label>
        <select
          value={selectedZone}
          onChange={e => setSelectedZone(e.target.value)}
          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
        >
          {store.zones.map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>

      {/* Video/Camera mode info */}
      {inputMode === 'video' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-2">Video Analysis (Demo)</h3>
          <p className="text-xs text-slate-400 mb-3">
            Upload a sample video for crowd estimation. In this demo, the system simulates processing and generates an estimated count.
            Real implementation would use OpenCV with a person detection model (e.g., YOLO, SSD).
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleVideoUpload}
              disabled={videoStatus === 'processing'}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg text-sm font-medium"
            >
              {videoStatus === 'processing' ? '⏳ Processing...' : videoStatus === 'done' ? '✓ Processed' : '📹 Upload & Analyze Sample Video'}
            </button>
            {videoStatus === 'done' && (
              <span className="text-xs text-green-400">
                Analysis complete. New observation added from video source.
              </span>
            )}
          </div>
          <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400">
              <strong>Limitations:</strong> This demo uses simulated counts. A production system would require:
              GPU-accelerated inference, calibrated camera parameters, validated detection model,
              and proper privacy controls. Count ≠ density without area calibration.
            </p>
          </div>
        </div>
      )}

      {inputMode === 'camera' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-2">Camera Feed Integration</h3>
          <div className="p-4 bg-slate-700/50 rounded-lg text-center">
            <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No camera feeds connected</p>
            <p className="text-xs text-slate-500 mt-1">
              In production, this would connect to authorized CCTV streams via RTSP/HTTP.
              Currently showing simulation data only.
            </p>
          </div>
        </div>
      )}

      {/* Current readings */}
      {zone && latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <p className="text-xs text-slate-400">Estimated Count</p>
            <p className="text-2xl font-bold text-cyan-400">{latest.estimatedCount.toLocaleString()}</p>
            <p className="text-xs text-slate-500">people in zone</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <p className="text-xs text-slate-400">Density</p>
            <p className="text-2xl font-bold">{latest.density.toFixed(2)}</p>
            <p className="text-xs text-slate-500">people/m²</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <p className="text-xs text-slate-400">Capacity Usage</p>
            <p className="text-2xl font-bold">{((latest.estimatedCount / zone.capacity) * 100).toFixed(0)}%</p>
            <p className="text-xs text-slate-500">of {zone.capacity}</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <p className="text-xs text-slate-400">Confidence</p>
            <p className="text-2xl font-bold">{(latest.confidence * 100).toFixed(0)}%</p>
            <p className="text-xs text-slate-500">source: {latest.source}</p>
          </div>
        </div>
      )}

      {/* Trend chart */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Crowd Count Trend — {zone?.name}
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} name="People Count" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Risk assessment */}
      {risk && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
            CrowdPulse Risk Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold border ${
                  risk.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  risk.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                  risk.severity === 'moderate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-green-500/10 text-green-400 border-green-500/30'
                }`}>
                  {risk.score}
                </div>
                <div>
                  <p className={`text-sm font-medium capitalize ${
                    risk.severity === 'critical' ? 'text-red-400' :
                    risk.severity === 'high' ? 'text-orange-400' :
                    risk.severity === 'moderate' ? 'text-amber-400' : 'text-green-400'
                  }`}>{risk.severity} risk</p>
                  <p className="text-xs text-slate-400">Trend: {risk.trend.replace('_', ' ')}</p>
                  <p className="text-xs text-slate-400">Data: {risk.dataFreshness}</p>
                </div>
              </div>
              {risk.projection && (
                <div className="p-2 bg-slate-700/50 rounded text-xs">
                  <p className="text-slate-400">5-min projection: ~{risk.projection} people</p>
                  <p className="text-slate-500">Based on linear trend extrapolation. Uncertainty increases with time.</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {risk.factors.map((f, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{f.name} (w: {(f.weight * 100).toFixed(0)}%)</span>
                    <span className="text-slate-400">+{f.contribution.toFixed(1)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded mt-0.5">
                    <div className="h-full bg-cyan-500 rounded" style={{ width: `${Math.min(100, f.contribution / f.weight)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Observation history table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Observation History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Count</th>
                <th className="pb-2 pr-4">Density</th>
                <th className="pb-2 pr-4">Source</th>
                <th className="pb-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {observations.slice(-10).reverse().map(obs => (
                <tr key={obs.id} className="border-b border-slate-700/50">
                  <td className="py-2 pr-4">{new Date(obs.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 pr-4">{obs.estimatedCount}</td>
                  <td className="py-2 pr-4">{obs.density.toFixed(3)}/m²</td>
                  <td className="py-2 pr-4">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      obs.source === 'simulation' ? 'bg-blue-500/20 text-blue-400' :
                      obs.source === 'video' ? 'bg-purple-500/20 text-purple-400' :
                      obs.source === 'camera' ? 'bg-green-500/20 text-green-400' :
                      'bg-slate-600 text-slate-300'
                    }`}>{obs.source}</span>
                  </td>
                  <td className="py-2">{(obs.confidence * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
