"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Pause, Activity, AlertTriangle } from "lucide-react"

interface TradingControlsProps {
  isActive: boolean
  isConnected: boolean
  onToggle: () => void
  currentSignal: string
  signalStrength: number
}

export function TradingControls({
  isActive,
  isConnected,
  onToggle,
  currentSignal,
  signalStrength,
}: TradingControlsProps) {
  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Bot Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
          <div className="space-y-1">
            <Label htmlFor="bot-toggle" className="text-base font-medium">
              XRP Accumulation Bot
            </Label>
            <p className="text-sm text-gray-600">
              {isActive ? "Bot is actively monitoring and trading" : "Bot is paused - no trades will execute"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isActive ? "default" : "secondary"} className="px-3 py-1">
              {isActive ? "ACTIVE" : "PAUSED"}
            </Badge>
            <Switch
              id="bot-toggle"
              checked={isActive}
              onCheckedChange={onToggle}
              disabled={!isConnected}
              className="scale-125"
            />
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onToggle}
            disabled={!isConnected}
            variant={isActive ? "destructive" : "default"}
            className="h-12"
          >
            {isActive ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Bot
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Bot
              </>
            )}
          </Button>
          <Button variant="outline" className="h-12" disabled>
            Emergency Stop
          </Button>
        </div>

        {/* Status Information */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Connection:</span>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current Signal:</span>
            <Badge
              variant={currentSignal === "BUY" ? "default" : currentSignal === "SELL" ? "destructive" : "secondary"}
            >
              {currentSignal}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Signal Strength:</span>
            <span className="font-medium">{signalStrength}%</span>
          </div>
        </div>

        {!isConnected && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Bot cannot start - API connection required. Check your credentials in Settings.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && !isActive && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Bot is paused.</strong> Click the switch above or "Start Bot" button to begin accumulation.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
