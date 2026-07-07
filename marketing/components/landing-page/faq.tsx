"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    id: 1,
    question: "What is SubVault?",
    answer:
      "A Soroban smart contract for recurring payments. You pre-fund a vault once, and a merchant gets charged automatically on a fixed schedule -- like a subscription, but fully on-chain and non-custodial.",
  },
  {
    id: 2,
    question: "Who can trigger a charge?",
    answer:
      "Anyone -- charge() is deliberately permissionless. Correctness comes entirely from its own due-date and balance checks, not from restricting who can call it. In practice an off-chain keeper bot calls it promptly, but it holds no special privilege in the contract.",
  },
  {
    id: 3,
    question: "What happens if my vault balance runs low?",
    answer:
      "If a charge is due but your balance is insufficient, the subscription is marked PastDue instead of taking a partial payment. Top up anytime to bring it back to Active.",
  },
  {
    id: 4,
    question: "Can I cancel anytime?",
    answer:
      "Yes. cancel_subscription stops all future charges immediately. Your remaining vault balance isn't refunded automatically -- withdraw it separately whenever you're ready.",
  },
  {
    id: 5,
    question: "What network is this live on?",
    answer:
      "Stellar Testnet today. The deployed contract and every charge it processes are publicly verifiable on Stellar Expert.",
  },
  {
    id: 6,
    question: "Do I need to sign a transaction every billing cycle?",
    answer:
      "No -- that's the whole point. You sign once when you subscribe. From then on, the keeper bot triggers each charge for you automatically.",
  },
]

export default function Faq() {
  const [openItem, setOpenItem] = useState<number | null>(null)

  const toggleItem = (id: number) => {
    setOpenItem(openItem === id ? null : id)
  }

  return (
    <section id="faq" className="my-20">
      <div className="card p-8 md:p-10 shadow-lg">
        <h2 className="text-black dark:text-white mb-6 text-3xl md:text-4xl lg:text-5xl font-medium leading-tight">
          Frequently Asked
          <span className="block text-[#7A7FEE] dark:text-[#7A7FEE]">Questions</span>
        </h2>
        <p className="mb-8 max-w-2xl text-gray-700 dark:text-gray-300">
          Have questions about how SubVault works? Here are the answers to the ones we hear most.
        </p>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="border-b pb-4 border-gray-300 dark:border-gray-700">
              <button
                onClick={() => toggleItem(faq.id)}
                className="flex justify-between items-center w-full text-left py-2 font-medium text-black dark:text-white hover:text-[#7A7FEE] dark:hover:text-[#7A7FEE] transition-colors"
                aria-expanded={openItem === faq.id}
                aria-controls={`faq-answer-${faq.id}`}
              >
                <span className="font-medium">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${openItem === faq.id ? "rotate-180 text-[#7A7FEE]" : ""}`}
                />
              </button>
              {openItem === faq.id && (
                <div id={`faq-answer-${faq.id}`} className="mt-2 text-gray-700 dark:text-gray-300">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
