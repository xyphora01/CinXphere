import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBBD7mQKRaqjq8QUBY_gyn3VspU52AR7m0",
    authDomain: "cinxphere.firebaseapp.com",
    projectId: "cinxphere",
    storageBucket: "cinxphere.firebasestorage.app",
    messagingSenderId: "498914398474",
    appId: "1:498914398474:web:c668437f7d3330dbf72af3",
    measurementId: "G-WTD1Q2S0CL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Expose Firebase services and functions globally for script.js
window.auth = auth;
window.db = db;

// Sync user profile helper
async function syncUserProfile(user) {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email || user.phoneNumber || "anonymous",
                displayName: user.displayName || "CinXphere User",
                provider: user.providerData && user.providerData[0] ? user.providerData[0].providerId : "email",
                status: "active",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                watchlistSize: 0,
                watchlist: []
            });
        } else {
            const userData = docSnap.data();
            if (userData.status === "blocked") {
                await signOut(auth);
                alert("Your account has been blocked by the administrator.");
                window.location.reload();
                return;
            }
            await updateDoc(userDocRef, {
                lastLogin: serverTimestamp(),
                displayName: user.displayName || userData.displayName || "CinXphere User",
                email: user.email || user.phoneNumber || userData.email || "anonymous"
            });
        }
    } catch (error) {
        console.error("Error syncing user profile:", error);
    }
}

// Watchlist syncing to Firestore
window.syncWatchlistToFirestore = async function(watchlist) {
    const user = auth.currentUser;
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            watchlistSize: watchlist.length,
            watchlist: watchlist
        });
    } catch (error) {
        console.error("Error updating watchlist in Firestore:", error);
    }
};

// Playback analytics logging to Firestore
window.logPlaybackEventToFirestore = async function(movieId, mediaType, title) {
    const user = auth.currentUser;
    try {
        await addDoc(collection(db, "playback_events"), {
            movieId: String(movieId),
            mediaType: mediaType,
            title: title,
            timestamp: serverTimestamp(),
            uid: user ? user.uid : "guest",
            userEmail: user ? (user.email || user.phoneNumber || "anonymous") : "guest"
        });
    } catch (error) {
        console.error("Error logging playback event to Firestore:", error);
    }
};

// DOM Elements
const loginNavBtn = document.getElementById('loginNavBtn');
const authModal = document.getElementById('authModal');
const authCloseBtn = document.getElementById('authCloseBtn');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const panelLogin = document.getElementById('panelLogin');
const panelSignup = document.getElementById('panelSignup');
const goToSignup = document.getElementById('goToSignup');
const goToLogin = document.getElementById('goToLogin');

const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');

const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');
const signupError = document.getElementById('signupError');
const signupSubmitBtn = document.getElementById('signupSubmitBtn');

const userAvatarMenu = document.getElementById('userAvatarMenu');
const userAvatarCircle = document.getElementById('userAvatarCircle');
const avatarDropdownName = document.getElementById('avatarDropdownName');
const avatarDropdownEmail = document.getElementById('avatarDropdownEmail');
const dropdownSignOut = document.getElementById('dropdownSignOut');

// Modal logic
function openAuthModal() {
    authModal.style.display = 'flex';
}

function closeAuthModal() {
    authModal.style.display = 'none';
}

loginNavBtn.addEventListener('click', openAuthModal);
authCloseBtn.addEventListener('click', closeAuthModal);

// Close modal when clicking outside
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeAuthModal();
    }
});


// Switch Tabs
function showLogin() {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    panelLogin.style.display = 'block';
    panelSignup.style.display = 'none';
}

function showSignup() {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    panelSignup.style.display = 'block';
    panelLogin.style.display = 'none';
}

tabLogin.addEventListener('click', showLogin);
goToLogin.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
tabSignup.addEventListener('click', showSignup);
goToSignup.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });

// Password toggles
document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// Authentication logic
signupSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    signupError.innerText = '';
    const name = signupName.value;
    const email = signupEmail.value;
    const password = signupPassword.value;
    const confirmPassword = signupConfirmPassword.value;

    if (password !== confirmPassword) {
        signupError.innerText = 'Passwords do not match.';
        return;
    }
    if (!name) {
        signupError.innerText = 'Please enter your name.';
        return;
    }

    const originalText = signupSubmitBtn.innerHTML;
    signupSubmitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading...';
    signupSubmitBtn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
            displayName: name
        });
        closeAuthModal();
        signupEmail.value = '';
        signupPassword.value = '';
        signupConfirmPassword.value = '';
        signupName.value = '';
    } catch (error) {
        signupError.innerText = error.message.replace('Firebase: ', '');
    } finally {
        signupSubmitBtn.innerHTML = originalText;
        signupSubmitBtn.disabled = false;
    }
});

loginSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    loginError.innerText = '';
    const email = loginEmail.value;
    const password = loginPassword.value;

    const originalText = loginSubmitBtn.innerHTML;
    loginSubmitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading...';
    loginSubmitBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeAuthModal();
        loginEmail.value = '';
        loginPassword.value = '';
    } catch (error) {
        loginError.innerText = 'Invalid email or password.';
    } finally {
        loginSubmitBtn.innerHTML = originalText;
        loginSubmitBtn.disabled = false;
    }
});

// Google Sign-In
async function handleGoogleSignIn(triggerBtn) {
    const originalText = triggerBtn.innerHTML;
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connecting...';

    try {
        await signInWithPopup(auth, googleProvider);
        closeAuthModal();
    } catch (error) {
        console.error('Google sign-in error:', error.code, error.message);
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            // User closed popup — do nothing
        } else if (
            error.code === 'auth/popup-blocked' ||
            error.code === 'auth/operation-not-supported-in-this-environment'
        ) {
            // Popup was blocked — fall back to redirect
            try {
                await signInWithRedirect(auth, googleProvider);
            } catch (redirectError) {
                const msg = redirectError.message.replace('Firebase: ', '');
                if (loginError) loginError.innerText = msg;
                if (signupError) signupError.innerText = msg;
            }
        } else if (error.code === 'auth/unauthorized-domain') {
            const msg = 'This domain is not authorized. Please add it to Firebase Console → Authentication → Settings → Authorized Domains.';
            if (loginError) loginError.innerText = msg;
            if (signupError) signupError.innerText = msg;
        } else {
            const msg = error.message.replace('Firebase: ', '');
            if (loginError) loginError.innerText = msg;
            if (signupError) signupError.innerText = msg;
        }
    } finally {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = originalText;
    }
}

// Handle redirect result on page load (for fallback redirect flow)
getRedirectResult(auth).then((result) => {
    if (result && result.user) {
        closeAuthModal();
    }
}).catch((error) => {
    console.error('Redirect result error:', error.code, error.message);
});

googleLoginBtn.addEventListener('click', () => handleGoogleSignIn(googleLoginBtn));
googleSignupBtn.addEventListener('click', () => handleGoogleSignIn(googleSignupBtn));


dropdownSignOut.addEventListener('click', () => {
    signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Sync profile & block check
        await syncUserProfile(user);
        
        // Sync to local session key expected by script.js
        localStorage.setItem('cinxphere_session', JSON.stringify({
            id: user.uid,
            name: user.displayName || user.email || user.phoneNumber || "CinXphere User",
            email: user.email || user.phoneNumber || ""
        }));
        
        loginNavBtn.style.display = 'none';
        userAvatarMenu.style.display = 'block';
        const initialSource = user.displayName || user.email || user.phoneNumber || 'U';
        userAvatarCircle.innerText = initialSource.charAt(0).toUpperCase();
        avatarDropdownEmail.innerText = user.email || user.phoneNumber || '';
        avatarDropdownName.innerText = user.displayName || 'User';
    } else {
        // Clear local session key on logout
        localStorage.removeItem('cinxphere_session');
        
        loginNavBtn.style.display = 'flex';
        userAvatarMenu.style.display = 'none';
        const dropdown = document.getElementById('avatarDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});

// User menu dropdown toggle
userAvatarCircle.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('avatarDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('avatarDropdown');
    if (dropdown && dropdown.style.display === 'block' && !userAvatarMenu.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});