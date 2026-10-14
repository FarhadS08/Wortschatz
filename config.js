// Supabase project for accounts and sync (Supabase dashboard → Project Settings → API).
// Both values are public by design: the database's row-level security protects the data.
// Leave them empty and the app runs without accounts, keeping everything in the browser.
window.WS_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
