import { api } from "../api.js";
import { t } from "../i18n.js";
import { escapeHtml, relativeTime } from "../util.js";

const PAGE_SIZE = 50;
const ACTION_OPTIONS = [
  "", // all
  "hotel.create", "hotel.update", "hotel.publish", "hotel.unpublish", "hotel.delete",
  "room.create", "room.update", "room.delete", "room.availability_update",
  "service.create", "service.update", "service.delete",
  "booking.confirm", "booking.cancel", "walkin.create",
  "client.update",
  "staff.add", "staff.update", "staff.remove",
];

const _state = { offset: 0, action: "", items: [], hasMore: true };

export async function renderAudit() {
  const app = document.getElementById("app");
  const ownerId = api.activeOwnerId();
  if (!ownerId) {
    app.innerHTML = `<p class="muted">${t("audit.no_owner")}</p>`;
    return;
  }

  app.innerHTML = `
    <h2>${t("audit.title")}</h2>
    <div class="audit-filters">
      <label>${t("audit.action_filter")}
        <select id="audit-action">
          ${ACTION_OPTIONS.map((a) => `<option value="${a}">${a ? a : t("audit.action_any")}</option>`).join("")}
        </select>
      </label>
    </div>
    <div id="audit-body"><p class="muted">${t("app.loading")}</p></div>
    <div class="row-actions" id="audit-pager"></div>
  `;

  document.getElementById("audit-action").value = _state.action;
  document.getElementById("audit-action").onchange = async (e) => {
    _state.action = e.target.value;
    _state.offset = 0;
    _state.items = [];
    _state.hasMore = true;
    await loadPage();
  };

  _state.offset = 0;
  _state.items = [];
  _state.hasMore = true;
  await loadPage();
}

async function loadPage() {
  const ownerId = api.activeOwnerId();
  const opts = { ownerId, limit: PAGE_SIZE, offset: _state.offset };
  if (_state.action) opts.action = _state.action;
  let page;
  try {
    page = await api.listAudit(opts);
  } catch (e) {
    document.getElementById("audit-body").innerHTML =
      `<div class="error">${t("app.error", { msg: e.message })}</div>`;
    return;
  }
  _state.hasMore = page.length === PAGE_SIZE;
  _state.items = _state.items.concat(page);
  renderBody();
  renderPager();
}

function renderBody() {
  const body = document.getElementById("audit-body");
  if (_state.items.length === 0) {
    body.innerHTML = `<p class="muted">${t("audit.empty")}</p>`;
    return;
  }
  body.innerHTML = `
    <table class="recent-table">
      <thead>
        <tr>
          <th>${t("audit.col_when")}</th>
          <th>${t("audit.col_who")}</th>
          <th>${t("audit.col_action")}</th>
          <th>${t("audit.col_subject")}</th>
          <th>${t("audit.col_payload")}</th>
        </tr>
      </thead>
      <tbody>${_state.items.map(renderRow).join("")}</tbody>
    </table>
  `;
}

function renderRow(a) {
  const actor = `${escapeHtml(a.actor_display_name || "—")} · ${a.actor_role === "owner" ? "владелец" : "сотрудник"}`;
  const subject = a.subject_type
    ? `${a.subject_type}#${a.subject_id ?? "—"}`
    : "—";
  const payloadShort = a.payload ? JSON.stringify(a.payload) : "—";
  return `
    <tr>
      <td title="${escapeHtml(a.created_at)}">${escapeHtml(relativeTime(a.created_at, t))}</td>
      <td>${actor}</td>
      <td><code>${escapeHtml(a.action)}</code></td>
      <td>${escapeHtml(subject)}</td>
      <td class="audit-payload">${escapeHtml(payloadShort.slice(0, 120))}${payloadShort.length > 120 ? "…" : ""}</td>
    </tr>
  `;
}

function renderPager() {
  const pager = document.getElementById("audit-pager");
  if (!pager) return;
  pager.innerHTML = _state.hasMore
    ? `<button class="secondary" id="audit-more">${t("audit.load_more")}</button>`
    : (_state.items.length > 0 ? `<p class="muted">${t("audit.no_more")}</p>` : "");
  const btn = document.getElementById("audit-more");
  if (btn) {
    btn.onclick = async () => {
      _state.offset += PAGE_SIZE;
      btn.disabled = true;
      await loadPage();
    };
  }
}
