const axios = require("axios");
require('dotenv').config();
const { Buffer } = require('node:buffer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const jsonFilePath = process.env.ESRI_FILE_PATH;
const jsonStructureFilePath = process.env.ESRI_STRUCTURE_PATH;


async function fetchDataPuppeteer() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto("https://realassets.maps.arcgis.com/sharing/oauth2/authorize?client_id=arcgisonline&response_type=code&state=%7B%22portalUrl%22%3A%22https%3A%2F%2Frealassets.maps.arcgis.com%22%2C%22uid%22%3A%225ECDBsteGz7F_hFG8BTniGAZKctmjXKzNVvK7MEH2TM%22%2C%22useLandingPage%22%3Atrue%2C%22clientId%22%3A%22arcgisonline%22%7D&expiration=20160&locale=en-gb&redirect_uri=https%3A%2F%2Frealassets.maps.arcgis.com%2Fhome%2Faccountswitcher-callback.html&force_login=true&redirectToUserOrgUrl=true&code_challenge=kKR3mXFlEwp3hCqbPhKM_Qa67YhX7Og8RPVBswhhZTQ&code_challenge_method=S256&display=default&hideCancel=true&showSignupOption=true&canHandleCrossOrgSignIn=true&signuptype=esri&allow_verification=true", { waitUntil: "networkidle2" });

    await page.type("#user_username", "realadmin23");
    await page.type("#user_password", "R3@l@dmin23");
    await page.click("#signIn");

    await page.waitForNavigation({ waitUntil: "networkidle2" });

    console.log('Login successful');

    // Navigate to the API Key page
    // await page.goto('https://www.esri.com/api-key-page-url'); // Replace with actual URL
    await page.goto("https://realassets.maps.arcgis.com/home/item.html?id=f424c8bb5a53441198036d4143f1ace8#settings");

    // Extract the API Key
    const apiKey = await page.evaluate(() => {
      // Replace the selector with the actual one where the API Key is displayed
      return document.querySelector('#api-key-selector').textContent;
      // return localStorage.getItem('#token-key');
    });

    console.log('API Key:', apiKey);

    if (!apiKey) throw new Error('Login failed or token not found');

    const dataResponse = await axios({
      url: "https://services-eu1.arcgis.com/sBKi3iHeMBn52UmO/ArcGIS/rest/services/Ftown_Consolidation_gdb/FeatureServer/0/query",
      method: "GET",
      headers: {
        Host: "services-eu1.arcgis.com",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: {
        where: "OBJECTID>0",
        objectIds: "",
        geometry: "",
        geometryType: "esriGeometryEnvelope",
        inSR: "",
        spatialRel: "esriSpatialRelIntersects",
        resultType: "standard",
        distance: "0.0",
        units: "esriSRUnit_Meter",
        relationParam: "",
        returnGeodetic: false,
        outFields:
          "globalid as globalId,plot_number as plotNumber,Location,Area_ as plotExtent,Land_Use as usage,No_Of_Parking_Spaces as numParkingBays,Date_of_Inspection as inspectionDate,Category as classification,Category as valuationType, Development_Status as plotDesc, Land_Rate, Land_Value, Improvement_Value, Capital_Value, Perimeter_ as Perimeter, Swimming_Pool, Paving, Landscaping, No_Of_Structures_ as No_of_Structures, Land_Use, Boundry as Boundary, Swimming_Pool as SwimmingPool, Zone",
        f: "json",
        returnHiddenFields: false,
        returnGeometry: false,
        featureEncoding: "esriDefault",
        multipatchOption: "xyFootprint",
        maxAllowableOffset: "",
        geometryPrecision: "",
        outSR: "",
        defaultSR: "",
        datumTransformation: "",
        applyVCSProjection: false,
        returnIdsOnly: false,
        returnUniqueIdsOnly: false,
        returnCountOnly: false,
        returnExtentOnly: false,
        returnQueryGeometry: false,
        returnDistinctValues: false,
        cacheHint: false,
        collation: "",
        orderByFields: "",
        groupByFieldsForStatistics: "",
        outStatistics: "",
        having: "",
        resultOffset: "",
        resultRecordCount: "",
        returnZ: false,
        returnM: false,
        returnTrueCurves: false,
        returnExceededLimitFeatures: true,
        quantizationParameters: "",
        sqlFormat: "",
        f: "pjson",
        token: token,
      },
    });

    console.log('Puppeteer Schema: ', dataResponse.data.features);

    const options = { mode: 0o755 }; // Set file permissions to rw-r--r--

    fs.writeFileSync(
      jsonFilePath + "/puppeteer",// Write the data to a file
      JSON.stringify(dataResponse.data.features),
      options,
    );
    console.log(`ESRI Form Data saved successfully to ${jsonFilePath}`);
  } catch (error) {
    console.error("Error during Puppeteer login or data request:", error);
  } finally {
    await browser.close();
  }
}










// READ FORM DATA FROM JSON
async function fetchData() {
  // SAVE THE JSON DATA TO A JSON FILE
  const fs = require("fs");
  const apiRequests = [
    {
      // POST request to generate an access token from Esri
      url: "https://www.arcgis.com/sharing/rest/oauth2/token",
      method: "POST",
      headers: {
        Host: "services-eu1.arcgis.com",
        Port: 443,
        Accept: "*/*",
        "Content-Length": 0,
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        redirect_url:
          "https://realassets.maps.arcgis.com/home/item.html?id=d404ffc059f64fbdb8332bbd91c043cf#data",
        client_id: "i21HTuYWxw7ZBanB",
        client_secret: "4da3176d058b4ec4909baf232865215c",
        grant_type: "client_credentials",
      }).toString(),
    },
    {
      url: "https://services-eu1.arcgis.com/sBKi3iHeMBn52UmO/arcgis/rest/services/ZoneA_gdb_(2)/FeatureServer/0/query",
      method: "GET",
      headers: {
        Host: "services-eu1.arcgis.com",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: (token) => ({
        where: "Status='Site Inspected'",
        fullText: "",
        objectIds: "",
        time: "",
        geometry: "",
        geometryType: "esriGeometryEnvelope",
        spatialRel: "esriSpatialRelIntersects",
        resultType: "standard",
        distance: "0.0",
        units: "esriSRUnit_Meter",
        relationParam: "",
        returnGeodetic: false,
        f: "json",
        returnHiddenFields: false,
        returnGeometry: false,
        featureEncoding: "esriDefault",
        multipatchOption: "xyFootprint",
        // outFields: "*",
        outFields:
          "globalid as globalId,plot_number as plotNumber,Location,Area_ as plotExtent,Land_Use as usage,No_Of_Parking_Spaces as numParkingBays,Date_of_Inspection as inspectionDate,Category as classification,Category as valuationType, Development_Status as plotDesc, Land_Rate, Land_Value, Improvement_Value, Capital_Value, Perimeter_ as Perimeter, Swimming_Pool, Paving, Landscaping, No_Of_Structures_ as No_of_Structures, Land_Use, Boundry as Boundary, Swimming_Pool as SwimmingPool",
        maxAllowableOffset: "",
        geometryPrecision: "",
        defaultSR: "",
        datumTransformation: "",
        applyVCSProjection: false,
        returnIdsOnly: false,
        returnUniqueIdsOnly: false,
        returnCountOnly: false,
        returnExtentOnly: false,
        returnQueryGeometry: false,
        returnDistinctValues: false,
        cacheHint: false,
        orderByFields: "",
        groupByFieldsForStatistics: "",
        outStatistics: "",
        having: "",
        resultOffset: "",
        resultRecordCount: "",
        returnZ: false,
        returnM: false,
        returnTrueCurves: false,
        returnExceededLimitFeatures: false,
        quantizationParameters: "",
        sqlFormat: "",
        token: token,
      }),
    },
  ];

  try {
    // Execute the first request to obtain the token
    const tokenResponse = await axios(apiRequests[0]);
    const token = tokenResponse.data.access_token; // Adjust accordingly based on the API response structure

    const dataResponse = await axios({
      ...apiRequests[1],
      params: apiRequests[1].params(token),
    });

    try {
      const options = { mode: 0o755 }; // Set file permissions to rw-r--r--

      fs.writeFileSync(
        jsonFilePath,
        JSON.stringify(dataResponse.data.features),
        options,
      );
      // console.log(dataResponse.data.features);
      console.log(`ESRI Form Data saved successfully to ${jsonFilePath}`);
    } catch (e) {
      console.error(`Error saving data: ${e}`);
    }
  } catch (error) {
    console.error("Error during API requests:", error);
  }
}

// READ STRUCTURE DATA FROM JSON
async function fetchStructureData() {
  // SAVE THE JSON DATA TO A JSON FILE
  const fs = require("fs");
  const apiRequests = [
    {
      // POST request to generate an access token from Esri
      url: "https://www.arcgis.com/sharing/rest/oauth2/token",
      method: "POST",
      headers: {
        Host: "services-eu1.arcgis.com",
        Port: 443,
        Accept: "*/*",
        "Content-Length": 0,
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        redirect_url:
          "https://realassets.maps.arcgis.com/home/item.html?id=d404ffc059f64fbdb8332bbd91c043cf#data",
        client_id: "i21HTuYWxw7ZBanB",
        client_secret: "4da3176d058b4ec4909baf232865215c",
        grant_type: "client_credentials",
      }).toString(),
    },
    {
      url: "https://services-eu1.arcgis.com/sBKi3iHeMBn52UmO/arcgis/rest/services/ZoneA_gdb_(2)/FeatureServer/1/query",
      method: "GET",
      headers: {
        Host: "services-eu1.arcgis.com",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: (token) => ({
        where: "objectid>0",
        objectIds: "",
        resultType: "standard",
        outFields: "*",
        returnIdsOnly: false,
        returnUniqueIdsOnly: false,
        returnCountOnly: false,
        returnDistinctValues: false,
        cacheHint: false,
        orderByFields: "",
        groupByFieldsForStatistics: "",
        outStatistics: "",
        having: "",
        resultOffset: "",
        resultRecordCount: "",
        sqlFormat: "none",
        f: "pjson",
        token: token,
      }),
    },
  ];

  try {
    // Execute the first request to obtain the token
    const tokenResponse = await axios(apiRequests[0]);
    const token = tokenResponse.data.access_token; // Adjust accordingly based on the API response structure

    const dataResponse = await axios({
      ...apiRequests[1],
      params: apiRequests[1].params(token),
    });

    try {
      const options = { mode: 0o755 }; // Set file permissions to rw-r--r--

      fs.writeFileSync(
        jsonStructureFilePath,
        JSON.stringify(dataResponse.data.features),
        options,
      );
      // console.log(dataResponse.data.features);
      console.log(
        `ESRI Structure Data saved successfully to ${jsonStructureFilePath}`,
      );
    } catch (e) {
      console.error(`Error saving Structure data: ${e}`);
    }
  } catch (error) {
    console.error("Error during API requests:", error);
  }
}

// fetchStructureData();
fetchData();
// fetchDataPuppeteer();

