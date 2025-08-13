const mongoose = require('mongoose');

// Bank Account Schema
const bankAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  accountHolderName: { type: String, required: true },
  bankName: { type: String, required: true },
  country: { type: String, required: true },
  currency: { type: String, required: true, default: 'USD' },
  accountNumber: { type: String, required: true }, // Encrypted
  routingNumber: { type: String }, // For US accounts
  swiftCode: { type: String }, // For international accounts
  iban: { type: String }, // For European accounts
  bsb: { type: String }, // For Australian accounts
  ifsc: { type: String }, // For Indian accounts
  transitNumber: { type: String }, // For Canadian accounts
  bankAddress: { type: String },
  accountType: { type: String, enum: ['checking', 'savings', 'business'], default: 'checking' },
  isPrimary: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'failed', 'requires_info'], default: 'pending' },
  verificationDetails: {
    microDeposits: {
      amount1: { type: Number },
      amount2: { type: Number },
      attempts: { type: Number, default: 0 },
      verifiedAt: { type: Date }
    },
    plaidAccountId: { type: String },
    stripeAccountId: { type: String }
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'bank_accounts'
});

// Tax Information Schema
const taxInformationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  country: { type: String, required: true },
  taxpayerType: { type: String, enum: ['individual', 'business', 'nonprofit', 'partnership', 'trust'], required: true },
  
  // Personal Information
  personalInfo: {
    firstName: { type: String },
    lastName: { type: String },
    dateOfBirth: { type: Date }
  },
  
  // Business Information
  businessInfo: {
    legalName: { type: String },
    businessType: { type: String, enum: ['sole-proprietorship', 'corporation', 'llc', 'partnership', 'cooperative', 'other'] },
    ein: { type: String } // Encrypted
  },
  
  // Tax IDs by country
  taxIds: {
    ssn: { type: String }, // US - Encrypted
    ein: { type: String }, // US Business - Encrypted
    sin: { type: String }, // Canada - Encrypted
    nino: { type: String }, // UK - Encrypted
    tin: { type: String }, // Generic Tax ID - Encrypted
    vatNumber: { type: String }, // EU VAT - Encrypted
    abn: { type: String }, // Australia - Encrypted
    pan: { type: String }, // India - Encrypted
    customId: { type: String } // Other countries - Encrypted
  },
  
  // Address Information
  address: {
    street1: { type: String, required: true },
    street2: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  
  // Tax Exemption
  exemption: {
    isTaxExempt: { type: Boolean, default: false },
    exemptionReason: { type: String, enum: ['nonprofit', 'government', 'educational', 'religious', 'charitable', 'other'] },
    exemptionCertificate: { type: String }
  },
  
  // Additional Information
  additionalNotes: { type: String },
  
  // Compliance
  isCertified: { type: Boolean, default: false },
  certificationDate: { type: Date },
  isComplete: { type: Boolean, default: false },
  
  // Form Status
  formStatus: { type: String, enum: ['draft', 'submitted', 'approved', 'requires_review'], default: 'draft' }
}, {
  timestamps: true,
  collection: 'tax_information'
});

// Payout Schema
const payoutSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  bankAccountId: { type: String, required: true },
  
  // Payout Details
  amount: { type: Number, required: true }, // Net payout amount
  grossAmount: { type: Number, required: true }, // Total before fees
  currency: { type: String, required: true, default: 'USD' },
  
  // Fee Breakdown
  fees: {
    platformFee: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
    stripeFee: { type: Number, default: 0 },
    instantPayoutFee: { type: Number, default: 0 },
    otherFees: { type: Number, default: 0 }
  },
  
  // Payout Type
  payoutType: { type: String, enum: ['standard', 'instant', 'scheduled'], default: 'standard' },
  
  // Status and Dates
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  scheduledFor: { type: Date },
  processedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  
  // External References
  stripePayoutId: { type: String },
  paypalPayoutBatchId: { type: String },
  bankTransactionId: { type: String },
  
  // Associated Orders/Events
  orders: [{ type: String }], // Order IDs
  events: [{ type: String }], // Event IDs
  dateRange: {
    from: { type: Date },
    to: { type: Date }
  },
  
  // Error Information
  errorDetails: {
    code: { type: String },
    message: { type: String },
    retryCount: { type: Number, default: 0 }
  },
  
  // Metadata
  metadata: { type: mongoose.Schema.Types.Mixed },
  
  // Statement descriptor for bank records
  statementDescriptor: { type: String }
}, {
  timestamps: true,
  collection: 'payouts'
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  orderId: { type: String, index: true },
  eventId: { type: String, index: true },
  payoutId: { type: String, index: true },
  
  // Transaction Details
  type: { type: String, enum: ['sale', 'refund', 'chargeback', 'fee', 'payout', 'adjustment'], required: true },
  subtype: { type: String }, // platform_fee, processing_fee, ticket_sale, etc.
  
  // Amounts
  amount: { type: Number, required: true },
  netAmount: { type: Number, required: true }, // Amount after fees
  currency: { type: String, required: true, default: 'USD' },
  
  // Fee Breakdown
  fees: {
    platformFee: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
    stripeFee: { type: Number, default: 0 },
    applePay: { type: Number, default: 0 },
    googlePay: { type: Number, default: 0 }
  },
  
  // Status
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'], default: 'pending' },
  
  // External References
  stripeChargeId: { type: String },
  stripeRefundId: { type: String },
  paypalTransactionId: { type: String },
  
  // Description and Details
  description: { type: String, required: true },
  customerEmail: { type: String },
  eventTitle: { type: String },
  ticketType: { type: String },
  quantity: { type: Number, default: 1 },
  
  // Dates
  transactionDate: { type: Date, default: Date.now },
  settledDate: { type: Date },
  
  // Metadata
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'transactions'
});

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  invoiceNumber: { type: String, required: true, unique: true },
  
  // Invoice Details
  type: { type: String, enum: ['payout_fees', 'monthly_subscription', 'platform_fees', 'custom'], required: true },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  
  // Amounts
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' },
  
  // Line Items
  lineItems: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed }
  }],
  
  // Dates
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  paidDate: { type: Date },
  
  // Period (for recurring invoices)
  period: {
    from: { type: Date },
    to: { type: Date }
  },
  
  // Payment Information
  paymentMethod: { type: String },
  paymentDate: { type: Date },
  paymentReference: { type: String },
  
  // File Storage
  pdfUrl: { type: String },
  
  // External References
  stripeInvoiceId: { type: String },
  
  // Metadata
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'invoices'
});

// Financial Settings Schema
const financialSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  
  // Payout Settings
  payoutSettings: {
    schedule: { type: String, enum: ['daily', 'weekly', 'monthly', 'manual'], default: 'weekly' },
    dayOfWeek: { type: Number, min: 0, max: 6, default: 1 }, // 0 = Sunday, 1 = Monday
    dayOfMonth: { type: Number, min: 1, max: 31, default: 1 },
    minimumAmount: { type: Number, default: 1.00 },
    currency: { type: String, default: 'USD' },
    instantPayoutsEnabled: { type: Boolean, default: false },
    autoPayoutEnabled: { type: Boolean, default: true }
  },
  
  // Fee Structure
  feeStructure: {
    platformFeePercentage: { type: Number, default: 0.025 }, // 2.5%
    processingFeePercentage: { type: Number, default: 0.029 }, // 2.9%
    processingFeeFixed: { type: Number, default: 0.30 }, // $0.30
    instantPayoutFee: { type: Number, default: 0.25 } // $0.25
  },
  
  // Tax Settings
  taxSettings: {
    collectTax: { type: Boolean, default: false },
    taxRate: { type: Number, default: 0 },
    taxIncluded: { type: Boolean, default: false },
    taxCollectionEnabled: { type: Boolean, default: false }
  },
  
  // Notification Preferences
  notifications: {
    payoutCompleted: { type: Boolean, default: true },
    payoutFailed: { type: Boolean, default: true },
    lowBalance: { type: Boolean, default: true },
    monthlyStatements: { type: Boolean, default: true },
    taxDocuments: { type: Boolean, default: true }
  },
  
  // Currency and Locale
  defaultCurrency: { type: String, default: 'USD' },
  locale: { type: String, default: 'en-US' },
  timezone: { type: String, default: 'America/New_York' }
}, {
  timestamps: true,
  collection: 'financial_settings'
});

// Indexes for performance
bankAccountSchema.index({ userId: 1, isPrimary: 1 });
taxInformationSchema.index({ userId: 1, country: 1 });
payoutSchema.index({ userId: 1, status: 1 });
payoutSchema.index({ userId: 1, requestedAt: -1 });
transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ eventId: 1 });
invoiceSchema.index({ userId: 1, issueDate: -1 });
financialSettingsSchema.index({ userId: 1 });

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
const TaxInformation = mongoose.model('TaxInformation', taxInformationSchema);
const Payout = mongoose.model('Payout', payoutSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const FinancialSettings = mongoose.model('FinancialSettings', financialSettingsSchema);

module.exports = {
  BankAccount,
  TaxInformation,
  Payout,
  Transaction,
  Invoice,
  FinancialSettings
};