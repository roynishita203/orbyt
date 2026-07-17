# Screenshots

Drop the four required submission screenshots in **this folder** using these exact
filenames so the main [`README.md`](../../README.md) renders them:

| Filename | Must show |
| --- | --- |
| `00-wallet-options.png` | The **wallet options available** — the connect dialog / list of selectable wallet(s) before connecting. |
| `05-mobile-responsive.png` | The **mobile responsive UI** — the app on a narrow/mobile viewport (use browser dev-tools device mode, e.g. iPhone). |
| `01-wallet-connected.png` | The **wallet connected** state — Freighter connected, the account address (and network = Testnet) visible in the UI. |
| `02-balance-displayed.png` | The **balance displayed** — the vault / account balance shown in the app. |
| `03-testnet-transaction.png` | A **successful testnet transaction** — a subscribe / top-up / charge action submitted and confirmed on Stellar Testnet. |
| `04-transaction-result.png` | The **transaction result shown to the user** — the success message / transaction hash surfaced back in the UI (ideally with a link to Stellar Expert / Horizon). |

## How to capture them

1. Install the [Freighter](https://www.freighter.app/) browser extension and switch it to **Testnet**.
2. Fund your testnet account at <https://friendbot.stellar.org> (or the Freighter faucet).
3. Open the app — either the live demo at <https://orbyt-ashen.vercel.app/app> or run it locally
   (`cd frontend && npm run dev`, then <http://localhost:5173>).
4. Connect the wallet → capture **01**.
5. With a plan/subscription funded, capture the balance → **02**.
6. Trigger a subscribe / charge, sign in Freighter → capture the submitted+confirmed tx → **03**.
7. Capture the success/result view the app shows afterward → **04**.

PNG or JPG are both fine; if you use `.jpg`, update the extensions in the main README image links.
