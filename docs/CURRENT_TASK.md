# Current Task

## Negotiated sale pricing and half-bag selling

Status: IMPLEMENTED — typecheck, lint, tests, and production builds pass; migration application and live workflow verification remain deployment steps.

Add independent default/minimum prices per selling unit, optional Half Bag pricing and exact stock conversion, and per-sale negotiated price snapshots. Backend and frontend changes are coordinated; apply backend migration `0003_negotiated_half_bag_pricing.sql` before deployment.
