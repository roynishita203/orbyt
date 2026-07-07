import { Wallet, RefreshCw, ShieldCheck } from "lucide-react"

const services = [
  {
    id: 1,
    title: "Fund Your Vault",
    description: "Subscribe to a plan and pre-fund your vault in one transaction. No recurring approvals needed.",
    icon: Wallet,
    color: "bg-[#7A7FEE]",
  },
  {
    id: 2,
    title: "Automation Takes Over",
    description:
      "A permissionless keeper bot polls the contract and triggers each charge exactly when it's due -- no wallet popups, no missed cycles.",
    icon: RefreshCw,
    color: "bg-[#7A7FEE]",
  },
  {
    id: 3,
    title: "Stay in Control",
    description: "Cancel future charges anytime and withdraw whatever's left in your vault. Your funds, your call.",
    icon: ShieldCheck,
    color: "bg-[#7A7FEE]",
  },
]

export default function Services() {
  return (
    <section id="services" className="my-20">
      <h2 className="text-black dark:text-white mb-6 text-3xl md:text-4xl lg:text-5xl font-medium leading-tight">
        How
        <span className="block text-[#7A7FEE] dark:text-[#7A7FEE]">SubVault Works</span>
      </h2>
      <p className="mb-12 max-w-2xl text-gray-700 dark:text-gray-300">
        Fund once. The rest happens automatically on-chain -- powered by a permissionless charge() function and an
        off-chain keeper bot that never sleeps.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.id} className="card p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className={`${service.color} w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-sm`}>
              <service.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">{service.title}</h3>
            <p className="text-gray-700 dark:text-gray-300">{service.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
