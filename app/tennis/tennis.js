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
    await page.goto(path, { timeout: navigationTimeout, waitUntil: 'domcontentloaded' });
    await page.setViewport({ width: 1080, height: 1024 });
    // await page.locator('#live-table').wait();
    // const buttonHandles = await page.$$('#live-table button.wcl-underline_rL72U');
    // console.log(buttonHandles.length);
    //const button = await page.waitForSelector('#live-table button.wcl-underline_rL72U');
    //await page.evaluate(() => {
    // document.querySelector('#live-table button.wcl-underline_rL72U').click();
    //});
    // await page.click('#live-table button.wcl-underline_rL72U');
    //const playerHandles = await page.$$('.rankingTable__href');
    const playerHandles = await page.$$('li.name a');
    const players = [];
    console.log(playerHandles.length);
    for (let i = 0; i < playerHandles.length / 2; i++) {
        const player = {};
        player['name'] = await page.evaluate(el => el.querySelector('span').textContent.trim(), playerHandles[i]);
        player['page'] = await page.evaluate(el => el.getAttribute('href'), playerHandles[i]);
        players.push(player);
    }
    await page.close();
    return players;
}


async function getGameData(path, browser) {

}


async function getPlayerResults(path, browser) {
    const page = await browser.newPage();
    await page.goto(path, { timeout: navigationTimeout });
    await page.setViewport({ width: 1080, height: 1024 });
    const resultHandles = await page.$$('span.lastName');
    console.log(resultHandles.length);
    for (let i = 0; i < resultHandles.length; i++) {
        const href = await page.evaluate(el => el.getAttribute('href'), resultHandles[i]);
    }
}

(async () => {
    const start = hrtime.bigint();
    const browser = await puppeteer.launch({ headless: false });
    const players = await getPlayersList('https://www.atptour.com/en/rankings/singles?rankRange=0-5000', browser);
    console.log(players[117]);
    // console.log(players[0]['page']);
    // console.log(`https://www.flashscore.co.uk${players[0]['page']}results/`);
    // await getPlayerResults(`https://www.flashscore.co.uk${players[0]['page']}results/`, browser);
    await browser.close();
    // const end = hrtime.bigint();
    // console.log(`Process took ${(end - start) / BigInt(60 * 10 ** 9)} minutes`);
})();