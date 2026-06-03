import Image from 'next/image';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUiViewStore } from '@/lib/agent-ui/ui-view-store';
import type { AddOnDecision } from '@/lib/agent-ui/ui-view-types';
import type { AddOn, City } from '@/lib/map/cities';

// Fixed card width in px. Shared with the cluster layer so its grouping
// threshold stays in sync with the actual rendered card size.
export const CITY_CARD_WIDTH = 220;

// TODO: replace with the real add-on count once it's wired to data.
const MOCK_ADD_ON_COUNT = 3;

type CityCardProps = {
  city: City;
  interactive?: boolean;
  onExpand?: (city: City) => void;
};

export function CityCard({ city, interactive = true, onExpand }: CityCardProps) {
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 gap-0 overflow-hidden rounded-2xl p-2.5 shadow-none"
      style={{ width: CITY_CARD_WIDTH }}
    >
      <div className="relative">
        <Image
          src={city.image}
          alt={city.name}
          width={200}
          height={130}
          className="h-[130px] w-full rounded-lg object-cover"
        />
        <span className="bg-beige-200 text-primary absolute top-2 left-2 rounded-full px-3 py-1 text-sm whitespace-nowrap">
          {city.days}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <div>
          <p className="text-base leading-tight">{city.name}</p>
          <p className="text-muted-foreground text-sm">{city.country}</p>
        </div>
        {interactive && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Expand ${city.name}`}
            onClick={() => onExpand?.(city)}
          >
            <ArrowsOutSimpleIcon weight="bold" />
          </Button>
        )}
      </div>
      {city.addOns && city.addOns.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {city.addOns.map((addOn) => (
            <AddOnBlock key={addOn.id} addOn={addOn} interactive={interactive} />
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-center">
        <span className="bg-beige-200 text-muted-foreground rounded-full px-3 py-1 text-xs whitespace-nowrap">
          {MOCK_ADD_ON_COUNT} excursions available
        </span>
      </div>
    </Card>
  );
}

type AddOnBlockProps = {
  addOn: AddOn;
  interactive: boolean;
};

function AddOnBlock({ addOn, interactive }: AddOnBlockProps) {
  const decision = useUiViewStore((s) =>
    s.view.type === 'itinerary' ? s.view.addOnDecisions[addOn.id] : undefined
  );
  const setAddOnDecision = useUiViewStore((s) => s.setAddOnDecision);

  return (
    <div data-testid={`add-on-${addOn.id}`} className="bg-beige-100 rounded-xl p-3">
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>Add-On</span>
        <span>{addOn.day}</span>
      </div>
      <p className="text-primary mt-2 text-sm leading-snug">{addOn.title}</p>
      {interactive && (
        <AddOnActions addOnId={addOn.id} decision={decision} onDecide={setAddOnDecision} />
      )}
    </div>
  );
}

type AddOnActionsProps = {
  addOnId: string;
  decision: AddOnDecision | undefined;
  onDecide: (addOnId: string, decision: AddOnDecision) => void;
};

function AddOnActions({ addOnId, decision, onDecide }: AddOnActionsProps) {
  if (decision === 'confirmed') {
    return null;
  }
  if (decision === 'rejected') {
    return <p className="text-muted-foreground mt-3 text-xs">Rejected</p>;
  }
  return (
    <div className="mt-3 flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => onDecide(addOnId, 'confirmed')}
      >
        Confirm
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => onDecide(addOnId, 'rejected')}>
        Reject
      </Button>
    </div>
  );
}
