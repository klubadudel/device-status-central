
export type DeviceStatus = 'online' | 'offline' | 'maintenance';
export type DeviceType = 'Refrigerator' | 'Air Conditioner';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus; // In Firestore, this primarily tracks 'maintenance'. 'online'/'offline' come from RTDB for most.
  branchId: string;
  lastSeen: string; // ISO date string. Updated by RTDB from ESP, or fallback from Firestore.
  location: string;
  notes?: string;
  assignedPin?: number; // GPIO pin number
  // Internal helper, not always present in Firestore doc unless set by listener logic
  firestoreStatus?: DeviceStatus; // Status as per Firestore document
  lastSeenFromRtdb?: boolean; // Flag indicating if lastSeen was populated from RTDB
  rtdbStatus?: DeviceStatus; // Raw status from RTDB, before considering firestoreStatus
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  regionId: string;
  managerName?: string;
  contactPhone?: string;
  establishedDate?: string; // ISO date string
}

export interface Region {
  id: string;
  name: string;
  regionalManagerName?: string;
}

export type UserRole = 'branch' | 'regional' | 'national';

export interface User {
  id: string; // Firebase Auth UID
  username: string;
  email: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
  branchId?: string | null;
  regionId?: string | null;
  // password field is not part of the stored User document in Firestore
}

// For RTDB device status updates from ESP8266
export interface DeviceRTDBPayload {
    status: 'online' | 'offline' | 'ON' | 'OFF'; // ESP might send ON/OFF
    last_updated?: string; // Epoch timestamp as string from ESP
    pin?: number | null; // GPIO pin number or null
}

// For Device Activity Logs
export interface DeviceActivityLog {
  id?: string; // Firestore document ID
  deviceId: string;
  timestamp: any; // Firestore Timestamp, but 'any' for broader client compatibility before conversion
  eventType: 'rtdb_status_change' | 'maintenance_set' | 'maintenance_cleared' | 'device_created' | 'device_details_updated' | 'log_error';
  oldValue?: string; // e.g., previous status
  newValue?: string; // e.g., new status
  message: string;   // Human-readable description
  userId?: string | null;    // UID of the user who performed the action, if applicable
}

// GPIO Pin definitions for ESP8266 (NodeMCU style)
export const GPIO_PINS = [
  { label: "D0 (GPIO16)", value: 16 },
  { label: "D1 (GPIO5)", value: 5 },
  { label: "D2 (GPIO4)", value: 4 },
  { label: "D3 (GPIO0)", value: 0 },
  { label: "D4 (GPIO2)", value: 2 },
  { label: "D5 (GPIO14)", value: 14 },
  { label: "D6 (GPIO12)", value: 12 },
  { label: "D7 (GPIO13)", value: 13 },
  { label: "D8 (GPIO15)", value: 15 },
];
