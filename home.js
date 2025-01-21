import { auth, db } from './firebase.js';
import { doc, setDoc, collection, addDoc, getDocs, getDoc, writeBatch, serverTimestamp, query, where, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

let currentUserUid = null; // Global variable to store the user's UID

// Listen for authentication state changes
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
                    <a href="${file.url}" target="_blank">${file.name}</a>
                    <button class="delete-btn" data-id="${doc.id}">Delete</button>
                </div>
            `);
        });

        filesElement.innerHTML = fileItems.join("");


        const fileDivs = filesElement.querySelectorAll(".file-item");
        fileDivs.forEach((fileDiv, index) => {
            const deleteButton = fileDiv.querySelector(".delete-btn");
            const fileId = querySnapshot.docs[index].id;

            deleteButton.addEventListener("click", async (e) => {
                e.stopPropagation();
                try {
                    await deleteFile(fileId);
                } catch (error) {
                    console.error("Error deleting file:", error);
                }
            });
        });
    });
}

// Delete Folder
async function deleteFolder(folderId) {
    try {
        await deleteDoc(doc(db, "folders", folderId));
        console.log("Folder deleted:", folderId);
    } catch (error) {
        console.error("Error deleting folder:", error);
    }
}

// Delete File
async function deleteFile(fileId) {
    try {
        await deleteDoc(doc(db, "files", fileId));
        console.log("File deleted:", fileId);
    } catch (error) {
        console.error("Error deleting file:", error);
    }
}
