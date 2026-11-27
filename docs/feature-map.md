# Feature map — where each feature lives

Updated at the end of every phase. Use it to answer "show us the code for X" in Q&A.

## Phase 2 — Foundation

| Feature | Files | Key functions / objects |
|---|---|---|
| Design tokens (white + baby blue, accessibility modes) | `src/app/globals.css` | `@theme` tokens, `html[data-text="large"]`, `html[data-contrast="high"]`, `html[data-motion="reduce"]` |
| Reusable UI | `src/components/ui/*` | `Button`, `ButtonLink`, `Field`, `Input`, `Alert`, `Card`, `Badge`, `StatTile` |
| Site layout | `src/app/layout.tsx`, `src/components/layout/*` | `RootLayout`, `SiteHeader`, `navLinksFor`, `MobileMenu`, `SiteFooter`, `DemoBanner`, `WorkspaceHeader` |
| English / Spanish | `src/lib/i18n/en.ts`, `es.ts`, `index.ts`, `server.ts`, `provider.tsx` | `Dictionary` type, `toLocale`, `getDictionary`, `useI18n`, `LanguageSwitch` |
| Accessibility settings | `src/lib/preferences/display.ts`, `actions.ts`, `components/layout/preferences-menu.tsx` | `encodeDisplay`, `decodeDisplay`, `displayAttributes`, `setDisplayPrefsAction`, `AccessibilityMenu` |
| Database schema | `supabase/migrations/20261125000001_schema.sql` | 19 tables, 9 enums, CHECK constraints, indexes |
| Database security | `supabase/migrations/20261125000002_security.sql` | `current_user_role`, `is_staff`, `is_doctor`, `is_owner`, `handle_new_user`, `guard_profile_role`, `set_user_role`, `log_audit`, RLS policies, column grants |
| Demo data + reset | `supabase/migrations/20261125000003_demo_data.sql`, `scripts/seed-demo-users.mjs` | `demo_user_id`, `ensure_pickup_slots`, `reset_demo_data` |
| Supabase clients | `src/lib/supabase/server.ts`, `browser.ts`, `admin.ts`, `env.ts` | `createSupabaseServerClient`, `getSupabaseBrowserClient`, `createSupabaseAdminClient` (server-only) |
| Session + roles | `src/lib/auth/session.ts`, `roles.ts`, `src/proxy.ts` | `getSessionUser`, `requireRole`, `canAccessPath`, `homePathForRole`, `safeNextPath`, `proxy` |
| Passkey sign-in (Touch ID) | `src/components/auth/passkey-sign-in.tsx`, `src/app/auth/continue/route.ts` | `PasskeySignIn` → `supabase.auth.signInWithPasskey()` |
| Passkey management | `src/components/auth/passkey-manager.tsx`, `src/app/account/security/page.tsx` | `PasskeyManager` → `registerPasskey`, `passkey.list`, `passkey.delete` |
| Password sign-in, registration, recovery | `src/lib/auth/actions.ts`, `src/components/auth/forms.tsx`, `src/app/(auth)/*`, `src/app/auth/callback/route.ts` | `signInWithPasswordAction`, `registerAction`, `recoverAction`, `signOutAction` |
| Input validation (auth) | `src/lib/validation/auth.ts` | `registerSchema`, `dateOfBirthSchema`, `phoneSchema`, `ageOn`, `toFieldErrors` |
| Role workspaces | `src/app/account`, `staff`, `doctor`, `owner` (each `layout.tsx` calls `requireRole`) | |
| Unit tests | `tests/unit/roles.test.ts`, `tests/unit/validation-auth.test.ts` | |

## Phase 3 — Shopping, orders, refills

| Feature | Files | Key functions / objects |
|---|---|---|
| Atomic checkout, cart rules, cancel, refills (database) | `supabase/migrations/20261126000006_ordering.sql` | `set_cart_quantity`, `place_order` (row locks, Rx gate, allergy, slot, idempotency, order number), `cancel_my_order`, `request_refill`, `next_order_number`, `rx_first_fill_ok`, `allergy_conflict` |
| Pricing (tax on OTC only, delivery fee, free threshold) | `src/lib/domain/pricing.ts` | `calculateOrderTotals`, `calculateTax`, `calculateDeliveryFee` |
| Stock display rules | `src/lib/domain/inventory.ts` | `getStockStatus`, `maxOrderableQuantity` |
| Budget limit (topic: "budget constraints") | `src/lib/domain/budget.ts`, `src/components/shop/budget-form.tsx` | `checkBudget`, `saveBudgetAction` |
| Refill eligibility | `src/lib/domain/refills.ts` | `getRefillEligibility`, `storeToday` |
| Order tracker rules | `src/lib/domain/orders.ts`, `src/components/orders/order-tracker.tsx` | `trackerSteps`, `trackerProgress`, `canCustomerCancel` |
| Catalog search / filter / sort | `src/lib/domain/catalog.ts`, `src/app/shop/page.tsx` | `parseCatalogQuery`, `matchesSearch`, `filterAndSortCatalog` |
| Pickup time picker | `src/lib/domain/slots.ts`, `src/components/shop/slot-picker.tsx` | `groupSlotsByDay`, `formatStoreDateTime` |
| Database error → friendly message | `src/lib/domain/db-errors.ts`, `src/lib/actions/result.ts` | `parseDbError`, `fillTemplate`, `dbErrorMessage` |
| Checkout / quantity validation | `src/lib/validation/ordering.ts` | `quantitySchema`, `checkoutSchema`, `refillSchema` |
| Data reads | `src/lib/data/catalog.ts`, `cart.ts`, `orders.ts` | `listProducts`, `getShopperContext`, `getCart`, `listMyOrders`, `getMyOrder`, `listOpenSlots`, `listMyPrescriptions` |
| Server actions | `src/lib/actions/cart.ts`, `orders.ts` | `addToCartAction`, `updateCartLineAction`, `removeCartLineAction`, `placeOrderAction`, `cancelOrderAction`, `requestRefillAction` |
| Pages | `src/app/shop`, `shop/[slug]`, `cart`, `checkout`, `account`, `account/orders`, `account/orders/[id]`, `account/prescriptions` | |
| Product art (no stock photos) | `src/components/shop/product-visual.tsx` | `ProductVisual` |
| English / Spanish shop text | `src/lib/i18n/en-shop.ts`, `es-shop.ts` | |
| Tests | `tests/unit/ordering-rules.test.ts`, `tests/e2e/ordering-rules.spec.ts`, `tests/e2e/shopping.spec.ts` | includes the two-buyers race test |

## Phase 4 — Health workflow, doctor approvals, staff tools

| Feature | Files | Key functions / objects |
|---|---|---|
| Database: consults, doctor decisions, staff actions, drug classes | `supabase/migrations/20261126000007_health_workflow.sql` | `submit_consult`, `reply_to_consult`, `doctor_open_consult`, `doctor_decide_consult` (only approval creates an Rx), `staff_set_order_status`, `staff_set_refill_status`, `staff_update_product`, `staff_add_product`, `staff_message_order`, `ingredient_classes`, class-aware `allergy_conflict` |
| Guided symptom check (demo rules, separate module) | `src/lib/domain/triage.ts` | `triageSymptoms`, `RED_FLAGS`, `THRESHOLDS` |
| Allergy + interaction checks (fictional demo tables) | `src/lib/domain/safety.ts` | `findAllergyConflict`, `findInteractions`, `INTERACTION_RULES` |
| Apple Watch sample import (honest demo) | `src/lib/domain/wearable.ts`, `src/components/health/watch-import.tsx`, `docs/future-healthkit.md` | `sampleWearableData`, `validateWearableImport`, `WatchImport` |
| Allowed next steps (mirrors the database) | `src/lib/domain/workflow.ts` | `nextOrderStatus`, `nextRefillStatus`, `doctorCanDecide`, `journeyProgress` |
| Health validation | `src/lib/validation/health.ts` | `symptomCheckSchema`, `consultSummarySchema`, `allergySchema` |
| Customer health screens | `src/app/account/health`, `health/check`, `account/consults`; `src/components/health/*` | `SymptomCheckWizard`, `TriageResultView`, `SeverityChart` (plain SVG), `HealthProfileEditor`, `ApprovalJourney`, `ConsultReplyForm` |
| Customer health actions | `src/lib/actions/health.ts` | `submitSymptomCheckAction` (server runs triage), `submitConsultAction`, `replyToConsultAction`, `addAllergyAction`, `addMedicationAction` |
| Doctor screens + actions | `src/app/doctor`, `doctor/consults/[id]`, `src/components/doctor/decision-form.tsx`, `src/lib/data/doctor.ts`, `src/lib/actions/doctor.ts` | `listConsultQueue`, `getConsultReview` (pre-checks allergies + interactions), `decideConsultAction`, `startReviewAction` |
| Staff screens + actions | `src/app/staff`, `staff/orders/[id]`, `staff/refills`, `staff/inventory`, `src/components/staff/*`, `src/lib/data/staff.ts`, `src/lib/actions/staff.ts` | `listOrdersForStaff` (filters + search), `getOrderForStaff` (safety check), `ActionForm`, `setOrderStatusAction`, `setRefillStatusAction`, `updateProductAction`, `addProductAction`, `sendOrderMessageAction` |
| English / Spanish health text | `src/lib/i18n/en-health.ts`, `es-health.ts` | (staff and doctor screens are English-only) |
| Tests | `tests/unit/health-rules.test.ts`, `tests/e2e/workflow.spec.ts` | full demo sequence + deny + needs-info + emergency + inventory + role protection |

## Phase 5 — Owner analytics, reports, presenter tools, help, about

| Feature | Files | Key functions / objects |
|---|---|---|
| Analytics math (store time zone, date ranges, CSV) | `src/lib/domain/analytics.ts` | `computeDashboard`, `validateRange`, `daysInRange`, `buildReport`, `toCsv` |
| Analytics data read (owner only) | `src/lib/data/analytics.ts` | `loadAnalyticsData` |
| Owner dashboard (simulated data, labelled) | `src/app/owner/page.tsx`, `src/components/owner/date-range-filter.tsx` | `parseRange`, `DateRangeFilter` |
| Charts (plain SVG, palette checked for contrast) | `src/components/charts/charts.tsx` | `ColumnChart`, `RankedBars`, `SplitBar`, `ValueFormat` |
| Reports + CSV export + print | `src/lib/reports.ts`, `src/app/owner/reports/page.tsx`, `owner/reports/export/route.ts`, `src/components/owner/print-button.tsx` | `parseReportOptions`, `runReport`, `PrintButton` |
| Audit log viewer | `src/app/owner/audit/page.tsx` | |
| User roles | `src/app/owner/users/page.tsx`, `src/lib/actions/owner.ts` | `setUserRoleAction` → database `set_user_role` |
| Store settings (tax, delivery fee, free threshold) | `src/app/owner/settings/page.tsx` | `saveStoreSettingsAction`, `SettingsForm` |
| Usability testing log (consent + code, no names) | `src/app/owner/usability/page.tsx` | `recordUsabilitySessionAction`, `UsabilitySessionForm` |
| Presenter guide + demo reset | `src/app/owner/demo/page.tsx` | `resetDemoAction`, `ResetDemoForm` |
| Owner navigation | `src/components/owner/owner-nav.tsx` | `OwnerNav` |
| Help assistant (runs in the browser, no AI service, no medical advice) | `src/lib/domain/help.ts`, `src/components/help/help-assistant.tsx`, `src/app/help/page.tsx` | `HELP`, `normalizeText`, `rankHelpEntries`, `answerQuestion`, `HelpAssistant` |
| About (heritage timeline) and Privacy pages | `src/app/about/page.tsx`, `src/app/privacy/page.tsx` | |
| English / Spanish info text | `src/lib/i18n/en-info.ts`, `es-info.ts` | (owner screens are English-only) |
| Phone layout fixes | `src/app/globals.css` (`.grid > * { min-width: 0 }`), `src/components/ui/button.tsx` (buttons can wrap) | |
| Tests | `tests/unit/analytics.test.ts`, `tests/unit/help.test.ts`, `tests/e2e/owner-and-info.spec.ts` | |

## Phase 6 — Final checks, accessibility, documentation

| Change | Files | Notes |
|---|---|---|
| Remaining checklist tests | `tests/e2e/checklist.spec.ts` | duplicate email, empty cart, status order, quotes / SQL-style text, keyboard only, 320 px |
| Accessibility fixes from the axe scan | `src/components/layout/logo.tsx`, `site-footer.tsx` (`DemoBanner` is now a labelled `aside`), `src/app/shop/page.tsx`, `src/components/auth/passkey-manager.tsx`, `src/components/charts/charts.tsx`, `src/app/account/orders/page.tsx` | link names match visible text, landmarks, heading order, chart bar roles |
| Large Text on phones | `src/app/globals.css` (`.logo-words`), `src/components/health/severity-chart.tsx` | header fits; hidden data table no longer widens the page |
| Documentation | `README.md`, `docs/user-guide.md`, `docs/presentation.md`, `docs/testing.md` | user guide, 7-minute plan + judge Q&A, checklist → test map |
