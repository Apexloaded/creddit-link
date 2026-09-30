import { formatDistanceToNow } from "date-fns";

interface BlockTimeProps {
  date: Date;
}

export function BlockDate({
  date,
  ...props
}: BlockTimeProps & React.HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props}>{formatDistanceToNow(date, { addSuffix: true })}</p>;
}
