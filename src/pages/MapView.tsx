import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, TrendingUp, BarChart, Eye, X, Clock, CheckCircle, AlertTriangle, Users, Navigation } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import '../leaflet-dark-theme.css';
import { Report } from '../types';
import { Worker } from '../types/worker';
import { ReportDetailModal } from '../components/ReportDetailModal';
import axios from 'axios';


interface MapViewProps {
  reports: Report[];
  workers?: Worker[];
  trendData: any[];
  onReportClick?: (report: Report) => void;
}

// Lahore geographic bounds - precise coordinates
const LAHORE_BOUNDS = {
  north: 31.6500,
  south: 31.3500,
  east: 74.5000,
  west: 74.2000
};

const LAHORE_CENTER: [number, number] = [31.5204, 74.3587];

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || (() => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalhost ? 'http://127.0.0.1:8000/api' : `http://${window.location.hostname}:8000/api`;
})();

// Get marker color based on report status
const getMarkerColor = (report: Report): string => {
  const hoursSinceSubmission = (new Date().getTime() - new Date(report.submittedAt).getTime()) / (1000 * 60 * 60);
  
  if (report.status === 'Pending' || (report.status !== 'Resolved' && hoursSinceSubmission > 48)) {
    return '#ef4444'; // Red
  }
  
  if (report.status === 'Assigned') {
    return '#f59e0b'; // Yellow/Amber
  }
  
  if (report.status === 'Resolved') {
    return '#10b981'; // Green
  }
  
  return '#6b7280'; // Gray
};

// Create custom marker icon for workers
const createWorkerMarkerIcon = (isActive: boolean = true, isTracking: boolean = false) => {
  const activeStatus = isActive ? '#3b82f6' : '#9ca3af'; // Blue if active, Gray if inactive
  const iconHtml = `
    <div style="
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, ${activeStatus} 0%, ${isTracking ? '#0ea5e9' : activeStatus} 100%);
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0, 0, 0, 0.5);
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      ${isTracking ? '<div style="position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%; animation: pulse 1s infinite;"></div>' : ''}
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>
  `;
  
  return L.divIcon({
    html: iconHtml,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: 'worker-marker'
  });
};

// Create custom marker icon for reports
const createReportMarkerIcon = (color: string) => {
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        cursor: pointer;
        transition: transform 0.2s;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    className: 'custom-marker'
  });
};

// Component to manage map bounds and initialization
function MapBoundsAdjuster({ reports, selectedZone }: { reports: Report[]; selectedZone: string }) {
  const map = useMap();
  
  useEffect(() => {
    // Small delay to ensure map is fully mounted
    const timer = setTimeout(() => {
      try {
        if (reports.length === 0) {
          map.fitBounds([
            [LAHORE_BOUNDS.south, LAHORE_BOUNDS.west],
            [LAHORE_BOUNDS.north, LAHORE_BOUNDS.east]
          ]);
          return;
        }
        
        // Collect valid report coordinates
        const validCoords: [number, number][] = reports
          .map((report: Report) => {
            const lat = report.lat || (report as any).latitude;
            const lng = report.lng || (report as any).longitude;
            
            if (!lat || !lng) return null;
            
            // Validate coordinates are in Lahore area
            if (lat >= 31.0 && lat <= 32.0 && lng >= 73.5 && lng <= 75.0) {
              return [lat, lng] as [number, number];
            }
            
            return null;
          })
          .filter((coord): coord is [number, number] => coord !== null);
        
        if (validCoords.length === 0) {
          map.fitBounds([
            [LAHORE_BOUNDS.south, LAHORE_BOUNDS.west],
            [LAHORE_BOUNDS.north, LAHORE_BOUNDS.east]
          ]);
          return;
        }
        
        // Calculate bounds with padding
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (err) {
        console.warn('Map bounds error:', err);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [reports, map, selectedZone]);
  
  return null;
}

// Individual marker component with hover/click functionality
interface MarkerComponentProps {
  report: Report;
  onHover: (report: Report | null) => void;
  onView: (report: Report) => void;
  isLoading: boolean;
}

function MarkerComponent({ report, onHover, onView, isLoading }: MarkerComponentProps) {
  const lat = report.lat || (report as any).latitude || LAHORE_CENTER[0];
  const lng = report.lng || (report as any).longitude || LAHORE_CENTER[1];
  const color = getMarkerColor(report);
  
  // Validate coordinates
  if (!lat || !lng || lat < 31.0 || lat > 32.0 || lng < 73.5 || lng > 75.0) {
    return null;
  }
  
  const hoursSinceSubmission = Math.floor((new Date().getTime() - new Date(report.submittedAt).getTime()) / (1000 * 60 * 60));
  
  return (
    <Marker
      position={[lat, lng]}
      icon={createReportMarkerIcon(color)}
      opacity={isLoading ? 0.5 : 1}
      eventHandlers={{
        mouseover: () => onHover(report),
        mouseout: () => onHover(null),
        click: () => onView(report)
      }}
    />
  );
}


export function MapView({ reports, workers = [], trendData, onReportClick }: MapViewProps) {
  const [selectedZone, setSelectedZone] = useState('All');
  const [hoveredReport, setHoveredReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localReports, setLocalReports] = useState<Report[]>(reports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showWorkers, setShowWorkers] = useState(false);

  // ✅ Fetch reports from backend on component mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Fetching reports from MapView...');
        const response = await axios.get(`${API_BASE_URL}/reports/`);
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`✅ Loaded ${response.data.length} reports for map`, response.data);
          setLocalReports(response.data);
          setSelectedZone('All');
        } else if (response.data) {
          console.log('Response data structure:', response.data);
          setLocalReports(response.data);
        }
      } catch (err: any) {
        console.error('❌ Failed to fetch reports:', err);
        
        if (err.response?.status === 401) {
          setError('🔐 Django authentication required. Add REST_FRAMEWORK = {"DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"]} to Django settings.py and restart.');
        } else {
          setError('Failed to load reports');
        }
        
        console.log('🔄 Falling back to prop reports:', reports.length, 'reports');
        setLocalReports(reports);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Update local reports when props change
  useEffect(() => {
    setLocalReports(reports);
  }, [reports]);
  
  const zones = ['All', ...Array.from(new Set(localReports.map((r: Report) => r.zone)))];
  console.log('📊 Zones available:', zones, 'Total reports:', localReports.length, 'Selected zone:', selectedZone);
  
  const zoneData = zones.slice(1).map((zone: string) => ({
    zone,
    reports: localReports.filter((r: Report) => r.zone === zone).length,
    pending: localReports.filter((r: Report) => r.zone === zone && r.status === 'Pending').length,
    resolved: localReports.filter((r: Report) => r.zone === zone && r.status === 'Resolved').length
  }));
  
  const filteredReports = selectedZone === 'All' 
    ? localReports 
    : localReports.filter((r: Report) => r.zone === selectedZone);
  
  console.log('🗺️ Filtered reports for display:', filteredReports.length, 'Zone filter:', selectedZone);
  
  const handleViewReport = async (report: Report) => {
    try {
      // Fetch full report details from backend
      const response = await axios.get(`${API_BASE_URL}/reports/${report.id}`);
      const fullReport = response.data;
      
      setSelectedReport(fullReport);
      
      if (onReportClick) {
        onReportClick(fullReport);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      // Fallback: open modal with available data
      setSelectedReport(report);
      if (onReportClick) {
        onReportClick(report);
      }
    }
  };

  const handleZoneFilterChange = async (zone: string) => {
    console.log('🎯 Zone filter changed to:', zone);
    setSelectedZone(zone);
    setLoading(true);
    
    try {
      if (zone !== 'All') {
        const zoneReports = localReports.filter((r: Report) => r.zone === zone);
        console.log(`📍 Showing ${zoneReports.length} reports for zone: ${zone}`);
      } else {
        console.log(`📍 Showing all ${localReports.length} reports`);
      }
    } catch (err) {
      setError('Failed to filter zone data');
      console.error('Error filtering zone data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Zone Filter & Worker Toggle */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <MapPin className="w-5 h-5 text-emerald-500" />
              <div className="flex-1">
                <label className="block text-sm text-slate-400 mb-2">Filter by Zone</label>
                <select
                  value={selectedZone}
                  onChange={(e) => handleZoneFilterChange(e.target.value)}
                  disabled={loading}
                  className="w-full max-w-xs px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                >
                  {zones.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Worker Tracking Toggle */}
          {workers && workers.length > 0 && (
            <button
              onClick={() => setShowWorkers(!showWorkers)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all border-2 whitespace-nowrap ${
                showWorkers
                  ? 'bg-blue-500/20 border-blue-500/60 text-blue-400 hover:bg-blue-500/30'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>{showWorkers ? 'Hide' : 'Track'} Workers ({workers.length})</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Map & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Leaflet Map */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80">
            <h3 className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              Geographic Distribution - Lahore
            </h3>
          </div>
          
          <div className="relative h-[400px] bg-slate-950">
            <MapContainer
              center={LAHORE_CENTER}
              zoom={13}
              className="w-full h-full z-0"
              style={{
                background: '#0f172a'
              }}
            >
              {/* OpenStreetMap tiles - vibrant colors */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
                opacity={0.85}
                crossOrigin="anonymous"
              />
              
              {/* CartoDB dark overlay (optional) */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_only/{z}/{x}/{y}.png"
                attribution='&copy; CartoDB'
                opacity={0.3}
                crossOrigin="anonymous"
              />
              
              {/* Map bounds adjuster */}
              <MapBoundsAdjuster reports={filteredReports} selectedZone={selectedZone} />
              
              {/* Render markers for all filtered reports */}
              {filteredReports.map((report) => (
                <MarkerComponent
                  key={report.id}
                  report={report}
                  onHover={setHoveredReport}
                  onView={handleViewReport}
                  isLoading={loading}
                />
              ))}
              
              {/* Worker Location Markers */}
              {showWorkers && workers && workers.length > 0 && workers
                .filter(worker => worker.latitude && worker.longitude)
                .map((worker) => (
                  <Marker
                    key={`worker-${worker.id}`}
                    position={[worker.latitude!, worker.longitude!]}
                    icon={createWorkerMarkerIcon(worker.active, worker.isTracking)}
                    opacity={1}
                  >
                    <Popup closeButton={true} className="worker-popup">
                      <div className="min-w-[280px] text-slate-900">
                        <h4 className="font-bold text-base mb-2">{worker.name}</h4>
                        <div className="space-y-2 text-sm mb-3">
                          <div><span className="text-slate-500">ID:</span> {worker.employeeCode}</div>
                          <div><span className="text-slate-500">Status:</span> {worker.isTracking ? '✓ Live Tracking' : 'Offline'}</div>
                          <div><span className="text-slate-500">Tasks:</span> {worker.tasksCompleted} completed</div>
                          <div><span className="text-slate-500">Rating:</span> ⭐ {worker.rating.toFixed(1)}</div>
                          {worker.lastLocationUpdate && (
                            <div><span className="text-slate-500">Last Update:</span> {new Date(worker.lastLocationUpdate).toLocaleTimeString()}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold transition-colors">
                            View Profile
                          </button>
                          <button className="flex-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-semibold transition-colors">
                            Assign Task
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))
              }
            </MapContainer>
            
            {/* Stats Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
              <div className="flex gap-2">
                <div className="px-3 py-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg">
                  <span className="text-xs text-slate-400">Red: </span>
                  <span className="text-sm font-bold text-red-400">
                    {filteredReports.filter(r => getMarkerColor(r) === '#ef4444').length}
                  </span>
                </div>
                <div className="px-3 py-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg">
                  <span className="text-xs text-slate-400">Yellow: </span>
                  <span className="text-sm font-bold text-amber-400">
                    {filteredReports.filter(r => getMarkerColor(r) === '#f59e0b').length}
                  </span>
                </div>
                <div className="px-3 py-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg">
                  <span className="text-xs text-slate-400">Green: </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {filteredReports.filter(r => getMarkerColor(r) === '#10b981').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Hover Card */}
            {hoveredReport && (
              <div 
                className="absolute top-4 right-4 pointer-events-auto z-20"
                onMouseEnter={() => setHoveredReport(hoveredReport)}
                onMouseLeave={() => setHoveredReport(null)}
              >
                <div className="bg-slate-900/98 backdrop-blur-md rounded-xl p-4 border border-slate-700 min-w-[320px] text-white shadow-2xl">
                  {/* Status Badge */}
                  <div className="mb-4">
                    <span 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold"
                      style={{ backgroundColor: `${getMarkerColor(hoveredReport)}25`, color: getMarkerColor(hoveredReport) }}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {hoveredReport.status}
                    </span>
                  </div>

                  {/* Report ID & Location */}
                  <h4 className="font-bold text-base mb-1">{hoveredReport.id}</h4>
                  <p className="text-xs text-slate-400 mb-4">📍 {hoveredReport.location}</p>

                  {/* Separator */}
                  <div className="border-t border-slate-700 my-3"></div>

                  {/* Details Grid */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Waste Type:</span>
                      <span className="font-semibold text-right">{hoveredReport.wasteType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Zone:</span>
                      <span className="font-semibold text-right">{hoveredReport.zone}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Submitted:</span>
                      <span className="font-semibold text-right">{Math.floor((new Date().getTime() - new Date(hoveredReport.submittedAt).getTime()) / (1000 * 60 * 60))}h ago</span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="border-t border-slate-700 pt-3">
                    <button
                      onClick={() => handleViewReport(hoveredReport)}
                      className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 pointer-events-auto"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Details
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50">
            <div className="space-y-3">
              <div className="font-semibold text-slate-300 text-sm mb-2">Report Status</div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
                  <span className="text-sm text-slate-300">Pending/48h+</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white"></div>
                  <span className="text-sm text-slate-300">Assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                  <span className="text-sm text-slate-300">Resolved</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Total: {filteredReports.length}</span>
                </div>
              </div>
              
              {showWorkers && workers && workers.length > 0 && (
                <>
                  <div className="border-t border-slate-700 pt-3">
                    <div className="font-semibold text-slate-300 text-sm mb-2">Worker Status</div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500 border-3 border-white shadow-lg"></div>
                      <span className="text-sm text-slate-300">Active Workers</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 rounded-full bg-cyan-500 border-3 border-white shadow-lg relative">
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 border border-white rounded-full animate-pulse"></div>
                      </div>
                      <span className="text-sm text-slate-300">Live Tracking</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Zone Analytics */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-emerald-500" />
            Zone Analytics
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="zone" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Bar dataKey="reports" fill="#10b981" />
              <Bar dataKey="pending" fill="#ef4444" />
              <Bar dataKey="resolved" fill="#06b6d4" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Hotspot Areas */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
        <h3 className="text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Hotspot Areas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {zoneData.slice(0, 4).map((zone, index) => (
            <div 
              key={zone.zone} 
              onClick={() => handleZoneFilterChange(zone.zone)}
              className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">{zone.zone}</h4>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  index === 0 ? 'bg-red-500/20 text-red-500' : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {index === 0 ? 'High' : 'Medium'}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Total: <span className="text-slate-200 font-medium">{zone.reports}</span></p>
                <p className="text-sm text-slate-400">Pending: <span className="text-red-400 font-medium">{zone.pending}</span></p>
                <p className="text-sm text-slate-400">Resolved: <span className="text-emerald-400 font-medium">{zone.resolved}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}