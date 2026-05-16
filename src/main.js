import { api } from "./api.js";
import { applyStaticI18n, cycleLang } from "./i18n.js";
import { route, run } from "./router.js";
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

initTg();
applyTheme();
watchTheme();
applyStaticI18n();

document.getElementById("lang-cycle").onclick = cycleLang;
window.addEventListener("langchange", () => {
  applyStaticI18n();
  run();
});

route("/", renderHotelsList);
route("/rooms", renderAllRooms);
route("/clients", renderClientsList);
route("/client/{clientId}", renderClientEdit);
route("/hotel/{hotelId}/rooms", renderRoomsList);
route("/hotel/{id}", renderHotelEdit);
route("/room/{hotelId}/{roomId}/availability", renderAvailability);
route("/room/{hotelId}/{roomId}", renderRoomEdit);
route("/bookings", renderBookings);

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
    api.setSession(api.authToken(), u);
    renderPending();
  }
});

async function bootstrap() {
  if (api.hasToken()) {
    if (maybeRenderPending()) return;
    run();
    return;
  }
  if (inTelegram) {
    try {
      const r = await api.authTg(tg.initData);
      api.setSession(r.token, r.user);
      if (maybeRenderPending()) return;
      run();
    } catch (e) {
      document.getElementById("app").innerHTML =
        `<div class="error">Auth failed: ${e.message}</div>`;
    }
  } else {
    renderDevLogin(() => {
      if (!location.hash) location.hash = "#/";
      if (maybeRenderPending()) return;
      run();
    });
  }
}

bootstrap();
