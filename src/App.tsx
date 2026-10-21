import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { StoreContext, initializeStore, loadStore, saveStore, AppStore } from './store';
import { simulateCrowdMovement, simulateTrafficFlow, generateAlerts } from './engine';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import CrowdMonitor from './pages/CrowdMonitor';
import TrafficFlow from './pages/TrafficFlow';
import RiskEngine from './pages/RiskEngine';
import RoutePlanner from './pages/RoutePlanner';
import EmergencyCorridor from './pages/EmergencyCorridor';
import SignalAdvisory from './pages/SignalAdvisory';
import ScenarioLab from './pages/ScenarioLab';
import Alerts from './pages/Alerts';
import GateManagement from './pages/GateManagement';
import { AuditLog, Reports, Help } from './pages/Utilities';

function App() {
  const [store, setStoreState] = useState<AppStore>(() => {
    const saved = loadStore();
    return saved || initializeStore();
  });

  // Persist store changes to localStorage
  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Simulation loop
  useEffect(() => {
    if (!store.simulation.running) return;

    const interval = setInterval(() => {
      setStoreState(prev => {
        // Generate new observations
        const newObs = simulateCrowdMovement(
          prev.zones,
          prev.gates,
          prev.roads,
          prev.observations,
          prev.simulation.crowdMultiplier,
          prev.simulation.outflowReduction,
          prev.simulation.blockedRoads,
          prev.simulation.closedGates
        );

        // Update road congestion
        const trafficUpdate = simulateTrafficFlow(prev.roads, prev.simulation.blockedRoads, prev.simulation.crowdMultiplier);
        const updatedRoads = prev.roads.map(r => {
          const update = trafficUpdate.find(t => t.roadId === r.id);
          if (!update) return r;
          return {
            ...r,
            currentFlow: update.flow,
            congestionLevel: update.congestion,
            status: prev.simulation.blockedRoads.includes(r.id) ? 'blocked' as const : update.congestion > 70 ? 'congested' as const : 'open' as const
          };
        });

        // Generate new alerts (limit to avoid spam)
        const newAlerts = generateAlerts(prev.zones, [...prev.observations, ...newObs], updatedRoads, prev.gates, prev.event.thresholds);
        const alertObjects = newAlerts.slice(0, 1).map((a, i) => ({
          id: `alert-sim-${Date.now()}-${i}`,
          eventId: prev.event.id,
          zoneId: a.zoneId,
          roadId: a.roadId,
          category: a.category as any,
          severity: a.severity as any,
          timestamp: new Date().toISOString(),
          title: a.title,
          description: a.description,
          evidence: a.evidence,
          recommendation: a.recommendation,
          status: 'active' as const,
          dataSource: 'simulation' as const
        }));

        // Keep observations manageable (last 200)
        const allObs = [...prev.observations, ...newObs];
        const trimmedObs = allObs.length > 200 ? allObs.slice(-200) : allObs;

        return {
          ...prev,
          observations: trimmedObs,
          roads: updatedRoads,
          alerts: [...alertObjects, ...prev.alerts].slice(0, 50),
          simulation: {
            ...prev.simulation,
            currentTime: new Date().toISOString()
          }
        };
      });
    }, 3000 / store.simulation.speed);

    return () => clearInterval(interval);
  }, [store.simulation.running, store.simulation.speed]);

  const setStore = (updater: (prev: AppStore) => AppStore) => {
    setStoreState(prev => updater(prev));
  };

  return (
    <StoreContext.Provider value={{ store, setStore }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            store.currentUser ? <Navigate to="/dashboard" replace /> : <Login />
          } />
          
          <Route path="/" element={
            store.currentUser ? <Layout /> : <Navigate to="/login" replace />
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="map" element={<MapPage />} />
            <Route path="crowd" element={<CrowdMonitor />} />
            <Route path="traffic" element={<TrafficFlow />} />
            <Route path="risk" element={<RiskEngine />} />
            <Route path="routes" element={<RoutePlanner />} />
            <Route path="emergency" element={<EmergencyCorridor />} />
            <Route path="signals" element={<SignalAdvisory />} />
            <Route path="scenario" element={<ScenarioLab />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="gates" element={<GateManagement />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="reports" element={<Reports />} />
            <Route path="help" element={<Help />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreContext.Provider>
  );
}

export default App;
