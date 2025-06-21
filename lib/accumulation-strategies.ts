interface MarketData {
  price: number
  volume: number
  timestamp: number
}

interface AccumulationConfig {
  strategy: "grid" | "dca" | "mean_reversion" | "momentum"
  baseAmount: number // USDT to use for trading
  maxXrpHolding: number // Maximum XRP to hold
  riskTolerance: number // 0.1 = 10% risk
}

export class AccumulationEngine {
  private priceHistory: MarketData[] = []
  private config: AccumulationConfig

  constructor(config: AccumulationConfig) {
    this.config = config
  }

  // Calculate Simple Moving Average
  private calculateSMA(period: number): number {
    if (this.priceHistory.length < period) return 0

    const recentPrices = this.priceHistory.slice(-period).map((d) => d.price)
    return recentPrices.reduce((sum, price) => sum + price, 0) / period
  }

  // Calculate RSI (Relative Strength Index)
  private calculateRSI(period = 14): number {
    if (this.priceHistory.length < period + 1) return 50

    const prices = this.priceHistory.slice(-(period + 1)).map((d) => d.price)
    let gains = 0
    let losses = 0

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }

    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  // Grid Trading Strategy - Best for sideways markets
  generateGridOrders(currentPrice: number, gridLevels = 10, gridSpacing = 0.02) {
    const orders = []
    const basePrice = currentPrice

    // Create buy orders below current price
    for (let i = 1; i <= gridLevels; i++) {
      const buyPrice = basePrice * (1 - gridSpacing * i)
      const quantity = this.config.baseAmount / (gridLevels * buyPrice)

      orders.push({
        type: "BUY",
        price: buyPrice,
        quantity,
        level: i,
        reason: `Grid buy level ${i}`,
      })
    }

    // Create sell orders above current price (only if we have XRP)
    for (let i = 1; i <= gridLevels; i++) {
      const sellPrice = basePrice * (1 + gridSpacing * i)
      const quantity = this.config.baseAmount / (gridLevels * sellPrice)

      orders.push({
        type: "SELL",
        price: sellPrice,
        quantity,
        level: i,
        reason: `Grid sell level ${i}`,
      })
    }

    return orders
  }

  // Dollar Cost Averaging - Best for long-term accumulation
  calculateDCAOrder(currentPrice: number, timeInterval: number) {
    const sma20 = this.calculateSMA(20)
    const sma50 = this.calculateSMA(50)

    // Buy more when price is below moving averages
    let multiplier = 1
    if (currentPrice < sma20) multiplier += 0.5
    if (currentPrice < sma50) multiplier += 0.5

    const orderAmount = (this.config.baseAmount / 24) * multiplier // Spread over 24 hours

    return {
      type: "BUY",
      amount: orderAmount,
      price: currentPrice,
      reason: `DCA with ${multiplier}x multiplier`,
    }
  }

  // Mean Reversion Strategy - Buy dips, sell peaks
  calculateMeanReversionSignal(currentPrice: number) {
    const sma20 = this.calculateSMA(20)
    const rsi = this.calculateRSI()

    if (!sma20) return null

    const deviation = (currentPrice - sma20) / sma20

    // Strong buy signals
    if (deviation < -0.05 && rsi < 30) {
      return {
        type: "BUY",
        strength: "STRONG",
        amount: this.config.baseAmount * 0.2, // 20% of available
        reason: "Oversold + below SMA",
      }
    }

    // Moderate buy signals
    if (deviation < -0.02 && rsi < 40) {
      return {
        type: "BUY",
        strength: "MODERATE",
        amount: this.config.baseAmount * 0.1,
        reason: "Below SMA + RSI low",
      }
    }

    // Only sell if we have significant gains and are overbought
    if (deviation > 0.05 && rsi > 70) {
      return {
        type: "SELL",
        strength: "MODERATE",
        percentage: 0.3, // Sell 30% of XRP holdings
        reason: "Overbought + above SMA",
      }
    }

    return null
  }

  // Kelly Criterion for optimal position sizing
  calculateKellyPosition(winRate: number, avgWin: number, avgLoss: number): number {
    const b = avgWin / avgLoss // Ratio of win to loss
    const p = winRate // Probability of winning
    const q = 1 - p // Probability of losing

    const kelly = (b * p - q) / b

    // Cap at 25% for safety
    return Math.min(Math.max(kelly, 0), 0.25)
  }

  // Advanced accumulation strategy combining multiple signals
  getOptimalAction(currentPrice: number, xrpBalance: number, usdtBalance: number) {
    this.addPriceData(currentPrice)

    const sma20 = this.calculateSMA(20)
    const sma50 = this.calculateSMA(50)
    const rsi = this.calculateRSI()

    const signals = {
      trend: sma20 > sma50 ? "BULLISH" : "BEARISH",
      momentum: rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : "NEUTRAL",
      pricePosition: !sma20 ? "UNKNOWN" : currentPrice > sma20 ? "ABOVE_SMA" : "BELOW_SMA",
    }

    // Accumulation Priority Logic
    let action = null
    const confidence = 0

    // STRONG BUY conditions (accumulate aggressively)
    if (signals.momentum === "OVERSOLD" && signals.pricePosition === "BELOW_SMA") {
      action = {
        type: "BUY",
        amount: Math.min(usdtBalance * 0.3, this.config.baseAmount * 0.3),
        reason: "Strong accumulation signal: Oversold + Below SMA",
        confidence: 0.9,
      }
    }
    // MODERATE BUY conditions
    else if (signals.momentum === "OVERSOLD" || signals.pricePosition === "BELOW_SMA") {
      action = {
        type: "BUY",
        amount: Math.min(usdtBalance * 0.15, this.config.baseAmount * 0.15),
        reason: "Moderate accumulation signal",
        confidence: 0.7,
      }
    }
    // DCA BUY (always accumulate small amounts)
    else if (signals.trend === "BULLISH" && usdtBalance > 50) {
      action = {
        type: "BUY",
        amount: Math.min(usdtBalance * 0.05, this.config.baseAmount * 0.05),
        reason: "DCA accumulation in uptrend",
        confidence: 0.5,
      }
    }
    // SELL only if heavily overbought and we have significant XRP
    else if (signals.momentum === "OVERBOUGHT" && signals.pricePosition === "ABOVE_SMA" && xrpBalance > 100) {
      action = {
        type: "SELL",
        amount: xrpBalance * 0.2, // Sell only 20% to take some profits
        reason: "Partial profit taking - heavily overbought",
        confidence: 0.6,
      }
    }

    return {
      action,
      signals,
      marketData: {
        price: currentPrice,
        sma20,
        sma50,
        rsi,
        trend: signals.trend,
      },
    }
  }

  private addPriceData(price: number) {
    this.priceHistory.push({
      price,
      volume: 0, // Would get from API in real implementation
      timestamp: Date.now(),
    })

    // Keep only last 200 data points
    if (this.priceHistory.length > 200) {
      this.priceHistory = this.priceHistory.slice(-200)
    }
  }

  // Calculate potential returns for different strategies
  backtestStrategy(historicalPrices: number[], strategy: string) {
    let xrp = 0
    let usdt = 1000 // Starting with $1000
    let trades = 0

    for (let i = 20; i < historicalPrices.length; i++) {
      const currentPrice = historicalPrices[i]
      this.addPriceData(currentPrice)

      const decision = this.getOptimalAction(currentPrice, xrp, usdt)

      if (decision.action?.type === "BUY" && usdt >= decision.action.amount) {
        const xrpBought = decision.action.amount / currentPrice
        xrp += xrpBought
        usdt -= decision.action.amount
        trades++
      } else if (decision.action?.type === "SELL" && xrp >= decision.action.amount) {
        const usdtReceived = decision.action.amount * currentPrice
        xrp -= decision.action.amount
        usdt += usdtReceived
        trades++
      }
    }

    const finalValue = usdt + xrp * historicalPrices[historicalPrices.length - 1]
    const totalReturn = ((finalValue - 1000) / 1000) * 100

    return {
      finalXRP: xrp,
      finalUSDT: usdt,
      finalValue,
      totalReturn,
      trades,
      strategy,
    }
  }
}
