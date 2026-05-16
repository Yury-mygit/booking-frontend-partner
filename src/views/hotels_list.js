import { api } from "../api.js";
import { t } from "../i18n.js";
import { escapeHtml } from "../util.js";

export async function renderHotelsList() {
  const app = document.getElementById("app");
  app.innerHTML = `<h1>${t("hotels.title")}</h1>
    <p><a href="#/hotel/new" class="primary" style="padding:10px 16px;background:#1a73e8;color:#fff;border-radius:4px;text-decoration:none;display:inline-block">${t("hotels.new")}</a></p>
    <div id="list">${t("app.loading")}</div>`;
  try {
    const hotels = await api.listHotels();
    const list = document.getElementById("list");
    if (!hotels.length) {
      list.innerHTML = `<p class="muted">${t("hotels.empty")}</p>`;
      return;
    }
    list.innerHTML = hotels
      .map(
        (h) => `
        <a class="card-link" href="#/hotel/${h.id}" style="text-decoration:none;color:inherit">
          <div class="card">
            <h3>${escapeHtml(h.name_ru)}</h3>
            <div class="meta">${escapeHtml(h.city)}${h.address ? " · " + escapeHtml(h.address) : ""}</div>
            <span class="status-pill ${h.status}">${t("hotels.status." + h.status)}</span>
          </div>
        </a>`,
      )
      .join("");
  } catch (e) {
    document.getElementById("list").innerHTML =
      `<div class="error">${t("app.error", { msg: e.message })}</div>`;
  }
}
