import { client, enabled } from "./supabaseClient.js";
import { load } from "./api.js";
import { data, session } from "./state.js";

export async function signIn(email, password) {
  if (!enabled) return null;
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  return load();
}

export async function signUp(values) {
  if (!enabled) return null;
  const result = await client.auth.signUp({
    email: values.email,
    password: values.password,
    options: { emailRedirectTo: window.location.origin, data: { full_name: values.name, requested_role: values.role === "trainer" ? "trainer" : "client", specialty: values.role === "trainer" ? values.specialty || null : null, goal: values.role === "client" ? values.goal || null : null } }
  });
  if (result.error) throw result.error;
  return result.data.user;
}

export async function signOut() {
  if (enabled) await client.auth.signOut();
}

export async function updateEmail(email) {
  if (!enabled) return;
  const result = await client.auth.updateUser({ email });
  if (result.error) throw result.error;
}

export async function requestPasswordReset(email) {
  if (!enabled) return null;
  const result = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?password-reset=1` });
  if (result.error) throw result.error;
}

export async function updatePassword(password) {
  if (!enabled) return null;
  const result = await client.auth.updateUser({ password });
  if (result.error) throw result.error;
}

export function onPasswordRecovery(callback) {
  if (!enabled) return;
  client.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") callback();
  });
}

export function currentUser() {
  return data.users.find((user) => user.id === session);
}

export function hasRole(role, user = currentUser()) {
  return user?.role === role;
}

export const isAdmin = (user) => hasRole("admin", user);
export const isTrainer = (user) => hasRole("trainer", user);
export const isClient = (user) => hasRole("client", user);

export function isPublicRegistrationEnabled() {
  return window.LEGAL_NOTICES?.publicRegistrationEnabled === true;
}
