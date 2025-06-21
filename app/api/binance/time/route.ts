import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testnet = searchParams.get("testnet") === "true"

    const baseURL = testnet ? "https://testnet.binance.vision/api" : "https://api.binance.com/api"
    const response = await fetch(`${baseURL}/v3/time`)

    if (!response.ok) {
      throw new Error(`Failed to fetch server time: ${response.statusText}`)
    }

    const data = await response.json()
    const localTime = Date.now()
    const serverTime = data.serverTime
    const offset = serverTime - localTime

    return NextResponse.json({
      serverTime,
      localTime,
      offset,
      synced: true,
    })
  } catch (error: any) {
    console.error("Server time fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
