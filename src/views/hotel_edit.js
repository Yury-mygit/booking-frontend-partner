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

const TABS = ["status", "share", "description", "photos", "rooms"];

let _state = { hotel: null, rooms: [], active: "status" };

function headerHtml(title) {
  return `
    <div class="form-header">
      <a class="back-btn" href="#/" aria-label="${t("app.back")}">←</a>
      <h1 class="form-title">${title}</h1>
    </div>`;
}

function tabsBarHtml() {
  return `
    <div class="tabs">
      ${TABS.map((name) =>
        `<button class="tab" data-tab="${name}">${t("edit.section." + name)}</button>`
      ).join("")}
    </div>
    <div id="tab-body"></div>
  `;
}

function descriptionFormHtml(hotel) {
  return `
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
  `;
}

export async function renderHotelEdit({ id }) {
  const isNew = id === "new";
  const app = document.getElementById("app");
  app.innerHTML = t("app.loading");

  if (isNew) {
    app.innerHTML = `
      ${headerHtml(t("hotel.title.new"))}
      ${descriptionFormHtml(null)}
    `;
    wireSaveHandler(true, id);
    return;
  }

  try {
    _state.hotel = await api.getHotel(id);
    _state.rooms = await api.listRooms(id);
  } catch (e) {
    app.innerHTML = `<div class="error">${t("app.error", { msg: e.message })}</div>`;
    return;
  }

  app.innerHTML = `
    ${headerHtml(t("hotel.title.edit"))}
    ${tabsBarHtml()}
  `;
  document.querySelectorAll(".tab").forEach((b) => {
    b.onclick = () => switchTab(b.dataset.tab, id);
  });
  switchTab(_state.active, id);
}

function switchTab(name, id) {
  _state.active = name;
  document.querySelectorAll(".tab").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === name),
  );
  const body = document.getElementById("tab-body");
  if (name === "status") return renderStatusTab(body, id);
  if (name === "share") return renderShareTab(body);
  if (name === "description") return renderDescriptionTab(body, id);
  if (name === "photos") return renderPhotosTab(body, id);
  if (name === "rooms") return renderRoomsTab(body, id);
}

function renderStatusTab(body, id) {
  const h = _state.hotel;
  body.innerHTML = `
    <p>
      <span class="status-pill ${h.status}">${t("hotels.status." + h.status)}</span>
      ${h.status !== "published"
        ? `<button class="secondary" id="btn-pub">${t("hotel.publish")}</button>`
        : `<button class="secondary" id="btn-unpub">${t("hotel.unpublish")}</button>`}
      <button class="danger" id="btn-del">${t("app.delete")}</button>
    </p>
  `;
  document.getElementById("btn-pub")?.addEventListener("click", () => statusChange(id, "published"));
  document.getElementById("btn-unpub")?.addEventListener("click", () => statusChange(id, "draft"));
  document.getElementById("btn-del").onclick = async () => {
    if (!confirm(t("hotel.delete_confirm"))) return;
    try {
      await api.deleteHotel(id);
      navigate("/");
    } catch (e) {
      alert(e.message);
    }
  };
}

function renderShareTab(body) {
  const h = _state.hotel;
  body.innerHTML = `
    <div class="form-row">
      <label>${t("hotel.share.web")}</label>
      <input id="share-web" readonly value="https://book.dev.raftforge.art/?hotel=${h.slug}" />
    </div>
    <div class="form-row">
      <label>${t("hotel.share.tg_start")}</label>
      <input id="share-tg-start" readonly value="https://t.me/rforge_stay_bot?start=hotel_${h.slug}" />
    </div>
    <div class="form-row">
      <label>${t("hotel.share.tg_startapp")}</label>
      <input id="share-tg-app" readonly value="https://t.me/rforge_stay_bot?startapp=hotel_${h.slug}" />
    </div>
    <div class="row-actions">
      <button class="secondary" id="btn-copy-web">${t("hotel.share.copy_web")}</button>
      <button class="secondary" id="btn-copy-tg-start">${t("hotel.share.copy_tg_start")}</button>
      <button class="secondary" id="btn-copy-tg-app">${t("hotel.share.copy_tg_startapp")}</button>
    </div>
    <div id="copy-toast" class="success" style="display:none">${t("hotel.share.copied")}</div>
  `;
  const copyTo = (selector) => {
    const el = document.querySelector(selector);
    el.select();
    navigator.clipboard?.writeText(el.value).catch(() => document.execCommand("copy"));
    const toast = document.getElementById("copy-toast");
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 1500);
  };
  document.getElementById("btn-copy-web").onclick = () => copyTo("#share-web");
  document.getElementById("btn-copy-tg-start").onclick = () => copyTo("#share-tg-start");
  document.getElementById("btn-copy-tg-app").onclick = () => copyTo("#share-tg-app");
}

function renderDescriptionTab(body, id) {
  body.innerHTML = descriptionFormHtml(_state.hotel);
  wireSaveHandler(false, id);
}

function renderPhotosTab(body, id) {
  const photos = _state.hotel.photos || [];
  body.innerHTML = `
    <div id="photos-list">
      ${photos.length === 0
        ? `<p class="muted">${t("photos.empty")}</p>`
        : photos
            .map(
              (url, i) => `
              <div class="photo-row">
                <img class="photo-thumb" src="${escapeHtml(url)}" alt="" />
                <div class="photo-meta">
                  ${i === 0 ? `<span class="status-pill published">${t("photos.main")}</span>` : ""}
                  <div class="meta" style="word-break:break-all">${escapeHtml(url)}</div>
                </div>
                <div class="photo-actions">
                  <button class="secondary" data-up="${i}" ${i === 0 ? "disabled" : ""}>${t("photos.up")}</button>
                  <button class="secondary" data-down="${i}" ${i === photos.length - 1 ? "disabled" : ""}>${t("photos.down")}</button>
                  <button class="danger" data-del="${escapeHtml(url)}">${t("photos.delete")}</button>
                </div>
              </div>`,
            )
            .join("")}
    </div>
    <div class="photo-upload">
      <label class="meta">${t("photos.allowed")}</label>
      <input type="file" id="photo-file" accept="image/jpeg,image/png,image/webp" />
      <button class="primary" id="photo-upload-btn" disabled>${t("photos.upload")}</button>
      <div id="photo-status" class="meta"></div>
    </div>
  `;

  body.querySelectorAll("button[data-up]").forEach((b) => {
    b.onclick = () => moveAndSave(Number(b.dataset.up), -1, id);
  });
  body.querySelectorAll("button[data-down]").forEach((b) => {
    b.onclick = () => moveAndSave(Number(b.dataset.down), +1, id);
  });
  body.querySelectorAll("button[data-del]").forEach((b) => {
    b.onclick = () => deletePhoto(b.dataset.del, id);
  });

  const fileInput = document.getElementById("photo-file");
  const uploadBtn = document.getElementById("photo-upload-btn");
  fileInput.onchange = () => {
    uploadBtn.disabled = !fileInput.files || fileInput.files.length === 0;
  };
  uploadBtn.onclick = () => uploadPhoto(fileInput, id);
}

async function moveAndSave(index, delta, hotelId) {
  const photos = [...(_state.hotel.photos || [])];
  const j = index + delta;
  if (j < 0 || j >= photos.length) return;
  [photos[index], photos[j]] = [photos[j], photos[index]];
  try {
    const res = await api.reorderPhotos(hotelId, photos);
    _state.hotel.photos = res.photos;
    switchTab("photos", hotelId);
  } catch (e) {
    alert(e.message);
  }
}

async function deletePhoto(url, hotelId) {
  if (!confirm(t("photos.delete") + " ?")) return;
  try {
    await api.deletePhoto(hotelId, url);
    _state.hotel.photos = (_state.hotel.photos || []).filter((u) => u !== url);
    switchTab("photos", hotelId);
  } catch (e) {
    alert(e.message);
  }
}

async function uploadPhoto(fileInput, hotelId) {
  const f = fileInput.files && fileInput.files[0];
  if (!f) return;
  const statusEl = document.getElementById("photo-status");
  statusEl.textContent = t("photos.uploading");
  try {
    const res = await api.uploadPhoto(hotelId, f);
    _state.hotel.photos = res.photos;
    switchTab("photos", hotelId);
  } catch (e) {
    statusEl.innerHTML = `<span class="error">${escapeHtml(e.message)}</span>`;
  }
}

function renderRoomsTab(body, id) {
  body.innerHTML = `
    <div id="rooms"></div>
    <a href="#/room/${id}/new" class="secondary" style="display:inline-block;padding:8px 14px;text-decoration:none;border:1px solid var(--accent);border-radius:4px;color:var(--accent);background:var(--surface);margin-top:8px">${t("hotel.add_room")}</a>
  `;
  renderRoomsList(_state.rooms, id);
}

function wireSaveHandler(isNew, id) {
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
    for (const k of Object.keys(payload)) {
      if (payload[k] === undefined) delete payload[k];
    }
    try {
      if (isNew) {
        const created = await api.createHotel(payload);
        navigate("/hotel/" + created.id);
      } else {
        const updated = await api.updateHotel(id, payload);
        _state.hotel = updated;
        document.getElementById("form-err").innerHTML = `<span class="success">${t("avail.saved")}</span>`;
      }
    } catch (e) {
      document.getElementById("form-err").textContent = t("app.error", { msg: e.message });
    }
  };
}

async function statusChange(id, status) {
  try {
    const updated = await api.updateHotel(id, { status });
    _state.hotel = updated;
    switchTab("status", id);
  } catch (e) {
    alert(e.message);
  }
}

function renderRoomsList(rooms, hotelId) {
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
