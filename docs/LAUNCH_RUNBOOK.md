# Trove global launch runbook

This is the final operational checklist for opening Trove to worldwide paid traffic.

## 1. Run the automated gate

From the repository:

```bash
npm run check:launch -- https://troveai.site
```

Exit code `0` means the public smoke checks passed and `/api/health` reports
`launchReadiness.readyForGlobalPaidLaunch: true`.

Exit code `1` means a public route, security header, or health check is broken.
Exit code `2` means the app is operational but required production configuration is still missing.

## 2. Transactional email

Production password signup is intentionally blocked unless real email delivery works.

Configure either Resend or SMTP, then verify:

- the sending domain is verified
- SPF is valid
- DKIM is valid
- DMARC is published
- verification emails arrive
- password-reset emails arrive
- failed/bounced mail is visible to the operator

Test signup, verification, forgot password, reset password, and old-session invalidation.

## 3. Payments

Choose the payment processor actually used for launch and configure both monthly
and yearly Pro billing.

For Stripe, set the live secret/webhook keys and:

- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_PRO_YEARLY`

For Lemon Squeezy, set the live store/webhook values and:

- `LEMONSQUEEZY_VARIANT_PRO`
- `LEMONSQUEEZY_VARIANT_PRO_YEARLY`

Do not enable Team checkout until organization membership, invitations, roles,
and shared-workspace permissions are complete. Keep:

```
TROVE_TEAM_WORKSPACES_ENABLED=0
```

until that product is actually ready.

Before launch, test a real or provider-approved live-like flow for purchase,
renewal, cancellation, failed payment, refund, duplicate webhook delivery, and
customer portal access.

## 4. Separate user-publishing domain

User-generated websites can contain arbitrary HTML and JavaScript. They should
not share the authenticated app's registrable browser domain.

Configure `NEXT_PUBLIC_PUBLISH_ROOT_DOMAIN` to a separate domain, for example:

```
trove.page
```

Then point the apex/wildcard DNS required by the publishing system at the Trove
deployment and verify a published project loads there.

Do not use `*.troveai.site` for the final worldwide launch if the authenticated
app remains on `troveai.site`.

## 5. Database durability and recovery

Production must use Turso/libSQL rather than an ephemeral local SQLite file.

Before launch:

- confirm the production database is durable
- create an encrypted operator snapshot with `npm run backup:db` (this is a
  secondary export, not a replacement for the database provider's native backup)
- enable the provider's backup / point-in-time recovery capability
- record who has permission to restore it
- take a pre-launch backup
- restore a backup into a separate non-production database
- verify users, conversations, projects, credit balances, subscriptions, and
  published-site ownership are present after restore
- write down the measured recovery time

Repeat a restore test on a regular schedule. A backup that has never been
restored is not a proven recovery plan.

## 6. AI and sandbox capacity

Use paid production quotas for the providers that serve real traffic.

Verify:

- primary AI provider has billing enabled
- fallback providers are valid
- provider spend alerts are enabled
- E2B production key and capacity are configured
- image generation has a production-capable provider
- expected peak traffic fits provider RPM/TPM limits

Do not plan a worldwide launch around free-tier model quotas.

## 7. Operations and alerts

Set `TROVE_ALERT_WEBHOOK_URL` to a channel that a real person watches.

Trove's production synthetic check runs every 15 minutes. Also configure an
independent external uptime monitor if available, because monitoring from a
second provider catches failures that GitHub or Vercel alone may miss.

Test an alert before launch.

## 8. OAuth and integrations

For Google, Microsoft, Nango, GitHub, Slack, and any other enabled provider:

- production redirect/callback URLs must use the production domain
- secrets must be production secrets, never test credentials
- least-privilege scopes should be used
- disconnect/reconnect should work
- revoked provider access should fail safely

## 9. Abuse and referral operations

Expensive AI endpoints are protected by user-level and network-level rate
limits. Referrals only count toward cash eligibility after the configured active
qualification period.

Before issuing cash rewards, have an operator review the account for duplicate
accounts, self-referrals, refunds, chargebacks, and obvious automation.

## 10. Legal and support

The repository contains Privacy, Terms, Security, account export, and account
deletion flows. Before a broad commercial launch, have qualified counsel review
the final policies for the jurisdictions in which Trove operates.

Make sure `contact@troveai.site` is actively monitored for:

- support
- privacy/data requests
- security reports
- abuse/takedown reports
- billing disputes

## 11. Final release procedure

1. Freeze non-essential UI work.
2. Run CI and require every build/type/audit check to pass.
3. Confirm Vercel production deploy is green.
4. Open `/api/health` and clear every launch-readiness item.
5. Run `npm run check:launch -- https://troveai.site`.
6. Test signup, login, reset password, one AI prompt, one website build/publish,
   one Pro checkout, billing portal, account export, and account deletion.
7. Take a database backup.
8. Open traffic gradually and watch AI cost, error rate, latency, signup rate,
   payment failures, and abuse.
