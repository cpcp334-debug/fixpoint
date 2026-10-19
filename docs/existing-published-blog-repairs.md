# Existing published blog repairs

The owner requires existing URLs, aliases, English text and original publication dates to be preserved while duplicate Arabic text is repaired. Some already-public Arabic pages have Latin route segments.

New publication keeps `evaluateBlogPublicationGates` unchanged, including its Arabic-slug rule. The separate `evaluateExistingBlogRepairGates` retains an already-public legacy address only when a trusted repair caller supplies matching DB-backup identity/status/date and a fresh 200 public GET with the same URL and canonical. Changed URLs, redirects, other origins, missing dates, stale evidence, drafts and nonindexable records fail.

Only the new-editorial-URL requirement can be treated as a documented legacy preservation case. Every body, language, word-count, FAQ, image, claim and filler failure remains a failure. The raw publication failures and whether legacy preservation applied are retained in the repair receipt. Duplicate-body, metadata, similarity and manual editorial checks remain separate requirements.

This pure function checks consistency of supplied evidence; it is not authentication, authorization, independent verification of a record, or permission to publish. The caller must read and compare the actual record, preserve backups, recheck the URL, require live assets, and use the guarded transaction. It does not enable AI publication settings, create new pages, alter redirects or migrate slugs.

The local sample-only test suite exercises 25 acceptance/rejection cases. The first guarded use is the two-record Arabic electrical batch 6. The English translation is retained byte-for-byte by the database invariant check; this does not claim that existing English copy was rewritten or fully audited.
