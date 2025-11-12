import supabase from "../../utils/supabase.js";
import { redirectIfLoggedIn } from "../../utils/auth-guard.js";

window.addEventListener("DOMContentLoaded", async () => {
  await redirectIfLoggedIn();
});

const checkInputNull = (input) => !input || input.length === 0;

const ip_username = document.getElementsByClassName("ip-username")[0];
const ip_password = document.getElementsByClassName("ip-password")[0];
const login_btn = document.getElementById("login-btn");

const togglePassword = document.getElementById("togglePassword");
const login_password = document.getElementById("login-password");

login_btn.addEventListener("click", async (e) => {
  e.preventDefault();

  let username = ip_username.value.trim();
  let password = ip_password.value.trim();

  if(checkInputNull(username)){
      alert("Please enter your username.");
      return;
  }
    
  if(checkInputNull(password)){
      alert("Please enter your password.");
      return;
  }

  if(username.length < 8 && password.length < 8){
      alert("Password should be at least 8 characters.");
      return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({email: username, password});

  if(error) {
    alert(error.message);
    return;
  }

  const { data:est_user, error: est_err } = await supabase.from("establishment_users").select("email").eq("email", username);
  if(est_err) {
    alert(est_err.message);
    await supabase.auth.signOut();
    return;
  }

  if(est_user.length === 0) {
    alert("No user found.")
    await supabase.auth.signOut();
    return;
  }
  
  location.replace("../dashboard/overview/index.html");
});

togglePassword.addEventListener("click", () => {
  const isPassword = login_password.type === "password";
  login_password.type = isPassword ? "text" : "password";
  
  // Toggle icon
  togglePassword.classList.toggle("fa-eye");
  togglePassword.classList.toggle("fa-eye-slash");
});