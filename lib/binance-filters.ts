interface ExchangeInfo {
  symbols: Array<{
    symbol: string
    filters: Array<{
      filterType: string
      minQty?: string
      maxQty?: string
      stepSize?: string
      minNotional?: string
      applyToMarket?: boolean
    }>
    baseAssetPrecision: number
    quotePrecision: number
    quoteAssetPrecision: number
  }>
}

export interface TradingRules {
  minQty: number
  maxQty: number
  stepSize: number
  minNotional: number
  baseAssetPrecision: number
  quotePrecision: number
}

export class BinanceFilters {
  private static exchangeInfo: ExchangeInfo | null = null
  private static lastFetch = 0

  static async getExchangeInfo(testnet = true): Promise<ExchangeInfo> {
    const now = Date.now()

    // Cache for 5 minutes
    if (this.exchangeInfo && now - this.lastFetch < 5 * 60 * 1000) {
      return this.exchangeInfo
    }

    const baseURL = testnet ? "https://testnet.binance.vision/api" : "https://api.binance.com/api"
    const response = await fetch(`/api/binance/exchangeInfo?testnet=${testnet}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange info: ${response.statusText}`)
    }

    this.exchangeInfo = await response.json()
    this.lastFetch = now
    return this.exchangeInfo
  }

  static async getTradingRules(symbol: string, testnet = true): Promise<TradingRules> {
    const exchangeInfo = await this.getExchangeInfo(testnet)
    const symbolInfo = exchangeInfo.symbols.find((s) => s.symbol === symbol)

    if (!symbolInfo) {
      throw new Error(`Symbol ${symbol} not found in exchange info`)
    }

    const lotSizeFilter = symbolInfo.filters.find((f) => f.filterType === "LOT_SIZE")
    const minNotionalFilter = symbolInfo.filters.find(
      (f) => f.filterType === "MIN_NOTIONAL" || f.filterType === "NOTIONAL",
    )

    return {
      minQty: Number.parseFloat(lotSizeFilter?.minQty || "0"),
      maxQty: Number.parseFloat(lotSizeFilter?.maxQty || "1000000"),
      stepSize: Number.parseFloat(lotSizeFilter?.stepSize || "1"),
      minNotional: Number.parseFloat(minNotionalFilter?.minNotional || "10"),
      baseAssetPrecision: symbolInfo.baseAssetPrecision,
      quotePrecision: symbolInfo.quotePrecision,
    }
  }

  static adjustQuantity(quantity: number, rules: TradingRules): number {
    // Ensure quantity meets minimum
    if (quantity < rules.minQty) {
      return 0 // Don't trade if below minimum
    }

    // Ensure quantity doesn't exceed maximum
    if (quantity > rules.maxQty) {
      quantity = rules.maxQty
    }

    // Adjust to step size
    const steps = Math.floor(quantity / rules.stepSize)
    const adjustedQuantity = steps * rules.stepSize

    // Round to proper precision
    return Number.parseFloat(adjustedQuantity.toFixed(8))
  }

  static validateOrder(
    symbol: string,
    quantity: number,
    price: number,
    rules: TradingRules,
  ): {
    valid: boolean
    adjustedQuantity: number
    errors: string[]
  } {
    const errors: string[] = []
    let adjustedQuantity = quantity

    // Check minimum quantity
    if (quantity < rules.minQty) {
      errors.push(`Quantity ${quantity} is below minimum ${rules.minQty}`)
      return { valid: false, adjustedQuantity: 0, errors }
    }

    // Adjust quantity to step size
    adjustedQuantity = this.adjustQuantity(quantity, rules)

    if (adjustedQuantity === 0) {
      errors.push(`Adjusted quantity is 0 after applying step size ${rules.stepSize}`)
      return { valid: false, adjustedQuantity: 0, errors }
    }

    // Check notional value (quantity * price)
    const notionalValue = adjustedQuantity * price
    if (notionalValue < rules.minNotional) {
      errors.push(`Notional value ${notionalValue.toFixed(2)} is below minimum ${rules.minNotional}`)
      return { valid: false, adjustedQuantity: 0, errors }
    }

    return { valid: true, adjustedQuantity, errors: [] }
  }
}
