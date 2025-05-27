export type CartType = 'Code Cart' | 'P-Bag';

export interface CodeCartItem {
  id: string;
  identifier: string; // Cart/P-Bag ID
  cartType: CartType;
  location: string; // Mandatory location
  employeeInitials: string;
  drugExpirationDate?: string | null; // ISO string YYYY-MM-DD
  supplyExpirationDate?: string | null; // ISO string YYYY-MM-DD
  createdAt: string; // ISO string for full datetime, "Date Entered"
}

export type FormMode = 'add' | 'edit';

export type ExpirationStatus = 'expired' | 'urgent' | 'expiringSoon' | 'good' | 'na';

// For status filter controls
export type FilterType = 'all' | 'goodAndNa' | 'expiringSoon' | 'urgent' | 'expired';

// For the notification system
export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
}