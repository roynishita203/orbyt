"use client"

import type React from "react"
import Link from "next/link"
import { useWallet } from "@/hooks/use-wallet"

interface ContactFormButtonProps {
  className?: string
  children?: React.ReactNode
}

/**
 * The site's "Get Started" CTA. Not installed -> links to freighter.app.
 * Installed, not connected -> clicking triggers Freighter's own connect
 * popup. Connected -> links to /app (the dashboard, same origin, so the
 * Freighter authorization carries over with no reconnect prompt).
 * Disconnecting only happens from inside the dashboard itself.
 */
export default function ContactFormButton({ className = "", children }: ContactFormButtonProps) {
  const { address, isInstalled, isConnecting, error, connect } = useWallet()
  const baseClassName = className || "btn-primary"

  if (isInstalled === false) {
    return (
      <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className={baseClassName}>
        Install Freighter
      </a>
    )
  }

  if (address) {
    return (
      <Link href="/app" className={baseClassName}>
        Go to Dashboard
      </Link>
    )
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={() => void connect()} disabled={isConnecting} className={baseClassName}>
        {isConnecting ? "Connecting…" : children || "Get Started"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
