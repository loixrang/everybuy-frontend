# Current Task

## Sale customer bottom-sheet picker with balances

Status: COMPLETED — typecheck, lint, 118 tests, and the production build pass. Browser/device automation is unavailable in this environment, so 360 px and dark-mode rendering were checked by code review against the theme tokens.

Replace the Sale screen's native customer dropdown with a modal bottom sheet. The trigger and each customer row show the customer's outstanding `balance` from `GET /api/v1/customers`, the same field the Customers tab uses. The sheet supports Full payment/Customer modes, live name search, initials avatars, a pinned New customer action reusing `AddCustomerModal`, body scroll locking, focus trapping, and theme-aware slide/fade motion. The sale submission payload is unchanged: the selected customer id or `null`.
