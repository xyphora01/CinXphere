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

// Expose Firebase services globally for script.js
window.auth = auth;
window.db = db;

// ─── Sync user profile to Firestore ───────────────────────────────────────────
async function syncUserProfile(user) {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email || "anonymous",
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
                email: user.email || userData.email || "anonymous"
            });
        }
    } catch (error) {
        console.error("Error syncing user profile:", error);
    }
}

// ─── Watchlist sync ────────────────────────────────────────────────────────────
window.syncWatchlistToFirestore = async function (watchlist) {
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

// ─── Playback analytics ────────────────────────────────────────────────────────
window.logPlaybackEventToFirestore = async function (movieId, mediaType, title) {
    const user = auth.currentUser;
    try {
        await addDoc(collection(db, "playback_events"), {
            movieId: String(movieId),
            mediaType: mediaType,
            title: title,
            timestamp: serverTimestamp(),
            uid: user ? user.uid : "guest",
            userEmail: user ? (user.email || "anonymous") : "guest"
        });
    } catch (error) {
        console.error("Error logging playback event to Firestore:", error);
    }
};

// ─── Google Sign-In ────────────────────────────────────────────────────────────
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
            // user dismissed — do nothing
        } else if (
            error.code === 'auth/popup-blocked' ||
            error.code === 'auth/operation-not-supported-in-this-environment'
        ) {
            // popup blocked — fall back to redirect
            try {
                await signInWithRedirect(auth, googleProvider);
            } catch (redirectError) {
                showAuthError(redirectError.message.replace('Firebase: ', ''));
            }
        } else if (error.code === 'auth/unauthorized-domain') {
            showAuthError('This domain is not authorized for Google sign-in. Go to Firebase Console → Authentication → Settings → Authorized Domains and add your domain.');
        } else {
            showAuthError(error.message.replace('Firebase: ', ''));
        }
    } finally {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = originalText;
    }
}

function showAuthError(msg) {
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    if (loginError) loginError.innerText = msg;
    if (signupError) signupError.innerText = msg;
}

function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.style.display = 'none';
}

function openAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.style.display = 'flex';
}

// ─── Handle redirect result on page load ──────────────────────────────────────
getRedirectResult(auth).then((result) => {
    if (result && result.user) closeAuthModal();
}).catch((error) => {
    console.error('Redirect result error:', error.code, error.message);
});

// ─── DOM Setup (safe — wrapped so one missing element can't crash everything) ──
document.addEventListener('DOMContentLoaded', () => {
    try {
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

        // ── Modal open/close ──
        if (loginNavBtn) loginNavBtn.addEventListener('click', openAuthModal);
        if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) closeAuthModal();
            });
        }

        // ── Tab switching ──
        function showLogin() {
            if (tabLogin) tabLogin.classList.add('active');
            if (tabSignup) tabSignup.classList.remove('active');
            if (panelLogin) panelLogin.style.display = 'block';
            if (panelSignup) panelSignup.style.display = 'none';
        }

        function showSignup() {
            if (tabSignup) tabSignup.classList.add('active');
            if (tabLogin) tabLogin.classList.remove('active');
            if (panelSignup) panelSignup.style.display = 'block';
            if (panelLogin) panelLogin.style.display = 'none';
        }

        if (tabLogin) tabLogin.addEventListener('click', showLogin);
        if (goToLogin) goToLogin.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
        if (tabSignup) tabSignup.addEventListener('click', showSignup);
        if (goToSignup) goToSignup.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });

        // ── Password visibility toggles ──
        document.querySelectorAll('.toggle-pw').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('i');
                if (!input) return;
                if (input.type === 'password') {
                    input.type = 'text';
                    icon && icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon && icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });

        // ── Google Sign-In buttons ──
        if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => handleGoogleSignIn(googleLoginBtn));
        if (googleSignupBtn) googleSignupBtn.addEventListener('click', () => handleGoogleSignIn(googleSignupBtn));

        // ── Email Sign-Up ──
        if (signupSubmitBtn) {
            signupSubmitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (signupError) signupError.innerText = '';
                const name = signupName ? signupName.value : '';
                const email = signupEmail ? signupEmail.value : '';
                const password = signupPassword ? signupPassword.value : '';
                const confirmPassword = signupConfirmPassword ? signupConfirmPassword.value : '';

                if (password !== confirmPassword) {
                    if (signupError) signupError.innerText = 'Passwords do not match.';
                    return;
                }
                if (!name) {
                    if (signupError) signupError.innerText = 'Please enter your name.';
                    return;
                }

                const originalText = signupSubmitBtn.innerHTML;
                signupSubmitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading...';
                signupSubmitBtn.disabled = true;

                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(userCredential.user, { displayName: name });
                    closeAuthModal();
                    if (signupEmail) signupEmail.value = '';
                    if (signupPassword) signupPassword.value = '';
                    if (signupConfirmPassword) signupConfirmPassword.value = '';
                    if (signupName) signupName.value = '';
                } catch (error) {
                    if (signupError) signupError.innerText = error.message.replace('Firebase: ', '');
                } finally {
                    signupSubmitBtn.innerHTML = originalText;
                    signupSubmitBtn.disabled = false;
                }
            });
        }

        // ── Email Sign-In ──
        if (loginSubmitBtn) {
            loginSubmitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (loginError) loginError.innerText = '';
                const email = loginEmail ? loginEmail.value : '';
                const password = loginPassword ? loginPassword.value : '';

                const originalText = loginSubmitBtn.innerHTML;
                loginSubmitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading...';
                loginSubmitBtn.disabled = true;

                try {
                    await signInWithEmailAndPassword(auth, email, password);
                    closeAuthModal();
                    if (loginEmail) loginEmail.value = '';
                    if (loginPassword) loginPassword.value = '';
                } catch (error) {
                    if (loginError) loginError.innerText = 'Invalid email or password.';
                } finally {
                    loginSubmitBtn.innerHTML = originalText;
                    loginSubmitBtn.disabled = false;
                }
            });
        }

        // ── Sign Out ──
        if (dropdownSignOut) {
            dropdownSignOut.addEventListener('click', () => signOut(auth));
        }

        // ── Auth state observer ──
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                await syncUserProfile(user);
                localStorage.setItem('cinxphere_session', JSON.stringify({
                    id: user.uid,
                    name: user.displayName || user.email || "CinXphere User",
                    email: user.email || ""
                }));

                if (loginNavBtn) loginNavBtn.style.display = 'none';
                if (userAvatarMenu) userAvatarMenu.style.display = 'block';
                const initialSource = user.displayName || user.email || 'U';
                if (userAvatarCircle) userAvatarCircle.innerText = initialSource.charAt(0).toUpperCase();
                if (avatarDropdownEmail) avatarDropdownEmail.innerText = user.email || '';
                if (avatarDropdownName) avatarDropdownName.innerText = user.displayName || 'User';
            } else {
                localStorage.removeItem('cinxphere_session');
                if (loginNavBtn) loginNavBtn.style.display = 'flex';
                if (userAvatarMenu) userAvatarMenu.style.display = 'none';
                const dropdown = document.getElementById('avatarDropdown');
                if (dropdown) dropdown.style.display = 'none';
            }
        });

        // ── Avatar dropdown toggle ──
        if (userAvatarCircle) {
            userAvatarCircle.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('avatarDropdown');
                if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });
        }

        // ── Close dropdown on outside click ──
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('avatarDropdown');
            if (dropdown && dropdown.style.display === 'block' && userAvatarMenu && !userAvatarMenu.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

    } catch (err) {
        console.error('CinXphere Auth setup error:', err);
    }
});