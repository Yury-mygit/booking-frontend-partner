import { api } from "./api.js";
import { applyStaticI18n, setLang } from "./i18n.js";
import { route, run } from "./router.js";
import { initTg, inTelegram, tg } from "./tg.js";
import { renderAvailability } from "./views/availability.js";
import { renderDevLogin } from "./views/auth.js";
import { renderBookings } from "./views/bookings.js";
import { renderHotelEdit } from "./views/hotel_edit.js";
import { renderHotelsList } from "./views/hotels_list.js";
import { renderRoomEdit } from "./views/room_edit.js";

initTg();
applyStaticI18n();

document.querySelectorAll("#lang-switch button").forEach((b) => {
  b.onclick = () => setLang(b.dataset.lang);
});
window.addEventListener("langchange", () => {
  applyStaticI18n();
  run();
});

route("/", renderHotelsList);
route("/hotel/{id}", renderHotelEdit);
route("/room/{hotelId}/{roomId}/availability", renderAvailability);
route("/room/{hotelId}/{roomId}", renderRoomEdit);
route("/bookings", renderBookings);

async function bootstrap() {
  if (api.hasToken()) {
    run();
    return;
  }
  if (inTelegram) {
    try {
      const r = await api.authTg(tg.initData);
      api.setSession(r.token, r.user);
      run();
    } catch (e) {
      document.getElementById("app").innerHTML =
        `<div class="error">Auth failed: ${e.message}</div>`;
    }
  } else {
    renderDevLogin(() => {
      if (!location.hash) location.hash = "#/";
      run();
    });
  }
}

bootstrap();
