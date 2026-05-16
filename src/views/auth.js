import { api } from "../api.js";
import { t } from "../i18n.js";

export function renderDevLogin(onLoggedIn) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <h1>${t("auth.dev_title")}</h1>
    <div class="form-row"><label>${t("auth.tg_id")}</label>
      <input id="dev-tg" type="number" value="999001" /></div>
    <div class="form-row"><label>${t("auth.first_name")}</label>
      <input id="dev-name" value="DemoPartner" /></div>
    <button class="primary full" id="dev-go">${t("auth.login")}</button>
    <div id="dev-err" class="error"></div>
    <p class="muted" style="margin-top:14px">
      Партнёр-вход для разработки. В Telegram WebApp эта страница не появится.
    </p>
  `;
  document.getElementById("dev-go").onclick = async () => {
    try {
      const r = await api.authDev(
        Number(document.getElementById("dev-tg").value),
        document.getElementById("dev-name").value || "DevPartner",
      );
      api.setSession(r.token, r.user);
      onLoggedIn();
    } catch (e) {
      document.getElementById("dev-err").textContent = t("app.error", { msg: e.message });
    }
  };
}
