import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';

// --- Firebase Configuration and Initialization ---
// MANDATORY global variables from Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfigFromEnv = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// User's provided firebaseConfig as a fallback if __firebase_config is empty/undefined
const userProvidedFirebaseConfig = {
  apiKey: "AIzaSyD_y6T9vi9akl4VBWbnA07EmT7Otoua6jU",
  authDomain: "notesync-2c375.firebaseapp.com",
  projectId: "notesync-2c375",
  storageBucket: "notesync-2c375.firebasestorage.app",
  messagingSenderId: "363027179318",
  appId: "1:363027179318:web:423353f9ccb752c67cb597"
};

// Determine which config to use
const currentFirebaseConfig = Object.keys(firebaseConfigFromEnv).length > 0
  ? firebaseConfigFromEnv
  : userProvidedFirebaseConfig;

// Initialize Firebase App
let app;
if (!getApps().length) {
  app = initializeApp(currentFirebaseConfig);
} else {
  app = getApp();
}

// Get Firebase service instances
const auth = getAuth(app);
const db = getFirestore(app);

// --- Auth Context and Hook ---
const AuthContext = createContext(null);

function useFirebaseAuth() {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Attempt to sign in with custom token if available
    const signInToken = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          // If no custom token, sign in anonymously (as per prompt instructions)
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase custom token/anonymous sign-in error:", error);
        // Continue to set up onAuthStateChanged even if initial sign-in fails
      }
    };

    signInToken();

    // Set up Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        setUserId(user.uid); // Set UID if authenticated
      } else {
        setAuthUser(null);
        setUserId(crypto.randomUUID()); // Use a random ID if not authenticated
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Run only once on mount

  return {
    authUser,
    loading,
    userId,
    auth, // Provide auth instance for direct use in components
    db // Provide db instance for direct use in components
  };
}

// --- Auth Provider Component ---
function AuthUserProvider({ children }) {
  const auth = useFirebaseAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Main Application Component ---
export default function App() {
  return (
    <AuthUserProvider>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <NextjsFirebaseApp />
      </div>
    </AuthUserProvider>
  );
}

function NextjsFirebaseApp() {
  const { authUser, loading, userId, auth, db } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notes, setNotes] = useState([]);
  const [noteMessage, setNoteMessage] = useState('');

  // Firestore collection reference for private user data
  // Path: /artifacts/{appId}/users/{userId}/{your_collection_name}
  const getNotesCollectionRef = useCallback(() => {
    if (!userId) {
      console.warn("User ID not available for Firestore operations.");
      return null;
    }
    return collection(db, `artifacts/${appId}/users/${userId}/notes`);
  }, [db, userId]);

  // Handle User Sign Up
  const handleSignUp = async () => {
    setAuthMessage('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setAuthMessage('User signed up successfully!');
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthMessage(`Sign up error: ${error.message}`);
      console.error('Sign up error:', error);
    }
  };

  // Handle User Sign In
  const handleSignIn = async () => {
    setAuthMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthMessage('User signed in successfully!');
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthMessage(`Sign in error: ${error.message}`);
      console.error('Sign in error:', error);
    }
  };

  // Handle User Sign Out
  const handleSignOut = async () => {
    setAuthMessage('');
    try {
      await signOut(auth);
      setAuthMessage('User signed out.');
      setNotes([]); // Clear notes on sign out
    } catch (error) {
      setAuthMessage(`Sign out error: ${error.message}`);
      console.error('Sign out error:', error);
    }
  };

  // Add a new note to Firestore
  const handleAddNote = async () => {
    setNoteMessage('');
    if (!authUser || !noteContent.trim()) {
      setNoteMessage('Please log in and enter note content.');
      return;
    }
    try {
      const notesCollection = getNotesCollectionRef();
      if (notesCollection) {
        await addDoc(notesCollection, {
          content: noteContent,
          createdAt: Date.now(),
          authorId: authUser.uid,
          authorEmail: authUser.email || 'Anonymous', // Include email for reference
        });
        setNoteContent('');
        setNoteMessage('Note added successfully!');
      }
    } catch (error) {
      setNoteMessage(`Error adding note: ${error.message}`);
      console.error('Error adding note:', error);
    }
  };

  // Delete a note from Firestore
  const handleDeleteNote = async (id) => {
    setNoteMessage('');
    if (!authUser) {
      setNoteMessage('Please log in to delete notes.');
      return;
    }
    try {
      const notesCollection = getNotesCollectionRef();
      if (notesCollection) {
        await deleteDoc(doc(notesCollection, id));
        setNoteMessage('Note deleted successfully!');
      }
    } catch (error) {
      setNoteMessage(`Error deleting note: ${error.message}`);
      console.error('Error deleting note:', error);
    }
  };

  // Real-time listener for notes
  useEffect(() => {
    let unsubscribe;
    if (authUser && userId) { // Only fetch if authenticated and userId is available
      const notesCollection = getNotesCollectionRef();
      if (notesCollection) {
        // Create a query to order notes by creation time
        // Note: Firestore orderBy() is not used as per instruction to avoid index issues.
        // Data will be fetched and sorted in memory.
        const q = query(notesCollection);

        unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedNotes = [];
          snapshot.forEach((doc) => {
            fetchedNotes.push({ id: doc.id, ...doc.data() });
          });
          // Sort in memory by createdAt to show newest first
          fetchedNotes.sort((a, b) => b.createdAt - a.createdAt);
          setNotes(fetchedNotes);
        }, (error) => {
          setNoteMessage(`Error fetching notes: ${error.message}`);
          console.error("Error fetching notes:", error);
        });
      }
    } else {
      setNotes([]); // Clear notes if not authenticated
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [authUser, userId, getNotesCollectionRef]); // Re-run effect when authUser or userId changes

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl shadow-lg w-full max-w-md">
        <p className="text-gray-700">Loading Firebase...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-gray-800 text-center mb-4">NoteSync with Firebase</h1>

      {/* User Information */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">User Status</h2>
        {authUser ? (
          <div>
            <p className="text-blue-700">
              Logged in as: <span className="font-medium">{authUser.email || 'Anonymous User'}</span>
            </p>
            <p className="text-blue-700 break-words">
              User ID: <span className="font-medium">{userId}</span>
            </p>
            <button
              onClick={handleSignOut}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-200 ease-in-out transform hover:scale-105"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <p className="text-blue-700">Not logged in.</p>
        )}
        {authMessage && <p className="mt-2 text-sm text-center text-blue-600">{authMessage}</p>}
      </div>

      {/* Authentication Form */}
      {!authUser && (
        <div className="border border-gray-300 p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Login / Sign Up</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSignIn}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200 ease-in-out transform hover:scale-105 font-semibold"
            >
              Sign In
            </button>
            <button
              onClick={handleSignUp}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition duration-200 ease-in-out transform hover:scale-105 font-semibold"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      {/* Notes Section (Visible only when logged in) */}
      {authUser && (
        <div className="border border-gray-300 p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Your Notes</h2>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write your note here..."
            rows="4"
            className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          ></textarea>
          <button
            onClick={handleAddNote}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200 ease-in-out transform hover:scale-105 font-semibold mb-4"
          >
            Add Note
          </button>
          {noteMessage && <p className="mt-2 text-sm text-center text-blue-600">{noteMessage}</p>}

          <h3 className="text-lg font-medium text-gray-700 mt-6 mb-3">All Notes:</h3>
          {notes.length === 0 ? (
            <p className="text-gray-500 text-center">No notes yet. Add one above!</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex-1">
                    <p className="text-gray-800 text-base break-words">{note.content}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Added: {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="ml-0 sm:ml-4 px-3 py-1 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600 transition duration-200 ease-in-out text-sm"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

