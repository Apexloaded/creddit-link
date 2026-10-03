import DashboardStats from "@/components/dashboard/stats";
import QuickAction from "@/components/dashboard/quick-action";
import { Container } from "@/components/ui/container";
import RecentPositions from "@/components/dashboard/recent-positions";
import LiquidatablePositions from "@/components/dashboard/liquidatable-positions";

export default function Page() {
  return (
    <Container className="px-8 pb-10">
      <QuickAction className="mt-10" />
      <DashboardStats />
      <RecentPositions /> 
      <LiquidatablePositions />
    </Container>
  );
}
