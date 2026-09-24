
import { Container } from "@/components/ui/container"
import { ListConnectors } from "@/components/wallet/list-connectors"

export default function Page() {
  return (
    <Container className="h-full flex items-center justify-center">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-center">
          <p>Creddit Link</p>
        </div>
        <div className="text-center py-4 mb-5">
          <p className="text-2xl font-semibold dark:text-white">
            Connect your wallet
          </p>
          <p className="text-medium dark:text-white">
            Seamlessly signup or login to your account using your favourite
            wallet
          </p>
        </div>
        <ListConnectors />
      </div>
    </Container>
  )
}
