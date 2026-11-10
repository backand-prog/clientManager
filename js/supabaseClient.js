const config = window.SUPABASE_CONFIG;

export const enabled = Boolean(window.supabase && config?.url && config?.anonKey && !config.anonKey.includes("IDE_MASOLD"));
export const client = enabled ? window.supabase.createClient(config.url, config.anonKey) : null;
