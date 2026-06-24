# Contrato: Itinerary Summary modal (round-trip)

Contrato wire entre frontend y agente backend para abrir el modal de
**Itinerary Summary**. El front emite un intent al hacer click; el agente
responde con un comando que trae la data y abre el modal.

Spec de diseño: [`docs/superpowers/specs/2026-06-09-show-itinerary-summary-design.md`](../superpowers/specs/2026-06-09-show-itinerary-summary-design.md).

> **Casing:** todo el payload del wire va en **snake_case**, igual que el resto
> de los comandos (`show_cabin_options`, etc.). El front mapea a su forma interna
> camelCase en el reducer.

> **Datos parciales:** el modal puede abrirse con el booking a medio armar.
> **Cualquier sección o campo puede venir `null`** (`cabin`, `package`,
> `itinerary`, `total`, o campos sueltos de `details`/`header`). Por cada valor
> `null` el front muestra un **placeholder** ("Aún no seleccionado", celda muted,
> etc.); nunca rompe el render. El backend siempre manda la key con valor `null`
> (no la omite).

## 1. Intent que el backend recibe

**Topic LiveKit:** `frontend-intent`

```json
{
  "version": "v1",
  "topic": "frontend-intent",
  "intent": "view_itinerary_summary",
  "user_message": "User opened the itinerary summary",
  "correlationId": "<opcional>"
}
```

- `entities`: **ninguna** (se omite).
- Disparo: el usuario hace click en el botón "Itinerary Summary".
- **Respuesta esperada:** un comando `show_itinerary_summary` (ver abajo).

## 2. Comando que el backend debe emitir

**Topic LiveKit:** `ui-commands` (dentro del envelope con `commands: [...]`).

```json
{
  "type": "show_itinerary_summary",
  "correlationId": "<mismo del intent, si vino>",
  "sessionId": "<opcional>",
  "payload": {
    "header": {
      "title": "Danube Serenade: Iconic Capitals & Wachau Valley",
      "subtitle": "Claire & David's anniversary cruise",
      "image": "https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg"
    },
    "details": {
      "guests": "2 people",
      "month": "September",
      "embarkation": "Vienna",
      "stops": "Budapest +3",
      "dates": "20 – 27 Sep 2026",
      "price_per_person": "€ 9,174 p.p.",
      "cabin_name": "Owner's Suite"
    },
    "cabin": {
      "id": "owners-suite",
      "name": "Owner's Suite",
      "image": "/cabin/1.png",
      "guests": 2,
      "area": 80,
      "price_from": 12229,
      "view": "Balcony",
      "detail": {
        "gallery": ["/cabin-modal/1.png", "/cabin-modal/2.png", "/cabin-modal/3.png", "/cabin-modal/4.png"],
        "bedroom": ["King-size bed (convertible to two twin beds)"],
        "bathroom": ["Single vanity", "Glass-enclosed shower"],
        "amenities": ["In-suite safe", "Nespresso coffee machine", "French Balcony"]
      }
    },
    "package": {
      "price_per_person": "€ 9,174 p.p.",
      "name": "Premium All Inclusive Including Excursions",
      "inclusions": ["Free Wifi", "Minibar", "24h Roomservice", "Dinner in \"The Atelier\" Included"]
    },
    "itinerary": {
      "title": "Vienna – Vienna",
      "countries": ["Austria", "Hungary", "Slovakia"],
      "description": "In one week, explore Riverside luxury along the Danube, visiting Vienna, Bratislava, and Budapest.",
      "cities": [
        {
          "id": "vienna",
          "name": "Vienna",
          "country": "Austria",
          "days": "Days 1, 2 & 8",
          "image": "https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg"
        }
      ]
    },
    "total": "€ 27,240"
  }
}
```

- **Efecto en el front:** llena el slice `itinerarySummary` y abre el modal.
- El **cierre es puramente local** (X / Esc): el backend NO recibe ningún intent
  al cerrar y no debe esperar confirmación.

### Ejemplo con datos parciales

Booking recién empezado: nada elegido todavía. El modal abre y muestra
placeholders en cada sección.

```json
{
  "type": "show_itinerary_summary",
  "payload": {
    "header": {
      "title": "Danube Serenade: Iconic Capitals & Wachau Valley",
      "subtitle": null,
      "image": "https://res.cloudinary.com/.../page_004_image_01.jpg"
    },
    "details": {
      "guests": "2 people",
      "month": null,
      "embarkation": null,
      "stops": null,
      "dates": null,
      "price_per_person": null,
      "cabin_name": null
    },
    "cabin": null,
    "package": null,
    "itinerary": null,
    "total": null
  }
}
```

## 3. Reglas de campos

**Todo es nullable.** Cualquier campo o sección puede llegar `null`; el front
muestra un placeholder. Las únicas garantías de presencia son: la **key existe**
(no se omite) y, cuando un objeto/array NO es `null`, sus campos internos siguen
las reglas de abajo. Precios/fechas/labels llegan **ya formateados** (el front no
recalcula).

| Campo (wire, snake_case) | Tipo | Placeholder si `null` |
|---|---|---|
| `header.title` | string \| null | título genérico / vacío |
| `header.subtitle` | string \| null | se oculta |
| `header.image` | string \| null | imagen fallback |
| `details.guests` | string \| null | "—" muted |
| `details.month` | string \| null | "—" muted |
| `details.embarkation` | string \| null | "—" muted |
| `details.stops` | string \| null | "—" muted |
| `details.dates` | string \| null | "—" muted |
| `details.price_per_person` | string \| null | "—" muted |
| `details.cabin_name` | string \| null | "—" muted |
| `cabin` | object \| null | card "Aún no seleccionaste tu cabina" |
| `package` | object \| null | card "Aún no seleccionaste tu paquete" |
| `itinerary` | object \| null | sección "Itinerario aún sin definir" |
| `total` | string \| null | "—" muted |

Cuando **NO** son `null`, los objetos cumplen:

| Campo interno | Tipo | Notas |
|---|---|---|
| `cabin` | object | **mismo shape que `Cabin` de `show_cabin_options`**: `id, name, image, guests, area, price_from, view, detail{ gallery(min 1), bedroom[], bathroom[], amenities[] }` |
| `package.price_per_person` | string \| null | |
| `package.name` | string \| null | |
| `package.inclusions` | string[] | puede ir vacío |
| `itinerary.title` | string \| null | ej. `"Vienna – Vienna"` |
| `itinerary.countries` | string[] | puede ir vacío |
| `itinerary.description` | string \| null | |
| `itinerary.cities[]` | object | `{ id, name, country, days, image }`, todos string |

> El texto exacto de cada placeholder lo define el front; el backend solo manda
> `null`.

## 4. Casing

Todo el payload va en **snake_case** (`price_per_person`, `cabin_name`,
`price_from`, …), consistente con el resto de los comandos del wire. El front
recibe snake_case y mapea a su forma interna camelCase (`ItinerarySummary`) en el
reducer — la frontera snake→camel vive del lado del front, como manda la
convención del repo.
