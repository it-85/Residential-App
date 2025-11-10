/*
import supabase from "../../../utils/supabase.js";
import { protectPage } from "../../../utils/auth-guard.js";

window.addEventListener("DOMContentLoaded", async () => {
  await protectPage();

  const { data } = await supabase.auth.getUser();
  const { data: establishment_user, error } = await supabase
    .from("establishment_users")
    .select("email")
    .eq("email", data.user.email);

  if (error) {
    alert(error.message);
    return;
  }

  if (establishment_user.length === 0) {
    location.replace("../input_credentials/index.html");
  }
});

const statusIndicator = document.getElementById("status-indicatorr");
const statusText = document.getElementById("status-text");
const lastActiveElement = document.getElementById("last-active");

const tempValue = document.getElementById("temp_value");
const temp_indicator = document.getElementById("temp_indicator");
const humidValue = document.getElementById("humid_value");
const humid_indicator = document.getElementById("humid_indicator");
const aqiValue = document.getElementById("aqi_value");
const aqi_indicator = document.getElementById("aqi_indicator");

const logoutButton = document.getElementById("logout-button");
const closeBtn = document.getElementById("closeBtn");

// ========== LOGOUT ========== //
logoutButton.addEventListener("click", async () => {
  const confirmLogout = confirm("Are you sure you want to logout?");
  if (confirmLogout) {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Logout failed: " + error.message);
    else window.location.replace("/pages/login/index.html");
  }
});

// ========== USER & DEVICE ========== //
async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    alert(error.message);
    location.replace("/pages/login/index.html");
  }
  return data.user;
}

async function getDeviceId(user) {
  const { data: device, error } = await supabase
    .from("establishments_devices")
    .select("id")
    .eq("est_user_id", user.id);

  if (error) {
    alert(error.message);
    location.replace("/pages/login/index.html");
  }

  if(device.length === 0) {
    alert("No Device Yet.");
    return;
  }
  
  return device[0]?.id;
}

const user = await getUser();
const device = await getDeviceId(user);

if(device) {
  // ========== MQTT CONNECTION ========== //
  const brokerUrl =
    "wss://f1b5b539bd3f4ade802600d72948b4f5.s1.eu.hivemq.cloud:8884/mqtt";

  const options = {
    username: "smokeandfiremqtt",
    password: "Smoke&Fire.MQTT.W/HiveMQ12345",
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
  };

  const client = mqtt.connect(brokerUrl, options);

  client.on("connect", () => {
    console.log("✅ Web Dashboard connected to MQTT");

    client.subscribe(`est/device/${device}/heartbeat`);
    client.subscribe(`est/device/${device}/readings`);
    client.subscribe(`est/device/${device}/alerts`);

    console.log("📡 Subscribed to:", `est/device/${device}/#`);
  });

  // ========== COLOR HELPERS ========== //
  function setStatusIndicator(online) {
    if (online) {
      statusIndicator.style.backgroundColor = "#33cc33"; // green
      statusText.textContent = "Online";
    } else {
      statusIndicator.style.backgroundColor = "#888888"; // gray
      statusText.textContent = "Offline";
    }
  }

  function setTempColor(temp) {
    if (temp < 25) temp_indicator.style.backgroundColor = "#3399ff"; // cool blue
    else if (temp < 35) temp_indicator.style.backgroundColor = "#33cc33"; // normal green
    else if (temp < 40) temp_indicator.style.backgroundColor = "#ffcc00"; // warm yellow
    else temp_indicator.style.backgroundColor = "#ff3333"; // hot red
  }

  function setHumidColor(humid) {
    if (humid < 30) humid_indicator.style.backgroundColor = "#ff9933"; // dry orange
    else if (humid <= 60) humid_indicator.style.backgroundColor = "#33cc33"; // normal green
    else humid_indicator.style.backgroundColor = "#3399ff"; // humid blue
  }

  function setAqiColor(aqi) {
    if (aqi <= 50) aqi_indicator.style.backgroundColor = "#33cc33"; // good
    else if (aqi <= 100) aqi_indicator.style.backgroundColor = "#ffcc00"; // moderate
    else if (aqi <= 150) aqi_indicator.style.backgroundColor = "#ff9933"; // unhealthy (sensitive)
    else if (aqi <= 200) aqi_indicator.style.backgroundColor = "#ff3333"; // unhealthy
    else if (aqi <= 300) aqi_indicator.style.backgroundColor = "#9966cc"; // very unhealthy
    else aqi_indicator.style.backgroundColor = "#660000"; // hazardous
  }

  // ========== MESSAGE HANDLING ========== //
  let lastHeartbeat = Date.now();
  const HEARTBEAT_TIMEOUT = 10000; // 10 seconds

  setInterval(() => {
    if (Date.now() - lastHeartbeat > HEARTBEAT_TIMEOUT) {
      setStatusIndicator(false); // offline if no heartbeat
    }
  }, 5000);

  client.on("message", (topic, payload) => {
    let message = payload.toString();
    try {
      message = JSON.parse(payload.toString());
    } catch {
      return console.warn("Invalid JSON:", payload.toString());
    }

    if (topic.endsWith("/heartbeat")) {
      lastHeartbeat = Date.now();
      setStatusIndicator(true);
      lastActiveElement.textContent = new Date().toLocaleString();
    }

    else if (topic.endsWith("/readings")) {
      const { temperature, humidity, aqi } = message;

      tempValue.textContent = temperature + "°C";
      humidValue.textContent = humidity + "%RH";
      aqiValue.textContent = aqi;

      setTempColor(temperature);
      setHumidColor(humidity);
      setAqiColor(aqi);
    }

    else if (topic.endsWith("/alerts")) {
      console.log(message.message);
      alertSwitchCase(message.message);
    }
  });

  // ========== ALERTS ========== //
  function alertSwitchCase(alerts) {
    switch (alerts) {
      case "1":
        alert("Tampering Detected!");
        break;
      case "2":
        alert("Vape Detected!");
        break;
      case "3":
        alert("Cigarette Detected!");
        break;
      case "4":
        alert("Fire Detected!");
        break;
      default:
        console.log("No alert detected.");
        break;
    }
  }
}

// ========== CLOSE MODAL ========== //
closeBtn.addEventListener("click", function () {
  modal.style.display = "none";
});

// ========== HISTORY TABLE RENDERING (unchanged below) ========== //
const history_data = [
  {
    alert_id: "alert01",
    alert_type: "burning",
    establishment_name: "Blessed David Dorm",
    date: "2025-10-25",
    time: "16:40:00",
  },
  {
    alert_id: "alert02",
    alert_type: "vape",
    establishment_name: "Kobe's Dorm",
    date: "2025-10-22",
    time: "18:22:00",
  },
];

const history_images = [
  { alert_id: "alert01", img_url: "https://picsum.photos/seed/1/600/400", pos: 1 },
  { alert_id: "alert01", img_url: "https://picsum.photos/seed/2/600/400", pos: 2 },
  { alert_id: "alert02", img_url: "https://picsum.photos/seed/3/600/400", pos: 1 },
  { alert_id: "alert02", img_url: "https://picsum.photos/seed/4/600/400", pos: 2 },
];

const modal = document.getElementById("alert_modal");
const alertType = document.getElementById("alert_type");
const alertDate = document.getElementById("alert_date");
const alertTime = document.getElementById("alert_time");
const alertImg = document.getElementById("alert_img");
const imgPosition = document.getElementById("img_position");
const prevImg = document.getElementById("prev_img");
const nextImg = document.getElementById("next_img");
const deleteAlert = document.getElementById("delete_alert");
const historyTable = document
  .getElementById("history_table")
  .querySelector("tbody");
const historyTableBody = document.getElementById("history_body");

let currentImages = [];
let currentPos = 1;

function renderHistoryTable(data) {
  historyTable.innerHTML = "";
  data.forEach((item) => {
    const tr = document.createElement("tr");
    tr.classList.add("history-row");

    const nameCell = document.createElement("td");
    nameCell.textContent = item.establishment_name;

    const timeCell = document.createElement("td");
    timeCell.textContent = item.time;

    const dateCell = document.createElement("td");
    dateCell.textContent = item.date;

    const arrowCell = document.createElement("td");
    arrowCell.textContent = ">";

    tr.append(nameCell, timeCell, dateCell, arrowCell);
    tr.addEventListener("click", () => openHistoryDetails(item));
    historyTable.appendChild(tr);
  });
}

function openHistoryDetails(historyItem) {
  modal.style.display = "flex";
  alertType.textContent =
    historyItem.alert_type.charAt(0).toUpperCase() +
    historyItem.alert_type.slice(1);
  alertDate.textContent = new Date(historyItem.date).toDateString();
  alertTime.textContent = historyItem.time;

  currentImages = history_images.filter(
    (img) => img.alert_id === historyItem.alert_id
  );
  currentPos = 1;
  showImage(currentPos);
}

history_data.forEach((item) => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${item.name}</td>
    <td>${item.time}</td>
    <td>${new Date(item.date).toDateString()}</td>
    <td class="right-arrow">&gt;</td>
  `;
  tr.addEventListener("click", () => openHistoryDetails(item));
  historyTableBody.appendChild(tr);
});

function showImage(pos) {
  const imgData = currentImages[pos - 1];
  if (imgData) {
    alertImg.src = imgData.img_url;
    imgPosition.textContent = `${pos} / ${currentImages.length}`;
  }
}

prevImg.addEventListener("click", () => {
  if (currentPos > 1) {
    currentPos--;
    showImage(currentPos);
  }
});

nextImg.addEventListener("click", () => {
  if (currentPos < currentImages.length) {
    currentPos++;
    showImage(currentPos);
  }
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

deleteAlert.addEventListener("click", () => {
  const confirmDelete = confirm("Are you sure you want to delete this history?");
  if (confirmDelete) {
    alert("This alert history deleted.");
    modal.style.display = "none";
  }
});

renderHistoryTable(history_data);
*/
/*
import supabase from "../../../utils/supabase.js";
import { protectPage } from "../../../utils/auth-guard.js";

window.addEventListener("DOMContentLoaded", async () => {
  await protectPage();

  // just to make sure the establishment_user exists
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    alert("Session expired. Please login again.");
    window.location.replace("/pages/login/index.html");
    return;
  }

  const userEmail = authData.user.email;

  const { data: estUsers, error: estErr } = await supabase
    .from("establishment_users")
    .select("id, email")
    .eq("email", userEmail);

  if (estErr) {
    alert(estErr.message);
    return;
  }

  // if no row in establishment_users yet, redirect like you did
  if (!estUsers || estUsers.length === 0) {
    window.location.replace("../input_credentials/index.html");
    return;
  }
});

// DOM refs
const statusIndicator = document.getElementById("status-indicatorr");
const statusText = document.getElementById("status-text");
const lastActiveElement = document.getElementById("last-active");

const tempValue = document.getElementById("temp_value");
const temp_indicator = document.getElementById("temp_indicator");
const humidValue = document.getElementById("humid_value");
const humid_indicator = document.getElementById("humid_indicator");
const aqiValue = document.getElementById("aqi_value");
const aqi_indicator = document.getElementById("aqi_indicator");

const logoutButton = document.getElementById("logout-button");

// modal + history DOM
const modal = document.getElementById("alert_modal");
const alertTypeEl = document.getElementById("alert_type");
const alertDateEl = document.getElementById("alert_date");
const alertTimeEl = document.getElementById("alert_time");
const alertImg = document.getElementById("alert_img");
const imgPosition = document.getElementById("img_position");
const prevImg = document.getElementById("prev_img");
const nextImg = document.getElementById("next_img");
const deleteAlert = document.getElementById("delete_alert");
const closeBtn = document.getElementById("closeBtn");

const historyTableBody = document.getElementById("history_body");
const histTypeSelect = document.getElementById("histType");

// NEW: map container
const bfpMapContainer = document.getElementById("bfp_map");

// ========== LOGOUT ==========
logoutButton.addEventListener("click", async () => {
  const confirmLogout = confirm("Are you sure you want to logout?");
  if (confirmLogout) {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Logout failed: " + error.message);
    else window.location.replace("/pages/login/index.html");
  }
});

// ------------------------------------------------------------------
// 1) Fetch current auth user
// 2) Get establishment_user by email
// 3) Get ALL devices owned by that establishment_user
// 4) Get ALL alerts for those devices
// 5) Render table + connect filter
// ------------------------------------------------------------------
let ALL_ALERTS = [];        // raw alerts from DB
let CURRENT_IMAGES = [];    // images for the modal
let CURRENT_IMG_POS = 1;    // current img index in the modal

// NEW: we'll keep these to use for the map
let CURRENT_EST_USER = null;
let CURRENT_BFP_USER = null;

async function bootstrap() {
  // 1) get auth user
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    alert("Session expired. Please login again.");
    window.location.replace("/pages/login/index.html");
    return;
  }

  const userEmail = authData.user.email;

  // 2) get establishment_user
  const { data: estUsers, error: estErr } = await supabase
    .from("establishment_users")
    .select("id, email")
    .eq("email", userEmail);

  if (estErr) {
    alert(estErr.message);
    return;
  }

  if (!estUsers || estUsers.length === 0) {
    window.location.replace("../input_credentials/index.html");
    return;
  }

  // ✅ define it here
  const estUser = estUsers[0];
  CURRENT_EST_USER = estUser;

  // 3) get ALL devices of this establishment_user
  const { data: devices, error: devErr } = await supabase
    .from("establishments_devices")
    .select("id")
    .eq("est_user_id", estUserId);

  if (devErr) {
    alert(devErr.message);
    return;
  }

  const deviceIds = (devices || []).map((d) => d.id);

  // 4) get ALL alerts for those device ids
  let fetchedAlerts = [];
  if (deviceIds.length > 0) {
    const { data: alerts, error: alertsErr } = await supabase
      .from("alerts")
      .select("id, device_id, alert_type, timestamp")
      .in("device_id", deviceIds)
      .order("timestamp", { ascending: false });

    if (alertsErr) {
      console.error(alertsErr);
      alert("Failed to load alerts.");
    } else {
      fetchedAlerts = alerts;
    }
  }

  ALL_ALERTS = fetchedAlerts;

  // initial render
  renderHistoryTable(ALL_ALERTS);

  // connect filter
  histTypeSelect.addEventListener("change", () => {
    const selected = histTypeSelect.value;
    if (selected === "all") {
      renderHistoryTable(ALL_ALERTS);
    } else {
      const filtered = ALL_ALERTS.filter(
        (a) => (a.alert_type || "").toLowerCase() === selected.toLowerCase()
      );
      renderHistoryTable(filtered);
    }
  });

  // --- MQTT: subscribe to the first device (if any) like your old code ---
  if (deviceIds.length > 0) {
    setupMQTT(deviceIds[0]);
  }


  // 5) NEW: find BFP station in same country/province/municipality
  await loadBfpAndMap(estUser);
}

// call it
await bootstrap();

async function loadBfpAndMap(estUser) {
  // query bfp_users
  const { data: bfpStations, error: bfpErr } = await supabase
    .from("bfp_users")
    .select(
      "id, fire_station_name, country, province, municipality, latitude, longitude"
    )
    .eq("country", estUser.country)
    .eq("province", estUser.province)
    .eq("municipality", estUser.municipality)
    .limit(1);

  if (bfpErr) {
    console.error("Error fetching BFP station:", bfpErr);
    return;
  }

  if (!bfpStations || bfpStations.length === 0) {
    console.warn("No BFP station found for this location.");
    return;
  }

  const bfp = bfpStations[0];
  CURRENT_BFP_USER = bfp;

  // create the map
  if (bfpMapContainer) {
    initBfpMap(estUser, bfp);
  }
}

let bfpMap = null;
let bfpRouteLayer = null;

function initBfpMap(estUser, bfp) {
  // center: midpoint
  const estLat = estUser.latitude;
  const estLng = estUser.longitude;
  const bfpLat = bfp.latitude;
  const bfpLng = bfp.longitude;

  if (estLat == null || estLng == null || bfpLat == null || bfpLng == null) {
    console.warn("Missing coordinates for map.");
    return;
  }

  // init only once
  if (!bfpMap) {
    bfpMap = L.map("bfp_map").setView([estLat, estLng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(bfpMap);
  }

  // markers
  const estMarker = L.marker([estLat, estLng]).addTo(bfpMap);
  estMarker.bindPopup("Your Establishment").openPopup();

  const bfpMarker = L.marker([bfpLat, bfpLng]).addTo(bfpMap);
  bfpMarker.bindPopup(bfp.fire_station_name || "BFP Station");

  // fit bounds
  const group = new L.featureGroup([estMarker, bfpMarker]);
  bfpMap.fitBounds(group.getBounds().pad(0.25));

  // call OSRM
  fetchOsrmRoute(estLng, estLat, bfpLng, bfpLat);
}

async function fetchOsrmRoute(fromLng, fromLat, toLng, toLat) {
  // OSRM wants: /route/v1/driving/{fromLng},{fromLat};{toLng},{toLat}
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn("No route found.");
      return;
    }

    const route = data.routes[0].geometry;

    // remove previous
    if (bfpRouteLayer) {
      bfpMap.removeLayer(bfpRouteLayer);
    }

    bfpRouteLayer = L.geoJSON(route, {
      style: {
        color: "#007bff",
        weight: 4,
      },
    }).addTo(bfpMap);

    // zoom to route
    bfpMap.fitBounds(bfpRouteLayer.getBounds().pad(0.2));
  } catch (err) {
    console.error("Error fetching OSRM route:", err);
  }
}
*/
import supabase from "../../../utils/supabase.js";
import { protectPage } from "../../../utils/auth-guard.js";

window.addEventListener("DOMContentLoaded", async () => {
  await protectPage();

  // make sure user is logged in
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    alert("Session expired. Please login again.");
    window.location.replace("/pages/login/index.html");
    return;
  }

  const userEmail = authData.user.email;

  // quick existence check (can stay minimal here)
  const { data: estUsers, error: estErr } = await supabase
    .from("establishment_users")
    .select("id")
    .eq("email", userEmail);

  if (estErr) {
    alert(estErr.message);
    return;
  }

  if (!estUsers || estUsers.length === 0) {
    window.location.replace("../input_credentials/index.html");
    return;
  }
});

let CURRENT_ALERT = null;

// DOM refs
const statusIndicator = document.getElementById("status_indicator");
const statusText = document.getElementById("status_text");
const lastActiveElement = document.getElementById("last_active");

const tempValue = document.getElementById("temp_value");
const temp_indicator = document.getElementById("temp_indicator");
const humidValue = document.getElementById("humid_value");
const humid_indicator = document.getElementById("humid_indicator");
const aqiValue = document.getElementById("aqi_value");
const aqi_indicator = document.getElementById("aqi_indicator");

const logoutButton = document.getElementById("logout-button");

// modal + history DOM
const modal = document.getElementById("alert_modal");
const alertTypeEl = document.getElementById("alert_type");
const alertDateEl = document.getElementById("alert_date");
const alertTimeEl = document.getElementById("alert_time");
const alertImg = document.getElementById("alert_img");
const imgPosition = document.getElementById("img_position");
const prevImg = document.getElementById("prev_img");
const nextImg = document.getElementById("next_img");
const deleteAlert = document.getElementById("delete_alert");
const closeBtn = document.getElementById("closeBtn");

const historyTableBody = document.getElementById("history_body");
const histTypeSelect = document.getElementById("histType");

// map container
const bfpMapContainer = document.getElementById("bfp_map");

// logout
logoutButton.addEventListener("click", async () => {
  const confirmLogout = confirm("Are you sure you want to logout?");
  if (confirmLogout) {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Logout failed: " + error.message);
    else window.location.replace("/pages/login/index.html");
  }
});

let bfpMap = null;
let bfpRouteLayer = null;

let ALL_ALERTS = [];
let CURRENT_IMAGES = [];
let CURRENT_IMG_POS = 1;
let CURRENT_EST_USER = null;
let CURRENT_BFP_USER = null;

async function bootstrap() {
  // 1) get auth user
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    alert("Session expired. Please login again.");
    window.location.replace("/pages/login/index.html");
    return;
  }

  const userEmail = authData.user.email;

  // 2) get full establishment_user (we need location + coords!)
  const { data: estUsers, error: estErr } = await supabase
    .from("establishment_users")
    .select("id, email, country, province, municipality, latitude, longitude")
    .eq("email", userEmail);

  if (estErr) {
    alert(estErr.message);
    return;
  }

  if (!estUsers || estUsers.length === 0) {
    window.location.replace("../input_credentials/index.html");
    return;
  }

  const estUser = estUsers[0];
  CURRENT_EST_USER = estUser;

  // 3) get ALL devices of this establishment_user
  // ❗ this was the line causing the error
  const { data: devices, error: devErr } = await supabase
    .from("establishments_devices")
    .select("id")
    .eq("est_user_id", estUser.id);   // <-- fixed here

  if (devErr) {
    alert(devErr.message);
    return;
  }

  const deviceIds = (devices || []).map((d) => d.id);

  // 4) get ALL alerts for those device ids
  let fetchedAlerts = [];
  if (deviceIds.length > 0) {
    const { data: alerts, error: alertsErr } = await supabase
      .from("alerts")
      .select("*")
      .in("device_id", deviceIds)
      .order("timestamp", { ascending: false });

    if (alertsErr) {
      console.error(alertsErr);
      alert("Failed to load alerts.");
    } else {
      fetchedAlerts = alerts;
    }
  }

  ALL_ALERTS = fetchedAlerts;
  renderHistoryTable(ALL_ALERTS);

  // filter
  histTypeSelect.addEventListener("change", () => {
    const selected = histTypeSelect.value;
    if (selected === "all") {
      renderHistoryTable(ALL_ALERTS);
    } else {
      const filtered = ALL_ALERTS.filter(
        (a) => (a.alert_type || "").toLowerCase() === selected.toLowerCase()
      );
      renderHistoryTable(filtered);
    }
  });

  // MQTT for first device
  if (deviceIds.length > 0) {
    setupMQTT(deviceIds[0]);
  }

  // 5) load BFP and draw map
  await loadBfpAndMap(estUser);
}

await bootstrap();

async function loadBfpAndMap(estUser) {
  const { data: bfpStations, error: bfpErr } = await supabase
    .from("bfp_users")
    .select(
      "id, fire_station_name, email, contact_number, country, province, municipality, latitude, longitude"
    )
    .eq("country", estUser.country)
    .eq("province", estUser.province)
    .eq("municipality", estUser.municipality)
    .limit(1);

  if (bfpErr) {
    console.error("Error fetching BFP station:", bfpErr);
    return;
  }

  if (!bfpStations || bfpStations.length === 0) {
    console.warn("No BFP station found for this location.");
    return;
  }

  const bfp = bfpStations[0];
  CURRENT_BFP_USER = bfp;

  if (bfpMapContainer) {
    initBfpMap(estUser, bfp);
  }
}

function initBfpMap(estUser, bfp) {
  const estLat = estUser.latitude;
  const estLng = estUser.longitude;
  const bfpLat = bfp.latitude;
  const bfpLng = bfp.longitude;

  if (estLat == null || estLng == null || bfpLat == null || bfpLng == null) {
    console.warn("Missing coordinates for map.");
    return;
  }

  const stationName = bfp.fire_station_name || "BFP Station";
  const stationEmail = bfp.email || "N/A";
  const stationContact = bfp.contact_number || "N/A";

  // 1. init map (allow drag + zoom)
  if (!bfpMap) {
    bfpMap = L.map("bfp_map", {
      // user can still zoom
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([estLat, estLng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(bfpMap);
  }

  // 2. add markers
  const estMarker = L.marker([estLat, estLng]).addTo(bfpMap);
  estMarker.bindPopup("Your Establishment");

  const bfpMarker = L.marker([bfpLat, bfpLng]).addTo(bfpMap);
  bfpMarker.bindPopup(
    `
    <strong>${stationName}</strong><br>
    Email: ${stationEmail}<br>
    Contact: ${stationContact}
    `
  );

  // 3. fit to both markers
  const group = new L.featureGroup([estMarker, bfpMarker]);
  const bounds = group.getBounds().pad(0.25); // little extra space
  bfpMap.fitBounds(bounds);

  // 4. 🔒 limit how far user can move
  // this keeps the user inside the area around the two points
  bfpMap.setMaxBounds(bounds.pad(0.5)); // increase 0.5 if you want a looser area
  bfpMap.options.maxBoundsViscosity = 1.0; // 1.0 = “sticky” edge

  // 5. draw route
  fetchOsrmRoute(estLng, estLat, bfpLng, bfpLat);
}


async function fetchOsrmRoute(fromLng, fromLat, toLng, toLat) {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn("No route found.");
      return;
    }

    const route = data.routes[0].geometry;

    if (bfpRouteLayer) {
      bfpMap.removeLayer(bfpRouteLayer);
    }

    bfpRouteLayer = L.geoJSON(route, {
      style: {
        color: "#007bff",
        weight: 4,
      },
    }).addTo(bfpMap);

    bfpMap.fitBounds(bfpRouteLayer.getBounds().pad(0.2));
  } catch (err) {
    console.error("Error fetching OSRM route:", err);
  }
}

// ------------------------------------------------------------------
// MQTT setup (kept from your code)
// ------------------------------------------------------------------
function setupMQTT(deviceId) {
  const brokerUrl =
    "wss://f1b5b539bd3f4ade802600d72948b4f5.s1.eu.hivemq.cloud:8884/mqtt";

  const options = {
    username: "smokeandfiremqtt",
    password: "Smoke&Fire.MQTT.W/HiveMQ12345",
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
  };

  const client = mqtt.connect(brokerUrl, options);

  client.on("connect", () => {
    console.log("✅ Web Dashboard connected to MQTT");
    client.subscribe(`est/device/${deviceId}/heartbeat`);
    client.subscribe(`est/device/${deviceId}/readings`);
    client.subscribe(`est/device/${deviceId}/alerts`);
    console.log("📡 Subscribed to:", `est/device/${deviceId}/#`);
  });

  // helpers
  function setStatusIndicator(online) {
    if (online) {
      statusIndicator.style.backgroundColor = "#33cc33";
      statusText.textContent = "Online";
    } else {
      statusIndicator.style.backgroundColor = "#888888";
      statusText.textContent = "Offline";
    }
  }

  function setTempColor(temp) {
    if (temp < 25) temp_indicator.style.backgroundColor = "#3399ff";
    else if (temp < 35) temp_indicator.style.backgroundColor = "#33cc33";
    else if (temp < 40) temp_indicator.style.backgroundColor = "#ffcc00";
    else temp_indicator.style.backgroundColor = "#ff3333";
  }

  function setHumidColor(humid) {
    if (humid < 30) humid_indicator.style.backgroundColor = "#ff9933";
    else if (humid <= 60) humid_indicator.style.backgroundColor = "#33cc33";
    else humid_indicator.style.backgroundColor = "#3399ff";
  }

  function setAqiColor(aqi) {
    if (aqi <= 50) aqi_indicator.style.backgroundColor = "#33cc33";
    else if (aqi <= 100) aqi_indicator.style.backgroundColor = "#ffcc00";
    else if (aqi <= 150) aqi_indicator.style.backgroundColor = "#ff9933";
    else if (aqi <= 200) aqi_indicator.style.backgroundColor = "#ff3333";
    else if (aqi <= 300) aqi_indicator.style.backgroundColor = "#9966cc";
    else aqi_indicator.style.backgroundColor = "#660000";
  }

  let lastHeartbeat = Date.now();
  const HEARTBEAT_TIMEOUT = 10000;

  setInterval(() => {
    if (Date.now() - lastHeartbeat > HEARTBEAT_TIMEOUT) {
      setStatusIndicator(false);
    }
  }, 5000);

  client.on("message", (topic, payload) => {
    let message = payload.toString();
    try {
      message = JSON.parse(payload.toString());
    } catch {
      // not json
    }

    if (topic.endsWith("/heartbeat")) {
      lastHeartbeat = Date.now();
      setStatusIndicator(true);
      lastActiveElement.textContent = new Date().toLocaleString();
    } else if (topic.endsWith("/readings")) {
      const { temperature, humidity, aqi } = message;
      tempValue.textContent = temperature + "°C";
      humidValue.textContent = humidity + "%RH";
      aqiValue.textContent = aqi;
      setTempColor(temperature);
      setHumidColor(humidity);
      setAqiColor(aqi);
    } else if (topic.endsWith("/alerts")) {
      console.log(message.message);
      alertSwitchCase(message.message);
    }
  });

  function alertSwitchCase(alerts) {
    switch (alerts) {
      case "1":
        alert("Tampering Detected!");
        break;
      case "2":
        alert("Vape Detected!");
        break;
      case "3":
        alert("Cigarette Detected!");
        break;
      case "4":
        alert("Fire Detected!");
        break;
      default:
        console.log("No alert detected.");
        break;
    }
  }
}

// ------------------------------------------------------------------
// Render history table (DB data now)
// ------------------------------------------------------------------
function renderHistoryTable(data) {
  historyTableBody.innerHTML = "";

  if (!data || data.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No alerts yet.";
    tr.appendChild(td);
    historyTableBody.appendChild(tr);
    return;
  }

  data.forEach((alert) => {
    const tr = document.createElement("tr");
    tr.classList.add("history-row");

    const typeCell = document.createElement("td");
    let alert_t = alert.alert_type;
    console.log(alert);
    if(alert.fire_severity == "High") {
      alert_t = alert.alert_type + " (HIGH)";
    }
    typeCell.textContent = alert_t;

    // timestamp from DB is in UTC (no tz) -> add 'Z' so Date treats it as UTC
    const dt = alert.timestamp ? new Date(alert.timestamp + "Z") : new Date();

    const timeCell = document.createElement("td");
    timeCell.textContent = dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const dateCell = document.createElement("td");
    dateCell.textContent = dt.toLocaleDateString();

    const arrowCell = document.createElement("td");
    arrowCell.textContent = ">";

    tr.append(typeCell, timeCell, dateCell, arrowCell);

    // clicking a row -> open modal and load images
    tr.addEventListener("click", () => openHistoryDetails(alert));

    historyTableBody.appendChild(tr);
  });
}

// ------------------------------------------------------------------
// Open modal for one alert (and load its images from Supabase)
// ------------------------------------------------------------------
async function openHistoryDetails(alertRow) {
  modal.style.display = "flex";
  CURRENT_ALERT = alertRow;

  alertTypeEl.textContent = alertRow.alert_type;
  const dt = alertRow.timestamp ? new Date(alertRow.timestamp + "Z") : new Date();
  alertDateEl.textContent = dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  alertTimeEl.textContent = dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // fetch images for this alert
  const { data: images, error: imgErr } = await supabase
    .from("alert_images")
    .select("image_url, position")
    .eq("alert_id", alertRow.id)
    .order("position", { ascending: true });

  if (imgErr) {
    console.error(imgErr);
    CURRENT_IMAGES = [];
  } else {
    CURRENT_IMAGES = images || [];
  }

  CURRENT_IMG_POS = 1;
  showImage(CURRENT_IMG_POS);
}

function showImage(pos) {
  if (!CURRENT_IMAGES || CURRENT_IMAGES.length === 0) {
    alertImg.src = "";
    imgPosition.textContent = "0 / 0";
    return;
  }
  const imgData = CURRENT_IMAGES[pos - 1];
  alertImg.src = imgData.image_url; // you said image_url already works (public)
  imgPosition.textContent = `${pos} / ${CURRENT_IMAGES.length}`;
}

prevImg.addEventListener("click", () => {
  if (CURRENT_IMG_POS > 1) {
    CURRENT_IMG_POS--;
    showImage(CURRENT_IMG_POS);
  }
});

nextImg.addEventListener("click", () => {
  if (CURRENT_IMG_POS < CURRENT_IMAGES.length) {
    CURRENT_IMG_POS++;
    showImage(CURRENT_IMG_POS);
  }
});

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

deleteAlert.addEventListener("click", async () => {
  if (!CURRENT_ALERT) return;

  const confirmDelete = confirm(
    "Delete this alert and its images from storage?"
  );
  if (!confirmDelete) return;

  // 1) get all image rows for this alert
  const { data: imageRows, error: imgFetchErr } = await supabase
    .from("alert_images")
    .select("image_url")
    .eq("alert_id", CURRENT_ALERT.id);

  if (imgFetchErr) {
    console.error("Failed to fetch alert images before delete:", imgFetchErr);
    alert("Failed to fetch alert images. Delete aborted.");
    return;
  }

  // 2) turn public URLs into storage paths
  const pathsToDelete = (imageRows || [])
    .map((row) => {
      const url = row.image_url;
      if (!url) return null;

      // we know the pattern now:
      // .../public/alert_images/<FILE_NAME>
      const marker = "/alert_images/";
      const idx = url.indexOf(marker);
      if (idx === -1) return null; // safety

      // this gives: alert_08b3....jpg
      return url.substring(idx + marker.length);
    })
    .filter(Boolean); // remove nulls

  // 3) delete files from bucket
  if (pathsToDelete.length > 0) {
    const { error: storageErr } = await supabase.storage
      .from("alert_images")
      .remove(pathsToDelete);

    if (storageErr) {
      console.error("Failed to delete storage files:", storageErr);
      // we can still continue to delete the DB alert so UI stays clean
    }
  }

  // 4) delete alert row itself -> cascades to alert_images table rows
  const { error: alertDelErr } = await supabase
    .from("alerts")
    .delete()
    .eq("id", CURRENT_ALERT.id);

  if (alertDelErr) {
    console.error("Delete alert failed:", alertDelErr);
    alert("Failed to delete alert: " + alertDelErr.message);
    return;
  }

  // 5) update UI
  ALL_ALERTS = ALL_ALERTS.filter((a) => a.id !== CURRENT_ALERT.id);
  renderHistoryTable(ALL_ALERTS);
  modal.style.display = "none";
  CURRENT_ALERT = null;
});