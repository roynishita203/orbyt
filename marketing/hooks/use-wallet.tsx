"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { connectWallet, detectFreighter, getWalletAddress } from "@/lib/wallet"

export interface UseWalletResult {
  address: string | null
  isInstalled: boolean | null
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<UseWalletResult | null>(null)

/**
 * Single source of truth for wallet connection state, shared across the
 * whole site via context. Every component previously called useWallet() as
 * a plain hook, which gave each one its own independent local state --
 * connecting via the header's WalletStatus never updated the dashboard
 * page's own copy, silently leaving `client`/`address` null there and
 * disabling the Subscribe button with no visible explanation. Wrapping the
 * app in this provider once (see app/layout.tsx) fixes that: connect
 * anywhere, and every consumer sees the same address immediately.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const installed = await detectFreighter()
      if (cancelled) return
      setIsInstalled(installed)
      if (installed) {
        const existing = await getWalletAddress()
        if (!cancelled && existing) setAddress(existing)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const addr = await connectWallet()
      setAddress(addr)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect wallet.")
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setError(null)
  }, [])

  const value: UseWalletResult = { address, isInstalled, isConnecting, error, connect, disconnect }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): UseWalletResult {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error("useWallet() must be used within a <WalletProvider>. Check app/layout.tsx.")
  }
  return ctx
}
