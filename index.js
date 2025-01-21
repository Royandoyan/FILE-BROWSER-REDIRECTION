import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

let currentUserUid = null; // Global variable to store the user's UID

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Show loading icon
            statusIcon.className = 'fa fa-spinner fa-spin';

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    console.log('Login successful');
                    localStorage.setItem('currentUserEmail', email);

                    // Store the UID in the global variable
                    currentUserUid = userCredential.user.uid;

                    statusIcon.className = 'fa fa-check';
                    setTimeout(() => window.location.href = "home.html", 500);
                })
                .catch((error) => {
                    loginStatus.textContent = 'Login failed. Please check your Email and Password or Sign Up.';
                    loginStatus.style.color = 'red';
                    console.error('Error during login:', error);
                });
        });
    }    
});