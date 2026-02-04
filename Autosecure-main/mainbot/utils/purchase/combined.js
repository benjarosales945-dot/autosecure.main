// Proxy to the full invoice implementation so other modules can import from "combined.js"
const full = require('./everythingcombined');

module.exports = {
  fetchLtcPrice: full.fetchLtcPrice,
  initializeInvoices: full.initializeInvoices,
  addInvoice: full.addInvoice,
  Invoice: full.Invoice,
  INVOICE_STATUS: full.INVOICE_STATUS
};
