import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

interface BinanceCredentials {
  apiKey: string
  apiSecret: string
  testnet: boolean
}

let timeOffset = 0
let lastSyncTime = 0

function createSignature(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex")
}

function validateApiCredentials(apiKey: string, apiSecret: string): { valid: boolean; error?: string } {
  // Basic format validation
  if (!apiKey || apiKey.length < 10) {
    return { valid: false, error: "API Key appears to be invalid (too short)" }
  }

  if (!apiSecret || apiSecret.length < 10) {
    return { valid: false, error: "API Secret appears to be invalid (too short)" }
  }

  // Check for common format issues
  if (apiKey.includes(" ") || apiSecret.includes(" ")) {
    return { valid: false, error: "API credentials should not contain spaces" }
  }

  return { valid: true }
}

async function syncServerTime(baseURL: string): Promise<void> {
  try {
    const now = Date.now()

    // Only sync if we haven't synced in the last 5 minutes
    if (now - lastSyncTime < 5 * 60 * 1000) {
      return
    }

    console.log("Syncing with Binance server time...")
    const response = await fetch(`${baseURL}/v3/time`)

    if (response.ok) {
      const data = await response.json()
      const serverTime = data.serverTime
      const localTime = Date.now()

      timeOffset = serverTime - localTime
      lastSyncTime = localTime

      console.log(`Time synced successfully. Offset: ${timeOffset}ms`)
    } else {
      console.warn("Failed to fetch server time:", response.statusText)
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
  credentials: BinanceCredentials,
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

  console.log(`Making request to: ${endpoint}`)
  console.log(`Using ${credentials.testnet ? "TESTNET" : "LIVE"} environment`)

  const response = await fetch(url, { method, headers })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData

    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { msg: errorText }
    }

    console.error("Binance API Error Response:", {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
      endpoint,
      testnet: credentials.testnet,
    })

    // Provide more specific error messages
    let errorMessage = errorData.msg || response.statusText

    if (response.status === 401) {
      errorMessage = "Invalid API credentials. Please check your API Key and Secret."
    } else if (errorData.code === -2014) {
      errorMessage = "API key format is invalid. Please verify your API Key."
    } else if (errorData.code === -2015) {
      errorMessage =
        "Invalid API key, IP, or permissions. Check: 1) API Key is correct 2) IP is whitelisted 3) Trading permissions are enabled"
    } else if (errorData.code === -1021) {
      errorMessage = "Timestamp for this request is outside the recvWindow. Server time sync issue."
    }

    throw new Error(`Binance API Error: ${errorMessage}`)
  }

  return await response.json()
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiSecret, testnet } = await request.json()

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "API credentials required" }, { status: 400 })
    }

    // Validate credentials format
    const validation = validateApiCredentials(apiKey, apiSecret)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const credentials: BinanceCredentials = { apiKey, apiSecret, testnet }

    console.log("Testing API connection...")
    console.log(`Environment: ${testnet ? "TESTNET" : "LIVE"}`)
    console.log(`API Key (first 8 chars): ${apiKey.substring(0, 8)}...`)

    const accountInfo = await makeBinanceRequest("/v3/account", credentials)

    console.log("API connection successful!")
    return NextResponse.json(accountInfo)
  } catch (error: any) {
    console.error("Account info error:", error)

    // Return more detailed error information
    return NextResponse.json(
      {
        error: error.message,
        troubleshooting: {
          commonIssues: [
            "API Key or Secret is incorrect",
            "API Key doesn't have trading permissions enabled",
            "IP address is not whitelisted (if IP restriction is enabled)",
            "Using live API keys with testnet (or vice versa)",
            "API Key has been revoked or expired",
          ],
          nextSteps: [
            "Double-check your API Key and Secret",
            "Ensure 'Enable Trading' is checked in Binance API settings",
            "If using IP restriction, add your current IP to whitelist",
            "Try using testnet first for testing",
          ],
        },
      },
      { status: 500 },
    )
  }
}
