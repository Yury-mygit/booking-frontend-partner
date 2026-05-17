import { api } from "../api.js";
import { t } from "../i18n.js";

export function mountOwnerSelector() {
  const sel = document.getElementById("owner-selector");
  const navStaff = document.getElementById("nav-staff");
  if (!sel) return;

  const owners = api.owners();
  if (owners.length === 0) {
    sel.style.display = "none";
    if (navStaff) navStaff.style.display = "none";
    return;
  }

  // Selector itself: hide if only 1 accessible owner (no real choice).
  sel.style.display = owners.length >= 2 ? "" : "none";

  const active = api.activeOwnerId();
  sel.innerHTML = owners
    .map((o) => {
      const label = o.is_self
        ? t("owner.you", { name: o.owner_display_name || "—" })
        : (o.owner_display_name || `Owner #${o.owner_user_id}`);
      return `<option value="${o.owner_user_id}" ${o.owner_user_id === active ? "selected" : ""}>${escapeAttr(label)}</option>`;
    })
    .join("");

  sel.onchange = () => {
    const id = Number(sel.value);
    api.setActiveOwnerId(id);
    updateStaffNav();
  };

  updateStaffNav();
}

function updateStaffNav() {
  const navStaff = document.getElementById("nav-staff");
  if (!navStaff) return;
  // "Сотрудники" visible if active owner is self (you can always manage your
  // own staff) OR if staff has manage_staff at that owner.
  const ownerId = api.activeOwnerId();
  if (!ownerId) {
    navStaff.style.display = "none";
    return;
  }
  const o = api.owners().find((x) => x.owner_user_id === ownerId);
  const can = !!(o && (o.is_self || (o.perms && o.perms.manage_staff)));
  navStaff.style.display = can ? "" : "none";
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
