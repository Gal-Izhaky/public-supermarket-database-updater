// imports
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

// constants
const RADAR_API_URL = process.env.RADAR_URL;
const RADAR_API_KEY = process.env.RADAR_SECRET_KEY;
const GEOFENCE_RADIUS = parseInt(process.env.GEOFENCING_RADIUS) || 1000;
const BATCH_SIZE = 10;
const REQUEST_DELAY = 1000;

// Function to get a unique identified for a store
const storeKey = (store) =>  `${store.latitude}_${store.longitude}`

// Function to format location data for Radar API
const getLocationData = (store) => {
    const { brand, city, address, latitude, longitude } = store;

    return {
        coordinates: [longitude, latitude],
        tag: "supermarkets",
        externalId: storeKey(store),
        description: `${brand} - ${address}, ${city}`,
    };
};

// Function to delete a single geofence
const deleteGeofence = async (store, i) => {
    const locationData = getLocationData(store);
    const DELETE_URL = `${RADAR_API_URL}/${locationData.tag}/${locationData.externalId}`;

    try {
        const response = await axios.delete(DELETE_URL, {
            headers: {
                Authorization: RADAR_API_KEY,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error deleting geofence ${i}:`, error.response.data);
    }
};

// Function to delete all geofences
const deleteGeofences = async (stores) => {
    for (let i = 0; i < stores.length; i += BATCH_SIZE) {
        const batch = stores.slice(i, Math.min(i + BATCH_SIZE, stores.length));
        const promises = batch.map((store, idx) => deleteGeofence(store, i + idx));
        await Promise.all(promises);
        await delay(REQUEST_DELAY);
    }
};

// Function to add a single geofence
const addGeofence = async (store, i) => {
    const locationData = getLocationData(store);

    const geofenceData = {
        description: locationData.description,
        type: "circle", 
        coordinates: locationData.coordinates,
        radius: GEOFENCE_RADIUS,
        tag: locationData.tag,
        externalId: locationData.externalId,
    };

    try {
        const response = await axios.post(RADAR_API_URL, geofenceData, {
            headers: {
                Authorization: RADAR_API_KEY,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error adding geofence ${i}:`, error.response.data);
    }
};

// Helper function to add delay between requests
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to add all geofences with rate limiting
const addGeofences = async (stores) => {
    for (let i = 0; i < stores.length; i += BATCH_SIZE) {
        const batch = stores.slice(i, Math.min(i + BATCH_SIZE, stores.length));
        const promises = batch.map((store, idx) => addGeofence(store, i + idx));
        await Promise.all(promises);
        await delay(REQUEST_DELAY);
    }
};

// main function to handle geofencing
const handleGeofencing = async (stores, previouslyFetchedStores) => {
    // Create a hash map for current stores
    const previouslyFetchedStoresMap = new Map(
        previouslyFetchedStores.map(store => [
            storeKey(store),
            store
        ])
    );

    // Create a hash map for new stores
    const storesMap = new Map(
        stores.map(store => [
            storeKey(store),
            store
        ])
    );

    const newStores = stores.filter(store => 
        !previouslyFetchedStoresMap.has(storeKey(store))
    );

    const removedStores = previouslyFetchedStores.filter(store => 
        !storesMap.has(storeKey(store))
    );

    await addGeofences(newStores);
    await deleteGeofences(removedStores);
}


export { handleGeofencing };
