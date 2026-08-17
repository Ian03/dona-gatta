const SUPABASE_URL = 'https://qrfgtkbwykkcfroybcro.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZmd0a2J3eWtrY2Zyb3liY3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDExMjYsImV4cCI6MjEwMjU3NzEyNn0.3f5XkOy5w-QUG3OdHWpOxdldJeZdvT67brwKbyl0CpE';

let supabaseClient = null;
if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
