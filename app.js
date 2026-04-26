var map = null;
var marker = null;
var accuracyCircle = null;

function initMap(lat, lng) {
  if (map) return;
  map = L.map('map', { zoomControl: true, attributionControl: true }).setView([lat, lng], 15);
  L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20
  }).addTo(map);
}

function updateMap(lat, lng, acc) {
  if (!map) {
    initMap(lat, lng);
  } else {
    map.setView([lat, lng], 15);
  }

  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#1a1a1a',
      color: '#fff',
      weight: 2,
      fillOpacity: 1
    }).addTo(map);
  }

  if (accuracyCircle) {
    accuracyCircle.setLatLng([lat, lng]).setRadius(acc);
  } else {
    accuracyCircle = L.circle([lat, lng], {
      radius: acc,
      color: '#1a1a1a',
      fillColor: '#1a1a1a',
      fillOpacity: 0.08,
      weight: 1
    }).addTo(map);
  }
}

function setStatus(msg, type) {
  const dot = document.getElementById('dot');
  dot.className = 'dot' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
  document.getElementById('status-text').textContent = msg;
}

function latLngToUSNG(lat, lng, precision) {
  precision = precision || 5;
  const NORTHING_OFFSET = 10000000;
  const k0 = 0.9996, a = 6378137, ecc = 0.081819191;
  const ecc2 = ecc*ecc, ecc4 = ecc2*ecc2, ecc6 = ecc4*ecc2;
  const e1sq = ecc2 / (1 - ecc2);
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;

  let zone = Math.floor((lng + 180) / 6) + 1;
  if (lat >= 56 && lat < 64 && lng >= 3 && lng < 12) zone = 32;
  if (lat >= 72 && lat < 84) {
    if (lng >= 0 && lng < 9) zone = 31;
    else if (lng >= 9 && lng < 21) zone = 33;
    else if (lng >= 21 && lng < 33) zone = 35;
    else if (lng >= 33 && lng < 42) zone = 37;
  }

  const letters = 'CDEFGHJKLMNPQRSTUVWXX';
  const latBand = letters[Math.floor((lat + 80) / 8)];
  const lngOriginRad = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;

  const N = a / Math.sqrt(1 - ecc2 * Math.sin(latRad)**2);
  const T = Math.tan(latRad)**2;
  const C = e1sq * Math.cos(latRad)**2;
  const A = Math.cos(latRad) * (lngRad - lngOriginRad);
  const M = a * (
    (1 - ecc2/4 - 3*ecc4/64 - 5*ecc6/256) * latRad
    - (3*ecc2/8 + 3*ecc4/32 + 45*ecc6/1024) * Math.sin(2*latRad)
    + (15*ecc4/256 + 45*ecc6/1024) * Math.sin(4*latRad)
    - (35*ecc6/3072) * Math.sin(6*latRad)
  );

  let easting = k0*N*(A + (1-T+C)*A**3/6 + (5-18*T+T*T+72*C-58*e1sq)*A**5/120) + 500000;
  let northing = k0*(M + N*Math.tan(latRad)*(A*A/2 + (5-T+9*C+4*C*C)*A**4/24 + (61-58*T+T*T+600*C-330*e1sq)*A**6/720));
  if (lat < 0) northing += NORTHING_OFFSET;

  easting = Math.round(easting);
  northing = Math.round(northing);

  const colIdx = Math.floor(easting / 100000);
  const rowIdx = Math.floor((northing % 2000000) / 100000);
  const colSets = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'];
  const rowSets = ['ABCDEFGHJKLMNPQRSTUV', 'FGHJKLMNPQRSTUVABCDE'];
  const colLetter = colSets[(zone - 1) % 3][colIdx - 1];
  const rowLetter = rowSets[(zone - 1) % 2][rowIdx % 20];

  const eStr = String(easting % 100000).padStart(5,'0').slice(0, precision);
  const nStr = String(northing % 100000).padStart(5,'0').slice(0, precision);
  const gzd = String(zone).padStart(2,'0') + latBand;
  return { usng: gzd + ' ' + colLetter + rowLetter + ' ' + eStr + ' ' + nStr, gzd };
}

function getLocation() {
  document.getElementById('hint-text').textContent = '';
  setStatus('Requesting location…', 'wait');

  if (!navigator.geolocation) {
    setStatus('Geolocation not supported by this browser.', 'err');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;
      const result = latLngToUSNG(lat, lng, 5);
      document.getElementById('usng-out').textContent = result.usng;
      document.getElementById('lat-out').textContent = lat.toFixed(6) + '°';
      document.getElementById('lng-out').textContent = lng.toFixed(6) + '°';
      document.getElementById('gzd-out').textContent = result.gzd;
      document.getElementById('acc-out').textContent = '±' + Math.round(acc) + ' m';
      setStatus('Location updated', 'ok');
      updateMap(lat, lng, acc);
    },
    function(err) {
      const msgs = {
        1: 'Permission denied — allow location access and try again.',
        2: 'Position unavailable — check your device location settings.',
        3: 'Request timed out — try again.'
      };
      setStatus(msgs[err.code] || 'Location error', 'err');
      if (err.code === 1) {
        document.getElementById('hint-text').textContent = 'Tip: tap the address bar and check site permissions.';
      }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

getLocation();
