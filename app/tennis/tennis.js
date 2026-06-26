const puppeteer = require('puppeteer');
const paths = require('./paths');
const { hrtime } = require('node:process');
const fs = require('fs');

const navigationTimeout = 180000;
const baseDelay = 30000;
const delayInterval = 3000;

const numberOfPlayers = 30;
const delta = 25;

async function acceptCookiesFromPopup(page, popupSelector, acceptButtonSelector) {
    try {
        // Waiting for the cookie consent popup to appear
        await page.waitForSelector(popupSelector);

        // Clicking the "Accept" button to accept cookies
        await page.click(acceptButtonSelector);

        // Cookies have been accepted successfully
        return true;
    } catch (error) {
        // An error occurred while accepting cookies
        console.error('Error handling the cookie popup:', error);
        return false;
    }
}

async function getPlayersList(path, browser) {
    const page = await browser.newPage();
    await page.goto(path, { timeout: navigationTimeout });
    await page.setViewport({ width: 1080, height: 1024 });
    // await page.locator('#live-table').wait();
    // const buttonHandles = await page.$$('#live-table button.wcl-underline_rL72U');
    // console.log(buttonHandles.length);
    //const button = await page.waitForSelector('#live-table button.wcl-underline_rL72U');
    //await page.evaluate(() => {
    // document.querySelector('#live-table button.wcl-underline_rL72U').click();
    //});
    // await page.click('#live-table button.wcl-underline_rL72U');
    const playerHandles = await page.$$('.rankingTable__href');
    const players = [];
    console.log(playerHandles.length);
    for (let i = 0; i < playerHandles.length; i++) {
        const player = {};
        player['name'] = await page.evaluate(el => el.textContent.trim(), playerHandles[i]);
        player['page'] = await page.evaluate(el => el.getAttribute('href'), playerHandles[i]);
        players.push(player);
    }
    return players;
}

(async () => {
    const start = hrtime.bigint();
    const browser = await puppeteer.launch({ headless: true });
    const players = await getPlayersList('https://www.flashscore.co.uk/tennis/rankings/atp/', browser);
    await browser.close();
    const end = hrtime.bigint();
    console.log(`Process took ${(end - start) / BigInt(60 * 10 ** 9)} minutes`);
})();