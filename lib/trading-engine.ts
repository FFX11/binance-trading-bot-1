import type { BinanceAPI } from "./binance-api"

interface TradingConfig {
  symbol: string
  stopLossPercentage: number
  buyOffsetPercentage: number
  minTradeAmount: number
}

interface TradingState {
  position: "holding" | "waiting_to_buy" | "waiting_to_sell"
  currentPrice: number
  baseBalance: number
  quoteBalance: number
  activeOrders: any[]
  isActive: boolean
}

export class TradingEngine {
  private binance: BinanceAPI
  private config: TradingConfig
  private state: TradingState
  private intervalId: NodeJS.Timeout | null = null

  constructor(binance: BinanceAPI, config: TradingConfig) {
    this.binance = binance
    this.config = config
    this.state = {
      position: "holding",
      currentPrice: 0,
      baseBalance: 0,
      quoteBalance: 0,
      activeOrders: [],
      isActive: false,
    }
  }

  async start() {
    console.log("Starting trading engine...")
    this.state.isActive = true

    // Initial state update
    await this.updateState()

    // Start monitoring loop
    this.intervalId = setInterval(async () => {
      try {
        await this.executeTradingLogic()
      } catch (error) {
        console.error("Trading logic error:", error)
      }
    }, 5000) // Check every 5 seconds
  }

  stop() {
    console.log("Stopping trading engine...")
    this.state.isActive = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async updateState() {
    try {
      // Get current price
      this.state.currentPrice = await this.binance.getPrice(this.config.symbol)

      // Get balances
      const baseAsset = this.config.symbol.replace("USDT", "").replace("BUSD", "")
      const quoteAsset = this.config.symbol.includes("USDT") ? "USDT" : "BUSD"

      const baseBalance = await this.binance.getBalance(baseAsset)
      const quoteBalance = await this.binance.getBalance(quoteAsset)

      this.state.baseBalance = baseBalance.free
      this.state.quoteBalance = quoteBalance.free

      // Get open orders
      this.state.activeOrders = await this.binance.getOpenOrders(this.config.symbol)

      console.log("State updated:", {
        price: this.state.currentPrice,
        baseBalance: this.state.baseBalance,
        quoteBalance: this.state.quoteBalance,
        activeOrders: this.state.activeOrders.length,
      })
    } catch (error) {
      console.error("Failed to update state:", error)
    }
  }

  private async executeTradingLogic() {
    await this.updateState()

    if (!this.state.isActive) return

    const { position, currentPrice, baseBalance, quoteBalance, activeOrders } = this.state

    try {
      // If holding assets and no active sell orders, place stop-loss
      if (position === "holding" && baseBalance > this.config.minTradeAmount && activeOrders.length === 0) {
        const stopPrice = currentPrice * (1 - this.config.stopLossPercentage / 100)

        console.log(`Placing stop-loss order at ${stopPrice}`)
        await this.binance.stopLossOrder(this.config.symbol, "SELL", baseBalance, stopPrice)

        this.state.position = "waiting_to_sell"
      }

      // If waiting to buy and have quote balance, manage buy orders
      if (position === "waiting_to_buy" && quoteBalance > this.config.minTradeAmount) {
        const targetBuyPrice = currentPrice * (1 + this.config.buyOffsetPercentage / 100)

        // Cancel existing buy orders if price changed significantly
        const buyOrders = activeOrders.filter((order) => order.side === "BUY")
        for (const order of buyOrders) {
          const orderPrice = Number.parseFloat(order.price)
          if (Math.abs(orderPrice - targetBuyPrice) / targetBuyPrice > 0.01) {
            // 1% difference
            console.log(`Canceling outdated buy order at ${orderPrice}`)
            await this.binance.cancelOrder(this.config.symbol, order.orderId)
          }
        }

        // Place new buy order if none exists at target price
        const hasBuyOrder = activeOrders.some(
          (order) =>
            order.side === "BUY" && Math.abs(Number.parseFloat(order.price) - targetBuyPrice) / targetBuyPrice < 0.01,
        )

        if (!hasBuyOrder) {
          const buyQuantity = (quoteBalance / targetBuyPrice) * 0.99 // Use 99% to account for fees
          console.log(`Placing buy order: ${buyQuantity} at ${targetBuyPrice}`)

          // Note: For limit orders, you'd use a different order type
          // This is simplified for the example
        }
      }

      // Check if orders were filled
      if (activeOrders.length === 0 && position !== "holding") {
        if (baseBalance > this.config.minTradeAmount) {
          console.log("Buy order filled, now holding")
          this.state.position = "holding"
        } else if (quoteBalance > this.config.minTradeAmount) {
          console.log("Sell order filled, now waiting to buy")
          this.state.position = "waiting_to_buy"
        }
      }
    } catch (error) {
      console.error("Trading execution error:", error)
    }
  }

  getState() {
    return { ...this.state }
  }

  getConfig() {
    return { ...this.config }
  }
}
