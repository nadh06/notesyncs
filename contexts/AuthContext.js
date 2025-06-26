// contexts/AuthContext.js
'use client'; // This directive makes the component a client-side component

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Assuming db instance is needed here for context consumers

// MANDATORY global variables from Canvas environment (these are typically injected at runtime)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Create the Auth Context
export const AuthContext = createContext(null);

/**
 * Custom hook to manage Firebase authentication state.
 * Initializes Firebase auth and listens for auth state changes.
 */
export function useFirebaseAuth() {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null); // Represents the current user ID for Firestore paths

  // Get the auth and db instances from the initialized Firebase app
  // This assumes `auth` and `db` are globally accessible after `lib/firebase.js` is run,
  // or passed down from a higher level if not using global imports.
  // For simplicity here, we assume they are already initialized via `lib/firebase.js`
  // and imported into the main App component, then passed down.
  // In a real setup, `auth` and `db` would be imported directly here:
  // import { auth, db } from '../lib/firebase';
  // However, for this canvas environment, they are assumed to be available from the parent.

  useEffect(() => {
    // We need to re-initialize auth and db here to ensure they are available within the hook's scope.
    // In the App component, we will pass them down. For this file to be standalone,
    // we assume the firebase app itself is already initialized via lib/firebase.js
    // and we can get its services.
    const authInstance = getAuth(); // Get auth instance
    const dbInstance = getFirestore(); // Get db instance

    // Attempt to sign in with custom token or anonymously if available/needed
    const signInOnLoad = async () => {
      try {
        if (initialAuthToken) {
          console.log("Attempting sign-in with custom token...");
          await signInWithCustomToken(authInstance, initialAuthToken);
        } else {
          console.log("Attempting anonymous sign-in...");
          await signInAnonymously(authInstance);
        }
      } catch (error) {
        console.error("Firebase initial sign-in error:", error);
        // Continue regardless to set up onAuthStateChanged
      }
    };

    signInOnLoad(); // Call this once on component mount

    // Set up Auth State Listener
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        setAuthUser(user);
        setUserId(user.uid); // Authenticated user ID
        console.log("User authenticated:", user.uid);
      } else {
        setAuthUser(null);
        setUserId(crypto.randomUUID()); // Anonymous/random ID for unauthenticated access
        console.log("User not authenticated. Using random ID:", userId);
      }
      setLoading(false); // Authentication state is ready
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  return {
    authUser,
    loading,
    userId,
    auth: getAuth(), // Return the auth instance
    db: getFirestore() // Return the db instance
  };
}

/**
 * Provider component to make authentication data available to all children.
 */
export function AuthUserProvider({ children }) {
  const auth = useFirebaseAuth(); // Use the custom hook to get auth state
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}