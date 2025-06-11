const axios = require("axios");
require('dotenv').config();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { ChatGPTAPI } = require('chatgpt');

async function fetchDataPuppeteer() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const chatGPT = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    // Navigate to login page
    await page.goto("https://realassets.maps.arcgis.com/sharing/oauth2/authorize?client_id=arcgisonline&response_type=code&state=%7B%22portalUrl%22%3A%22https%3A%2F%2Frealassets.maps.arcgis.com%22%2C%22uid%22%3A%225ECDBsteGz7F_hFG8BTniGAZKctmjXKzNVvK7MEH2TM%22%2C%22useLandingPage%22%3Atrue%2C%22clientId%22%3A%22arcgisonline%22%7D&expiration=20160&locale=en-gb&redirect_uri=https%3A%2F%2Frealassets.maps.arcgis.com%2Fhome%2Faccountswitcher-callback.html&force_login=true&redirectToUserOrgUrl=true&code_challenge=kKR3mXFlEwp3hCqbPhKM_Qa67YhX7Og8RPVBswhhZTQ&code_challenge_method=S256&display=default&hideCancel=true&showSignupOption=true&canHandleCrossOrgSignIn=true&signuptype=esri&allow_verification=true", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Login
    await page.waitForSelector('#user_username', { visible: true, timeout: 30000 });
    await page.type("#user_username", "realadmin23");
    await page.type("#user_password", "@dmin_25@r3@l@ss3ts");
    await page.click("#signIn");

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
    console.log('Login successful');

    // Navigate to Developer Credentials page
    await page.goto("https://realassets.maps.arcgis.com/home/item.html?id=f424c8bb5a53441198036d4143f1ace8#settings/developerCredentials", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Wait for the credentials section to load
    await page.waitForSelector('.credential-section__input-container', { visible: true, timeout: 30000 });

    // METHOD 1: Try to extract token from HTML input element
    let token = await page.evaluate(() => {
      const tempTokenLabel = Array.from(document.querySelectorAll('label')).find(el =>
        el.textContent.includes('Temporary Token')
      );
      if (tempTokenLabel) {
        const inputElement = tempTokenLabel.nextElementSibling.querySelector('input[type="text"]');
        return inputElement ? inputElement.value : null;
      }
      return null;
    });

    // METHOD 2: If HTML method fails, use image recognition with ChatGPT
    if (!token) {
      console.log('Token not found via HTML, trying image recognition...');

      // Take screenshot of the token area
      const tokenElement = await page.$('.credential-section__input-container') ||
        await page.$('input[aria-label*="Temporary Token"]') ||
        await page.$('input[value][type="text"]');

      if (!tokenElement) {
        throw new Error('Token element not found on the page');
      }

      const tokenScreenshotPath = path.join(__dirname, 'token_screenshot.png');
      await tokenElement.screenshot({ path: tokenScreenshotPath });

      // Use ChatGPT to read the token from the screenshot
      const imagePrompt = `Extract the temporary token value from this image. 
        The token is a long alphanumeric string. 
        Return ONLY the token value with no additional text or explanation.`;

      const chatResponse = await chatGPT.sendMessage({
        prompt: imagePrompt,
        imagePath: tokenScreenshotPath
      });

      token = chatResponse.text.trim();
    }

    if (!token) {
      throw new Error('Failed to read token using both methods');
    }

    console.log('Temporary Token extracted successfully:', token);

    // Fetch data from ArcGIS service using the token
    const dataResponse = await axios({
      url: "https://services-eu1.arcgis.com/sBKi3iHeMBn52UmO/arcgis/rest/services/service_0d769448a20d47fc9fcdb54fe849dd3e/FeatureServer/0/query",
      method: "GET",
      headers: {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: {
        where: "OBJECTID>0",
        outFields: "globalid as globalId, PLOT_NO as plotNumber,neighbourhood as Location,AREAa plotExtent,landuse as usage,no_parking as numParkingBays,dateOfInspection as inspectionDate,category as classification,category as valuationType, dev as plotDesc,landRate as Land_Rate,LandValue as Land_Value,ImpValue as Improvement_Value,MarketValue as Capital_Value, plotperimeter as Perimeter,Pool as Swimming_Pool, Paving, landscaping, NumberOfStructures as No_of_Structures,landuse as Land_Use, boundary as Boundary",
        f: "json",
        returnGeometry: false,
        token: token,
      },
    });

    console.log('Data fetched successfully');

    // Save to Remix public folder
    const outputPath = path.join(process.cwd(), 'public', 'Gabs_Inspections.json');
    fs.writeFileSync(outputPath, JSON.stringify(dataResponse.data.features, null, 2));
    console.log(`Data saved successfully to ${outputPath}`);
  } catch (error) {
    console.error("Error during Puppeteer login or data request:", error);
    await page.screenshot({ path: path.join(__dirname, 'error.png') });
  } finally {
    await browser.close();
  }
}

fetchDataPuppeteer();