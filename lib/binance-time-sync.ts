let timeOffset = 0
let lastSyncTime = 0

export async function syncServerTime(baseURL: string): Promise<void> {
  try {
    const now = Date.now()

    // Only sync if we haven't synced in the last 5 minutes
    if (now - lastSyncTime < 5 * 60 * 1000) {
      return
    }

    console.log("Syncing with Binance server time...")
    const response = await fetch(`${baseURL}/v3/time`)

    if (response.ok) {
      const data = await response.json()
      const serverTime = data.serverTime
      const localTime = Date.now()

      timeOffset = serverTime - localTime
      lastSyncTime = localTime

      console.log(`Time synced successfully. Offset: ${timeOffset}ms`)
    } else {
      console.warn("Failed to fetch server time:", response.statusText)
    }
  } catch (error) {
    console.warn("Failed to sync server time:", error)
  }
}

export function getAdjustedTimestamp(): number {
  return Date.now() + timeOffset
}

export function getTimeOffset(): number {
  return timeOffset
}

export function getLastSyncTime(): number {
  return lastSyncTime
}
