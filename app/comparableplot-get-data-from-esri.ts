import axios from "axios";
import * as dotenv from "dotenv";
import fs from "fs";
import { URLSearchParams } from "url";

// Load environment variables
dotenv.config();

// Define file paths
const jsonFilePath = process.env.ESRI_FILE_PATH || "./formData.json";
const jsonStructureFilePath = process.env.ESRI_STRUCTURE_PATH || "./structureData.json";

// Define types for API responses
interface TokenResponse {
    access_token: string;
    expires_in: number;
    [key: string]: any;
}

interface FeatureResponse {
    features: any[];
    error?: any;
    [key: string]: any;
}

// Cache for the token
let tokenCache: { token: string; expiresAt: number } | null = null;

// Function to generate a new token or return cached valid token
async function generateToken(): Promise<string> {
    // Return cached token if it's still valid (with 5 minute buffer)
    if (tokenCache && tokenCache.expiresAt > Date.now() + 300000) {
        return tokenCache.token;
    }

    try {
        const response = await axios.post<TokenResponse>(
            "https://www.arcgis.com/sharing/rest/oauth2/token",
            new URLSearchParams({
                client_id: process.env.ESRI_CLIENT_ID || "",
                client_secret: process.env.ESRI_CLIENT_SECRET || "",
                grant_type: "client_credentials",
            }).toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        if (!response.data.access_token) {
            throw new Error("Failed to generate token. Check client_id and client_secret.");
        }

        // Cache the token with expiration time
        tokenCache = {
            token: response.data.access_token,
            expiresAt: Date.now() + (response.data.expires_in * 1000)
        };

        console.log("Token generated successfully, expires in:", response.data.expires_in, "seconds");
        console.log("Token:", response.data.access_token);
        console.log("Generated new token");
        return response.data.access_token;
    } catch (error: any) {
        console.error("Error generating token:", error.response?.data || error.message);
        throw error;
    }
}

// Function to make authenticated requests to ESRI FeatureLayer
async function makeFeatureLayerRequest(url: string, params: Record<string, any>): Promise<FeatureResponse> {
    const token = await generateToken();

    try {
        const response = await axios.get<FeatureResponse>(url, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            params: {
                ...params,
                token: token,
                f: "json"
            }
        });

        if (response.data.error) {
            console.error("API Error:", response.data.error);
            throw new Error(response.data.error.message || "Error in FeatureLayer response");
        }

        return response.data;
    } catch (error: any) {
        console.error("FeatureLayer request failed:", error.response?.data || error.message);
        throw error;
    }
}

// Function to fetch data from ESRI
async function fetchData(): Promise<void> {
    try {
        const featureData = await makeFeatureLayerRequest(
            "https://services-eu1.arcgis.com/sBKi3iHeMBn52UmO/arcgis/rest/services/service_0d769448a20d47fc9fcdb54fe849dd3e/FeatureServer/0/query",
            {
                where: "Status='Site Inspected'",
                outFields: process.env.ESRI_OUT_FIELDS || "*",
                returnGeometry: false
            }
        );

        if (!featureData.features || !Array.isArray(featureData.features)) {
            throw new Error("Invalid API response: features data is missing or not an array.");
        }

        if (featureData.features.length === 0) {
            console.warn("No features found in the API response.");
            return;
        }

        // Save data to file
        fs.writeFileSync(jsonFilePath, JSON.stringify(featureData.features, null, 2), { mode: 0o755 });
        console.log(`ESRI Form Data saved successfully to ${jsonFilePath}`);
    } catch (error: any) {
        console.error("Error fetching data:", error.message);
    }
}

// Function to fetch structure data from ESRI
async function fetchStructureData(): Promise<void> {
    try {
        const featureData = await makeFeatureLayerRequest(
            "https://services-eu1.arcgis.com/sBKi3iHeMBn52UmO/ArcGIS/rest/services/service_0d769448a20d47fc9fcdb54fe849dd3e/FeatureServer/1/query",
            {
                where: "objectid>0",
                outFields: "*",
                returnGeometry: false
            }
        );

        if (!featureData.features || !Array.isArray(featureData.features)) {
            throw new Error("Invalid API response: features data is missing or not an array.");
        }

        if (featureData.features.length === 0) {
            console.warn("No features found in the API response.");
            return;
        }

        // Save structure data to file
        fs.writeFileSync(jsonStructureFilePath, JSON.stringify(featureData.features, null, 2), { mode: 0o755 });
        console.log(`ESRI Structure Data saved successfully to ${jsonStructureFilePath}`);
    } catch (error: any) {
        console.error("Error fetching structure data:", error.message);
    }
}

// Execute the functions
async function main() {
    try {
        await fetchData();
        await fetchStructureData();
    } catch (error) {
        console.error("Script failed:", error);
        process.exit(1);
    }
}

main();
