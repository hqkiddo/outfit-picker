/**
 * Auth module – Supabase email/password auth.
 * Requires config.js with OUTFIT_PICKER_CONFIG.supabaseUrl and supabaseAnonKey.
 */
(function () {
  let supabase = null;

  function getClient() {
    if (supabase) return supabase;
    const cfg = window.OUTFIT_PICKER_CONFIG;
    if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) return null;
    if (typeof window.supabase?.createClient !== 'function') return null;
    const url = String(cfg.supabaseUrl).trim();
    const key = String(cfg.supabaseAnonKey).trim();
    supabase = window.supabase.createClient(url, key);
    return supabase;
  }

  window.OutfitAuth = {
    isConfigured() {
      const cfg = window.OUTFIT_PICKER_CONFIG;
      if (!cfg) return false;
      const url = String(cfg.supabaseUrl ?? '').trim();
      const key = String(cfg.supabaseAnonKey ?? '').trim();
      if (!url || !key) return false;
      let hostname = '';
      try {
        hostname = new URL(url).hostname;
      } catch {
        return false;
      }
      if (hostname === 'your-project.supabase.co') return false;
      if (key === 'your-anon-key') return false;
      // Real anon keys are long JWT-style strings; template is short
      if (key.length < 50) return false;
      return true;
    },

    async getSession() {
      const client = getClient();
      if (!client) return null;
      const { data: { session } } = await client.auth.getSession();
      return session;
    },

    async signUp(email, password) {
      const client = getClient();
      if (!client) throw new Error('Supabase not configured');
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },

    async signIn(email, password) {
      const client = getClient();
      if (!client) throw new Error('Supabase not configured');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const client = getClient();
      if (!client) return;
      await client.auth.signOut();
    },

    onAuthChange(callback) {
      const client = getClient();
      if (!client) return () => {};
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
      return () => subscription.unsubscribe();
    }
  };
})();
