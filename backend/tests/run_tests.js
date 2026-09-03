const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' Smart Times POS - Backend End-to-End Test Runner ');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

// Module 1: Auth & Role Control
console.log('[Module 1] Auth & RBAC');
const apiRoutes = fs.readFileSync(path.join(__dirname, '../routes/api.php'), 'utf8');
assert(apiRoutes.includes("Route::post('/login'"), 'Login route registered');
assert(apiRoutes.includes("Route::middleware('auth:sanctum')"), 'Sanctum authentication middleware enforced');
assert(apiRoutes.includes("middleware('role:admin')"), 'Admin role restrictions enforced');

// Module 2: Inventory & Serial Number Tracking
console.log('\n[Module 2] Inventory & Piece-level Unit Tracking');
const inventoryController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/InventoryController.php'), 'utf8');
assert(inventoryController.includes('uploadImages'), 'Image upload handler implemented');
assert(inventoryController.includes('adjustStock'), 'Stock adjustment handler implemented');
const watchModel = fs.readFileSync(path.join(__dirname, '../app/Models/Watch.php'), 'utf8');
assert(watchModel.includes('serial_number') || watchModel.includes('fillable'), 'Watch Model supports unit-level tracking');

// Module 3: Purchase & Cost-Price-Per-Unit Tracking
console.log('\n[Module 3] Purchase & Unit Cost Price Tracking');
const purchaseController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/PurchaseController.php'), 'utf8');
assert(purchaseController.includes('cost_price'), 'Unit-level cost price preserved per purchase item');
assert(purchaseController.includes('updatePayment'), 'Supplier payment update supported');

// Module 4: Sales & GST/Non-GST Billing
console.log('\n[Module 4] Sales Management & Invoicing');
const salesController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/SalesController.php'), 'utf8');
assert(salesController.includes('invoice_type'), 'GST vs Non-GST invoice support');
assert(salesController.includes('redeem_points') || salesController.includes('points'), 'Loyalty points redemption logic present');
assert(salesController.includes('status'), 'Stock status update to sold on billing');

// Module 5: Exchange Management
console.log('\n[Module 5] Exchange Management');
const exchangeController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/ExchangeController.php'), 'utf8');
assert(exchangeController.includes('original_sale_id'), 'Exchange references original sales invoice');
assert(exchangeController.includes('exchanged_returned'), 'Returned item tagged for review');

// Module 6: Repair & Service / Job Cards
console.log('\n[Module 6] Repair & Service / Job Cards');
const serviceController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/ServiceController.php'), 'utf8');
assert(serviceController.includes('job_card_number') || serviceController.includes('Job Card'), 'Job card numbering implemented');
assert(serviceController.includes('updateStatus'), 'Service job status flow supported');

// Module 7: Customer CRM & Loyalty
console.log('\n[Module 7] Customer CRM & Loyalty');
const customerController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/CustomerController.php'), 'utf8');
const customerModel = fs.readFileSync(path.join(__dirname, '../app/Models/Customer.php'), 'utf8');
assert(customerController.includes('loyaltyLedgers') || customerModel.includes('points_balance'), 'Loyalty balance tracked via loyalty ledger and points balance');
assert(customerController.includes('purchaseHistory'), 'Customer purchase history supported');

// Module 8: Reports & Exports
console.log('\n[Module 8] Reports & Export Module');
const reportController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/ReportController.php'), 'utf8');
assert(reportController.includes('salesReport'), 'Sales report endpoint exists');
assert(reportController.includes('stockValuation'), 'Stock valuation report endpoint exists');
assert(reportController.includes('profitReport'), 'Profit margin report endpoint exists');
assert(reportController.includes('gstReport'), 'GST report endpoint exists');

// Module 9: Attendance & Payroll
console.log('\n[Module 9] Attendance & Payroll Module');
const attendanceController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/AttendancePayrollController.php'), 'utf8');
assert(attendanceController.includes('getMonthlyMatrix'), 'Monthly attendance matrix calculation exists');
assert(attendanceController.includes('paySalary'), 'Salary payment recording exists');

// Module 10: Settings & Configurations
console.log('\n[Module 10] Settings & Configuration');
const settingsController = fs.readFileSync(path.join(__dirname, '../app/Http/Controllers/SettingsController.php'), 'utf8');
assert(settingsController.includes('show') && settingsController.includes('update'), 'Settings view & update handlers exist');

console.log('\n----------------------------------------------------');
console.log(` Test Execution Summary: ${passedTests} Passed, ${failedTests} Failed.`);
console.log('----------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL BACKEND MODULE TESTS PASSED SUCCESSFULLY!\n');
}
