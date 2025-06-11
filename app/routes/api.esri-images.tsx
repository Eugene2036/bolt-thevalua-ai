import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import puppeteer from "puppeteer";

export const action: ActionFunction = async ({ request }) => {
    const formData = await request.formData();
    const plotNumber = formData.get("plotNumber") as string;

    if (!plotNumber) {
        return json({ error: "Plot number is required" }, { status: 400 });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=250px,250px',
            ],
            timeout: 120000
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(120000);
        page.setDefaultTimeout(60000);

        // Step 1: Login
        console.log("Navigating to login page...");
        await page.goto("https://realassets.maps.arcgis.com/sharing/oauth2/authorize?client_id=arcgisonline&response_type=code&state=%7B%22portalUrl%22%3A%22https%3A%2F%2Frealassets.maps.arcgis.com%22%2C%22uid%22%3A%225ECDBsteGz7F_hFG8BTniGAZKctmjXKzNVvK7MEH2TM%22%2C%22useLandingPage%22%3Atrue%2C%22clientId%22%3A%22arcgisonline%22%7D&expiration=20160&locale=en-gb&redirect_uri=https%3A%2F%2Frealassets.maps.arcgis.com%2Fhome%2Faccountswitcher-callback.html&force_login=true&redirectToUserOrgUrl=true&code_challenge=kKR3mXFlEwp3hCqbPhKM_Qa67YhX7Og8RPVBswhhZTQ&code_challenge_method=S256&display=default&hideCancel=true&showSignupOption=true&canHandleCrossOrgSignIn=true&signuptype=esri&allow_verification=true", {
            waitUntil: "networkidle2",
            timeout: 120000
        });

        console.log("Filling login form...");
        await page.waitForSelector('#user_username', { visible: true, timeout: 30000 });
        await page.type("#user_username", "realadmin23");
        await page.type("#user_password", "@dmin_25@r3@l@ss3ts");
        await page.click("#signIn");
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 });

        // Step 2: Navigate to application
        console.log("Navigating to application...");
        await page.goto("https://experience.arcgis.com/experience/15cca2f1c59f413ea7f2502a7a1315e3", {
            waitUntil: "networkidle2",
            timeout: 120000
        });

        // Step 3: Enter plot number with simulated typing
        console.log("Entering plot number...");
        await page.waitForSelector('.text-truncate.form-control', { visible: true, timeout: 30000 });

        // Focus on the input field
        await page.focus('.text-truncate.form-control');

        // Clear any existing value
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait after clearing

        // Simulate typing each character with a delay
        // await page.keyboard.type(plotNumber, { delay: 100 }); // Simulate typing with a delay of 100ms

        // Simulate typing each character of plotNumber with a delay
        for (let i = 0; i < plotNumber.length; i++) {
            await page.keyboard.type(plotNumber[i]);
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100)); // Random delay between 100-200ms
        }

        // Add extra character 'X' to trigger suggestions
        await page.keyboard.press('X');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait after adding X

        // Remove the extra character 'X'
        await page.keyboard.press('Backspace');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait after removing X

        // Wait for suggestions to appear
        console.log("Waiting for suggestions...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Press Enter to confirm selection
        await page.keyboard.press('Enter');

        await page.keyboard.press('Y');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.keyboard.press('Backspace');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Wait for the plot button to be available
        console.log("Waiting for plot button...");
        const plotButtonSelector = `button[aria-selected="true"]`;
        await page.waitForSelector(plotButtonSelector, { visible: true, timeout: 30000 });
        await page.click(plotButtonSelector);

        console.log("Waiting for form page...");
        await page.waitForSelector('#jimu-link-app-0', { visible: true, timeout: 30000 });
        await page.click('#jimu-link-app-0');
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 });

        console.log("Waiting for image slider...");
        await page.waitForSelector('.slider-tool-container', { visible: true, timeout: 60000 });

        await page.click('#jimu-link-app-0');
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 });

        // Inject custom button and styles
        console.log("Injecting custom button...");
        await page.evaluate(() => {
            const slider = document.querySelector('.slider-tool-container');
            if (slider) {
                const expandBtn = document.createElement('button');
                expandBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                    </svg>
                `;
                expandBtn.className = 'btn jimu-btn image-gallery-button expand-btn icon-btn btn-default';
                expandBtn.style.position = 'absolute';
                expandBtn.style.top = '10px';
                expandBtn.style.right = '10px';
                expandBtn.style.zIndex = '1000';
                expandBtn.title = 'Expand view';

                expandBtn.onclick = () => {
                    const overlay = document.createElement('div');
                    overlay.style.position = 'fixed';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100vw';
                    overlay.style.height = '100vh';
                    overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
                    overlay.style.zIndex = '9999';
                    overlay.style.display = 'flex';
                    overlay.style.justifyContent = 'center';
                    overlay.style.alignItems = 'center';

                    const closeBtn = document.createElement('button');
                    closeBtn.innerHTML = '&times;';
                    closeBtn.style.position = 'absolute';
                    closeBtn.style.top = '20px';
                    closeBtn.style.right = '20px';
                    closeBtn.style.fontSize = '2rem';
                    closeBtn.style.color = 'white';
                    closeBtn.style.background = 'none';
                    closeBtn.style.border = 'none';
                    closeBtn.style.cursor = 'pointer';

                    const content = document.querySelector('.slider-tool-container')?.cloneNode(true);
                    if (content) {
                        (content as HTMLElement).style.width = '80vw';
                        (content as HTMLElement).style.height = '80vh';
                        overlay.appendChild(content);
                        overlay.appendChild(closeBtn);
                        document.body.appendChild(overlay);

                        closeBtn.onclick = () => {
                            document.body.removeChild(overlay);
                        };
                    }
                };

                slider.appendChild(expandBtn);
            }
        });

        const content = await page.content();

        console.log("Content fetched successfully.", content);

        return json({
            success: true,
            html: content,
            steps: [
                { step: 1, status: 'success', message: 'Login successful' },
                { step: 2, status: 'success', message: 'Application loaded' },
                { step: 3, status: 'success', message: 'Plot number entered' },
                { step: 4, status: 'success', message: 'Plot selected' },
                { step: 5, status: 'success', message: 'Form page loaded' },
                { step: 6, status: 'success', message: 'Image slider loaded' }
            ]
        });
    } catch (error: any) {
        console.error("Error in ESRI images route:", error);
        return json({
            error: error.message || "Failed to fetch images",
            steps: [
                { step: 1, status: 'error', message: error.message || 'Unknown error occurred' }
            ]
        }, { status: 500 });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};





















// import type { ActionFunction } from "@remix-run/node";
// import { json } from "@remix-run/node";
// import puppeteer from "puppeteer";

// export async function action({ request }: Parameters<ActionFunction>[0]) {
//     const formData = await request.formData();
//     const plotNumber = formData.get("plotNumber") as string;

//     if (!plotNumber) {
//         return json({ error: "Plot number is required" }, { status: 400 });
//     }

//     try {
//         const browser = await puppeteer.launch({
//             headless: true,
//             args: ['--no-sandbox', '--disable-setuid-sandbox']
//         });
//         const page = await browser.newPage();

//         // Login
//         await page.goto("https://realassets.maps.arcgis.com/sharing/oauth2/authorize?client_id=arcgisonline&response_type=code&state=%7B%22portalUrl%22%3A%22https%3A%2F%2Frealassets.maps.arcgis.com%22%2C%22uid%22%3A%225ECDBsteGz7F_hFG8BTniGAZKctmjXKzNVvK7MEH2TM%22%2C%22useLandingPage%22%3Atrue%2C%22clientId%22%3A%22arcgisonline%22%7D&expiration=20160&locale=en-gb&redirect_uri=https%3A%2F%2Frealassets.maps.arcgis.com%2Fhome%2Faccountswitcher-callback.html&force_login=true&redirectToUserOrgUrl=true&code_challenge=kKR3mXFlEwp3hCqbPhKM_Qa67YhX7Og8RPVBswhhZTQ&code_challenge_method=S256&display=default&hideCancel=true&showSignupOption=true&canHandleCrossOrgSignIn=true&signuptype=esri&allow_verification=true", {
//             waitUntil: "networkidle2",
//             timeout: 60000
//         });

//         await page.waitForSelector('#user_username', { visible: true, timeout: 30000 });
//         await page.type("#user_username", "realadmin23");
//         await page.type("#user_password", "@dmin_25@r3@l@ss3ts");
//         await page.click("#signIn");
//         await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

//         // Navigate to the application
//         await page.goto("https://experience.arcgis.com/experience/15cca2f1c59f413ea7f2502a7a1315e3", {
//             waitUntil: "networkidle2",
//             timeout: 60000
//         });

//         // Enter plot number and search
//         await page.waitForSelector('.text-truncate.form-control', { visible: true, timeout: 30000 });
//         await page.type('.text-truncate.form-control', plotNumber);
//         await page.click('#jimu-link-app-0');
//         await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

//         // Get the HTML content of the results
//         const content = await page.content();

//         await browser.close();

//         return json({ html: content });
//     } catch (error) {
//         console.error("Error fetching ESRI data:", error);
//         return json({ error: "Failed to fetch images..." }, { status: 500 });
//     }
// }