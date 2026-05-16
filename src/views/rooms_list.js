import { api } from "../api.js";
import { t } from "../i18n.js";
import { escapeHtml } from "../util.js";

export async function renderRoomsList({ hotelId }) {
  const app = document.getElementById("app");
  app.innerHTML = t("app.loading");

  let hotel = null;
  let rooms = [];
  try {
    hotel = await api.getHotel(hotelId);
    rooms = await api.listRooms(hotelId);
  } catch (e) {
    app.innerHTML = `<div class="error">${t("app.error", { msg: e.message })}</div>`;
    return;
  }

  app.innerHTML = `
    <div class="form-header">
      <a class="back-btn" href="#/" aria-label="${t("app.back")}">←</a>
      <h1 class="form-title">${t("hotel.rooms")} — ${escapeHtml(hotel.name_ru)}</h1>
    </div>
    <div id="rooms-list">
      ${rooms.length === 0
        ? `<p class="muted">— ${t("hotels.empty")} —</p>`
        : rooms.map((r) => roomCardHtml(r, hotelId)).join("")}
    </div>
    <a href="#/room/${hotelId}/new" class="secondary" style="display:inline-block;padding:8px 14px;text-decoration:none;border:1px solid var(--accent);border-radius:4px;color:var(--accent);background:var(--surface);margin-top:8px">${t("hotel.add_room")}</a>
  `;
}

function roomCardHtml(r, hotelId) {
  const photo = (r.photos && r.photos[0]) || "";
  const photoHtml = photo
    ? `<div class="hotel-thumb" style="background-image:url('${escapeHtml(photo)}')"></div>`
    : `<div class="hotel-thumb hotel-thumb-empty"></div>`;
  return `
    <div class="card hotel-row">
      ${photoHtml}
      <div class="hotel-row-body">
        <h3>${escapeHtml(r.name_ru)}</h3>
        <div class="meta">capacity=${r.capacity}, ${r.price_kgs} сом/ночь</div>
      </div>
      <div class="hotel-actions">
        <a class="hotel-edit-btn" href="#/room/${hotelId}/${r.id}" title="${t("hotels.edit")}" aria-label="${t("hotels.edit")}">⚙</a>
        <a class="hotel-edit-btn" href="#/room/${hotelId}/${r.id}/availability" title="${t("room.availability")}" aria-label="${t("room.availability")}">📅</a>
      </div>
    </div>`;
}
