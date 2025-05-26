
'use client';

import type { User, UserRole } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser, // Alias to avoid naming conflict
} from "firebase/auth";
import { auth, db } from '@/lib/firebase.config';
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";


export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (email: string, password: string, role: UserRole, name: string, branchId?: string | null, regionId?:string | null) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  refreshUser: (updatedUser: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState(false);
  const adminPerformingRegistrationRef = useRef<FirebaseUser | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      const adminRefUID = adminPerformingRegistrationRef.current?.uid;
      console.log(
        "AuthContext: onAuthStateChanged triggered.",
        "Firebase user UID:", firebaseUser?.uid || "null",
        "isRegisteringAdmin state:", isRegisteringAdmin,
        "adminPerformingRegistrationRef UID:", adminRefUID || "null",
        "Condition (isRegisteringAdmin && firebaseUser && adminRefUID && adminRefUID !== firebaseUser.uid):",
        isRegisteringAdmin && firebaseUser && adminRefUID && adminRefUID !== firebaseUser.uid
      );

      // If admin is registering a NEW user, defer full processing of onAuthStateChanged for that NEW user
      if (isRegisteringAdmin && firebaseUser && adminRefUID && adminRefUID !== firebaseUser.uid) {
        console.log("AuthContext: Admin registration in progress for a NEW user. Deferring full onAuthStateChanged processing for UID:", firebaseUser.uid);
        if (loading) setLoading(false); // Allow initial loading spinner to clear
        return; // Defer! The register function will handle sign out & admin re-auth.
      }

      // Regular auth state processing
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          console.log("AuthContext: Attempting to fetch Firestore doc for UID:", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const appUser = { id: userDoc.id, ...userDoc.data() } as User;
            console.log("AuthContext: Firestore user doc FOUND for UID:", firebaseUser.uid); // Removed User data for brevity
            setUser(appUser);
            setRole(appUser.role);
            if ((pathname === '/login' || pathname === '/') && firebaseUser.uid) {
              console.log("AuthContext: User authenticated, redirecting from login/root to /dashboard");
              router.replace('/dashboard');
            }
          } else {
            console.warn("AuthContext: User document NOT found in Firestore for UID:", firebaseUser.uid, ". Logging out Firebase user.");
            await signOut(auth); // This will re-trigger onAuthStateChanged with null
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user document from Firestore for UID:", firebaseUser.uid, error);
          await signOut(auth);
        }
      } else {
        console.log("AuthContext: No Firebase user from onAuthStateChanged. Clearing app user state.");
        setUser(null);
        setRole(null);
        if (pathname !== '/login' && pathname !== '/' && !pathname.startsWith('/_next/') && !loading && !isRegisteringAdmin ) { // Added !isRegisteringAdmin
          console.log("AuthContext: User not authenticated on protected path", pathname, "redirecting to /login");
          router.replace(`/login?redirect=${pathname}`);
        }
      }

      if (loading) {
        console.log("AuthContext: Initial auth check complete or regular user/auth change. Setting loading to false.");
        setLoading(false);
      }
    });
    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    }
  }, [isRegisteringAdmin, loading, pathname, router]); // isRegisteringAdmin is a dependency

  const login = useCallback(
    async (email: string, password?: string): Promise<boolean> => {
      console.log("AuthContext: login attempt for", email);
      try {
        if (!password) {
          throw new Error("Password Required");
        }
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle setting user, role, and navigation
        return true;
      } catch (error:any) {
        console.error("Login failed:", error.message); 
        return false;
      }
    },
    [] 
  );

  const register = useCallback(
    async (email: string, password: string, userRole: UserRole, name: string, branchId?: string | null, regionId?: string | null): Promise<boolean> => {
      const adminWhoIsRegistering = auth.currentUser;

      if (!adminWhoIsRegistering) {
        const noAdminMsg = "Administrator not signed in to perform this action.";
        console.error("AuthContext:", noAdminMsg);
        toast({ title: "Error", description: noAdminMsg, variant: "destructive"});
        throw new Error(noAdminMsg); // Throw error instead of returning false
      }
      console.log(`AuthContext: Register attempt for ${email} Role: ${userRole} by admin: ${adminWhoIsRegistering.email}`);
      
      adminPerformingRegistrationRef.current = adminWhoIsRegistering;
      setIsRegisteringAdmin(true);

      let newFirebaseUser: FirebaseUser | null = null;

      try {
        console.log("AuthContext: Attempting to create Firebase Auth user for:", email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        newFirebaseUser = userCredential.user;
        console.log("AuthContext: Firebase Auth user CREATED:", newFirebaseUser.uid);

        console.log("AuthContext: Immediately signing out newly created user to restore admin context. New user UID:", newFirebaseUser.uid);
        await signOut(auth);
        console.log("AuthContext: New user signed out.");

        if (adminWhoIsRegistering.email && process.env.NEXT_PUBLIC_ADMIN_PASSWORD_FOR_REAUTH) {
          console.log("AuthContext: Attempting to re-authenticate admin:", adminWhoIsRegistering.email);
          await signInWithEmailAndPassword(auth, adminWhoIsRegistering.email, process.env.NEXT_PUBLIC_ADMIN_PASSWORD_FOR_REAUTH);
          console.log("AuthContext: Admin re-authenticated successfully. Current auth.currentUser UID:", auth.currentUser?.uid);
          if (auth.currentUser?.uid !== adminWhoIsRegistering.uid) {
            console.error("AuthContext: CRITICAL - Admin re-authentication resulted in unexpected user.");
            throw new Error("Admin re-authentication failed to restore correct admin session.");
          }
        } else {
          const adminCredsError = "Admin re-authentication credentials not available. Cannot reliably write Firestore document as admin.";
          console.error("AuthContext: CRITICAL -", adminCredsError);
          throw new Error(adminCredsError);
        }
        
        const userDocRef = doc(db, "users", newFirebaseUser.uid);
        let finalRegionId = regionId;
        if (userRole === 'branch' && branchId) {
            try {
                const branchDocSnap = await getDoc(doc(db, "branches", branchId));
                if (branchDocSnap.exists()) {
                    finalRegionId = branchDocSnap.data()?.regionId || null;
                }
            } catch (branchError) {
                 console.warn(`AuthContext: Error fetching branch ${branchId} for regionId during user registration:`, branchError);
            }
        }
        const newUserAppData: Omit<User, 'id' | 'password'> = {
            username: email, name: name, email: email, role: userRole,
            branchId: userRole === 'branch' ? branchId : null,
            regionId: (userRole === 'regional' || userRole === 'branch') ? finalRegionId : null,
            avatarUrl: `https://picsum.photos/seed/${email.split('@')[0]}/100/100`,
        };
        
        console.log(`AuthContext: Attempting to write Firestore doc for new user. Path: ${userDocRef.path} Data: ${JSON.stringify(newUserAppData)} AS ADMIN: ${auth.currentUser?.email}`);
        await setDoc(userDocRef, newUserAppData);
        console.log("AuthContext: Firestore user document CREATED successfully for new user:", newFirebaseUser.uid, "by admin:", auth.currentUser?.email);

        toast({title: "User Created", description: `User ${name} (${email}) created successfully.`});
        return true;

      } catch (error: any) {
        console.error("AuthContext: Overall registration process encountered an error:", error);
        
        if (newFirebaseUser && auth.currentUser && auth.currentUser.uid === newFirebaseUser.uid) {
          try {
            console.log("AuthContext: Attempting to delete orphaned Auth user (currently signed in as new user):", newFirebaseUser.uid);
            await newFirebaseUser.delete();
            console.log("AuthContext: Cleaned up (deleted) Firebase Auth user due to registration error.");
          } catch (deleteError) {
            console.error("AuthContext: Failed to clean up (delete) Firebase Auth user after registration error:", deleteError);
          }
        } else if (newFirebaseUser) {
            console.warn("AuthContext: New Auth user was created but context is not them. Deletion of", newFirebaseUser.uid, "might need admin privileges or manual cleanup if Firestore write failed.");
            // If admin re-auth failed before this point, deleting newFirebaseUser would require signing in as that user.
        }
        
        // Attempt to ensure original admin session is still valid or re-established if possible,
        // but only if we haven't already thrown an error about admin re-auth.
        if (!(error.message.includes("Admin re-authentication"))) {
            if (adminWhoIsRegistering.email && process.env.NEXT_PUBLIC_ADMIN_PASSWORD_FOR_REAUTH && (!auth.currentUser || auth.currentUser.uid !== adminWhoIsRegistering.uid)) {
                try {
                    console.log("AuthContext: Attempting to restore admin session after error for:", adminWhoIsRegistering.email);
                    await signInWithEmailAndPassword(auth, adminWhoIsRegistering.email, process.env.NEXT_PUBLIC_ADMIN_PASSWORD_FOR_REAUTH);
                    console.log("AuthContext: Admin session restored after error.");
                } catch (reauthError: any) {
                    console.error("AuthContext: Failed to restore admin session after error. Admin may need to log in again.", reauthError);
                    throw new Error(`User registration failed and could not restore admin session: ${reauthError.message || "Admin re-auth failed"}`);
                }
            }
        }
        // Throw error to be caught by AddUserDialog
        const errorMessage = error.message || "An unknown error occurred during user registration.";
        toast({ title: "User Creation Failed", description: errorMessage, variant: "destructive"});
        throw new Error(errorMessage); // Re-throw
      } finally {
        console.log("AuthContext: Resetting isRegisteringAdmin flag and adminPerformingRegistrationRef.");
        setIsRegisteringAdmin(false);
        adminPerformingRegistrationRef.current = null;
      }
    },
  [toast]
);


  const logout = useCallback(() => {
    console.log("AuthContext: logout called.");
    adminPerformingRegistrationRef.current = null; 
    setIsRegisteringAdmin(false); 
    signOut(auth).then(() => {
      console.log("AuthContext: Firebase signOut successful.");
    }).catch((error) => {
        console.error("AuthContext: Logout failed:", error);
    });
  }, []);

  const refreshUser = useCallback(async (updatedUser: User) => {
    if (user && user.id === updatedUser.id) {
        console.log("AuthContext: Refreshing user data in context", updatedUser);
        setUser(updatedUser);
        setRole(updatedUser.role);
    }
  }, [user]);

  // Seed national admin user effect
  useEffect(() => {
    const SEED_ATTEMPTED_FLAG = 'national_admin_seed_attempted_v2_firestore_check_003'; // Updated flag
    const seedAdminUser = async () => {
        const adminEmail = "nationaladmin@example.com";
        const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_FOR_REAUTH || "password123";
        const adminName = "National Admin";
        const adminRole: UserRole = "national";

        console.log("AuthContext: Checking/Seeding national admin user:", adminEmail);
        
        let adminAuthUser: FirebaseUser | null = null;
        try {
            // Attempt to sign in to see if admin exists in Auth
            const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
            adminAuthUser = userCredential.user;
            console.log("AuthContext: Admin user exists in Firebase Auth. UID:", adminAuthUser.uid);
        } catch (signInError: any) {
            if (['auth/user-not-found', 'auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-email', 'auth/user-disabled'].includes(signInError.code)) {
                console.log("AuthContext: Admin user not found in Auth or creds invalid, attempting to create. Error code:", signInError.code);
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                    adminAuthUser = userCredential.user;
                    console.log("AuthContext: Admin user CREATED in Firebase Auth. UID:", adminAuthUser.uid);
                } catch (createError: any) {
                    console.error("AuthContext: Error CREATING admin user in Firebase Auth during seed:", createError);
                    return; 
                }
            } else {
                 console.error("AuthContext: Error CHECKING admin user in Firebase Auth during seed (other than not found/wrong pass):", signInError);
                 return;
            }
        }

        if (adminAuthUser) {
            const userDocRef = doc(db, "users", adminAuthUser.uid);
            const expectedAdminData: Omit<User, 'id' | 'password'> = {
                username: adminEmail, name: adminName, email: adminEmail, role: adminRole,
                branchId: null, regionId: null,
                avatarUrl: `https://picsum.photos/seed/${adminEmail.split('@')[0]}/100/100`,
            };
            try {
                const userDoc = await getDoc(userDocRef);
                let needsWrite = !userDoc.exists();
                if(userDoc.exists()){
                    const currentData = userDoc.data();
                    if(currentData.role !== adminRole || currentData.name !== adminName || currentData.email !== adminEmail) {
                        needsWrite = true; // Data mismatch, needs update
                        console.log("AuthContext: Admin Firestore data mismatch. Current:", JSON.stringify(currentData), "Expected role parts:", JSON.stringify(expectedAdminData));
                    }
                }
                if (needsWrite) {
                    console.log("AuthContext: Admin Firestore doc needs write/update for UID:", adminAuthUser.uid, "Data:", JSON.stringify(expectedAdminData));
                    await setDoc(userDocRef, expectedAdminData, { merge: true }); // Use merge:true to be safe
                    console.log("AuthContext: Admin user Firestore document CREATED/UPDATED for UID:", adminAuthUser.uid);
                } else {
                   console.log("AuthContext: Admin user Firestore document is already correct for UID:", adminAuthUser.uid);
                }
            } catch (firestoreError) {
                 console.error("AuthContext: Error writing/checking admin Firestore document for UID:", adminAuthUser.uid, firestoreError);
            }

            // Sign out admin ONLY if they were signed in *by this seed function*.
            // The goal is to leave the app in the state it was before seeding, or with no user if it just started.
            if (auth.currentUser && auth.currentUser.uid === adminAuthUser.uid) {
                const wasAdminAlreadyLoggedIn = adminPerformingRegistrationRef.current?.uid === adminAuthUser.uid && !isRegisteringAdmin;
                if (!wasAdminAlreadyLoggedIn) { // if admin was not the one originally logged in (e.g. app just started)
                     console.log("AuthContext: Signing out admin user (", adminAuthUser.email, ") that was signed in/created during seed process.");
                     await signOut(auth);
                } else {
                    console.log("AuthContext: Admin (", adminAuthUser.email, ") was already logged in prior to seed check, keeping session.");
                }
            }
        }
    };

    if (!loading) { // Only run seed if initial auth loading is complete
        if (!sessionStorage.getItem(SEED_ATTEMPTED_FLAG)) {
            console.log("AuthContext: Attempting to seed national admin user...");
            seedAdminUser().finally(() => {
                 sessionStorage.setItem(SEED_ATTEMPTED_FLAG, 'true');
                 console.log("AuthContext: Admin seed process finished, flag set.");
            });
        } else {
            console.log("AuthContext: Admin seed already attempted this session.");
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // Depends on loading to ensure it runs after initial auth check.


  return (
    <AuthContext.Provider value={{ user, role, login, register, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

    
