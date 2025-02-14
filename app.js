// app.js
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('get-location').addEventListener('click', getLocation);
});

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, showError);
  } else {
    document.getElementById("output").innerHTML = "Geolocation is not supported by this browser.";
  }
}

function showPosition(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const usngCoord = USNG.LLtoUSNG(lat, lon, 5);
  document.getElementById("output").innerHTML = `Latitude: ${lat}<br>Longitude: ${lon}<br>USNG: ${usngCoord}`;
}

function showError(error) {
  const output = document.getElementById("output");
  switch (error.code) {
    case error.PERMISSION_DENIED:
      output.innerHTML = "User denied the request for Geolocation.";
      break;
    case error.POSITION_UNAVAILABLE:
      output.innerHTML = "Location information is unavailable.";
      break;
    case error.TIMEOUT:
      output.innerHTML = "The request to get user location timed out.";
      break;
    case error.UNKNOWN_ERROR:
      output.innerHTML = "An unknown error occurred.";
      break;
  }
}
