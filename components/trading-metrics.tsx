"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Calculator, PieChart, BarChart2, Target } from "lucide-react"

interface MetricsProps {
  xrpBalance: number
  usdtBalance: number
  currentPrice: number
  targetXRP: number
  initialInvestment: number
}

export function TradingMetrics({ xrpBalance, usdtBalance, currentPrice, targetXRP, initialInvestment }: MetricsProps) {
  const [performanceData, setPerformanceData] = useState({
    totalValue: 0,
    xrpValue: 0,
    totalReturn: 0,
    xrpReturn: 0,
    averageBuyPrice: 0,
    totalTrades: 0,
    winRate: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    accumulationRate: 0,
  })

  const [dailyStats, setDailyStats] = useState({
    priceChange24h: 0,
    volumeChange24h: 0,
    volatility: 0,
    momentum: 0,
  })

  useEffect(() => {
    // Calculate performance metrics
    const totalValue = usdtBalance + xrpBalance * currentPrice
    const xrpValue = xrpBalance * currentPrice
    const totalReturn = ((totalValue - initialInvestment) / initialInvestment) * 100

    // Simulate some metrics (in real app, these would come from trade history)
    const averageBuyPrice = currentPrice * (0.95 + Math.random() * 0.1) // Simulate avg buy price
    const xrpReturn = ((currentPrice - averageBuyPrice) / averageBuyPrice) * 100

    setPerformanceData({
      totalValue,
      xrpValue,
      totalReturn,
      xrpReturn,
      averageBuyPrice,
      totalTrades: Math.floor(Math.random() * 50) + 10,
      winRate: 65 + Math.random() * 20,
      maxDrawdown: -(Math.random() * 15 + 5),
      sharpeRatio: 1.2 + Math.random() * 0.8,
      accumulationRate: (xrpBalance / targetXRP) * 100,
    })

    // Simulate daily stats
    setDailyStats({
      priceChange24h: (Math.random() - 0.5) * 10,
      volumeChange24h: (Math.random() - 0.5) * 30,
      volatility: Math.random() * 5 + 2,
      momentum: (Math.random() - 0.5) * 100,
    })
  }, [xrpBalance, usdtBalance, currentPrice, targetXRP, initialInvestment])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Portfolio Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatCurrency(performanceData.totalValue)}</div>
            <div className="text-xs text-gray-500">Total Portfolio Value</div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`text-sm font-medium ${performanceData.totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatPercentage(performanceData.totalReturn)}
            </div>
            {performanceData.totalReturn >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">XRP Value:</span>
              <span className="font-medium">{formatCurrency(performanceData.xrpValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">USDT Balance:</span>
              <span className="font-medium">{formatCurrency(usdtBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">XRP Return:</span>
              <span className={`font-medium ${performanceData.xrpReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPercentage(performanceData.xrpReturn)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accumulation Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Accumulation Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{xrpBalance.toFixed(0)}</div>
            <div className="text-xs text-gray-500">XRP Accumulated</div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Progress to Target</span>
              <span className="font-medium">{performanceData.accumulationRate.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(performanceData.accumulationRate, 100)} className="h-2" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Target:</span>
              <span className="font-medium">{targetXRP.toLocaleString()} XRP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining:</span>
              <span className="font-medium">{(targetXRP - xrpBalance).toFixed(0)} XRP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Buy Price:</span>
              <span className="font-medium">{formatCurrency(performanceData.averageBuyPrice)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Trading Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{performanceData.totalTrades}</div>
            <div className="text-xs text-gray-500">Total Trades</div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate:</span>
              <span className="font-medium text-green-600">{performanceData.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Drawdown:</span>
              <span className="font-medium text-red-600">{performanceData.maxDrawdown.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sharpe Ratio:</span>
              <span className="font-medium">{performanceData.sharpeRatio.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Strategy:</span>
              <Badge variant="outline" className="text-xs">
                Accumulation
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Market Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatCurrency(currentPrice)}</div>
            <div className="text-xs text-gray-500">Current XRP Price</div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`text-sm font-medium ${dailyStats.priceChange24h >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatPercentage(dailyStats.priceChange24h)}
            </div>
            <div className="text-xs text-gray-500">24h Change</div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Volatility:</span>
              <span className="font-medium">{dailyStats.volatility.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Volume Change:</span>
              <span className={`font-medium ${dailyStats.volumeChange24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPercentage(dailyStats.volumeChange24h)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Momentum:</span>
              <span className={`font-medium ${dailyStats.momentum >= 0 ? "text-green-600" : "text-red-600"}`}>
                {dailyStats.momentum.toFixed(0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
