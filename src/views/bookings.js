import { api } from "../api.js";
import { t } from "../i18n.js";
import { escapeHtml } from "../util.js";

export async function renderBookings() {
  const app = document.getElementById("app");
  app.innerHTML = `<h1>${t("bookings.title")}</h1><div id="list">${t("app.loading")}</div>`;
  try {
    const items = await api.listBookings();
    const list = document.getElementById("list");
    if (!items.length) {
      list.innerHTML = `<p class="muted">${t("bookings.empty")}</p>`;
      return;
    }
    list.innerHTML = items
      .map(
        (b) => `
        <div class="card">
          <h3>${escapeHtml(b.hotel_name_ru)} — ${escapeHtml(b.room_name_ru)}</h3>
          <div class="meta">${t("bookings.code", { code: b.code })}</div>
          <div class="meta">${t("bookings.dates", { ci: b.check_in, co: b.check_out, n: b.guests })}</div>
          <div class="meta">${t("bookings.client", { name: escapeHtml(b.client_first_name || "—") })}</div>
          <div class="price">${t("bookings.total", { total: b.total_kgs })}</div>
          <div class="meta">${t("bookings.status." + b.status)}</div>
        </div>`,
      )
      .join("");
  } catch (e) {
    document.getElementById("list").innerHTML =
      `<div class="error">${t("app.error", { msg: e.message })}</div>`;
  }
}
