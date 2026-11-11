# Smart Times POS — Retail Calculation Engine
## Commercial Accounting Guide: Purchase, Pricing, GST & Profit/Loss

---

### Executive Summary
This document provides the standard commercial and tax calculation specifications implemented in the **Smart Times Watch Showroom POS**. It explains how inbound purchase costings, retail store pricing, discounts, schemes, reward points, and GST (Reverse Tax Extraction) interact to determine net customer bills and showroom profit margins.

---

### 1. Inbound Purchase & Unit Cost Calculation

When new stock arrives from suppliers, the system calculates the **True Unit Cost Price (CP)** using the vendor trade discount and special scheme percentage.

#### Purchase Variables
* **Vendor Printed MRP**: Base Maximum Retail Price printed on the watch tag.
* **Scheme %**: Trade promotion scheme granted by the brand/supplier (e.g., festive scheme, volume bonus).
* **Vendor Discount %**: Standard retailer wholesale trade discount.

#### Standard Calculation Order
$$\text{Price after Scheme} = \text{MRP} \times \left(1 - \frac{\text{Scheme \%}}{100}\right)$$
$$\text{Actual Unit Cost Price (CP)} = \text{Price after Scheme} \times \left(1 - \frac{\text{Discount \%}}{100}\right)$$

#### Benchmark Example
* **Vendor MRP**: ₹1,000.00
* **Scheme %**: 10%
  $$\text{Value after Scheme} = ₹1,000 - 10\% = \mathbf{₹900.00}$$
* **Trade Discount %**: 23%
  $$\text{Actual Purchase Cost Price (CP)} = ₹900 - 23\% = \mathbf{₹693.00}$$

> **Inventory Record:** The watch piece enters inventory with **Cost Price = ₹693.00** (Tax-inclusive vendor billing).

---

### 2. Point of Sale (POS) Billing Engine

At checkout, discounts and loyalty deductions are applied sequentially to arrive at the **Net Amount Payable by Customer**.

```
[1. Tag MRP / Subtotal: ₹1,000.00]
                │
                ▼
[2. Deduct Item-Level Discount (₹ or %)]
                │
                ▼
[3. Deduct Bill-Level Store Discount (Cash ₹ or %)]
                │
                ▼
[4. Deduct Customer Loyalty Points (1 Pt = ₹1.00)]
                │
                ▼
[5. Apply Cashier Round-off (+ / - ₹)]
                │
                ▼
[6. Net Final Customer Bill]
```

---

### 3. Scenario Comparison: Non-GST vs. GST Invoicing

#### Scenario A: Non-GST Invoice (Retail Cash Bill)
Used for retail customers who do not require a tax invoice for input tax credit.

* **Formula**:
  $$\text{Tax Collected} = \mathbf{₹0.00}$$
  $$\text{Showroom Real Profit} = \text{Net Customer Payment} - \text{Unit Cost Price}$$

| POS Adjustments Applied | Customer Pays | Unit Cost Price | Gross Profit | Margin % |
|---|---|---|---|---|
| **Sold at Tag MRP** | ₹1,000.00 | ₹693.00 | **+₹307.00** | **30.7%** |
| **Sold with 10% Store Discount** | ₹900.00 | ₹693.00 | **+₹207.00** | **23.0%** |
| **With 5% Disc + 20 Pts + ₹10 Round-off** | ₹920.00 | ₹693.00 | **+₹227.00** | **24.6%** |

---

#### Scenario B: GST Tax Invoice (Statutory Inclusive GST)
In Indian retail, printed MRP is **Inclusive of all Taxes**. The customer does not pay extra GST on top of the retail bill. Instead, the POS backward-extracts the **Taxable Value** and **CGST / SGST** from the final net payment.

#### Reverse Tax Extraction Formulas:
$$\text{Taxable Base Value} = \frac{\text{Net Customer Payment}}{1 + \left(\frac{\text{GST Rate}}{100}\right)}$$
$$\text{Total GST} = \text{Net Customer Payment} - \text{Taxable Base Value}$$
$$\text{CGST} = \frac{\text{Total GST}}{2}, \quad \text{SGST} = \frac{\text{Total GST}}{2}$$

---

### 4. Real-World Case Study (All 5 Adjustments Applied)

#### Parameters:
* **Watch MRP**: ₹1,000.00 (Purchase Cost = ₹693.00)
* **POS Discount**: 5% Bill Discount ($-₹50.00$)
* **Reward Points**: 20 Points redeemed ($-₹20.00$)
* **Manual Round-off**: Cashier discount of $-₹30.00$ to settle to round figure
* **Final Customer Net Payment**: **₹900.00**

#### Breakdown:

#### 1. Under NON-GST Sale:
* **Customer Pays**: ₹900.00
* **Tax**: ₹0.00
* **Purchase Cost**: ₹693.00
* **Showroom Real Profit**: $₹900.00 - ₹693.00 = \mathbf{+₹207.00}$

#### 2. Under GST Tax Invoice (18% GST):
* **Customer Pays**: **₹900.00**
* **Taxable Base**:
  $$\text{Taxable Base} = \frac{900.00}{1.18} = \mathbf{₹762.71}$$
* **Total GST (18%)**:
  $$900.00 - 762.71 = \mathbf{₹137.29}$$
  * **CGST (9%)**: ₹68.65
  * **SGST (9%)**: ₹68.65
* **Customer Receipt Printout**:
  * Item Base (HSN 9102): ₹762.71
  * CGST @ 9%: ₹68.65
  * SGST @ 9%: ₹68.65
  * **Total Bill Payable**: **₹900.00**
* **Real Shop Cash Profit**:
  $$₹900.00 - ₹693.00 = \mathbf{+₹207.00}$$
* **Government Tax Settlement (Books of Account)**:
  * Output GST collected: ₹137.29
  * Input GST Credit from supplier bill ($\text{₹693} - \frac{693}{1.18}$): ₹105.71
  * **Net GST Payable to Government**: $137.29 - 105.71 = \mathbf{₹31.58}$
  * **Net Retained Profit After Tax**: $207.00 - 31.58 = \mathbf{₹175.42}$

---

### 5. Summary Reference Table

| Billing Type | Net Amount Received | Purchase Cost (CP) | Output GST | Input Tax Credit (ITC) | Shop Real Profit | Net Profit After Tax |
|---|---|---|---|---|---|---|
| **Non-GST @ Tag MRP** | ₹1,000.00 | ₹693.00 | ₹0.00 | ₹0.00 | **₹307.00** | **₹307.00** |
| **Non-GST with Discounts (₹900)** | ₹900.00 | ₹693.00 | ₹0.00 | ₹0.00 | **₹207.00** | **₹207.00** |
| **GST @ Tag MRP (18%)** | ₹1,000.00 | ₹693.00 | ₹152.54 | ₹105.71 | **₹307.00** | **₹260.17** |
| **GST with Discounts (₹900, 18%)** | ₹900.00 | ₹693.00 | ₹137.29 | ₹105.71 | **₹207.00** | **₹175.42** |
| **Non-GST Watch billed with GST** | ₹900.00 | ₹693.00 | ₹137.29 | ₹0.00 | **₹207.00** | **₹69.71** |

---

### 6. Accounting Principles Confirmed
1. **No Double-Tax Deductions**: The system recognizes whether the purchase price already includes GST, ensuring that showroom profits are not falsely understated in reports.
2. **Strict Tax-Inclusive Invoicing**: Retail customers are billed transparently on MRP; back-calculated tax cleanly populates on GSTR-1 and tax audit reports.
3. **Multi-Tier Discount Support**: Item discounts, bill discounts (% or cash), reward points, and round-offs are computed sequentially without rounding discrepancies.

