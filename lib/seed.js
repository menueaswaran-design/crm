import User from "@/models/User";
import Company from "@/models/Company";
import Client from "@/models/Client";
import Compliance from "@/models/Compliance";
import Task from "@/models/Task";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import Notification from "@/models/Notification";
import Activity from "@/models/Activity";
import Counter from "@/models/Counter";

let seeded = false;

/**
 * Seeds the demo database with realistic CA-office data.
 * Runs only once per in-memory database instance.
 */
export async function seedDatabase() {
  if (seeded) return;
  seeded = true;

  const existing = await User.countDocuments();
  if (existing > 0) return;

  const company = await Company.create({
    companyName: "ABC & Associates",
    isActive: true,
  });

  const admin = await User.create({
    firebaseUid: "demo-admin",
    name: "Rajesh Kumar",
    email: "admin@caoffice.com",
    phone: "+91 98765 43210",
    role: "admin",
    isActive: true,
    companyId: company._id,
  });

  const priya = await User.create({
    firebaseUid: "demo-priya",
    name: "Priya Sharma",
    email: "priya@caoffice.com",
    phone: "+91 98765 43211",
    role: "staff",
    isActive: true,
    companyId: company._id,
  });

  const amit = await User.create({
    firebaseUid: "demo-amit",
    name: "Amit Patel",
    email: "amit@caoffice.com",
    phone: "+91 98765 43213",
    role: "staff",
    isActive: true,
    companyId: company._id,
  });

  company.adminUserId = admin._id;
  await company.save();

  const clientsData = [
    {
      name: "Tech Solutions Pvt Ltd",
      category: "Pvt Ltd",
      pan: "AABCT1234F",
      aadhaar: "123456789012",
      gstin: "27AABCT1234F1Z2",
      cin: "U72900MH2020PTC123456",
      email: "accounts@techsolutions.com",
      phone: "+91 98111 11111",
      address: "14th Floor, Cyber Tower, Andheri East, Mumbai",
      assignedStaff: priya._id,
      createdBy: admin._id,
    },
    {
      name: "Amit Verma",
      category: "Individual",
      pan: "ABCDE1234F",
      aadhaar: "234567890123",
      gstin: "",
      email: "amit@company.com",
      phone: "+91 98765 43212",
      address: "B-402, Green Residency, Pune",
      assignedStaff: priya._id,
      createdBy: admin._id,
    },
    {
      name: "Meena Enterprises",
      category: "Proprietor",
      pan: "ABCMN5678G",
      aadhaar: "345678901234",
      gstin: "27ABCMN5678G1Z3",
      email: "meena@meenaenterprises.com",
      phone: "+91 98222 22222",
      address: "Shop 5, City Market, Nagpur",
      assignedStaff: amit._id,
      createdBy: admin._id,
    },
    {
      name: "Sharma & Associates LLP",
      category: "LLP",
      pan: "ABCSH9102H",
      gstin: "27ABCSH9102H1Z4",
      cin: "AAB-1234",
      email: "info@sharmaassociates.in",
      phone: "+91 98333 33333",
      address: "18/2, Residency Road, Bengaluru",
      assignedStaff: amit._id,
      createdBy: admin._id,
    },
    {
      name: "Krishna Traders",
      category: "Partnership",
      pan: "ABCKT3456I",
      gstin: "27ABCKT3456I1Z5",
      email: "krishnatraders@gmail.com",
      phone: "+91 98444 44444",
      address: "7, Sarafa Bazar, Indore",
      assignedStaff: priya._id,
      createdBy: admin._id,
    },
    {
      name: "Gupta Family Trust",
      category: "HUF",
      pan: "ABCGF7890J",
      email: "guptafamily@gmail.com",
      phone: "+91 98555 55555",
      address: "12, Civil Lines, Jaipur",
      assignedStaff: amit._id,
      createdBy: admin._id,
    },
  ];

  const clients = await Client.insertMany(
    clientsData.map((c) => ({ ...c, companyId: company._id }))
  );
  const [tech, amitVerma, meena, sharma, krishna, gupta] = clients;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOffset = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  };

  await Compliance.insertMany(
    [
      {
        clientId: tech._id,
      type: "GSTR-3B",
      category: "GST",
      period: "Jul 2026",
      financialYear: "FY 2026-27",
      dueDate: dayOffset(20),
      assignedStaff: priya._id,
      status: "PENDING",
      priority: "HIGH",
      description: "Monthly GST return filing for July 2026.",
      createdBy: admin._id,
    },
    {
      clientId: tech._id,
      type: "GSTR-1",
      category: "GST",
      period: "Jul 2026",
      financialYear: "FY 2026-27",
      dueDate: dayOffset(11),
      assignedStaff: priya._id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      description: "Outward supplies return.",
      createdBy: admin._id,
    },
    {
      clientId: amitVerma._id,
      type: "ITR",
      category: "Income Tax",
      period: "AY 2026-27",
      financialYear: "FY 2025-26",
      dueDate: dayOffset(45),
      assignedStaff: priya._id,
      status: "PENDING",
      priority: "MEDIUM",
      description: "Individual income tax return.",
      createdBy: admin._id,
    },
    {
      clientId: meena._id,
      type: "TDS Return",
      category: "TDS",
      period: "Q1 2026-27",
      financialYear: "FY 2026-27",
      dueDate: dayOffset(-5),
      assignedStaff: amit._id,
      status: "OVERDUE",
      priority: "HIGH",
      description: "Quarterly TDS return for Q1.",
      createdBy: admin._id,
    },
    {
      clientId: sharma._id,
      type: "ROC Filing",
      category: "ROC",
      period: "Annual",
      financialYear: "FY 2025-26",
      dueDate: dayOffset(70),
      assignedStaff: amit._id,
      status: "PENDING",
      priority: "LOW",
      description: "Annual ROC forms for LLP.",
      createdBy: admin._id,
    },
    {
      clientId: krishna._id,
      type: "GSTR-9",
      category: "GST",
      period: "FY 2025-26",
      financialYear: "FY 2025-26",
      dueDate: dayOffset(30),
      assignedStaff: priya._id,
      status: "COMPLETED",
      priority: "MEDIUM",
      completedAt: dayOffset(-3),
      completedBy: priya._id,
      description: "Annual GST return.",
      createdBy: admin._id,
    },
    {
      clientId: gupta._id,
      type: "Advance Tax",
      category: "Income Tax",
      period: "Q1 FY 2026-27",
      financialYear: "FY 2026-27",
      dueDate: dayOffset(2),
      assignedStaff: amit._id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      description: "First instalment of advance tax.",
      createdBy: admin._id,
    },
  ].map((r) => ({ ...r, companyId: company._id })));

  await Task.insertMany([
    {
      title: "Prepare GSTR-3B for Tech Solutions",
      description: "Complete and file GSTR-3B return for July 2026.",
      clientId: tech._id,
      assignedTo: priya._id,
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueDate: dayOffset(18),
      startedAt: dayOffset(-2),
      createdBy: admin._id,
    },
    {
      title: "Reconcile sales register with GSTR-2B",
      description: "Cross-check purchases register against GSTR-2B.",
      clientId: tech._id,
      assignedTo: priya._id,
      priority: "MEDIUM",
      status: "PENDING",
      dueDate: dayOffset(8),
      createdBy: admin._id,
    },
    {
      title: "Collect missing TDS certificates",
      description: "Follow up on Form 16A for Meena Enterprises.",
      clientId: meena._id,
      assignedTo: amit._id,
      priority: "HIGH",
      status: "PENDING",
      dueDate: dayOffset(-1),
      createdBy: admin._id,
    },
    {
      title: "Prepare books for Sharma & Associates",
      description: "Monthly bookkeeping until June 2026.",
      clientId: sharma._id,
      assignedTo: amit._id,
      priority: "LOW",
      status: "COMPLETED",
      dueDate: dayOffset(-6),
      completedAt: dayOffset(-4),
      createdBy: admin._id,
    },
    {
      title: "Draft audit report for Krishna Traders",
      description: "Prepare draft report for financial audit.",
      clientId: krishna._id,
      assignedTo: priya._id,
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      dueDate: dayOffset(12),
      startedAt: dayOffset(-5),
      createdBy: admin._id,
    },
    {
      title: "Update advance tax computation for Gupta Family",
      description: "Compute Q1 advance tax liability.",
      clientId: gupta._id,
      assignedTo: amit._id,
      priority: "HIGH",
      status: "PENDING",
      dueDate: dayOffset(2),
      createdBy: admin._id,
    },
  ].map((t) => ({ ...t, companyId: company._id })));

  const invoicesData = [
    {
      invoiceNumber: "INV-2026-001",
      clientId: tech._id,
      invoiceDate: dayOffset(-40),
      dueDate: dayOffset(-10),
      items: [
        { description: "GST compliance services - Q1", serviceType: "GST Filing", quantity: 3, amount: 5000 },
        { description: "Monthly bookkeeping", serviceType: "Bookkeeping", quantity: 3, amount: 2500 },
      ],
      gstRate: 18,
      notes: "Quarterly billing.",
      createdBy: admin._id,
    },
    {
      invoiceNumber: "INV-2026-002",
      clientId: meena._id,
      invoiceDate: dayOffset(-25),
      dueDate: dayOffset(5),
      items: [
        { description: "ITR filing FY 2025-26", serviceType: "ITR Filing", quantity: 1, amount: 8000 },
      ],
      gstRate: 18,
      notes: "",
      createdBy: admin._id,
    },
    {
      invoiceNumber: "INV-2026-003",
      clientId: sharma._id,
      invoiceDate: dayOffset(-15),
      dueDate: dayOffset(15),
      items: [
        { description: "Annual ROC compliance", serviceType: "ROC Compliance", quantity: 1, amount: 12000 },
      ],
      gstRate: 18,
      notes: "",
      createdBy: admin._id,
    },
    {
      invoiceNumber: "INV-2026-004",
      clientId: amitVerma._id,
      invoiceDate: dayOffset(-5),
      dueDate: dayOffset(25),
      items: [
        { description: "Tax consultation", serviceType: "Tax Consultation", quantity: 1, amount: 5000 },
      ],
      gstRate: 18,
      notes: "",
      createdBy: admin._id,
    },
  ];

  const invoices = await Invoice.insertMany(invoicesData.map((inv) => {
    const subtotal = inv.items.reduce((s, it) => s + it.quantity * it.amount, 0);
    const gstAmount = Math.round(subtotal * inv.gstRate) / 100;
    const totalAmount = subtotal + gstAmount;
    return { ...inv, companyId: company._id, subtotal, gstAmount, totalAmount, paidAmount: 0, outstandingAmount: totalAmount };
  }));

  // Pay INV-2026-001 fully, INV-2026-002 partially.
  await Payment.insertMany([
    {
      invoiceId: invoices[0]._id,
      clientId: tech._id,
      amount: invoices[0].totalAmount,
      paymentDate: dayOffset(-12),
      paymentMethod: "BANK",
      referenceNumber: "TRF-77821",
      notes: "Full payment received.",
      recordedBy: admin._id,
    },
    {
      invoiceId: invoices[1]._id,
      clientId: meena._id,
      amount: 4000,
      paymentDate: dayOffset(-3),
      paymentMethod: "UPI",
      referenceNumber: "UPI-99812",
      notes: "Partial payment.",
      recordedBy: admin._id,
    },
  ].map((p) => ({ ...p, companyId: company._id })));

  // Recalculate paid amounts / statuses.
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    const payments = i < 2
      ? await Payment.find({ invoiceId: inv._id })
      : [];
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = inv.totalAmount - paid;
    let status = "PENDING";
    if (paid >= inv.totalAmount) status = "PAID";
    else if (paid > 0) status = "PARTIAL";
    if (status !== "PAID" && inv.dueDate < new Date()) status = "OVERDUE";
    await Invoice.updateOne({ _id: inv._id }, { paidAmount: paid, outstandingAmount: outstanding, status });
  }

  // Sync invoice number counter so user-created invoices don't collide with seeded numbers.
  await Counter.findOneAndUpdate(
    { key: `invoice-${new Date().getFullYear()}` },
    { $set: { sequence: invoices.length } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await Notification.insertMany([
    {
      userId: priya._id,
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: "Prepare GSTR-3B for Tech Solutions has been assigned to you.",
      entityType: "Task",
      entityId: null,
      isRead: false,
    },
    {
      userId: priya._id,
      type: "COMPLIANCE_DUE",
      title: "Compliance due soon",
      message: "GSTR-3B for Tech Solutions Pvt Ltd is due in 20 days.",
      entityType: "Compliance",
      entityId: null,
      isRead: false,
    },
    {
      userId: amit._id,
      type: "TASK_OVERDUE",
      title: "Task overdue",
      message: "Collect missing TDS certificates is overdue.",
      entityType: "Task",
      entityId: null,
      isRead: false,
    },
    {
      userId: admin._id,
      type: "PAYMENT_DUE",
      title: "Payment due",
      message: "INV-2026-002 has an outstanding amount of ₹5,440.",
      entityType: "Invoice",
      entityId: null,
      isRead: false,
    },
  ]);

  await Activity.insertMany([
    { userId: priya._id, companyId: company._id, action: "TASK_COMPLETED", entityType: "Task", description: "Priya Sharma completed GSTR-1", createdAt: dayOffset(-1) },
    { userId: admin._id, companyId: company._id, action: "CLIENT_CREATED", entityType: "Client", description: "Rajesh Kumar added Meena Enterprises", createdAt: dayOffset(-4) },
    { userId: admin._id, companyId: company._id, action: "INVOICE_CREATED", entityType: "Invoice", description: "New invoice INV-2026-004 created", createdAt: dayOffset(-5) },
    { userId: amit._id, companyId: company._id, action: "DOCUMENT_UPLOADED", entityType: "Document", description: "Form 16 document uploaded", createdAt: dayOffset(-6) },
  ]);

  return { admin, priya, amit, clients };
}
