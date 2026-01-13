export enum VaultItemType {
  LOGIN = 'Login',
  CARD = 'Card',
  NOTE = 'Note',
  IDENTITY = 'Identity'
}

export interface VaultItem {
  id: string;
  type: VaultItemType;
  folder?: string;
  name: string;
  username?: string;
  password?: string;
  url?: string; // For auto-fill simulation
  cardNumber?: string;
  cvv?: string;
  expiry?: string;
  note?: string;
  favorite: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface UserProfile {
  email: string;
  masterHash: string;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string; // Mock secret for TOTP
  passkeyRegistered?: boolean; // New: For Passkey simulation
}

export interface EmergencyContact {
  id: string;
  email: string;
  name: string;
  status: 'Pending' | 'Granted' | 'Denied';
  accessDate?: number;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  timestamp: number;
  details?: string;
  ip: string; // Mock IP
}

export type AppScreen = 'AUTH' | 'VAULT' | 'GENERATOR' | 'SECURITY' | 'SETTINGS' | 'ITEM_DETAIL' | 'EDIT_ITEM' | 'EMERGENCY' | 'TWO_FACTOR' | 'ACTIVITY';

export interface BreachReport {
  isSafe: boolean;
  score: number;
  analysis: string;
  breachCount: number;
}