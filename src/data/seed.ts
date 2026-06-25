import type { Product, Subscription, RentRecord, Reminder, ActivityLog } from "@/types";
import { futureDate, pastDate } from "@/utils/date";
import { format } from "date-fns";

const today = format(new Date(), "yyyy-MM-dd");

export const seedProducts: Product[] = [
  {
    id: "p1", name: "MacBook Pro 16\"", category: "Laptops", vendor: "Apple", purchaseDate: pastDate(180),
    purchaseCost: 2499, warrantyExpiry: futureDate(185), serialNumber: "C02Z1234HKDT", assignedTo: "Sarah Chen",
    status: "active", notes: "Engineering team lead device", createdAt: pastDate(180),
  },
  {
    id: "p2", name: "Dell UltraSharp 27\" Monitor", category: "Monitors", vendor: "Dell", purchaseDate: pastDate(90),
    purchaseCost: 649, warrantyExpiry: futureDate(275), serialNumber: "CN-0J234X-74261", assignedTo: "Mike Johnson",
    status: "active", notes: "4K USB-C monitor", createdAt: pastDate(90),
  },
  {
    id: "p3", name: "Herman Miller Aeron Chair", category: "Furniture", vendor: "Herman Miller", purchaseDate: pastDate(365),
    purchaseCost: 1395, warrantyExpiry: futureDate(365 * 11), serialNumber: "AE123456789", assignedTo: "Reception",
    status: "active", notes: "Size B, graphite frame", createdAt: pastDate(365),
  },
  {
    id: "p4", name: "iPhone 15 Pro", category: "Phones", vendor: "Apple", purchaseDate: pastDate(45),
    purchaseCost: 999, warrantyExpiry: futureDate(320), serialNumber: "DNQXK234HG7", assignedTo: "David Park",
    status: "active", notes: "Company phone with MDM", createdAt: pastDate(45),
  },
  {
    id: "p5", name: "Logitech MX Master 3S", category: "Peripherals", vendor: "Logitech", purchaseDate: pastDate(14),
    purchaseCost: 99, warrantyExpiry: futureDate(351), serialNumber: "2218LZ0034", assignedTo: "Lisa Wong",
    status: "active", notes: "Wireless mouse", createdAt: pastDate(14),
  },
  {
    id: "p6", name: "ThinkPad X1 Carbon Gen 11", category: "Laptops", vendor: "Lenovo", purchaseDate: pastDate(60),
    purchaseCost: 1849, warrantyExpiry: futureDate(305), serialNumber: "PF-4K2N8R", assignedTo: "Alex Rivera",
    status: "active", notes: "Finance department", createdAt: pastDate(60),
  },
];

export const seedSubscriptions: Subscription[] = [
  {
    id: "s1", name: "Slack Business+", provider: "Slack", planType: "Business+", amount: 1250,
    billingCycle: "monthly", startDate: pastDate(365), renewalDate: futureDate(15),
    paymentMethod: "Corporate Visa", status: "active", reminderDaysBefore: 7,
    notes: "50 seats", createdAt: pastDate(365),
  },
  {
    id: "s2", name: "AWS Cloud Services", provider: "Amazon", planType: "Enterprise", amount: 4200,
    billingCycle: "monthly", startDate: pastDate(730), renewalDate: futureDate(3),
    paymentMethod: "ACH Transfer", status: "active", reminderDaysBefore: 14,
    notes: "Production infrastructure", createdAt: pastDate(730),
  },
  {
    id: "s3", name: "Figma Organization", provider: "Figma", planType: "Organization", amount: 540,
    billingCycle: "yearly", startDate: pastDate(300), renewalDate: futureDate(65),
    paymentMethod: "Corporate Amex", status: "active", reminderDaysBefore: 30,
    notes: "Design team - 12 editors", createdAt: pastDate(300),
  },
  {
    id: "s4", name: "GitHub Enterprise", provider: "GitHub", planType: "Enterprise", amount: 1890,
    billingCycle: "monthly", startDate: pastDate(500), renewalDate: futureDate(22),
    paymentMethod: "Corporate Visa", status: "active", reminderDaysBefore: 7,
    notes: "Unlimited repos, SAML SSO", createdAt: pastDate(500),
  },
  {
    id: "s5", name: "Notion Team Plan", provider: "Notion", planType: "Team", amount: 800,
    billingCycle: "monthly", startDate: pastDate(200), renewalDate: futureDate(8),
    paymentMethod: "Corporate Visa", status: "active", reminderDaysBefore: 5,
    notes: "Knowledge base", createdAt: pastDate(200),
  },
  {
    id: "s6", name: "Adobe Creative Cloud", provider: "Adobe", planType: "All Apps", amount: 4788,
    billingCycle: "yearly", startDate: pastDate(330), renewalDate: futureDate(35),
    paymentMethod: "Corporate Amex", status: "active", reminderDaysBefore: 30,
    notes: "6 licenses for design team", createdAt: pastDate(330),
  },
];

export const seedRentRecords: RentRecord[] = [
  {
    id: "r1", title: "Main Office Lease", propertyType: "Office Space", contactName: "Meridian Properties LLC",
    rentAmount: 8500, paymentFrequency: "monthly", dueDate: futureDate(5),
    contractStartDate: pastDate(365), contractEndDate: futureDate(365),
    status: "active", notes: "Floor 12, Suite 1200, downtown", createdAt: pastDate(365),
  },
  {
    id: "r2", title: "Warehouse Storage", propertyType: "Warehouse", contactName: "Metro Storage Solutions",
    rentAmount: 2200, paymentFrequency: "monthly", dueDate: pastDate(3),
    contractStartDate: pastDate(180), contractEndDate: futureDate(185),
    status: "overdue", notes: "Unit B, 2000 sqft", createdAt: pastDate(180),
  },
  {
    id: "r3", title: "Parking Lot Spaces", propertyType: "Parking", contactName: "City Parking Corp",
    rentAmount: 600, paymentFrequency: "monthly", dueDate: futureDate(12),
    contractStartDate: pastDate(90), contractEndDate: futureDate(275),
    status: "active", notes: "10 reserved spots", createdAt: pastDate(90),
  },
  {
    id: "r4", title: "Server Room Co-location", propertyType: "Data Center", contactName: "DataVault Inc",
    rentAmount: 3400, paymentFrequency: "monthly", dueDate: pastDate(1),
    contractStartDate: pastDate(400), contractEndDate: futureDate(325),
    status: "overdue", notes: "2 full racks, 10kW power", createdAt: pastDate(400),
  },
];

export const seedReminders: Reminder[] = [
  {
    id: "rm1", title: "AWS billing review", relatedType: "subscription", relatedId: "s2",
    reminderDate: futureDate(2), priority: "high", status: "pending",
    message: "Review AWS costs and optimize unused resources", pinned: false, sortOrder: 0, createdAt: pastDate(5),
  },
  {
    id: "rm2", title: "Office lease renewal discussion", relatedType: "rent", relatedId: "r1",
    reminderDate: futureDate(6), priority: "medium", status: "pending",
    message: "Schedule meeting with Meridian Properties about renewal terms", pinned: false, sortOrder: 1, createdAt: pastDate(10),
  },
  {
    id: "rm3", title: "Laptop inventory audit", relatedType: "product", relatedId: null,
    reminderDate: futureDate(1), priority: "medium", status: "pending",
    message: "Quarterly asset inventory check", pinned: false, sortOrder: 2, createdAt: pastDate(7),
  },
  {
    id: "rm4", title: "Warehouse payment overdue", relatedType: "rent", relatedId: "r2",
    reminderDate: pastDate(2), priority: "urgent", status: "overdue",
    message: "Contact Metro Storage about late payment", pinned: true, sortOrder: 3, createdAt: pastDate(5),
  },
  {
    id: "rm5", title: "Figma license review", relatedType: "subscription", relatedId: "s3",
    reminderDate: futureDate(4), priority: "low", status: "pending",
    message: "Check if we still need 12 editor seats", pinned: false, sortOrder: 4, createdAt: pastDate(3),
  },
];

export const seedActivityLog: ActivityLog[] = [
  { id: "a1", action: "created", recordType: "product", recordName: "Logitech MX Master 3S", timestamp: pastDate(0.5) },
  { id: "a2", action: "updated", recordType: "subscription", recordName: "Slack Business+", timestamp: pastDate(1) },
  { id: "a3", action: "created", recordType: "reminder", recordName: "AWS billing review", timestamp: pastDate(2) },
  { id: "a4", action: "updated", recordType: "rent", recordName: "Warehouse Storage", timestamp: pastDate(3) },
  { id: "a5", action: "created", recordType: "product", recordName: "iPhone 15 Pro", timestamp: pastDate(4) },
  { id: "a6", action: "created", recordType: "subscription", recordName: "Adobe Creative Cloud", timestamp: pastDate(5) },
  { id: "a7", action: "updated", recordType: "rent", recordName: "Main Office Lease", timestamp: pastDate(6) },
  { id: "a8", action: "created", recordType: "reminder", recordName: "Laptop inventory audit", timestamp: pastDate(7) },
];
