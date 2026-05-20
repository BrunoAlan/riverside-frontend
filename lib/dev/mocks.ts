import type { UiView } from '@/lib/agent-ui/ui-view-types';

export interface ViewMock {
  id: string;
  label: string;
  view: UiView;
}

export const VIEW_MOCKS: Record<UiView['type'], ViewMock[]> = {
  start: [{ id: 'default', label: 'Default', view: { type: 'start' } }],
  presentation: [{ id: 'default', label: 'Video playing', view: { type: 'presentation' } }],
  dream_stage: [
    {
      id: 'default',
      label: 'Dream collage (5 images)',
      view: {
        type: 'dream_stage',
        images: [
          { src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', tag: '1 – Image Tag' },
          { src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', tag: '2 – Image Tag' },
          { src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', tag: '3 – Image Tag' },
          { src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', tag: '4 – Image Tag' },
          { src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', tag: '5 – Image Tag' },
        ],
      },
    },
    {
      id: 'three_images',
      label: 'Partial collage (3 images)',
      view: {
        type: 'dream_stage',
        images: [
          { src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', tag: 'Venice' },
          { src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', tag: 'Budapest' },
          { src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', tag: 'Vienna' },
        ],
      },
    },
  ],
  itinerary: [{ id: 'default', label: 'Map', view: { type: 'itinerary' } }],
  compare_itinerary: [
    {
      id: 'two_danube_options',
      label: 'Two Danube options',
      view: {
        type: 'compare_itinerary',
        options: [
          {
            id: 'majesty_of_the_danube',
            name: 'Majesty of the Danube',
            embarkation_port: 'Budapest',
            disembarkation_port: 'Vienna',
            match_score: 1.0,
          },
          {
            id: 'majesty_of_the_danube_scenic_wachau_from_budapest_to_vienna',
            name: 'Majesty of the Danube & Scenic Wachau from Budapest to Vienna',
            embarkation_port: 'Budapest',
            disembarkation_port: 'Vienna',
            match_score: 1.0,
          },
        ],
      },
    },
  ],
  cabin_selection: [{ id: 'default', label: 'All cabins', view: { type: 'cabin_selection' } }],
};
