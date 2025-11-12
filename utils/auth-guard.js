import supabase from './supabase.js';

export async function redirectIfLoggedIn() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.replace('/pages/dashboard/overview/index.html');
    // window.location.replace('/Residential-App/pages/dashboard/overview/index.html');
  }
}

export async function protectPage() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.replace('/pages/login/index.html');
    // window.location.replace('/Residential-App/pages/login/index.html');
  }
}