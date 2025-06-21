import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol") || "XRPUSDT"
    const testnet = searchParams.get("testnet") === "true"

    const baseURL = testnet ? "https://testnet.binance.vision/api" : "https://api.binance.com/api"
    const url = `${baseURL}/v3/ticker/price?symbol=${symbol}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Price fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
