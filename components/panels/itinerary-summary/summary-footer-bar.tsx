import { Button } from '@/components/ui/button';

export function SummaryFooterBar({ total }: { total: string }) {
  return (
    <div className="border-border flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t bg-neutral-50/95 px-4 py-4 backdrop-blur sm:px-6">
      <p className="font-display text-2xl font-semibold text-green-700">Total: {total}</p>
      <div className="flex items-center gap-3">
        <Button variant="secondary">Talk to a Riverside Specialist</Button>
        <Button>Continue to booking</Button>
      </div>
    </div>
  );
}
