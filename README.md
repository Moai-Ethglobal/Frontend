Moai Frontend
=============

Moai is a mutual-aid savings circle: members contribute monthly, meet once a month, and keep an emergency reserve for real-life surprises.

Links
- Live demo: [moai-eth.vercel.app](https://moai-eth.vercel.app/)
- Pitch deck: [Canva](https://www.canva.com/design/DAHAvLOEFLU/byHuMAyfZspXW7QwlQGIWw/edit?utm_content=DAHAvLOEFLU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)

Highlights
- Frontend-first: usable with zero backend, then switches to onchain reads/writes via a contract address.
- Token-gated meetings: Huddle01 access token is minted server-side, optionally gated by nonce + signature + onchain membership.
- AA-ready: passkey/email sessions can use a Kernel smart account (permissionless + Pimlico). Wallets work as a fallback.
- ENS names + avatars: server-side resolver with RPC fallback + caching.
- “Grandma-first” UX: big actions, simple copy, fewer sharp edges.

Tech stack
- Next.js App Router, TypeScript, Tailwind CSS v4
- viem, permissionless.js (Kernel), Huddle01, LI.FI
- Biome (lint/format)

Architecture (high level)
- UI: Next.js App Router pages under src/app (client components for interactive screens).
- Data sources:
  - Local demo mode: state in localStorage (keys prefixed with moai.), updates via a small storage event bus.
  - Onchain mode: src/lib/onchainMoai.ts reads/writes the Moai contract with viem. Works with an injected wallet or AA.
- Server routes (Next.js route handlers):
  - /api/huddle/*: create room + mint access tokens; optional membership gating (nonce + signature + onchain memberInfo).
  - /api/ens: ENS name + avatar resolution with RPC fallback and caching.
  - /api/files: proof upload endpoint used by AWOL/Demise reports.
- The “switch” is config-driven:
  - Setting NEXT_PUBLIC_MOAI_CONTRACT_ADDRESS enables onchain reads/writes in the UI.
  - Setting MOAI_CONTRACT_ADDRESS + MOAI_RPC_URL enables meeting token gating on the server.


Quick start
1) npm install
2) Copy .env.example to .env
3) npm run dev

Then open http://localhost:3000

Environment
- Meetings
  - HUDDLE_API_KEY
  - NEXT_PUBLIC_HUDDLE_PROJECT_ID

- Onchain mode (UI reads/writes)
  - NEXT_PUBLIC_MOAI_CONTRACT_ADDRESS
  - NEXT_PUBLIC_MOAI_CHAIN_ID
  - (optional) NEXT_PUBLIC_MOAI_RPC_URL

- ENS (optional)
  - ENS_RPC_URL or MAINNET_RPC_URL (mainnet RPC endpoint)

- Meeting gating (optional, server-side)
  - MOAI_RPC_URL
  - MOAI_CONTRACT_ADDRESS
  - MOAI_CHAIN_ID

- Account abstraction (optional)
  - NEXT_PUBLIC_AA_CHAIN_ID
  - NEXT_PUBLIC_AA_RPC_URL
  - NEXT_PUBLIC_PIMLICO_RPC_URL (or NEXT_PUBLIC_PIMLICO_API_KEY + NEXT_PUBLIC_PIMLICO_CHAIN)

Notes
- Invites
  - Local invite codes are browser-local.
  - Onchain invites use /invite/0x... (contract address) and work across devices.

- Local vs onchain
  - Local “Pay now” and requests are stored in localStorage for fast demos.
  - Onchain actions require gas + test USDC on the target chain, and the contract’s configured contribution amount.

Troubleshooting
- “Transaction failed” on join/pay: check wallet network (chainId), gas, and USDC balance.
- Huddle token 403: signature is valid, but the address is not an active member onchain.
- Wallet connect does nothing on Brave: make MetaMask the injected provider (or disable Brave Wallet injection).

