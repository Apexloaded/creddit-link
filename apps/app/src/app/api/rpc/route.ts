import { getRpcUrlForChain } from "@/config";
import { NextResponse } from "next/server";

const DISALLOWED_METHODS = ["eth_newFilter", "eth_getLogs"];

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = Number(searchParams.get("chainId") || 1);

    const rpcUrl = getRpcUrlForChain(chainId);
    if (!rpcUrl) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32601, message: "Unsupported chain ID" },
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const isBatch = Array.isArray(body);
    const requests = isBatch ? body : [body];

    const hasBlockedMethod = requests.some((req) =>
      DISALLOWED_METHODS.includes(req.method),
    );

    if (hasBlockedMethod) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32601, message: "Method not allowed" },
        },
        { status: 403 },
      );
    }

    // Proxy request to the private RPC provider
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Internal proxy error" },
      },
      { status: 500 },
    );
  }
}
