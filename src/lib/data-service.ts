
// Using Firebase Firestore for persistence.
import type { User, Region, Branch, Device, DeviceStatus, DeviceRTDBPayload, DeviceActivityLog, GPIO_PINS_TYPE } from '@/types';
import { db, rtdb, auth } from '@/lib/firebase.config'; // Corrected import path
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
  onSnapshot as firestoreOnSnapshot,
  Unsubscribe as FirestoreUnsubscribe,
  orderBy,
  limit,
  serverTimestamp
} from "firebase/firestore";
import {
  ref as rtdbRef,
  onValue as rtdbOnValue,
  off as rtdbOff,
  DataSnapshot,
  set as rtdbSet,
  remove as rtdbRemove,
} from "firebase/database";
import { toast } from '@/hooks/use-toast';

const USERS_COLLECTION = "users";
const REGIONS_COLLECTION = "regions";
const BRANCHES_COLLECTION = "branches";
const DEVICES_COLLECTION = "devices";
const DEVICE_ACTIVITY_LOGS_COLLECTION = "deviceActivityLogs";

// RTDB Paths
const RTDB_DEVICES_PATH_PREFIX = "devices"; // Path for device operational data (status, last_updated, pin)

const SPECIAL_DEVICE_ID_RTDB_ONLY = "5abs449wgqcPsQEWIHO7";

const devicePreviousRtdbStatuses = new Map<string, DeviceStatus | undefined>();

const playNotificationSound = () => {
  if (typeof window !== 'undefined') {
    const audio = new Audio('/sounds/mixkit-bell-notification-933.wav');
    audio.play().catch(error => console.warn("Audio play failed. User interaction might be needed.", error));
  }
};

const addDeviceActivityLog = async (logData: Omit<DeviceActivityLog, 'id' | 'timestamp'>) => {
  try {
    await addDoc(collection(db, DEVICE_ACTIVITY_LOGS_COLLECTION), {
      ...logData,
      timestamp: serverTimestamp(), // Use Firestore server timestamp
    });
    console.log("Data-Service: Device activity log added:", logData.eventType, logData.deviceId);
  } catch (error) {
    console.error("Data-Service: Error adding device activity log:", error);
    toast({
        title: "Logging Error",
        description: "Could not save activity log for device event.",
        variant: "destructive",
    });
  }
};


const commonDeviceListenerLogic = (
    fsDevice: Device, // Device data from Firestore
    currentDevicesData: { [deviceId: string]: Device }, // Accumulator for merged data
    rtdbListeners: { [deviceId: string]: { rtdbDataUnsubscribe?: () => void } },
    callback: (devices: Device[]) => void
) => {
    const deviceId = fsDevice.id;

    // Initialize or update device data from Firestore
    currentDevicesData[deviceId] = {
        ...fsDevice, // Base data from Firestore
        firestoreStatus: fsDevice.status, // Store Firestore status explicitly
        rtdbStatus: currentDevicesData[deviceId]?.rtdbStatus, // Keep existing RTDB status if already there
        assignedPin: currentDevicesData[deviceId]?.assignedPin !== undefined ? currentDevicesData[deviceId].assignedPin : fsDevice.assignedPin, // Prioritize existing RTDB pin, then FS
        ...currentDevicesData[deviceId], // Overwrite with existing RTDB data if any, then selectively update below
    };


    if (!auth.currentUser) {
        console.warn(`Data-Service: No authenticated user. Skipping RTDB listener for ${deviceId}. Using Firestore data as fallback.`);
        currentDevicesData[deviceId].status = currentDevicesData[deviceId].firestoreStatus || 'offline';
        currentDevicesData[deviceId].assignedPin = fsDevice.assignedPin; // Use Firestore pin
        callback(Object.values(currentDevicesData).map(d => ({ ...d })));
        return;
    }

    const deviceRtdbPath = `${RTDB_DEVICES_PATH_PREFIX}/${deviceId}`;

    // Setup RTDB listener only if it doesn't exist
    if (!rtdbListeners[deviceId]?.rtdbDataUnsubscribe) {
        console.log(`DATA-SERVICE: Setting up RTDB listener for ${deviceId} at ${deviceRtdbPath}. User: ${auth.currentUser?.email}`);
        const deviceRtdbListenerRef = rtdbRef(rtdb, deviceRtdbPath);

        const rtdbUnsubscribeCallback = rtdbOnValue(deviceRtdbListenerRef, (snapshot: DataSnapshot) => {
            const rtdbData = snapshot.val() as DeviceRTDBPayload | null;
            let liveRtdbStatus: DeviceStatus = 'offline';
            let liveRtdbLastSeen: string | null = null;
            let liveRtdbPin: number | undefined | null = undefined; // Use null to indicate pin cleared in RTDB

            if (currentDevicesData[deviceId]) { // Ensure device still in scope
                if (rtdbData && typeof rtdbData === 'object') {
                    // Interpret status from RTDB
                    if (typeof rtdbData.status === 'string') {
                        if (rtdbData.status === 'online' || rtdbData.status === 'offline') {
                            liveRtdbStatus = rtdbData.status as DeviceStatus;
                        } else if (rtdbData.status.toUpperCase() === "ON") {
                            liveRtdbStatus = 'online';
                        } else if (rtdbData.status.toUpperCase() === "OFF") {
                            liveRtdbStatus = 'offline';
                        }
                    }
                    // Interpret last_updated from RTDB (epoch string to ISO string)
                    if (rtdbData.last_updated) {
                        const epochMillis = parseInt(String(rtdbData.last_updated), 10) * 1000;
                        if (!isNaN(epochMillis)) {
                            liveRtdbLastSeen = new Date(epochMillis).toISOString();
                        }
                    }
                    // Interpret pin from RTDB
                    if (rtdbData.pin !== undefined) { // Checks for presence, including null
                        liveRtdbPin = typeof rtdbData.pin === 'number' ? rtdbData.pin : null; // null if not number
                    }
                }

                currentDevicesData[deviceId].rtdbStatus = liveRtdbStatus;
                
                if (deviceId === SPECIAL_DEVICE_ID_RTDB_ONLY) {
                    currentDevicesData[deviceId].status = liveRtdbStatus;
                    currentDevicesData[deviceId].lastSeen = liveRtdbLastSeen || currentDevicesData[deviceId].lastSeen; // Prefer RTDB
                    currentDevicesData[deviceId].assignedPin = liveRtdbPin === undefined ? currentDevicesData[deviceId].assignedPin : (liveRtdbPin === null ? undefined : liveRtdbPin);
                } else {
                    currentDevicesData[deviceId].status = currentDevicesData[deviceId].firestoreStatus === 'maintenance' ? 'maintenance' : liveRtdbStatus;
                    currentDevicesData[deviceId].lastSeen = liveRtdbLastSeen || fsDevice.lastSeen; // Prefer RTDB if available, else Firestore original
                    currentDevicesData[deviceId].assignedPin = liveRtdbPin === undefined ? fsDevice.assignedPin : (liveRtdbPin === null ? undefined : liveRtdbPin);
                }
                
                const previousReportedRtdbStatus = devicePreviousRtdbStatuses.get(deviceId);
                if (previousReportedRtdbStatus !== undefined && liveRtdbStatus !== previousReportedRtdbStatus) {
                    const logMessage = `Device RTDB status changed from ${previousReportedRtdbStatus} to ${liveRtdbStatus}.`;
                    console.info(`[Device Status Change] Device ID: ${deviceId}, Name: "${currentDevicesData[deviceId]?.name || 'Unknown'}", Old RTDB: ${previousReportedRtdbStatus}, New RTDB: ${liveRtdbStatus}, Timestamp: ${new Date().toISOString()}`);
                    addDeviceActivityLog({ deviceId: deviceId, eventType: 'rtdb_status_change', oldValue: previousReportedRtdbStatus, newValue: liveRtdbStatus, message: logMessage, userId: null });
                    
                    if (liveRtdbStatus === 'offline' && previousReportedRtdbStatus === 'online') {
                        toast({ title: `Device Offline`, description: `Device "${currentDevicesData[deviceId]?.name || deviceId}" has gone offline.`, variant: "destructive" });
                        playNotificationSound();
                    } else if (liveRtdbStatus === 'online' && previousReportedRtdbStatus === 'offline') {
                        toast({ title: `Device Online`, description: `Device "${currentDevicesData[deviceId]?.name || deviceId}" is now online.`, variant: "default" }); // Using "default" variant for online
                        playNotificationSound();
                    }
                }
                devicePreviousRtdbStatuses.set(deviceId, liveRtdbStatus);
                callback(Object.values(currentDevicesData).map(d => ({ ...d })));
            }
        }, (error) => {
            console.error(`Data-Service: RTDB listener error for device ${deviceId} at ${deviceRtdbPath}: `, error);
            if (currentDevicesData[deviceId]) {
                currentDevicesData[deviceId].status = currentDevicesData[deviceId].firestoreStatus === 'maintenance' ? 'maintenance' : 'offline';
                devicePreviousRtdbStatuses.set(deviceId, 'offline');
                callback(Object.values(currentDevicesData).map(d => ({ ...d })));
            }
        });

        if (!rtdbListeners[deviceId]) rtdbListeners[deviceId] = {};
        rtdbListeners[deviceId].rtdbDataUnsubscribe = () => rtdbOff(deviceRtdbListenerRef);
    } else {
      // If listener already exists, just ensure the callback is called with current data
      // (e.g. if only Firestore data changed for this device but not its ID or presence)
      // However, the main trigger for callback is from the snapshot listeners themselves.
      // This path might be redundant if Firestore snapshot always triggers re-evaluation.
       callback(Object.values(currentDevicesData).map(d => ({ ...d })));
    }
};


export const listenToDevicesByBranchId = (branchId: string, callback: (devices: Device[]) => void): FirestoreUnsubscribe => {
    console.log(`Data-Service: Setting up Firestore and RTDB listeners for branchId: ${branchId}`);
    const devicesCollectionRef = collection(db, DEVICES_COLLECTION);
    const q = query(devicesCollectionRef, where("branchId", "==", branchId));

    let rtdbListeners: { [deviceId: string]: { rtdbDataUnsubscribe?: () => void } } = {};
    let currentDevicesData: { [deviceId: string]: Device } = {};

    const firestoreUnsubscribe = firestoreOnSnapshot(q, (querySnapshot) => {
        const firestoreDevices: Device[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            firestoreDevices.push({
                id: docSnap.id,
                ...data,
                lastSeen: data.lastSeen instanceof Timestamp ? data.lastSeen.toDate().toISOString() : (data.lastSeen || new Date(0).toISOString()),
                status: data.status || 'offline', // Firestore status
                assignedPin: typeof data.assignedPin === 'number' ? data.assignedPin : undefined,
            } as Device);
        });
        console.log(`Data-Service: Firestore snapshot for branch ${branchId} received ${firestoreDevices.length} devices.`);

        const newDeviceIds = new Set(firestoreDevices.map(d => d.id));
        Object.keys(currentDevicesData).forEach(id => {
            if (!newDeviceIds.has(id)) {
                if (rtdbListeners[id]?.rtdbDataUnsubscribe) rtdbListeners[id].rtdbDataUnsubscribe!();
                delete rtdbListeners[id];
                delete currentDevicesData[id];
                devicePreviousRtdbStatuses.delete(id);
            }
        });

        firestoreDevices.forEach(fsDevice => commonDeviceListenerLogic(fsDevice, currentDevicesData, rtdbListeners, callback));
        if (firestoreDevices.length === 0) { // If no devices from Firestore, callback with empty
            callback([]);
        }
        // Callback is now primarily called from within commonDeviceListenerLogic after RTDB data potentially merges
    }, (error) => {
        console.error(`Data-Service: Firestore listener error for branch ${branchId}: `, error);
        callback([]);
    });

    return () => {
        firestoreUnsubscribe();
        Object.values(rtdbListeners).forEach(listeners => {
            if (listeners.rtdbDataUnsubscribe) listeners.rtdbDataUnsubscribe();
        });
        rtdbListeners = {};
        currentDevicesData = {};
        devicePreviousRtdbStatuses.clear();
    };
};

export const listenToAllDevices = (callback: (devices: Device[]) => void): FirestoreUnsubscribe => {
    console.log(`Data-Service: Setting up Firestore and RTDB listeners for ALL devices.`);
    const devicesCollectionRef = collection(db, DEVICES_COLLECTION);

    let rtdbListeners: { [deviceId: string]: { rtdbDataUnsubscribe?: () => void } } = {};
    let currentDevicesData: { [deviceId: string]: Device } = {};

    const firestoreUnsubscribe = firestoreOnSnapshot(devicesCollectionRef, (querySnapshot) => {
        const firestoreDevices: Device[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            firestoreDevices.push({
                id: docSnap.id,
                ...data,
                lastSeen: data.lastSeen instanceof Timestamp ? data.lastSeen.toDate().toISOString() : (data.lastSeen || new Date(0).toISOString()),
                status: data.status || 'offline', // Firestore status
                assignedPin: typeof data.assignedPin === 'number' ? data.assignedPin : undefined,
            } as Device);
        });
        console.log(`Data-Service: Firestore snapshot for ALL devices received ${firestoreDevices.length} devices.`);

        const newDeviceIds = new Set(firestoreDevices.map(d => d.id));
         Object.keys(currentDevicesData).forEach(id => {
            if (!newDeviceIds.has(id)) {
                if (rtdbListeners[id]?.rtdbDataUnsubscribe) rtdbListeners[id].rtdbDataUnsubscribe!();
                delete rtdbListeners[id];
                delete currentDevicesData[id];
                devicePreviousRtdbStatuses.delete(id);
            }
        });

        firestoreDevices.forEach(fsDevice => commonDeviceListenerLogic(fsDevice, currentDevicesData, rtdbListeners, callback));
        if (firestoreDevices.length === 0) {
            callback([]);
        }
        // Callback is now primarily called from within commonDeviceListenerLogic
    }, (error) => {
        console.error("Data-Service: Firestore listener error for all devices: ", error);
        callback([]);
    });

    return () => {
        firestoreUnsubscribe();
        Object.values(rtdbListeners).forEach(listeners => {
            if (listeners.rtdbDataUnsubscribe) listeners.rtdbDataUnsubscribe();
        });
        rtdbListeners = {};
        currentDevicesData = {};
        devicePreviousRtdbStatuses.clear();
    };
};


// User Operations
export const getUsers = async (): Promise<User[]> => {
    const usersCollectionRef = collection(db, USERS_COLLECTION);
    try {
        if (!auth.currentUser) {
            console.warn("Data-Service: No authenticated user. Cannot list users.");
            toast({title: "Authentication Error", description: "You must be logged in to view user data.", variant: "destructive"});
            return [];
        }
        console.log("Data-Service: Attempting to fetch users. Authenticated user:", auth.currentUser.email);
        const usersSnapshot = await getDocs(query(usersCollectionRef, orderBy("name")));
        const usersList = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
        console.log("Data-Service: Fetched users count:", usersList.length);
        return usersList;
    } catch (error: any) {
        console.error("Data-Service: Error fetching users from Firestore:", error.message, error.code, error.stack);
        const specificError = error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || error.message?.includes("permission_denied") || error.message?.includes("insufficient permissions")
            ? "Firestore permission denied. Check rules for '/users' collection (list permission)."
            : error.message?.includes("requires an index")
            ? "Firestore index required for users. Check browser console for link."
            : `Could not load users data: ${error.message || "Unknown error."}`;

        toast({title: "Error Fetching Users", description: specificError, variant: "destructive"});
        return [];
    }
};

export const getUserById = async (id: string): Promise<User | undefined> => {
    const userDocRef = doc(db, USERS_COLLECTION, id);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() } as User;
        }
        return undefined;
    } catch (error: any) {
        console.error(`Data-Service: Error fetching user ${id}:`, error);
        if (error.code === 'permission-denied') {
            console.error("Data-Service: Permission denied fetching user. Check Firestore rules for get on /users/{userId}.");
        }
        return undefined;
    }
};

export const updateUser = async (id: string, updates: Partial<Omit<User, 'id' | 'password'>>): Promise<User | undefined> => {
    const userDocRef = doc(db, USERS_COLLECTION, id);
    const firestoreUpdates: any = { ...updates };

    if (firestoreUpdates.role === 'national') {
        firestoreUpdates.branchId = null;
        firestoreUpdates.regionId = null;
    } else if (firestoreUpdates.role === 'regional') {
        firestoreUpdates.branchId = null;
    }
    // Password is not stored in Firestore User doc, handled by Firebase Auth directly if changed.
    await updateDoc(userDocRef, firestoreUpdates);
    return getUserById(id);
};

export const deleteUser = async (id: string): Promise<boolean> => {
    const userDocRef = doc(db, USERS_COLLECTION, id);
    try {
        await deleteDoc(userDocRef);
        console.log(`Data-Service: Firestore document for user ${id} deleted.`);
        // Note: This does NOT delete the user from Firebase Authentication.
        // That would require using the Firebase Admin SDK in a Cloud Function.
        return true;
    } catch (error: any) {
        console.error("Error deleting user from Firestore:", error);
         if (error.code === 'permission-denied') {
            console.error("Data-Service: Permission denied deleting user. Check Firestore rules for delete on /users/{userId}.");
        }
        return false;
    }
};

// Region Operations
export const getRegions = async (): Promise<Region[]> => {
    const regionsCollectionRef = collection(db, REGIONS_COLLECTION);
    const regionsSnapshot = await getDocs(query(regionsCollectionRef, orderBy("name")));
    return regionsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Region));
};
export const getRegionById = async (id: string): Promise<Region | undefined> => {
    const regionDocRef = doc(db, REGIONS_COLLECTION, id);
    const regionDoc = await getDoc(regionDocRef);
    if (regionDoc.exists()) {
        return { id: regionDoc.id, ...regionDoc.data() } as Region;
    }
    return undefined;
};
export const addRegion = async (regionData: Omit<Region, 'id'>): Promise<Region> => {
    const regionsCollectionRef = collection(db, REGIONS_COLLECTION);
    const docRef = await addDoc(regionsCollectionRef, regionData);
    return { id: docRef.id, ...regionData };
};


// Branch Operations
export const getBranches = async (): Promise<Branch[]> => {
    const branchesCollectionRef = collection(db, BRANCHES_COLLECTION);
    const branchesSnapshot = await getDocs(query(branchesCollectionRef, orderBy("name")));
    return branchesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const establishedDate = data.establishedDate instanceof Timestamp
            ? data.establishedDate.toDate().toISOString()
            : data.establishedDate;
        return { id: docSnap.id, ...data, establishedDate } as Branch;
    });
};
export const getBranchById = async (id: string): Promise<Branch | undefined> => {
    const branchDocRef = doc(db, BRANCHES_COLLECTION, id);
    const branchDoc = await getDoc(branchDocRef);
    if (branchDoc.exists()) {
        const data = branchDoc.data();
        const establishedDate = data.establishedDate instanceof Timestamp
            ? data.establishedDate.toDate().toISOString()
            : data.establishedDate;
        return { id: branchDoc.id, ...data, establishedDate } as Branch;
    }
    return undefined;
};

export const getBranchesByRegion = async (regionId: string): Promise<Branch[]> => {
    const branchesCollectionRef = collection(db, BRANCHES_COLLECTION);
    const q = query(branchesCollectionRef, where("regionId", "==", regionId), orderBy("name"));
    const branchesSnapshot = await getDocs(q);
    return branchesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const establishedDate = data.establishedDate instanceof Timestamp
            ? data.establishedDate.toDate().toISOString()
            : data.establishedDate;
        return { id: docSnap.id, ...data, establishedDate } as Branch;
    });
};

export const addBranch = async (branchData: Omit<Branch, 'id'>): Promise<Branch> => {
  const branchesCollectionRef = collection(db, BRANCHES_COLLECTION);
  const dataToSave: any = { ...branchData };
  if (branchData.establishedDate) {
    dataToSave.establishedDate = Timestamp.fromDate(new Date(branchData.establishedDate));
  } else {
    delete dataToSave.establishedDate;
  }
  const docRef = await addDoc(branchesCollectionRef, dataToSave);
  const newDocSnap = await getDoc(docRef); 
  if (!newDocSnap.exists()) { 
    throw new Error("Failed to retrieve newly created branch.");
  }
  const newDocData = newDocSnap.data();
  const establishedDate = newDocData.establishedDate instanceof Timestamp 
      ? newDocData.establishedDate.toDate().toISOString()
      : newDocData.establishedDate; 

  return {
    id: docRef.id,
    ...newDocData, 
    establishedDate
  } as Branch;
};


export const updateBranch = async (id: string, updates: Partial<Omit<Branch, 'id'>>): Promise<Branch | undefined> => {
    const branchDocRef = doc(db, BRANCHES_COLLECTION, id);
    const dataToUpdate: any = { ...updates };
    if (updates.hasOwnProperty('establishedDate')) { 
        dataToUpdate.establishedDate = updates.establishedDate ? Timestamp.fromDate(new Date(updates.establishedDate)) : null;
    }
    await updateDoc(branchDocRef, dataToUpdate);
    return getBranchById(id); 
};

export const deleteBranch = async (id: string): Promise<boolean> => {
    const batch = writeBatch(db);
    const branchDocRef = doc(db, BRANCHES_COLLECTION, id);

    try {
        const devicesToDeleteQuery = query(collection(db, DEVICES_COLLECTION), where("branchId", "==", id));
        const devicesSnapshot = await getDocs(devicesToDeleteQuery);

        devicesSnapshot.forEach((deviceDoc) => {
            batch.delete(doc(db, DEVICES_COLLECTION, deviceDoc.id));
            const deviceRtdbPath = `${RTDB_DEVICES_PATH_PREFIX}/${deviceDoc.id}`;
            rtdbRemove(rtdbRef(rtdb, deviceRtdbPath)) 
              .catch(err => console.warn(`Data-Service: Failed to delete RTDB data for device ${deviceDoc.id} at ${deviceRtdbPath}: ${err.message || err}`));
        });
        batch.delete(branchDocRef);
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Data-Service: Error deleting branch and its devices:", error);
        return false;
    }
};

// Snapshot reads primarily for AI Insights or initial loads for pages not needing real-time device status
export const getDevicesByBranchIdSnapshot = async (branchId: string): Promise<Device[]> => {
  console.warn(`Data-Service: getDevicesByBranchIdSnapshot for branch ${branchId} is a one-time Firestore fetch and does not include live RTDB status or config.`);
  const devicesCollectionRef = collection(db, DEVICES_COLLECTION);
  const q = query(devicesCollectionRef, where("branchId", "==", branchId));
  const devicesSnapshot = await getDocs(q);
  return devicesSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const lastSeen = data.lastSeen instanceof Timestamp ? data.lastSeen.toDate().toISOString() : data.lastSeen;
      const firestoreStatus = data.status || 'offline';
      return {
        id: docSnap.id,
        ...data,
        lastSeen,
        status: firestoreStatus, 
        firestoreStatus: firestoreStatus, 
        assignedPin: typeof data.assignedPin === 'number' ? data.assignedPin : undefined,
    } as Device;
  });
};
export { getDevicesByBranchIdSnapshot as getDevicesByBranchId };


export const getDevicesSnapshot = async (): Promise<Device[]> => {
    console.warn("Data-Service: getDevicesSnapshot (aliased as getDevices) is a one-time Firestore fetch and does not include live RTDB status or config.");
    const devicesCollectionRef = collection(db, DEVICES_COLLECTION);
    const devicesSnapshot = await getDocs(devicesCollectionRef);
    return devicesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const lastSeen = data.lastSeen instanceof Timestamp ? data.lastSeen.toDate().toISOString() : data.lastSeen;
        const firestoreStatus = data.status || 'offline';
        return {
            id: docSnap.id,
            ...data,
            lastSeen,
            status: firestoreStatus,
            firestoreStatus: firestoreStatus,
            assignedPin: typeof data.assignedPin === 'number' ? data.assignedPin : undefined,
        } as Device;
    });
};
export { getDevicesSnapshot as getDevices };


export const getDeviceByIdSnapshot = async (id: string): Promise<Device | undefined> => {
    console.warn(`Data-Service: getDeviceByIdSnapshot for ${id} (Firestore snapshot) does not merge live RTDB status or config.`);
    const deviceDocRef = doc(db, DEVICES_COLLECTION, id);
    const deviceDoc = await getDoc(deviceDocRef);
    if (deviceDoc.exists()) {
        const data = deviceDoc.data();
        const lastSeen = data.lastSeen instanceof Timestamp ? data.lastSeen.toDate().toISOString() : data.lastSeen;
        const firestoreStatus = data.status || 'offline';
        return {
            id: deviceDoc.id,
            ...data,
            lastSeen,
            status: firestoreStatus,
            firestoreStatus: firestoreStatus,
            assignedPin: typeof data.assignedPin === 'number' ? data.assignedPin : undefined,
        } as Device;
    }
    return undefined;
};
export { getDeviceByIdSnapshot as getDeviceById };


export const addDevice = async (deviceData: Omit<Device, 'id' | 'status' | 'lastSeen' | 'branchId'> & { branchId: string }): Promise<Device> => {
    const devicesCollectionRef = collection(db, DEVICES_COLLECTION);
    const now = Timestamp.now();
    const pinToStoreInFirestore = typeof deviceData.assignedPin === 'number' ? deviceData.assignedPin : null;
    const pinToSyncToRtdb = typeof deviceData.assignedPin === 'number' ? deviceData.assignedPin : null;

    const dataToSave: any = {
        ...deviceData,
        status: 'offline',
        lastSeen: now,
        assignedPin: pinToStoreInFirestore,
    };
    if (dataToSave.notes === undefined) {
        delete dataToSave.notes;
    }

    const docRef = await addDoc(devicesCollectionRef, dataToSave);
    console.log(`Data-Service: Device ${docRef.id} created in Firestore.`);

    const devicePinRtdbPath = `${RTDB_DEVICES_PATH_PREFIX}/${docRef.id}/pin`;
    console.log(`Data-Service: Attempting to set initial pin in RTDB for new device ${docRef.id}. Path: ${devicePinRtdbPath}, Value: ${pinToSyncToRtdb}`);
    rtdbSet(rtdbRef(rtdb, devicePinRtdbPath), pinToSyncToRtdb)
        .then(() => console.log(`Data-Service: Initial pin ${pinToSyncToRtdb === null ? 'null (cleared)' : pinToSyncToRtdb} set in RTDB for new device ${docRef.id}`))
        .catch(err => console.warn(`Data-Service: Failed to write initial pin to RTDB for new device ${docRef.id}: ${err.message || err}`));
    
    addDeviceActivityLog({
      deviceId: docRef.id,
      eventType: 'device_created',
      newValue: 'offline',
      message: `Device "${deviceData.name}" created${pinToStoreInFirestore !== null ? ` with pin ${pinToStoreInFirestore}` : ''}. Initial Firestore status: offline.`,
      userId: auth.currentUser?.uid || null
    });
    
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
      throw new Error("Failed to retrieve newly created device from Firestore.");
    }
    const newDocData = newDocSnap.data();
    const lastSeen = newDocData.lastSeen instanceof Timestamp
        ? newDocData.lastSeen.toDate().toISOString()
        : newDocData.lastSeen;

    return {
        id: docRef.id,
        ...newDocData,
        status: newDocData.status || 'offline',
        lastSeen,
        assignedPin: typeof newDocData.assignedPin === 'number' ? newDocData.assignedPin : undefined,
    } as Device;
};

export const updateDevice = async (id: string, updates: Partial<Omit<Device, 'id' | 'branchId'>>): Promise<Device | undefined> => {
    const deviceDocRef = doc(db, DEVICES_COLLECTION, id);
    console.log(`Data-Service: updateDevice called for ID: ${id} with updates:`, JSON.stringify(updates));
    console.log(`Data-Service: RTDB instance to be used for pin sync: ${rtdb?.app?.options?.databaseURL || 'RTDB not fully initialized for logging URL'}`);
    
    const currentDeviceSnap = await getDoc(deviceDocRef);
    if (!currentDeviceSnap.exists()) {
        console.error(`Data-Service: Device ${id} not found for update.`);
        toast({ title: "Error", description: `Device with ID ${id} not found.`, variant: "destructive"});
        return undefined;
    }
    const currentDeviceData = currentDeviceSnap.data() as Device;
    const oldFirestoreStatus = currentDeviceData.firestoreStatus || currentDeviceData.status;
    const oldAssignedPin = currentDeviceData.assignedPin;

    const dataToUpdateFirestore: any = { ...updates };
    
    if (updates.hasOwnProperty('assignedPin')) {
      dataToUpdateFirestore.assignedPin = typeof updates.assignedPin === 'number' ? updates.assignedPin : null;
    }
    if (updates.hasOwnProperty('notes') && updates.notes === undefined) {
        dataToUpdateFirestore.notes = null; 
    }

    let eventType: DeviceActivityLog['eventType'] | null = null;
    let logMessage = `Device "${updates.name || currentDeviceData.name}" details updated.`;
    let logOldValue: string | number | undefined = undefined;
    let logNewValue: string | number | undefined = undefined;

    if (updates.status && (updates.status === 'maintenance' || updates.status === 'offline')) {
        dataToUpdateFirestore.status = updates.status;
        if (updates.status === 'maintenance' && oldFirestoreStatus !== 'maintenance') {
            eventType = 'maintenance_set';
            logMessage = `Device set to maintenance mode.`;
            logOldValue = String(oldFirestoreStatus);
            logNewValue = 'maintenance';
        } else if (updates.status !== 'maintenance' && oldFirestoreStatus === 'maintenance') {
            eventType = 'maintenance_cleared';
            logMessage = `Device cleared from maintenance. Firestore status set to '${updates.status}'. Live status from RTDB applies.`;
            logOldValue = 'maintenance';
            logNewValue = String(updates.status);
        }
    }

    let pinChangedInFirestore = false;
    if (updates.hasOwnProperty('assignedPin')) {
        pinChangedInFirestore = true;
        console.log(`Data-Service: Preparing to update assignedPin in Firestore for ${id} to: ${dataToUpdateFirestore.assignedPin === null ? 'null (cleared)' : dataToUpdateFirestore.assignedPin }`);
    }
    
    dataToUpdateFirestore.lastSeen = serverTimestamp(); 

    if (Object.keys(dataToUpdateFirestore).length > 0) {
        try {
            await updateDoc(deviceDocRef, dataToUpdateFirestore);
            console.log(`Data-Service: Device ${id} Firestore document updated with:`, JSON.stringify(dataToUpdateFirestore));
        } catch (firestoreError: any) {
            console.error(`Data-Service: Error updating Firestore for device ${id}:`, firestoreError.message, firestoreError.stack);
            toast({ title: "Firestore Error", description: `Failed to update device details in Firestore: ${firestoreError.message}`, variant: "destructive" });
            return undefined; 
        }
    } else {
        console.log(`Data-Service: No changes to update in Firestore for device ${id}.`);
    }

    if (pinChangedInFirestore) {
        const pinToSyncToRtdb = dataToUpdateFirestore.assignedPin; 
        const devicePinRtdbPath = `${RTDB_DEVICES_PATH_PREFIX}/${id}/pin`;
        console.log(`Data-Service: Attempting to sync 'pin' to RTDB for ${id}. Path: ${devicePinRtdbPath}, Value: ${pinToSyncToRtdb}. RTDB URL: ${rtdb?.app?.options?.databaseURL}`);
        
        rtdbSet(rtdbRef(rtdb, devicePinRtdbPath), pinToSyncToRtdb)
            .then(() => {
                console.log(`Data-Service: SUCCESS - Device ${id} 'pin' write to RTDB path '${devicePinRtdbPath}' with value '${pinToSyncToRtdb}' was successful (according to client).`);
                if (!eventType) { 
                    eventType = 'device_details_updated';
                    logMessage = `Device pin changed from "${oldAssignedPin === undefined ? 'none' : oldAssignedPin}" to "${pinToSyncToRtdb === null ? 'none' : pinToSyncToRtdb}".`;
                    logOldValue = oldAssignedPin === undefined ? 'none' : oldAssignedPin;
                    logNewValue = pinToSyncToRtdb === null ? 'none' : pinToSyncToRtdb;
                     addDeviceActivityLog({
                        deviceId: id, eventType: eventType!,
                        oldValue: String(logOldValue), newValue: String(logNewValue),
                        message: logMessage, userId: auth.currentUser?.uid || null
                    });
                } else { 
                     addDeviceActivityLog({
                        deviceId: id, eventType: eventType,
                        oldValue: String(logOldValue), newValue: String(logNewValue),
                        message: logMessage, userId: auth.currentUser?.uid || null
                    });
                }
            })
            .catch((rtdbWriteError: any) => {
                console.error(`Data-Service: ERROR - Failed to write 'pin' to RTDB for device ${id}. Path: ${devicePinRtdbPath}, Value: ${pinToSyncToRtdb}. Error:`, rtdbWriteError.message, rtdbWriteError.stack);
                addDeviceActivityLog({
                    deviceId: id, eventType: 'log_error',
                    message: `Failed to sync assignedPin to RTDB: ${rtdbWriteError.message}. Firestore was updated. Path: ${devicePinRtdbPath}`,
                    userId: auth.currentUser?.uid || null
                });
                toast({ title: "RTDB Sync Warning", description: "Device details saved, but failed to sync pin to Realtime Database.", variant: "default"});
            });
    } else if (eventType) { 
         addDeviceActivityLog({
            deviceId: id, eventType: eventType,
            oldValue: String(logOldValue), newValue: String(logNewValue),
            message: logMessage, userId: auth.currentUser?.uid || null
        });
    } else if (Object.keys(updates).length > 0 && !updates.status && !updates.hasOwnProperty('assignedPin')) { 
        let changesSummary = [];
        if (updates.name && updates.name !== currentDeviceData.name) changesSummary.push(`name to "${updates.name}"`);
        if (updates.type && updates.type !== currentDeviceData.type) changesSummary.push(`type to "${updates.type}"`);
        if (updates.location && updates.location !== currentDeviceData.location) changesSummary.push(`location to "${updates.location}"`);
        if (updates.notes !== undefined && updates.notes !== currentDeviceData.notes) changesSummary.push(`notes updated`);
        if (changesSummary.length > 0) {
            logMessage = `Device details updated: ${changesSummary.join(', ')}.`;
        } else {
            logMessage = `Device details were re-saved (no specific field changes detected for logging).`;
        }
         addDeviceActivityLog({
            deviceId: id, eventType: 'device_details_updated', message: logMessage, userId: auth.currentUser?.uid || null
        });
    }

    const updatedFsDoc = await getDoc(deviceDocRef);
    if (!updatedFsDoc.exists()) return undefined;

    const fsData = updatedFsDoc.data();
    return {
        id: updatedFsDoc.id,
        ...fsData,
        status: fsData.status as DeviceStatus || 'offline',
        lastSeen: fsData.lastSeen instanceof Timestamp ? fsData.lastSeen.toDate().toISOString() : fsData.lastSeen,
        firestoreStatus: fsData.status as DeviceStatus || 'offline',
        assignedPin: typeof fsData.assignedPin === 'number' ? fsData.assignedPin : undefined,
    } as Device;
};


export const deleteDevice = async (id: string): Promise<boolean> => {
    const deviceDocRef = doc(db, DEVICES_COLLECTION, id);
    const deviceSnap = await getDoc(deviceDocRef);
    const deviceName = deviceSnap.exists() ? deviceSnap.data().name : `ID: ${id}`;

    try {
        await deleteDoc(deviceDocRef);
        console.log(`Data-Service: Device ${id} deleted from Firestore.`);

        const deviceRtdbNodePath = `${RTDB_DEVICES_PATH_PREFIX}/${id}`;
        rtdbRemove(rtdbRef(rtdb, deviceRtdbNodePath))
            .then(() => console.log(`Data-Service: Successfully removed RTDB node for device ${id} at ${deviceRtdbNodePath}`))
            .catch(err => console.warn(`Data-Service: Failed to delete RTDB node for device ${id} at ${deviceRtdbNodePath}: ${err.message || err}`));

        addDeviceActivityLog({
            deviceId: id,
            eventType: 'device_details_updated', 
            message: `Device "${deviceName}" document and associated RTDB data deleted.`,
            userId: auth.currentUser?.uid || null
        });
        return true;
    } catch (error: any) {
        console.error("Data-Service: Error deleting device from Firestore:", error);
        toast({ title: "Error", description: `Failed to delete device: ${error.message}`, variant: "destructive"});
        return false;
    }
};

export const getDeviceActivityLogs = async (deviceId: string, count: number = 50): Promise<DeviceActivityLog[]> => {
  if (!auth.currentUser) {
    const authErrorMsg = "No authenticated user. Cannot fetch device logs.";
    console.warn("Data-Service:", authErrorMsg, "DeviceID:", deviceId);
    toast({
      title: "Authentication Error",
      description: "You must be logged in to view device logs.",
      variant: "destructive",
    });
    throw new Error(authErrorMsg);
  }
  try {
    console.log(`Data-Service: Fetching activity logs for device ${deviceId}, count: ${count}. Auth user: ${auth.currentUser.email}`);
    const logsCollectionRef = collection(db, DEVICE_ACTIVITY_LOGS_COLLECTION);
    const q = query(
      logsCollectionRef,
      where("deviceId", "==", deviceId),
      orderBy("timestamp", "desc"),
      limit(count)
    );
    const querySnapshot = await getDocs(q);
    console.log(`Data-Service: Found ${querySnapshot.docs.length} logs for device ${deviceId}.`);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : (data.timestamp || new Date().toISOString()),
      } as DeviceActivityLog;
    });
  } catch (error: any) {
    console.error(`Data-Service: Error fetching activity logs for device ${deviceId}:`, error.message, error.code, error.stack);
    const specificError = error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || error.message?.includes("permission_denied") || error.message?.includes("insufficient permissions")
        ? "Firestore permission denied. Check rules for 'deviceActivityLogs' collection."
        : error.message?.includes("requires an index")
        ? "Firestore index required for device logs. Check browser console for link."
        : `Could not load activity logs: ${error.message || "Unknown error."}`;

    toast({
        title: "Error Fetching Logs",
        description: specificError,
        variant: "destructive",
        duration: specificError.includes("index required") ? 10000 : 5000,
    });
    throw error; // Re-throw the error so the dialog can catch it
  }
};
