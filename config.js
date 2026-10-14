// Supabase project for accounts and sync (Supabase → Connect; step by step in SETUP.md).
// Both values are public by design: the database's row-level security protects the data.
// Leave them empty and the app runs without accounts, keeping everything in the browser.
window.WS_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  // true once email sending is set up (SETUP.md step 5); until then only Google sign-in is offered
  emailSignIn: false
};
