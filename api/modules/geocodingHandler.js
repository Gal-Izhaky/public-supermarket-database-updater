// imports
import axios from "axios";
import { createClient } from '@supabase/supabase-js';

import { handleGeofencing } from "./geofencingHandler.js";

import * as dotenv from 'dotenv';

dotenv.config();

// constants
const HERE_URL = `${process.env.HERE_URL}?apiKey=${process.env.HERE_API_KEY}`;
const API_BATCH_SIZE = 5;

const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

// remove all unneeded characters from the address
const trimAdress = (address) => {
    return address
        .trim()
        .replaceAll('-', '')
        .replaceAll(' ','')
        .replaceAll("יפו", '');
}

// translate some of the brands to be able to geocode them
const replaceBrand = (brand) => {
    return brand
        .replaceAll("TivTaam", "טיב טעם")
        .replaceAll("RamiLevi", "רמי לוי")
        .replaceAll("HaziHinam", "חצי חינם")
        .replaceAll("osherad", "אושר עד")
        .replaceAll("Stop_Market", "סטופ מרקט");
}

// get all the already resolved addresses
const getCache = async () => {
    const supabase = createClient(SUPABASE_DATABASE_URL, SUPABASE_API_KEY);

    // Fetch data from the 'location_cache' table
    const { data, error } = await supabase
        .from('location_cache')
        .select('*');  // This selects all rows and columns

    if (error) {
        console.error('Error reading data:', error);
        return;
    }

    const locationCache = {}

    for(const store of data){
        locationCache[trimAdress(replaceBrand(store.address))] = {lat:store.latitude, lon:store.longitude}
    }
    
    return locationCache
};

// add addresses to the cache (in supabase)
const updateCache = async (stores) => {
    if(!stores.length){
        return 
    }
    const supabase = createClient(SUPABASE_DATABASE_URL, SUPABASE_API_KEY);

    const transformedData = stores.map((store) => {
        const { brand, address, city, latitude, longitude } = store;
        const fullAddress = `${brand}, ${address}, ${city}, ישראל`;

        return {
            address: fullAddress,
            latitude: latitude,
            longitude: longitude,
        }
    })
    const { data, error } = await supabase
        .from('location_cache')
        .insert(transformedData);

    if (error) {
        console.error('Error uploading data:', error);
    }
}

// sleep function
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// function to fetch the location of the store and add returning the updated store's object
const getLanLng = async (store) => {
    try{
        const { brand, address, city } = store;
        const fullAddress = `${brand}, ${address}, ${city}, ישראל`;

        const response = await axios.get(`${HERE_URL}&q=${fullAddress}`);
    
        const data = response.data.items[0].position;
    
        const lat = data.lat;
        const lon = data.lng;
    
        return {...store, latitude: lat, longitude: lon};
    }catch(err){
        console.log("Could not geocode store: ", store)
        return {...store, latitude: 0, longitude: 0};
    }
};

// function to fetch the location of all of the provided stores, while splitting into batches to avoid API rate limiting.
const resolveAddresses = async (stores) => {
    const updatedStores = [];

    for (let i = 0; i < stores.length; i += API_BATCH_SIZE) {
        const batch = stores.slice(i, i + API_BATCH_SIZE);

        // Resolve each store in the batch
        const updatedBatch = await Promise.all(batch.map(getLanLng));
        updatedStores.push(...updatedBatch);

        if (i + API_BATCH_SIZE < stores.length) {
            await delay(1100);
        }
    }

    return updatedStores;
};

// function that gets a list of stores and returns the list with each of the store having a lat and lng attributes (location)
const geocodeStores = async (stores, previouslyFetchedStores) => {
    if(process.env.GEOCODE_STORES !== "true"){
        return stores
    }
    
    const cache = await getCache();

    const unresolvedAdresses = [];

    for (let i = stores.length - 1; i >= 0; i--) {
        const { brand, address, city } = stores[i];
        const fullAddress = `${brand}, ${address}, ${city}, ישראל`;

        const fullAddressTrimmed = trimAdress(fullAddress);
        const cacheValues = cache[fullAddressTrimmed];

        // if the address was already geocoded before 
        if (cacheValues) {
            stores[i] = {
                ...stores[i], 
                latitude: cacheValues.lat,
                longitude: cacheValues.lon,
            }
            continue
        }

        // not geocoded before => add it to an array, remove from the original array, geocode it and add it to the cache
        unresolvedAdresses.push(stores[i]);  // Extract unresolved store

        stores.splice(i, 1);  // Remove the unresolved store from the original array
    }
    const resolvedNow = await resolveAddresses(unresolvedAdresses);
    
    await updateCache(resolvedNow)

    stores = stores.concat(resolvedNow)
    
    const fullyResolved = []
    for(const store of stores){
        if(store.latitude !== 0){
            fullyResolved.push(store)
        }
    }

    if(process.env.GEOFENCE_STORES === "true"){
        await handleGeofencing(fullyResolved, previouslyFetchedStores)
    }

    return fullyResolved
}

export default geocodeStores;   