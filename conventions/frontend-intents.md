# Frontend intents (FE → BE)

Lista de todos los **intents** que el frontend emite hacia el backend. Son el camino inverso a los [comandos de UI](./ui-commands.md): el front avisa qué hizo el usuario y el backend decide la transición y responde con uno o más comandos.

Fuente de verdad del envelope: [`lib/agent-ui/frontend-intent.ts`](../lib/agent-ui/frontend-intent.ts). Se publican con el hook [`useFrontendIntent`](../hooks/use-frontend-intent.ts) sobre el topic de LiveKit `frontend-intent`. El contrato completo del lado backend (stages válidos, qué comando vuelve) vive en [`docs/frontend-integration.md`](../docs/frontend-integration.md).

> Nunca abras un modal ni cambies el basket por tu cuenta: el front emite el intent y **espera** el comando del backend para mover la UI. La única excepción son las transiciones puramente locales (`setViewFromUser`) que abren/cierran un detalle ya presente en el view actual.

## Envelope (todos los intents)

| Campo           | Tipo                      | Requerido | Descripción                                        |
| --------------- | ------------------------- | --------- | -------------------------------------------------- |
| `version`       | `'v1'`                    | sí        | Versión del contrato (fija)                        |
| `topic`         | `'frontend-intent'`       | sí        | Topic de LiveKit (fijo)                            |
| `intent`        | `string`                  | sí        | Nombre del intent (ver abajo)                      |
| `entities`      | `Record<string, unknown>` | varía     | Datos del intent; se omite si no hay               |
| `user_message`  | `string`                  | no        | Texto legible para trazas/debug                    |
| `correlationId` | `string`                  | no        | ID para correlacionar con la respuesta del backend |

En el hook, `entities` y `userMessage` se pasan como opciones: `sendIntent('intent_name', { entities, userMessage })`. `user_message` viaja en snake_case; `correlationId` en camelCase.

## Intents

### Itinerario / mapa

Fuente: [`components/panels/map/panel-map.tsx`](../components/panels/map/panel-map.tsx).

#### 1. `explore_destination`

El usuario abre el detalle de una ciudad del itinerario.

- **entities:** `{ destination_id: string }`
- **vuelve:** `show_city_detail` / `show_destination_detail`

#### 2. `view_itinerary`

El usuario vuelve a la vista del itinerario (cierra el detalle de ciudad).

- **entities:** `{ itinerary_name?: string }`

#### 3. `explore_experience`

El usuario **expande** la tarjeta de una experience (abre su detalle).

- **entities:** `{ experience_id: string }`
- **vuelve:** `show_experience_detail`

> Solo se emite en la expansión **iniciada por el usuario** (transición cerrado→abierto). No se emite al colapsar, ni en la apertura por defecto de la primera tarjeta, ni cuando el backend fuerza la apertura vía `show_experience_detail` (eso evita un eco de intent).

#### 4. `select_experience`

El usuario confirma una experience ("add to cart"). El día es obligatorio.

- **entities:** `{ experience_id: string, day: string }`
- **vuelve:** `add_experience_to_basket` + `show_basket_summary`

> `day` sale del selector de día de la tarjeta. `passenger_count` se omite a propósito: el backend usa el default del perfil. El mismo `(experience_id, day)` es idempotente.

### Cabinas

Fuente: [`components/panels/cabin/panel-cabin-selection.tsx`](../components/panels/cabin/panel-cabin-selection.tsx).

#### 5. `explore_cabin`

El usuario abre el detalle de una cabina.

- **entities:** `{ cabin_id: string }`
- **vuelve:** `show_cabin_detail`

#### 6. `view_cabin_selection`

El usuario cierra el detalle de cabina (vuelve a la grilla).

- **entities:** _(ninguna)_

#### 7. `select_cabin`

El usuario selecciona una cabina ("add to cart"). Reemplaza la selección previa (máx. 1).

- **entities:** `{ cabin_id: string }`
- **vuelve:** `add_cabin_to_basket` + `show_basket_summary`

### Itinerary summary

Fuente: [`components/agent-ui/booking-summary.tsx`](../components/agent-ui/booking-summary.tsx).

#### 8. `view_itinerary_summary`

El usuario abre el modal de resumen del itinerario (botón "Itinerary Summary").

- **entities:** _(ninguna)_
- **vuelve:** `show_itinerary_summary`

> El cierre del modal es puramente local (no emite intent).

## Ejemplo completo

```json
{
  "version": "v1",
  "topic": "frontend-intent",
  "intent": "select_experience",
  "entities": {
    "experience_id": "signature_vienna_belvedere_palace",
    "day": "Day 3"
  },
  "user_message": "User added Belvedere Palace for Day 3"
}
```

## Tabla resumen

| `intent`                 | entities                 | Disparo (acción del usuario)            | Comando que vuelve                                 |
| ------------------------ | ------------------------ | --------------------------------------- | -------------------------------------------------- |
| `explore_destination`    | `{ destination_id }`     | Abrir detalle de ciudad                 | `show_city_detail` / `show_destination_detail`     |
| `view_itinerary`         | `{ itinerary_name? }`    | Cerrar detalle de ciudad                | —                                                  |
| `explore_experience`     | `{ experience_id }`      | **Expandir** tarjeta de experience      | `show_experience_detail`                           |
| `select_experience`      | `{ experience_id, day }` | **Confirm** en la tarjeta (add to cart) | `add_experience_to_basket` + `show_basket_summary` |
| `explore_cabin`          | `{ cabin_id }`           | Abrir detalle de cabina                 | `show_cabin_detail`                                |
| `view_cabin_selection`   | _(ninguna)_              | Cerrar detalle de cabina                | —                                                  |
| `select_cabin`           | `{ cabin_id }`           | Seleccionar cabina (add to cart)        | `add_cabin_to_basket` + `show_basket_summary`      |
| `view_itinerary_summary` | _(ninguna)_              | Abrir modal Itinerary Summary           | `show_itinerary_summary`                           |
