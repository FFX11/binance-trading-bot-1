import type { BinanceAPI } from "./binance-api"
import { AccumulationEngine } from "./accumulation-strategies"

interface AdvancedTradingConfig {
  symbol: string
  strategy: "accumulation" | "grid" | "dca"
  baseAmount: number
  maxRisk: number
  accumulationTarget: number // Target XRP amount
}

export class AdvancedTradingEngine {
  private binance: BinanceAPI
  private config: AdvancedTradingConfig
  private accumulator: AccumulationEngine
  private isActive = false
  private intervalId: NodeJS.Timeout | null = null

  constructor(binance: BinanceAPI, config: AdvancedTradingConfig) {
    this.binance = binance
    this.config = config
    this.accumulator = new AccumulationEngine({
      strategy: "mean_reversion",
      baseAmount: config.baseAmount,
      maxXrpHolding: config.accumulationTarget,
      riskTolerance: config.maxRisk,
    })
  }

  async start() {
    console.log("🚀 Starting Advanced Accumulation Engine...")
    this.isActive = true

    this.intervalId = setInterval(async () => {
      try {
        await this.executeAccumulationStrategy()
      } catch (error) {
        console.error("❌ Accumulation strategy error:", error)
      }
    }, 10000) // Check every 10 seconds
  }

  stop() {
    console.log("⏹️ Stopping Advanced Accumulation Engine...")
    this.isActive = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async executeAccumulationStrategy() {
    if (!this.isActive) return

    try {
      // Get current market data
      const currentPrice = await this.binance.getPrice(this.config.symbol)
      const xrpBalance = await this.binance.getBalance("XRP")
      const usdtBalance = await this.binance.getBalance("USDT")

      // Get optimal action from accumulation engine
      const decision = this.accumulator.getOptimalAction(currentPrice, xrpBalance.free, usdtBalance.free)

      console.log("📊 Market Analysis:", {
        price: currentPrice,
        xrp: xrpBalance.free.toFixed(2),
        usdt: usdtBalance.free.toFixed(2),
        signals: decision.signals,
        action: decision.action?.type || "HOLD",
      })

      // Execute the recommended action
      if (decision.action) {
        await this.executeAction(decision.action, currentPrice)
      }

      // Log accumulation progress
      const totalValue = usdtBalance.free + xrpBalance.free * currentPrice
      const xrpPercentage = (xrpBalance.free / this.config.accumulationTarget) * 100

      console.log("💰 Accumulation Progress:", {
        totalXRP: xrpBalance.free.toFixed(2),
        targetProgress: `${xrpPercentage.toFixed(1)}%`,
        portfolioValue: `$${totalValue.toFixed(2)}`,
      })
    } catch (error) {
      console.error("Strategy execution error:", error)
    }
  }

  private async executeAction(action: any, currentPrice: number) {
    try {
      if (action.type === "BUY" && action.amount > 10) {
        const quantity = (action.amount / currentPrice) * 0.999 // Account for fees

        console.log(`🟢 BUYING: ${quantity.toFixed(4)} XRP at $${currentPrice.toFixed(4)}`)
        console.log(`💡 Reason: ${action.reason}`)

        // Execute market buy order
        await this.binance.marketOrder(this.config.symbol, "BUY", quantity)
      } else if (action.type === "SELL" && action.amount > 0.1) {
        console.log(`🔴 SELLING: ${action.amount.toFixed(4)} XRP at $${currentPrice.toFixed(4)}`)
        console.log(`💡 Reason: ${action.reason}`)

        // Execute market sell order
        await this.binance.marketOrder(this.config.symbol, "SELL", action.amount)
      }
    } catch (error) {
      console.error("Order execution error:", error)
    }
  }

  getStats() {
    return {
      isActive: this.isActive,
      strategy: this.config.strategy,
      target: this.config.accumulationTarget,
    }
  }
}
