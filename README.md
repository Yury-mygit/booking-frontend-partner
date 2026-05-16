# booking-frontend-partner

Telegram WebApp партнёрский фронт для управления отелями/комнатами/доступностью.

## Стек
- vite 5 + ванильный JS
- i18n ru/ky/en
- TG WebApp; вне Telegram — dev-форма (role=partner, требует `DEV_MODE=true` на бекенде)

## Локально
```bash
docker compose up -d --build
# http://localhost:5189/
```

`/api/*` проксируется на `booking_dev_app:8000` через docker network `shared`.

## Views
- `/` — список моих отелей + новый
- `/hotel/{id}` — редактор отеля (полей i18n + lat/lng/photos) + статус (draft/published/blocked) + список комнат
- `/hotel/new` — создание
- `/room/{hid}/{rid}` — редактор комнаты (capacity/price; capacity update блокируется при active bookings)
- `/room/{hid}/new` — создание комнаты
- `/room/{hid}/{rid}/availability` — календарь 28 дней; клик по дню → modal (status/price_override); `booked` не редактируется
- `/bookings` — входящие брони (все статусы)
