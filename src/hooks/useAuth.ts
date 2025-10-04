import { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseClient';
import { usePOS } from '../context/POSContext';

export function useAuth() {
  const { dispatch } = usePOS();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      if (user) {
        // User is signed in
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          dispatch({ type: 'SET_USER', payload: {
            uid: user.uid,
            email: user.email,
            name: userData.name || user.displayName,
            phone: userData.phone,
            photoURL: user.photoURL
          }});
          dispatch({ type: 'SET_AUTHENTICATED', payload: true });
          dispatch({ type: 'SET_ONBOARDED', payload: userData.isOnboarded || false });
          
          if (userData.store) {
            dispatch({ type: 'SET_STORE', payload: userData.store });
          }
        } else {
          // New user, create document
          const newUserData = {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            isOnboarded: false,
            createdAt: new Date()
          };
          
          await setDoc(doc(db, 'users', user.uid), newUserData);
          
          dispatch({ type: 'SET_USER', payload: {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL
          }});
          dispatch({ type: 'SET_AUTHENTICATED', payload: true });
          dispatch({ type: 'SET_ONBOARDED', payload: false });
        }
      } else {
        // User is signed out
        dispatch({ type: 'SET_AUTHENTICATED', payload: false });
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_ONBOARDED', payload: false });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    return () => unsubscribe();
  }, [dispatch]);
}