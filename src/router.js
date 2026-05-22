import { t } from "./i18n.js";

const routes = [];

export function route(pattern, handler, titleKey = null) {
  const regex = new RegExp(
    "^" + pattern.replace(/\{(\w+)\}/g, "(?<$1>[^/]+)") + "$",
  );
  routes.push({ regex, handler, titleKey });
}

export function navigate(hash) {
  if (location.hash === "#" + hash) run();
  else location.hash = hash;
}

function isTgInternalHash(raw) {
  return raw.startsWith("tgWebApp");
}

export function setPageTitle(text) {
  const el = document.getElementById("page-title");
  if (el) el.textContent = text;
}

function _activeNavKey(path) {
  if (path === "/" || path.startsWith("/hotel/")) return "hotels";
  if (path === "/rooms" || path.startsWith("/room/")) return "rooms";
  if (path === "/bookings") return "bookings";
  if (path === "/clients" || path.startsWith("/client/")) return "clients";
  if (path === "/staff" || path === "/audit") return "staff";
  return null;
}

const ROOT_PATHS = new Set(["/", "/rooms", "/bookings", "/clients", "/staff"]);

export function parentPath(path) {
  if (ROOT_PATHS.has(path)) return null;
  let m;
  if ((m = path.match(/^\/hotel\/([^/]+)\/rooms$/))) return `/hotel/${m[1]}`;
  if ((m = path.match(/^\/room\/([^/]+)\/([^/]+)\/availability$/))) return `/room/${m[1]}/${m[2]}`;
  if ((m = path.match(/^\/room\/([^/]+)\/([^/]+)$/))) return `/hotel/${m[1]}/rooms`;
  if (path.startsWith("/hotel/")) return "/";
  if (path.startsWith("/client/")) return "/clients";
  if (path === "/audit") return "/staff";
  return "/";
}

export function currentPath() {
  const raw = location.hash.replace(/^#/, "");
  const full = !raw || isTgInternalHash(raw) ? "/" : raw;
  return full.split("?")[0];
}

function _syncBottomNav(path) {
  const key = _activeNavKey(path);
  document.querySelectorAll("#bottomnav .bn-item").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-nav-key") === key);
  });
}

function _syncBackButton(path) {
  const btn = document.getElementById("back-to-hub");
  if (!btn) return;
  const isRoot = parentPath(path) === null;
  btn.setAttribute("aria-label", t(isRoot ? "nav.back_to_roles" : "nav.back"));
}

export function run() {
  const raw = location.hash.replace(/^#/, "");
  const full = !raw || isTgInternalHash(raw) ? "/" : raw;
  const [path, query = ""] = full.split("?");
  const q = Object.fromEntries(new URLSearchParams(query));
  _syncBottomNav(path);
  _syncBackButton(path);
  for (const { regex, handler, titleKey } of routes) {
    const m = path.match(regex);
    if (m) {
      if (titleKey) setPageTitle(t(titleKey));
      handler({ ...(m.groups || {}), _query: q });
      return;
    }
  }
  setPageTitle(t("pageTitle.notFound") || "Not found");
  document.getElementById("app").textContent = "404: " + path;
}

export function getQuery() {
  const raw = location.hash.replace(/^#/, "");
  if (isTgInternalHash(raw)) return {};
  const q = raw.split("?")[1] || "";
  return Object.fromEntries(new URLSearchParams(q));
}

window.addEventListener("hashchange", run);
