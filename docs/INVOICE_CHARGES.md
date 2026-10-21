# Invoice charges and expense recovery

Use **Add charge** in the invoice editor for delivery, handling, packaging, installation, service fees or another named charge. Enter the amount and optional percentage tax. Charges are non-stock document lines, so saved snapshots, previews and exports use the same values as posting. They can be edited or removed before saving an invoice update.

When saving an expense with a related invoice, choose whether to add it as a customer charge. The expense remains a cost in both cases. Billed charges are upserted using the expense ID, preventing duplication. Changes to the expense and the linked invoice commit atomically. Removing a billed expense also removes its charge, unless dependent payments/returns make the change unsafe; a refusal rolls back the whole operation.

Recovery targets posted sales invoices; drafts, void invoices, supplier invoices and distributor invoices cannot be modified through this recovery flow. Keep the expense as company cost for unsupported targets. Charge amounts must be finite and non-negative, and the optional tax percentage must be 0–100. Purchase-document charges are expensed rather than added to the stock cost pool. See APP_AUDIT_2026-10-21.md for remaining application-wide accounting and export issues.
