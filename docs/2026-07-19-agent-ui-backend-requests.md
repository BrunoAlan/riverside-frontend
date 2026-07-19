# Pedidos al backend — UI commands e intents

Qué maneja el frontend hoy y qué necesitamos que implementen del lado del agente.
Todo lo listado como pedido ya está implementado y testeado del lado del front:
apenas lo emitan, funciona.

---

## 1. Lo que el frontend ya maneja

### Commands (agente → frontend, topic `ui-commands`)

El envelope es un batch: `{ correlationId, sessionId, timestamp, commands: [...] }`.
Cada command trae `{ type, payload, correlationId }`. Payloads exactos:

| Command | Payload |
| --- | --- |
| `show_discovery_canvas` | `{}` |
| `soft_redirect` | `{ reasonCode: string }` |
| `show_itinerary_options` | `{ itinerary: ItineraryFull }` |
| `show_destination_detail` | `{ destination, images[] }` (mín. 1 imagen) |
| `set_booking_summary` | snapshot (`people`, `month`, `embarkation`, `stops`, `duration`, `price`, `slots[]`, `cta`) — `slots` **sin tope** |
| `show_cabin_options` | `{ cabins: Cabin[] }` (mín. 1) |
| `show_cabin_detail` | `{ cabin_id: string \| null }` |
| `show_city_detail` | `{ city_id: string \| null }` |
| `show_experience_detail` | `{ experience_id: string \| null }` |
| `show_itinerary_tab` | `{ tab: 'overview' \| 'excursions' }` |
| `add_cabin_to_basket` | `{ cabin_id, name, category, guests, area, price_from, view }` |
| `add_experience_to_basket` | `{ experience_id, day?, passenger_count? }` |
| `sync_itinerary_experiences` | `{ experiences: [{ experience_id, name, day, destination, passenger_count }] }` |
| `show_itinerary_summary` | ver `ItinerarySummaryWire` en `lib/agent-ui/commands.ts` |
| `show_suggestions` | `{ suggestions: [{ id, text, label? }] }` — ver pedido 2.5 |

Notas de comportamiento:

- `show_experience_detail` funciona desde cualquier tab: si la excursión no está a la
  vista, el frontend cambia solo a la tab de Excursions. No hace falta mandar
  `show_itinerary_tab` antes.
- `show_cabin_detail` solo tiene efecto si el usuario ya está en la vista de cabinas.
  Para abrir un detalle desde otra vista, manden `show_cabin_options` +
  `show_cabin_detail` **en ese orden en el mismo batch** — el frontend los aplica en
  orden y funciona hoy.
- `show_itinerary_summary` abre el modal de summary desde cualquier vista — no
  depende de que la booking summary esté en pantalla.
- `sync_itinerary_experiences` es la fuente de verdad de qué excursiones están
  agregadas; es lo que marca las cartas en la UI.
- Un command que no parsea contra estos payloads se descarta en silencio. Ante
  cualquier duda de shape, este archivo y `lib/agent-ui/commands.ts` son el contrato.

### Intents (frontend → agente, `frontend-intent`)

Navegación del itinerario, ya emitidos hoy:

- `view_excursions` — el usuario cambió a la tab de Excursions. `entities: { itinerary_name }`.
- `view_itinerary` — el usuario volvió a mirar el itinerario. Se emite en dos
  situaciones con el mismo payload (`entities: { itinerary_name }`): cerró la tarjeta
  de detalle de una ciudad, o volvió a la tab de Overview. Significan lo mismo.

Cabinas, ya emitidos hoy:

- `explore_cabin` — el usuario expandió una carta. `entities: { cabin_id }`.
- `view_cabin_selection` — el usuario cerró el detalle de una cabina.
- `select_cabin` — el usuario eligió una cabina. `entities: { cabin_id }`.

---

## 2. Pedidos

### 2.1 Handler para `view_excursions` (nuevo)

Registrar en el estado que el usuario está mirando excursiones, para que el agente
hable en consecuencia en vez de seguir describiendo el mapa. Contracara de
`view_itinerary`: uno marca la entrada a la tab, el otro la salida.

### 2.2 `view_itinerary` deja de ser no-op

El frontend ya lo manda; hoy el handler devuelve estado vacío. Pedimos que deje
registro de que el usuario volvió al itinerario. No necesita emitir ningún command.

### 2.3 Emitir `show_itinerary_tab` (command nuevo del lado de ustedes)

```ts
type: 'show_itinerary_tab'
payload: { tab: 'overview' | 'excursions' }
```

Para que el agente pueda llevar al usuario a la tab de Excursions ("¿qué excursiones
hay?") o de vuelta a Overview. El frontend ya lo aplica, incluyendo colapsar el
detalle de ciudad abierto al pasar a Excursions.

### 2.4 Excursiones por voz

Hoy el agente no puede abrir el detalle ni agregar una excursión por iniciativa
propia: `experience_id` no está en el esquema de entidades del LLM y no existe
resolver de nombre → ID. Si el usuario dice *"contame más de la del Belvedere"*,
eso no puede llegar a un `show_experience_detail` con el ID correcto.

Pedimos:

- `experience_id` en el esquema de entidades del LLM.
- Un resolver de nombre → ID sobre las excursiones del itinerario activo.
- Para agregar (`select_experience`): poder resolver también el `day` desde la
  conversación.

Del lado del front no falta nada: `show_experience_detail` y el flujo de agregado
ya funcionan (ver notas del inventario).

### 2.5 Generar `show_suggestions` (pills de sugerencias)

Las pills tappeables sobre la booking summary hoy son estáticas. Pedimos que el
agente las genere según el contexto:

```ts
type: 'show_suggestions'
payload: { suggestions: [{ id: string, text: string, label?: string }] }
```

- `text` es lo que se manda al chat al tocar la pill; `label` es el texto visible
  (si falta, se muestra `text`).
- `suggestions: []` limpia las pills del agente y vuelve el fallback estático.
- El frontend también las limpia solo al cambiar de vista → si quieren pills en la
  vista nueva, reenvíen `show_suggestions` con cada cambio de vista.
- **Orden en el batch:** mandarlo *después* del command de vista — un command de
  vista limpia las pills.
- Se renderizan como máximo 6.
- El tap de una pill llega por `lk.chat` igual que texto tipeado por el usuario;
  no hay (ni necesitamos) forma de distinguirlos.

Para personalizarlas, el handler tiene disponible el itinerario seleccionado
(ciudades y experiencias), `traveler_profile` y `experience_state` en el estado de
sesión.

### 2.6 Quitar una excursión / cambiarla de día (nuevo)

Hoy no hay vuelta atrás: no existe ningún intent ni camino de remove/deselect, y
reenviar `select_experience` con otro día **acumula** en vez de reemplazar (queda
anotada en los dos días). Además `sync_itinerary_experiences` se suprime cuando la
lista queda vacía, así que una lista vacía nunca llega al front.

Pedimos:

- Un camino de remove (intent nuevo o entity sobre `select_experience`, como
  prefieran — avísennos qué eligen para emitirlo desde la UI).
- Que `sync_itinerary_experiences` se emita **siempre**, incluso con lista vacía,
  y transmita el estado completo del basket.

Cuando esté, del lado del front alineamos `sync_itinerary_experiences` a semántica
de reemplazo total (hoy solo agrega; nunca quita).

### 2.7 Cabinas por voz

Mismo agujero que 2.4, versión cabinas. `open_cabin_detail` está anunciado al LLM
como intent de voz ("show me the Owner's Suite"), pero es inalcanzable: `cabin_id`
no está en el esquema de entidades y no hay resolver de nombre → ID, así que por voz
siempre termina en `soft_redirect MISSING_OPTION`.

Pedimos:

- `cabin_id` en el esquema de entidades del LLM.
- Un resolver de nombre → ID sobre el dataset de suites.

Acá es más fácil que en excursiones: el intent, la validación contra el dataset y
los soft-redirects ya existen — solo falta la extracción de la entity.

### 2.8 Quitar la cabina elegida

Cambiar de cabina ya funciona (`select_cabin` reemplaza: el basket es mono-item
para cabina). Lo que no existe es sacarla del basket sin elegir otra: no hay
intent, handler ni command de deselect. Pedido menor, pero es el mismo tipo de
callejón sin salida que 2.6.

### 2.9 Dos commands de cabina que emiten y el front descarta

- `show_cabin_selector` (legacy): lo emite `request_accommodations`, duplicado con
  `show_cabin_options`.
- `show_basket_summary { items }`: lo emite `select_cabin`, junto a
  `add_cabin_to_basket` y `set_booking_summary`, que ya traen la misma información.

Ninguno está en el schema del front, así que se descartan en silencio y hoy no
tienen impacto. Pedimos que dejen de emitirlos — o avísennos si quieren que los
soportemos, y definimos payload juntos.

### 2.10 Aviso de cierre del summary modal

Abrir el summary ya funciona por las dos vías: tap (intent
`view_itinerary_summary`) y voz (`review_selection`), ambas emiten
`show_itinerary_summary`. Lo que falta es la contracara: cuando el usuario
cierra el modal, el backend no se entera — a diferencia del detalle de cabina
(`view_cabin_selection`) y de excursión (`view_itinerary`), que sí tienen su
intent de cierre.

Pedimos: un intent de cierre para el summary (el nombre que prefieran — p. ej.
`view_itinerary_summary_closed` o reutilizar un `view_*` existente, avísennos
cuál). Apenas lo definan, lo emitimos desde el frontend al cerrar el modal.
