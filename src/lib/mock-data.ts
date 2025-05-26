
import type { User, Region, Branch, Device, DeviceType } from '@/types';

export const usersData: User[] = [
  { id: 'user-branch-1', username: 'branchuser1', password: 'password', role: 'branch', name: 'Alice Smith', email: 'alice@example.com', branchId: 'branch-ny-1', regionId: 'region-luzon-ncr', avatarUrl: 'https://picsum.photos/seed/alice/100/100' },
  { id: 'user-regional-1', username: 'regionaluser1', password: 'password', role: 'regional', name: 'Bob Johnson', email: 'bob@example.com', regionId: 'region-luzon-ncr', avatarUrl: 'https://picsum.photos/seed/bob/100/100' },
  { id: 'user-national-1', username: 'nationaluser1', password: 'password', role: 'national', name: 'Carol Williams', email: 'carol@example.com', avatarUrl: 'https://picsum.photos/seed/carol/100/100' },
  { id: 'user-branch-2', username: 'branchuser2', password: 'password', role: 'branch', name: 'David Brown', email: 'david@example.com', branchId: 'branch-ca-1', regionId: 'region-luzon-iva', avatarUrl: 'https://picsum.photos/seed/david/100/100' },
];

export const regionsData: Region[] = [
  // Luzon
  { id: 'region-luzon-i', name: 'Region I – Ilocos Region', regionalManagerName: 'Juan Dela Cruz' },
  { id: 'region-luzon-ii', name: 'Region II – Cagayan Valley', regionalManagerName: 'Maria Santos' },
  { id: 'region-luzon-iii', name: 'Region III – Central Luzon', regionalManagerName: 'Jose Rizal' },
  { id: 'region-luzon-iva', name: 'Region IV-A – CALABARZON', regionalManagerName: 'Andres Bonifacio' },
  { id: 'region-luzon-mimaropa', name: 'MIMAROPA', regionalManagerName: 'Gabriela Silang' },
  { id: 'region-luzon-v', name: 'Region V – Bicol Region', regionalManagerName: 'Emilio Aguinaldo' },
  { id: 'region-luzon-ncr', name: 'NCR – National Capital Region', regionalManagerName: 'Lapu-Lapu' },
  { id: 'region-luzon-car', name: 'CAR – Cordillera Administrative Region', regionalManagerName: 'Teresa Magbanua' },
  // Visayas
  { id: 'region-visayas-vi', name: 'Region VI – Western Visayas', regionalManagerName: 'Graciano Lopez Jaena' },
  { id: 'region-visayas-vii', name: 'Region VII – Central Visayas', regionalManagerName: 'Leonor Rivera' },
  { id: 'region-visayas-viii', name: 'Region VIII – Eastern Visayas', regionalManagerName: 'Marcelo H. Del Pilar' },
  // Mindanao
  { id: 'region-mindanao-ix', name: 'Region IX – Zamboanga Peninsula', regionalManagerName: 'Antonio Luna' },
  { id: 'region-mindanao-x', name: 'Region X – Northern Mindanao', regionalManagerName: 'Melchora Aquino' },
  { id: 'region-mindanao-xi', name: 'Region XI – Davao Region', regionalManagerName: 'Apolinario Mabini' },
  { id: 'region-mindanao-xii', name: 'Region XII – SOCCSKSARGEN', regionalManagerName: 'Gregoria de Jesus' },
  { id: 'region-mindanao-xiii', name: 'Region XIII – Caraga', regionalManagerName: 'Francisco Dagohoy' },
  { id: 'region-mindanao-barmm', name: 'BARMM – Bangsamoro Autonomous Region in Muslim Mindanao', regionalManagerName: 'Sultan Kudarat' },
];

export const branchesData: Branch[] = [
  { id: 'branch-ny-1', name: 'Manila Central Branch', address: '123 Rizal Ave, Metro Manila', regionId: 'region-luzon-ncr', managerName: 'Alice Smith', contactPhone: '02-8555-0101', establishedDate: '2020-01-15T00:00:00.000Z' },
  { id: 'branch-ny-2', name: 'Quezon City Branch', address: '456 EDSA, Quezon City', regionId: 'region-luzon-ncr', managerName: 'Grace Lee', contactPhone: '02-7555-0102', establishedDate: '2021-06-20T00:00:00.000Z' },
  { id: 'branch-ca-1', name: 'Cavite Hub', address: '789 Aguinaldo Hwy, Cavite', regionId: 'region-luzon-iva', managerName: 'David Brown', contactPhone: '046-555-0103', establishedDate: '2019-03-10T00:00:00.000Z' },
  { id: 'branch-il-1', name: 'Pampanga Main', address: '101 MacArthur Hwy, Pampanga', regionId: 'region-luzon-iii', managerName: 'Henry Miller', contactPhone: '045-555-0104', establishedDate: '2022-02-28T00:00:00.000Z' },
  { id: 'branch-cebu-1', name: 'Cebu City Downtown', address: '202 Colon St, Cebu City', regionId: 'region-visayas-vii', managerName: 'Maria Clara', contactPhone: '032-555-0105', establishedDate: '2018-07-22T00:00:00.000Z' },
  { id: 'branch-davao-1', name: 'Davao Business Park', address: '303 JP Laurel Ave, Davao City', regionId: 'region-mindanao-xi', managerName: 'Crisostomo Ibarra', contactPhone: '082-555-0106', establishedDate: '2017-11-05T00:00:00.000Z' },
];

export const devicesData: Device[] = [
  // Manila Central Branch Devices (NCR)
  { id: 'device-ny-1-1', name: 'Staff Lounge Refrigerator', type: 'Refrigerator', status: 'online', branchId: 'branch-ny-1', lastSeen: new Date().toISOString(), location: 'Staff Lounge' },
  { id: 'device-ny-1-2', name: 'Manager Office AC', type: 'Air Conditioner', status: 'offline', branchId: 'branch-ny-1', lastSeen: new Date(Date.now() - 3600000 * 5).toISOString(), location: 'Manager Office', notes: 'Check power supply.' },
  
  // Quezon City Branch Devices (NCR)
  { id: 'device-ny-2-1', name: 'Reception Area AC', type: 'Air Conditioner', status: 'online', branchId: 'branch-ny-2', lastSeen: new Date().toISOString(), location: 'Reception' },

  // Cavite Hub Devices (CALABARZON)
  { id: 'device-ca-1-1', name: 'Server Room AC Unit 1', type: 'Air Conditioner', status: 'online', branchId: 'branch-ca-1', lastSeen: new Date().toISOString(), location: 'Data Center Rack 1' },
  { id: 'device-ca-1-2', name: 'Pantry Refrigerator CH', type: 'Refrigerator', status: 'online', branchId: 'branch-ca-1', lastSeen: new Date().toISOString(), location: 'Pantry' },


  // Pampanga Main Devices (Central Luzon)
  { id: 'device-il-1-1', name: 'Main Hall AC Unit', type: 'Air Conditioner', status: 'maintenance', branchId: 'branch-il-1', lastSeen: new Date(Date.now() - 3600000 * 3).toISOString(), location: 'Main Hall' },

  // Cebu City Downtown Devices (Central Visayas)
  { id: 'device-cebu-1-1', name: 'Back Office Refrigerator', type: 'Refrigerator', status: 'online', branchId: 'branch-cebu-1', lastSeen: new Date().toISOString(), location: 'Back Office' },
  { id: 'device-cebu-1-2', name: 'Stock Room AC', type: 'Air Conditioner', status: 'online', branchId: 'branch-cebu-1', lastSeen: new Date().toISOString(), location: 'Stock Room' },

  // Davao Business Park Devices (Davao Region)
  { id: 'device-davao-1-1', name: 'Employee Canteen Refrigerator', type: 'Refrigerator', status: 'offline', branchId: 'branch-davao-1', lastSeen: new Date(Date.now() - 3600000 * 24).toISOString(), location: 'Employee Canteen', notes: 'Door seal issue.' },
  { id: 'device-davao-1-2', name: 'Conference Room AC', type: 'Air Conditioner', status: 'online', branchId: 'branch-davao-1', lastSeen: new Date().toISOString(), location: 'Conference Room Alpha' },
];



