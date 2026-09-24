type CreditCapacityCardProps = {
  capacity: string;
  assets: string[];
};

export function CreditCapacityCard({ capacity, assets }: CreditCapacityCardProps) {
  const rows = [
    { label: "Collateral", value: assets.join(", ") },
    { label: "Basis", value: "Collateral value" },
  ];

  return (
    <div className="relative rounded-lg border-3 border-border bg-background p-10 shadow-sm">
      {/* Connector port: the trunk line terminates here */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
      />

      <p className="text-sm font-medium text-muted-foreground">
        Credit capacity
      </p>

      <p className="mt-1.5 text-4xl font-semibold tabular-nums tracking-tight text-primary">
        {capacity}
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        Potential USDG credit
      </p>

      <dl className="mt-5 divide-y divide-border border-t border-border text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2.5 last:pb-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}