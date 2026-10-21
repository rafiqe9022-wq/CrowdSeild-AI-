import React, { useState } from 'react';
import { useStore } from '../store';
import { ClipboardList, AlertTriangle, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';

export default function Alerts() {
  const { store, setStore } = useStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const filteredAlerts = store.alerts
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => severityFilter === 'all' || a.severity === severityFilter)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const acknowledgeAlert = (alertId: string) => {
    setStore(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => a.id === alertId ? {
        ...a,
        status: 'acknowledged' as const,
        acknowledgedBy: prev.currentUser?.id,
        acknowledgedAt: new Date().toISOString()
      } : a),
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: prev.currentUser?.id || 'system',
        action: 'alert_acknowledged',
        entityType: 'alert',
        entityId: alertId,
        details: `Alert acknowledged by ${prev.currentUser?.displayName || 'operator'}`
      }]
    }));
  };

  const resolveAlert = (alertId: string) => {
    setStore(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => a.id === alertId ? {
        ...a,
        status: 'resolved' as const,
        resolvedAt: new Date().toISOString(),
        resolutionNotes: resolutionNote || 'Resolved by operator'
      } : a),
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: prev.currentUser?.id || 'system',
        action: 'alert_resolved',
        entityType: 'alert',
        entityId: alertId,
        details: `Alert resolved. Notes: ${resolutionNote || 'Resolved by operator'}`
      }]
    }));
    setSelectedAlert(null);
    setResolutionNote('');
  };

  const selectedAlertData = store.alerts.find(a => a.id === selectedAlert);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-cyan-400" />
          Alerts & Incident Management
        </h1>
        <p className="text-xs text-slate-400">Review, acknowledge, and resolve alerts with full audit trail</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Status:</span>
          {(['all', 'active', 'acknowledged', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs capitalize ${filter === f ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">Severity:</span>
          {(['all', 'critical', 'warning', 'info'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1 rounded text-xs capitalize ${severityFilter === s ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filteredAlerts.length} alerts</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Alert list */}
        <div className="lg:col-span-2 space-y-2">
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => setSelectedAlert(alert.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedAlert === alert.id 
                  ? 'bg-slate-700/50 border-cyan-500/50' 
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`}></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium">{alert.title}</h3>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${
                      alert.status === 'active' ? 'bg-red-500/20 text-red-400' :
                      alert.status === 'acknowledged' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{alert.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(alert.timestamp).toLocaleString()}</span>
                    <span className="px-1.5 py-0.5 bg-slate-700 rounded">{alert.dataSource}</span>
                    <span className="capitalize">{alert.category.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredAlerts.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p>No alerts matching the current filters</p>
            </div>
          )}
        </div>

        {/* Alert detail */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          {selectedAlertData ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">{selectedAlertData.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedAlertData.description}</p>
              </div>

              <div className="space-y-2">
                <div className="p-2 bg-slate-700/50 rounded">
                  <p className="text-xs text-slate-400">Evidence</p>
                  <p className="text-xs mt-1">{selectedAlertData.evidence}</p>
                </div>
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                  <p className="text-xs text-cyan-400">Recommended Action</p>
                  <p className="text-xs mt-1">{selectedAlertData.recommendation}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-slate-400">Severity</p>
                    <p className="capitalize font-medium">{selectedAlertData.severity}</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-slate-400">Status</p>
                    <p className="capitalize font-medium">{selectedAlertData.status}</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-slate-400">Source</p>
                    <p className="font-medium">{selectedAlertData.dataSource}</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-slate-400">Created</p>
                    <p className="font-medium">{new Date(selectedAlertData.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                {selectedAlertData.acknowledgedAt && (
                  <div className="p-2 bg-slate-700/50 rounded text-xs">
                    <p className="text-slate-400">Acknowledged</p>
                    <p>{new Date(selectedAlertData.acknowledgedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 border-t border-slate-700 pt-3">
                {selectedAlertData.status === 'active' && (
                  <button
                    onClick={() => acknowledgeAlert(selectedAlertData.id)}
                    className="w-full px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Acknowledge Alert
                  </button>
                )}
                {(selectedAlertData.status === 'acknowledged' || selectedAlertData.status === 'active') && (
                  <>
                    <textarea
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      placeholder="Resolution notes..."
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-xs resize-none h-16"
                    />
                    <button
                      onClick={() => resolveAlert(selectedAlertData.id)}
                      className="w-full px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Resolve Alert
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm">Select an alert to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Incident playbooks */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Response Playbooks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { title: 'High-Density Gate', steps: ['Verify density readings', 'Check alternative gates capacity', 'Notify gate staff', 'Activate diversion signage', 'Monitor for 10 minutes'] },
            { title: 'Blocked Pedestrian Exit', steps: ['Confirm blockage location', 'Identify alternative exits', 'Deploy staff to redirect crowd', 'Clear obstruction if safe', 'Update route recommendations'] },
            { title: 'Sudden Traffic Congestion', steps: ['Check for incidents/accidents', 'Adjust signal timing', 'Activate diversion routes', 'Notify traffic officers', 'Monitor flow recovery'] },
            { title: 'Ambulance Corridor Obstruction', steps: ['Verify emergency vehicle location', 'Clear corridor immediately', 'Redirect non-emergency traffic', 'Coordinate with medical team', 'Document response time'] },
            { title: 'Monitoring System Failure', steps: ['Switch to backup data source', 'Increase manual patrols', 'Notify technical team', 'Flag data as unreliable', 'Resume normal ops when restored'] },
          ].map((playbook, i) => (
            <div key={i} className="p-3 bg-slate-700/30 rounded-lg border border-slate-700">
              <h4 className="text-xs font-semibold text-cyan-400 mb-2">{playbook.title}</h4>
              <ol className="space-y-1">
                {playbook.steps.map((step, j) => (
                  <li key={j} className="text-[11px] text-slate-400 flex gap-1">
                    <span className="text-slate-500">{j + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-400 mt-3">
          ⚠️ Actual emergency procedures must follow the event's approved safety plan and instructions from responsible authorities.
        </p>
      </div>
    </div>
  );
}
