// Kept as a record of the investigation that found two real bugs in the ledger engine.
//
// 1. ledBal() reports a SIGNED balance: a debit balance is positive, a credit balance is negative.
//    Reversing a debit therefore drives an account negative rather than back to a positive zero.
//    trialRows() is what decides which column a negative balance belongs in.
// 2. ledFor() must exclude src==='reversal', or a document that has been reversed still looks like
//    it has open postings, and editing it would reverse the reversal and double the effect.
//
// Renamed from aaa-diagnostic.test.js so the test runner no longer picks it up.
