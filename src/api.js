const BASE = "/api/v1";

let _token = localStorage.getItem("booking_token") || "";
let _user = JSON.parse(localStorage.getItem("booking_user") || "null");

async function call(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (_token) headers.Authorization = `Bearer ${_token}`;
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) {
    const err = new Error(data.message || r.statusText);
    err.code = data.error || "http_error";
    err.status = r.status;
    throw err;
  }
  return data;
}

export const api = {
  hasToken: () => !!_token,
  user: () => _user,
  setSession(token, user) {
    _token = token;
    _user = user;
    localStorage.setItem("booking_token", token);
    localStorage.setItem("booking_user", JSON.stringify(user));
  },
  clearSession() {
    _token = "";
    _user = null;
    localStorage.removeItem("booking_token");
    localStorage.removeItem("booking_user");
  },

  authTg: (initData) => call("POST", "/auth/tg", { init_data: initData }),
  authDev(tgId, name) {
    const qs = new URLSearchParams({
      telegram_id: String(tgId),
      first_name: name,
      role: "partner",
    });
    return call("POST", `/auth/dev-login?${qs}`);
  },
  whoami: () => call("GET", "/auth/whoami"),

  // Hotels (partner)
  listHotels: () => call("GET", "/p/hotels"),
  getHotel: (id) => call("GET", `/p/hotels/${id}`),
  createHotel: (payload) => call("POST", "/p/hotels", payload),
  updateHotel: (id, payload) => call("PUT", `/p/hotels/${id}`, payload),
  deleteHotel: (id) => call("DELETE", `/p/hotels/${id}`),

  // Rooms
  listRooms: (hid) => call("GET", `/p/hotels/${hid}/rooms`),
  getRoom: (hid, rid) => call("GET", `/p/hotels/${hid}/rooms/${rid}`),
  createRoom: (hid, payload) => call("POST", `/p/hotels/${hid}/rooms`, payload),
  updateRoom: (hid, rid, payload) => call("PUT", `/p/hotels/${hid}/rooms/${rid}`, payload),
  deleteRoom: (hid, rid) => call("DELETE", `/p/hotels/${hid}/rooms/${rid}`),

  // Availability
  getAvailability: (hid, rid, from, to) =>
    call("GET", `/p/hotels/${hid}/rooms/${rid}/availability?from=${from}&to=${to}`),
  updateAvailability: (hid, rid, nights) =>
    call("PUT", `/p/hotels/${hid}/rooms/${rid}/availability`, { nights }),

  // Bookings (incoming)
  listBookings: (statusFilter) =>
    call("GET", "/p/bookings" + (statusFilter ? `?status=${statusFilter}` : "")),
};
