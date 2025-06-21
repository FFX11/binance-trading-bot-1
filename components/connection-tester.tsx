"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertTriangle, Loader2, Wifi } from "lucide-react"

interface ConnectionTesterProps {
  apiKey: string
  apiSecret: string
  testnet: boolean
}

interface TestResult {
  name: string
  status: "pending" | "success" | "error" | "warning"
  message: string
  details?: string
}

export function ConnectionTester({ apiKey, apiSecret, testnet }: ConnectionTesterProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [overallStatus, setOverallStatus] = useState<"idle" | "testing" | "success" | "error">("idle")

  const runConnectionTests = async () => {
    setIsRunning(true)
    setOverallStatus("testing")
    setTestResults([])

    const tests: TestResult[] = [
      { name: "API Key Format", status: "pending", message: "Validating API key format..." },
      { name: "API Secret Format", status: "pending", message: "Validating API secret format..." },
      { name: "Server Time Sync", status: "pending", message: "Synchronizing with Binance server time..." },
      { name: "API Connection", status: "pending", message: "Testing API connection..." },
      { name: "Account Access", status: "pending", message: "Accessing account information..." },
      { name: "Trading Permissions", status: "pending", message: "Checking trading permissions..." },
    ]

    setTestResults([...tests])

    try {
      // Test 1: API Key Format
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (!apiKey || apiKey.length < 10) {
        tests[0] = { ...tests[0], status: "error", message: "API Key format is invalid" }
      } else {
        tests[0] = { ...tests[0], status: "success", message: "API Key format looks valid" }
      }
      setTestResults([...tests])

      // Test 2: API Secret Format
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (!apiSecret || apiSecret.length < 10) {
        tests[1] = { ...tests[1], status: "error", message: "API Secret format is invalid" }
      } else {
        tests[1] = { ...tests[1], status: "success", message: "API Secret format looks valid" }
      }
      setTestResults([...tests])

      // Test 3: Server Time Sync
      await new Promise((resolve) => setTimeout(resolve, 500))
      try {
        const timeResponse = await fetch(`/api/binance/time?testnet=${testnet}`)
        const timeData = await timeResponse.json()

        if (timeData.error) {
          tests[2] = { ...tests[2], status: "error", message: "Failed to sync server time", details: timeData.error }
        } else {
          tests[2] = {
            ...tests[2],
            status: "success",
            message: "Server time synchronized",
            details: `Offset: ${timeData.offset}ms`,
          }
        }
      } catch (error) {
        tests[2] = { ...tests[2], status: "error", message: "Server time sync failed" }
      }
      setTestResults([...tests])

      // Test 4: API Connection
      await new Promise((resolve) => setTimeout(resolve, 500))
      try {
        const response = await fetch("/api/binance/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, apiSecret, testnet }),
        })

        const data = await response.json()

        if (response.ok) {
          tests[3] = { ...tests[3], status: "success", message: "API connection successful" }
          tests[4] = { ...tests[4], status: "success", message: "Account information retrieved" }

          // Test 5: Trading Permissions
          const hasSpotTradingPermission = data.permissions?.includes("SPOT")
          if (hasSpotTradingPermission) {
            tests[5] = { ...tests[5], status: "success", message: "Trading permissions confirmed" }
          } else {
            tests[5] = {
              ...tests[5],
              status: "warning",
              message: "Trading permissions may not be enabled",
              details: "Check if 'Enable Trading' is selected in your API settings",
            }
          }

          setOverallStatus("success")
        } else {
          tests[3] = { ...tests[3], status: "error", message: "API connection failed", details: data.error }
          tests[4] = { ...tests[4], status: "error", message: "Cannot access account" }
          tests[5] = { ...tests[5], status: "error", message: "Cannot check permissions" }

          setOverallStatus("error")
        }
      } catch (error: any) {
        tests[3] = { ...tests[3], status: "error", message: "Connection test failed", details: error.message }
        tests[4] = { ...tests[4], status: "error", message: "Cannot access account" }
        tests[5] = { ...tests[5], status: "error", message: "Cannot check permissions" }

        setOverallStatus("error")
      }

      setTestResults([...tests])
    } catch (error) {
      setOverallStatus("error")
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "pending":
        return <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
      default:
        return <div className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: typeof overallStatus) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">All Tests Passed</Badge>
      case "error":
        return <Badge variant="destructive">Tests Failed</Badge>
      case "testing":
        return <Badge variant="secondary">Testing...</Badge>
      default:
        return <Badge variant="outline">Ready to Test</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Connection Diagnostics
        </CardTitle>
        <CardDescription>Test your API connection and troubleshoot issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {getStatusBadge(overallStatus)}
          </div>
          <Button onClick={runConnectionTests} disabled={isRunning || !apiKey || !apiSecret}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Run Diagnostics"
            )}
          </Button>
        </div>

        {testResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Test Results:</h4>
              {testResults.map((test, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {getStatusIcon(test.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{test.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                    {test.details && <p className="text-xs text-gray-500 mt-1">{test.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {overallStatus === "error" && (
          <>
            <Separator />
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Common Issues & Solutions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                      <strong>Invalid API Key/Secret:</strong> Double-check your credentials from Binance
                    </li>
                    <li>
                      <strong>Missing Permissions:</strong> Enable "Spot & Margin Trading" in API settings
                    </li>
                    <li>
                      <strong>IP Restriction:</strong> Add your IP to whitelist or disable IP restriction
                    </li>
                    <li>
                      <strong>Wrong Environment:</strong> Use testnet keys for testnet, live keys for live trading
                    </li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </>
        )}

        {overallStatus === "success" && (
          <>
            <Separator />
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-green-700">Connection Successful!</p>
                  <p className="text-sm">
                    Your API credentials are working correctly. You can now proceed with trading.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  )
}
