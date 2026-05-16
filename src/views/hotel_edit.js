import { api } from "../api.js";
import { t } from "../i18n.js";
import { navigate } from "../router.js";
import { escapeHtml } from "../util.js";

const FIELDS = [
  ["name_ru", "hotel.name_ru", "input"],
  ["name_ky", "hotel.name_ky", "input"],
  ["name_en", "hotel.name_en", "input"],
  ["description_ru", "hotel.description_ru", "textarea"],
  ["description_ky", "hotel.description_ky", "textarea"],
  ["description_en", "hotel.description_en", "textarea"],
  ["city", "hotel.city", "input"],
  ["address", "hotel.address", "input"],
  ["lat", "hotel.lat", "input-number"],
  ["lng", "hotel.lng", "input-number"],
];

export async function renderHotelEdit({ id }) {
  const isNew = id === "new";
  const app = document.getElementById("app");
  app.innerHTML = t("app.loading");

  let hotel = null;
  let rooms = [];
  if (!isNew) {
    try {
      hotel = await api.getHotel(id);
      rooms = await api.listRooms(id);
    } catch (e) {
      app.innerHTML = `<div class="error">${t("app.error", { msg: e.message })}</div>`;
      return;
    }
  }

  app.innerHTML = `
    <p><a href="#/">${t("app.back")}</a></p>
    <h1>${isNew ? t("hotel.title.new") : t("hotel.title.edit")}</h1>
    ${!isNew ? `<p>
      <span class="status-pill ${hotel.status}">${t("hotels.status." + hotel.status)}</span>
      ${hotel.status !== "published"
        ? `<button class="secondary" id="btn-pub">${t("hotel.publish")}</button>`
        : `<button class="secondary" id="btn-unpub">${t("hotel.unpublish")}</button>`}
      <button class="danger" id="btn-del">${t("app.delete")}</button>
    </p>
    <div class="card" style="background:var(--surface-info)">
      <div class="meta" style="margin-bottom:6px"><b>${t("hotel.share.title")}</b></div>
      <div class="form-row">
        <label>${t("hotel.share.web")}</label>
        <input id="share-web" readonly value="https://book.dev.raftforge.art/#/hotel/${hotel.id}" />
      </div>
      <div class="form-row">
        <label>${t("hotel.share.tg_start")}</label>
        <input id="share-tg-start" readonly value="https://t.me/rforge_stay_bot?start=hotel_${hotel.id}" />
      </div>
      <div class="form-row">
        <label>${t("hotel.share.tg_startapp")}</label>
        <input id="share-tg-app" readonly value="https://t.me/rforge_stay_bot?startapp=hotel_${hotel.id}" />
      </div>
      <button class="secondary" id="btn-copy-web">${t("hotel.share.copy_web")}</button>
      <button class="secondary" id="btn-copy-tg-start">${t("hotel.share.copy_tg_start")}</button>
      <button class="secondary" id="btn-copy-tg-app">${t("hotel.share.copy_tg_startapp")}</button>
      <div id="copy-toast" class="success" style="display:none">${t("hotel.share.copied")}</div>
    </div>` : ""}
    <form id="form">
      ${FIELDS.map(([k, key, kind]) => {
        const v = hotel?.[k] ?? "";
        if (kind === "textarea") {
          return `<div class="form-row"><label>${t(key)}</label>
            <textarea name="${k}">${escapeHtml(v)}</textarea></div>`;
        }
        const inputType = kind === "input-number" ? "number" : "text";
        const step = kind === "input-number" ? 'step="any"' : "";
        return `<div class="form-row"><label>${t(key)}</label>
          <input type="${inputType}" ${step} name="${k}" value="${escapeHtml(v)}" /></div>`;
      }).join("")}
      <div class="form-row"><label>${t("hotel.photos_urls")}</label>
        <input name="photos" value="${escapeHtml((hotel?.photos || []).join(", "))}" /></div>
      <button class="primary full" id="btn-save">${t("app.save")}</button>
      <div id="form-err" class="error"></div>
    </form>

    ${!isNew ? `
      <h2>${t("hotel.rooms")}</h2>
      <div id="rooms"></div>
      <a href="#/room/${id}/new" class="secondary" style="display:inline-block;padding:8px 14px;text-decoration:none;border:1px solid var(--accent);border-radius:4px;color:var(--accent);background:var(--surface)">${t("hotel.add_room")}</a>
    ` : ""}
  `;

  document.getElementById("btn-save").onclick = async (e) => {
    e.preventDefault();
    const form = document.getElementById("form");
    const payload = {};
    for (const [k, , kind] of FIELDS) {
      const raw = form[k].value.trim();
      if (raw === "") {
        payload[k] = isNew ? undefined : null;
        continue;
      }
      payload[k] = kind === "input-number" ? Number(raw) : raw;
    }
    const photosRaw = form.photos.value.trim();
    payload.photos = photosRaw ? photosRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : [];
    // Strip undefined for create.
    for (const k of Object.keys(payload)) {
      if (payload[k] === undefined) delete payload[k];
    }
    try {
      if (isNew) {
        const created = await api.createHotel(payload);
        navigate("/hotel/" + created.id);
      } else {
        await api.updateHotel(id, payload);
        document.getElementById("form-err").innerHTML = `<span class="success">${t("avail.saved")}</span>`;
        setTimeout(() => location.reload(), 600);
      }
    } catch (e) {
      document.getElementById("form-err").textContent = t("app.error", { msg: e.message });
    }
  };

  if (!isNew) {
    document.getElementById("btn-pub")?.addEventListener("click", () => statusChange(id, "published"));
    document.getElementById("btn-unpub")?.addEventListener("click", () => statusChange(id, "draft"));
    const copyTo = (selector) => {
      const el = document.querySelector(selector);
      el.select();
      navigator.clipboard?.writeText(el.value).catch(() => document.execCommand("copy"));
      const toast = document.getElementById("copy-toast");
      toast.style.display = "block";
      setTimeout(() => (toast.style.display = "none"), 1500);
    };
    document.getElementById("btn-copy-web")?.addEventListener("click", () => copyTo("#share-web"));
    document.getElementById("btn-copy-tg-start")?.addEventListener("click", () => copyTo("#share-tg-start"));
    document.getElementById("btn-copy-tg-app")?.addEventListener("click", () => copyTo("#share-tg-app"));
    document.getElementById("btn-del").onclick = async () => {
      if (!confirm(t("hotel.delete_confirm"))) return;
      try {
        await api.deleteHotel(id);
        navigate("/");
      } catch (e) {
        document.getElementById("form-err").textContent = t("app.error", { msg: e.message });
      }
    };
    renderRooms(rooms, id);
  }
}

async function statusChange(id, status) {
  try {
    await api.updateHotel(id, { status });
    location.reload();
  } catch (e) {
    alert(e.message);
  }
}

function renderRooms(rooms, hotelId) {
  const el = document.getElementById("rooms");
  if (!rooms.length) {
    el.innerHTML = `<p class="muted">— нет —</p>`;
    return;
  }
  el.innerHTML = rooms
    .map(
      (r) => `
      <div class="card">
        <h3>${escapeHtml(r.name_ru)}</h3>
        <div class="meta">capacity=${r.capacity}, ${r.price_kgs} сом/ночь</div>
        <div class="row-actions">
          <a class="secondary" style="text-decoration:none;display:inline-block;padding:6px 10px" href="#/room/${hotelId}/${r.id}">edit</a>
          <a class="secondary" style="text-decoration:none;display:inline-block;padding:6px 10px" href="#/room/${hotelId}/${r.id}/availability">${t("room.availability")}</a>
        </div>
      </div>`,
    )
    .join("");
}
