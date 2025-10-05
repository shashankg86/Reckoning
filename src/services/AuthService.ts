import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseClient';

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  phone?: string;
  photoURL?: string;
  isOnboarded: boolean;
  store?: {
    name: string;
    type: string;
    language: string;
    currency: string;
    theme: string;
  };
  createdAt: Date;
  lastLoginAt: Date;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile | null = null;
  private authStateListeners: ((user: UserProfile | null) => void)[] = [];

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  constructor() {
    this.initializeAuthListener();
  }

  private initializeAuthListener() {
    onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const userProfile = await this.fetchUserProfile(firebaseUser);
          this.currentUser = userProfile;
          this.notifyAuthStateListeners(userProfile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          this.currentUser = null;
          this.notifyAuthStateListeners(null);
        }
      } else {
        this.currentUser = null;
        this.notifyAuthStateListeners(null);
      }
    });
  }

  private async fetchUserProfile(firebaseUser: User): Promise<UserProfile> {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Update last login
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        lastLoginAt: new Date()
      });

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: userData.name || firebaseUser.displayName,
        phone: userData.phone,
        photoURL: firebaseUser.photoURL,
        isOnboarded: userData.isOnboarded || false,
        store: userData.store,
        createdAt: userData.createdAt?.toDate() || new Date(),
        lastLoginAt: new Date()
      };
    } else {
      // Create new user document
      const newUserProfile: Partial<UserProfile> = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        isOnboarded: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
      
      return newUserProfile as UserProfile;
    }
  }

  private notifyAuthStateListeners(user: UserProfile | null) {
    this.authStateListeners.forEach(listener => listener(user));
  }

  // Public API
  async login(email: string, password: string): Promise<UserProfile> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userProfile = await this.fetchUserProfile(userCredential.user);
    return userProfile;
  }

  async register(email: string, password: string, name: string, phone?: string): Promise<UserProfile> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with name
    await updateProfile(userCredential.user, { displayName: name });

    // Create user document
    const userProfile: Partial<UserProfile> = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      name: name,
      phone: phone,
      isOnboarded: false,
      createdAt: new Date(),
      lastLoginAt: new Date()
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
    
    return userProfile as UserProfile;
  }

  async logout(): Promise<void> {
    await signOut(auth);
    this.currentUser = null;
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!this.currentUser) throw new Error('No authenticated user');
    
    await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
    this.currentUser = { ...this.currentUser, ...updates };
    this.notifyAuthStateListeners(this.currentUser);
  }

  async completeOnboarding(storeData: UserProfile['store']): Promise<void> {
    if (!this.currentUser) throw new Error('No authenticated user');

    const updates = {
      store: storeData,
      isOnboarded: true
    };

    await this.updateUserProfile(updates);
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isOnboarded(): boolean {
    return this.currentUser?.isOnboarded || false;
  }

  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }
}

export default AuthService;