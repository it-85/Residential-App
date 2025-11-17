import supabase from "../../../utils/supabase.js";
import { protectPage } from "../../../utils/auth-guard.js";

window.addEventListener("DOMContentLoaded", async () => {
  await protectPage();

  const { data } = await supabase.auth.getUser();
  const { data: establishment_user, error } = await supabase.from("establishment_users").select("email").eq("email", data.user.email);

  if(error) {
    alert(error.message);
    return;
  }

  if(establishment_user.length === 0) {
    location.replace("../input_credentials/index.html");
  }

  let auth_user_email = data.user.email;

  await getUserCreds(auth_user_email);
});

const name               = document.getElementById("name");
const establishment_name = document.getElementById("establishment_name");
const contact_number     = document.getElementById("contact_number");
const email              = document.getElementById("email");
const country            = document.getElementById("country");
const province           = document.getElementById("province");
const municipality       = document.getElementById("municipality");

const overlay               = document.getElementById("overlay");
const change_name_modal     = document.getElementById("changeNameModal");
const change_email_modal    = document.getElementById("changeEmailModal");
const change_est_name_modal = document.getElementById("changeEstNameModal");
const change_p_num_modal    = document.getElementById("changePNumModal");
const change_pass_modal     = document.getElementById("changePassModal");
const change_location_modal = document.getElementById("changeLocationModal");

const edit_name_button               = document.getElementById("edit_name_button");
// const edit_email_button              = document.getElementById("edit_email_button");
const edit_establishment_name_button = document.getElementById("edit_establishment_name_button");
const edit_contact_number_button     = document.getElementById("edit_contact_number_button");
const edit_location_button           = document.getElementById("edit_location_button");

const close_button = document.getElementsByClassName("cancel-btn");
for(const btn of close_button) {
  btn.addEventListener("click", () => {
    overlay.style.display               = "none";
    change_name_modal.style.display     = "none";
    change_email_modal.style.display    = "none";
    change_est_name_modal.style.display = "none";
    change_p_num_modal.style.display    = "none";
    change_pass_modal.style.display     = "none";
    change_location_modal.style.display = "none";
  });
}

async function getUserCreds(email_param) {
  const { data, error } = await supabase.from("establishment_users").select("*").eq("email", email_param);
  if(error) {
    alert(error);
    return;
  }

  if(data.length === 0) {
    alert("User not found!");
    alert("Logging out.");
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Logout failed: ' + error.message);
    }

    window.location.replace('/pages/dashboard/overview/index.html');
  }

  name.textContent = data[0]["owner_first_name"] + " " + data[0]["owner_last_name"];
  establishment_name.textContent = data[0]["establishment_name"];
  contact_number.textContent = data[0]["contact_number"];
  email.textContent = data[0]["email"];
  country.textContent = data[0]["country"];
  province.textContent = data[0]["province"];
  municipality.textContent= data[0]["municipality"];

  // Coordinates for your marker
  const lat = data[0]["latitude"];  // Example: Manila
  const lng = data[0]["longitude"];

  document.getElementById("loading").style.display = "none";
  document.getElementById("wrapper").style.display = "block";
  rendermap(lat, lng);
}

function rendermap(lat, lng) {
  // Create the map
  const map = L.map('map', {
    center: [lat, lng],
    zoom: 12,
    zoomControl: false,       // Hide zoom buttons
    dragging: false,          // Disable dragging
    scrollWheelZoom: false,   // Disable zoom by scroll
    doubleClickZoom: false,   // Disable zoom by double click
    boxZoom: false,           // Disable zoom box
    keyboard: false,          // Disable keyboard controls
    touchZoom: false,         // Disable pinch zoom
    tap: false,               // Disable tap gestures (for mobile)
    attributionControl: false // Optional: hide attribution
  });

  // Add a tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  // Add the fixed marker
  L.marker([lat, lng]).addTo(map);
}

// POP UP MODAL
edit_name_button.addEventListener("click", () => {
  change_name_modal.style.display = "block";
  overlay.style.display = "block";
  document.body.style.overflow = "hidden";
});

// edit_email_button.addEventListener("click", () => {
  // change_email_modal.style.display = "block";
  // overlay.style.display = "block";
// });

edit_establishment_name_button.addEventListener("click", () => {
  change_est_name_modal.style.display = "block";
  overlay.style.display = "block";
});

edit_contact_number_button.addEventListener("click", () => {
  change_p_num_modal.style.display = "block";
  overlay.style.display = "block";
});

/*
function ChangePassword(){
  change_pass_modal.style.display = "block";
  overlay.style.display = "block";
}
  */


let lats = undefined;
let longs = undefined;
let countryy = undefined;
let prov = undefined;
let muni = undefined;

edit_location_button.addEventListener("click", () => {
  let map1 = L.map('map1', {
      center: [0, 0],
      zoom: 13,
      worldCopyJump: false,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0
  });

  let invalidateTimeout;
  map1.on('zoomend moveend', () => {
    clearTimeout(invalidateTimeout);
    invalidateTimeout = setTimeout(() => {
      map1.invalidateSize(); // Re-rendering the map to make performance good even in small screen sizes.
    }, 100);
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      noWrap: true,
      maxZoom: 19,
      attribution: '© OpenStreetMap'
  }).addTo(map1);

  map1.fitBounds([[-90, -180], [90, 180]]);

  let marker = null;
  map1.addEventListener("click", (e) => {
    // Export this function to edge function to prevent api key leak.
    const api_key = "pk.8329f7efe1c3c979a63e9e427efbffcc";

    fetch(`https://us1.locationiq.com/v1/reverse?key=${api_key}&lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
    .then(res => res.json())
    .then(data => {
      lats = e.latlng.lat;
      longs = e.latlng.lng;
      countryy = data.address.country;
      prov = data.address.state || data.address.region;
      muni = data.address.city || data.address.town || data.address.village;
    })
    .catch(err => console.error(err));

    if(!marker) {
      marker = L.marker(e.latlng, {draggable: true}).addTo(map1);
    } else {
      marker.setLatLng(e.latlng);
    }
  }); 
  
  change_location_modal.style.display = "block";
  overlay.style.display = "block";
});

const checkInputBlank = (input) => !input || input.length === 0;

document.getElementById("change_name_button").addEventListener("click", async (e) => {
  e.preventDefault();

  const owner_first_name = document.getElementById("firstName").value.trim();
  const owner_last_name  = document.getElementById("surname").value.trim();
  
  if(checkInputBlank(owner_first_name)) {
    alert("Do not leave first name blank.");
    return;
  }

  if(checkInputBlank(owner_last_name)) {
    alert("Do not leave last name blank.");
    return;
  }

  const { data } = await supabase.auth.getUser();
  const { data: est_user, error } = await supabase.from("establishment_users").update({ owner_first_name, owner_last_name }).eq("email", data.user.email).select();

  if(error) {
    alert(error);
    return;
  }

  alert("Name Updated!");

  location.reload();
});

// Change email.

// Reset Password.

document.getElementById("change_est_name_button").addEventListener("click", async (e) => {
  e.preventDefault();

  const establishmentName = document.getElementById("estName").value.trim();

  if(checkInputBlank(establishmentName)) {
    alert("Do not leave establishment name blank.");
    return;
  }

  const { data } = await supabase.auth.getUser();
  const { data: est_user, error } = await supabase.from("establishment_users").update({ establishment_name: establishmentName }).eq("email", data.user.email).select();

  if(error) {
    alert(error);
    return;
  }

  alert("Establishment Name Updated!");

  location.reload();
});

document.getElementById("change_cn_button").addEventListener("click", async (e) => {
  e.preventDefault();

  const contactNumber = document.getElementById("contactNumber").value.trim();

  if(checkInputBlank(contactNumber)) {
    alert("Do not leave contact number blank.");
    return;
  }

  const { data } = await supabase.auth.getUser();
  const { data: est_user, error } = await supabase.from("establishment_users").update({contact_number: contactNumber}).eq("email", data.user.email).select();

  if(error) {
    alert(error);
    return;
  }

  alert("Contact Number Updated!");

  location.reload();
});

document.getElementById("change_loc_button").addEventListener("click", async (e) => {
  e.preventDefault();

  const { data } = await supabase.auth.getUser();
  const { data: est_user, error } = await supabase.from("establishment_users").update({ country: countryy, province: prov, municipality: muni, latitude: lats, longitude: longs }).eq("email", data.user.email).select();

  if(error) {
    alert(error);
    return;
  }

  alert("Location Updated!");

  location.reload();
});

// Optional: close when clicking outside modal
// document.getElementById("overlay").addEventListener("click", closeModal);

//HIDE PASSWORD FUNCTION
const togglePassword1 = document.getElementById("togglePassword1");
const currentPassword = document.getElementById("currentPassword");

const togglePassword2 = document.getElementById("togglePassword2");
const newPassword = document.getElementById("newPassword");

const togglePassword3 = document.getElementById("togglePassword3");
const confirmPassword = document.getElementById("confirmPassword");


function toggleVisibility(toggleIcon, inputField) {
  const isPassword = inputField.type === "password";
  inputField.type = isPassword ? "text" : "password";
  toggleIcon.classList.toggle("fa-eye");
  toggleIcon.classList.toggle("fa-eye-slash");
}

togglePassword1.addEventListener("click", () => toggleVisibility(togglePassword1, currentPassword));
togglePassword2.addEventListener("click", () => toggleVisibility(togglePassword2, newPassword));
togglePassword3.addEventListener("click", () => toggleVisibility(togglePassword3, confirmPassword));

//BACK FUNCTION
const backPageFunction = document.getElementById("back-function");

backPageFunction.addEventListener("click" ,function(){
  location.replace("../overview/index.html");
});