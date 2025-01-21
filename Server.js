const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = 3000;

// Firebase Configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// Enable CORS for all origins
app.use(cors());

// Serve static files from the current directory
app.use(express.static(__dirname));  // __dirname refers to the root of your project

// Multer Configuration for File Handling
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Endpoint for File Upload
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        const file = req.file;
        const userId = req.body.user_id;
        const parentId = req.body.parent_id;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // Extract the file extension
        const fileExtension = file.originalname.split('.').pop();
        const publicId = `${uuidv4()}.${fileExtension}`;

        // Upload file to Cloudinary directly from the buffer
        cloudinary.uploader.upload_stream(
            { resource_type: 'auto', public_id: publicId },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary error:', error);
                    return res.status(500).json({ message: 'Error uploading to Cloudinary.' });
                }

                // Store metadata in Firestore
                const metadata = {
                    name: file.originalname,
                    public_id: result.public_id,
                    url: result.secure_url,
                    parent_id: parentId === "0" ? null : parentId,
                    user_id: userId,
                    uploaded_at: new Date(),
                };

                try {
                    const filesRef = collection(db, 'files');
                    await addDoc(filesRef, metadata);
                    res.status(200).json({
                        message: 'File uploaded and metadata stored.',
                        fileUrl: result.secure_url,
                    });
                } catch (dbError) {
                    console.error('Firestore error:', dbError);
                    res.status(500).json({ message: 'Error saving metadata to Firestore.' });
                }
            }
        ).end(file.buffer); // Pass the file buffer to the uploader
    } catch (error) {
        console.error('Error during upload:', error); // Log the error
        res.status(500).json({ message: 'Error during upload.', error: error.message }); // Send JSON error
    }
});

// Root route to serve the index.html explicitly
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');  // Serve the index.html file explicitly
});

// Start the Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
