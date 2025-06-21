"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, TrendingDown, Activity, DollarSign, Coins, Target, BarChart3 } from "lucide-react"

interface PriceData {
  timestamp: number
  price: number
  sma20?: number
  sma50?: number
  rsi?: number
  volume?: number
}

interface TradeData {
  id: string
  timestamp: number
  type: "BUY" | "SELL"
  price: number
  quantity: number
  value: number
  reason: string
  rsi: number
  signal: string
}

interface PortfolioSnapshot {
  timestamp: number
  xrpBalance: number
  usdtBalance: number
  totalValue: number
  xrpPrice: number
}

interface DashboardProps {
  currentPrice: number
  xrpBalance: number
  usdtBalance: number
  isActive: boolean
  targetXRP: number
}

export function TradingDashboard({ currentPrice, xrpBalance, usdtBalance, isActive, targetXRP }: DashboardProps) {
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([])
  const [tradeHistory, setTradeHistory] = useState<TradeData[]>([])
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([])
  const [technicalIndicators, setTechnicalIndicators] = useState({
    sma20: 0,
    sma50: 0,
    rsi: 50,
    trend: "NEUTRAL" as "BULLISH" | "BEARISH" | "NEUTRAL",
    signal: "HOLD" as "BUY" | "SELL" | "HOLD",
    signalStrength: 0,
  })

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const newPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.01) // 1% volatility

      // Calculate technical indicators
      const newPriceData: PriceData = {
        timestamp: now,
        price: newPrice,
        volume: Math.random() * 1000000,
      }

      setPriceHistory((prev) => {
        const updated = [...prev, newPriceData].slice(-100) // Keep last 100 points

        // Calculate SMA20
        if (updated.length >= 20) {
          const sma20 = updated.slice(-20).reduce((sum, p) => sum + p.price, 0) / 20
          newPriceData.sma20 = sma20
        }

        // Calculate SMA50
        if (updated.length >= 50) {
          const sma50 = updated.slice(-50).reduce((sum, p) => sum + p.price, 0) / 50
          newPriceData.sma50 = sma50
        }

        // Calculate RSI
        if (updated.length >= 15) {
          const rsi = calculateRSI(updated.slice(-15))
          newPriceData.rsi = rsi

          // Update technical indicators
          setTechnicalIndicators({
            sma20: newPriceData.sma20 || 0,
            sma50: newPriceData.sma50 || 0,
            rsi,
            trend:
              newPriceData.sma20 && newPriceData.sma50
                ? newPriceData.sma20 > newPriceData.sma50
                  ? "BULLISH"
                  : "BEARISH"
                : "NEUTRAL",
            signal: rsi < 30 ? "BUY" : rsi > 70 ? "SELL" : "HOLD",
            signalStrength: Math.abs(50 - rsi) / 50,
          })
        }

        return updated
      })

      // Update portfolio snapshot
      const totalValue = usdtBalance + xrpBalance * newPrice
      setPortfolioHistory((prev) =>
        [
          ...prev,
          {
            timestamp: now,
            xrpBalance,
            usdtBalance,
            totalValue,
            xrpPrice: newPrice,
          },
        ].slice(-200),
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [currentPrice, xrpBalance, usdtBalance])

  const calculateRSI = (prices: PriceData[]): number => {
    if (prices.length < 14) return 50

    let gains = 0
    let losses = 0

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i].price - prices[i - 1].price
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }

    const avgGain = gains / 14
    const avgLoss = losses / 14
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const accumulationProgress = (xrpBalance / targetXRP) * 100
  const totalValue = usdtBalance + xrpBalance * currentPrice

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Real-time Price Chart */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            XRP/USDT Price Chart
          </CardTitle>
          <CardDescription>Real-time price with technical indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Price Display */}
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{formatCurrency(currentPrice)}</div>
              <div className="flex items-center gap-2">
                {priceHistory.length > 1 &&
                priceHistory[priceHistory.length - 1].price > priceHistory[priceHistory.length - 2].price ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <Badge
                  variant={
                    technicalIndicators.trend === "BULLISH"
                      ? "default"
                      : technicalIndicators.trend === "BEARISH"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {technicalIndicators.trend}
                </Badge>
              </div>
            </div>

            {/* Simple ASCII Chart */}
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
              <div className="grid grid-cols-10 gap-1 h-32">
                {priceHistory.slice(-10).map((data, index) => {
                  const height = Math.max(
                    10,
                    (data.price / Math.max(...priceHistory.slice(-10).map((p) => p.price))) * 100,
                  )
                  return (
                    <div key={index} className="flex flex-col justify-end">
                      <div
                        className="bg-blue-500 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${formatCurrency(data.price)} at ${formatTime(data.timestamp)}`}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="text-center mt-2 text-gray-600">Last 10 price points</div>
            </div>

            {/* Technical Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">SMA 20:</span>
                  <span className="font-medium">{formatCurrency(technicalIndicators.sma20)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">SMA 50:</span>
                  <span className="font-medium">{formatCurrency(technicalIndicators.sma50)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">RSI:</span>
                  <span
                    className={`font-medium ${
                      technicalIndicators.rsi < 30
                        ? "text-green-600"
                        : technicalIndicators.rsi > 70
                          ? "text-red-600"
                          : "text-gray-900"
                    }`}
                  >
                    {technicalIndicators.rsi.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Signal:</span>
                  <Badge
                    variant={
                      technicalIndicators.signal === "BUY"
                        ? "default"
                        : technicalIndicators.signal === "SELL"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {technicalIndicators.signal}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Portfolio Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Accumulation Progress */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">XRP Target Progress</span>
              <span className="text-sm font-medium">{accumulationProgress.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(accumulationProgress, 100)} className="w-full" />
            <div className="text-xs text-gray-500 text-center">
              {xrpBalance.toFixed(0)} / {targetXRP.toLocaleString()} XRP
            </div>
          </div>

          <Separator />

          {/* Current Holdings */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-orange-500" />
                <span className="text-sm">XRP Holdings</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{xrpBalance.toFixed(2)}</div>
                <div className="text-xs text-gray-500">{formatCurrency(xrpBalance * currentPrice)}</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm">USDT Available</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{usdtBalance.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Buying Power</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Total Portfolio</span>
              <div className="text-right">
                <div className="font-bold text-lg">{formatCurrency(totalValue)}</div>
                <div className="text-xs text-gray-500">
                  {(((xrpBalance * currentPrice) / totalValue) * 100).toFixed(1)}% XRP
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Performance Metrics</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium">Avg Buy Price</div>
                <div className="text-gray-600">
                  {portfolioHistory.length > 0
                    ? formatCurrency(portfolioHistory.reduce((sum, p) => sum + p.xrpPrice, 0) / portfolioHistory.length)
                    : "N/A"}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium">Total Trades</div>
                <div className="text-gray-600">{tradeHistory.length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Activity Log */}
      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Trading Activity
          </CardTitle>
          <CardDescription>Real-time trading signals and market analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Signal */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Current Market Signal</span>
                <Badge
                  variant={
                    technicalIndicators.signal === "BUY"
                      ? "default"
                      : technicalIndicators.signal === "SELL"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {technicalIndicators.signal}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">RSI</div>
                  <div className="font-medium">{technicalIndicators.rsi.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Trend</div>
                  <div className="font-medium">{technicalIndicators.trend}</div>
                </div>
                <div>
                  <div className="text-gray-600">Signal Strength</div>
                  <div className="font-medium">{(technicalIndicators.signalStrength * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Bot Status</div>
                  <div className="font-medium">{isActive ? "ACTIVE" : "PAUSED"}</div>
                </div>
              </div>
            </div>

            {/* Market Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Price vs SMA20</div>
                <div className="flex items-center gap-2">
                  <div
                    className={`font-medium ${
                      currentPrice < technicalIndicators.sma20 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {currentPrice < technicalIndicators.sma20 ? "BELOW" : "ABOVE"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(((currentPrice - technicalIndicators.sma20) / technicalIndicators.sma20) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="text-sm text-gray-600 mb-1">RSI Condition</div>
                <div className="flex items-center gap-2">
                  <div
                    className={`font-medium ${
                      technicalIndicators.rsi < 30
                        ? "text-green-600"
                        : technicalIndicators.rsi > 70
                          ? "text-red-600"
                          : "text-gray-600"
                    }`}
                  >
                    {technicalIndicators.rsi < 30
                      ? "OVERSOLD"
                      : technicalIndicators.rsi > 70
                        ? "OVERBOUGHT"
                        : "NEUTRAL"}
                  </div>
                </div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Accumulation Score</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium text-blue-600">
                    {(
                      (technicalIndicators.rsi < 40 ? 30 : 0) +
                      (currentPrice < technicalIndicators.sma20 ? 40 : 0) +
                      (technicalIndicators.trend === "BEARISH" ? 30 : 0)
                    ).toFixed(0)}
                    /100
                  </div>
                  <div className="text-xs text-gray-500">Buy Signal</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-medium mb-3">Recent Market Events</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[
                  {
                    time: new Date().toLocaleTimeString(),
                    event: `RSI: ${technicalIndicators.rsi.toFixed(1)} - ${
                      technicalIndicators.rsi < 30
                        ? "Strong Buy Signal"
                        : technicalIndicators.rsi > 70
                          ? "Sell Signal"
                          : "Neutral"
                    }`,
                    type: technicalIndicators.rsi < 30 ? "buy" : technicalIndicators.rsi > 70 ? "sell" : "neutral",
                  },
                  {
                    time: new Date(Date.now() - 30000).toLocaleTimeString(),
                    event: `Price ${currentPrice < technicalIndicators.sma20 ? "below" : "above"} SMA20 (${formatCurrency(
                      technicalIndicators.sma20,
                    )})`,
                    type: currentPrice < technicalIndicators.sma20 ? "buy" : "sell",
                  },
                  {
                    time: new Date(Date.now() - 60000).toLocaleTimeString(),
                    event: `Trend: ${technicalIndicators.trend} - ${
                      technicalIndicators.trend === "BULLISH" ? "Upward momentum" : "Downward pressure"
                    }`,
                    type: "info",
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === "buy"
                            ? "bg-green-500"
                            : activity.type === "sell"
                              ? "bg-red-500"
                              : "bg-gray-400"
                        }`}
                      />
                      <span>{activity.event}</span>
                    </div>
                    <span className="text-gray-500 text-xs">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
