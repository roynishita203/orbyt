import { ArrowRight, ExternalLink } from "lucide-react"

const CONTRACT_EXPLORER_URL =
  "https://stellar.expert/explorer/testnet/contract/CBP5MBVXH7TVFXV6P6JPYM5D7N53KZPGTHXNGFCCJONAKBLLPYQW5SBI"
const FREIGHTER_URL = "https://freighter.app"

const steps = [
  {
    title: "1. Get a wallet",
    description: "Install Freighter and switch it to Testnet -- it's how you'll connect and sign.",
  },
  {
    title: "2. Fund your vault",
    description: "Subscribe to a plan and pre-fund your vault in a single transaction. That's the only signature you need.",
  },
  {
    title: "3. Let the keeper bot take over",
    description: "From here on, charges trigger automatically on schedule. Cancel or top up anytime.",
  },
]

export default function ProjectForm() {
  return (
    <div className="container mx-auto py-12 px-6 md:px-10">
      <div className="max-w-xl mx-auto w-full">
        <div className="bg-[#3a3a3a] rounded-2xl p-6 md:p-8 shadow-lg">
          {/* Header */}
          <div className="mb-8">
            <p className="text-white text-base md:text-lg leading-relaxed">
              SubVault is live on Stellar Testnet right now. Here&apos;s how to try it.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.title}>
                <p className="block text-white text-sm font-medium mb-2">{step.title}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-8 flex flex-wrap gap-4">
            <a
              href={CONTRACT_EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7A7FEE] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-all"
            >
              View Contract
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={FREIGHTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[#5a5a5a] text-white rounded-lg text-sm font-medium hover:bg-[#4a4a4a] transition-all"
            >
              Get Freighter Wallet
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
