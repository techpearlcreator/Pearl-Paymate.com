
import { User, Team, Branch, Bill, BillStatus, BillCategory, Notification } from '../types';

const STORAGE_KEYS = {
  USERS: 'tf_users',
  TEAMS: 'tf_teams',
  BRANCHES: 'tf_branches',
  BILLS: 'tf_bills',
  NOTIFICATIONS: 'tf_notifications'
};

// Helper to simulate delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- INIT DATA ---
const initializeData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) localStorage.setItem(STORAGE_KEYS.USERS, '[]');
  if (!localStorage.getItem(STORAGE_KEYS.TEAMS)) localStorage.setItem(STORAGE_KEYS.TEAMS, '[]');
  if (!localStorage.getItem(STORAGE_KEYS.BRANCHES)) localStorage.setItem(STORAGE_KEYS.BRANCHES, '[]');
  if (!localStorage.getItem(STORAGE_KEYS.BILLS)) localStorage.setItem(STORAGE_KEYS.BILLS, '[]');
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, '[]');
};

initializeData();

// --- GENERIC GETTERS/SETTERS ---
const getList = <T>(key: string): T[] => JSON.parse(localStorage.getItem(key) || '[]');
const saveList = (key: string, list: any[]) => localStorage.setItem(key, JSON.stringify(list));

// --- NOTIFICATIONS INTERNAL HELPER ---
const createNotification = (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning', relatedBillId?: string) => {
  const notifs = getList<Notification>(STORAGE_KEYS.NOTIFICATIONS);
  const newNotif: Notification = {
    id: crypto.randomUUID(),
    userId,
    title,
    message,
    type,
    isRead: false,
    createdAt: Date.now(),
    relatedBillId
  };
  notifs.push(newNotif);
  saveList(STORAGE_KEYS.NOTIFICATIONS, notifs);
};

// --- USER AUTH ---
export const apiRegister = async (user: User): Promise<User> => {
  await delay(500);
  const users = getList<User>(STORAGE_KEYS.USERS);
  if (users.find(u => u.email === user.email)) throw new Error('Email already exists');
  users.push(user);
  saveList(STORAGE_KEYS.USERS, users);
  return user;
};

export const apiLogin = async (email: string, password: string): Promise<User> => {
  await delay(500);
  const users = getList<User>(STORAGE_KEYS.USERS);
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid credentials');
  return user;
};

// --- TEAM ---
export const apiCreateTeam = async (team: Team): Promise<Team> => {
  await delay(500);
  const teams = getList<Team>(STORAGE_KEYS.TEAMS);
  teams.push(team);
  saveList(STORAGE_KEYS.TEAMS, teams);
  return team;
};

export const apiJoinTeam = async (userId: string, teamName: string, pass: string): Promise<Team> => {
  await delay(500);
  const teams = getList<Team>(STORAGE_KEYS.TEAMS);
  const team = teams.find(t => t.name === teamName && t.joinPassword === pass);
  if (!team) throw new Error('Invalid Team Name or Password');
  
  if (!team.memberIds.includes(userId)) {
    team.memberIds.push(userId);
    saveList(STORAGE_KEYS.TEAMS, teams);
  }
  return team;
};

export const apiGetTeamMembers = async (memberIds: string[]): Promise<User[]> => {
  await delay(300);
  const users = getList<User>(STORAGE_KEYS.USERS);
  return users.filter(u => memberIds.includes(u.id));
};

// --- BRANCHES ---
export const apiGetBranches = async (teamId: string): Promise<Branch[]> => {
  const branches = getList<Branch>(STORAGE_KEYS.BRANCHES);
  return branches.filter(b => b.teamId === teamId);
};

export const apiAddBranch = async (branch: Branch): Promise<Branch> => {
  await delay(300);
  const branches = getList<Branch>(STORAGE_KEYS.BRANCHES);
  branches.push(branch);
  saveList(STORAGE_KEYS.BRANCHES, branches);
  return branch;
};

// --- BILLS ---
export const apiGetBills = async (teamId: string): Promise<Bill[]> => {
  await delay(400);
  const bills = getList<Bill>(STORAGE_KEYS.BILLS);
  return bills.filter(b => b.teamId === teamId).sort((a, b) => b.createdAt - a.createdAt);
};

export const apiUploadBill = async (bill: Bill): Promise<Bill> => {
  await delay(600);
  const bills = getList<Bill>(STORAGE_KEYS.BILLS);
  bills.push(bill);
  saveList(STORAGE_KEYS.BILLS, bills);

  // Notify Admin
  const teams = getList<Team>(STORAGE_KEYS.TEAMS);
  const team = teams.find(t => t.id === bill.teamId);
  if (team) {
    createNotification(
      team.adminId, 
      "New Expense Request", 
      `${bill.userName} uploaded a new bill for $${bill.amount}.`, 
      'info',
      bill.id
    );
  }

  return bill;
};

export const apiUpdateBillStatus = async (billId: string, status: BillStatus, reason?: string, paymentDetails?: { txnId?: string, screenshotUrl?: string, paymentMethod?: 'UPI' | 'BANK' }): Promise<Bill> => {
  await delay(400);
  const bills = getList<Bill>(STORAGE_KEYS.BILLS);
  const idx = bills.findIndex(b => b.id === billId);
  if (idx === -1) throw new Error('Bill not found');

  const updated = { ...bills[idx], status };
  if (reason) updated.rejectionReason = reason;
  if (status === BillStatus.PAID) {
    updated.paidAt = Date.now();
    if (paymentDetails?.txnId) updated.transactionId = paymentDetails.txnId;
    if (paymentDetails?.screenshotUrl) updated.paymentScreenshotUrl = paymentDetails.screenshotUrl;
    if (paymentDetails?.paymentMethod) updated.paymentMethod = paymentDetails.paymentMethod;
  }

  bills[idx] = updated;
  saveList(STORAGE_KEYS.BILLS, bills);

  // Notify User
  if (status === BillStatus.PAID) {
    createNotification(
      updated.userId,
      "Bill Paid!",
      `Your expense "${updated.title}" ($${updated.amount}) has been paid via ${updated.paymentMethod === 'UPI' ? 'UPI' : 'Bank Transfer'}.`,
      'success',
      updated.id
    );
  } else if (status === BillStatus.REJECTED) {
    createNotification(
      updated.userId,
      "Bill Rejected",
      `Your expense "${updated.title}" was rejected. Reason: ${reason || 'N/A'}`,
      'warning',
      updated.id
    );
  }

  return updated;
};

// --- NOTIFICATIONS ---
export const apiGetNotifications = async (userId: string): Promise<Notification[]> => {
  // No artificial delay for notifications for snappier feel
  const all = getList<Notification>(STORAGE_KEYS.NOTIFICATIONS);
  return all.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
};

export const apiMarkAllRead = async (userId: string) => {
  const all = getList<Notification>(STORAGE_KEYS.NOTIFICATIONS);
  const updated = all.map(n => n.userId === userId ? { ...n, isRead: true } : n);
  saveList(STORAGE_KEYS.NOTIFICATIONS, updated);
};