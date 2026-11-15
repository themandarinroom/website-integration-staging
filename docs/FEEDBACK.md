# Feedback and comments v0.1

[Staging About page](https://themandarinroom.github.io/website-integration-staging/#/about) · [Staging moderation](https://themandarinroom.github.io/website-integration-staging/feedback-admin.html)

The integration site is released through the existing GitHub Pages staging workflow. The feedback backend is in the Vocabulary Library workspace and attaches to the existing `the-mandarin-room-staging` Firebase project in `australia-southeast1`.

## Data and access

| Firestore collection | Data | Access |
| --- | --- | --- |
| `feedbackSubmissions/{id}` | Name, private email, optional rating, comment, pending/approved/rejected status, server-created and reviewed timestamps, reviewer UID | Staging functions only. Moderation verifies the existing Firebase ID token, verified email and active `authorizedTeachers/{uid}` record. |
| `publicFeedback/{id}` | Name, optional rating, comment and submission timestamp | Staging functions only. The anonymous list exposes this projection plus the feedback ID. |
| `feedbackRateLimits/{id}` | Window counters and expiry timestamps for per-source counters | Staging functions only. |

Staging Firestore Rules explicitly deny direct client reads and writes in all three collections. The callable server validates requests, and moderation updates the public and private records in one Firestore transaction. Public feedback is paginated newest first by submission timestamp, with document ID as a tie-breaker. The 80-character name, 254-character email and 2,000-character comment limits also apply on the server. The callables reject raw bodies over 16 KiB before performing Firestore work. The optional name renders as Anonymous / 匿名用户 when blank.

The submit endpoint uses a hidden spam trap, a per-source limit of 10 accepted submissions per 10-minute window and a shared limit of 120 per window. It reuses the existing staging server secret for window-scoped HMACs of source addresses. A retry of the same payload with the same request ID returns the original acceptance. The site holds a retry ID in memory while the form is open. The quota may affect school users sharing an egress address, and the fixed window can allow bursts across its boundary. Expired per-source rate documents have an expiry field for cleanup. Automatic cleanup is unconfigured.

## Moderation

1. Open **Admin**, sign in with the existing authorised staging Google account and choose **Comments / 留言管理**.
2. Review **Pending**, including any supplied private email and the submitted rating. Check the public text for personal information, spam and inappropriate content. Legitimate critical feedback is eligible for approval at every rating.
3. **Approve** to publish. **Reject** keeps feedback private and retracts an approved entry. **Delete** asks for confirmation and then removes both records. Use **Refresh** if another administrator has already changed the status or a response was interrupted.
4. Reload About to verify what visitors see. The public section displays individual approved ratings. Private Contact Admin delivery is unavailable.

## Manual acceptance checklist

- [ ] On Chrome, Safari and a school iPad in portrait and landscape, open About. Verify the mint panel, white form, original mailbox and Chinese text. At narrow widths verify no horizontal overflow. Tap all five stars and clear them. On desktop confirm keyboard tab, arrow-key selection and the clear action.
- [ ] In a signed-out browser, submit rating-only, comment-only and combined examples. Verify that empty and invalid-email submissions fail, optional fields can be blank, and confirmation appears after server acceptance.
- [ ] While submitting, try a second click. Interrupt a request and retry in the same form. Check that a failed request preserves the input and a retried request appears once in Pending.
- [ ] As Admin, verify private email and pending records. Approve a one-star example and check the public page signed out. Verify Chinese, long text, anonymous display, dates and literal rendering of markup. Confirm public responses contain no email and pagination works.
- [ ] Reject a pending entry, retract an approved entry, and permanently delete a disposable staging example after confirmation. Check both the Admin category and public view after each change.
- [ ] Sign out and verify the direct Comments Management link denies access. Exercise the existing Admin links, Speaking Practice, Vocabulary Library, Word Randomiser, Learning Journey and Unit Library through their normal staging entry points.

## Production deployment and rollback

Production requires explicit approval. Before deployment, review a production-only release that explicitly targets the selected production site, Firebase project, authorised origin and verified Admin allowlist. Provision a dedicated server-side rate-limit secret and confirm existing billing, access, privacy review and retention. Compare with the active production rules and retain their previous release ID. Add only the feedback deny rules to the canonical Vocabulary Library production ruleset. Deploy only the three feedback functions, verify their boundaries and then publish the matching production website release. Use synthetic acceptance entries and remove them after testing.

To roll back, redeploy the last known-good static site and disable or remove the three feedback functions so clients can no longer submit or moderate on the old URLs. Preserve private records and deny rules while deciding retention. Roll back rules only after verifying the prior release also denies access to feedback documents. The staging Pages release can be reverted through the normal Pages workflow independently of Firebase.
