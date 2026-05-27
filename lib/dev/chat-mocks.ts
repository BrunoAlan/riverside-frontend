import type { ChatMessage } from '@/lib/chat/messages';

export type ChatMock = {
  id: string;
  label: string;
  messages: ChatMessage[];
};

export const CHAT_MOCKS: ChatMock[] = [
  {
    id: 'empty',
    label: 'Empty',
    messages: [],
  },
  {
    id: 'short',
    label: 'Short (3 turns)',
    messages: [
      {
        id: 'short-1',
        role: 'agent',
        content: 'Hi! Welcome to Riverside Cruises. How can I help?',
      },
      { id: 'short-2', role: 'user', content: 'I want to book a Mediterranean cruise.' },
      {
        id: 'short-3',
        role: 'agent',
        content: 'Great choice. Which month were you thinking of sailing?',
      },
    ],
  },
  {
    id: 'long-scroll',
    label: 'Long (scroll)',
    messages: [
      {
        id: 'long-1',
        role: 'agent',
        content: 'Hi, I’m the Riverside Cruises assistant. What can I plan for you today?',
      },
      { id: 'long-2', role: 'user', content: 'What destinations do you sail to?' },
      {
        id: 'long-3',
        role: 'agent',
        content:
          'We currently sail the Mediterranean, the Caribbean, the Norwegian fjords, and the Greek Isles.\nEach itinerary runs between 7 and 14 nights.',
      },
      { id: 'long-4', role: 'user', content: 'Tell me about the Mediterranean one.' },
      {
        id: 'long-5',
        role: 'agent',
        content:
          'Our 10-night Mediterranean voyage departs from Barcelona and visits Marseille, Rome, Florence, and Santorini before returning.',
      },
      { id: 'long-6', role: 'user', content: 'How much is it?' },
      {
        id: 'long-7',
        role: 'agent',
        content: 'Interior cabins start at USD 1,890 per guest, all meals included.',
      },
      { id: 'long-8', role: 'user', content: 'What other cabin types are there?' },
      {
        id: 'long-9',
        role: 'agent',
        content:
          'We offer three tiers:\n• Interior — USD 1,890\n• Ocean View — USD 2,450\n• Balcony Suite — USD 3,200',
      },
      { id: 'long-10', role: 'user', content: 'I’d like to book a Balcony Suite.' },
      {
        id: 'long-11',
        role: 'agent',
        content:
          'Excellent. I’ll pull up availability for the Balcony Suite and walk you through checkout.',
      },
      { id: 'long-12', role: 'user', content: 'Sounds good, thanks.' },
    ],
  },
  {
    id: 'streaming',
    label: 'Streaming in progress',
    messages: [
      { id: 'stream-1', role: 'user', content: 'How does cruise booking work?' },
      {
        id: 'stream-2',
        role: 'agent',
        content: 'Let me pull up the available sailings for',
        streaming: true,
      },
    ],
  },
];
