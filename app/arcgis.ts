import puppeteer from 'puppeteer';
import { z } from 'zod';

import { writeToFile } from './models/custom-fs';
import { delay } from './models/dates';

const RecordSchema = z.object({
  plotNumber: z.string(),
  hrefs: z.string().array(),
});
const RecordsSchema = RecordSchema.array();

(async () => {
  const browser = await puppeteer.launch();
  try {
    // Launch the browser and open a new blank page
    const page = await browser.newPage();

    browser.on('disconnected', () => console.log('shit just disconnected'));

    const url = 'https://realestatebw.maps.arcgis.com/home/item.html?id=710d3ae4c3b9465ab1385c08a9cb9674&sublayer=0&view=table&sortOrder=desc&sortField=defaultFSOrder#data';

    console.log('loading page...');
    // Navigate the page to a URL
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForNavigation();
    console.log('done loading page');

    // Set screen size
    // await page.setViewport({ width: 1080, height: 1024 });

    console.log('waiting...');
    await delay(5_000);
    console.log('done waiting');

    const username = await page.$('#user_username');
    const password = await page.$('#user_password');
    const signIn = await page.$('#signIn');

    console.log('username', username);
    console.log('password', password);
    console.log('signIn', signIn);

    const headings = await page.evaluate((searchText) => {
      console.log('searchtext', searchText);
      const headings = document.querySelectorAll('*');
      headings.forEach((heading) => {
        console.log('Heading found');
        console.log(heading.innerHTML);
      });
      return headings;
      // const elements = document.querySelectorAll('*');
      // for (let element of elements) {
      //   if (element.innerHTML.includes(searchText)) {
      //     // if (element.innerText.includes(searchText)) {
      //     return true;
      //   }
      // }
      // return false;
    }, 'Sign in to REDS');
    const arr = Array.from(headings);
    console.log('element array', arr.length);
    for (let element of arr) {
      console.log('Element found');
      console.log(element.innerHTML);
    }

    if (username && password && signIn) {
      console.log('need to login first, entering credentials...');
      username.click();
      username.type('realestatebw', { delay: 100 });
      await delay(2_000);
      password.click();
      password.type('DataS0urc323', { delay: 100 });
      await delay(2_000);
      console.log('taking screenshot of page before sign in...');
      await page.screenshot({
        path: `shot_before_sign_in_${new Date().getTime()}.jpg`,
      });
      signIn.click();
      console.log('clicked sign in, waiting for result...');
      await delay(10_000);
      console.log('taking screenshot of page after sign in...');
      await page.screenshot({
        path: `shot_after_sign_in_${new Date().getTime()}.jpg`,
      });
      // await page.waitForSelector(`[role="tab"]`);
      console.log('login succeeded, waiting for navigation to page with table...');
      console.log('loading page after sign in...');
      page.goto(url, { waitUntil: 'load' });
      await page.waitForNavigation();
      console.log('done loading');
      console.log('taking screenshot of page...');
      await page.screenshot({ path: `shot_${new Date().getTime()}.jpg` });
    } else {
      console.log('already signed in');
    }

    await delay(15_000);
    console.log('taking screenshot looking for table...');
    await page.screenshot({
      path: `looking_for_table_${new Date().getTime()}.jpg`,
    });
    const table = await page.$('table');
    if (!table) {
      throw new Error('table not found');
    }
    console.log('Table found');

    await table.evaluate((el) => {
      el.scrollLeft = el.offsetWidth;
    });
    await delay(2_000);
    console.log('taking screenshot after scroll...');
    await page.screenshot({
      path: `after_scroll_${new Date().getTime()}.jpg`,
    });

    await delay(1_000);
    const scroller = await page.$('.dgrid-scroller');
    if (!scroller) {
      await page.screenshot({
        path: `no_scroller_${new Date().getTime()}.jpg`,
      });
      throw new Error('scroller not found');
    }
    await delay(1_000);

    let records: z.infer<typeof RecordsSchema> = [];

    // esri-feature-table-menu-item esri-feature-table-loading-indicator
    const loadingClass = '.esri-feature-table-loading-indicator';

    let atBottom = false;
    let lastPosition = -1;
    while (!atBottom) {
      scroller.evaluate((el) => {
        el.scrollTop += 5000;
      });
      await delay(500);
      const currentPosition = await scroller.evaluate((el) => el.scrollTop);
      await page.screenshot({
        path: `scrolled_at_pos_${currentPosition}_${new Date().getTime()}.jpg`,
      });
      if (currentPosition > lastPosition) {
        console.log('currentPosition', currentPosition);
        lastPosition = currentPosition;
      } else {
        atBottom = true;
      }

      async function checkIfVisible() {
        const loading = await page.$(loadingClass);
        return !loading
          ? false
          : await loading.evaluate((el) => {
              const loadingClass = '.esri-feature-table-loading-indicator';
              const loading = document.querySelector(loadingClass);
              return !!loading && window.getComputedStyle(el).getPropertyValue('display') !== 'none';
            });
      }

      await delay(1_500);
      const isVisible = await checkIfVisible();
      if (isVisible) {
        console.log('taking screenshot when fetching for new data');
        await page.screenshot({
          path: `fetching_${currentPosition}_${new Date().getTime()}.jpg`,
        });
        console.log('waiting for fetch to complete...');
        let gone = false;
        while (!gone) {
          await delay(1_000);
          const isVisible = await checkIfVisible();
          if (!isVisible) {
            gone = true;
          }
        }
        // await page.waitForFunction(() => !document.querySelector(loadingClass));
        console.log('taking screenshot after loading new data');
        await page.screenshot({
          path: `done_fetching_${currentPosition}_${new Date().getTime()}.jpg`,
        });
      }

      await delay(1_000);
      const rows = await page.$$('table tr');
      console.log('found', rows.length, 'rows');

      for (let row of rows.slice(0, 100)) {
        if (rows.indexOf(row) > 2) {
          break;
        }
        const cells = await row.$$('td');
        if (!cells.length) {
          continue;
        }

        const plotNumberEl = cells[12];
        const plotNumber = await plotNumberEl.evaluate((el) => el.innerText);

        const photos = cells[cells.length - 1];
        const link = await photos.$('.esri-attachments-link');
        link?.click();
        await delay(3_000);

        const container = await page.$('.esri-feature-attachments-view-pane-content');
        if (!container) {
          console.log('container not found');
          continue;
        }
        const photoLinks = await container?.$$('a');
        if (!photoLinks.length) {
          console.log('no photos found');
          continue;
        }
        const hrefs: string[] = [];
        for (let photoLink of photoLinks) {
          const href = await photoLink.evaluate((el) => el.href);
          hrefs.push(href);
        }
        records.push({ plotNumber, hrefs });
      }
    }

    const err = await writeToFile('./custom-fs.json', JSON.stringify(records));
    if (err) {
      console.log('failed to write to json', err);
    } else {
      console.log('wrote to json');
    }

    console.log('Done');
  } catch (error) {
    console.log('Error >>>', error);
  } finally {
    await browser.close();
  }
})();
