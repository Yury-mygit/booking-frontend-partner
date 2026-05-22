import { api } from "./api.js";
import { applyStaticI18n, cycleLang } from "./i18n.js";
import { currentPath, parentPath, route, run } from "./router.js";
import { applyTheme, watchTheme } from "./theme.js";
import { initTg, inTelegram, tg } from "./tg.js";
import { renderAllRooms } from "./views/all_rooms.js";
import { renderAvailability } from "./views/availability.js";
import { renderDevLogin } from "./views/auth.js";
import { renderBookings } from "./views/bookings.js";
import { renderClientEdit } from "./views/client_edit.js";
import { renderClientsList } from "./views/clients_list.js";
import { renderHotelEdit } from "./views/hotel_edit.js";
import { renderHotelsList } from "./views/hotels_list.js";
import { renderPending } from "./views/pending.js";
import { renderRoomEdit } from "./views/room_edit.js";
import { renderRoomsList } from "./views/rooms_list.js";
import { renderStaffList } from "./views/staff_list.js";
import { renderAudit } from "./views/audit.js";
import { mountOwnerSelector } from "./views/owner_selector.js";

initTg();
applyTheme();
watchTheme();
applyStaticI18n();

document.getElementById("lang-cycle").onclick = cycleLang;
document.getElementById("back-to-hub").onclick = () => {
  const parent = parentPath(currentPath());
  if (parent === null) {
    window.location.href = "https://book-hub.raftforge.art/";
  } else {
    location.hash = "#" + parent;
  }
};
window.addEventListener("langchange", () => {
  applyStaticI18n();
  run();
});
window.addEventListener("ownerchange", () => {
  run();
});

route("/", renderHotelsList, "pageTitle.hotels");
route("/rooms", renderAllRooms, "pageTitle.rooms");
route("/clients", renderClientsList, "pageTitle.clients");
route("/client/{clientId}", renderClientEdit, "pageTitle.clientEdit");
route("/hotel/{hotelId}/rooms", renderRoomsList, "pageTitle.hotelRooms");
route("/hotel/{id}", renderHotelEdit, "pageTitle.hotelEdit");
route("/room/{hotelId}/{roomId}/availability", renderAvailability, "pageTitle.availability");
route("/room/{hotelId}/{roomId}", renderRoomEdit, "pageTitle.roomEdit");
route("/bookings", renderBookings, "pageTitle.bookings");
route("/staff", renderStaffList, "pageTitle.staff");
route("/audit", renderAudit, "pageTitle.audit");

function maybeRenderPending() {
  const u = api.user();
  if (u && u.role === "partner" && u.partner_status === "pending") {
    renderPending();
    return true;
  }
  return false;
}

// Catch 403 partner_pending from any API call — switch user to pending screen.
window.addEventListener("apierror", (e) => {
  if (e.detail && e.detail.code === "partner_pending") {
    const u = api.user() || {};
    u.partner_status = "pending";
    api.setSession(api.authToken(), u, []);
    renderPending();
  }
});

async function refreshWhoami() {
  // Keep accessible_owners fresh on app load — the cached value in localStorage
  // can be stale (e.g. owner added/removed staff since last visit).
  try {
    const w = await api.whoami();
    api.setSession(api.authToken(), api.user(), w.accessible_owners || []);
  } catch (e) {
    // Network/auth errors will be handled by the next call.
  }
}

async function bootstrap() {
  if (api.hasToken()) {
    if (maybeRenderPending()) return;
    await refreshWhoami();
    mountOwnerSelector();
    run();
    return;
  }
  if (inTelegram) {
    try {
      const r = await api.authTg(tg.initData);
      api.setSession(r.token, r.user, r.accessible_owners || []);
      await maybeAcceptInvite();
      if (maybeRenderPending()) return;
      mountOwnerSelector();
      run();
    } catch (e) {
      document.getElementById("app").innerHTML =
        `<div class="error">Auth failed: ${e.message}</div>`;
    }
  } else {
    renderDevLogin(async () => {
      if (!location.hash) location.hash = "#/";
      if (maybeRenderPending()) return;
      await refreshWhoami();
      mountOwnerSelector();
      run();
    });
  }
}

async function maybeAcceptInvite() {
  const sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
  if (!sp || !sp.startsWith("invite_")) return;
  const token = sp.slice(7);
  if (!token) return;
  try {
    await api.acceptStaffInvite(token);
    // Re-fetch session so accessible_owners now contains the new staff scope.
    const w = await api.whoami();
    api.setSession(api.authToken(), api.user(), w.accessible_owners || []);
  } catch (e) {
    // Не делаем критичной ошибкой — staff может уже состоять; продолжаем.
    console.warn("invite accept failed:", e.message);
  }
}

bootstrap();
