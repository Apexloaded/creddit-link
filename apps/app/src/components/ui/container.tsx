import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
  ...props
}: {
  className?: string,
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="container"
      className={cn("", className)}
      {...props}
    >
      {children}
    </div>
  )
}