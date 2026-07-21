/****************************************************
 * 1. FIREBASE CONFIGURATION
 ****************************************************/

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

console.log("app.js loaded");
console.log("firebase apps count:", firebase.apps ? firebase.apps.length : "no firebase");
console.log("auth object exists:", typeof firebase.auth === "function");

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

/****************************************************
 * 2. AUTHENTICATION (SIGNUP + LOGIN + LOGOUT)
 ****************************************************/

function signup() {
    console.log("signup() called");
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;
    console.log("email:", email, "password length:", password ? password.length : 0);

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    if (!auth) {
        console.error("auth is undefined");
        alert("Authentication not initialized");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            console.log("createUser success");
            alert("Account created!");
            window.location.href = "login.html";
        })
        .catch(error => {
            console.error("createUser error:", error);
            alert(error.message);
        });
}

/****************************************************
 * 3. PROFILE SAVING (FIRESTORE)
 ****************************************************/

function saveProfile() {
    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in.");
        return;
    }

    const profileData = {
        email: user.email,
        age: document.getElementById("age").value,
        city: document.getElementById("city").value,
        employment: document.getElementById("employment").value,
        income: document.getElementById("income").value,
        housing: document.getElementById("housing").value,
        transportation: document.getElementById("transportation").value,
        food: document.getElementById("food").value,
        entertainment: document.getElementById("entertainment").value,
        misc: document.getElementById("misc").value,
        goal: document.getElementById("goal").value
    };

    db.collection("profiles").doc(user.uid).set(profileData)
        .then(() => alert("Profile saved!"))
        .catch(error => alert(error.message));
}

/****************************************************
 * 4. DASHBOARD LOADING (FIRESTORE)
 ****************************************************/

function loadDashboard() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        db.collection("profiles").doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    document.getElementById("dashboard-name").innerText = user.email;
                    document.getElementById("dashboard-goal").innerText = data.goal || "No goal set";
                }
            });
    });
}

/****************************************************
 * 5. RECEIPT UPLOADS (STORAGE)
 ****************************************************/

function submitCheckin() {
    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in.");
        return;
    }

    const file = document.getElementById("receipt").files[0];

    if (!file) {
        alert("Please upload a receipt.");
        return;
    }

    const storageRef = storage.ref("receipts/" + user.uid + "/" + file.name);

    storageRef.put(file)
        .then(() => alert("Receipt uploaded!"))
        .catch(error => alert(error.message));
}

/****************************************************
 * 6. ADMIN DASHBOARD (VIEW USERS + RECEIPTS)
 ****************************************************/

function initAdmin() {
    auth.onAuthStateChanged(user => {
        loadAdminUsers();
    });
}

function loadAdminUsers() {
    const usersBody = document.getElementById("users-body");
    usersBody.innerHTML = "";

    db.collection("profiles").get().then(snapshot => {
        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement("tr");

            const emailTd = document.createElement("td");
            emailTd.textContent = data.email || doc.id;

            const goalTd = document.createElement("td");
            goalTd.textContent = data.goal || "No goal set";

            const actionsTd = document.createElement("td");
            const viewBtn = document.createElement("button");
            viewBtn.textContent = "View";
            viewBtn.onclick = () => {
                showUserDetails(doc.id, data);
                loadUserReceipts(doc.id);
            };

            actionsTd.appendChild(viewBtn);
            tr.appendChild(emailTd);
            tr.appendChild(goalTd);
            tr.appendChild(actionsTd);

            usersBody.appendChild(tr);
        });
    });
}

function showUserDetails(userId, data) {
    const detailsDiv = document.getElementById("user-details");
    detailsDiv.innerHTML = `
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Email:</strong> ${data.email || "N/A"}</p>
        <p><strong>Goal:</strong> ${data.goal || "N/A"}</p>
        <p><strong>City:</strong> ${data.city || "N/A"}</p>
        <p><strong>Employment:</strong> ${data.employment || "N/A"}</p>
        <p><strong>Income:</strong> ${data.income || "N/A"}</p>
    `;
}

function loadUserReceipts(userId) {
    const list = document.getElementById("receipts-list");
    list.innerHTML = "";

    const ref = storage.ref("receipts/" + userId);

    ref.listAll().then(result => {
        if (result.items.length === 0) {
            const li = document.createElement("li");
            li.textContent = "No receipts uploaded.";
            list.appendChild(li);
            return;
        }

        result.items.forEach(item => {
            item.getDownloadURL().then(url => {
                const li = document.createElement("li");
                const link = document.createElement("a");
                link.href = url;
                link.target = "_blank";
                link.textContent = item.name;
                li.appendChild(link);
                list.appendChild(li);
            });
        });
    });
}
