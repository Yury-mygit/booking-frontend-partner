import { api } from "../api.js";
import { t } from "../i18n.js";
import { escapeHtml } from "../util.js";

let _eventSources = [];
let _refreshTimer = null;

function closeStreams() {
  _eventSources.forEach((es) => es.close());
  _eventSources = [];
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

function scheduleReload() {
  // Debounce — admin/partner bulk-ops can fire many events in a burst.
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(() => {
    _refreshTimer = null;
    if (!document.getElementById("list")) return; // navigated away
    load();
  }, 300);
}

async function openStreams() {
  closeStreams();
  let hotels;
  try {
    hotels = await api.listHotels();
  } catch {
    return;
  }
  hotels.forEach((h) => {
    const slug = h.slug || h.id;
    const es = new EventSource(`/api/v1/public/hotels/${encodeURIComponent(slug)}/events`);
    es.onmessage = scheduleReload;
    _eventSources.push(es);
  });
}

window.addEventListener("hashchange", () => {
  const hash = location.hash.replace(/^#/, "").split("?")[0];
  if (hash !== "/bookings") closeStreams();
});

export async function renderBookings() {
  const app = document.getElementById("app");
  app.innerHTML = `<h1>${t("bookings.title")}</h1><div id="list">${t("app.loading")}</div>`;
  await load();
  openStreams();
}

async function load() {
  const list = document.getElementById("list");
  list.innerHTML = t("app.loading");
  try {
    const items = await api.listBookings();
    if (!items.length) {
      list.innerHTML = `<p class="muted">${t("bookings.empty")}</p>`;
      return;
    }
    list.innerHTML = items
      .map((b) => {
        const canConfirm = b.status === "pending";
        const canCancel = b.status === "pending" || b.status === "paid";
        return `
          <div class="card">
            <h3>${escapeHtml(b.hotel_name_ru)} — ${escapeHtml(b.room_name_ru)}</h3>
            <div class="meta">${t("bookings.code", { code: b.code })}</div>
            <div class="meta">${t("bookings.dates", { ci: b.check_in, co: b.check_out, n: b.guests })}</div>
            <div class="meta">${t("bookings.client", { name: escapeHtml(b.client_first_name || "—") })}</div>
            <div class="price">${t("bookings.total", { total: b.total_kgs })}</div>
            <div class="meta">${t("bookings.status." + b.status)}</div>
            ${canConfirm || canCancel ? `
              <div class="row-actions">
                ${canConfirm ? `<button class="primary" data-confirm="${b.code}">${t("bookings.confirm")}</button>` : ""}
                ${canCancel ? `<button class="danger" data-cancel="${b.code}">${t("bookings.cancel")}</button>` : ""}
              </div>` : ""}
          </div>`;
      })
      .join("");
    list.querySelectorAll("[data-confirm]").forEach((btn) => {
      btn.onclick = async () => {
        try { await api.confirmBooking(btn.dataset.confirm); await load(); }
        catch (e) { alert(e.message); }
      };
    });
    list.querySelectorAll("[data-cancel]").forEach((btn) => {
      btn.onclick = async () => {
        const code = btn.dataset.cancel;
        if (!confirm(t("bookings.cancel_confirm", { code }))) return;
        try { await api.cancelBooking(code); await load(); }
        catch (e) { alert(e.message); }
      };
    });
  } catch (e) {
    list.innerHTML = `<div class="error">${t("app.error", { msg: e.message })}</div>`;
  }
}
