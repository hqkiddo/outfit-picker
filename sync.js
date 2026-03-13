/**
 * Sync module – upload/download closet data to Supabase.
 * Uses closet_data table (user_id, data, updated_at).
 */
(function () {
  const TABLE = 'closet_data';

  function getClient() {
    return window.OutfitAuth?.getClient?.() ?? null;
  }

  async function getSupabase() {
    const cfg = window.OUTFIT_PICKER_CONFIG;
    if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || typeof window.supabase?.createClient !== 'function') return null;
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  window.OutfitSync = {
    async fetchCloset() {
      const client = await getSupabase();
      if (!client) return null;
      const { data: { user } } = await client.auth.getUser();
      if (!user) return null;

      const { data, error } = await client
        .from(TABLE)
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Sync fetch error:', error);
        return null;
      }
      return data?.data ?? null;
    },

    async saveCloset(closetData) {
      const client = await getSupabase();
      if (!client) return false;
      const { data: { user } } = await client.auth.getUser();
      if (!user) return false;

      const payload = { user_id: user.id, data: closetData, updated_at: new Date().toISOString() };

      const { error } = await client
        .from(TABLE)
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        console.warn('Sync save error:', error);
        return false;
      }
      return true;
    }
  };
})();
