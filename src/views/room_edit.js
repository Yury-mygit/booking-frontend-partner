import { api } from "../api.js";
import { t } from "../i18n.js";
import { navigate } from "../router.js";
import { escapeHtml } from "../util.js";

const FIELDS = [
  ["name_ru", "room.name_ru", "input"],
  ["name_ky", "room.name_ky", "input"],
  ["name_en", "room.name_en", "input"],
  ["description_ru", "room.description_ru", "textarea"],
  ["capacity", "room.capacity", "input-number"],
  ["price_kgs", "room.price_kgs", "input-number"],
];

export async function renderRoomEdit({ hotelId, roomId }) {
  const isNew = roomId === "new";
  const app = document.getElementById("app");
  app.innerHTML = t("app.loading");

  let room = null;
  if (!isNew) {
    try {
      room = await api.getRoom(hotelId, roomId);
    } catch (e) {
      app.innerHTML = `<div class="error">${t("app.error", { msg: e.message })}</div>`;
      return;
    }
  }

  app.innerHTML = `
    <p><a href="#/hotel/${hotelId}">${t("app.back")}</a></p>
    <h1>${isNew ? t("room.title.new") : t("room.title.edit")}</h1>
    <form id="form">
      ${FIELDS.map(([k, key, kind]) => {
        const v = room?.[k] ?? (kind === "input-number" ? "" : "");
        if (kind === "textarea") {
          return `<div class="form-row"><label>${t(key)}</label>
            <textarea name="${k}">${escapeHtml(v)}</textarea></div>`;
        }
        const inputType = kind === "input-number" ? "number" : "text";
        return `<div class="form-row"><label>${t(key)}</label>
          <input type="${inputType}" name="${k}" value="${escapeHtml(v)}" /></div>`;
      }).join("")}
      <button class="primary full" id="btn-save">${t("app.save")}</button>
      ${!isNew ? `<p style="margin-top:10px"><button class="danger" id="btn-del">${t("app.delete")}</button></p>` : ""}
      <div id="err" class="error"></div>
    </form>
  `;

  document.getElementById("btn-save").onclick = async (e) => {
    e.preventDefault();
    const form = document.getElementById("form");
    const payload = {};
    for (const [k, , kind] of FIELDS) {
      const raw = form[k].value.trim();
      if (raw === "" && !isNew) { payload[k] = null; continue; }
      if (raw === "") continue;
      payload[k] = kind === "input-number" ? Number(raw) : raw;
    }
    try {
      if (isNew) {
        await api.createRoom(hotelId, payload);
      } else {
        await api.updateRoom(hotelId, roomId, payload);
      }
      navigate("/hotel/" + hotelId);
    } catch (e) {
      document.getElementById("err").textContent = t("app.error", { msg: e.message });
    }
  };

  document.getElementById("btn-del")?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!confirm(t("room.delete_confirm"))) return;
    try {
      await api.deleteRoom(hotelId, roomId);
      navigate("/hotel/" + hotelId);
    } catch (e) {
      document.getElementById("err").textContent = t("app.error", { msg: e.message });
    }
  });
}
