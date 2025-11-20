
export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum BillStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum BillCategory {
  PETROL = 'Petrol',
  FOOD = 'Food',
  TRAVEL = 'Travel',
  MAINTENANCE = 'Maintenance',
  OFFICE = 'Office',
  OTHER = 'Other',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In real app, hashed. Here plain for demo.
}

export interface Team {
  id: string;
  name: string;
  joinPassword: string;
  adminId: string;
  memberIds: string[];
}

export interface Branch {
  id: string;
  teamId: string;
  name: string;
  holderName: string;
  accountNumber: string;
  ifsc: string;
  upiId?: string; // Added for UPI payments
  managerName?: string;
}

export interface Bill {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  title: string;
  amount: number;
  category: BillCategory;
  description: string;
  imageUrl?: string;
  branchId: string;
  status: BillStatus;
  createdAt: number;
  rejectionReason?: string;
  paidAt?: number;
  transactionId?: string;
  paymentScreenshotUrl?: string;
  paymentMethod?: 'UPI' | 'BANK';
}

export interface Notification {
  id: string;
  userId: string; // The recipient
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  isRead: boolean;
  createdAt: number;
  relatedBillId?: string;
}

// Context Types
export interface AuthState {
  user: User | null;
  currentTeam: Team | null;
  role: UserRole | null;
}