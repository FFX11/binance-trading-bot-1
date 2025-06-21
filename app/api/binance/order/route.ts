import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

let timeOffset = 0
let lastSyncTime = 0

function createSignature(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex")
}

async function syncServerTime(baseURL: string): Promise<void> {
  try {
    const now = Date.now()

    // Only sync if we haven't synced in the last 5 minutes
    if (now - lastSyncTime < 5 * 60 * 1000) {
      return
    }

    const response = await fetch(`${baseURL}/v3/time`)
    if (response.ok) {
      const data = await response.json()
      const serverTime = data.serverTime
      const localTime = Date.now()

      timeOffset = serverTime - localTime
      lastSyncTime = localTime

      console.log(`Time synced. Offset: ${timeOffset}ms`)
    }
  } catch (error) {
    console.warn("Failed to sync server time:", error)
  }
}

function getAdjustedTimestamp(): number {
  return Date.now() + timeOffset
}

async function makeBinanceRequest(
  endpoint: string,
  credentials: { apiKey: string; apiSecret: string; testnet: boolean },
  params: Record<string, any> = {},
  method: "GET" | "POST" | "DELETE" = "GET",
) {
  const baseURL = credentials.testnet ? "https://testnet.binance.vision/api" : "https://api.binance.com/api"

  // Sync time before making authenticated requests
  await syncServerTime(baseURL)

  const timestamp = getAdjustedTimestamp()
  params.timestamp = timestamp

  const queryString = new URLSearchParams(params).toString()
  const signature = createSignature(queryString, credentials.apiSecret)

  const url = `${baseURL}${endpoint}?${queryString}&signature=${signature}`

  const headers = {
    "X-MBX-APIKEY": credentials.apiKey,
  }

  const response = await fetch(url, { method, headers })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Binance API Error: ${error.msg || response.statusText}`)
  }

  return await response.json()
}

// Place order
export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiSecret, testnet, symbol, side, type, quantity, price, stopPrice } = await request.json()

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "API credentials required" }, { status: 400 })
    }

    const credentials = { apiKey, apiSecret, testnet }
    const params: Record<string, any> = {
      symbol,
      side,
      type,
      quantity,
    }

    if (price) params.price = price
    if (stopPrice) params.stopPrice = stopPrice

    const order = await makeBinanceRequest("/v3/order", credentials, params, "POST")
    return NextResponse.json(order)
  } catch (error: any) {
    console.error("Order placement error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Get open orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")
    const apiSecret = searchParams.get("apiSecret")
    const testnet = searchParams.get("testnet") === "true"
    const symbol = searchParams.get("symbol")

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "API credentials required" }, { status: 400 })
    }

    const credentials = { apiKey, apiSecret, testnet }
    const params = symbol ? { symbol } : {}

    const orders = await makeBinanceRequest("/v3/openOrders", credentials, params)
    return NextResponse.json(orders)
  } catch (error: any) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Cancel order
export async function DELETE(request: NextRequest) {
  try {
    const { apiKey, apiSecret, testnet, symbol, orderId } = await request.json()

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "API credentials required" }, { status: 400 })
    }

    const credentials = { apiKey, apiSecret, testnet }
    const params = { symbol, orderId }

    const result = await makeBinanceRequest("/v3/order", credentials, params, "DELETE")
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Cancel order error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
