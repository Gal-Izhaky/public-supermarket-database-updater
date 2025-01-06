// imports
import { downloadStores } from "./modules/manager.js";
import { ref, get, set } from "firebase/database";
import { getDatabase } from "firebase-admin/database";
import { readFile } from 'fs/promises';
import * as dotenv from "dotenv";

dotenv.config();

import admin from 'firebase-admin';

// function to read the service account key
const getServiceAccount = async () => {
    try {
        const serviceAccount = await readFile(new URL('../firebaseKey.json', import.meta.url), 'utf-8')
            .then(JSON.parse);
        return serviceAccount;
    } catch (error) {
        console.error('Error reading the service account JSON:', error);
    }
}

// function to fetch all stores from the database (used for geofencing) 
const fetchStores = async (database) => {
    if (process.env.GEOFENCE_STORES !== "true"){
        return [];
    }
    const snapshot = await get(ref(database, "/supermarkets"));
    const val = snapshot.val();

    if (Array.isArray(val)) {
        return val;
    }
    return [];
};

// set the vercel server uptime duration to 60 seconds
export const config = {
    maxDuration: 60,
};

// These are the stores that use Cerberus platform for FTP, The other stores are all Shufersal.
const stores = [
    "TivTaam",
    "RamiLevi",
    "HaziHinam",
    "Stop_Market",
    "osherad",
    "doralon",
    // "Keshet",
];

// function to check if the environment variables are present
const checkEnvValidity = () => {
    const requiredVars = ['DATABASE_URL'];
    
    if (process.env.GEOCODE_STORES === 'true') {
        requiredVars.push('SUPABASE_DATABASE_URL', 'SUPABASE_API_KEY', 'HERE_API_KEY', 'HERE_URL');
    }
    
    if (process.env.GEOFENCE_STORES === 'true') {
        requiredVars.push('GEOFENCING_RADIUS', 'RADAR_URL', 'RADAR_SECRET_KEY');
    }
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        return `Missing required environment variables: ${missingVars.join(', ')}`
    }
    
    return true;
};

// request handler function
const handler = async(req, res) => {
    const now = Date.now();
    
    const envValidity = checkEnvValidity();

    if(envValidity !== true){
        return res.status(400).json({ error: envValidity });
    }

    const serviceAccount = await getServiceAccount();
    if (!serviceAccount) {
        console.error('Service account could not be loaded.');
        return res.status(500).json({ error: "Internal Server Error: Failed to load service account" });
    }
    
    const app = 
        admin.apps.length === 0 ? 
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.DATABASE_URL,
            })
        : admin.apps[0];


    const database = getDatabase(app);

    const previouslyFetchedStores = await fetchStores(database);
    const msg = await downloadStores(stores, previouslyFetchedStores).catch((err) => console.error(err));

    if (!msg) { // there was an error with the downloading.
        return res.status(404) 
    }

    // put the data into the database and return a sucess message
    const data = {
        "supermarkets": msg.stores,
        "items": msg.prices,
        "metadata": {
            "last-updated": Date.now().toString(),
            "supermarkets-counter": msg["store-counter"],
            "items-counter": msg["item-counter"],
        }
    };

    await set(ref(database, "/"), data);

    return res.json({
        "time taken to run": Date.now() - now,
        "supermarkets-counter": msg["store-counter"],
        "items-counter": msg["item-counter"],
    });
}

export default handler;