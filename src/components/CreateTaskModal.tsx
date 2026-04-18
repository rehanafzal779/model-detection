import React, { useState, useRef } from 'react';
import { 
  X, 
  MapPin, 
  AlertTriangle, 
  Loader2, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle,
  Navigation,
  RefreshCw,
  PartyPopper
} from 'lucide-react';
import reportService from '../services/reportService';
import apiClient from '../services/api';

interface Worker {
  id:  string;
  name: string;
  zone: string;
  active: boolean;
}

interface CreateTaskModalProps {
  worker: Worker | null;
  workers: Worker[];
  onClose: () => void;
  onCreate: () => void;
}

export function CreateTaskModal({ worker, workers, onClose, onCreate }: CreateTaskModalProps) {
  const [formData, setFormData] = useState({
    workerId: worker?.id || '',
    location: '',
    zone: worker?.zone || '',
    wasteType: 'General',
    description:  '',
    priority:  'Medium'
  });

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ✅ Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);

  /**
   * Get address from coordinates using BACKEND API
   */
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      console.log(`📍 Geocoding via backend:  ${lat}, ${lng}`);
      
      const response = await apiClient.get('/reports/geocode/', {
        params: { lat, lng }
      });

      if (response. data?. success && response.data?. data?. address) {
        const address = response.data.data.address;
        console.log(`✅ Got address: ${address}`);
        return address;
      }
    } catch (error) {
      console.warn('⚠️ Backend geocoding failed, trying fallback... ', error);
    }

    return getApproximateArea(lat, lng);
  };

  /**
   * Get approximate area name (offline fallback)
   */
  const getApproximateArea = (lat: number, lng: number): string => {
    // Pakistan - Faisalabad
    if (lat >= 31.3 && lat <= 31.9 && lng >= 73.0 && lng <= 74.3) {
      if (lat >= 31.45 && lat <= 31.50 && lng >= 73.08 && lng <= 73.15) {
        return 'Madina Town, Faisalabad, 38000';
      }
      if (lat >= 31.41 && lat <= 31.43 && lng >= 73.08 && lng <= 73.10) {
        return 'D Ground, Faisalabad, 38000';
      }
      if (lat >= 31.43 && lat <= 31.47 && lng >= 73.05 && lng <= 73.10) {
        return 'Peoples Colony, Faisalabad, 38000';
      }
      return 'Faisalabad, Punjab, 38000';
    }

    // Pakistan - Islamabad
    if (lat >= 33.5 && lat <= 33.9 && lng >= 72.7 && lng <= 73.3) {
      if (lat >= 33.68 && lat <= 33.72 && lng >= 73.03 && lng <= 73.08) {
        return 'Srinagar Highway, G-9, Islamabad, 44000';
      }
      return 'Islamabad, ICT, 44000';
    }

    // Pakistan - Lahore
    if (lat >= 31.3 && lat <= 31.8 && lng >= 74.1 && lng <= 74.6) {
      return 'Lahore, Punjab, 54000';
    }

    // USA - New York
    if (lat >= 40.5 && lat <= 41.0 && lng >= -74.5 && lng <= -73.5) {
      if (lat >= 40.71 && lat <= 40.72 && lng >= -74.01 && lng <= -74.00) {
        return 'New York City Hall, 260 Broadway, Tribeca, New York';
      }
      return 'Manhattan, New York, NY 10001';
    }

    return `Location (${lat. toFixed(4)}, ${lng.toFixed(4)})`;
  };

  /**
   * Get zone from coordinates
   */
  const getZoneFromCoordinates = (lat: number, lng:  number): string => {
    if (lat >= 31.0 && lat <= 35.0 && lng >= 70.0 && lng <= 75.0) {
      if (lat > 33.5) return 'North District';
      if (lat < 31.5) return 'South District';
      if (lng > 74.0) return 'East District';
      if (lng < 73.0) return 'West District';
      return 'Central';
    }

    if (lat > 40.78) return 'North District';
    if (lat < 40.72) return 'South District';
    if (lng > -73.98) return 'East District';
    if (lng < -74.02) return 'West District';
    return 'Central';
  };

  /**
   * Get current GPS location and convert to address
   */
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords. latitude;
        const lng = position.coords.longitude;

        console.log(`📍 Got GPS coordinates: ${lat}, ${lng}`);
        setCoordinates({ lat, lng });

        setIsGeocodingLocation(true);

        try {
          const address = await getAddressFromCoordinates(lat, lng);
          
          setFormData(prev => ({
            ...prev,
            location: address
          }));

          const zone = getZoneFromCoordinates(lat, lng);
          setFormData(prev => ({
            ...prev,
            zone:  zone
          }));

        } catch (err) {
          console. error('❌ Failed to get address:', err);
          setLocationError('Could not get address. Please enter manually.');
        } finally {
          setIsGettingLocation(false);
          setIsGeocodingLocation(false);
        }
      },
      (geoError) => {
        console.error('❌ Geolocation error:', geoError);
        setIsGettingLocation(false);

        switch (geoError. code) {
          case geoError.PERMISSION_DENIED: 
            setLocationError('Location permission denied. Please enter address manually.');
            break;
          case geoError.POSITION_UNAVAILABLE: 
            setLocationError('Location unavailable. Please enter address manually.');
            break;
          case geoError. TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default: 
            setLocationError('Unable to get location. Please enter address manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const geocodeAddress = async (address: string) => {
    if (!address || address.length < 5) return;
    console.log(`📍 Address entered: ${address}`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      if (! file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader. readAsDataURL(file);
      setError('');
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef. current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError('');

    try {
      if (! formData.location. trim()) throw new Error('Location is required');
      if (!formData.description.trim()) throw new Error('Description is required');
      if (!formData.zone) throw new Error('Zone is required');

      const wasteTypeMap:  Record<string, string> = {
        'General': 'general',
        'Organic': 'organic',
        'Recyclable': 'recyclable',
        'Hazardous':  'hazardous'
      };

      const lat = coordinates?. lat || 40.7128;
      const lng = coordinates?.lng || -74.0060;

      console.log(`📍 Creating task at:  ${lat}, ${lng}`);
      console.log(`📍 Location: ${formData. location}`);

      let createResponse;

      if (imageFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('citizen_id', '1');
        formDataToSend.append('waste_type', wasteTypeMap[formData.wasteType] || 'general');
        formDataToSend.append('latitude', lat. toString());
        formDataToSend.append('longitude', lng. toString());
        formDataToSend. append('image_before', imageFile);

        createResponse = await reportService.createReport(formDataToSend);
      } else {
        const reportData = {
          citizen_id: 1,
          waste_type: wasteTypeMap[formData. wasteType] || 'general',
          latitude: lat,
          longitude: lng,
          image_before: 'https://images.unsplash. com/photo-1532996122724-e3c354a0b15b?w=400'
        };

        createResponse = await reportService.createReport(reportData);
      }

      let reportId: string | null = null;

      if (createResponse?. data?.report_id) {
        reportId = createResponse.data.report_id. toString();
      } else if (createResponse?.report_id) {
        reportId = createResponse.report_id.toString();
      }

      if (! reportId) {
        throw new Error('No report ID returned from server');
      }

      console.log(`✅ Report created:  #${reportId}`);

      if (formData.workerId) {
        console.log(`📌 Assigning to worker ${formData.workerId}`);
        await reportService.assignWorker(reportId, formData.workerId);
        console.log('✅ Worker assigned');
      }

      // ✅ Show success dialog
      setCreatedReportId(reportId);
      setShowSuccess(true);
      setLoading(false);

      // Auto close after 3 seconds
      setTimeout(() => {
        onCreate();
      }, 3000);

    } catch (err:  any) {
      console.error('❌ Failed to create task:', err);

      let errorMessage = 'Failed to create task.  Please try again.';

      if (err. response?.data) {
        const data = err.response. data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data. error) {
          errorMessage = data.error;
        } else if (data. message) {
          errorMessage = data. message;
        } else if (data. detail) {
          errorMessage = data. detail;
        } else if (typeof data === 'object') {
          const firstError = Object.entries(data)[0];
          if (firstError) {
            const [field, message] = firstError;
            const msg = Array.isArray(message) ? message[0] : message;
            errorMessage = `${field}: ${msg}`;
          }
        }
      } else if (err. message) {
        errorMessage = err. message;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const selectedWorker = workers. find(w => w.id === formData.workerId);

  // ✅ SUCCESS DIALOG
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg animate-fade-in">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700 rounded-3xl max-w-md w-full p-10 text-center animate-success-pop shadow-2xl shadow-slate-950/80">
          {/* Success Icon - Premium */}
          <div className="relative mx-auto w-28 h-28 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full blur-3xl opacity-40 animate-pulse" style={{animationDuration: '3s'}}></div>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full blur-xl opacity-20 animate-ping-slow"></div>
            <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 border-4 border-emerald-400/30">
              <CheckCircle className="w-14 h-14 text-white drop-shadow-lg" />
            </div>
          </div>

          {/* Success Message - Professional */}
          <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Task Created Successfully!</h2>
          <p className="text-slate-300 mb-8 font-medium leading-relaxed">
            Your cleaning task has been successfully submitted and assigned to the worker.
          </p>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 rounded-full mb-8">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-emerald-300\">Task Status: Active & Assigned</span>
          </div>

          {/* Report Details - Premium Card */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-8 text-left backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-700/50">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-lg border border-emerald-500/30">
                <PartyPopper className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-base font-bold text-white">Task Overview</span>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <span className="text-slate-400 font-semibold">Report ID</span>
                <span className="text-emerald-300 font-mono font-bold text-base">#{createdReportId}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <span className="text-slate-400 font-semibold">Location</span>
                <span className="text-white font-medium truncate ml-2 max-w-[180px]">{formData.location}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <span className="text-slate-400 font-semibold">Waste Type</span>
                <span className="text-white font-medium bg-teal-500/20 px-3 py-1 rounded-lg">{formData.wasteType}</span>
              </div>
              {selectedWorker && (
                <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <span className="text-slate-400 font-semibold">Assigned To</span>
                  <span className="text-white font-medium bg-emerald-500/20 px-3 py-1 rounded-lg">{selectedWorker.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <span className="text-slate-400 font-semibold">Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Active</span>
              </div>
            </div>
          </div>

          {/* Auto-close message */}
          <p className="text-xs text-slate-500 mb-6 mt-2">
            This dialog will close automatically in 3 seconds...
          </p>

          {/* Close Button - Premium */}
          <button
            onClick={onCreate}
            className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 font-bold text-lg border border-emerald-400/30 hover:border-emerald-400/60 flex items-center justify-center gap-2 group"
          >
            <span>Continue to Dashboard</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes success-pop {
            0% { 
              opacity: 0; 
              transform: scale(0.8) translateY(20px); 
            }
            50% { 
              transform: scale(1.02); 
            }
            100% { 
              opacity: 1; 
              transform: scale(1) translateY(0); 
            }
          }

          @keyframes ping-slow {
            0% {
              transform: scale(1);
              opacity: 0.3;
            }
            50% {
              transform: scale(1.3);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 0.3;
            }
          }
          
          .animate-fade-in { animation: fade-in 0.2s ease-out; }
          .animate-success-pop { animation: success-pop 0.4s ease-out; }
          .animate-ping-slow { animation: ping-slow 2s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  // ✅ MAIN FORM
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fade-in overflow-y-auto py-8">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 rounded-3xl w-full max-w-2xl shadow-2xl shadow-slate-950/80 flex flex-col max-h-[90vh] overflow-hidden flex-auto">
        {/* 🎯 ULTRA-PREMIUM HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-teal-900/30 to-slate-900 border-b border-slate-700/50 px-8 py-7 flex items-center justify-between z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4 flex-1">
            <div className="p-3.5 bg-gradient-to-br from-emerald-500/25 to-teal-600/25 rounded-xl border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <AlertTriangle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight">Create Cleaning Task</h2>
              <p className="text-xs text-slate-400 mt-1.5 font-semibold uppercase tracking-widest">Assign &amp; Manage Worker Cleanup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-3 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all duration-200 disabled:opacity-50 border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg hover:shadow-slate-700/20 group"
          >
            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
          {/* ═══════════════════════════════════════════ */}
          {/* 📷 TASK IMAGE SECTION - PREMIUM CARD */}
          {/* ═══════════════════════════════════════════ */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-lg border border-blue-500/30">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide">Task Image</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-800/70 px-3 py-1.5 rounded-full">Optional</span>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div
                  className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/30 transition-all relative group"
                  onClick={() => !imagePreview && fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage();
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-600 font-medium">Click to upload</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-xl text-blue-400 hover:text-blue-300 transition-all disabled:opacity-50 font-bold duration-200"
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-semibold">{imageFile ? 'Change Image' : 'Upload Image'}</span>
                </button>
                <p className="text-xs text-slate-500 mt-3 font-medium">Max 5MB • JPG, PNG, GIF Supported</p>
                {imageFile && (
                  <p className="text-xs text-emerald-400 mt-2.5 flex items-center gap-2 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {imageFile.name}
                  </p>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"></div>

          {/* ═══════════════════════════════════════════ */}
          {/* 👤 WORKER & LOCATION SECTION - PREMIUM CARD */}
          {/* ═══════════════════════════════════════════ */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/50 rounded-2xl p-6 space-y-6">
            {/* Worker Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-lg flex items-center justify-center text-purple-400 text-xs font-bold">1</span>
                <label className="text-sm font-black text-white uppercase tracking-wider">Assign to Worker</label>
                <span className="text-red-500 text-xl">*</span>
              </div>
              <select
                value={formData.workerId}
                onChange={(e) => {
                  const w = workers.find(w => w.id === e.target.value);
                  setFormData({
                    ...formData,
                    workerId: e.target.value,
                    zone: w?.zone || formData.zone
                  });
                }}
                disabled={loading}
                className="w-full px-5 py-3.5 bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/30 appearance-none cursor-pointer disabled:opacity-50 transition-all font-medium"
                required
              >
                <option value="">Select worker...</option>
                {workers.filter(w => w.active).map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} - {w.zone}
                  </option>
                ))}
              </select>
              {selectedWorker && (
                <p className="text-xs text-emerald-400 mt-3 flex items-center gap-2 font-semibold">
                  <div className="w-4 h-4 bg-emerald-500/20 rounded-full border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle className="w-2.5 h-2.5" />
                  </div>
                  Zone: <span className="font-bold text-emerald-300">{selectedWorker.zone}</span>
                </p>
              )}
            </div>

            {/* Location with GPS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 bg-gradient-to-br from-orange-500/30 to-red-600/30 rounded-lg flex items-center justify-center text-orange-400 text-xs font-bold">2</span>
                <label className="text-sm font-black text-white uppercase tracking-wider">Location</label>
                <span className="text-red-500 text-xl">*</span>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={loading || isGettingLocation || isGeocodingLocation}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3.5 
                             bg-gradient-to-r from-green-500/20 to-emerald-600/20 hover:from-green-500/30 hover:to-emerald-600/30
                             border border-green-500/40 hover:border-green-500/60
                             text-green-400 hover:text-green-300
                             rounded-xl transition-all duration-200
                             disabled:opacity-50 font-bold shadow-lg shadow-green-500/10"
                >
                  {isGettingLocation || isGeocodingLocation ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{isGettingLocation ? 'Getting GPS...' : 'Getting address...'}</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      <span>Use Current Location</span>
                    </>
                  )}
                </button>

                {locationError && (
                  <p className="text-xs text-amber-400 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    {locationError}
                  </p>
                )}

                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    onBlur={(e) => geocodeAddress(e.target.value)}
                    disabled={loading}
                    className="w-full pl-12 pr-5 py-3.5 bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/30 transition-all disabled:opacity-50 font-medium"
                    placeholder="e.g., Madina Town, Faisalabad, 38000"
                    required
                  />
                </div>

                {coordinates && (
                  <p className="text-xs text-emerald-400 mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    GPS: <span className="font-mono text-emerald-300">{coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"></div>

          {/* ═══════════════════════════════════════════ */}
          {/* 📋 TASK DETAILS SECTION - PREMIUM CARD */}
          {/* ═══════════════════════════════════════════ */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/50 rounded-2xl p-6 space-y-6">
            {/* Zone & Waste Type Grid */}
            <div className="grid grid-cols-2 gap-5">
              {/* Zone */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 bg-gradient-to-br from-indigo-500/30 to-blue-600/30 rounded-lg flex items-center justify-center text-indigo-400 text-xs font-bold">3</span>
                  <label className="text-sm font-black text-white uppercase tracking-wider">Zone</label>
                  <span className="text-red-500 text-xl">*</span>
                </div>
                <select
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  disabled={loading}
                  className="w-full px-5 py-3.5 bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30 appearance-none cursor-pointer disabled:opacity-50 transition-all font-medium"
                  required
                >
                  <option value="">Select Zone...</option>
                  <option value="North District">North District</option>
                  <option value="South District">South District</option>
                  <option value="East District">East District</option>
                  <option value="West District">West District</option>
                  <option value="Central">Central</option>
                </select>
              </div>

              {/* Waste Type */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 bg-gradient-to-br from-cyan-500/30 to-teal-600/30 rounded-lg flex items-center justify-center text-cyan-400 text-xs font-bold">4</span>
                  <label className="text-sm font-black text-white uppercase tracking-wider">Waste Type</label>
                  <span className="text-red-500 text-xl">*</span>
                </div>
                <select
                  value={formData.wasteType}
                  onChange={(e) => setFormData({ ...formData, wasteType: e.target.value })}
                  disabled={loading}
                  className="w-full px-5 py-3.5 bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 rounded-xl text-white focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/30 appearance-none cursor-pointer disabled:opacity-50 transition-all font-medium"
                  required
                >
                  <option value="General">General Waste</option>
                  <option value="Organic">Organic Waste</option>
                  <option value="Recyclable">Recyclable Materials</option>
                  <option value="Hazardous">Hazardous Waste</option>
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-5 bg-gradient-to-br from-rose-500/30 to-red-600/30 rounded-lg flex items-center justify-center text-rose-400 text-xs font-bold">5</span>
                <label className="text-sm font-black text-white uppercase tracking-wider">Priority Level</label>
                <span className="text-red-500 text-xl">*</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['Low', 'Medium', 'High'].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    disabled={loading}
                    className={`px-5 py-3.5 rounded-xl border-2 font-bold transition-all duration-200 disabled:opacity-50 ${
                      formData.priority === priority
                        ? priority === 'High'
                          ? 'bg-red-500/25 border-red-500/60 text-red-300 shadow-lg shadow-red-500/30'
                          : priority === 'Medium'
                          ? 'bg-yellow-500/25 border-yellow-500/60 text-yellow-300 shadow-lg shadow-yellow-500/30'
                          : 'bg-green-500/25 border-green-500/60 text-green-300 shadow-lg shadow-green-500/30'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:bg-slate-800/70'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 bg-gradient-to-br from-violet-500/30 to-purple-600/30 rounded-lg flex items-center justify-center text-violet-400 text-xs font-bold">6</span>
                <label className="text-sm font-black text-white uppercase tracking-wider">Description</label>
                <span className="text-red-500 text-xl">*</span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
                rows={4}
                className="w-full px-5 py-3.5 bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/30 transition-all resize-none disabled:opacity-50 font-medium"
                placeholder="Describe the cleanup task in detail, including any specific requirements..."
                required
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"></div>

          {/* Hazardous Warning */}
          {formData.wasteType === 'Hazardous' && (
            <div className="bg-gradient-to-r from-red-500/15 to-rose-600/15 border border-red-500/40 rounded-2xl p-5 flex items-start gap-4 animate-slide-down backdrop-blur-md shadow-lg shadow-red-500/10">
              <div className="p-2.5 bg-red-500/20 rounded-lg border border-red-500/30 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-red-300 uppercase tracking-wide">⚠️ Hazardous Waste Task</p>
                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-medium">
                  Ensure the assigned worker has <span className="text-red-400 font-bold">proper safety equipment</span> and <span className="text-red-400 font-bold">specialized training</span> before assignment. Follow all OSHA regulations and safety protocols.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-gradient-to-r from-red-500/15 to-orange-600/15 border border-red-500/40 rounded-2xl p-5 flex items-start gap-4 animate-shake backdrop-blur-md shadow-lg shadow-red-500/10">
              <div className="p-2.5 bg-red-500/20 rounded-lg border border-red-500/30 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-red-300 uppercase tracking-wide">❌ Error Creating Task</p>
                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"></div>

          {/* ═══════════════════════════════════════════ */}
          {/* 🎯 ACTION BUTTONS - PREMIUM STYLE */}
          {/* ═══════════════════════════════════════════ */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-4 bg-slate-800/60 hover:bg-slate-800/80 border-2 border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white text-white rounded-xl transition-all duration-200 disabled:opacity-50 font-bold text-lg shadow-lg shadow-slate-950/20 hover:shadow-slate-950/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-500 text-white rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-3 font-bold text-lg border-2 border-emerald-400/40 hover:border-emerald-400/70 shadow-lg shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Task...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Create Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}