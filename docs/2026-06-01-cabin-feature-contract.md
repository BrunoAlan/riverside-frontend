# Contrato de la feature de Cabinas (Backend ↔ Frontend)

Especificación para que el **backend** alimente la feature de cabinas. Hoy las cabinas están
**hardcodeadas** en el front (`lib/cabins.ts`) y no llegan del agente; el objetivo es que el
agente envíe los datos, igual que ya hace con el itinerario.

El contrato es bidireccional:

1. **Agente → Frontend** (`ui-commands`): el backend manda la lista de cabinas y abre/cierra el
   detalle.
2. **Frontend → Agente** (`frontend-intent`): cuando el **usuario** abre o cierra el detalle
   desde la UI, el front avisa al backend.

El diseño es **espejo exacto del itinerario**:

| Itinerario (referencia)              | Cabinas (este contrato)               |
| ------------------------------------ | ------------------------------------- |
| `show_itinerary_options` (lleva `itinerary`) | `show_cabin_options` (lleva `cabins[]`) |
| `show_city_detail` (solo `city_id`)  | `show_cabin_detail` (solo `cabin_id`)  |

---

## 1) Tipo de dato `Cabin`

Es lo que el backend debe poder construir y enviar por cada cabina. Sirve para armar **la lista**
(campos de la card) y **el detalle** (objeto `detail`).

```ts
type Cabin = {
  // --- Card / lista + encabezado del detalle ---
  id: string;          // slug estable, p. ej. "owners-suite"
  name: string;        // "Owner's Suite"
  image: string;       // URL/ruta de la imagen de la card
  guests: number;      // entero, capacidad
  area: number;        // m² (entero)
  price_from: number;  // EUR (entero); el front formatea los miles
  view: string;        // p. ej. "Balcony"

  // --- Contenido exclusivo del detalle (modal) ---
  detail: {
    gallery: string[];   // >= 1 URL/ruta de imágenes del carrusel
    bedroom: string[];   // bullets de la sección "Bedroom"
    bathroom: string[];  // bullets de la sección "Bathroom"
    amenities: string[]; // bullets de la sección "Amenities"
  };
};
```

> **Naming:** los campos del **payload** van en `snake_case` (`price_from`), igual que
> `day_details` en el itinerario. El front mapea a su tipo interno.

### Cómo se consume cada campo

| Campo            | Dónde se usa                          |
| ---------------- | ------------------------------------- |
| `image`          | Imagen de la card en la grilla        |
| `name`           | Título en card y en detalle           |
| `guests`         | `"{guests} guests"` (card y detalle)  |
| `area`           | `"{area}m²"`                          |
| `price_from`     | `"from {price_from} EUR"` (formateado)|
| `view`           | Chip de vista (p. ej. "Balcony")      |
| `detail.gallery` | Carrusel de imágenes del modal        |
| `detail.bedroom` / `bathroom` / `amenities` | Listas del modal       |

### Ejemplo de una cabina completa

```json
{
  "id": "owners-suite",
  "name": "Owner's Suite",
  "image": "/cabin/1.png",
  "guests": 2,
  "area": 80,
  "price_from": 12229,
  "view": "Balcony",
  "detail": {
    "gallery": [
      "/cabin-modal/1.png",
      "/cabin-modal/2.png",
      "/cabin-modal/3.png",
      "/cabin-modal/4.png"
    ],
    "bedroom": [
      "King-size bed (convertible to two twin beds)",
      "King-size pillows and Superior Cotton linens",
      "Beds face forward"
    ],
    "bathroom": [
      "Single vanity",
      "Glass-enclosed shower with overhead and handheld showerhead",
      "Luxurious terry robes, slippers and upscale amenities",
      "220V power",
      "Hairdryer"
    ],
    "amenities": [
      "Bedside table with convenient iPad",
      "Closet with shelving and full-height hanging",
      "In-suite safe",
      "Writing desk/vanity area",
      "40\" wall-mounted flat-screen HD TV",
      "Refrigerator",
      "Nespresso coffee machine",
      "Adjustable height/extendable coffee/dining table",
      "Sofa",
      "French Balcony"
    ]
  }
}
```

> Datos de referencia de las 6 cabinas hardcodeadas hoy (todas con el mismo `detail`
> placeholder por ahora): `owners-suite`, `mozart-suite`, `penthouse-suite`,
> `riverside-suite`, `symphony-suite`, `harmony-suite`. El backend debe enviar el contenido real
> de `detail` por cabina.

---

## 2) Agente → Frontend — `ui-commands`

- **Topic LiveKit:** `ui-commands`
- Un *envelope* agrupa uno o más comandos en `commands[]`.
- **Naming:** envelope y comando en `camelCase` (`correlationId`, `sessionId`); `payload` en
  `snake_case`. Cada comando dentro de `commands[]` lleva su propio `correlationId`.

### Envelope (forma general)

```json
{
  "correlationId": "string",
  "sessionId": "string (opcional)",
  "timestamp": "string|number (opcional)",
  "commands": [ /* uno o más comandos */ ]
}
```

### 2.A — Ir a la vista de cabinas (enviar la lista)

**Comando `show_cabin_options`.** Lleva el array completo de cabinas y conmuta la UI a la
vista `cabin_selection` (grilla, sin detalle abierto). Es el equivalente a
`show_itinerary_options`.

```json
{
  "correlationId": "c-101",
  "sessionId": "sess-abc",
  "commands": [
    {
      "type": "show_cabin_options",
      "correlationId": "c-101",
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
              "gallery": ["/cabin-modal/1.png", "/cabin-modal/2.png"],
              "bedroom": ["King-size bed (convertible to two twin beds)"],
              "bathroom": ["Single vanity", "Hairdryer"],
              "amenities": ["In-suite safe", "Nespresso coffee machine"]
            }
          },
          {
            "id": "mozart-suite",
            "name": "Mozart Suite",
            "image": "/cabin/2.png",
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
  ]
}
```

> Las 6 cabinas van como elementos del array `cabins`, todas con la misma forma (`Cabin` de la
> sección 1). `cabins` debe traer al menos 1 elemento.

### 2.B — Abrir el DETALLE de una cabina

**Comando `show_cabin_detail`** con el `cabin_id`. Abre el modal de detalle de esa cabina.
**Requiere que la UI ya esté en `cabin_selection`** (igual que `show_city_detail` requiere estar
en el itinerario): el front no recarga la lista, solo marca cuál abrir. El `cabin_id` debe
existir en el array enviado en 2.A.

```json
{
  "correlationId": "c-102",
  "commands": [
    {
      "type": "show_cabin_detail",
      "correlationId": "c-102",
      "payload": { "cabin_id": "owners-suite" }
    }
  ]
}
```

### 2.C — Cerrar el detalle (volver a la grilla)

Mismo comando con `cabin_id: null`. Cierra el modal y deja la grilla. No borra la lista.

```json
{
  "correlationId": "c-103",
  "commands": [
    {
      "type": "show_cabin_detail",
      "correlationId": "c-103",
      "payload": { "cabin_id": null }
    }
  ]
}
```

### Comportamiento resultante

| Comando                 | `payload`                      | Resultado en la UI                                |
| ----------------------- | ------------------------------ | ------------------------------------------------- |
| `show_cabin_options`  | `{ cabins: [...] }`            | Conmuta a `cabin_selection` con la grilla cargada |
| `show_cabin_detail`      | `{ cabin_id: "owners-suite" }` | Abre el detalle de esa cabina (si ya hay lista)   |
| `show_cabin_detail`      | `{ cabin_id: null }`           | Cierra el detalle, queda en la grilla             |

> Si llega `show_cabin_detail` y la UI **no** está en `cabin_selection`, el comando se ignora
> (igual que `show_city_detail` fuera del itinerario). Para mostrar cabinas hay que mandar
> primero `show_cabin_options`.

---

## 3) Frontend → Agente — `frontend-intent`

Cuando el **usuario** abre/cierra el detalle desde la UI, el front publica un intent. El backend
determinístico debe **registrar handlers** para estos dos. (Ya implementado en el front.)

- **Topic LiveKit:** `frontend-intent` · publicado `reliable: true`
- **Envelope:**

```json
{
  "version": "v1",
  "topic": "frontend-intent",
  "intent": "string",
  "entities": { /* opcional */ },
  "user_message": "string (opcional)",
  "correlationId": "string (opcional)"
}
```

### 3.A — El usuario ABRE el detalle de una cabina

```json
{
  "version": "v1",
  "topic": "frontend-intent",
  "intent": "explore_cabin",
  "entities": { "cabin_id": "owners-suite" },
  "user_message": "User opened Owner's Suite detail"
}
```

- `intent`: **`explore_cabin`**
- `entities.cabin_id`: id de la cabina que abrió el usuario.

### 3.B — El usuario CIERRA el detalle

```json
{
  "version": "v1",
  "topic": "frontend-intent",
  "intent": "view_cabin_selection",
  "user_message": "User closed cabin detail"
}
```

- `intent`: **`view_cabin_selection`** · sin `entities`.

> Estos intents hoy no envían `correlationId` (es opcional). Si lo necesitan para tracing,
> avisar y el front lo agrega.

---

## 4) Resumen de un vistazo

| Dirección       | Topic             | Identificador           | Payload clave                                    |
| --------------- | ----------------- | ----------------------- | ------------------------------------------------ |
| Agente → Front  | `ui-commands`     | `show_cabin_options`  | `payload.cabins: Cabin[]` (carga la lista)       |
| Agente → Front  | `ui-commands`     | `show_cabin_detail`      | `payload.cabin_id` (`id` abre / `null` cierra)   |
| Front → Agente  | `frontend-intent` | `explore_cabin`         | `entities.cabin_id`                              |
| Front → Agente  | `frontend-intent` | `view_cabin_selection`  | (sin entities)                                   |

---
