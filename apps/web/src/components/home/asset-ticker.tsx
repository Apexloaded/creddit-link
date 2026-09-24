import Image from "next/image";

export type TickerItem = {
  id: string;
  price: string;
  ltv: string;
  icon?: string;
};

type AssetTickerProps = {
  items: TickerItem[];
  /** How many times the list repeats inside one strip, so it always spans wide screens. */
  repeat?: number;
  /** Lower is faster. Total loop time = items x repeat x secondsPerItem. */
  secondsPerItem?: number;
};

function TickerEntry({ id, price, ltv, icon }: TickerItem) {
  return (
    <li className="flex items-center gap-2 whitespace-nowrap font-mono tracking-[0.04em] opacity-50 transition-opacity hover:opacity-100">
      {icon && <Image src={icon} alt="" width={24} height={24} />}
      <span className="font-medium">{id}</span>
      <span>${price}</span>
      <span className="text-[12px] text-ring">LTV {ltv}%</span>
    </li>
  );
}

export default function AssetTicker({
  items,
  repeat = 2,
  secondsPerItem = 4,
}: AssetTickerProps) {
  const duration = items.length * repeat * secondsPerItem;
  const strip = Array.from({ length: repeat }, () => items).flat();

  return (
    <div className="sticky bottom-0 z-10 bg-secondary py-4">
      {/* The moving copy is decorative; screen readers get the list once. */}
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item.id}>
            {item.id}, ${item.price}, LTV {item.ltv}%
          </li>
        ))}
      </ul>

      <div
        aria-hidden="true"
        className="group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]"
      >
        {/* Two identical strips, each sliding by exactly its own width, loop seamlessly. */}
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            className={`flex min-w-full shrink-0 animate-marquee items-center gap-11 pr-11 group-hover:[animation-play-state:paused] motion-reduce:animate-none ${
              copy === 1 ? "motion-reduce:hidden" : ""
            }`}
            style={{ animationDuration: `${duration}s` }}
          >
            {strip.map((item, i) => (
              <TickerEntry key={`${item.id}-${i}`} {...item} />
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}