import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Eye, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Report, Worker, ReportStatus, WasteType } from '../types';
import reportService from '../services/reportService';
import { getErrorMessage } from '../services/api';
// adjust path if needed
interface ReportsViewProps {
  reports: Report[];
  workers:  Worker[];
  statusFilter: ReportStatus | 'All';
  setStatusFilter: (value:  ReportStatus | 'All') => void;
  workerFilter: string;
  setWorkerFilter: (value: string) => void;
  zoneFilter:  string;
  setZoneFilter: (value: string) => void;
  wasteTypeFilter:  WasteType | 'All';
  setWasteTypeFilter: (value: WasteType | 'All') => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (value: { start:  string; end: string }) => void;
  onSelectReport: (report: Report) => void;
}

export function ReportsView({
  reports,
  workers,
  statusFilter,
  setStatusFilter,
  workerFilter,
  setWorkerFilter,
  zoneFilter,
  setZoneFilter,
  wasteTypeFilter,
  setWasteTypeFilter,
  searchQuery,
  setSearchQuery,
  dateRange,
  setDateRange,
  onSelectReport
}: ReportsViewProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localReports, setLocalReports] = useState<Report[]>(reports);
  const [citizenFilter, setCitizenFilter] = useState('All');
  
  // Load all reports from backend on mount
  useEffect(() => {
    const loadAllReports = async () => {
      try {
        setLoading(true);
        console.log('📋 Loading all reports from backend...');
        const response = await reportService.getReports();
        if (response.data) {
          setLocalReports(response.data);
          console.log(`✅ Loaded ${response.data.length} total reports`);
        }
      } catch (error) {
        console.error('❌ Failed to load reports:', getErrorMessage(error));
        // Fall back to props if API fails
        setLocalReports(reports);
      } finally {
        setLoading(false);
      }
    };
    
    loadAllReports();
  }, []);
  
  // Update local reports when props change
  useEffect(() => {
    setLocalReports(reports);
  }, [reports]);

  // ✅ Refresh reports from backend
  const handleRefresh = async () => {
    try {
      setLoading(true);
      console.log('🔄 Refreshing reports from backend.. .');
      
      const response = await reportService.getReports({
        status: statusFilter !== 'All' ? statusFilter :  undefined,
        worker_id: workerFilter !== 'All' ? workerFilter : undefined,
       // zone: zoneFilter !== 'All' ? zoneFilter : undefined,
        waste_type: wasteTypeFilter !== 'All' ? wasteTypeFilter : undefined,
        search: searchQuery || undefined,
        date_from:  dateRange.start || undefined,
        date_to:  dateRange.end || undefined
      });
      
      if (response.data) {
        setLocalReports(response.data);
        console.log(`✅ Refreshed ${response.data.length} reports`);
      }
    } catch (error) {
      console.error('❌ Failed to refresh reports:', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get unique values for filters
  const uniqueWorkers = Array.from(
    new Set(
      localReports
        .map((r: Report) => r.workerName)
        .filter((name): name is string => Boolean(name))
    )
  ).sort();
  
  const uniqueZones = Array.from(
    new Set(
      localReports
        .map((r: Report) => r.zone)
        .filter((zone): zone is string => Boolean(zone))
    )
  ).sort();
  
  const uniqueWasteTypes = Array.from(
    new Set(
      localReports
        . map((r: Report) => r.wasteType)
        .filter((type): type is WasteType => Boolean(type))
    )
  ).sort();

  const uniqueCitizens = Array.from(
    new Set(
      localReports
        .map((r: Report) => r.citizenName || `Citizen #${r.citizenId}`)
        .filter((name): name is string => Boolean(name))
    )
  ).sort();
  
  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports Management</h2>
          <p className="text-slate-400 text-sm mt-1">View and manage waste collection reports</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh reports"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID or location..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-all"
          >
            <Filter className="w-4 h-4" />
            More Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800">
            <FilterSelect
              label="Citizen"
              value={citizenFilter}
              onChange={setCitizenFilter}
              options={['All', 'Admin (ID: 1)', ...uniqueCitizens]}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={['All', 'Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected']}
            />
            <FilterSelect
              label="Worker"
              value={workerFilter}
              onChange={setWorkerFilter}
              options={['All', ...uniqueWorkers]}
            />
            <FilterSelect
              label="Zone"
              value={zoneFilter}
              onChange={setZoneFilter}
              options={['All', ...uniqueZones]}
            />
            <div>
              <label className="block text-sm text-slate-400 mb-2">Date From</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Date To</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            
            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setCitizenFilter('All');
                  setWorkerFilter('All');
                  setZoneFilter('All');
                  setSearchQuery('');
                  setDateRange({ start: '', end: '' });
                }}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing <span className="text-white font-semibold">{localReports.length}</span>{' '}
          {localReports.length === 1 ? 'report' : 'reports'}
        </p>
        {(statusFilter !== 'All' || citizenFilter !== 'All' || workerFilter !== 'All' || zoneFilter !== 'All' || 
          searchQuery || dateRange.start || dateRange.end) && (
          <p className="text-xs text-emerald-400">
            ✓ Filters active
          </p>
        )}
      </div>
      
      {/* Reports Table */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Report ID</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Citizen</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Worker</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">AI Verified</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400">Loading reports...</p>
                    </div>
                  </td>
                </tr>
              ) : (() => {
                // Apply all filters
                let filtered = localReports;

                // Filter by citizen
                if (citizenFilter !== 'All') {
                  filtered = citizenFilter === 'Admin (ID: 1)'
                    ? filtered.filter(r => r.citizenId === 1 || r.citizenId === '1')
                    : filtered.filter(r => r.citizenName === citizenFilter);
                }

                // Filter by status
                if (statusFilter !== 'All') {
                  filtered = filtered.filter(r => r.status === statusFilter);
                }

                // Filter by worker
                if (workerFilter !== 'All') {
                  filtered = filtered.filter(r => r.workerName === workerFilter);
                }

                // Filter by zone
                if (zoneFilter !== 'All') {
                  filtered = filtered.filter(r => r.zone === zoneFilter);
                }

                // Filter by waste type
                if (wasteTypeFilter !== 'All') {
                  filtered = filtered.filter(r => r.wasteType === wasteTypeFilter);
                }

                // Filter by search query
                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  filtered = filtered.filter(r =>
                    r.id.toLowerCase().includes(query) ||
                    r.location.toLowerCase().includes(query)
                  );
                }

                // Filter by date range
                if (dateRange.start) {
                  const startDate = new Date(dateRange.start);
                  filtered = filtered.filter(r => r.submittedAt >= startDate);
                }
                if (dateRange.end) {
                  const endDate = new Date(dateRange.end);
                  endDate.setHours(23, 59, 59, 999);
                  filtered = filtered.filter(r => r.submittedAt <= endDate);
                }
                
                return filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-6xl">📋</div>
                        <p className="text-slate-400">No reports found</p>
                        <p className="text-slate-500 text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filtered.map((report: Report) => (
                      <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm text-white font-mono">{report.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-300">{report.citizenName}</span>
                            <span className="text-xs text-slate-500">{report.citizenId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {report.workerName ? (
                            <span className="text-sm text-slate-300">{report.workerName}</span>
                          ) : (
                            <span className="text-sm text-slate-500">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col max-w-xs">
                            <span className="text-sm text-slate-300 truncate">{report.location}</span>
                            <span className="text-xs text-slate-500">{report.zone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-400">
                              {report.submittedAt.toLocaleDateString()}
                            </span>
                            <span className="text-xs text-slate-500">
                              {report.submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {report.aiVerification.verified ? (
                            <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                {report.aiVerification.confidence.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-500">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs">Failed</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onSelectReport(report)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Info (if needed later) */}
      {localReports.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div>
            Displaying all {localReports.length} reports
          </div>
          <div className="flex gap-2">
            {/* Add pagination buttons here if needed */}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// FILTER SELECT COMPONENT
// ============================================

function FilterSelect({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label:  string; 
  value: string; 
  onChange: (value: any) => void; 
  options: string[]; 
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target. value)}
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus: outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
      >
        {options.map((opt:  string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ status }: { status: ReportStatus | string }) {
  const styles: Record<string, string> = {
    'Pending': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Assigned': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'In Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Resolved': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Rejected': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'Overdue': 'bg-red-600/20 text-red-400 border-red-600/30',
  };

  const style =
    styles[status] ||
    'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${style}`}
    >
      {status}
    </span>
  );
}
