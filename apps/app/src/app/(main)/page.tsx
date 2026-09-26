import Dashboard from "@/components/dashboard";
import QuickAction from "@/components/dashboard/quick-action";
import { Container } from "@/components/ui/container";

export default function Page() {
  return (
    <Container className="px-8">
      <QuickAction className="mt-10" />
      <Dashboard />
    </Container>
  );
}
