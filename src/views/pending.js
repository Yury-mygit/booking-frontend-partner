import { api } from "../api.js";
import { t } from "../i18n.js";
import { escapeHtml } from "../util.js";

export function renderPending() {
  const app = document.getElementById("app");
  const user = api.user() || {};
  app.innerHTML = `
    <div class="pending-screen">
      <div class="pending-emoji">⏳</div>
      <h1>${t("pending.title")}</h1>
      <p>${t("pending.body")}</p>
      <p class="muted small">${t("pending.requested_as")} <b>${escapeHtml(user.first_name || "")}</b> · ID ${user.telegram_id || "—"}</p>
      <div style="margin-top:18px">
        <button id="pending-refresh" class="primary">${t("pending.refresh")}</button>
        <button id="pending-logout" class="secondary">${t("pending.logout")}</button>
      </div>
      <div id="pending-status" class="muted small" style="margin-top:10px"></div>
    </div>
  `;

  document.getElementById("pending-refresh").onclick = async () => {
    const status = document.getElementById("pending-status");
    status.textContent = "…";
    try {
      const me = await api.whoami();
      if (me.partner_status === "verified") {
        // Patch cached user and reload to default route.
        const u = api.user() || {};
        u.partner_status = "verified";
        api.setSession(api.authToken(), u);
        location.hash = "#/";
        location.reload();
      } else {
        status.textContent = t("pending.still_pending");
      }
    } catch (e) {
      status.textContent = e.message;
    }
  };

  document.getElementById("pending-logout").onclick = () => {
    api.clearSession();
    location.hash = "#/";
    location.reload();
  };
}
