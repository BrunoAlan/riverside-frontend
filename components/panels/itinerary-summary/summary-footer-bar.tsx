import { Button } from '@/components/ui/button';
import { SUMMARY_CTA } from '@/lib/itinerary-summary/copy';

export function SummaryFooterBar({ total }: { total: string }) {
  return (
    <div className="border-beige-300 flex flex-wrap items-center justify-between gap-3 border-t bg-neutral-50 px-4 py-4 sm:px-6">
      <p className="font-display text-2xl font-semibold text-green-700">Total: {total}</p>
      <div className="flex items-center gap-3">
        <Button variant="secondary">{SUMMARY_CTA.specialist}</Button>
        <Button>{SUMMARY_CTA.booking}</Button>
      </div>
    </div>
  );
}
