import { BookOpen, ExternalLink, Wallet } from "lucide-react"
import type { SubNavItem } from "./nav-dropdown"
import { iconColors } from "./color-utils"

// Resources dropdown data
export const resourcesDropdownData: SubNavItem[][] = [
  [
    {
      title: "View Contract on Stellar Expert",
      description: "SubVault deployed live on Testnet",
      href: "https://stellar.expert/explorer/testnet/contract/CBP5MBVXH7TVFXV6P6JPYM5D7N53KZPGTHXNGFCCJONAKBLLPYQW5SBI",
      icon: ExternalLink,
      color: iconColors.resources.blog,
      external: true,
    },
    {
      title: "Stellar Developer Docs",
      description: "Learn how Soroban smart contracts work",
      href: "https://developers.stellar.org",
      icon: BookOpen,
      color: iconColors.resources.tutorials,
      external: true,
    },
    {
      title: "Get Freighter Wallet",
      description: "The wallet SubVault connects with",
      href: "https://freighter.app",
      icon: Wallet,
      color: iconColors.resources.community,
      external: true,
    },
  ],
]
