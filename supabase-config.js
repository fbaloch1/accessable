window.ACCESSABLE_SUPABASE_CONFIG = {
  url: 'https://xctqqwgjstzqhmozmpcc.supabase.co',
  publishableKey: 'sb_publishable_CbjIImZib5IFYQ17h_Btvw_uocNR_n7'
};
window.ACCESSABLE_HAS_SUPABASE = /^https:\/\//.test(window.ACCESSABLE_SUPABASE_CONFIG.url) &&
  !window.ACCESSABLE_SUPABASE_CONFIG.url.includes('REPLACE_WITH') &&
  window.ACCESSABLE_SUPABASE_CONFIG.publishableKey.startsWith('sb_publishable_');
