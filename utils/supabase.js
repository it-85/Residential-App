import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient("https://mjftoxillyjatgwubonn.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZnRveGlsbHlqYXRnd3Vib25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MjQ2NzYsImV4cCI6MjA3NDQwMDY3Nn0.unc6SZs6NunWAJcs1QzvzCeCWxtmVWwOsyGsdiy9vAY");

export default supabase;