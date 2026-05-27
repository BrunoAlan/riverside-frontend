import { describe, expect, it } from 'vitest';
import { type ChatMessage, appendMessage } from './messages';

const msg = (id: string, role: ChatMessage['role'], content: string): ChatMessage => ({
  id,
  role,
  content,
});

describe('appendMessage', () => {
  it('appends a new message to the list', () => {
    const list: ChatMessage[] = [msg('a', 'user', 'hi')];
    const next = appendMessage(list, msg('b', 'agent', 'hello'));
    expect(next).toEqual([msg('a', 'user', 'hi'), msg('b', 'agent', 'hello')]);
  });

  it('replaces an existing message with the same id (later content wins)', () => {
    const list: ChatMessage[] = [msg('a', 'agent', 'hel')];
    const next = appendMessage(list, msg('a', 'agent', 'hello'));
    expect(next).toEqual([msg('a', 'agent', 'hello')]);
  });

  it('returns the same array reference when content is identical', () => {
    const list: ChatMessage[] = [msg('a', 'user', 'hi')];
    const next = appendMessage(list, msg('a', 'user', 'hi'));
    expect(next).toBe(list);
  });

  it('returns a new array when only the streaming flag changes', () => {
    const list: ChatMessage[] = [{ id: 'a', role: 'agent', content: 'hi', streaming: true }];
    const next = appendMessage(list, { id: 'a', role: 'agent', content: 'hi', streaming: false });
    expect(next).not.toBe(list);
    expect(next[0]).toEqual({ id: 'a', role: 'agent', content: 'hi', streaming: false });
  });
});
