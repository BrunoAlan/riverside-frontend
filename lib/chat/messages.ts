export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streaming?: boolean;
};

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
