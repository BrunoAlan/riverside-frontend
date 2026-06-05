'use client';

import { Fragment } from 'react';
import { CaretLeftIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { PackageCell, UiView } from '@/lib/agent-ui/ui-view-types';
import { formatPackagePrice } from '@/lib/packages';

type PanelPackageSelectionProps = {
  view: Extract<UiView, { type: 'package_selection' }>;
};

function Cell({ cell }: { cell: PackageCell | undefined }) {
  if (!cell) return null;
  if (cell.kind === 'included')
    return <CheckIcon size={20} className="text-neutral-600" aria-label="Included" />;
  if (cell.kind === 'excluded')
    return <XIcon size={20} className="text-neutral-400" aria-label="Excluded" />;
  return <p className="text-sm leading-snug text-neutral-600">{cell.text}</p>;
}

export function PanelPackageSelection({ view }: PanelPackageSelectionProps) {
  const { features, packages } = view;
  const gridTemplateColumns = `minmax(160px, 220px) repeat(${packages.length}, minmax(180px, 1fr))`;

  return (
    <div className="bg-beige-200 h-full w-full overflow-auto">
      <div className="mx-auto max-w-[1400px] p-6 pt-16">
        {/* Back button — visual only, not wired */}
        <Button type="button" variant="secondary" size="sm" className="mb-10">
          <CaretLeftIcon weight="bold" aria-hidden="true" /> Back
        </Button>

        <div className="grid items-start gap-x-6 gap-y-8" style={{ gridTemplateColumns }}>
          {/* Header row: package names */}
          <div />
          {packages.map((pkg) => (
            <p
              key={pkg.id}
              className="font-display text-xl leading-tight font-medium text-neutral-700"
            >
              {pkg.name}
            </p>
          ))}

          {/* Feature rows */}
          {features.map((feature) => (
            <Fragment key={feature.id}>
              <p className="text-sm text-neutral-500">{feature.label}</p>
              {packages.map((pkg) => (
                <div key={pkg.id} className="flex min-h-6 items-start">
                  <Cell cell={pkg.cells[feature.id]} />
                </div>
              ))}
            </Fragment>
          ))}

          {/* Price + Select row */}
          <div />
          {packages.map((pkg) => (
            <div key={pkg.id} className="flex items-center justify-between gap-3 pt-4">
              <div>
                <p className="font-display text-2xl leading-none text-neutral-700">
                  {formatPackagePrice(pkg.price, pkg.currency)}
                </p>
                <p className="pt-1 text-xs text-neutral-500">per person</p>
              </div>
              <Button type="button" variant="secondary" size="sm" aria-label={`Select ${pkg.name}`}>
                Select
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
