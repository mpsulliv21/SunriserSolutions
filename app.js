// --- ADMIN DASHBOARD ---

function initAdmin() {
    // Optional: require login
    auth.onAuthStateChanged(user => {
        if (!user) {
            // If you want to restrict admin:
            // window.location.href = "login.html";
        }
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
    }).catch(err => {
        console.error("Error loading users:", err);
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
    }).catch(err => {
        console.error("Error loading receipts:", err);
    });
}

const user = auth.currentUser;

const profileData = {
    email: user.email,
    // ...rest of your fields
};

