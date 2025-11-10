import supabase from "../../../utils/supabase.js";
import { protectPage } from "../../../utils/auth-guard.js";

window.addEventListener("DOMContentLoaded", async () => {
  await protectPage();

  const { data } = await supabase.auth.getUser();
  const { data: establishment_user, error } = await supabase.from("establishment_users").select("email").eq("email", data.user.email);

  if(error) {
    alert(error);
    return;
  }

  if(establishment_user.length >= 1) {
    location.replace("../overview/index.html");
  }
});

const owner_first_name_input   = document.getElementById("owner_first_name");
const owner_last_name_input    = document.getElementById("owner_last_name");
const establishment_name_input = document.getElementById("establishment_name");
const contact_number_input     = document.getElementById("contact_number");
const country_input            = document.getElementById("country");
const province_input           = document.getElementById("province");
const municipality_input       = document.getElementById("municipality");
const submit_button            = document.getElementById("submit");

let latitude = undefined;
let longitude = undefined;

let map = L.map('map', {
    center: [0, 0],
    zoom: 13,
    worldCopyJump: false,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0
});

let invalidateTimeout;
map.on('zoomend moveend', () => {
  clearTimeout(invalidateTimeout);
  invalidateTimeout = setTimeout(() => {
    map.invalidateSize(); // Re-rendering the map to make performance good even in small screen sizes.
  }, 100);
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    noWrap: true,
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

map.fitBounds([[-90, -180], [90, 180]]);

let marker = null;
map.addEventListener("click", (e) => {
  // Export this function to edge function to prevent api key leak.
  const api_key = "pk.8329f7efe1c3c979a63e9e427efbffcc";

  fetch(`https://us1.locationiq.com/v1/reverse?key=${api_key}&lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
  .then(res => res.json())
  .then(data => {
    latitude = e.latlng.lat;
    longitude = e.latlng.lng;
    country_input.value = data.address.country;
    province_input.value = data.address.state || data.address.region;
    municipality_input.value = data.address.city || data.address.town || data.address.village;
  })
  .catch(err => console.error(err));

  if(!marker) {
    marker = L.marker(e.latlng, {draggable: true}).addTo(map);
  } else {
    marker.setLatLng(e.latlng);
  }
});

function checkInputNull(input) { return !input || input.length === 0; }

submit_button.addEventListener("click", async (e) => {
  e.preventDefault();

  const fn = owner_first_name_input.value.trim();
  if(checkInputNull(fn)) { 
    alert("Do not leave first name blank."); 
    return;
   }
  
  const ln = owner_last_name_input.value.trim();
  if(checkInputNull(ln)) { 
    alert("Do not leave last name blank."); 
    return;
  }

  const en = establishment_name_input.value.trim();
  if(checkInputNull(en)) { 
    alert("Do not leave establishment name blank."); 
    return;
  }

  const cn = contact_number_input.value.trim();
  if(checkInputNull(cn)) { 
    alert("Do not leave contact number blank."); 
    return;
  }

  const country = country_input.value.trim();
  const province = province_input.value.trim();
  const municipality = municipality_input.value.trim();
  if(
    checkInputNull(country) &&
    checkInputNull(province) &&
    checkInputNull(municipality) &&
    (!latitude && !longitude)
  ) { 
    alert("Pin your location on the map."); 
    return;
  }

  const { data, error } = await supabase.auth.getUser();
  
  if(error) {
    alert(error);
    return;
  }

  const id = data.user.id;
  const email = data.user.email;

  const { data1, error1 } = await supabase.from("establishment_users").insert([{
    id: id,
    email: email,
    owner_first_name: fn,
    owner_last_name: ln,
    establishment_name: en,
    contact_number: cn,
    country: country,
    province: province,
    municipality: municipality,
    latitude: latitude,
    longitude: longitude
  }]).select();

  if(error1) {
    alert(error1);
    return;
  }

  location.replace("../overview/index.html");
});