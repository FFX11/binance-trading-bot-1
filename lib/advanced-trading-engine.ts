import type { BinanceAPI } from "./binance-api"
import { AccumulationEngine } from "./accumulation-strategies"
import { BinanceFilters, type TradingRules } from "./binance-filters"

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
  private tradingRules: TradingRules | null = null

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

    try {
      // Load trading rules first
      await this.loadTradingRules()
      console.log("📋 Trading rules loaded:", this.tradingRules)

      this.intervalId = setInterval(async () => {
        try {
          await this.executeAccumulationStrategy()
        } catch (error) {
          console.error("❌ Accumulation strategy error:", error)
        }
      }, 10000) // Check every 10 seconds
    } catch (error) {
      console.error("Failed to start trading engine:", error)
      this.isActive = false
      throw error
    }
  }

  stop() {
    console.log("⏹️ Stopping Advanced Accumulation Engine...")
    this.isActive = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async loadTradingRules() {
    try {
      // Determine if we're using testnet based on the binance instance
      const testnet = true // You might want to pass this from config
      this.tradingRules = await BinanceFilters.getTradingRules(this.config.symbol, testnet)

      console.log(`📊 ${this.config.symbol} Trading Rules:`, {
        minQty: this.tradingRules.minQty,
        stepSize: this.tradingRules.stepSize,
        minNotional: this.tradingRules.minNotional,
        precision: this.tradingRules.baseAssetPrecision,
      })
    } catch (error) {
      console.error("Failed to load trading rules:", error)
      throw new Error("Cannot start trading without exchange rules")
    }
  }

  private async executeAccumulationStrategy() {
    if (!this.isActive || !this.tradingRules) return

    try {
      // Get current market data
      const currentPrice = await this.binance.getPrice(this.config.symbol)
      const xrpBalance = await this.binance.getBalance("XRP")
      const usdtBalance = await this.binance.getBalance("USDT")

      // Get optimal action from accumulation engine
      const decision = this.accumulator.getOptimalAction(currentPrice, xrpBalance.free, usdtBalance.free)

      console.log("📊 Market Analysis:", {
        price: currentPrice.toFixed(4),
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
    if (!this.tradingRules) {
      console.error("❌ Cannot execute action: Trading rules not loaded")
      return
    }

    try {
      if (action.type === "BUY" && action.amount > this.tradingRules.minNotional) {
        // Calculate raw quantity
        const rawQuantity = action.amount / currentPrice

        // Validate and adjust quantity
        const validation = BinanceFilters.validateOrder(
          this.config.symbol,
          rawQuantity,
          currentPrice,
          this.tradingRules,
        )

        if (!validation.valid) {
          console.log(`⚠️ Order validation failed:`, validation.errors)
          console.log(`💡 Suggestion: Increase order amount above $${this.tradingRules.minNotional}`)
          return
        }

        const finalQuantity = validation.adjustedQuantity
        const orderValue = finalQuantity * currentPrice

        console.log(`🟢 BUYING XRP:`)
        console.log(`   Quantity: ${finalQuantity.toFixed(this.tradingRules.baseAssetPrecision)} XRP`)
        console.log(`   Price: $${currentPrice.toFixed(4)}`)
        console.log(`   Value: $${orderValue.toFixed(2)}`)
        console.log(`   Reason: ${action.reason}`)

        // Execute market buy order with validated quantity
        await this.binance.marketOrder(this.config.symbol, "BUY", finalQuantity)

        console.log("✅ Buy order executed successfully")
      } else if (action.type === "SELL" && action.amount > this.tradingRules.minQty) {
        // For sell orders, action.amount is already in XRP quantity
        const validation = BinanceFilters.validateOrder(
          this.config.symbol,
          action.amount,
          currentPrice,
          this.tradingRules,
        )

        if (!validation.valid) {
          console.log(`⚠️ Sell order validation failed:`, validation.errors)
          return
        }

        const finalQuantity = validation.adjustedQuantity
        const orderValue = finalQuantity * currentPrice

        console.log(`🔴 SELLING XRP:`)
        console.log(`   Quantity: ${finalQuantity.toFixed(this.tradingRules.baseAssetPrecision)} XRP`)
        console.log(`   Price: $${currentPrice.toFixed(4)}`)
        console.log(`   Value: $${orderValue.toFixed(2)}`)
        console.log(`   Reason: ${action.reason}`)

        // Execute market sell order with validated quantity
        await this.binance.marketOrder(this.config.symbol, "SELL", finalQuantity)

        console.log("✅ Sell order executed successfully")
      } else {
        console.log(`⏭️ Skipping ${action.type} order: Amount too small`)
        console.log(
          `   Required: Min $${this.tradingRules.minNotional} for BUY, Min ${this.tradingRules.minQty} XRP for SELL`,
        )
        console.log(
          `   Current: ${action.type === "BUY" ? `$${action.amount.toFixed(2)}` : `${action.amount.toFixed(6)} XRP`}`,
        )
      }
    } catch (error: any) {
      console.error("❌ Order execution error:", error.message)

      // Provide helpful error context
      if (error.message.includes("LOT_SIZE")) {
        console.log("💡 LOT_SIZE Error Help:")
        console.log(`   Min Quantity: ${this.tradingRules.minQty}`)
        console.log(`   Step Size: ${this.tradingRules.stepSize}`)
        console.log(`   Precision: ${this.tradingRules.baseAssetPrecision} decimals`)
      }

      if (error.message.includes("MIN_NOTIONAL")) {
        console.log("💡 MIN_NOTIONAL Error Help:")
        console.log(`   Minimum order value: $${this.tradingRules.minNotional}`)
      }
    }
  }

  getStats() {
    return {
      isActive: this.isActive,
      strategy: this.config.strategy,
      target: this.config.accumulationTarget,
      tradingRules: this.tradingRules,
    }
  }
}
