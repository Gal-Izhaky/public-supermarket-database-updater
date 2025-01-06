# 🛒 Supermarket Database Updater  

**Supermarket Database Updater** is a Node.js-powered API, running on a vercel serverless function.

The API is designed to collect, process, and manage real-time supermarket data. This project fetches detailed information about supermarkets, including store locations and product prices, and updates a centralized database. It supports efficient data caching to minimize API calls, ensuring optimal performance and scalability.  


## 📖 About the Project  

This API utilizes data posted on **FTP sites** provided by major supermarket chains in compliance with the **Israeli Food Law (2015)**. This law mandates that supermarkets publicly share their product prices, store locations, and updates in a standardized digital format. By leveraging these FTP platforms, the API collects and processes this legally mandated data, ensuring accuracy and reliability for downstream applications.  

The API is being activated every week with a Cron job.

When calling the API, it fetches and processes data from multiple supermarket chains to keep the database up to date with accurate and structured information.  

## ✨ Features  

### 1. **Supermarket Data Management**  
The API collects and updates:  
- Store names, locations, and brands.  
- Product prices across all supermarkets.  
- Metadata such as the number of stores, items, and the last update timestamp.  

### 2. **Supported Supermarkets**  
The API fetches data from the following supermarket chains:  
- Shufersal Deal  
- Shufersal Sheli  
- Shufersal Yesh Hesed  
- Tiv Taam  
- Rami Levi  
- Hazi Hinam  
- Stop Market  
- Osherad  
- am:pm  

### 3. **Efficient Data Fetching**  
- **Firebase**: Serves as the primary database for storing and managing fetched data.  
- **Supabase**: Caches store locations to reduce redundant API calls.  

### 4. **Seamless Integration**  
The project is designed to run on **Vercel serverless functions**, ensuring scalability and minimal latency for production environments.  

## 🛠️ Tools & Technologies  

- **Node.js**: The core runtime environment for building the API.  
- **Firebase**: Centralized database for storing supermarket data.  
- **Supabase**: Used for caching store location data to minimize API requests.  
- **Vercel**: Hosts the API in a serverless environment for scalability and performance.  

## 🚧 How the API Works  

### **Main Script: `update-store-database.js`**  
1. **Initialization**  
   - Imports necessary scripts and libraries for managing and processing data.  

2. **Fetching Store and Price Data**  
   - Calls `manager.downloadStores` with parameters for supermarkets.  
   - Fetching logic differs based on the data source:  

   #### **Cerberus-Based Supermarkets**  
   - Uses a file-sharing platform called Cerberus.  
   - Logs in using a CSRF token and sends a request to retrieve data files.  
   - Filters and downloads the relevant files (e.g., prices and store locations).  

   #### **Shufersal Supermarkets**  
   - Scrapes the Shufersal website to extract store and product data.  
   - Downloads and processes XML and compressed files for further use.  

3. **Data Processing**  
   - Combines and formats XML files using `xmlHandler.combineStores` and `xmlHandler.combinePrices`.  
   - Ensures data is structured and ready for database updates.  

5. **Location Services**

    #### **Geocoding with HERE API**
    - Converts store addresses into precise geographical coordinates (latitude/longitude).
    - Uses Supabase to cache geocoded locations:
        - Checks cache before making new API calls
        - Stores successful geocoding results for future use
        - Reduces API usage and improves response times

    #### **Geofencing with Radar API**
    - Creates circular geofences around store locations
    - Manages store boundary updates:
    - Adds geofences for new store locations
    - Removes geofences for closed stores
    - Maintains geofence radius based on configuration
    - Enables location-based notifications and analytics

4. **Database Update**  
   - Updates the Firebase database with processed store and price data.  

### **Caching with Supabase**  
To reduce API calls, store locations are cached using Supabase. This enhances performance by minimizing redundant requests.  

## 💻 How to Run  

1. **Clone the Repository:**  
   ```console
   git clone https://github.com/Gal-Izhaky/public-supermarket-database-updater.git  
   cd public-supermarket-database-updater  
   ```
2. **Set Up Environment Variables:**

   Rename firebaseKey_example.txt to firebaseKey.json and fill out the values according to your firebase admin key

   Rename envexample.txt to .env and fill out the API keys, and URLs
3. **Install Dependencies:**
   ```console
   npm install  
   ```
4. **Run the API Locally:**

   ```console
   node update-store-database.js  
   ```
   *Note: This requires modifying the handler function for local testing.*
   *If it's the first time you are running this function, I recommend running it locally since geocoding and geofencing all the stores take a lot of time*
## 🚀 Purpose of the Project
This project serves as the backend for my High School Software Engineering class final project, [SuperReminder](https://github.com/Gal-Izhaky/SuperReminder). 

This project demonstrates my ability to design efficient backend systems by providing accurate, real-time data for use in client applications. Through this project, I explore key concepts in API development, data processing, and cloud-hosted solutions, ensuring seamless integration with the SuperReminder app.  
