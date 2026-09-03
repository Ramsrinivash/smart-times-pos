import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PrintableInvoice from '../components/PrintableInvoice';
import { DEFAULT_BILL_TEMPLATE, getBillTemplate, saveBillTemplate } from '../components/PrintableInvoice';
import { Save, RefreshCw, Printer, Eye } from 'lucide-react';
import { alertService } from '../utils/alert';

// ── Dummy invoice for live preview ──────────────────────────────────────────
const DEMO_INVOICE = {
  id: '0042',
  invoice_date: new Date().toISOString().split('T')[0],
  invoice_type: 'gst',
  payment_mode: 'upi',
  is_credit_sale: false,
  subtotal: 6990,
  discount_amount: 500,
  gst_amount: 986.95,
  points_redeemed: 20,
  points_value: 20,
  net_amount: 6470,
  customer: { id: 7, name: 'Ram Srinivash', phone: '+919876543210', address: 'Dharmapuri, Tamil Nadu' },
  user: { name: 'Owner Admin' },
  items: [
    {
      watch_id: 'TITAN-001',
      price_sold: 3495,
      discount_amount: 0,
      gst_rate: 18,
      gst_amount: 533.14,
      watch: { brand: 'TITAN', model: 'NU915TYM02', hsn_code: '9102' },
    },
    {
      watch_id: 'FASTRACK-002',
      price_sold: 3495,
      discount_amount: 500,
      gst_rate: 18,
      gst_amount: 453.81,
      watch: { brand: 'FASTRACK', model: 'FT38016PP01', hsn_code: '9102' },
    },
  ],
};

const PAPER_OPTIONS = [
  { value: 'A4',        label: 'A4 — Standard (210mm × 297mm)' },
  { value: 'A5',        label: 'A5 — Half Sheet (148mm × 210mm)' },
  { value: 'thermal80', label: 'Thermal 80mm (Receipt Printer)' },
  { value: 'thermal58', label: 'Thermal 58mm (Compact Printer)' },
];

const FONT_OPTIONS = [
  { value: 'small',  label: 'Small (compact)' },
  { value: 'medium', label: 'Medium (standard)' },
  { value: 'large',  label: 'Large (easy to read)' },
];

const MARGIN_OPTIONS = [
  { value: 'compact', label: 'Compact — minimal whitespace' },
  { value: 'normal',  label: 'Normal — balanced' },
  { value: 'wide',    label: 'Wide — spacious' },
];

// ─────────────────────────────────────────────────────────────────────────────
const BillTemplate = ({ embedded = false }) => {
  const { user } = useAuth();
  const [template, setTemplate] = useState(getBillTemplate());
  const [storeSettings, setStoreSettings] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(s => setStoreSettings(s)).catch(() => {});
  }, []);

  const update = (key, value) => {
    setTemplate(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveBillTemplate(template);
    setSaved(true);
    alertService.success('Template Saved', 'Your bill template settings have been saved successfully.');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setTemplate({ ...DEFAULT_BILL_TEMPLATE });
    saveBillTemplate({ ...DEFAULT_BILL_TEMPLATE });
    alertService.info('Reset', 'Bill template reset to factory defaults.');
  };

  const handlePrintPreview = () => {
    window.print();
  };

  // Label/toggle row helper
  const Row = ({ label, desc, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ flex: 1, paddingRight: '1rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );

  const Toggle = ({ checked, onChange }) => (
    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
      <div style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: checked ? 'var(--primary-gold)' : 'var(--border-color)',
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}
        onClick={() => onChange(!checked)}
      >
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
          position: 'absolute', top: '3px',
          left: checked ? '23px' : '3px', transition: 'left 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }} />
      </div>
      <span style={{ fontSize: '0.8rem', color: checked ? 'var(--primary-gold)' : 'var(--text-secondary)' }}>
        {checked ? 'ON' : 'OFF'}
      </span>
    </label>
  );

  const innerContent = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h3 style={{ margin: 0 }}>Bill Template & Layout Designer</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
            Configure paper sizes, font sizes, margins, and section visibility for invoice printing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setShowPreview(p => !p)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Eye size={15} /> {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button type="button" onClick={handleReset} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={15} /> Reset Defaults
          </button>
          <button type="button" onClick={handleSave} className={`btn btn-primary btn-sm ${saved ? 'btn-success' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Save size={15} /> {saved ? '✓ Saved!' : 'Save Template'}
          </button>
        </div>
      </div>

        <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '420px 1fr' : '1fr', gap: '1.5rem', alignItems: 'flex-start' }}>

          {/* ── LEFT PANEL: Controls ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Paper & Layout */}
            <div className="card">
              <h3 style={{ marginBottom: '0.25rem' }}>📄 Paper & Layout</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Choose the paper size that matches your printer.
              </p>

              <Row label="Paper Size" desc="Select your printer/paper format">
                <select className="form-control" value={template.paperSize} onChange={e => update('paperSize', e.target.value)} style={{ width: '220px', fontSize: '0.82rem' }}>
                  {PAPER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Row>

              <Row label="Font Size" desc="Affects all text on the invoice">
                <select className="form-control" value={template.fontSize} onChange={e => update('fontSize', e.target.value)} style={{ width: '160px', fontSize: '0.82rem' }}>
                  {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Row>

              <Row label="Cell Spacing (Margins)" desc="Whitespace inside table cells">
                <select className="form-control" value={template.margins} onChange={e => update('margins', e.target.value)} style={{ width: '200px', fontSize: '0.82rem' }}>
                  {MARGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Row>

              <Row label="Header Alignment" desc="Layout of store name vs invoice number">
                <select className="form-control" value={template.headerStyle} onChange={e => update('headerStyle', e.target.value)} style={{ width: '160px', fontSize: '0.82rem' }}>
                  <option value="split">Split (Left + Right)</option>
                  <option value="centered">Centered</option>
                </select>
              </Row>
            </div>

            {/* Branding */}
            <div className="card">
              <h3 style={{ marginBottom: '0.25rem' }}>🎨 Branding</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Customize invoice title and brand color.
              </p>

              <Row label="Invoice Title" desc="Shown at top-right of the bill">
                <input
                  type="text"
                  className="form-control"
                  value={template.invoiceTitle}
                  onChange={e => update('invoiceTitle', e.target.value)}
                  style={{ width: '180px', fontSize: '0.82rem' }}
                  placeholder="TAX INVOICE"
                />
              </Row>

              <Row label="Accent / Brand Color" desc="Color for store name and totals">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={template.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                    style={{ width: '44px', height: '34px', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    value={template.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                    style={{ width: '90px', fontSize: '0.82rem', fontFamily: 'monospace' }}
                  />
                </div>
              </Row>

              <Row label="Show Border Lines" desc="Table borders and header dividers">
                <Toggle checked={template.showBorderLines} onChange={v => update('showBorderLines', v)} />
              </Row>
            </div>

            {/* Sections visibility */}
            <div className="card">
              <h3 style={{ marginBottom: '0.25rem' }}>👁 Show / Hide Sections</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Toggle which blocks appear on the printed invoice.
              </p>

              <Row label="Watch Serial Number" desc="Show Watch ID / Serial in items table">
                <Toggle checked={template.showWatchSerial} onChange={v => update('showWatchSerial', v)} />
              </Row>
              <Row label="HSN Code" desc="Show HSN code next to item description">
                <Toggle checked={template.showHsnCode} onChange={v => update('showHsnCode', v)} />
              </Row>
              <Row label="GST Breakdown Table" desc="Show CGST / SGST split by HSN">
                <Toggle checked={template.showGstBreakdown} onChange={v => update('showGstBreakdown', v)} />
              </Row>
              <Row label="Loyalty Points" desc="Show redeemed reward points info">
                <Toggle checked={template.showLoyaltyPoints} onChange={v => update('showLoyaltyPoints', v)} />
              </Row>
              <Row label="Customer Address" desc="Show customer address in Billed To">
                <Toggle checked={template.showCustomerAddress} onChange={v => update('showCustomerAddress', v)} />
              </Row>
              <Row label="Salesperson Name" desc="Show salesperson in header and footer">
                <Toggle checked={template.showSalesperson} onChange={v => update('showSalesperson', v)} />
              </Row>
              <Row label="Signature Area" desc="Show signature lines at the bottom">
                <Toggle checked={template.showSignature} onChange={v => update('showSignature', v)} />
              </Row>
            </div>

            {/* Footer text */}
            <div className="card">
              <h3 style={{ marginBottom: '0.25rem' }}>📝 Footer / Terms Text</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Appears at the bottom of every bill. You can add exchange policy, warranty terms, etc.
                </p>
                <Toggle checked={template.showFooterText} onChange={v => update('showFooterText', v)} />
              </div>
              {template.showFooterText && (
                <textarea
                  className="form-control"
                  value={template.footerText}
                  onChange={e => update('footerText', e.target.value)}
                  rows={3}
                  style={{ fontSize: '0.82rem', resize: 'vertical', marginTop: '0.5rem' }}
                  placeholder="Enter your exchange policy, warranty terms, or thank-you message..."
                />
              )}
            </div>

            {/* Save button bottom */}
            <button onClick={handleSave} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Save size={18} /> {saved ? '✓ Saved Successfully!' : 'Save Bill Template'}
            </button>
          </div>

          {/* ── RIGHT PANEL: Live Preview ── */}
          {showPreview && (
            <div className="no-print">
              <div style={{ position: 'sticky', top: '80px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Live Preview</h3>
                  <button onClick={handlePrintPreview} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                    <Printer size={14} /> Print Preview
                  </button>
                </div>

                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-card)',
                  overflow: 'auto',
                  maxHeight: 'calc(100vh - 180px)',
                  padding: '1rem',
                }}>
                  {/* Scale the preview to fit within the panel */}
                  <div style={{ transformOrigin: 'top left', transform: 'scale(0.75)', width: '133.33%' }}>
                    <div style={{ background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: '4px' }}>
                      <PrintableInvoice
                        invoice={DEMO_INVOICE}
                        storeSettings={storeSettings}
                        currentUser={user}
                        onClose={() => {}}
                        onPrint={handlePrintPreview}
                        _templateOverride={template} // pass live template for real-time preview
                      />
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                  Preview is at 75% scale. Actual print will be full size on {template.paperSize} paper.
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Bill template settings..." />
      <div className="page-container">
        {innerContent}
      </div>
    </div>
  );
};

export default BillTemplate;
