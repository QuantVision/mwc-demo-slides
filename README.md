# MWC Case Study 1 Topology Demo

Animated React + TypeScript visualization for:
`Anomaly Detection & Resolution rApp` on an Open RAN lab topology.

The scene is rendered as a realistic 3-tier schematic:
- Top: `SMO + Non-RT RIC` and `VISMON AI`
- Mid: `O-CU`, `O-DU`, and `5G CORE`
- Bottom: `RU-A`, `RU-B`, `UE1`, `UE2`, `CPE`

Message tokens run along explicit labeled links (`Midhaul`, `Fronthaul / Split 7.2x`, `RAN KPIs (O1/E2-like)`, `REST/gRPC`) and include a closed-loop workflow with optional NOC escalation.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Controls

- `Play / Pause`
- Speed: `0.5x`, `1x`, `2x`
- `Trigger Anomaly`
- `Closed Loop: ON/OFF`
- `Reset`
- `Record 15s` (downloads `.webm`)

## Core Files

- `/Users/marcoantoniolourencocarvalho/Developer/mwc-demo-slides/src/components/TopologyScene.tsx`
- `/Users/marcoantoniolourencocarvalho/Developer/mwc-demo-slides/src/simulator/useSimulator.ts`
- `/Users/marcoantoniolourencocarvalho/Developer/mwc-demo-slides/src/utils/animateToken.ts`
- `/Users/marcoantoniolourencocarvalho/Developer/mwc-demo-slides/src/App.tsx`
- `/Users/marcoantoniolourencocarvalho/Developer/mwc-demo-slides/src/styles.css`

