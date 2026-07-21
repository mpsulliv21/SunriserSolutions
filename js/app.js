// src/app.js
// Firebase modular (v9+) single-file app logic for signup/login/profile/uploads/admin

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  listAll,
  getDownloadURL
} from "firebase/storage";

/* ============================================================
   1) Firebase config - replace values if needed (from console)
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCriOG6yBiQVQqK8uBN18p9njqG0b8h908",
  authDomain: "sunriser-solutions.firebaseapp.com",
  projectId: "sunriser-solutions",
  storageBucket: "sunriser-solutions.firebasestorage.app",
  messagingSenderId: "379327980661",
  appId: "1:379327980661:web:2fec7271e68ad06da0043c",
  measurementId: "G-26YMZY2P3P"
};

/* ============================================================
   2) Initialize Firebase services
   ============================================================ */
const app = initializeApp(firebaseConfig);
try {
  // analytics may fail in some environments (SSR), so guard it
  const analytics = getAnalytics(app);
  console.log("Analytics initialized");
} catch (e) {
  console.warn("Analytics not initialized:", e.message);
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* ============================================================
   3) AUTH: signup, login, logout, auth state
   ============================================================ */

/**
 * Create a new user with email + password
 * Expects DOM elements with ids: "email", "password"
 */
export async function signup() {
  try {
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User created:", userCredential.user.uid);
    alert("Account created!");
    // redirect to login or dashboard
    window.location.href = "login.html";
  } catch (error) {
    console.error("signup error:", error);
    alert(error.message);
  }
}

/**
 * Sign in existing user
 * Expects DOM elements with ids: "email", "password"
 */
export async function login() {
  try {
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Signed in:", userCredential.user.uid);
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("login error:", error);
    alert(error.message);
  }
}

/**
 * Sign out current user
 */
export async function logout() {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("logout error:", error);
    alert(error.message);
  }
}

/* ============================================================
   4) PROFILE: save and load profile data in Firestore
   ============================================================ */

/**
 * Save profile data to Firestore under collection "profiles" with doc id = uid
 * Expects form fields with ids matching the keys used below.
 */
export async function saveProfile() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const profileData = {
      email: user.email,
      age: document.getElementById("age")?.value || "",
      city: document.getElementById("city")?.value || "",
      employment: document.getElementById("employment")?.value || "",
      income: document.getElementById("income")?.value || "",
      housing: document.getElementById("housing")?.value || "",
      transportation: document.getElementById("transportation")?.value || "",
      food: document.getElementById("food")?.value || "",
      entertainment: document.getElementById("entertainment")?.value || "",
      misc: document.getElementById("misc")?.value || "",
      goal: document.getElementById("goal")?.value || ""
    };

    await setDoc(doc(db, "profiles", user.uid), profileData);
    alert("Profile saved!");
  } catch (error) {
    console.error("saveProfile error:", error);
    alert(error.message);
  }
}

/**
 * Load profile for current user and populate DOM elements
 * Call on dashboard/profile page load
 */
export async function loadProfile() {
  try {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const docSnap = await getDoc(doc(db, "profiles", user.uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      // populate fields if they exist
      if (document.getElementById("age")) document.getElementById("age").value = data.age || "";
      if (document.getElementById("city")) document.getElementById("city").value = data.city || "";
      if (document.getElementById("goal")) document.getElementById("goal").value = data.goal || "";
      // add other fields as needed
    } else {
      console.log("No profile document found for user:", user.uid);
    }
  } catch (error) {
    console.error("loadProfile error:", error);
  }
}

/* ============================================================
   5) DASHBOARD: simple loader
   ============================================================ */

export function initDashboard() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    // Example: show email and load profile
    const emailEl = document.getElementById("dashboard-name");
    if (emailEl) emailEl.innerText = user.email;
    await loadProfile();
  });
}

/* ============================================================
   6) STORAGE: upload receipts and list user receipts
   ============================================================ */

/**
 * Upload a receipt file selected in an <input type="file" id="receipt">
 */
export async function submitCheckin() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const fileInput = document.getElementById("receipt");
    const file = fileInput?.files?.[0];
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    const fileRef = storageRef(storage, `receipts/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    alert("Receipt uploaded!");
  } catch (error) {
    console.error("submitCheckin error:", error);
    alert(error.message);
  }
}

/**
 * List receipts for a given userId and append links to an element with id "receipts-list"
 */
export async function loadUserReceipts(userId) {
  try {
    const listEl = document.getElementById("receipts-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    const folderRef = storageRef(storage, `receipts/${userId}`);
    const res = await listAll(folderRef);

    if (res.items.length === 0) {
      listEl.innerHTML = "<li>No receipts uploaded.</li>";
      return;
    }

    for (const itemRef of res.items) {
      const url = await getDownloadURL(itemRef);
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.textContent = itemRef.name;
      li.appendChild(a);
      listEl.appendChild(li);
    }
  } catch (error) {
    console.error("loadUserReceipts error:", error);
  }
}

/* ============================================================
   7) ADMIN: list all profiles and view receipts
   ============================================================ */

/**
 * Load all user profiles into a table body with id "users-body"
 */
export async function loadAdminUsers() {
  try {
    const usersBody = document.getElementById("users-body");
    if (!usersBody) return;
    usersBody.innerHTML = "";

    const snapshot = await getDocs(collection(db, "profiles"));
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const tr = document.createElement("tr");

      const emailTd = document.createElement("td");
      emailTd.textContent = data.email || docSnap.id;

      const goalTd = document.createElement("td");
      goalTd.textContent = data.goal || "No goal set";

      const actionsTd = document.createElement("td");
      const viewBtn = document.createElement("button");
      viewBtn.textContent = "View";
      viewBtn.onclick = () => {
        showUserDetails(docSnap.id, data);
        loadUserReceipts(docSnap.id);
      };

      actionsTd.appendChild(viewBtn);
      tr.appendChild(emailTd);
      tr.appendChild(goalTd);
      tr.appendChild(actionsTd);
      usersBody.appendChild(tr);
    });
  } catch (error) {
    console.error("loadAdminUsers error:", error);
  }
}

/**
 * Show user details in an element with id "user-details"
 */
export function showUserDetails(userId, data) {
  const detailsDiv = document.getElementById("user-details");
  if (!detailsDiv) return;
  detailsDiv.innerHTML = `
    <p><strong>User ID:</strong> ${userId}</p>
    <p><strong>Email:</strong> ${data.email || "N/A"}</p>
    <p><strong>Goal:</strong> ${data.goal || "N/A"}</p>
    <p><strong>City:</strong> ${data.city || "N/A"}</p>
    <p><strong>Employment:</strong> ${data.employment || "N/A"}</p>
    <p><strong>Income:</strong> ${data.income || "N/A"}</p>
  `;
}

/* ============================================================
   8) Utility: attach functions to window for simple HTML onclick usage
   ============================================================ */
// If you prefer calling functions directly from HTML (onclick="signup()"), expose them:
window.signup = signup;
window.login = login;
window.logout = logout;
window.saveProfile = saveProfile;
window.loadProfile = loadProfile;
window.initDashboard = initDashboard;
window.submitCheckin = submitCheckin;
window.loadUserReceipts = loadUserReceipts;
window.loadAdminUsers = loadAdminUsers;
window.showUserDetails = showUserDetails;

/* ============================================================
   9) Optional: log auth state changes for debugging
   ============================================================ */
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Auth state: signed in as", user.uid);
  } else {
    console.log("Auth state: signed out");
  }
});
