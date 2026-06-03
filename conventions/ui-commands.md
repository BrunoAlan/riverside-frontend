# Comandos de UI del backend

Lista de todos los comandos que el backend puede emitir y que cambian la UI.

Fuente de verdad: [`lib/agent-ui/commands.ts`](../lib/agent-ui/commands.ts) — el schema `UiCommand` es un `z.discriminatedUnion('type', [...])`, así que el campo `type` es el discriminador.

## Campos base (todos los comandos)

Cada comando extiende `Base`:

| Campo           | Tipo     | Requerido | Descripción                      |
| --------------- | -------- | --------- | -------------------------------- |
| `correlationId` | `string` | sí        | ID para correlacionar la emisión |
| `sessionId`     | `string` | no        | ID de sesión                     |
| `type`          | `string` | sí        | Discriminador del comando        |
| `payload`       | `object` | varía     | Datos específicos del comando    |

## Comandos

Todos los comandos viajan como JSON con esta forma general: campos base en la raíz + `payload`. Abajo, cada comando incluye un ejemplo completo del formato.

### 1. `show_discovery_canvas`

Muestra el canvas de descubrimiento.

- **payload:** `{}` (opcional)

```json
{
  "type": "show_discovery_canvas",
  "correlationId": "abc-123"
}
```

### 2. `soft_redirect`

Redirección suave (p. ej. cuando faltan datos para continuar).

- **payload:**
  - `reason_code: string`
  - `missing?: string[]`

```json
{
  "type": "soft_redirect",
  "correlationId": "abc-123",
  "payload": {
    "reason_code": "MISSING_DATE_PREFERENCE",
    "missing": ["dates"]
  }
}
```

### 3. `show_itinerary_options`

Muestra las opciones del itinerario completo.

- **payload:** `{ itinerary: ItineraryFull }`
- **`ItineraryFull`:**
  - `id: string`
  - `name: string`
  - `duration: { days: int, nights: int }`
  - `match_score: number`
  - `departure_dates: string[]`
  - `center: [number, number]` — `[lon, lat]`
  - `zoom: number`
  - `cities: ItineraryCity[]` (mínimo 1)
- **`ItineraryCity`:**
  - `id: string`
  - `name: string`
  - `country: string`
  - `image: string`
  - `days: string`
  - `lon: number`
  - `lat: number`
  - `day_details?: { day: string, description: string }[]`

```json
{
  "type": "show_itinerary_options",
  "correlationId": "64c2a3c4-2623-4f4b-99a3-bbc3bb1db205",
  "payload": {
    "itinerary": {
      "id": "danube_legends_from_budapest_to_vienna",
      "name": "Danube Legends from Budapest to Vienna",
      "duration": { "days": 12, "nights": 11 },
      "match_score": 0.6667,
      "departure_dates": ["2026-04-22", "2026-05-06"],
      "center": [16.570283333333332, 48.15495000000001],
      "zoom": 6,
      "cities": [
        {
          "id": "vienna",
          "name": "Vienna",
          "country": "Austria",
          "image": "https://res.cloudinary.com/demo/image/upload/vienna.jpg",
          "days": "Days 5, 10 & 11",
          "lon": 16.3738,
          "lat": 48.2082,
          "day_details": [{ "day": "Day 01", "description": "Arrive in Vienna." }]
        }
      ]
    }
  }
}
```

### 4. `show_destination_detail`

Muestra el detalle de un destino con galería de imágenes.

- **payload:**
  - `destination: Destination`
    - `id: string`
    - `name: string`
    - `country: string`
    - `region: string`
    - `aliases: string[]`
  - `images: DestinationImage[]` (mínimo 1)
    - `url: string` (URL válida)
    - `caption: string`

```json
{
  "type": "show_destination_detail",
  "correlationId": "d1",
  "payload": {
    "destination": {
      "id": "vienna",
      "name": "Vienna",
      "country": "Austria",
      "region": "Danube",
      "aliases": ["City of Music"]
    },
    "images": [
      { "url": "https://res.cloudinary.com/demo/image/upload/a.jpg", "caption": "Vienna at dusk" },
      {
        "url": "https://res.cloudinary.com/demo/image/upload/b.jpg",
        "caption": "Riverside terrace"
      }
    ]
  }
}
```

### 5. `set_booking_summary`

Actualiza el resumen de la reserva (booking summary).

- **payload:** `BookingSummarySnapshot`
  - `people: { label: string } | null`
  - `month: { label: string } | null`
  - `embarkation: { label: string } | null`
  - `stops: { primary: string, extra: int >= 0 } | null`
  - `duration: { label: string } | null`
  - `price: { label: string } | null`
  - `slots: { label: string, state: 'active' | 'filled' | 'empty' }[]` (máximo 6)
  - `cta: { label: string, enabled: boolean }`

> Nota: los campos tipo `LabelField` (`people`, `month`, `embarkation`, `duration`, `price`) se normalizan a `null` cuando llegan como `{ label: null }`.

```json
{
  "type": "set_booking_summary",
  "correlationId": "b1",
  "payload": {
    "people": { "label": "2 People" },
    "month": { "label": "March" },
    "embarkation": { "label": "Budapest" },
    "stops": { "primary": "Bratislava", "extra": 3 },
    "duration": { "label": "5 days" },
    "price": { "label": "from 2,368 pp." },
    "slots": [
      { "label": "Draft itinerary", "state": "active" },
      { "label": "Empty slot", "state": "empty" },
      { "label": "Empty slot", "state": "empty" }
    ],
    "cta": { "label": "Continue to booking", "enabled": true }
  }
}
```

### 6. `show_cabin_options`

Muestra las opciones de cabinas.

- **payload:** `{ cabins: Cabin[] }` (mínimo 1)
- **`Cabin`:**
  - `id: string`
  - `name: string`
  - `image: string`
  - `guests: int`
  - `area: number`
  - `price_from: number`
  - `view: string`
  - `detail: { gallery: string[] (min 1), bedroom: string[], bathroom: string[], amenities: string[] }`

```json
{
  "type": "show_cabin_options",
  "correlationId": "co1",
  "payload": {
    "cabins": [
      {
        "id": "owners-suite",
        "name": "Owner's Suite",
        "image": "/cabin/1.png",
        "guests": 2,
        "area": 80,
        "price_from": 12229,
        "view": "Balcony",
        "detail": {
          "gallery": ["/cabin-modal/1.png"],
          "bedroom": ["King-size bed"],
          "bathroom": ["Single vanity"],
          "amenities": ["In-suite safe"]
        }
      }
    ]
  }
}
```

### 7. `show_cabin_detail`

Muestra el detalle de una cabina concreta.

- **payload:** `{ cabin_id: string | null }`

```json
{
  "type": "show_cabin_detail",
  "correlationId": "cd1",
  "payload": { "cabin_id": "owners-suite" }
}
```

> `cabin_id: null` se usa para cerrar el detalle.

### 8. `show_city_detail`

Muestra el detalle de una ciudad concreta del itinerario.

- **payload:** `{ city_id: string | null }`

```json
{
  "type": "show_city_detail",
  "correlationId": "c-detail",
  "payload": { "city_id": "vienna" }
}
```

> `city_id: null` se usa para cerrar el detalle.

## Tabla resumen

| `type`                    | payload (resumen)              |
| ------------------------- | ------------------------------ |
| `show_discovery_canvas`   | `{}` (opcional)                |
| `soft_redirect`           | `{ reason_code, missing? }`    |
| `show_itinerary_options`  | `{ itinerary: ItineraryFull }` |
| `show_destination_detail` | `{ destination, images[] }`    |
| `set_booking_summary`     | `BookingSummarySnapshot`       |
| `show_cabin_options`      | `{ cabins: Cabin[] }`          |
| `show_cabin_detail`       | `{ cabin_id: string \| null }` |
| `show_city_detail`        | `{ city_id: string \| null }`  |
