import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BASE_LAYERS } from '../data/layers.js';
import { rampColor } from '../lib/colors.js';
import { assess } from '../lib/suitability.js';

function wrapLng(lng) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function createInfiniteMarsTileLayer(urlTemplate, options) {
  const InfiniteLayer = L.TileLayer.extend({
    getTileUrl(coords) {
      const z = this._getZoomForUrl();
      const rows = Math.pow(2, z);
      const cols = 2 * Math.pow(2, z);

      if (coords.y < 0 || coords.y >= rows) {
        return '';
      }
      const wrappedX = ((coords.x % cols) + cols) % cols;

      return L.Util.template(urlTemplate, {
        z,
        x: wrappedX,
        y: coords.y,
      });
    },
  });
  return new InfiniteLayer(urlTemplate, options);
}

function getNasaOrbitalPhoto(lat, lng, zoom = 5) {
  const normLng = wrapLng(lng);
  const cols = 2 * Math.pow(2, zoom);
  const rows = Math.pow(2, zoom);
  const x = Math.min(cols - 1, Math.max(0, Math.floor(((normLng + 180) / 360) * cols)));
  const y = Math.min(rows - 1, Math.max(0, Math.floor(((90 - lat) / 180) * rows)));
  return `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/${zoom}/${y}/${x}.jpg`;
}

const SURFACE_PHOTOS = {
  jezero: 'https://images-assets.nasa.gov/image/PIA24486/PIA24486~orig.jpg',
  gale: 'https://images-assets.nasa.gov/image/PIA19912/PIA19912~orig.jpg',
  elysium: 'https://images-assets.nasa.gov/image/PIA22957/PIA22957~orig.jpg',
  chryse: 'https://images-assets.nasa.gov/image/PIA00393/PIA00393~orig.jpg',
  utopia: 'https://images-assets.nasa.gov/image/PIA00568/PIA00568~orig.jpg',
  meridiani: 'https://images-assets.nasa.gov/image/PIA06918/PIA06918~orig.jpg',
  olympus: 'https://images-assets.nasa.gov/image/PIA02982/PIA02982~orig.jpg',
  valles: 'https://images-assets.nasa.gov/image/PIA00422/PIA00422~orig.jpg',
};

function formatCoords(lat, lng) {
  const normLng = wrapLng(lng);
  const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(normLng).toFixed(2)}° ${normLng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

function getSiteMetric(site, dataLayer) {
  const suit = assess(site).score;
  if (!dataLayer || dataLayer.id === 'suitability') {
    return {
      raw: suit,
      suitability: suit,
      color: rampColor(
        suit,
        dataLayer?.domain || [0, 100],
        dataLayer?.stops || ['#b2182b', '#1a9850']
      ),
      badgeText: `${suit}/100 SUITABILITY`,
    };
  }
  const raw = site[dataLayer.id] ?? 0;
  const color = rampColor(raw, dataLayer.domain, dataLayer.stops);
  const formatted = dataLayer.id === 'radiation' ? raw.toFixed(2) : raw.toFixed(0);
  return {
    raw,
    suitability: suit,
    color,
    badgeText: `${formatted} ${dataLayer.unit}`,
  };
}

function createBeaconIcon(color, isSelected, isUnexplored) {
  const size = isSelected ? 34 : 26;
  return L.divIcon({
    className: 'mars-custom-pin',
    html: `
      <div class="mars-pin-wrap ${isSelected ? 'is-selected' : ''} ${isUnexplored ? 'is-unexplored' : ''}" style="--pin-color: ${color}">
        <span class="mars-pin-pulse"></span>
        <svg viewBox="0 0 32 32" width="${size}" height="${size}" fill="none">
          <polygon
            points="16,2 30,16 16,30 2,16"
            fill="rgba(5, 8, 12, 0.88)"
            stroke="${color}"
            stroke-width="${isSelected ? '2.4' : '1.8'}"
            stroke-dasharray="${isUnexplored ? '3 2' : 'none'}"
          />
          <circle cx="16" cy="16" r="4.2" fill="${color}" />
          <line x1="16" y1="0" x2="16" y2="5" stroke="${color}" stroke-width="1.5" />
          <line x1="16" y1="27" x2="16" y2="32" stroke="${color}" stroke-width="1.5" />
          <line x1="0" y1="16" x2="5" y2="16" stroke="${color}" stroke-width="1.5" />
          <line x1="27" y1="16" x2="32" y2="16" stroke="${color}" stroke-width="1.5" />
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2) - 6],
  });
}

export default function MapView({
  baseId,
  dataLayer,
  locations,
  selected,
  routes,
  onSelectSite,
  onPickPoint,
}) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routesLayerRef = useRef(null);
  const pickedPointRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(2);
  const [activeRouteId, setActiveRouteId] = useState('safest');

  // Sync highlighted route with RoutePanel
  useEffect(() => {
    const onRouteSelect = (e) => {
      if (e.detail) setActiveRouteId(e.detail);
    };
    window.addEventListener('mars-select-route', onRouteSelect);
    return () => window.removeEventListener('mars-select-route', onRouteSelect);
  }, []);

  // 1. Initialize Google-Maps-Style Infinite Horizontal Mars Map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = L.map(mapEl.current, {
      crs: L.CRS.EPSG4326,
      center: [10, 20],
      zoom: 2,
      minZoom: 1.4,
      maxZoom: 9,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      maxBounds: [[-89.5, -Infinity], [89.5, Infinity]],
      maxBoundsViscosity: 1.0,
      worldCopyJump: true,
    });

    routesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    map.on('mousemove', (e) => {
      const lat = Math.max(-90, Math.min(90, e.latlng.lat));
      const lng = wrapLng(e.latlng.lng);
      setCursor({ lat, lng });
    });

    map.on('mouseout', () => setCursor(null));

    map.on('click', (e) => {
      const lat = Math.max(-90, Math.min(90, e.latlng.lat));
      const lng = wrapLng(e.latlng.lng);
      onPickPoint(lat, lng);
    });

    const ro = new ResizeObserver(() => {
      if (!mapRef.current) return;
      map.invalidateSize();
    });
    ro.observe(mapEl.current);

    mapRef.current = map;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [onPickPoint]);

  // 2. Switch Global NASA Trek Basemap with Infinite East/West Wrapping
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileRef.current) {
      map.removeLayer(tileRef.current);
    }

    const base = BASE_LAYERS.find((b) => b.id === baseId) || BASE_LAYERS[0];

    const layer = createInfiniteMarsTileLayer(base.url, {
      tileSize: 256,
      minZoom: 0,
      maxNativeZoom: base.maxNativeZoom ?? 7,
      maxZoom: 9,
      noWrap: false,
      attribution: base.attribution,
    });

    layer.addTo(map);
    tileRef.current = layer;
  }, [baseId]);

  // 3. Render Custom Beacon Pins Across Wrapped Worlds
  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;
    group.clearLayers();

    const WORLD_OFFSETS = [-720, -360, 0, 360, 720];

    locations.forEach((site) => {
      const isSelected = selected?.type === 'site' && selected.id === site.id;
      const isUnexplored = site.status?.toLowerCase().includes('unexplored');
      const metric = getSiteMetric(site, dataLayer);

      const orbitalCloseUp = getNasaOrbitalPhoto(site.lat, site.lng, 5);
      const primaryImg = SURFACE_PHOTOS[site.id] || orbitalCloseUp;
      const statusBadge =
        site.status || (SURFACE_PHOTOS[site.id] ? 'Surface Imagery' : 'Orbital Recon Tile');

      const tooltipHtml = `
        <div class="mars-hover-bubble">
          <div class="mars-bubble-img-wrap">
            <img
              src="${primaryImg}"
              alt="${site.name}"
              style="width:100%;height:100%;object-fit:cover;display:block;filter:contrast(1.15) saturate(1.1);"
              onerror="this.onerror=null;this.src='${orbitalCloseUp}';"
            />
            <div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle, transparent 55%, rgba(0,0,0,0.55) 100%);display:flex;align-items:center;justify-content:center;">
              <div style="width:18px;height:18px;border:1px dashed rgba(90,209,230,0.55);border-radius:50%;"></div>
            </div>
            <span class="mars-bubble-score" style="border-color:${metric.color}; color:${metric.color}">
              ${metric.badgeText}
            </span>
            <span class="mars-bubble-status">${statusBadge}</span>
          </div>
          <div class="mars-bubble-content">
            <div class="mars-bubble-title">${site.name}</div>
            <div class="mars-bubble-coords">LAT/LON: ${formatCoords(site.lat, site.lng)}</div>
            <div class="mars-bubble-stats">
              <span>ELEV ${site.elevation > 0 ? '+' : ''}${site.elevation} km</span>
              <span>TEMP ${site.temp}°C</span>
              <span>ICE ${site.ice}%</span>
            </div>
            ${site.note ? `<div class="mars-bubble-note">${site.note}</div>` : ''}
          </div>
        </div>
      `;

      const tipDirection = site.lat >= -5 ? 'bottom' : 'top';
      const tipOffset = site.lat >= -5 ? [0, 14] : [0, -10];

      WORLD_OFFSETS.forEach((offset) => {
        const marker = L.marker([site.lat, site.lng + offset], {
          icon: createBeaconIcon(metric.color, isSelected, isUnexplored),
        });

        marker.bindTooltip(tooltipHtml, {
          direction: tipDirection,
          offset: tipOffset,
          opacity: 1,
          className: 'mars-rich-tooltip',
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectSite(site.id);
        });

        marker.addTo(group);
      });
    });
  }, [locations, dataLayer, selected, onSelectSite]);

  // 4. Fly Smoothly to Selected Site
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;

    if (selected.type === 'site') {
      const s = locations.find((l) => l.id === selected.id);
      if (s && map.getZoom() < 2.5) {
        map.flyTo([s.lat, s.lng], 3, { duration: 0.8 });
      }
    }
  }, [selected, locations]);

  // 5. Render Clicked Arbitrary Point Reticle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickedPointRef.current) {
      map.removeLayer(pickedPointRef.current);
      pickedPointRef.current = null;
    }

    if (selected?.type === 'point') {
      const pointIcon = L.divIcon({
        className: 'mars-custom-pin',
        html: `<div class="mars-picked-reticle"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const pointTile = getNasaOrbitalPhoto(selected.lat, selected.lng, 5);
      const tipDirection = selected.lat >= -5 ? 'bottom' : 'top';

      pickedPointRef.current = L.marker([selected.lat, selected.lng], {
        icon: pointIcon,
      })
        .bindTooltip(
          `
          <div class="mars-hover-bubble" style="width:210px;">
            <div class="mars-bubble-img-wrap" style="height:95px;">
              <img src="${pointTile}" alt="Orbital Recon" style="width:100%;height:100%;object-fit:cover;filter:contrast(1.15);" />
              <span class="mars-bubble-status">UNEXPLORED SECTOR</span>
            </div>
            <div class="mars-bubble-content">
              <div class="mars-bubble-title">ORBITAL RECON POINT</div>
              <div class="mars-bubble-coords">${formatCoords(selected.lat, selected.lng)}</div>
            </div>
          </div>
          `,
          { direction: tipDirection, offset: [0, -10], className: 'mars-rich-tooltip', opacity: 1 }
        )
        .addTo(map);
    }
  }, [selected]);

  // 6. Render Clickable, Highlighted Dijkstra Routes + On-Map Explanation Tooltip
  useEffect(() => {
    const group = routesLayerRef.current;
    if (!group) return;
    group.clearLayers();
    if (!routes) return;

    // Draw non-selected routes first, then the active route on top so it's always crisp and visible
    const sortedRoutes = [...routes].sort((a, b) =>
      a.id === activeRouteId ? 1 : b.id === activeRouteId ? -1 : 0
    );

    [-360, 0, 360].forEach((offset) => {
      sortedRoutes.forEach((r) => {
        if (!r?.points?.length) return;
        const isSelected = r.id === activeRouteId;
        const shiftedPts = r.points.map(([lat, lng]) => [lat, lng + offset]);

        // If selected, draw a soft outer neon glow halo underneath the main line
        if (isSelected) {
          L.polyline(shiftedPts, {
            color: r.color || '#5ad1e6',
            weight: 10,
            opacity: 0.25,
            interactive: false,
          }).addTo(group);
        }

        // Main visible route line
        const poly = L.polyline(shiftedPts, {
          color: r.color || '#5ad1e6',
          weight: isSelected ? 4.2 : 2.0,
          dashArray: r.dash || null,
          opacity: isSelected ? 1.0 : 0.45,
        }).addTo(group);

        // Wide invisible hit-target line (18px) so clicking thin lines on the map is effortless
        const hitLine = L.polyline(shiftedPts, {
          color: '#000',
          weight: 18,
          opacity: 0.001,
        }).addTo(group);

        const exp = r.explanation;
        const routeTooltipHtml = `
          <div class="mars-hover-bubble" style="width: 265px; border-color: ${r.color};">
            <div class="mars-bubble-content">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:${r.color};font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">
                  ${r.label} Route
                </span>
                <span style="background:rgba(255,255,255,0.08);padding:2px 6px;font-size:10px;color:#fff;">
                  ${Math.round(r.km).toLocaleString()} km · ~${r.estSols || Math.round(r.km / 15)} Sols
                </span>
              </div>
              <div style="font-size:11px;color:#fff;font-weight:600;margin-top:5px;">
                ${exp ? exp.headline : r.tagline || ''}
              </div>
              <div style="font-size:10px;color:#cbd5e1;margin-top:4px;line-height:1.35;">
                ${exp ? exp.summary : ''}
              </div>
              <div class="mars-bubble-stats" style="margin-top:6px;">
                <span>SUIT ${Math.round(r.mean)}/100</span>
                <span>ICE ${(r.avgIce ?? 0).toFixed(0)}%</span>
                <span>RAD ${(r.avgRad ?? 0.65).toFixed(2)} mSv</span>
              </div>
              <div style="font-size:9px;color:${r.color};margin-top:5px;letter-spacing:0.08em;text-transform:uppercase;">
                ${isSelected ? '★ ACTIVE SELECTED ROUTE' : 'CLICK LINE TO HIGHLIGHT & INSPECT'}
              </div>
            </div>
          </div>
        `;

        hitLine.bindTooltip(routeTooltipHtml, {
          sticky: true,
          direction: 'top',
          offset: [0, -10],
          opacity: 1,
          className: 'mars-rich-tooltip',
        });

        hitLine.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setActiveRouteId(r.id);
          window.dispatchEvent(new CustomEvent('mars-select-route', { detail: r.id }));
        });
      });
    });
  }, [routes, activeRouteId]);

  const handleGlobalOverview = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([0, 0], 1.5, { duration: 0.7 });
  };

  const handleExploreView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([10, 20], 2.5, { duration: 0.7 });
  };

  return (
    <div className="map-wrap">
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 900, display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="globe-reset-btn"
          style={{ position: 'static' }}
          onClick={handleExploreView}
          title="Zoom in to continent-scale exploration view"
        >
          EXPLORE VIEW
        </button>
        <button
          type="button"
          className="globe-reset-btn"
          style={{ position: 'static' }}
          onClick={handleGlobalOverview}
          title="Zoom out to full 360° planetary overview"
        >
          FULL GLOBE 360°
        </button>
      </div>
      <div ref={mapEl} className="map" />
      <div className="hud-readout">
        <span>
          {cursor
            ? `LAT/LON: ${formatCoords(cursor.lat, cursor.lng)} · ZOOM ${zoomLevel.toFixed(1)}x`
            : `ZOOM ${zoomLevel.toFixed(1)}x · DRAG EAST/WEST INFINITELY`}
        </span>
        <span>CLICK ANY ROUTE LINE OR MARKER · SCROLL TO ZOOM · DRAG INFINITELY</span>
      </div>
    </div>
  );
}