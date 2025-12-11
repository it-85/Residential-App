import supabase from "../../../utils/supabase.js";
import { protectPage } from "../../../utils/auth-guard.js";

window.addEventListener("DOMContentLoaded", async () => {
  await protectPage();

  // make sure user is logged in
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    alert("Session expired. Please login again.");
    window.location.replace("../../login/index.html");
    // window.location.replace("/Residential-App/pages/login/index.html");
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
const alert_overlay = document.getElementById("alert_overlay");
const close_modal_button = document.getElementById("close_modal_button");
// const alert_type_val = document.getElementById("alert_type");
// const alert_date_val = document.getElementById("alert_date");
// const alert_time_val = document.getElementById("alert_time");
const alert_type_val = document.querySelectorAll(".alert-type");
const alert_date_val = document.querySelectorAll(".alert-date");
const alert_time_val = document.querySelectorAll(".alert-time");
const img_holder = document.getElementById("img_holder");
const img_counter = document.getElementById("img_counter");
const prev_img_button = document.getElementById("prev_img_button");
const next_img_button = document.getElementById("next_img_button");
const delete_button = document.getElementById("delete_button");
// const modal = document.getElementById("alert_modal");
// const alertTypeEl = document.getElementById("alert_type");
// const alertDateEl = document.getElementById("alert_date");
// const alertTimeEl = document.getElementById("alert_time");
// const alertImg = document.getElementById("alert_img");
// const imgPosition = document.getElementById("img_position");
// const prevImg = document.getElementById("prev_img");
// const nextImg = document.getElementById("next_img");
// const deleteAlert = document.getElementById("delete_alert");
// const closeBtn = document.getElementById("closeBtn");

// const historyTableBody = document.getElementById("history_body");
const history_list_container = document.getElementById("history_list_container");
const histTypeSelect = document.getElementById("histType");

// map container
const bfpMapContainer = document.getElementById("bfp_map");

// logout
logoutButton.addEventListener("click", async () => {
  const confirmLogout = confirm("Are you sure you want to logout?");
  if (confirmLogout) {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Logout failed: " + error.message);
    else window.location.replace("../../login/index.html");
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
    window.location.replace("../../login/index.html");
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
    // console.log("✅ Web Dashboard connected to MQTT");
    client.subscribe(`est/device/${deviceId}/heartbeat`);
    client.subscribe(`est/device/${deviceId}/readings`);
    client.subscribe(`est/device/${deviceId}/alerts`);
    // console.log("📡 Subscribed to:", `est/device/${deviceId}/#`);
  });

  // helpers
  function setStatusIndicator(online) {
    if (online) {
      statusIndicator.style.backgroundColor = "#33cc33";
      statusText.textContent = "Online";
    } else {
      let color = "#888888";
      temp_indicator.style.backgroundColor = color;
      tempValue.textContent = "----";

      humid_indicator.style.backgroundColor = color;
      humidValue.textContent = "----";

      aqi_indicator.style.backgroundColor = color;
      aqiValue.textContent = "----";

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
  history_list_container.innerHTML = "";

  if (!data || data.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No alerts yet.";
    p.style.fontStyle = "italic";
    p.style.fontSize = "1.4rem";
    history_list_container.appendChild(p);
    return;
  }

  data.forEach((alert) => {
    const list_item_container = document.createElement("div");
    list_item_container.id = "list_item_container";
    list_item_container.classList.add("list-item-container");

    const alert_item_type = document.createElement("p");
    alert_item_type.id = "alert_item_type";
    alert_item_type.classList.add("list-item-type");

    let alert_t = alert.alert_type;
    // console.log(alert);
    // if(alert.fire_severity == "High") {
      // alert_t = alert.alert_type + " (HIGH)";
    // }
    alert_item_type.textContent = alert_t;

    const alert_item_date = document.createElement("p");
    alert_item_date.id = "alert_item_date";
    alert_item_date.classList.add("list-item-date");

    const dt = alert.timestamp ? new Date(alert.timestamp + "Z") : new Date();

    alert_item_date.textContent = dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const alert_item_time = document.createElement("p");
    alert_item_time.id = "alert_item_time";
    alert_item_time.classList.add("list-item-time");

    alert_item_time.textContent = dt.toLocaleDateString();

    list_item_container.append(alert_item_type, alert_item_date, alert_item_time);
    list_item_container.addEventListener("click", () => openHistoryDetails(alert));
    history_list_container.appendChild(list_item_container);
  });
}

// ------------------------------------------------------------------
// Open modal for one alert (and load its images from Supabase)
// ------------------------------------------------------------------
async function openHistoryDetails(alertRow) {
  document.body.style.overflow = "hidden";
  alert_overlay.style.display = "flex";
  CURRENT_ALERT = alertRow;

  alert_type_val.forEach(e => { e.textContent = alertRow.alert_type; });
  const dt = alertRow.timestamp ? new Date(alertRow.timestamp + "Z") : new Date();
  alert_date_val.forEach(e => { 
    e.textContent = dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })});
  alert_time_val.forEach(e => {
    e.textContent = dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  })

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
    img_holder.src = "";
    img_counter.textContent = "0";
    return;
  }
  const imgData = CURRENT_IMAGES[pos - 1];
  img_holder.src = imgData.image_url; // you said image_url already works (public)
  img_counter.textContent = pos;
}

prev_img_button.addEventListener("click", () => {
  if (CURRENT_IMG_POS > 1) {
    CURRENT_IMG_POS--;
    showImage(CURRENT_IMG_POS);
  }
});

next_img_button.addEventListener("click", () => {
  if (CURRENT_IMG_POS < CURRENT_IMAGES.length) {
    CURRENT_IMG_POS++;
    showImage(CURRENT_IMG_POS);
  }
});

close_modal_button.addEventListener("click", () => {
  alert_overlay.style.display = "none";
  document.body.style.overflow = "auto";
});

window.addEventListener("click", (e) => {
  if (e.target === alert_overlay) {
    alert_overlay.style.display = "none";
    document.body.style.overflow = "auto";
  }
});

delete_button.addEventListener("click", async () => {
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
  alert_overlay.style.display = "none";
  document.body.style.overflow = "auto";
  CURRENT_ALERT = null;
});