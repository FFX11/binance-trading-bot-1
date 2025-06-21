import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testnet = searchParams.get("testnet") === "true"
    const symbol = searchParams.get("symbol")

    const baseURL = testnet ? "https://testnet.binance.vision/api" : "https://api.binance.com/api"
    const url = symbol ? `${baseURL}/v3/exchangeInfo?symbol=${symbol}` : `${baseURL}/v3/exchangeInfo`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange info: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Exchange info fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
