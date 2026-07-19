# Contrato de navegación de Excursiones (Backend ↔ Frontend)

Especificación de las acciones que **faltan** para que el agente y el frontend estén
sincronizados en la vista de itinerario, ahora que tiene dos tabs.

La vista de itinerario hoy tiene **dos tabs**: `Overview` (el mapa con las ciudades) y
`Excursions` (la grilla de excursiones). El agente **no sabe en cuál está parado el
usuario, y no puede cambiarlo**. Este documento detalla las siete acciones que faltan,
qué existe de cada una, y de qué lado está el trabajo.

La sección 7 (pills de sugerencias) es independiente del resto: no toca la navegación por
tabs, pero comparte el mismo canal de commands, así que la documentamos acá.

Todo lo que sigue está verificado contra el código de ambos repos, con citas a
`archivo:línea`. Donde algo no existe, se dice explícitamente — no se asume.

---

## 0) Bloqueo previo: el tab no es estado compartido

**Esto es trabajo del frontend y tiene que pasar antes que los puntos 2 y 5.**

Hoy el tab activo vive en estado local de React:

```tsx
// components/panels/itinerary/itinerary-panel.tsx:16
const [activeTab, setActiveTab] = useState<ItineraryTab>('overview');
```

No está en `UiView` (`lib/agent-ui/ui-view-types.ts:29-33`), que es lo único que los
`ui-commands` pueden modificar. **Un command para cambiar de tab no tendría nada que
tocar.** Primero hay que subir el tab al store:

```ts
// lib/agent-ui/ui-view-types.ts — propuesta
| {
    type: 'itinerary';
    itinerary?: ItineraryFull;
    activeTab?: 'overview' | 'excursions';   // ← nuevo
    detailCityId?: string;
    detailExperienceId?: string;
  }
```

No hace falta que el backend espere a esto para diseñar sus handlers, pero **los
commands de los puntos 2 y 5 no van a tener efecto visible hasta que lo hagamos.**

---

## 1) El usuario cambió a la tab de Excursiones → avisar al agente

**Dirección:** Frontend → Agente (`frontend-intent`)
**Estado:** no existe de ningún lado.

El frontend no manda nada al cambiar de tab, y el backend no tiene ningún intent de
navegación. El catálogo de intents es una tupla cerrada de 45 entradas y no hay nada
relacionado con tabs (`domain/intents/catalog.py:7-54`).

**Lo que pedimos:**

```ts
intent: 'view_excursions'
entities: {}          // ninguna
```

**Qué debería hacer el handler:** registrar en el estado que el usuario está mirando
excursiones, para que el agente pueda hablar en consecuencia ("veo que estás mirando
las excursiones de Budapest…") en vez de seguir describiendo el mapa.

**Nota de diseño:** proponemos `view_excursions` por simetría con los `view_*` que ya
existen (`view_cabin_selection`, `view_experience_selection`, `view_itinerary`). Si
prefieren un intent genérico de navegación con un entity `tab`, nos adaptamos — pero
avísennos, porque cambia lo que emitimos.

---

## 2) El agente quiere mostrar la tab de Excursiones

**Dirección:** Agente → Frontend (`ui-commands`)
**Estado:** no existe. Ningún command mueve al frontend entre tabs.

Los commands que hoy tocan la vista de itinerario son: `show_itinerary_options`,
`show_city_detail`, `show_experience_options`, `show_experience_detail`,
`sync_itinerary_experiences`, `add_experience_to_basket`,
`show_itinerary_walkthrough`, `show_itinerary_summary`. Ninguno cambia de tab.

**Lo que pedimos:**

```ts
type: 'show_itinerary_tab'
payload: { tab: 'overview' | 'excursions' }
```

Un solo command con el tab como payload cubre este punto **y el punto 5**, en vez de
dos commands separados. Sigue el mismo patrón que `show_city_detail { city_id }` y
`show_experience_detail { experience_id }`: un command, un identificador.

**Caso de uso:** el usuario dice "¿qué excursiones hay?" y el agente puede llevarlo a
la tab en vez de describirlas a ciegas mientras el usuario mira el mapa.

**Depende de la sección 0.**

---

## 3) El agente quiere abrir el detalle de una excursión

**Dirección:** Agente → Frontend (`ui-commands`)
**Estado:** el command existe, pero **el agente no puede originarlo**.

Esto es más profundo que un command faltante, y es la parte más importante de este
documento.

`show_experience_detail { experience_id }` ya existe y el frontend ya lo maneja. Pero
el agente **nunca puede emitirlo por iniciativa propia**, por tres razones acumuladas:

1. Los dos intents que lo emiten (`explore_experience`, `view_experience_selection`)
   están declarados como **frontend-driven** (`openai_llm_client.py:70-71`).
2. `explore_experience` exige `entities.experience_id` y hace soft-redirect si falta
   (`explore_experience.py:44`).
3. **`experience_id` no está en el esquema de entidades del LLM**
   (`openai_llm_client.py:139-148`). El esquema solo tiene `duration_days`,
   `duration_nights`, `embarkation_port`, `disembarkation_port`, `region`,
   `destinations`, `date_preferences`, `option_id`, `occasion`, `traveler_count`.

O sea: si el usuario dice *"contame más de la del Belvedere"*, no hay forma de que eso
llegue a `explore_experience` con el ID correcto.

**Lo que pedimos:** que el agente pueda resolver una excursión mencionada por voz.
Concretamente, agregar `experience_id` al esquema de entidades del LLM y un resolver
de nombre → ID sobre las excursiones del itinerario activo.

Hoy el único resolver de texto libre para excursiones es un mapa hardcodeado de 11
claves en `ask_experience_schedule.py:9-22` — y ese handler no emite ningún UI command,
solo escribe un `_temp_experience_schedule` en el estado (`:137-160`).

**Bug relacionado, de nuestro lado:** hoy `show_experience_detail` tiene tres
comportamientos distintos según dónde esté el usuario, y uno no hace nada visible:

| Dónde está el usuario | Qué pasa |
| --- | --- |
| Tab Excursions | Abre el dialog de la carta ✅ |
| Tab Overview, con una ciudad abierta | Expande la fila en el panel del mapa ✅ |
| Tab Overview, sin ciudad abierta | **Nada visible** ❌ |

El tercer caso es porque `CityExperiencesPanel` solo se renderiza si hay una ciudad
abierta (`panel-map.tsx:96-100`). Si implementan el punto 2, lo resolvemos combinando:
el command de tab primero, el de detalle después.

---

## 4) El agente agrega una excursión por iniciativa propia

**Dirección:** Agente → Frontend
**Estado:** no es posible, por la misma causa raíz del punto 3.

`select_experience` está clasificado como **solo-tap-de-UI**
(`openai_llm_client.py:72`) y exige `experience_id` **y** `day`, con soft-redirects
`MISSING_EXPERIENCE_ID` / `MISSING_DAY` (`select_experience.py:65-96`). Ninguno de los
dos se puede extraer del habla hoy.

**Lo que pedimos:** lo mismo del punto 3 (resolver de nombre → ID), más poder resolver
el día desde la conversación.

**Además, pedimos un marcador de origen.** Si el agente agrega algo por su cuenta, el
frontend necesita distinguirlo de un tap del usuario para poder mostrarlo distinto
("agregué esto por vos" vs. la confirmación silenciosa de un tap propio).

La buena noticia: **el backend ya sabe el origen internamente.** Existe
`source = "frontend-intent" if request.frontend_intent else "classifier"`
(`app/orchestration/turn_handler.py:143`), con el campo declarado en
`domain/actions/base.py:25`, y ya se usa en `explore_destination.py:35,38,93`.
**Solo falta propagarlo al envelope del command**, que hoy no tiene ningún campo de
origen. El envelope real se arma en `livekit_modules/ui_command_publisher.py:59-75` y
es un **batch**, no un command suelto:

```ts
{ version: 'v1', topic: 'ui-commands', correlationId, timestamp, sessionId,
  commands: [{ type, payload, correlationId, timestamp }] }
```

Con eso alcanza — no hace falta un command nuevo.

> **Corrección respecto de versiones anteriores de este documento:** el envelope no está
> en `domain/ui_commands/contract.py`. Ese archivo es **código muerto**: `make_command()`
> (`:6-13`) no se importa desde ningún lado, y `composer.compose_for_state()`
> (`composer.py:9-11`) devuelve `[]` y tampoco se usa. La única fuente de verdad del
> formato de salida es `ui_command_publisher.py`. Ver también el anexo C.

---

## 5) El agente quiere volver a la tab de Overview

**Dirección:** Agente → Frontend
**Estado:** no existe.

**Cubierto por el mismo command del punto 2:**

```ts
type: 'show_itinerary_tab'
payload: { tab: 'overview' }
```

**Depende de la sección 0.**

---

## 6) El usuario volvió al itinerario → avisar al agente

**Dirección:** Frontend → Agente
**Estado:** **el frontend ya lo manda; el backend lo ignora.**

Esta es la que menos trabajo requiere y hoy está desperdiciada.

El frontend ya emite `view_itinerary` cuando el usuario vuelve al itinerario
(`components/panels/map/panel-map.tsx:59`). Pero el handler del backend es un no-op
literal:

```python
# domain/actions/handlers/view_itinerary.py:9-19
# devuelve state_patch={}, ui_commands=[], reason_code=ALREADY_VIEWED
```

**Lo que pedimos:** que `view_itinerary` deje registro de que el usuario volvió al
itinerario, para que el agente pueda retomar la conversación desde ahí. No hace falta
que emita ningún command — con que actualice el estado alcanza.

**Y un detalle importante:** si implementan el punto 1 (`view_excursions`), este
handler debería además marcar que el usuario **salió** de la tab de excursiones. Los
dos intents son las dos caras de la misma transición.

**Ojo con esto:** el frontend emite `view_itinerary` en **dos situaciones distintas** —
cuando el usuario cierra la tarjeta de detalle de una ciudad (`panel-map.tsx:58`) y
cuando vuelve a la tab de Overview (`itinerary-panel.tsx`). Ambas mandan el mismo
payload (`entities: { itinerary_name }`), porque las dos significan lo mismo: el usuario
está mirando el itinerario otra vez. Si para ustedes necesitan comportamientos distintos,
avísennos y agregamos un entity que las diferencie — hoy no lo hacemos porque nadie lo
pidió.

---

## 7) Las pills de sugerencias las decide el agente

**Dirección:** Agente → Frontend (`ui-commands`), y después Frontend → Agente (`lk.chat`)
**Estado:** el frontend ya las muestra, pero son estáticas y viven en código del front.
En el backend **no existe nada**.

Las "pills" son sugerencias tappeables que flotan sobre la booking summary. Al tocar
una, su texto se manda al agente **como si el usuario lo hubiera escrito**. Hoy el
catálogo es un array hardcodeado en `lib/suggestions/pills.ts`, con scoping por vista.
Funciona, pero no puede referirse al itinerario concreto que el usuario está mirando:
si las pills nombran ciudades, se rompen apenas cambia el itinerario.

Buscamos en el backend `suggest|prompt|quick_repl|follow_up|chip|pill|starter|recommend`
sobre `src/**/*.py` y `docs/**/*.md`: **no hay ningún concepto de sugerencias de prompt.**
Los únicos hits son falsos positivos — `suggestedIntent` dentro de `soft_redirect`
(`domain/actions/handlers/explore_destination.py:53`) es un nombre canónico de intent que
consume el renderer como steering, nunca texto que se le muestre al usuario; y
`services/recommendation/` recomienda itinerarios, no prompts. Lo más parecido
estructuralmente es el `cta` de `set_booking_summary`
(`domain/actions/handlers/_booking_summary_ui.py:174`), que es **un** label de botón.

**Lo que pedimos:**

```ts
type: 'show_suggestions'
payload: { suggestions: [{ id: string, text: string }] }
```

`text` es lo que se manda al chat al tocar la pill. Si quieren que el label visible y el
mensaje enviado difieran (una pill corta que expande a un prompt largo), agreguen
`label` opcional — el frontend ya soporta esa distinción hoy.

**Sí pueden hacerlas específicas del itinerario.** En el momento de emitir commands, el
handler tiene `context.state.options.selected` con el array `cities`, y cada ciudad trae
`id`, `name`, `country`, `days` y un `experiences` opcional
(`domain/actions/handlers/_itinerary_ui.py:194-206`). Ya hay handlers que lo leen así
(`explore_destination.py:63-73`, `walkthrough_itinerary.py:182-188`). También están
disponibles `traveler_profile`, `shown_destinations` y `experience_state`
(`domain/session/session_state.py:16-23`), si quieren personalizar más.

**Dónde cae el trabajo del lado de ustedes.** No hay unión, enum ni registry de tipos de
command: `type` es un `str` pelado (`domain/actions/base.py:12`, `UICommand = dict[str, Any]`)
y los 20 tipos existentes son literales inline en los handlers. El patrón a seguir es el
de `show_itinerary_summary`: un builder puro del payload
(`_itinerary_summary_payload.py:66`) y un handler que devuelve
`ActionResult(ui_commands=[...])` (`view_itinerary_summary.py:19-29`). La generación
tiene que vivir en el handler, **no** en el publisher: `ui_command_publisher.py:3-6`
declara explícitamente que ahí no va lógica de LLM.

**Tres decisiones de diseño que hay que cerrar antes de escribir código:**

1. **Ciclo de vida.** Hoy ningún command limpia estado de UI previo. Si mandan pills
   junto al itinerario y después el usuario se va a cabinas, ¿quién las borra? O las
   reenvían en cada cambio de vista, o definimos que un `show_suggestions` con
   `suggestions: []` las limpia. Nos sirve cualquiera de las dos, pero hay que elegir.
2. **¿Reemplazan o se suman a las estáticas?** Nuestra recomendación es **híbrido**: las
   del backend pisan a las estáticas cuando llegan, y si no llega nada queda el fallback
   local. Así pueden shippear gradualmente sin que la UI quede vacía.
3. **Cuántas.** El row wrappea, pero más de 5 o 6 se vuelve ruido visual.

**Un detalle que conviene tener presente:** esto sería **el primer round-trip
backend → frontend → backend de texto** del sistema. Hoy todo el texto que emite el
backend es terminal — `soft_redirect.message`, `show_welcome_canvas.message`
(`start_conversation.py:26-29`), y la respuesta hablada del renderer. Nada vuelve.

La buena noticia es que el retorno no necesita nada nuevo: la pill se manda por `lk.chat`,
que entra por `register_text_stream_handler("lk.chat", _on_text_stream)`
(`livekit_modules/agent_app.py:546`) y termina en `runtime.on_user_text` igual que
cualquier mensaje tipeado. **Un tap de pill es indistinguible de que el usuario escriba
ese texto** — el kwarg `source="chat_text"` de `agent_app.py:362` sólo se usa en logs y
nunca llega a `on_user_text` (`runtime.py:97-104`), y `turn_handler.py:143` deriva su
`source` únicamente de si vino un `frontend_intent`. Si en algún momento quieren
distinguir "esto lo tocó de una pill" de "esto lo escribió", **avísennos**: hoy no se
puede, y tendríamos que mandarlo como `frontend-intent` en vez de como chat.

**Trabajo del lado nuestro:** el schema Zod del command, un slice `suggestions` en el
store (estado paralelo a `view`, como ya lo son `bookingSummary` e `itinerarySummary` —
no es un `UiView` nuevo), el `case` en el reducer, un mock en `lib/dev/mocks.ts`, y una
línea en el contenedor. El componente no se toca: ya recibe las pills por prop.

**No depende de la sección 0** ni de ninguna otra de este documento.

---

## Resumen del trabajo

| # | Acción | Backend | Frontend |
| --- | --- | --- | --- |
| 0 | Subir `activeTab` a `UiView` | — | ✅ Hecho |
| 1 | Intent `view_excursions` | Handler nuevo | ✅ Hecho — se emite al cambiar de tab |
| 2 | Command `show_itinerary_tab` | Command nuevo | ✅ Hecho — aplicado al store |
| 3 | Detalle por voz | `experience_id` en el esquema del LLM + resolver | ✅ Hecho (incluye auto-cambio de tab) |
| 4 | Agregar por voz + marcador de origen | Lo del punto 3 + propagar `source` | ✅ El schema acepta `source`; decisión de producto: sin distinción visual, el card marcado como agregado alcanza |
| 5 | Volver a Overview | Cubierto por el punto 2 | ✅ Cubierto por el punto 2 |
| 6 | `view_itinerary` deja de ser no-op | Escribir estado | **Ya lo mandamos** |
| 7 | Command `show_suggestions` (pills) | Command nuevo + generación | ✅ Hecho — schema, store, contenedor y mock. `suggestions: []` limpia y vuelve el fallback estático; el front limpia además al cambiar de vista; se renderizan máx. 6 **Orden en el batch:** mandar `show_suggestions` después del command de vista en el mismo batch — un command de vista limpia las pills. |

---

## Anexo: cosas que ya están rotas

Esto no es parte del pedido, pero lo encontramos mientras auditábamos y conviene que
lo sepan.

### A. No se puede quitar ni cambiar de día una excursión

**Es el agujero más grave de todos.**

- No existe ningún intent de remove/deselect. Grep de
  `remove|deselect|unselect|reject|dismiss` sobre `domain/` y `app/` no devuelve nada
  aplicable; `upsert_basket_item` no tiene camino de borrado.
- Reenviar `select_experience` con otro día **acumula en vez de reemplazar**
  (`_basket_helpers.py:65-73`): mismo día es no-op, día distinto hace `append`. El
  docstring lo declara intencional — *"same experience on different days is allowed"*.

**Consecuencia:** si el usuario se equivoca de día, queda anotado en los dos, sin
vuelta atrás. El frontend no puede arreglar esto solo. Hoy lo mitigamos escondiendo el
selector una vez agregada la excursión, pero eso tapa el problema, no lo resuelve.

Sumado a esto: `sync_itinerary_experiences` **suprime el command cuando la lista está
vacía** (`select_experience.py:186-190`, `review_selection.py:43-47`), así que una lista
vacía nunca se transmite — lo que refuerza el mismo agujero.

### B. Dos commands se descartaban en silencio (resuelto)

**Resuelto del lado del frontend (2026-07-19):** el schema del front ahora acepta
lo que el backend manda hoy.

| Command | Qué se alineó |
| --- | --- |
| `add_experience_to_basket` | `day` y `passenger_count` pasaron a opcionales; sin `day` el front no marca nada y `sync_itinerary_experiences` sigue siendo la fuente de verdad |
| `soft_redirect` | La forma del backend (`{reasonCode, suggestedIntent}`) es la canónica; `suggestedIntent` se ignora y el overlay de debug es solo-dev |

**Drift nuevo encontrado y también resuelto:** `set_booking_summary` — el backend
emite un slot por experience del basket **sin tope** (`_booking_summary_ui.py:136-150`)
y el front validaba `slots` con máximo 6, descartando el command entero a partir del
séptimo slot. El cap se eliminó del schema.

### C. La documentación del backend no sirve como contrato

`docs/frontend/UI_COMMAND_EXECUTION_CONTRACT.md` (347 líneas) **no menciona
experiencias ni una sola vez** — ni `show_experience_detail`, ni
`sync_itinerary_experiences`, ni `add_experience_to_basket`. Documenta un set de
commands anterior.

`domain/ui_commands/contract.py` es un stub de 13 líneas sin unión de tipos ni
definiciones de payload, y `composer.py` tiene 11 líneas.

Hoy **los handlers son el único contrato real**. Lo decimos sin reproche —
simplemente, si alguien del front lee esos docs va a implementar mal.
