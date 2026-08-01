import React from 'react';
import { Share2, Printer, X } from 'lucide-react';

// ─── Default template settings ─────────────────────────────────────────────
export const DEFAULT_BILL_TEMPLATE = {
  paperSize: 'A4',           // A4 | A5 | thermal80 | thermal58
  fontSize: 'medium',        // small | medium | large
  headerStyle: 'split',      // split (logo left, invoice right) | centered
  accentColor: '#d4af37',    // header store-name color
  invoiceTitle: 'TAX INVOICE',
  showGstBreakdown: true,
  showSignature: true,
  showCustomerAddress: true,
  showLoyaltyPoints: true,
  showSalesperson: true,
  showWatchSerial: true,
  showHsnCode: true,
  tableCompact: false,       // tighter row padding
  footerText: 'Thank you for shopping with us! Exchange allowed within 7 days with original bill.',
  showFooterText: true,
  showBorderLines: true,
  margins: 'normal',         // compact | normal | wide
};

export function getBillTemplate() {
  try {
    const saved = localStorage.getItem('billTemplate');
    if (saved) return { ...DEFAULT_BILL_TEMPLATE, ...JSON.parse(saved) };
  } catch (e) {}
  return { ...DEFAULT_BILL_TEMPLATE };
}

export function saveBillTemplate(t) {
  localStorage.setItem('billTemplate', JSON.stringify(t));
}

// ─── Paper dimensions map ───────────────────────────────────────────────────
const PAPER = {
  A4:        { width: '210mm', minHeight: '297mm', padding: '14mm 14mm 12mm 14mm' },
  A5:        { width: '148mm', minHeight: '210mm', padding: '10mm 10mm 8mm 10mm' },
  thermal80: { width: '80mm',  minHeight: 'auto',  padding: '4mm 4mm 4mm 4mm' },
  thermal58: { width: '58mm',  minHeight: 'auto',  padding: '3mm 3mm 3mm 3mm' },
};

const FONT_SIZE = {
  small:  { base: '10px', sm: '8px', lg: '13px', xl: '18px' },
  medium: { base: '12px', sm: '10px', lg: '15px', xl: '22px' },
  large:  { base: '14px', sm: '11px', lg: '17px', xl: '26px' },
};

const MARGIN_PAD = {
  compact: '0.35rem',
  normal:  '0.6rem',
  wide:    '0.9rem',
};

// ─── Main component ─────────────────────────────────────────────────────────
const PrintableInvoice = ({
  invoice,
  storeSettings,
  currentUser,
  onClose,
  onPrint,
  _templateOverride, // used by BillTemplate page for live preview
}) => {
  const t = _templateOverride || getBillTemplate();
  const paper = PAPER[t.paperSize] || PAPER.A4;
  const fs = FONT_SIZE[t.fontSize] || FONT_SIZE.medium;
  const cellPad = MARGIN_PAD[t.margins] || MARGIN_PAD.normal;
  const isThermal = t.paperSize.startsWith('thermal');

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const itemDiscountTotal = invoice.items?.reduce((acc, si) => acc + Number(si.discount_amount || 0), 0) || 0;
  const billDiscount = Number(invoice.bill_discount_amount || 0);
  const pointsVal = Number(invoice.points_value || 0);
  const roundOffVal = Number(invoice.round_off_amount || 0);

  // GST breakdown grouped by HSN + rate
  const hsnGroups = {};
  invoice.items?.forEach(si => {
    const hsn = si.watch?.hsn_code || '9102';
    const rate = Number(si.gst_rate || 18);
    const key = `${hsn}__${rate}`;
    if (!hsnGroups[key]) hsnGroups[key] = { hsn, rate, gstAmt: 0 };
    hsnGroups[key].gstAmt += Number(si.gst_amount || 0);
  });

  const borderStyle = t.showBorderLines ? '1.5px solid #2d2d2d' : '1.5px solid transparent';
  const dividerStyle = t.showBorderLines ? '1px solid #ddd' : '1px solid transparent';

  return (
    <>
      {/* ── Global print styles injected once ───────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: ${t.paperSize === 'A5' ? 'A5' : t.paperSize.startsWith('thermal') ? '${paper.width} auto' : 'A4'};
            margin: 0;
          }
          body * { visibility: hidden !important; }
          .smarttimes-printable-invoice,
          .smarttimes-printable-invoice * { visibility: visible !important; }
          .smarttimes-printable-invoice {
            position: fixed !important;
            inset: 0 !important;
            width: ${paper.width} !important;
            max-width: ${paper.width} !important;
            margin: 0 auto !important;
            padding: ${paper.padding} !important;
            box-sizing: border-box !important;
            font-size: ${fs.base} !important;
            background: #fff !important;
            color: #000 !important;
            overflow: visible !important;
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
          }
          .no-print { display: none !important; }
          .smarttimes-printable-invoice table {
            width: 100% !important;
            table-layout: fixed !important;
            word-break: break-word !important;
          }
          .smarttimes-printable-invoice td,
          .smarttimes-printable-invoice th {
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* ── Invoice wrapper ──────────────────────────────────────────────── */}
      <div
        className="smarttimes-printable-invoice"
        style={{
          background: '#ffffff',
          color: '#111',
          fontSize: fs.base,
          width: paper.width,
          maxWidth: paper.width,
          boxSizing: 'border-box',
          padding: paper.padding,
          fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
          lineHeight: 1.45,
        }}
      >

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{
          borderBottom: borderStyle,
          paddingBottom: '8px',
          marginBottom: '10px',
          display: 'flex',
          justifyContent: t.headerStyle === 'centered' ? 'center' : 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          {/* Store info */}
          <div style={{ flex: '1 1 55%', minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: fs.xl, color: t.accentColor, lineHeight: 1.1, wordBreak: 'break-word' }}>
              {storeSettings?.store_name || 'SMART TIMES'}
            </div>
            {storeSettings?.tagline && (
              <div style={{ fontSize: fs.sm, color: '#555', marginTop: '1px' }}>{storeSettings.tagline}</div>
            )}
            <div style={{ fontSize: fs.sm, color: '#444', marginTop: '2px', wordBreak: 'break-word' }}>
              {storeSettings?.address || '108, Pennagaram Main Road, (Next to R.C. Church), DHARMAPURI - 636 701.'}
            </div>
            <div style={{ fontSize: fs.sm, color: '#111', fontWeight: 700, marginTop: '2px' }}>
              Call: {storeSettings?.phone || '97512 85945, 86672 88021'}
            </div>
            {invoice.invoice_type === 'gst' && storeSettings?.gstin && (
              <div style={{ fontSize: fs.sm, fontWeight: 700, marginTop: '2px' }}>GSTIN: {storeSettings.gstin}</div>
            )}
          </div>

          {/* Invoice info (right side) */}
          <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
            <div style={{ fontWeight: 800, fontSize: fs.lg, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t.invoiceTitle}
            </div>
            <div style={{ fontWeight: 700, marginTop: '3px', fontSize: fs.base }}>
              Invoice No: <span style={{ fontFamily: 'monospace' }}>{invoice.id}</span>
            </div>
            <div style={{ fontSize: fs.sm, color: '#444' }}>Date: {invoice.invoice_date}</div>
            {invoice.invoice_type === 'gst' && (
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '1px 6px',
                  background: '#d1fae5',
                  color: '#065f46',
                  borderRadius: '3px',
                  fontSize: fs.sm,
                  fontWeight: 700,
                  border: '1px solid #a7f3d0',
                }}>
                  GST Invoice
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── CUSTOMER + PAYMENT ──────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isThermal ? '1fr' : '1fr 1fr',
          gap: '10px',
          marginBottom: '10px',
          fontSize: fs.sm,
        }}>
          <div style={{ borderRight: isThermal ? 'none' : dividerStyle, paddingRight: isThermal ? 0 : '10px' }}>
            <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#555', marginBottom: '3px', fontSize: fs.sm }}>
              Billed To:
            </div>
            <div style={{ fontWeight: 700, fontSize: fs.base }}>
              {invoice.customer_name || invoice.customer?.name || (invoice.customer_id === 1 ? 'Walk-in Customer' : 'Customer')}
            </div>
            <div>Phone: {invoice.customer_phone || invoice.customer?.phone || '-'}</div>
            {t.showCustomerAddress && (invoice.customer_address || invoice.customer?.address) && (
              <div style={{ wordBreak: 'break-word' }}>{invoice.customer_address || invoice.customer?.address}</div>
            )}
          </div>
          <div style={{ textAlign: isThermal ? 'left' : 'right' }}>
            <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#555', marginBottom: '3px', fontSize: fs.sm }}>
              Payment Info:
            </div>
            <div>Mode: <strong style={{ textTransform: 'uppercase' }}>{invoice.payment_mode}</strong></div>
            {t.showSalesperson && (
              <div>Salesperson: {invoice.user?.name || currentUser?.name || 'Staff'}</div>
            )}
            {invoice.is_credit_sale && (
              <div style={{ color: '#dc2626', fontWeight: 700 }}>⚠ Credit / Book Debt</div>
            )}
          </div>
        </div>

        {/* ── ITEMS TABLE ─────────────────────────────────────────────────── */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '10px',
          tableLayout: 'fixed',
          fontSize: fs.sm,
        }}>
          <colgroup>
            {t.showWatchSerial && <col style={{ width: isThermal ? '28%' : '18%' }} />}
            <col />
            <col style={{ width: isThermal ? '22%' : '14%' }} />
            <col style={{ width: isThermal ? '18%' : '13%' }} />
            {invoice.invoice_type === 'gst' && !isThermal && <col style={{ width: '9%' }} />}
            <col style={{ width: isThermal ? '22%' : '14%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: borderStyle, background: '#f9f9f9' }}>
              {t.showWatchSerial && (
                <th style={{ padding: cellPad, textAlign: 'left', fontWeight: 700, wordBreak: 'break-all', fontSize: fs.sm }}>
                  {isThermal ? 'ID' : 'Watch ID / Serial'}
                </th>
              )}
              <th style={{ padding: cellPad, textAlign: 'left', fontWeight: 700, fontSize: fs.sm }}>
                {isThermal ? 'Item' : 'Model Description'}
              </th>
              <th style={{ padding: cellPad, textAlign: 'right', fontWeight: 700, fontSize: fs.sm }}>Price (₹)</th>
              <th style={{ padding: cellPad, textAlign: 'right', fontWeight: 700, fontSize: fs.sm }}>Disc (₹)</th>
              {invoice.invoice_type === 'gst' && !isThermal && (
                <th style={{ padding: cellPad, textAlign: 'right', fontWeight: 700, fontSize: fs.sm }}>GST%</th>
              )}
              <th style={{ padding: cellPad, textAlign: 'right', fontWeight: 700, fontSize: fs.sm }}>Amt (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, idx) => (
              <tr key={item.watch_id || idx} style={{ borderBottom: dividerStyle }}>
                {t.showWatchSerial && (
                  <td style={{ padding: cellPad, fontFamily: 'monospace', fontSize: fs.sm, wordBreak: 'break-all' }}>
                    {item.watch_id}
                  </td>
                )}
                <td style={{ padding: cellPad, wordBreak: 'break-word', fontSize: fs.sm }}>
                  {item.watch?.brand} {item.watch?.model}
                  {t.showHsnCode && item.watch?.hsn_code && (
                    <span style={{ color: '#888', fontSize: fs.sm }}> (HSN: {item.watch.hsn_code})</span>
                  )}
                </td>
                <td style={{ padding: cellPad, textAlign: 'right', fontSize: fs.sm }}>
                  {Number(item.price_sold).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: cellPad, textAlign: 'right', fontSize: fs.sm }}>
                  {Number(item.discount_amount || 0).toLocaleString('en-IN')}
                </td>
                {invoice.invoice_type === 'gst' && !isThermal && (
                  <td style={{ padding: cellPad, textAlign: 'right', fontSize: fs.sm }}>{item.gst_rate}%</td>
                )}
                <td style={{ padding: cellPad, textAlign: 'right', fontWeight: 600, fontSize: fs.sm }}>
                  {Number(item.price_sold - (item.discount_amount || 0)).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── TOTALS + GST BREAKDOWN ───────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isThermal ? '1fr' : (invoice.invoice_type === 'gst' && t.showGstBreakdown ? '1fr 1fr' : '1fr'),
          gap: '12px',
          marginBottom: '10px',
          fontSize: fs.sm,
        }}>
          {/* Left: GST HSN Breakdown */}
          {invoice.invoice_type === 'gst' && t.showGstBreakdown && !isThermal && (
            <div>
              <div style={{ background: '#f8f8f8', padding: '8px', borderRadius: '4px', border: '1px solid #eee' }}>
                <div style={{ fontWeight: 700, marginBottom: '5px', fontSize: fs.sm }}>GST HSN Breakdown</div>
                {Object.values(hsnGroups).map(entry => (
                  <div key={`${entry.hsn}-${entry.rate}`} style={{ marginBottom: '5px', paddingBottom: '4px', borderBottom: '1px dashed #ddd' }}>
                    <div style={{ fontWeight: 600, fontSize: fs.sm }}>HSN: {entry.hsn} | GST: {entry.rate}%</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '6px', fontSize: fs.sm }}>
                      <span>CGST ({entry.rate / 2}%)</span>
                      <span>{fmt(entry.gstAmt / 2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '6px', fontSize: fs.sm, marginTop: '1px' }}>
                      <span>SGST ({entry.rate / 2}%)</span>
                      <span>{fmt(entry.gstAmt / 2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {t.showLoyaltyPoints && invoice.points_redeemed > 0 && (
                <div style={{ marginTop: '5px', fontSize: fs.sm, color: '#555' }}>
                  Redeemed: <strong>{invoice.points_redeemed}</strong> loyalty pts (₹{invoice.points_value})
                </div>
              )}
            </div>
          )}

          {/* Right: Amount summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs.sm }}>
              <span style={{ color: '#555' }}>Gross Subtotal</span>
              <span style={{ fontWeight: 600 }}>{fmt(invoice.subtotal)}</span>
            </div>
            {itemDiscountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs.sm }}>
                <span style={{ color: '#555' }}>Item Discount</span>
                <span style={{ color: '#dc2626' }}>-{fmt(itemDiscountTotal)}</span>
              </div>
            )}
            {billDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs.sm }}>
                <span style={{ color: '#555' }}>Bill Discount</span>
                <span style={{ color: '#dc2626' }}>-{fmt(billDiscount)}</span>
              </div>
            )}
            {t.showLoyaltyPoints && pointsVal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs.sm }}>
                <span style={{ color: '#555' }}>Points ({invoice.points_redeemed} pts)</span>
                <span style={{ color: '#dc2626' }}>-{fmt(pointsVal)}</span>
              </div>
            )}
            {roundOffVal !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs.sm }}>
                <span style={{ color: '#555' }}>Manual Round Off Adjustment</span>
                <span style={{ color: roundOffVal < 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                  {roundOffVal < 0 ? `-${fmt(Math.abs(roundOffVal))}` : `+${fmt(roundOffVal)}`}
                </span>
              </div>
            )}
            {invoice.invoice_type === 'gst' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs.sm }}>
                <span style={{ color: '#555' }}>GST Included</span>
                <span>{fmt(invoice.gst_amount)}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              borderTop: borderStyle, paddingTop: '5px', marginTop: '3px',
              fontWeight: 800,
              fontSize: fs.lg,
              color: t.accentColor,
            }}>
              <span>Grand Net Total</span>
              <span>{fmt(invoice.net_amount)}</span>
            </div>
            {isThermal && invoice.invoice_type === 'gst' && t.showGstBreakdown && (
              <div style={{ marginTop: '5px' }}>
                {Object.values(hsnGroups).map(entry => (
                  <div key={`${entry.hsn}-${entry.rate}`} style={{ fontSize: fs.sm }}>
                    HSN {entry.hsn}: CGST {fmt(entry.gstAmt / 2)} + SGST {fmt(entry.gstAmt / 2)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER TEXT ──────────────────────────────────────────────────── */}
        {t.showFooterText && t.footerText && (
          <div style={{
            borderTop: dividerStyle,
            paddingTop: '6px',
            marginTop: '6px',
            fontSize: fs.sm,
            color: '#555',
            textAlign: 'center',
            fontStyle: 'italic',
            wordBreak: 'break-word',
          }}>
            {t.footerText}
          </div>
        )}

        {/* ── SIGNATURE ────────────────────────────────────────────────────── */}
        {t.showSignature && !isThermal && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '28px',
            fontSize: fs.sm,
          }}>
            <div>
              {t.showSalesperson && (
                <div style={{ marginBottom: '2px' }}>Salesperson: <strong>{invoice.user?.name || currentUser?.name}</strong></div>
              )}
              <div style={{ borderTop: '1px dashed #333', width: '130px', paddingTop: '3px', marginTop: '22px', textAlign: 'center' }}>
                Salesperson Signature
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '2px' }}>For <strong>{storeSettings?.store_name || 'SMART TIMES'}</strong></div>
              <div style={{ borderTop: '1px dashed #333', width: '130px', marginLeft: 'auto', paddingTop: '3px', marginTop: '22px', textAlign: 'center' }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        )}

        {/* ── ACTION BUTTONS (no-print) ────────────────────────────────────── */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #ccc',
          paddingTop: '14px',
          marginTop: '18px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {invoice.customer?.phone && (
              <a
                href={`https://wa.me/${invoice.customer.phone}?text=${encodeURIComponent(
                  `Dear ${invoice.customer.name}, thank you for shopping at ${storeSettings?.store_name || 'Smart Times'}. Your invoice ${invoice.id} amounting ₹${invoice.net_amount} is ready.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}
              >
                <Share2 size={15} /> WhatsApp
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={onPrint || (() => window.print())}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}
            >
              <Printer size={15} /> Print Receipt
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              <X size={15} style={{ marginRight: '4px' }} /> Close
            </button>
          </div>
        </div>

      </div>
    </>
  );
};

export default PrintableInvoice;
