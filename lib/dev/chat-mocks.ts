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
      { id: 'short-1', role: 'agent', content: 'Hola, ¿en qué te ayudo?' },
      { id: 'short-2', role: 'user', content: 'Quiero reservar una sesión.' },
      { id: 'short-3', role: 'agent', content: 'Perfecto, ¿para qué día la querés?' },
    ],
  },
  {
    id: 'long-scroll',
    label: 'Long (scroll)',
    messages: [
      { id: 'long-1', role: 'agent', content: 'Hola, soy el asistente de Riverside.' },
      { id: 'long-2', role: 'user', content: '¿Qué servicios ofrecen?' },
      {
        id: 'long-3',
        role: 'agent',
        content:
          'Ofrecemos grabación de podcast, edición de video y producción remota.\nCada uno tiene planes mensuales y por proyecto.',
      },
      { id: 'long-4', role: 'user', content: 'Contame del de podcast.' },
      {
        id: 'long-5',
        role: 'agent',
        content:
          'El plan de podcast incluye grabación multi-pista, transcripción automática y exportación en alta calidad.',
      },
      { id: 'long-6', role: 'user', content: '¿Cuánto sale?' },
      { id: 'long-7', role: 'agent', content: 'Empieza en USD 15/mes para el plan básico.' },
      { id: 'long-8', role: 'user', content: 'Mostrame los otros planes.' },
      {
        id: 'long-9',
        role: 'agent',
        content:
          'Tenemos tres niveles:\n• Básico — USD 15/mes\n• Pro — USD 24/mes\n• Business — USD 49/mes',
      },
      { id: 'long-10', role: 'user', content: 'Quiero probar el Pro.' },
      {
        id: 'long-11',
        role: 'agent',
        content: 'Genial. Te abro el flujo de checkout para el plan Pro.',
      },
      { id: 'long-12', role: 'user', content: 'Dale, gracias.' },
    ],
  },
  {
    id: 'streaming',
    label: 'Streaming in progress',
    messages: [
      { id: 'stream-1', role: 'user', content: '¿Cómo funciona el booking?' },
      {
        id: 'stream-2',
        role: 'agent',
        content: 'Estoy procesando tu sol',
        streaming: true,
      },
    ],
  },
];
