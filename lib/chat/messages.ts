export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

export function appendMessage(list: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const idx = list.findIndex((m) => m.id === next.id);
  if (idx === -1) return [...list, next];
  const existing = list[idx];
  if (existing.content === next.content && existing.role === next.role) return list;
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}
