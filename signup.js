import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.getElementById('signupButton').addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageElement = document.getElementById('message');

    if (password !== confirmPassword) {
        messageElement.textContent = "Passwords do not match.";
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            uid: user.uid
        });

        messageElement.style.color = "green";
        messageElement.textContent = "Sign-up successful! Redirecting...";

        setTimeout(() => window.location.href = "index.html", 1000);
    } catch (error) {
        messageElement.textContent = error.message;
    }
});