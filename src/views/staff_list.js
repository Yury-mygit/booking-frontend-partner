import { api } from "../api.js";
import { t } from "../i18n.js";
import { escapeHtml } from "../util.js";

const PERMS = ["manage_hotel", "manage_rooms", "manage_bookings", "manage_staff"];

export async function renderStaffList() {
  const app = document.getElementById("app");
  const ownerId = api.activeOwnerId();
  if (!ownerId) {
    app.innerHTML = `<p class="muted">${t("staff.no_owner")}</p>`;
    return;
  }
  const owner = api.owners().find((o) => o.owner_user_id === ownerId);
  const canManage = !!(owner && (owner.is_self || (owner.perms && owner.perms.manage_staff)));
  if (!canManage) {
    app.innerHTML = `<p class="muted">${t("staff.forbidden")}</p>`;
    return;
  }

  app.innerHTML = `<p class="muted">${t("app.loading")}</p>`;
  let staff;
  try {
    staff = await api.listStaff({ ownerId });
  } catch (e) {
    app.innerHTML = `<div class="error">${t("app.error", { msg: e.message })}</div>`;
    return;
  }

  app.innerHTML = `
    <h2>${t("staff.title")}</h2>
    <p class="muted">${t("staff.scope_hint", { owner: owner.owner_display_name || "—" })}</p>

    <section class="staff-add">
      <h3>${t("staff.add_title")}</h3>
      <form id="staff-add-form" class="form">
        <div class="form-row">
          <label for="staff-tg-id">${t("staff.telegram_id")}</label>
          <input id="staff-tg-id" type="number" required min="1" placeholder="123456789" />
        </div>
        <div class="form-row">
          <label for="staff-note">${t("staff.note")}</label>
          <input id="staff-note" type="text" maxlength="128" placeholder="${t("staff.note_placeholder")}" />
        </div>
        <fieldset class="perms-group">
          <legend>${t("staff.perms")}</legend>
          ${PERMS.map((p) => `
            <label class="perm-row">
              <input type="checkbox" name="${p}" ${p === "manage_bookings" ? "checked" : ""} />
              <span>${t("staff.perm." + p)}</span>
            </label>
          `).join("")}
        </fieldset>
        <button class="primary" type="submit">${t("staff.add_btn")}</button>
        <div id="staff-add-err" class="error" style="display:none"></div>
      </form>
    </section>

    <section class="staff-list">
      <h3>${t("staff.list_title")}</h3>
      ${staff.length === 0
        ? `<p class="muted">${t("staff.empty")}</p>`
        : `<table class="recent-table">
            <thead>
              <tr>
                <th>${t("staff.col_who")}</th>
                <th>${t("staff.col_tg")}</th>
                <th>${t("staff.col_perms")}</th>
                <th>${t("staff.col_note")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${staff.map(renderStaffRow).join("")}</tbody>
          </table>`}
    </section>
  `;

  wireAddForm(ownerId);
  wireRowActions();
}

function renderStaffRow(s) {
  const permsLabels = PERMS.filter((p) => s.perms[p]).map((p) => t("staff.perm_short." + p)).join(", ") || "—";
  return `
    <tr data-id="${s.id}">
      <td>${escapeHtml(s.staff_display_name || "—")}</td>
      <td><code>${s.staff_telegram_id}</code></td>
      <td class="perms-cell">${escapeHtml(permsLabels)}</td>
      <td>${escapeHtml(s.note || "—")}</td>
      <td class="row-actions">
        <button class="link" data-act="edit" data-id="${s.id}">${t("staff.edit")}</button>
        <button class="link danger" data-act="remove" data-id="${s.id}">${t("staff.remove")}</button>
      </td>
    </tr>
  `;
}

function wireAddForm(ownerId) {
  const form = document.getElementById("staff-add-form");
  if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const errBox = document.getElementById("staff-add-err");
    errBox.style.display = "none";
    const tgId = Number(document.getElementById("staff-tg-id").value);
    const note = document.getElementById("staff-note").value.trim() || null;
    const perms = {};
    PERMS.forEach((p) => {
      perms[p] = form.querySelector(`input[name=${p}]`).checked;
    });
    try {
      await api.addStaff({ telegram_id: tgId, perms, note }, { ownerId });
      // Refresh whoami so backend's view of accessible_owners stays consistent
      // (no change for the actor, but updates display_name caches).
      try {
        const w = await api.whoami();
        api.setSession(api.authToken(), api.user(), w.accessible_owners || []);
      } catch (_) {}
      await renderStaffList();
    } catch (err) {
      errBox.textContent = t("app.error", { msg: err.message });
      errBox.style.display = "block";
    }
  };
}

function wireRowActions() {
  document.querySelectorAll(".staff-list button[data-act]").forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.id);
      const act = btn.dataset.act;
      if (act === "remove") {
        if (!confirm(t("staff.remove_confirm"))) return;
        try {
          await api.removeStaff(id);
          await renderStaffList();
        } catch (err) {
          alert(err.message);
        }
      } else if (act === "edit") {
        openEditModal(id);
      }
    };
  });
}

async function openEditModal(staffId) {
  const ownerId = api.activeOwnerId();
  // Use cached list — re-fetch to be safe.
  const list = await api.listStaff({ ownerId });
  const s = list.find((x) => x.id === staffId);
  if (!s) return alert(t("app.error", { msg: "not found" }));

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card">
      <h3>${t("staff.edit_title")}</h3>
      <p class="muted">${escapeHtml(s.staff_display_name || "—")} · <code>${s.staff_telegram_id}</code></p>
      <div class="form-row">
        <label>${t("staff.note")}</label>
        <input id="m-note" type="text" maxlength="128" value="${escapeHtml(s.note || "")}" />
      </div>
      <fieldset class="perms-group">
        <legend>${t("staff.perms")}</legend>
        ${PERMS.map((p) => `
          <label class="perm-row">
            <input type="checkbox" name="${p}" ${s.perms[p] ? "checked" : ""} />
            <span>${t("staff.perm." + p)}</span>
          </label>
        `).join("")}
      </fieldset>
      <div class="row-actions">
        <button class="secondary" id="m-cancel">${t("app.cancel")}</button>
        <button class="primary" id="m-save">${t("app.save")}</button>
      </div>
      <div id="m-err" class="error" style="display:none"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById("m-cancel").onclick = () => overlay.remove();
  document.getElementById("m-save").onclick = async () => {
    const note = document.getElementById("m-note").value.trim() || null;
    const perms = {};
    PERMS.forEach((p) => {
      perms[p] = overlay.querySelector(`input[name=${p}]`).checked;
    });
    try {
      await api.updateStaff(staffId, { perms, note });
      overlay.remove();
      await renderStaffList();
    } catch (err) {
      const errBox = document.getElementById("m-err");
      errBox.textContent = t("app.error", { msg: err.message });
      errBox.style.display = "block";
    }
  };
}
