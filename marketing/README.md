# SubVault Marketing Site

The public landing page for [SubVault](../README.md) -- a Soroban recurring-payments
contract on Stellar. This is a standalone Next.js app, separate from the
Vite dashboard in `../frontend` (subscriber/merchant views), since the two
use different frameworks.

Originally scaffolded from a v0 agency-portfolio template; the case-study
portfolio system and lead-gen contact form were removed as inapplicable to
a single Web3 product (see git history for what was cut), and all copy was
rewritten to describe SubVault specifically.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

## Customizing Content

- Hero: `components/landing-page/hero.tsx`
- How it works: `components/landing-page/services.tsx`
- FAQ: `components/landing-page/faq.tsx`
- Final CTA: `components/landing-page/call-to-action.tsx`
- Footer: `components/landing-page/footer.tsx`
- Get Started page: `components/landing-page/start-project.tsx` + `project-form.tsx`
- Nav / resource links: `components/landing-page/nav-data.ts`
- Site metadata: `app/layout.tsx`

## Styling

- Primary brand color is `#7A7FEE` -- defined in `components/landing-page/styles.css`
  and used throughout via Tailwind arbitrary values.
- Tailwind config: `tailwind.config.ts`

## Project Structure

\`\`\`
├── app/                    # Next.js app directory (/ and /start)
├── components/
│   ├── landing-page/       # All landing-page sections
│   ├── theme-provider.tsx
│   └── ui/
├── public/                 # Logos (SVG), favicon, decorative imagery
└── lib/utils.ts
\`\`\`

## Technologies Used

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Theme**: next-themes
- **Analytics**: Vercel Analytics
- **Icons**: Lucide React

## Deployment

Standard Next.js app -- deploys to Vercel, Netlify, Railway, or any
Node.js host. See `../.github/workflows/deploy.yml` for the CD pipeline
covering the contract and the `frontend/` dashboard (this marketing site
is not yet wired into that pipeline).
