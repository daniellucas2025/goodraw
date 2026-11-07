// Which GooDraw Nuvem the Notes talks to. Both keys are publishable keys
// (public by design: what a signed-in person may do is decided by the
// database's rules, not by the key).
//  • production — the Supabase project "A GooDraw Notes" (São Paulo);
//  • local — the development stack in cloud/ (cd cloud && supabase start),
//    switched on per browser with localStorage['bn.cloud'] = 'local'.
(function () {
  // google: "Continuar com Google" (notes/cloud.js) — on once the project's
  // Google client is set in Supabase (Authentication → Providers → Google).
  const PROD = { env: 'prod', url: 'https://frwnoteybuadmnkultoh.supabase.co', key: 'sb_publishable_oR15v6U20AsAsKm2eBfCsg_73hGR90b', google: true };
  const LOCAL = { env: 'local', url: 'http://127.0.0.1:55121', key: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' };
  let local = false;
  try { local = self.localStorage && localStorage.getItem('bn.cloud') === 'local'; } catch (e) {}
  self.NotesCloudConfig = local ? LOCAL : PROD;
})();
