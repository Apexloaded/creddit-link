import { network } from "hardhat";

// Create a JsonRpcServer wrapping a blockchain simulation based on the
// "default" Network Config, with `loggingEnabled` setting overridden to `true`
const server = await network.createServer(
  {
    network: "default",
    override: { loggingEnabled: true },
  },
  // hostname and port are optional parameters
  // "127.0.0.1",
  // 8545,
);

const { address, port } = await server.listen();
console.log(`JSON-RPC running in: http://${address}:${port}`);

// Example of closing the server from another async context
console.log("Closing the server in 60 seconds");
setTimeout(async () => {
  await server.close();
}, 60_000);

// Wait for the server to close before printing a message
await server.afterClosed();
console.log("Server closed");