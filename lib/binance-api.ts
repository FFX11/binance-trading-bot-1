interface BinanceConfig {
  apiKey: string
  apiSecret: string
  testnet: boolean
}

interface OrderResponse {
  symbol: string
  orderId: number
  clientOrderId: string
  price: string
  origQty: string
  executedQty: string
  status: string
  type: string
  side: string
}

interface AccountInfo {
  balances: Array<{
    asset: string
    free: string
    locked: string
  }>
}

interface TickerPrice {
  symbol: string
  price: string
}

export class BinanceAPI {
  private config: BinanceConfig

  constructor(apiKey: string, apiSecret: string, testnet = true) {
    this.config = {
      apiKey,
      apiSecret,
      testnet,
    }
  }

  private async makeRequest(endpoint: string, method: "GET" | "POST" | "DELETE" = "GET", data?: any) {
    const url = `/api/binance${endpoint}`

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    }

    if (method === "POST" || method === "DELETE") {
      options.body = JSON.stringify({
        ...data,
        ...this.config,
      })
    }

    if (method === "GET" && endpoint.includes("?")) {
      const params = new URLSearchParams({
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
        testnet: this.config.testnet.toString(),
      })
      const finalUrl = `${url}&${params.toString()}`
      const response = await fetch(finalUrl, options)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "API request failed")
      }

      return await response.json()
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "API request failed")
    }

    return await response.json()
  }

  // Get current price for a symbol
  async getPrice(symbol: string): Promise<number> {
    const url = `/api/binance/price?symbol=${symbol}&testnet=${this.config.testnet}`
    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to fetch price")
    }

    const data: TickerPrice = await response.json()
    return Number.parseFloat(data.price)
  }

  // Get account information
  async getAccountInfo(): Promise<AccountInfo> {
    return await this.makeRequest("/account", "POST")
  }

  // Get balance for specific asset
  async getBalance(asset: string): Promise<{ free: number; locked: number }> {
    const accountInfo = await this.getAccountInfo()
    const balance = accountInfo.balances.find((b) => b.asset === asset)

    return {
      free: Number.parseFloat(balance?.free || "0"),
      locked: Number.parseFloat(balance?.locked || "0"),
    }
  }

  // Place a market order
  async marketOrder(symbol: string, side: "BUY" | "SELL", quantity: number): Promise<OrderResponse> {
    return await this.makeRequest("/order", "POST", {
      symbol,
      side,
      type: "MARKET",
      quantity: quantity.toFixed(6),
    })
  }

  // Place a stop-loss order
  async stopLossOrder(
    symbol: string,
    side: "BUY" | "SELL",
    quantity: number,
    stopPrice: number,
  ): Promise<OrderResponse> {
    return await this.makeRequest("/order", "POST", {
      symbol,
      side,
      type: "STOP_MARKET",
      quantity: quantity.toFixed(6),
      stopPrice: stopPrice.toFixed(6),
    })
  }

  // Cancel an order
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    return await this.makeRequest("/order", "DELETE", {
      symbol,
      orderId,
    })
  }

  // Get open orders
  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    const params = symbol ? `?symbol=${symbol}` : ""
    return await this.makeRequest(`/order${params}`, "GET")
  }
}
