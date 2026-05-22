import { t } from "./i18n.js";

const SVG_ATTR = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const MAIN_NAV_ICONS = {
  hotels: `<svg ${SVG_ATTR}><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 9h2v2H9zM13 9h2v2h-2zM9 13h2v2H9zM13 13h2v2h-2zM10 21v-4h4v4"></path></svg>`,
  rooms: `<svg ${SVG_ATTR}><path d="M3 18v-7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7"></path><path d="M3 14h18"></path><path d="M3 18v2M21 18v2"></path><rect x="6" y="10" width="5" height="3" rx="1"></rect></svg>`,
  bookings: `<svg ${SVG_ATTR}><rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>`,
  clients: `<svg ${SVG_ATTR}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  staff: `<svg ${SVG_ATTR}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 11l-3 3-2-2"></path></svg>`,
};

const MAIN_NAV_ITEMS = [
  { key: "hotels", labelKey: "nav.hotels", icon: MAIN_NAV_ICONS.hotels, href: "/" },
  { key: "rooms", labelKey: "nav.rooms", icon: MAIN_NAV_ICONS.rooms, href: "/rooms" },
  { key: "bookings", labelKey: "nav.bookings", icon: MAIN_NAV_ICONS.bookings, href: "/bookings" },
  { key: "clients", labelKey: "nav.clients", icon: MAIN_NAV_ICONS.clients, href: "/clients" },
  { key: "staff", labelKey: "nav.staff", icon: MAIN_NAV_ICONS.staff, href: "/staff" },
];

/**
 * Render bottom-nav from an array of items.
 *   item: { key, label, icon (svg string), active?, href? "/path", onClick? }
 * Items with `href` render as <a href="#<path>"> (hash-routed link).
 * Items without `href` render as <button> and invoke `onClick` on click.
 */
export function setBottomNav(items) {
  const nav = document.getElementById("bottomnav");
  if (!nav) return;
  nav.innerHTML = items.map((it) => {
    const cls = `bn-item${it.active ? " active" : ""}`;
    const keyAttr = it.key ? ` data-nav-key="${it.key}"` : "";
    const inner = `${it.icon}<span class="bn-label">${it.label}</span>`;
    return it.href
      ? `<a class="${cls}" href="#${it.href}"${keyAttr}>${inner}</a>`
      : `<button class="${cls}" type="button"${keyAttr}>${inner}</button>`;
  }).join("");
  nav.querySelectorAll("button.bn-item").forEach((btn, i) => {
    const handler = items.filter((x) => !x.href)[i]?.onClick;
    if (handler) btn.addEventListener("click", handler);
  });
}

function _renderMainNav(activeKey) {
  setBottomNav(
    MAIN_NAV_ITEMS.map((it) => ({
      ...it,
      label: t(it.labelKey),
      active: it.key === activeKey,
    })),
  );
}

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
  _renderMainNav(_activeNavKey(path));
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
