import React, { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";
import { IconFolderCode, TablerIcon } from "@tabler/icons-react";
import { LucideIcon } from "lucide-react";

type StateProps = {
  title?: string;
  description?: string;
  icon?: TablerIcon | LucideIcon;
  children?: ReactNode;
  className?: string;
};

function EmptyState({
  title = "No Item Yet",
  description = "You haven't created any item yet. Get started by creating your first item.",
  icon = IconFolderCode,
  children,
  className
}: StateProps) {
  const Icon = icon;
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{children}</EmptyContent>
    </Empty>
  );
}

export default EmptyState;
