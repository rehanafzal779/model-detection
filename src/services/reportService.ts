import apiClient from './api';
import { Report, ReportStatus } from '../types';

// ============================================
// BACKEND RESPONSE TYPES
// ============================================

interface BackendReport {
  report_id: number;
  citizen_id: number;
  citizen_name: string;
  worker_id: number | null;
  worker_name: string | null;
  status: string;
  ai_result: string;
  waste_type: string | null;
  ai_confidence: string | null;
  latitude: string | null;
  longitude: string | null;
  location:  string;
  image_before: string;
  image_after: string | null;
  submitted_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
}

interface ReportsResponse {
  success: boolean;
  count: number;
  results?:  BackendReport[];
  data?: BackendReport[];
}

interface ReportFilters {
  status?: string;
  worker_id?: string;
  waste_type?: string;
  search?:  string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

interface GeocodeResponse {
  success: boolean;
  data:  {
    address: string;
    lat: number;
    lng: number;
    provider?:  string;
    details?: {
      street?:  string;
      neighborhood?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  };
}

// ============================================
// GEOCODING CACHE
// ============================================
const locationCache = new Map<string, string>();

// ============================================
// REPORT SERVICE
// ============================================

class ReportService {
  /**
   * Get exact location from coordinates using backend geocoding API
   */
  async getExactLocation(lat: number, lng:  number): Promise<string> {
    const cacheKey = `${lat. toFixed(6)},${lng.toFixed(6)}`;

    // Check cache first
    if (locationCache.has(cacheKey)) {
      console.log(`📍 Cache hit:  ${locationCache.get(cacheKey)}`);
      return locationCache.get(cacheKey)!;
    }

    try {
      console.log(`📍 Geocoding via backend:  ${lat}, ${lng}`);
      
      const response = await apiClient.get<GeocodeResponse>('/reports/geocode/', {
        params:  { lat, lng }
      });

      if (response.data?. success && response.data?. data?. address) {
        const address = response. data.data.address;
        locationCache.set(cacheKey, address);
        console.log(`✅ Geocoded:  ${address} (via ${response.data.data.provider})`);
        return address;
      }
    } catch (error) {
      console. warn(`⚠️ Backend geocoding failed for ${lat}, ${lng}`, error);
    }

    // Fallback to approximate location
    const fallback = this.getApproximateArea(lat, lng);
    locationCache. set(cacheKey, fallback);
    return fallback;
  }

  /**
   * Get approximate area name (offline fallback)
   */
  private getApproximateArea(lat: number, lng: number): string {
    // Pakistan - Faisalabad
    if (lat >= 31.3 && lat <= 31.9 && lng >= 73.0 && lng <= 74.3) {
      if (lat >= 31.7) return 'North Faisalabad, Punjab';
      if (lat <= 31.5) return 'South Faisalabad, Punjab';
      if (lng >= 74.0) return 'East Faisalabad, Punjab';
      if (lng <= 73.5) return 'West Faisalabad, Punjab';
      return 'Faisalabad, Punjab';
    }

    // Pakistan - Islamabad
    if (lat >= 33.5 && lat <= 33.9 && lng >= 72.7 && lng <= 73.3) {
      return 'Islamabad, Pakistan';
    }

    // Pakistan - Lahore
    if (lat >= 31.3 && lat <= 31.8 && lng >= 74.1 && lng <= 74.6) {
      return 'Lahore, Punjab';
    }

    // Pakistan - Karachi
    if (lat >= 24.7 && lat <= 25.2 && lng >= 66.8 && lng <= 67.4) {
      return 'Karachi, Sindh';
    }

    // USA - New York (default coordinates)
    if (lat >= 40.5 && lat <= 41.0 && lng >= -74.5 && lng <= -73.5) {
      return 'New York City, USA';
    }

    return `Location (${lat. toFixed(4)}, ${lng.toFixed(4)})`;
  }

  /**
   * Generate zone from coordinates
   */
  private generateZoneFromCoordinates(lat:  number | null, lng: number | null): string {
    if (!lat || !lng) return 'Unknown Zone';

    // Pakistan zones
    if (lat >= 31.0 && lat <= 35.0 && lng >= 70.0 && lng <= 75.0) {
      if (lat > 33.5) return 'North Zone';
      if (lat < 31.5) return 'South Zone';
      if (lng > 74.0) return 'East Zone';
      if (lng < 73.0) return 'West Zone';
      return 'Central Zone';
    }

    // Default zones (NYC)
    if (lat > 40.78) return 'North Zone';
    if (lat < 40.72) return 'South Zone';
    if (lng > -73.98) return 'East Zone';
    if (lng < -74.02) return 'West Zone';
    return 'Central Zone';
  }

  /**
   * Get all reports with optional filters
   * Implements pagination to fetch ALL pages automatically
   * Geocodes locations in background after loading
   */
  async getReports(filters?: ReportFilters) {
    try {
      console.log('📋 Loading reports with pagination...');

      const allResults: BackendReport[] = [];
      let nextUrl: string | null = '/reports/';
      let pageCount = 0;
      let totalCount = 0;
      const visitedUrls = new Set<string>();
      const MAX_ITERATIONS = 1000; // Prevent infinite loops

      while (nextUrl && pageCount < MAX_ITERATIONS) {
        // Prevent revisiting same URL (infinite loop protection)
        if (visitedUrls.has(nextUrl)) {
          console.warn('⚠️ Detected circular pagination, stopping fetch');
          break;
        }
        visitedUrls.add(nextUrl);

        try {
          // Determine if nextUrl is relative or absolute
          let fetchUrl = nextUrl;
          let fetchParams = pageCount === 0 ? filters : undefined; // Only add filters to first request

          // For absolute URLs from backend, use them directly (bypass baseURL)
          // For relative URLs, use as-is
          const isAbsoluteUrl = nextUrl.startsWith('http');

          console.log(`🔄 Fetching page ${pageCount + 1}: ${fetchUrl} (absolute: ${isAbsoluteUrl})`);

          const response = isAbsoluteUrl
            ? await apiClient.get<any>(fetchUrl, {
                params: fetchParams,
                baseURL: undefined  // Override baseURL for absolute URLs
              })
            : await apiClient.get<any>(fetchUrl, {
                params: fetchParams
              });

          console.log(`📥 Response received:`, {
            hasResults: !!response.data?.results,
            hasData: !!response.data?.data,
            resultsLength: response.data?.results?.length,
            dataLength: response.data?.data?.length,
            count: response.data?.count,
            hasNext: !!response.data?.next,
            nextUrl: response.data?.next
          });

          // Extract results array from various possible response structures
          let pageResults: BackendReport[] = [];
          if (response.data?.results && Array.isArray(response.data.results)) {
            pageResults = response.data.results;
            console.log(`✓ Using response.data.results (${pageResults.length} items)`);
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            pageResults = response.data.data;
            console.log(`✓ Using response.data.data (${pageResults.length} items)`);
          } else if (Array.isArray(response.data)) {
            pageResults = response.data;
            console.log(`✓ Using response.data directly (${pageResults.length} items)`);
          }

          allResults.push(...pageResults);
          totalCount = response.data?.count || allResults.length;

          // Get next URL for next iteration
          nextUrl = response.data?.next || null;
          pageCount++;

          console.log(`✅ Page ${pageCount} loaded: ${pageResults.length} reports, Total so far: ${allResults.length}`);
          console.log(`📍 Next URL: ${nextUrl || 'NULL (no more pages)'}`);
          console.log(`📊 Response structure:`, {
            hasResults: !!response.data?.results,
            hasData: !!response.data?.data,
            hasNext: !!response.data?.next,
            count: response.data?.count,
            nextValue: response.data?.next
          });

        } catch (pageError: any) {
          console.error(`❌ Error fetching page ${pageCount + 1}:`, pageError.message);
          // Continue with accumulated results rather than failing completely
          nextUrl = null;
        }
      }

      if (pageCount >= MAX_ITERATIONS) {
        console.warn('⚠️ Reached maximum pagination iterations');
      }

      console.log(`📦 Processing ${allResults.length} total reports...`);

      // Transform all accumulated reports (fast - uses cache/fallback for locations)
      const transformedData: Report[] = allResults.map((report: BackendReport) => {
        const lat = report.latitude ? parseFloat(report.latitude) : null;
        const lng = report.longitude ? parseFloat(report.longitude) : null;
        const zone = this.generateZoneFromCoordinates(lat, lng);

        // Use existing location or check cache
        let location = report.location || 'Unknown Location';

        if (lat && lng) {
          const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
          if (locationCache.has(cacheKey)) {
            location = locationCache.get(cacheKey)!;
          } else if (!report.location || report.location === 'Unknown Location' || report.location.trim() === '') {
            // Use fallback for now, geocode in background
            location = this.getApproximateArea(lat, lng);
          }
        }

        return {
          id: String(report.report_id),
          citizenName: report.citizen_name,
          citizenId: String(report.citizen_id),
          workerName: report.worker_name || undefined,
          workerId: report.worker_id ? String(report.worker_id) : undefined,
          location: location,
          zone: zone,
          status: report.status as ReportStatus,
          submittedAt: new Date(report.submitted_at),
          assignedAt: report.assigned_at ? new Date(report.assigned_at) : undefined,
          resolvedAt: report.resolved_at ? new Date(report.resolved_at) : undefined,
          wasteType: report.waste_type as any,
          aiVerification: {
            verified: report.ai_result === 'Waste',
            confidence: report.ai_confidence ? parseFloat(report.ai_confidence) * 100 : 0,
            classification: report.waste_type as any
          },
          description: `${report.waste_type || 'Waste'} reported at ${location}`,
          beforeImage: report.image_before,
          afterImage: report.image_after || undefined,
          aiVerifiedImage: report.ai_image || undefined,
          urgency: calculateUrgency(report),
          lat: lat || 40.7128,
          lng: lng || -74.0060
        };
      });

      console.log(`✅ Successfully loaded and transformed ${transformedData.length} reports from ${pageCount} pages`);

      // Geocode reports in background (non-blocking)
      this.geocodeReportsInBackground(transformedData);

      return {
        success: true,
        data: transformedData,
        count: totalCount,
        pagesFetched: pageCount
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch reports:', error);
      throw error;
    }
  }

  /**
   * Geocode reports in background (non-blocking)
   */
  private async geocodeReportsInBackground(reports: Report[]) {
    const toGeocode = reports.filter(r => {
      if (!r.lat || !r.lng) return false;
      const cacheKey = `${r.lat. toFixed(6)},${r.lng.toFixed(6)}`;
      // Only geocode if not cached and location looks like fallback
      return ! locationCache.has(cacheKey) && 
             (r.location. includes('Zone') || r.location.startsWith('Location ('));
    });

    if (toGeocode.length === 0) return;

    console.log(`🌍 Background geocoding ${toGeocode.length} reports... `);

    // Geocode up to 5 reports in background
    for (const report of toGeocode.slice(0, 5)) {
      try {
        const address = await this.getExactLocation(report.lat, report. lng);
        report.location = address;
        report.description = `${report.wasteType || 'Waste'} reported at ${address}`;
      } catch (e) {
        // Ignore errors in background
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('✅ Background geocoding complete');
  }

  /**
   * Get single report by ID with geocoding
   */
  async getReportById(id:  string | number) {
    try {
      console.log(`📋 Fetching report #${id}`);

      const response = await apiClient. get<{ success: boolean; data:  BackendReport }>(`/reports/${id}/`);
      const report = response.data.data || response.data;

      const lat = report.latitude ? parseFloat(report.latitude) : null;
      const lng = report.longitude ?  parseFloat(report. longitude) : null;
      const zone = this.generateZoneFromCoordinates(lat, lng);

      // Get exact location for single report view
      let location = report.location || 'Unknown Location';
      
      if (lat && lng && (! report.location || report.location === 'Unknown Location')) {
        try {
          location = await this.getExactLocation(lat, lng);
        } catch (e) {
          location = this.getApproximateArea(lat, lng);
        }
      }

      const transformed:  Report = {
        id: String(report.report_id),
        citizenName: report.citizen_name,
        citizenId: String(report.citizen_id),
        workerName: report.worker_name || undefined,
        workerId:  report.worker_id ? String(report. worker_id) : undefined,
        location: location,
        zone: zone,
        status: report. status as ReportStatus,
        submittedAt: new Date(report.submitted_at),
        assignedAt: report. assigned_at ? new Date(report.assigned_at) : undefined,
        resolvedAt: report.resolved_at ? new Date(report.resolved_at) : undefined,
        wasteType: report.waste_type as any,
        aiVerification:  {
          verified:  report.ai_result === 'Waste',
          confidence:  report.ai_confidence ? parseFloat(report.ai_confidence) * 100 :  0,
          classification: report.waste_type as any
        },
        description: `${report.waste_type || 'Waste'} reported at ${location}`,
        beforeImage: report.image_before,
        afterImage: report.image_after || undefined,
        urgency:  calculateUrgency(report),
        lat: lat || 40.7128,
        lng: lng || -74.0060
      };

      console.log('✅ Report fetched:', transformed. location);
      return { success: true, data: transformed };
    } catch (error) {
      console. error(`❌ Failed to fetch report ${id}:`, error);
      throw error;
    }
  }

  /**
   * Assign worker to report
   */
  async assignWorker(reportId:  string | number, workerId: string | number) {
    try {
      console. log(`📌 Assigning worker ${workerId} to report ${reportId}`);

      const workerIdNumber = Number(workerId);

      if (isNaN(workerIdNumber)) {
        throw new Error(`Invalid worker ID: ${workerId}`);
      }

      const response = await apiClient. post(`/reports/${reportId}/assign/`, {
        worker_id: workerIdNumber
      });

      console.log('✅ Worker assigned successfully');
      return response.data;
    } catch (error:  any) {
      console.error('❌ Failed to assign worker:', error);
      const errorMsg = error.response?. data?.error || error.response?.data?.message || 'Failed to assign worker';
      throw new Error(errorMsg);
    }
  }

  /**
   * Update report status
   */
  async updateStatus(reportId: string | number, status:  ReportStatus) {
    try {
      console.log(`🔄 Updating report ${reportId} status to ${status}`);

      const response = await apiClient. patch(`/reports/${reportId}/update_status/`, {
        status
      });

      console.log('✅ Status updated successfully');
      return response. data;
    } catch (error: any) {
      console.error('❌ Failed to update status:', error);
      throw error;
    }
  }

  /**
   * Get report statistics
   */
  async getStatistics() {
    try {
      const response = await apiClient.get('/reports/statistics/');
      return response.data;
    } catch (error) {
      console. error('❌ Failed to fetch statistics:', error);
      throw error;
    }
  }

  async getReportsByStatus(status: ReportStatus) {
    return this.getReports({ status });
  }

  async getReportsByWorker(workerId:  string | number) {
    return this. getReports({ worker_id: String(workerId) });
  }

  async getPendingReports() {
    return this.getReports({ status: 'Pending' });
  }

  async getReportsByDateRange(dateFrom: string, dateTo: string) {
    return this.getReports({ date_from: dateFrom, date_to: dateTo });
  }

  async searchReports(query:  string) {
    return this.getReports({ search: query });
  }

  /**
   * Create new report
   */
async createReport(data: any) {
  try {
    console.log('➕ Creating new report...');

    const isFormData = data instanceof FormData;

    if (!isFormData) {
      // Ensure latitude and longitude are numbers
      if (Array.isArray(data.latitude)) data.latitude = parseFloat(data.latitude[0]);
      if (Array.isArray(data.longitude)) data.longitude = parseFloat(data.longitude[0]);

      // Truncate to 6 decimal places for Django DecimalField
      data.latitude = parseFloat(data.latitude.toFixed(8));
      data.longitude = parseFloat(data.longitude.toFixed(8));

      // Optional: clamp latitude/longitude to valid ranges
      if (data.latitude > 90) data.latitude = 90;
      if (data.latitude < -90) data.latitude = -90;
      if (data.longitude > 180) data.longitude = 180;
      if (data.longitude < -180) data.longitude = -180;
    }

    // Send request
    let response;
    if (isFormData) {
      response = await apiClient.post('/reports/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      response = await apiClient.post('/reports/', data);
    }

    console.log('✅ Report created:', response.data);
    return response.data;

  } catch (error: any) {
    console.error('❌ Failed to create report:', error);
    // Provide backend error message if available
    const msg = error.response?.data?.latitude || error.response?.data?.longitude || error.message;
    throw new Error(msg);
  }
}


  /**
   * Delete report
   */
  async deleteReport(reportId:  string | number) {
    try {
      console.log(`🗑️ Deleting report ${reportId}`);
      const response = await apiClient.delete(`/reports/${reportId}/`);
      console.log('✅ Report deleted');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to delete report:', error);
      throw error;
    }
  }

  /**
   * Get reports map data
   */
  async getReportsMapData() {
    try {
      const response = await this.getReports();
      return response.data. map(report => ({
        id: report.id,
        lat:  report.lat,
        lng:  report.lng,
        location: report. location,
        status: report.status,
        zone: report.zone,
        wasteType: report. wasteType,
        submittedAt: report.submittedAt
      }));
    } catch (error) {
      console. error('❌ Failed to fetch map data:', error);
      throw error;
    }
  }

  /**
   * Manually geocode a location (for on-demand use)
   */
  async geocodeLocation(lat: number, lng: number): Promise<string> {
    return this.getExactLocation(lat, lng);
  }

  /**
   * Clear location cache
   */
  clearLocationCache() {
    locationCache.clear();
    console.log('🗑️ Location cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return locationCache.size;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateUrgency(report: BackendReport): number {
  let urgency = 5;

  if (report.status === 'Pending') urgency += 2;

  const hoursOld = (Date.now() - new Date(report.submitted_at).getTime()) / (1000 * 60 * 60);

  if (hoursOld > 72) urgency += 3;
  else if (hoursOld > 48) urgency += 2;
  else if (hoursOld > 24) urgency += 1;

  if (report.waste_type === 'Hazardous') urgency += 3;
  else if (report.waste_type === 'Electronic') urgency += 1;

  return Math.min(urgency, 10);
}

export function formatReportStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Pending':  '⏳ Pending',
    'Assigned': '📋 Assigned',
    'In Progress': '🔄 In Progress',
    'Resolved': '✅ Resolved',
    'Rejected': '❌ Rejected'
  };
  return statusMap[status] || status;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'Pending':  '#ef4444',
    'Assigned': '#f59e0b',
    'In Progress': '#3b82f6',
    'Resolved': '#10b981',
    'Rejected': '#dc2626'
  };
  return colorMap[status] || '#6b7280';
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function getWasteTypeIcon(wasteType:  string): string {
  const iconMap:  Record<string, string> = {
    'Plastic': '♻️',
    'Organic':  '🍂',
    'Metal':  '🔩',
    'Glass':  '🥃',
    'Mixed':  '🗑️',
    'Electronic': '📱',
    'Hazardous': '⚠️'
  };
  return iconMap[wasteType] || '🗑️';
}

export default new ReportService();