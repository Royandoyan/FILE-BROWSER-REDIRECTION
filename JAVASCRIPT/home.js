import { auth, db } from './firebase.js';
import { doc, setDoc, collection, addDoc, getDocs, getDoc, writeBatch, serverTimestamp, query, where, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

let currentUserUid = null; // Global variable to store the user's UID

// Listen for authentication state changes
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        console.log("User is authenticated, UID:", currentUserUid);
        loadFolders(); // Load folders once the user is authenticated
    } else {
        currentUserUid = null;
        console.error("User is not authenticated.");
        // Optionally, redirect to login page if required
    }
});

// Function to create a folder
async function createFolder() {
    const folderName = document.getElementById('folderName').value.trim(); // Trim to avoid whitespace-only names
    const parentId = document.getElementById('currentParentId').value; // Get parent ID from the input (or wherever you are storing the parent ID)

    if (!currentUserUid) {
        console.error("User is not authenticated. Cannot create folder.");
        return;
    }

    if (folderName !== '') {
        try {
            const folderRef = collection(db, "folders"); // Reference to the Firestore collection
            await addDoc(folderRef, {
                name: folderName,
                parent_id: parentId === "0" ? null : parentId, // If parentId is "0", set it to null (indicating root)
                user_id: currentUserUid, // Include the user's ID
                created_at: serverTimestamp() // Optional: Add a timestamp for folder creation
            });

            console.log("Folder created successfully!");
            //loadFolders(parentId); // Immediately refresh the folders display inside the current folder
            document.getElementById('folderName').value = ""; // Clear the input field
        } catch (error) {
            console.error("Error creating folder:", error);
        }
    } else {
        console.warn("Folder name cannot be empty."); // Optional: Warn about empty folder name
    }
}

// Function to load folders and files
function loadFolders(parentId = 0) {
    if (!currentUserUid) {
        console.error("User is not authenticated. Cannot load folders and files.");
        return;
    }

    console.log("Loading folders and files for parentId:", parentId);
    const foldersElement = document.getElementById('folders');
    const filesElement = document.getElementById('files'); // New element for files
    foldersElement.innerHTML = ""; // Clear current folder view
    filesElement.innerHTML = ""; // Clear current file view

    const effectiveParentId = parentId === 0 ? null : parentId;

    // Load folders
    const foldersRef = collection(db, "folders");
    const folderQuery = query(
        foldersRef,
        where("parent_id", "==", effectiveParentId),
        where("user_id", "==", currentUserUid)
    );

    const unsubscribeFolders = onSnapshot(folderQuery, (querySnapshot) => {
        if (querySnapshot.metadata.hasPendingWrites) {
            console.log("Waiting for Firestore sync...");
            return;
        }

        const folderItems = [];
        querySnapshot.forEach((doc) => {
            const folder = doc.data();
            folderItems.push(`
                <div class="folder-item">
                    <img src="../folder.png" class="folder-icon">
                    <span class="folder-text">${folder.name}</span>
                    <button class="delete-btn" data-id="${doc.id}">Delete</button>
                </div>
            `);
        });

        foldersElement.innerHTML = folderItems.join("");

        const folderDivs = foldersElement.querySelectorAll(".folder-item");
        folderDivs.forEach((folderDiv, index) => {
            const deleteButton = folderDiv.querySelector(".delete-btn");
            const folderId = querySnapshot.docs[index].id;

            folderDiv.addEventListener("click", () => openFolder(folderId));
            deleteButton.addEventListener("click", async (e) => {
                e.stopPropagation();
                try {
                    await deleteFolder(folderId);
                } catch (error) {
                    console.error("Error deleting folder:", error);
                }
            });
        });
    });

    // Load files
    const filesRef = collection(db, "files");
    const fileQuery = query(
        filesRef,
        where("parent_id", "==", effectiveParentId),
        where("user_id", "==", currentUserUid)
    );

    const unsubscribeFiles = onSnapshot(fileQuery, (querySnapshot) => {
        if (querySnapshot.metadata.hasPendingWrites) {
            console.log("Waiting for Firestore sync...");
            return;
        }

        const fileItems = [];
        querySnapshot.forEach((doc) => {
            const file = doc.data();
            fileItems.push(`
                <div class="file-item">
                    <img src="../file.png" class="file-icon" alt="File Icon">
                    <a href="${file.url}" target="_blank" class="file-link">${file.name}</a>
                    <button class="delete-btn" data-id="${doc.id}">Delete</button>
                </div>
            `);
        });

        filesElement.innerHTML = fileItems.join("");

        const deleteButtons = filesElement.querySelectorAll(".delete-btn");
        deleteButtons.forEach((button, index) => {
            const fileId = querySnapshot.docs[index].id;

            button.addEventListener("click", async (e) => {
                e.stopPropagation();
                try {
                    await deleteFile(fileId);
                } catch (error) {
                    console.error("Error deleting file:", error);
                }
            });
        });
    });

    return { unsubscribeFolders, unsubscribeFiles };
}




// Open folder
function openFolder(folderId) {
    loadFolders(folderId); // Pass the folder ID to load subfolders
    document.getElementById('currentParentId').value = folderId; // Update the currentParentId input with the folder ID
}

// Function to delete folder from Firestore
async function deleteFolder(folderId) {
    const folderDocRef = doc(db, "folders", folderId); // Get reference to the folder document

    try {
        // Optionally: Check if the folder exists before deleting (avoids unnecessary errors)
        const folderSnap = await getDoc(folderDocRef);
        if (!folderSnap.exists()) {
            console.warn(`Folder with ID ${folderId} does not exist.`);
            return; // Exit if the folder doesn't exist
        }

        // Delete subfolders if any
        const subfoldersRef = collection(db, "folders");
        const subfoldersQuery = query(subfoldersRef, where("parent_id", "==", folderId));
        const subfoldersSnapshot = await getDocs(subfoldersQuery);

        const batch = writeBatch(db);
        subfoldersSnapshot.forEach((subfolder) => {
            const subfolderRef = doc(db, "folders", subfolder.id);
            batch.delete(subfolderRef); // Add subfolder to the batch delete
        });

        batch.delete(folderDocRef); // Add the main folder to the batch delete
        await batch.commit(); // Execute batch delete in a single network call

        console.log(`Folder ${folderId} and its subfolders successfully deleted!`);
    } catch (error) {
        console.error("Error deleting folder: ", error);
        throw error; // Re-throw the error to handle it in the caller function
    }
}


// Attach event listeners
window.onload = function () {
    //loadFolders(); // Load root folders on page load

    // Attach event listener to the "Create Folder" button
    const createFolderButton = document.querySelector(".add-folder .right");
    if (createFolderButton) {
        createFolderButton.addEventListener("click", createFolder);
    }
};

// Add the event listener for the logout button
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutButton'); // Ensure your button has this ID

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                // Log out the user
                await signOut(auth);
                console.log("User logged out successfully!");

                // Redirect to another HTML file
                window.location.href = '../index.html'; // Change to the desired file
            } catch (error) {
                console.error("Error logging out:", error);
            }
        });
    } else {
        console.error("Logout button not found!");
    }
});

async function deleteFile(fileId) {
    try {
        const fileRef = doc(db, "files", fileId);
        await deleteDoc(fileRef);
        console.log(`File with ID ${fileId} deleted successfully.`);
    } catch (error) {
        console.error("Error deleting file:", error);
    }
}





const fileInput = document.getElementById('fileUpload');

fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    // Get the current user UID and parent ID
    const currentUserUid = auth.currentUser ? auth.currentUser.uid : null;
    const parentId = document.getElementById('currentParentId').value;

    if (!currentUserUid) {
        console.error("User is not authenticated. Cannot upload file.");
        return;
    }

    formData.append('user_id', currentUserUid);
    formData.append('parent_id', parentId);

    try {
        const response = await fetch('https://advance-realtime-folder.onrender.com/upload', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        if (response.ok) {
            alert(`File uploaded successfully: ${result.fileUrl}`);
        } else {
            console.error('Upload failed:', result.message);
            alert('File upload failed.');
        }
    } catch (error) {
        console.error('Error during upload:', error);
        alert('An error occurred during upload.');
    }
});