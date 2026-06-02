export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streaming?: boolean;
};

/**
 * The id used to dedupe an incoming text stream into a single message.
 *
 * Interim transcriptions of one utterance arrive as separate text streams that
 * each have a distinct `info.id` but share one `lk.segment_id`. Keying on the
 * segment id lets the partials update one line in place; plain chat text has no
 * segment id, so we fall back to the stream id.
 */
export function streamMessageId(info: { id: string; attributes?: Record<string, string> }): string {
  return info.attributes?.['lk.segment_id'] ?? info.id;
}

export function appendMessage(list: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const idx = list.findIndex((m) => m.id === next.id);
  if (idx === -1) return [...list, next];
  const existing = list[idx];
  if (
    existing.content === next.content &&
    existing.role === next.role &&
    (existing.streaming ?? false) === (next.streaming ?? false)
  ) {
    return list;
  }
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}
