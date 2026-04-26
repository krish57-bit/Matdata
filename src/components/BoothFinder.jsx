import { useState, useEffect, useRef } from "react";
import { PhoneIcon, MapIcon, InfoIcon, CrossIcon, HashIcon, CivicIcon } from "./Icons";
import { trackEvent } from "../services/firebase";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const HAS_KEY = MAPS_API_KEY && MAPS_API_KEY !== "your_maps_api_key_here";

export default function BoothFinder() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [locationInfo, setLocationInfo] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (HAS_KEY) loadMapsScript();
    return () => { mapInstanceRef.current = null; };
  }, []);

  function loadMapsScript() {
    if (scriptLoaded.current || window.google?.maps) {
      scriptLoaded.current = true;
      return;
    }
    const existing = document.getElementById("gmaps-script");
    if (existing) { scriptLoaded.current = true; return; }
    const script = document.createElement("script");
    script.id = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => { scriptLoaded.current = true; };
    document.head.appendChild(script);
  }

  function initMap(lat, lng, label = "Your location") {
    if (!window.google?.maps || !mapRef.current) return;

    const center = { lat, lng };
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });

    // User/searched location marker
    new window.google.maps.Marker({
      position: center,
      map: mapInstanceRef.current,
      title: label,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#0f2d6b",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });

    // Search for polling-related places
    const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);
    const searchTerms = [
      "polling booth",
      "government school election",
      "sarkari school",
      "panchayat bhavan",
      "election office",
    ];

    const infoWindow = new window.google.maps.InfoWindow();

    searchTerms.slice(0, 2).forEach((keyword) => {
      service.nearbySearch(
        { location: center, radius: 3000, keyword },
        (results, serviceStatus) => {
          if (serviceStatus === window.google.maps.places.PlacesServiceStatus.OK) {
            results.slice(0, 4).forEach((place) => {
              const marker = new window.google.maps.Marker({
                position: place.geometry.location,
                map: mapInstanceRef.current,
                title: place.name,
                icon: {
                  url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="14" fill="#FF9933" stroke="white" stroke-width="2"/>
                      <text x="16" y="22" font-size="14" text-anchor="middle">🗳️</text>
                    </svg>`
                  ),
                  scaledSize: new window.google.maps.Size(32, 32),
                  anchor: new window.google.maps.Point(16, 16),
                },
              });
              marker.addListener("click", () => {
                infoWindow.setContent(
                  `<div style="font-family:sans-serif;max-width:200px;padding:4px">
                    <strong style="display:block;margin-bottom:4px">${place.name}</strong>
                    ${place.vicinity ? `<small style="display:block;margin-bottom:8px;color:#444">${place.vicinity}</small>` : ""}
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}" 
                       target="_blank" 
                       style="display:inline-block;padding:6px 12px;background:#0f2d6b;color:white;text-decoration:none;border-radius:4px;font-size:12px;font-weight:600">
                       Get Directions →
                    </a>
                  </div>`
                );
                infoWindow.open(mapInstanceRef.current, marker);
              });
            });
          }
        }
      );
    });
  }

  async function searchByLocation() {
    if (!query.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    setLocationInfo(null);
    trackEvent("booth_search", { query: query.trim().slice(0, 30) });

    if (!HAS_KEY) {
      setStatus("no_key");
      return;
    }

    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ", India")}&key=${MAPS_API_KEY}`;
      const res = await fetch(geocodeUrl);
      const data = await res.json();

      if (data.status !== "OK" || !data.results.length) {
        throw new Error("Location not found. Try a district name, constituency name, or 6-digit pincode.");
      }

      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      const formattedAddr = result.formatted_address;
      setStatus("success");
      setLocationInfo({ lat, lng, address: formattedAddr });
      setTimeout(() => initMap(lat, lng, formattedAddr), 150);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Could not find that location. Please try again.");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setStatus("loading");
    trackEvent("booth_use_my_location");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setStatus("success");
        setLocationInfo({ lat: coords.latitude, lng: coords.longitude, address: "Your current location" });
        setTimeout(() => initMap(coords.latitude, coords.longitude, "Your location"), 150);
      },
      () => {
        setStatus("error");
        setErrorMsg("Could not access your location. Please allow location permission and try again.");
      },
      { timeout: 10000 }
    );
  }

  return (
    <section className="booth-section" aria-label="Polling Booth Finder">
      <header className="section-header">
        <h2>Find Your Polling Booth</h2>
        <p>Search by district name, assembly constituency, or 6-digit pincode. For official booth data, always verify at <strong>voters.eci.gov.in</strong>.</p>
      </header>

      {/* ECI Helpline — always visible */}
      <div className="booth-helpline" aria-label="ECI Voter Helpline">
        <span className="helpline-icon" aria-hidden="true">
          <PhoneIcon size={20} />
        </span>
        <span>Voter Helpline: <strong>1950</strong> (Toll-free) &nbsp;|&nbsp; 
          <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" aria-label="Official ECI voter portal">
            voters.eci.gov.in
          </a>
        </span>
      </div>

      <div className="booth-controls" role="search" aria-label="Location search">
        <div className="booth-input-row">
          <label htmlFor="booth-search-input" className="sr-only">Enter district, constituency, or pincode</label>
          <input
            id="booth-search-input"
            className="booth-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchByLocation()}
            placeholder="e.g. Chandni Chowk, Pune, 110001..."
            aria-label="Enter district, constituency name, or 6-digit pincode"
          />
          <button
            className="btn-primary"
            onClick={searchByLocation}
            disabled={status === "loading" || !query.trim()}
            aria-label="Search for polling booths near this location"
          >
            {status === "loading" ? "Searching..." : "Search"}
          </button>
        </div>

        <button
          className="btn-ghost btn-location"
          onClick={useMyLocation}
          disabled={status === "loading"}
          aria-label="Use my current GPS location to find polling booths"
        >
          <MapIcon size={16} className="inline mr-1" /> Use my location
        </button>
      </div>

      {/* Error state */}
      {status === "error" && (
        <div className="booth-error" role="alert" aria-live="assertive">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* No API key state */}
      {status === "no_key" && (
        <div className="booth-no-key" role="status">
          <div className="no-key-icon" aria-hidden="true">
            <MapIcon size={48} />
          </div>
          <p className="no-key-title">Maps not configured</p>
          <p>To use the interactive map, add your <code>VITE_GOOGLE_MAPS_API_KEY</code> to the <code>.env</code> file.</p>
          <p>In the meantime, find your booth through official channels:</p>
          <div className="no-key-links">
            <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" className="btn-primary">
              🔍 voters.eci.gov.in
            </a>
            <span className="no-key-phone flex items-center gap-1"><PhoneIcon size={16}/> Call <strong>1950</strong></span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div
        className="booth-map"
        ref={mapRef}
        role="application"
        aria-label="Interactive map showing nearby polling booths"
        style={{ display: status === "success" ? "block" : "none" }}
      />

      {/* Idle placeholder */}
      {(status === "idle") && (
        <div className="booth-placeholder" aria-hidden="true">
          <span className="booth-placeholder-icon">
            <MapIcon size={48} />
          </span>
          <p>Map appears here after you search</p>
          <p className="booth-placeholder-sub">Search by district · Assembly constituency · Pincode</p>
        </div>
      )}

      {/* Location info panel */}
      {locationInfo && status === "success" && (
        <div className="booth-info-panel" aria-label="Booth information">
          <div className="booth-info-row">
            <span className="booth-info-label flex items-center gap-1"><MapIcon size={14}/> Searched location</span>
            <span className="booth-info-value">{locationInfo.address}</span>
          </div>
          <div className="booth-info-row">
            <span className="booth-info-label flex items-center gap-1"><HashIcon size={14}/> Booth format</span>
            <span className="booth-info-value">AC_NO / PART_NO (e.g. 12/045)</span>
          </div>
          <div className="booth-info-row">
            <span className="booth-info-label flex items-center gap-1"><InfoIcon size={14}/> Disclaimer</span>
            <span className="booth-info-value">Orange markers show nearby government buildings. Verify your official booth at <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer">voters.eci.gov.in</a></span>
          </div>
        </div>
      )}

      {/* Always-visible ECI note */}
      <div className="booth-note" aria-label="Official resources">
        <strong><CivicIcon size={16} className="inline mb-1 mr-1"/> Official Resources:</strong>&nbsp;
        <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer">voters.eci.gov.in</a> &nbsp;·&nbsp;
        <a href="https://eci.gov.in" target="_blank" rel="noopener noreferrer">eci.gov.in</a> &nbsp;·&nbsp;
        Voter Helpline: <strong>1950</strong>
      </div>
    </section>
  );
}
