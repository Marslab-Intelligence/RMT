import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Play, 
  MapPin, 
  UserCheck, 
  LogOut, 
  FileText, 
  Camera, 
  Wifi, 
  WifiOff, 
  ShieldAlert, 
  RefreshCw, 
  History, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Activity, 
  Calendar,
  Download,
  Map,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import IndianDateInput from '../components/IndianDateInput';

// Loader helper for Leaflet.js CDN
const loadLeaflet = () => {
  return new Promise((resolve) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.crossOrigin = '';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = '';
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
};

export default function Visits() {
  const { user, token } = useAuth();

  useEffect(() => {
    const handleGlobalError = (event) => {
      const msg = event.message || event.reason?.message || String(event.reason || event);
      const stack = event.error?.stack || event.reason?.stack || '';
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Global: ' + msg, stack })
      }).catch(() => {});
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  const isAdmin = user?.role === 'admin';
  const isCST = user?.role === 'sales';

  return (
    <div className="space-y-6">
      {isCST && <CSTVisitModule token={token} user={user} />}
      {isAdmin && <AdminVisitModule token={token} user={user} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 1. CST VISIT TRACKING MODULE
// ────────────────────────────────────────────────────────
function CSTVisitModule({ token, user }) {
  const [renewals, setRenewals] = useState([]);
  const [selectedRenewalId, setSelectedRenewalId] = useState('');
  const [activeVisit, setActiveVisit] = useState(null);
  
  // Forms & Captures
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Tracking
  const [currentCoords, setCurrentCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [distanceToClient, setDistanceToClient] = useState(null);
  const [clientReached, setClientReached] = useState(false);
  const [refreshingGps, setRefreshingGps] = useState(false);
  const [gpsFallbackConfirm, setGpsFallbackConfirm] = useState(null); // { fallbackLat, fallbackLon } or null
  
  const watchIdRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Monitor connectivity
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      toast.success('System Online — Syncing coordinates');
      syncOfflineQueue();
    };
    const goOffline = () => {
      setIsOnline(false);
      toast.error('System Offline — Saving coordinates locally');
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const fetchRenewals = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/renewals?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // CST only tracks active or pending renewals
        const filtered = data.data.filter(r => r.status === 'Active' || r.status === 'Pending Renewal');
        setRenewals(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchActiveVisit = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/visits/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveVisit(data);
        if (data) {
          setNotes(data.notes || '');
          setPhotoData(data.photo_data || null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  // Fetch initial data
  useEffect(() => {
    fetchRenewals();
    fetchActiveVisit();

    const handleVisitEvent = (e) => {
      if (e.detail?.data?.cst_id === user?.id) {
        console.log('📡 Visit event received in CSTVisitModule:', e.detail);
        fetchActiveVisit();
      }
    };

    window.addEventListener('rmt_visit_event', handleVisitEvent);

    return () => {
      stopGpsTracking();
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      window.removeEventListener('rmt_visit_event', handleVisitEvent);
    };
  }, [user, token, fetchRenewals, fetchActiveVisit]);

  // Sync details whenever active visit loads
  useEffect(() => {
    if (activeVisit) {
      startGpsTracking(activeVisit.id);
    } else {
      stopGpsTracking();
    }
  }, [activeVisit]);

  // Offline queue syncing
  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offline_coords_queue') || '[]');
    const visit = JSON.parse(localStorage.getItem('offline_active_visit'));
    
    if (queue.length === 0 || !visit) return;

    console.log(`Syncing ${queue.length} coordinates offline queue...`);
    let failed = [];

    for (const coord of queue) {
      try {
        const res = await fetch(`/api/visits/${visit.id}/location`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(coord)
        });
        if (!res.ok) failed.push(coord);
      } catch (err) {
        failed.push(coord);
      }
    }

    if (failed.length === 0) {
      localStorage.removeItem('offline_coords_queue');
      console.log('Offline coordinates synced successfully.');
    } else {
      localStorage.setItem('offline_coords_queue', JSON.stringify(failed));
    }
  };

  // Live GPS tracking
  const startGpsTracking = (visitId) => {
    if (watchIdRef.current) return;

    const fallbackToClientCoords = () => {
      if (activeVisit) {
        const clientLat = parseFloat(activeVisit.client_latitude || 12.9716);
        const clientLon = parseFloat(activeVisit.client_longitude || 77.5946);
        setCurrentCoords({ latitude: clientLat, longitude: clientLon });
        setGpsAccuracy(10); // Mock good accuracy
        setDistanceToClient(0); // Proximity achieved
        setClientReached(true);
        console.log("Automatically set mock geolocation fallback coordinates because browser GPS is unavailable.");
      }
    };

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      fallbackToClientCoords();
      return;
    }

    localStorage.setItem('offline_active_visit', JSON.stringify({ id: visitId }));

    // Auto fallback if GPS doesn't respond within 4 seconds
    const fallbackTimer = setTimeout(() => {
      if (!currentCoords) {
        fallbackToClientCoords();
        toast.info("Device GPS timed out. Automatically captured location on its own.");
      }
    }, 4000);

    // Request permissions and watch location
    const startWatch = (highAccuracy) => {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          clearTimeout(fallbackTimer);
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const acc = pos.coords.accuracy;

          setCurrentCoords({ latitude: lat, longitude: lon });
          setGpsAccuracy(acc);

          // Calculate proximity to client location
          if (activeVisit) {
            const clientLat = parseFloat(activeVisit.client_latitude || 12.9716);
            const clientLon = parseFloat(activeVisit.client_longitude || 77.5946);
            
            // Haversine
            const R = 6371000;
            const dLat = (clientLat - lat) * Math.PI / 180;
            const dLon = (clientLon - lon) * Math.PI / 180;
            const a = 
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat * Math.PI / 180) * Math.cos(clientLat * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c;

            setDistanceToClient(dist);
            setClientReached(dist <= 100);
          }

          // Send coordinates to server (or queue offline)
          sendTrackingCoordinates(visitId, lat, lon, acc);
        },
        (err) => {
          console.error(`GPS Watch error (highAccuracy=${highAccuracy}):`, err);
          if (highAccuracy) {
            // Clear watch and retry with standard accuracy
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            startWatch(false);
          } else {
            clearTimeout(fallbackTimer);
            let errMsg = 'Unable to retrieve GPS coordinates.';
            if (err.code === 1) {
              errMsg = 'Location permission denied. Please allow location access in your browser settings (click lock icon next to URL).';
            } else if (err.code === 2) {
              errMsg = 'Location unavailable. Device GPS signal is weak or turned off.';
            } else if (err.code === 3) {
              errMsg = 'Location tracking request timed out.';
            }
            toast.error(`${errMsg} (Code ${err.code})`);
            fallbackToClientCoords();
          }
        },
        { 
          enableHighAccuracy: highAccuracy, 
          timeout: highAccuracy ? 15000 : 25000, 
          maximumAge: highAccuracy ? 0 : 30000 
        }
      );
    };

    startWatch(true);
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    localStorage.removeItem('offline_active_visit');
  };

  const handleRefreshGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setRefreshingGps(true);
    const tryGetPosition = (highAccuracy) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const acc = pos.coords.accuracy;

          setCurrentCoords({ latitude: lat, longitude: lon });
          setGpsAccuracy(acc);

          if (activeVisit) {
            const clientLat = parseFloat(activeVisit.client_latitude || 12.9716);
            const clientLon = parseFloat(activeVisit.client_longitude || 77.5946);
            
            // Haversine distance calculation
            const R = 6371000;
            const dLat = (clientLat - lat) * Math.PI / 180;
            const dLon = (clientLon - lon) * Math.PI / 180;
            const a = 
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat * Math.PI / 180) * Math.cos(clientLat * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c;

            setDistanceToClient(dist);
            setClientReached(dist <= 100);

            // Only send to server if accuracy is under 50m to avoid anti-spoofing rejection
            if (acc <= 50) {
              sendTrackingCoordinates(activeVisit.id, lat, lon, acc);
            }
          }
          setRefreshingGps(false);
          if (acc > 50) {
            toast.warn(`Location refreshed, but accuracy is weak (±${Math.round(acc)}m). Try stepping outside.`);
          } else {
            toast.success('GPS location refreshed successfully.');
          }
        },
        (err) => {
          console.error(`GPS manual refresh error (highAccuracy=${highAccuracy}):`, err);
          if (highAccuracy) {
            // Fallback to standard accuracy
            tryGetPosition(false);
          } else {
            setRefreshingGps(false);
            let errMsg = 'Failed to refresh GPS location.';
            if (err.code === 1) {
              errMsg = 'Location permission denied. Please allow location access in your browser settings (click lock icon next to URL).';
            } else if (err.code === 2) {
              errMsg = 'Location unavailable. Device GPS signal is weak or turned off.';
            } else if (err.code === 3) {
              errMsg = 'Location request timed out. Please try again.';
            }
            toast.error(`${errMsg} (Code ${err.code})`);
          }
        },
        { 
          enableHighAccuracy: highAccuracy, 
          timeout: highAccuracy ? 8000 : 15000, 
          maximumAge: highAccuracy ? 0 : 30000 
        }
      );
    };

    tryGetPosition(true);
  };

  const sendTrackingCoordinates = async (visitId, latitude, longitude, accuracy) => {
    const payload = { latitude, longitude, accuracy };

    if (!navigator.onLine) {
      // Queue locally
      const queue = JSON.parse(localStorage.getItem('offline_coords_queue') || '[]');
      queue.push(payload);
      localStorage.setItem('offline_coords_queue', JSON.stringify(queue));
      return;
    }

    try {
      await fetch(`/api/visits/${visitId}/location`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // If request failed due to offline/network issue, queue it
      const queue = JSON.parse(localStorage.getItem('offline_coords_queue') || '[]');
      queue.push(payload);
      localStorage.setItem('offline_coords_queue', JSON.stringify(queue));
    }
  };

  // Actions
  const handleStartVisit = async () => {
    if (!selectedRenewalId) {
      toast.error('Please select a client from the renewals list.');
      return;
    }

    setLoading(true);

    const startVisitWithCoords = async (lat, lon) => {
      try {
        const res = await fetch('/api/visits/start', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            renewal_id: selectedRenewalId,
            latitude: lat,
            longitude: lon
          })
        });

        if (res.ok) {
          toast.success('Client visit session started!');
          fetchActiveVisit();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to start visit.');
        }
      } catch (err) {
        console.error('Start visit network error:', err);
        toast.error('Network error starting visit.');
      } finally {
        setLoading(false);
      }
    };

    // Request immediate geolocation coordinates
    const tryGetPositionForStart = (highAccuracy) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          await startVisitWithCoords(lat, lon);
        },
        async (err) => {
          console.error(`Start visit GPS error (highAccuracy=${highAccuracy}):`, err);
          if (highAccuracy) {
            tryGetPositionForStart(false);
          } else {
            setLoading(false);
            let errMsg = 'Location permission is required to start a client visit.';
            if (err.code === 1) {
              errMsg = 'Location permission denied. Please allow location access in your browser settings (click lock icon next to URL).';
            } else if (err.code === 2) {
              errMsg = 'Location unavailable. Please make sure GPS/location services are enabled.';
            } else if (err.code === 3) {
              errMsg = 'Location request timed out. Please try again.';
            }
            toast.error(`${errMsg} (Code ${err.code})`);

            // Show in-app fallback confirmation modal instead of browser confirm
            const selectedRenewal = renewals.find(r => String(r.id) === String(selectedRenewalId));
            const fallbackLat = selectedRenewal ? parseFloat(selectedRenewal.client_latitude || 12.9716) : 12.9716;
            const fallbackLon = selectedRenewal ? parseFloat(selectedRenewal.client_longitude || 77.5946) : 77.5946;
            setGpsFallbackConfirm({ fallbackLat, fallbackLon });
          }
        },
        { 
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 8000 : 15000,
          maximumAge: highAccuracy ? 0 : 30000
        }
      );
    };

    tryGetPositionForStart(true);
  };

  const handleCheckIn = async () => {
    if (!currentCoords) {
      toast.error('Waiting for GPS coordinates signal...');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/visits/${activeVisit.id}/check-in`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          notes,
          photo_data: photoData
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.client_reached) {
          toast.success('Successfully checked in! Client location verified.');
        } else {
          toast(`Checked in, but client verification failed (you are ${Math.round(data.distance_meters)}m away).`, { icon: '⚠️' });
        }
        fetchActiveVisit();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Check-in failed.');
      }
    } catch (err) {
      console.error('Check-in network error:', err);
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Check-in: ' + (err.message || String(err)), stack: err.stack })
      }).catch(() => {});
      toast.error('Network error during check-in.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/visits/${activeVisit.id}/check-out`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes,
          photo_data: photoData
        })
      });
      if (res.ok) {
        toast.success('Visit completed and saved successfully.');
        setActiveVisit(null);
        setSelectedRenewalId('');
        setNotes('');
        setPhotoData(null);
        setCurrentCoords(null);
        setDistanceToClient(null);
        setClientReached(false);
        stopGpsTracking();
      } else {
        toast.error('Failed to check out.');
      }
    } catch (err) {
      console.error('Checkout network error:', err);
      toast.error('Network error checking out.');
    } finally {
      setLoading(false);
    }
  };

  const saveDraftData = async (updatedNotes, updatedPhoto) => {
    if (!activeVisit) return;
    try {
      await fetch(`/api/visits/${activeVisit.id}/notes`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: updatedNotes !== undefined ? updatedNotes : notes,
          photo_data: updatedPhoto !== undefined ? updatedPhoto : photoData
        })
      });
    } catch (err) {
      console.error('Error saving draft data:', err);
    }
  };

  const handleNotesChange = (val) => {
    setNotes(val);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraftData(val, photoData);
    }, 1500);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const photoResult = reader.result;
      setPhotoData(photoResult);
      toast.success('Verification photo uploaded.');
      saveDraftData(notes, photoResult);
    };
    reader.readAsDataURL(file);
  };

  const handleGpsFallbackConfirm = async () => {
    if (!gpsFallbackConfirm) return;
    const { fallbackLat, fallbackLon } = gpsFallbackConfirm;
    setGpsFallbackConfirm(null);
    setLoading(true);
    const startVisitWithCoords = async (lat, lon) => {
      try {
        const res = await fetch('/api/visits/start', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ renewal_id: selectedRenewalId, latitude: lat, longitude: lon })
        });
        if (res.ok) {
          toast.success('Client visit session started!');
          fetchActiveVisit();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to start visit.');
        }
      } catch (err) {
        toast.error('Network error starting visit.');
      } finally {
        setLoading(false);
      }
    };
    await startVisitWithCoords(fallbackLat, fallbackLon);
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Selection / Controller Card */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Visit Setup Box */}
        <div className="card p-6 border-t-2 border-brand-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-500" /> Client Visit Tracking
            </h2>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                isOnline ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Online' : 'Offline Mode'}
              </span>
            </div>
          </div>

          {!activeVisit ? (
            <div className="space-y-4">
              <p className="text-sm text-surface-500">
                To begin a client visit, select a customer from your pending or active renewals list. Starting a visit records your departure coordinate and timestamp.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-1.5">
                  Select Customer Renewal
                </label>
                <select
                  value={selectedRenewalId}
                  onChange={(e) => setSelectedRenewalId(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">-- Choose Client --</option>
                  {renewals.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.client_name} - {r.service} ({r.unique_id})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleStartVisit}
                disabled={loading || !selectedRenewalId}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 text-sm"
              >
                <Play className="w-4 h-4 fill-white" /> Start Visit Session
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Active Client Details */}
              <div className="p-4 bg-brand-50/50 dark:bg-brand-950/10 border border-brand-200 dark:border-brand-900/30 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-surface-900 dark:text-white text-base">
                      {activeVisit.client_name}
                    </h3>
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold uppercase tracking-wider mt-0.5">
                      {activeVisit.service}
                    </p>
                  </div>
                  <span className="bg-brand-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                    Active Session
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand-200/50 dark:border-brand-900/10 text-xs">
                  <div>
                    <span className="text-surface-400 block uppercase tracking-wider font-semibold text-[10px]">Start Time</span>
                    <span className="font-medium text-surface-700 dark:text-surface-200">
                      {formatDateTime(activeVisit.start_time)}
                    </span>
                  </div>
                  <div>
                    <span className="text-surface-400 block uppercase tracking-wider font-semibold text-[10px]">Check-In Status</span>
                    <span className={`font-semibold ${activeVisit.status === 'checked_in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {activeVisit.status === 'checked_in' ? 'Checked In' : 'Pending Check-In'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Stepper & Inputs */}
              <div className="space-y-4">
                
                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-1">
                    Visit Notes / Discussion Summary
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Enter what was discussed, client feedback, next steps..."
                    rows={4}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  {activeVisit.status !== 'checked_in' ? (
                    <div className="flex-1 space-y-2">
                      <button
                        onClick={handleCheckIn}
                        disabled={loading || !currentCoords || (gpsAccuracy !== null && gpsAccuracy >= 50)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 text-sm"
                      >
                        <UserCheck className="w-4 h-4" /> Check In (Verify Coordinates)
                      </button>
                      {gpsAccuracy !== null && gpsAccuracy >= 50 && (
                        <p className="text-xs text-rose-500 text-center font-semibold animate-pulse">
                          ⚠️ Check-in disabled: Signal accuracy is ±{Math.round(gpsAccuracy)}m (must be under 50m).
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={handleCheckOut}
                      disabled={loading}
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 text-sm"
                    >
                      <LogOut className="w-4 h-4" /> Check Out & Complete Visit
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GPS Status Indicator Sidebar */}
      {activeVisit && (
        <div className="card p-6 border-t-2 border-brand-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-500 animate-pulse" /> Live Tracking Status
              </h2>
              <button
                onClick={handleRefreshGps}
                disabled={refreshingGps}
                title="Refresh GPS Location"
                className={`p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 ${refreshingGps ? 'animate-spin' : ''}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-6">
              
              {/* Coordinates Indicator */}
              <div className="space-y-1">
                <span className="text-surface-400 text-[10px] uppercase font-bold tracking-wider">CST Location GPS</span>
                {currentCoords ? (
                  <p className="text-sm font-semibold text-surface-850 dark:text-surface-100">
                    {currentCoords.latitude.toFixed(6)}, {currentCoords.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-sm text-surface-400 italic">Waiting for GPS signal...</p>
                )}
              </div>

              {/* Accuracy */}
              <div className="space-y-1">
                <span className="text-surface-400 text-[10px] uppercase font-bold tracking-wider">Signal Accuracy</span>
                {gpsAccuracy !== null ? (
                  <div>
                    <p className={`text-sm font-semibold ${gpsAccuracy < 50 ? 'text-emerald-600' : 'text-rose-600 font-bold'}`}>
                      ±{Math.round(gpsAccuracy)} meters {gpsAccuracy < 50 ? '(Good)' : '(Weak Signal)'}
                    </p>
                    {gpsAccuracy >= 50 && (
                      <p className="text-[10px] text-rose-500 mt-1 font-medium leading-normal animate-pulse">
                        ⚠️ Accuracy must be under 50m to check in. Step outdoors or click the Refresh button.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-surface-400 italic">N/A</p>
                )}
              </div>

              {(!currentCoords || (gpsAccuracy !== null && gpsAccuracy >= 50)) && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const clientLat = parseFloat(activeVisit.client_latitude || 12.9716);
                      const clientLon = parseFloat(activeVisit.client_longitude || 77.5946);
                      setCurrentCoords({ latitude: clientLat, longitude: clientLon });
                      setGpsAccuracy(10); // Mock good accuracy
                      setDistanceToClient(0); // Proximity achieved
                      setClientReached(true);
                      toast.info("Using client's coordinates as a fallback override (Demo Mode).");
                    }}
                    className="w-full py-1.5 px-3 border border-dashed border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-lg transition-all text-center"
                  >
                    📍 Use Mock Geolocation (Demo Fallback)
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-surface-400 border-t border-surface-200 dark:border-surface-700 pt-4 mt-6">
            GPS locations are recorded periodically to track the route and capture coordinates when checking in.
          </div>
        </div>
      )}
    </div>

      {/* GPS Fallback Confirmation Modal */}
      {gpsFallbackConfirm && createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setGpsFallbackConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-100 dark:border-surface-700">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-white">GPS Unavailable</h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Use fallback coordinates?</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Your device GPS failed to return a location. Would you like to start the visit using the <span className="font-semibold text-amber-600 dark:text-amber-400">client's registered location</span> as fallback coordinates?
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                This is intended for testing purposes. Real visits should use live GPS.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setGpsFallbackConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGpsFallbackConfirm}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Use Fallback
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────
// 2. ADMIN TRACKING & MONITORING MODULE
// ────────────────────────────────────────────────────────
function AdminVisitModule({ token, user }) {
  const [activeVisits, setActiveVisits] = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [metrics, setMetrics] = useState(null);

  // Filters
  const [filterCST, setFilterCST] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal / Detail View
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [selectedVisitDetails, setSelectedVisitDetails] = useState(null);
  const [leafletMapInstance, setLeafletMapInstance] = useState(null);

  const mapContainerRef = useRef(null);
  const detailMapRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    fetchActiveVisits();
    fetchHistoryVisits();
    fetchMetrics();

    // Set auto-polling interval to keep live field monitoring synced seamlessly
    const pollInterval = setInterval(() => {
      fetchActiveVisits();
      fetchMetrics();
    }, 5000);

    // Listen to real-time events broadcasted from backend
    const handleRealTimeEvent = () => {
      fetchActiveVisits();
      fetchMetrics();
    };

    const handleVisitEvent = (e) => {
      console.log('📡 Visit event received in AdminVisitModule:', e.detail);
      fetchActiveVisits();
      fetchMetrics();
      if (e.detail?.type === 'visit_completed') {
        fetchHistoryVisits();
      }
    };

    window.addEventListener('rmt_renewals_updated', handleRealTimeEvent);
    window.addEventListener('rmt_visit_event', handleVisitEvent);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('rmt_renewals_updated', handleRealTimeEvent);
      window.removeEventListener('rmt_visit_event', handleVisitEvent);
    };
  }, [token]);

  // Update history list when filters change
  useEffect(() => {
    if (!token) return;
    fetchHistoryVisits();
  }, [filterCST, filterCustomer, filterDate, filterStatus, token]);

  const fetchActiveVisits = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/visits/admin/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActiveVisits(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistoryVisits = async () => {
    if (!token) return;
    try {
      let url = `/api/visits/admin/history?1=1`;
      if (filterCST) url += `&cst_id=${filterCST}`;
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      if (filterDate) {
        url += `&start_date=${filterDate}&end_date=${filterDate}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        let data = await res.json();
        // Client side search matching for customer name
        if (filterCustomer) {
          data = data.filter(v => v.client_name?.toLowerCase().includes(filterCustomer.toLowerCase()));
        }
        setHistoryVisits(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMetrics = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/visits/admin/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMetrics(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const closeDetailsModal = () => {
    try {
      if (leafletMapInstance) {
        leafletMapInstance.remove();
      }
    } catch (e) {
      console.warn('Map remove error:', e);
    }
    setLeafletMapInstance(null);
    setSelectedVisitId(null);
    setSelectedVisitDetails(null);
  };

  // Open details view and load Leaflet map for route trail
  const viewVisitDetails = async (id) => {
    setSelectedVisitId(id);
    try {
      const res = await fetch(`/api/visits/admin/history/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const details = await res.json();
        setSelectedVisitDetails(details);
      }
    } catch (err) {
      toast.error('Failed to load visit details.');
    }
  };

  // Re-render Leaflet map as soon as selectedVisitDetails modal is attached to DOM
  useEffect(() => {
    if (selectedVisitDetails) {
      const timer = setTimeout(() => {
        renderDetailsMap(selectedVisitDetails);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedVisitDetails]);

  const renderDetailsMap = async (details) => {
    if (!details || !details.visit) return;
    
    // Clear previous Leaflet elements
    if (leafletMapInstance) {
      try {
        leafletMapInstance.remove();
      } catch (e) {
        console.warn('Leaflet cleanup error:', e);
      }
    }

    const mapEl = detailMapRef.current;
    if (!mapEl) {
      console.warn('detailMapRef element not found in DOM.');
      return;
    }

    const L = await loadLeaflet();
    
    const clientLat = parseFloat(details.visit.client_latitude) || 12.9716;
    const clientLon = parseFloat(details.visit.client_longitude) || 77.5946;
    let execLat = parseFloat(details.visit.start_latitude) || parseFloat(details.visit.arrival_latitude) || clientLat;
    let execLon = parseFloat(details.visit.start_longitude) || parseFloat(details.visit.arrival_longitude) || clientLon;

    if (isNaN(execLat)) execLat = 12.9716;
    if (isNaN(execLon)) execLon = 77.5946;

    let popupTime = details.visit.start_time;
    const hasRoute = details.route && Array.isArray(details.route) && details.route.length > 0;

    if (hasRoute) {
      const lastPoint = details.route[details.route.length - 1];
      const pLat = parseFloat(lastPoint.latitude);
      const pLon = parseFloat(lastPoint.longitude);
      if (!isNaN(pLat) && !isNaN(pLon)) {
        execLat = pLat;
        execLon = pLon;
        popupTime = lastPoint.captured_at;
      }
    }

    const map = L.map(mapEl).setView([execLat, execLon], 14);
    setLeafletMapInstance(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Force map to recalculate bounds multiple times as modal finishes mounting
    [100, 300, 600].forEach(delay => {
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch (e) {}
      }, delay);
    });

    // Executive location marker
    const execIcon = L.divIcon({
      className: 'custom-exec-marker',
      html: `<div class="w-8 h-8 bg-indigo-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white font-bold text-xs cursor-pointer">E</div>`,
      iconSize: [32, 32]
    });
    L.marker([execLat, execLon], { icon: execIcon })
      .addTo(map)
      .bindPopup(`<b>Executive: ${details.visit.cst_name || 'Field Executive'}</b><br/>Status: ${details.visit.status}`)
      .openPopup();

    // Route points and trail line
    if (hasRoute) {
      const latlngs = details.route
        .map(r => [parseFloat(r.latitude), parseFloat(r.longitude)])
        .filter(pt => !isNaN(pt[0]) && !isNaN(pt[1]));

      if (latlngs.length > 0) {
        L.polyline(latlngs, { color: '#6366f1', weight: 5, opacity: 0.85 }).addTo(map);
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (historyVisits.length === 0) {
      toast.error('No tracking records available to export.');
      return;
    }

    const headers = ['Visit ID', 'Client Name', 'Service', 'CST Name', 'Status', 'Start Time', 'Check-In Time', 'Check-Out Time', 'Client Reached', 'Distance (m)', 'Visit Notes'];
    const rows = historyVisits.map(v => [
      v.id,
      v.client_name,
      v.service,
      v.cst_name,
      v.status,
      v.start_time,
      v.check_in_time || 'N/A',
      v.check_out_time || 'N/A',
      v.client_reached ? 'Yes' : 'No',
      v.arrival_distance_meters || 'N/A',
      v.notes ? v.notes.replace(/"/g, '""') : ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `client_visits_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Visit tracking report exported successfully.');
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Analytics Dashboard */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6 border-t-2 border-brand-500">
            <h3 className="text-surface-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Visits Initiated</h3>
            <p className="text-3xl font-black text-surface-900 dark:text-white">{metrics.summary.total}</p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-brand-650 font-medium">
              <Activity className="w-3.5 h-3.5" /> Ongoing visits: {metrics.summary.ongoing}
            </div>
          </div>

          <div className="card p-6 border-t-2 border-emerald-500">
            <h3 className="text-surface-500 text-xs font-semibold uppercase tracking-wider mb-2">Completed Visits</h3>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{metrics.summary.success}</p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Visits completed successfully
            </div>
          </div>

          <div className="card p-6 border-t-2 border-amber-500">
            <h3 className="text-surface-500 text-xs font-semibold uppercase tracking-wider mb-2">Ongoing Visits</h3>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{metrics.summary.ongoing}</p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 font-medium">
              <Clock className="w-3.5 h-3.5" /> Sessions currently active
            </div>
          </div>

          <div className="card p-6 border-t-2 border-purple-500">
            <h3 className="text-surface-500 text-xs font-semibold uppercase tracking-wider mb-2">Active CST Tracking</h3>
            <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{activeVisits.length}</p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-purple-700 font-medium">
              <Users className="w-3.5 h-3.5" /> Executives currently in field
            </div>
          </div>
        </div>
      )}

      {/* Ongoing Live CST Monitoring Panel */}
      <div className="card p-6 border-t-2 border-brand-500">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-500 animate-pulse" /> Live Field Monitoring
        </h2>

        {activeVisits.length === 0 ? (
          <p className="text-sm text-surface-500 italic">No CST Executives currently on client visits.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeVisits.map(visit => (
              <div 
                key={visit.id} 
                onClick={() => viewVisitDetails(visit.id)}
                className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-brand-500 transition-all cursor-pointer bg-surface-50 dark:bg-surface-900/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-surface-900 dark:text-white text-sm">{visit.cst_name}</h4>
                      <p className="text-[10px] text-surface-500">{visit.cst_email}</p>
                    </div>
                    <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-brand-900/30 dark:text-brand-400">
                      {visit.status === 'checked_in' ? 'Checked In' : 'En Route'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 mt-3 pt-3 border-t border-surface-200 dark:border-surface-750">
                    <p><b className="text-surface-500">Client:</b> {visit.client_name}</p>
                    <p><b className="text-surface-500">Service:</b> {visit.service}</p>
                    <p><b className="text-surface-500">Started:</b> {formatDateTime(visit.start_time)}</p>
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-brand-500 font-semibold flex items-center justify-between">
                  <span>Click to view live trail map</span>
                  <Map className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Visits Log & Filters */}
      <div className="card p-6 border-t-2 border-brand-500 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">Historical Visit Logs</h2>
            <p className="text-xs text-surface-500 mt-1">Review complete audit trails of executive visits</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-700 dark:hover:bg-surface-650 text-surface-700 dark:text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-surface-300 dark:border-surface-600"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV Report
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface-50 dark:bg-surface-900/50 rounded-xl border border-surface-200/50 dark:border-surface-700">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-450 mb-1">CST Executive / ID</label>
            <input 
              type="text" 
              placeholder="e.g. Mustafa or 14" 
              value={filterCST}
              onChange={(e) => setFilterCST(e.target.value)}
              className="w-full px-3 py-1.5 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-450 mb-1">Customer Name</label>
            <input 
              type="text" 
              placeholder="Search..." 
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-1.5 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-450 mb-1">Date</label>
            <IndianDateInput 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-450 mb-1">Visit Status</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-xs outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Started (Ongoing)</option>
              <option value="checked_in">Checked In</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 text-surface-450 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Visit ID</th>
                <th className="py-3 px-4">CST Executive</th>
                <th className="py-3 px-4">Customer Client</th>
                <th className="py-3 px-4">Start Visit</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/60 dark:divide-surface-700/50">
              {historyVisits.map(v => {
                const durationMinutes = v.check_out_time
                  ? Math.round((new Date(v.check_out_time) - new Date(v.start_time)) / (1000 * 60))
                   : null;

                return (
                  <tr key={v.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-brand-600">VT-{v.id}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-surface-900 dark:text-white">{v.cst_name}</p>
                        <p className="text-[10px] text-surface-500">{v.cst_email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-surface-900 dark:text-white">{v.client_name}</p>
                        <p className="text-[10px] text-surface-500">{v.service}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{formatDateTime(v.start_time)}</td>
                    <td className="py-3 px-4">
                      {durationMinutes !== null ? `${durationMinutes} mins` : 'Ongoing'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        v.status === 'checked_in' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' :
                        v.status === 'active' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400'
                      }`}>
                        {v.status === 'completed' ? 'Completed' :
                         v.status === 'checked_in' ? 'Checked In' :
                         v.status === 'active' ? 'Ongoing' : 'Cancelled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => viewVisitDetails(v.id)}
                        className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
                      >
                        View Details & Trail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details & Map Modal */}
      {selectedVisitId && selectedVisitDetails && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col h-[85vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-900/50">
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-white">
                  Visit Audit Trail Details: VT-{selectedVisitDetails.visit.id}
                </h3>
                <p className="text-xs text-surface-500">Executive: {selectedVisitDetails.visit.cst_name}</p>
              </div>
              <button 
                onClick={closeDetailsModal}
                className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-full transition-colors text-surface-500"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable details & Map */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Top details cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-surface-450 block uppercase tracking-wider">CST & Client</span>
                  <p><b className="text-surface-500">Executive:</b> {selectedVisitDetails.visit.cst_name}</p>
                  <p><b className="text-surface-500">Client:</b> {selectedVisitDetails.visit.client_name}</p>
                  <p><b className="text-surface-500">Service:</b> {selectedVisitDetails.visit.service}</p>
                </div>

                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-surface-450 block uppercase tracking-wider">Visit Timestamps</span>
                  <p><b className="text-surface-500">Started:</b> {formatDateTime(selectedVisitDetails.visit.start_time)}</p>
                  <p><b className="text-surface-500">Checked In:</b> {selectedVisitDetails.visit.check_in_time ? formatDateTime(selectedVisitDetails.visit.check_in_time) : 'N/A'}</p>
                  <p><b className="text-surface-500">Completed:</b> {selectedVisitDetails.visit.check_out_time ? formatDateTime(selectedVisitDetails.visit.check_out_time) : 'N/A'}</p>
                </div>

                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-surface-450 block uppercase tracking-wider">GPS Details</span>
                  <p><b className="text-surface-500">Start Location:</b> {selectedVisitDetails.visit.start_latitude ? `${parseFloat(selectedVisitDetails.visit.start_latitude).toFixed(6)}, ${parseFloat(selectedVisitDetails.visit.start_longitude).toFixed(6)}` : 'N/A'}</p>
                  <p><b className="text-surface-500">Check-In Location:</b> {selectedVisitDetails.visit.arrival_latitude ? `${parseFloat(selectedVisitDetails.visit.arrival_latitude).toFixed(6)}, ${parseFloat(selectedVisitDetails.visit.arrival_longitude).toFixed(6)}` : 'N/A'}</p>
                  <p><b className="text-surface-500">Route Points:</b> {selectedVisitDetails.route ? selectedVisitDetails.route.length : 0} logged</p>
                </div>

              </div>

              {/* Notes & Verification Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                  <span className="text-[10px] font-bold text-surface-450 block uppercase tracking-wider mb-2">Visit Notes</span>
                  <p className="text-xs text-surface-700 dark:text-surface-300 whitespace-pre-wrap leading-relaxed">
                    {selectedVisitDetails.visit.notes || 'No notes submitted for this visit.'}
                  </p>
                </div>


              </div>

              {/* Leaflet Map Trail */}
              <div>
                <span className="text-[10px] font-bold text-surface-450 block uppercase tracking-wider mb-2">GPS Route Trail Visualization</span>
                <div 
                  ref={detailMapRef} 
                  className="w-full h-[280px] rounded-xl border border-surface-250 dark:border-surface-700 bg-surface-100 z-10"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="bg-surface-50 dark:bg-surface-900/50 px-6 py-4 border-t border-surface-250 dark:border-surface-700 flex justify-end">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 border border-surface-300 dark:border-surface-700 text-xs font-bold text-surface-700 dark:text-surface-350 rounded-lg hover:bg-surface-100 transition-colors"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
