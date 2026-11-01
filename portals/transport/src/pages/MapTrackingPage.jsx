import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Car, Truck, Compass, ShieldAlert, Phone, Clock, AlertTriangle } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom hospital icon
const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom health centre icon
const healthCentreIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom ambulance en-route icon
const ambulanceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapTrackingPage() {
  const { transports, facilities } = useCareConnectData();

  const [selectedTransportId, setSelectedTransportId] = useState(transports[0]?.id || '');

  useEffect(() => {
    if (transports.length > 0 && !selectedTransportId) {
      setSelectedTransportId(transports[0].id);
    }
  }, [transports, selectedTransportId]);

  const selectedTransport = transports.find(t => t.id === selectedTransportId) || transports[0] || {
    id: 'TR-ET-9101',
    patientName: 'Kebede Alemu',
    origin: 'Yeka Health Centre',
    originCoord: [9.0305, 38.7952],
    destination: 'Tikur Anbessa Specialized Hospital',
    destCoord: [9.0142, 38.7523],
    currentCoord: [9.0225, 38.7735],
    assignedVehicle: 'AMB-AA-012',
    driver: 'Kassahun Tadesse',
    driverPhone: '+251 91 190 2341',
    speedKmH: 48,
    etaMinutes: 12,
    status: 'In Transit'
  };

  const originCoord = selectedTransport.originCoord || [9.0305, 38.7952];
  const destCoord = selectedTransport.destCoord || [9.0142, 38.7523];
  const currentCoord = selectedTransport.currentCoord || [
    (originCoord[0] + destCoord[0]) / 2,
    (originCoord[1] + destCoord[1]) / 2
  ];

  const routePolyline = [originCoord, currentCoord, destCoord];

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Live Route & Spatial Telemetry (OpenStreetMap)</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Interactive Leaflet map showing referral transit corridors, facility locations, and ambulance status
        </p>
      </div>

      <div className="p-3 bg-violet-50/70 dark:bg-violet-950/40 rounded-xl border border-violet-200 dark:border-violet-900 text-violet-900 dark:text-violet-300 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-violet-600 shrink-0" />
        <p>
          <b>Operational Telemetry Notice (Section 8.F):</b> Waypoint positions are plotted from coordinator status reports and corridor telemetry checkpoints. Route coordinates simulate active Addis Ababa transit arteries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Transport Selection Panel */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-600" />
            <span>Select Active Transfer Route</span>
          </h3>

          <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
            {transports.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTransportId(t.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedTransport.id === t.id
                    ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 ring-1 ring-violet-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{t.patientName}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'In Transit' ? 'bg-violet-100 text-violet-800' :
                    t.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">{t.origin} &rarr; {t.destination}</p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                  <span className="font-bold text-violet-700 dark:text-violet-400">{t.assignedVehicle}</span>
                  <span className="font-mono text-slate-400">ETA {t.etaMinutes ? `${t.etaMinutes}m` : 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Leaflet Map Visual */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col h-[520px] relative">
          <div className="p-3.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between z-10">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                {selectedTransport.origin} &rarr; {selectedTransport.destination}
              </span>
              <span className="text-[10px] text-slate-500">
                Unit: <b>{selectedTransport.assignedVehicle}</b> | Driver: <b>{selectedTransport.driver}</b> ({selectedTransport.driverPhone})
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono font-bold text-violet-600 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded">
                Speed: {selectedTransport.speedKmH || 48} km/h
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded ml-1.5">
                ETA: {selectedTransport.etaMinutes || 15} mins
              </span>
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="flex-1 w-full h-full relative">
            <MapContainer
              center={currentCoord}
              zoom={13}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Origin Marker */}
              <Marker position={originCoord} icon={healthCentreIcon}>
                <Popup>
                  <div className="text-xs font-sans">
                    <b className="text-blue-600">Origin Facility:</b><br />
                    {selectedTransport.origin}<br />
                    Patient: {selectedTransport.patientName}
                  </div>
                </Popup>
              </Marker>

              {/* Ambulance Current Location Marker */}
              <Marker position={currentCoord} icon={ambulanceIcon}>
                <Popup>
                  <div className="text-xs font-sans">
                    <b className="text-violet-700">Ambulance {selectedTransport.assignedVehicle}</b><br />
                    Status: {selectedTransport.status}<br />
                    Driver: {selectedTransport.driver} ({selectedTransport.driverPhone})<br />
                    Speed: {selectedTransport.speedKmH || 48} km/h<br />
                    ETA: {selectedTransport.etaMinutes || 15} mins
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={destCoord} icon={hospitalIcon}>
                <Popup>
                  <div className="text-xs font-sans">
                    <b className="text-emerald-700">Receiving Destination:</b><br />
                    {selectedTransport.destination}<br />
                    Triage Room Ready
                  </div>
                </Popup>
              </Marker>

              {/* Route Polyline */}
              <Polyline
                positions={routePolyline}
                color="#7c3aed"
                weight={4}
                opacity={0.8}
                dashArray="6, 8"
              />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
