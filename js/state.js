import { enabled } from "./supabaseClient.js";
import { toDateInputValue } from "./utils.js";

export function emptyAppData() {
  return { users: [], connectionRequests: [], notifications: [], groupWorkouts: [], trainingPlans: [], coachProfiles: [], activities: [] };
}

// Az exportált `let` bindingek más modulokban élőben olvashatók, de csak a setterekkel írhatók.
export let data = emptyAppData();
export let session = null;
export let currentView = "overview";
export let selectedClientId = null;
export let selectedCoachId = null;
export let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
export let calendarSelectedDate = toDateInputValue(new Date());
export let adminDashboardPeriod = "month";
export let storageNoticeDismissed = false;
export const remoteMode = enabled;

export function setData(value) { data = value; }
export function setSession(value) { session = value; }
export function setCurrentView(value) { currentView = value; }
export function setSelectedClientId(value) { selectedClientId = value; }
export function setSelectedCoachId(value) { selectedCoachId = value; }
export function setCalendarMonth(value) { calendarMonth = value; }
export function setCalendarSelectedDate(value) { calendarSelectedDate = value; }
export function setAdminDashboardPeriod(value) { adminDashboardPeriod = value; }
export function setStorageNoticeDismissed(value) { storageNoticeDismissed = value; }
