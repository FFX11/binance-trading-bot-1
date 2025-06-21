"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Settings, Target, TrendingUp, ExternalLink } from "lucide-react"
import { BinanceAPI } from "@/lib/binance-api"
import { AdvancedTradingEngine } from "@/lib/advanced-trading-engine"
import { TradingDashboard } from "@/components/trading-dashboard"
import { TradingMetrics } from "@/components/trading-metrics"
import { ConnectionTester } from "@/components/connection-tester"

interface ApiCredentials {
  apiKey: string
  apiSecret: string
  testnet: boolean
}

interface AccumulationConfig {
  targetXRP: number
  investmentAmount: number
  strategy: "accumulation" | "grid" | "dca"
  riskLevel: number
}

export default function XRPAccumulationBot() {
  const [credentials, setCredentials] = useState<ApiCredentials>({
    apiKey: "",
    apiSecret: "",
    testnet: true,
  })

  const [accumulationConfig, setAccumulationConfig] = useState<AccumulationConfig>({
    targetXRP: 10000,
    investmentAmount: 1000,
    strategy: "accumulation",
    riskLevel: 5,
  })

  const [isConnected, setIsConnected] = useState(false)
  const [tradingEngine, setTradingEngine] = useState<AdvancedTradingEngine | null>(null)
  const [portfolioData, setPortfolioData] = useState({
    xrpBalance: 0,
    usdtBalance: 0,
    currentPrice: 0,
    totalValue: 0,
    isActive: false,
  })

  const [error, setError] = useState<string>("")
  const [showCredentials, setShowCredentials] = useState(true)

  const connectToBinance = useCallback(async () => {
    if (!credentials.apiKey || !credentials.apiSecret) {
      setError("Please enter both API Key and Secret")
      return
    }

    try {
      setError("")
      console.log("🔗 Connecting to Binance for XRP Accumulation...")

      const binanceAPI = new BinanceAPI(credentials.apiKey, credentials.apiSecret, credentials.testnet)
      await binanceAPI.getAccountInfo()

      const engine = new AdvancedTradingEngine(binanceAPI, {
        symbol: "XRPUSDT",
        strategy: accumulationConfig.strategy,
        baseAmount: accumulationConfig.investmentAmount,
        maxRisk: accumulationConfig.riskLevel / 100,
        accumulationTarget: accumulationConfig.targetXRP,
      })

      setTradingEngine(engine)
      setIsConnected(true)
      setShowCredentials(false)

      console.log("✅ Successfully connected! Ready for XRP accumulation.")

      // Start monitoring
      const interval = setInterval(async () => {
        if (engine) {
          try {
            const price = await binanceAPI.getPrice("XRPUSDT")
            const xrpBalance = await binanceAPI.getBalance("XRP")
            const usdtBalance = await binanceAPI.getBalance("USDT")
            const stats = engine.getStats()

            setPortfolioData({
              xrpBalance: xrpBalance.free,
              usdtBalance: usdtBalance.free,
              currentPrice: price,
              totalValue: usdtBalance.free + xrpBalance.free * price,
              isActive: stats.isActive,
            })
          } catch (error) {
            console.error("Portfolio update error:", error)
          }
        }
      }, 3000)

      return () => clearInterval(interval)
    } catch (error: any) {
      console.error("Connection failed:", error)
      setError(`Connection failed: ${error.message}`)
      setIsConnected(false)
    }
  }, [credentials, accumulationConfig])

  const toggleAccumulation = async () => {
    if (!tradingEngine) return

    try {
      if (portfolioData.isActive) {
        tradingEngine.stop()
      } else {
        await tradingEngine.start()
      }
    } catch (error: any) {
      setError(`Accumulation error: ${error.message}`)
    }
  }

  if (showCredentials || !isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              XRP Accumulation Bot Setup
            </CardTitle>
            <CardDescription>Configure your XRP accumulation strategy and test your connection</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="setup" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="test">Test Connection</TabsTrigger>
                <TabsTrigger value="help">Help & Troubleshooting</TabsTrigger>
              </TabsList>

              <TabsContent value="setup" className="space-y-6 mt-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* API Credentials */}
                <div className="space-y-4">
                  <h3 className="font-semibold">API Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your Binance API Key"
                        value={credentials.apiKey}
                        onChange={(e) => setCredentials((prev) => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiSecret">API Secret</Label>
                      <Input
                        id="apiSecret"
                        type="password"
                        placeholder="Enter your Binance API Secret"
                        value={credentials.apiSecret}
                        onChange={(e) => setCredentials((prev) => ({ ...prev, apiSecret: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="testnet"
                      checked={credentials.testnet}
                      onCheckedChange={(checked) => setCredentials((prev) => ({ ...prev, testnet: checked }))}
                    />
                    <Label htmlFor="testnet">Use Testnet (Recommended for testing)</Label>
                  </div>
                </div>

                <Separator />

                {/* Accumulation Strategy */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Accumulation Strategy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetXRP">Target XRP Amount</Label>
                      <Input
                        id="targetXRP"
                        type="number"
                        placeholder="10000"
                        value={accumulationConfig.targetXRP}
                        onChange={(e) =>
                          setAccumulationConfig((prev) => ({
                            ...prev,
                            targetXRP: Number(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="investment">Investment Amount (USDT)</Label>
                      <Input
                        id="investment"
                        type="number"
                        placeholder="1000"
                        value={accumulationConfig.investmentAmount}
                        onChange={(e) =>
                          setAccumulationConfig((prev) => ({
                            ...prev,
                            investmentAmount: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Risk Level: {accumulationConfig.riskLevel}/10</Label>
                    <Slider
                      value={[accumulationConfig.riskLevel]}
                      onValueChange={(value) =>
                        setAccumulationConfig((prev) => ({
                          ...prev,
                          riskLevel: value[0],
                        }))
                      }
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Conservative</span>
                      <span>Aggressive</span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Accumulation Strategy:</strong> This bot focuses on maximizing XRP holdings through smart
                    buying during dips and minimal selling during peaks.
                  </AlertDescription>
                </Alert>

                <Button onClick={connectToBinance} className="w-full" size="lg">
                  Start XRP Accumulation
                </Button>
              </TabsContent>

              <TabsContent value="test" className="mt-6">
                <ConnectionTester
                  apiKey={credentials.apiKey}
                  apiSecret={credentials.apiSecret}
                  testnet={credentials.testnet}
                />
              </TabsContent>

              <TabsContent value="help" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">How to Get Binance API Keys</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            1
                          </div>
                          <div>
                            <p className="font-medium">Go to Binance API Management</p>
                            <p className="text-sm text-gray-600">
                              Visit{" "}
                              <a
                                href="https://www.binance.com/en/my/settings/api-management"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1"
                              >
                                Binance API Management
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            2
                          </div>
                          <div>
                            <p className="font-medium">Create API Key</p>
                            <p className="text-sm text-gray-600">Click "Create API" and choose "System Generated"</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            3
                          </div>
                          <div>
                            <p className="font-medium">Configure Permissions</p>
                            <p className="text-sm text-gray-600">
                              Enable: ✅ Enable Reading ✅ Enable Spot & Margin Trading
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            4
                          </div>
                          <div>
                            <p className="font-medium">IP Restriction (Optional)</p>
                            <p className="text-sm text-gray-600">
                              For security, you can restrict API access to specific IP addresses
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Troubleshooting Common Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-red-600">❌ Invalid API-key, IP, or permissions</h4>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                            <li>Double-check your API Key and Secret are correct</li>
                            <li>Ensure "Enable Trading" is checked in your API settings</li>
                            <li>If using IP restriction, add your current IP to the whitelist</li>
                            <li>Make sure you're using the right environment (testnet vs live)</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium text-yellow-600">⚠️ Timestamp errors</h4>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                            <li>This is automatically handled by server time synchronization</li>
                            <li>If issues persist, check your system clock is accurate</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium text-blue-600">ℹ️ For Testing</h4>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                            <li>
                              Use{" "}
                              <a
                                href="https://testnet.binance.vision/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Binance Testnet
                              </a>{" "}
                              for safe testing
                            </li>
                            <li>Testnet uses fake money - perfect for learning</li>
                            <li>Create separate API keys for testnet</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">XRP Accumulation Bot</h1>
            <p className="text-gray-600">Smart accumulation strategy for maximum XRP holdings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCredentials(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Dashboard */}
        <TradingMetrics
          xrpBalance={portfolioData.xrpBalance}
          usdtBalance={portfolioData.usdtBalance}
          currentPrice={portfolioData.currentPrice}
          targetXRP={accumulationConfig.targetXRP}
          initialInvestment={accumulationConfig.investmentAmount}
        />

        {/* Trading Dashboard with Charts */}
        <TradingDashboard
          currentPrice={portfolioData.currentPrice}
          xrpBalance={portfolioData.xrpBalance}
          usdtBalance={portfolioData.usdtBalance}
          isActive={portfolioData.isActive}
          targetXRP={accumulationConfig.targetXRP}
        />
      </div>
    </div>
  )
}
