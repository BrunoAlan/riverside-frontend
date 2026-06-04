# Frontend Integration Guide — Shopping Cart (Basket)

> **Version**: 1.0  
> **Date**: 2026-06-03  
> **Scope**: Basket Básico (Fase 1) + Experiencias (Fase 2)  
> **Backend**: Deterministic state machine with UI Command protocol

---

## Overview

The backend drives the entire shopping cart flow through deterministic UI commands. The frontend's job is to:

1. **Render** UI commands received from the backend
2. **Emit** frontend-intents when the user interacts with the UI
3. **Never decide** business logic, transitions, or basket state

The basket is **commitment-only**: items enter only when the user explicitly confirms. This is a deliberate product decision for a high-ticket luxury cruise product.

### Direction Convention

- **⬅️ Backend → Frontend** = UI Commands. The backend decides what to show. You render it.
- **➡️ Frontend → Backend** = Frontend Intents. You tell the backend what the user did. The backend decides what happens next.

> **Never** open a modal or change the basket without receiving a UI command from the backend first.

---

## Basket Item Types

| Type | When It Enters Basket | How Many | Replaced By |
|------|----------------------|----------|-------------|
| `itinerary` | User confirms option (`confirm_option`) | 1 max | New confirmation replaces previous |
| `cabin` | User taps "Select" (`select_cabin`) | 1 max | New selection replaces previous |
| `experience` | User taps "Add" (`select_experience`) | Multiple | Same `(experience_id, day)` is idempotent |

---

## ⬅️ UI Commands (Backend → Frontend)

These are sent **from the backend to you**. Render them on screen.

### `show_basket_summary` ⬅️ FROM BACKEND
Sent whenever the basket changes or when `view_basket` is requested.

**You receive:**

```json
{
  "type": "show_basket_summary",
  "payload": {
    "items": [
      {
        "type": "itinerary",
        "id": "danube-legends",
        "name": "Danube Legends",
        "payload": {
          "option_id": "selected",
          "embark_port": "Budapest",
          "disembark_port": "Vienna",
          "route_name": "Danube Legends"
        },
        "added_at": "2026-06-03T14:30:00+00:00"
      },
      {
        "type": "cabin",
        "id": "mozart-suite",
        "name": "Mozart Suite",
        "payload": {
          "cabin_id": "mozart-suite",
          "category": "Mozart Suite",
          "guests": 2,
          "area": 62,
          "price_from": null,
          "view": "French Balcony"
        },
        "added_at": "2026-06-03T14:35:00+00:00"
      },
      {
        "type": "experience",
        "id": "signature_vienna_belvedere_palace",
        "name": "Signature Vienna: VIP Evening at Belvedere Palace",
        "payload": {
          "experience_id": "signature_vienna_belvedere_palace",
          "destination": "Vienna",
          "venue": "Belvedere Palace",
          "type": "private_concert",
          "price": null,
          "day": "Day 3",
          "passenger_count": 2
        },
        "added_at": "2026-06-03T14:40:00+00:00"
      }
    ]
  }
}
```

**Rules:**
- `items` can be empty (`[]`) — the basket starts empty
- `type` is always one of: `itinerary`, `cabin`, `experience`
- `payload` shape depends on `type` (see above)
- `added_at` is ISO 8601 with timezone

### `add_cabin_to_basket` ⬅️ FROM BACKEND
Sent after a successful `select_cabin` to confirm the selection.

**You receive:**

```json
{
  "type": "add_cabin_to_basket",
  "payload": {
    "cabin_id": "mozart-suite",
    "name": "Mozart Suite",
    "category": "Mozart Suite",
    "guests": 2,
    "area": 62,
    "price_from": null,
    "view": "French Balcony"
  }
}
```

### `add_experience_to_basket` ⬅️ FROM BACKEND
Sent after a successful `select_experience` to confirm the selection.

**You receive:**

```json
{
  "type": "add_experience_to_basket",
  "payload": {
    "experience_id": "signature_vienna_belvedere_palace",
    "day": "Day 3",
    "passenger_count": 2
  }
}
```

### `show_experience_options` ⬅️ FROM BACKEND
Sent when `request_extra_experience` triggers. Shows the experience grid.

```json
{
  "type": "show_experience_options",
  "payload": {
    "experiences": [
      {
        "id": "signature_vienna_belvedere_palace",
        "name": "Signature Vienna: VIP Evening at Belvedere Palace",
        "destination": "Vienna",
        "venue": "Belvedere Palace",
        "type": "private_concert",
        "description": "After-hours VIP experience at Belvedere Palace...",
        "image": "https://...",
        "detail": {
          "gallery": ["https://..."],
          "highlights": [],
          "inclusions": []
        },
        "price": null,
        "duration": null,
        "availability": true
      }
    ]
  }
}
```

### `show_experience_detail` ⬅️ FROM BACKEND
Toggle for opening/closing the experience detail modal. You receive this **after** the backend processes `explore_experience` or `view_experience_selection`.

```json
// Open
{
  "type": "show_experience_detail",
  "payload": {
    "experience_id": "signature_vienna_belvedere_palace"
  }
}

// Close
{
  "type": "show_experience_detail",
  "payload": {
    "experience_id": null
  }
}
```

---

## ➡️ Frontend Intents (Frontend → Backend)

These are sent **from you to the backend** via the `frontend-intent` topic on the LiveKit data channel. They bypass the LLM classifier.

> **Rule**: When the user does something in the UI, you emit a frontend intent. The backend then decides what UI commands to send back.

### `select_cabin` ➡️ TO BACKEND
When the user taps "Select this suite" in the cabin detail modal.

**You send:**

```json
{
  "intent": "select_cabin",
  "entities": {
    "cabin_id": "mozart-suite"
  }
}
```

**When to emit:** Only from `cabin_discovery`, `cabin_detail`, or `cabin_comparison` stages.  
**What comes back:** `add_cabin_to_basket` + `show_basket_summary`

### `view_basket` ➡️ TO BACKEND
When the user taps a "View Basket" button.

**You send:**

```json
{
  "intent": "view_basket",
  "entities": {}
}
```

**When to emit:** From any stage. Stage-preserving (no stage change).  
**What comes back:** `show_basket_summary`

### `explore_experience` ➡️ TO BACKEND
When the user taps an experience card to open its detail modal.

**You send:**

```json
{
  "intent": "explore_experience",
  "entities": {
    "experience_id": "signature_vienna_belvedere_palace"
  }
}
```

**When to emit:** Only from `enrichment` stage.  
**What comes back:** `show_experience_detail`

### `view_experience_selection` ➡️ TO BACKEND
When the user closes the experience detail modal (back to grid).

**You send:**

```json
{
  "intent": "view_experience_selection",
  "entities": {}
}
```

**When to emit:** Only from `enrichment` stage.  
**What comes back:** `show_experience_detail` (with `experience_id: null`)

### `select_experience` ➡️ TO BACKEND
When the user taps "Add to Itinerary" in the experience detail modal.

**You send:**

```json
{
  "intent": "select_experience",
  "entities": {
    "experience_id": "signature_vienna_belvedere_palace",
    "day": "Day 3",
    "passenger_count": 2
  }
}
```

**When to emit:** Only from `cabin_discovery`, `cabin_detail`, or `cabin_comparison` stages.

### `view_basket`
When the user taps a "View Basket" button.

```json
{
  "intent": "view_basket",
  "entities": {}
}
```

**When to emit:** From any stage. Stage-preserving (no stage change).

### `explore_experience`
When the user taps an experience card to open its detail modal.

```json
{
  "intent": "explore_experience",
  "entities": {
    "experience_id": "signature_vienna_belvedere_palace"
  }
}
```

**When to emit:** Only from `enrichment` stage.

### `view_experience_selection`
When the user closes the experience detail modal (back to grid).

```json
{
  "intent": "view_experience_selection",
  "entities": {}
}
```

**When to emit:** Only from `enrichment` stage.

### `select_experience`
When the user taps "Add to Itinerary" in the experience detail modal.

```json
{
  "intent": "select_experience",
  "entities": {
    "experience_id": "signature_vienna_belvedere_palace",
    "day": "Day 3",
    "passenger_count": 2
  }
}
```

**When to emit:** Only from `enrichment` stage.  
**What comes back:** `add_experience_to_basket` + `show_basket_summary`

**Important:**
- `day` is **required**. It tells the backend which day of the itinerary the experience is for.
- `passenger_count` is **optional**. If omitted, the backend uses `traveler_profile.traveler_count` as default.
- The same `experience_id` with a **different `day`** creates a separate basket item.
- The same `(experience_id, day)` is **idempotent** — sending it twice does not duplicate.

---

## Complete Flows

### Flow 1: Select Itinerary → Add Cabin → Add Experience

```
User: "Yes, that sounds great" (confirming itinerary)
  → Backend: show_confirmation_summary + show_basket_summary

User: "Show me the cabins"
  → Backend: show_cabin_options (cabin grid)

User taps "Mozart Suite" card
  → Frontend: explore_cabin {cabin_id: "mozart-suite"}
  → Backend: show_cabin_detail {cabin_id: "mozart-suite"}

User taps "Select this suite"
  → Frontend: select_cabin {cabin_id: "mozart-suite"}
  → Backend: add_cabin_to_basket + show_basket_summary

User: "What experiences are available?"
  → Backend: show_experience_options (experience grid)

User taps "Belvedere Palace" card
  → Frontend: explore_experience {experience_id: "signature_vienna_belvedere_palace"}
  → Backend: show_experience_detail {experience_id: "signature_vienna_belvedere_palace"}

User selects "Day 3" and taps "Add to Itinerary"
  → Frontend: select_experience {experience_id: "...", day: "Day 3"}
  → Backend: add_experience_to_basket + show_basket_summary

User taps "View Basket"
  → Frontend: view_basket
  → Backend: show_basket_summary (with all 3 items)
```

### Flow 2: Same Experience, Different Days

```
User adds "Belvedere Palace" for Day 3
  → Basket: [itinerary, cabin, experience(day=Day3)]

User adds "Belvedere Palace" for Day 5
  → Basket: [itinerary, cabin, experience(day=Day3), experience(day=Day5)]

User adds "Belvedere Palace" for Day 3 again
  → Basket: [itinerary, cabin, experience(day=Day3), experience(day=Day5)]
     (no duplicate, idempotent)
```

---

## State Tracking

The backend tracks exploration state in `SessionState`. You don't need to manage this, but it's useful to know:

### `cabin_state`
```json
{
  "selected_cabin_id": "mozart-suite",
  "viewed_cabin_ids": ["mozart-suite", "owners-suite"]
}
```

### `experience_state`
```json
{
  "selected_experience_id": "signature_vienna_belvedere_palace",
  "viewed_experience_ids": ["signature_vienna_belvedere_palace"],
  "selected_experience_ids": ["signature_vienna_belvedere_palace"]
}
```

- `selected_*_id` = currently open modal (null if closed)
- `viewed_*_ids` = cumulative history of opened details
- `selected_experience_ids` = experiences added to basket

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Basket is empty | `show_basket_summary` with `{items: []}` |
| User selects same cabin twice | Idempotent — basket unchanged, second `add_cabin_to_basket` still emitted |
| User changes cabin | Old cabin replaced, new cabin added |
| User adds experience without `day` | Backend rejects with `soft_redirect` — **always send `day`** |
| User adds experience without `passenger_count` | Backend uses `traveler_profile.traveler_count` as default |
| `select_experience` from wrong stage | Guard blocks — emits `soft_redirect` with `INVALID_STAGE_INTENT` |
| `request_extra_experience` with no itinerary | Backend emits `soft_redirect` — itinerary required first |

---

## Quick Reference: User Action → What You Send → What You Get Back

| User Action | You Send ➡️ | You Receive ⬅️ |
|-------------|-------------|----------------|
| Tap cabin card | `explore_cabin` | `show_cabin_detail` |
| Tap "Select suite" | `select_cabin` | `add_cabin_to_basket` + `show_basket_summary` |
| Tap "Close cabin detail" | `view_cabin_selection` | `show_cabin_detail` (with `null`) |
| Tap "View Basket" | `view_basket` | `show_basket_summary` |
| Tap experience card | `explore_experience` | `show_experience_detail` |
| Tap "Close experience detail" | `view_experience_selection` | `show_experience_detail` (with `null`) |
| Tap "Add to Itinerary" | `select_experience` | `add_experience_to_basket` + `show_basket_summary` |

---

## Files You May Need

- **Cabin dataset**: `curated_data/riverside_mozart_suites_dataset/structured/cruise_suites.json`
- **Experience dataset**: `curated_data/riverside_mozart_routes_experiences_2026_dataset/structured/signature_events.json`
- **Contracts**: `.opencode/contracts/v1/UICommand.md`, `.opencode/contracts/v1/SessionState.md`

---

## Questions?

Ask the backend team or check `.opencode/context/architecture.md` for the full system design.
