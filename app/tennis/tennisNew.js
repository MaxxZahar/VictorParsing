const puppeteer = require('puppeteer');
const paths = require('./paths');
const { hrtime } = require('node:process');
const fs = require('fs');

const navigationTimeout = 180000;
const baseDelay = 30000;
const delayInterval = 3000;

const numberOfPlayers = 30;
const delta = 25;

const path = 'https://24score.pro/tennis/';

async function getData(path, browser) {
    const page = await browser.newPage();
    await page.goto(path, { timeout: navigationTimeout, waitUntil: 'domcontentloaded' });
    await page.setViewport({ width: 1080, height: 1024 });

    const nameHandles = await page.$$('td.team');
    const names = [];
    for (let i = 0; i < nameHandles.length; i++) {
        const name = await page.evaluate(el => el.querySelector('a').textContent.trim(), nameHandles[i]);
        names.push(name);
    }
    const rankHandles = await page.$$('td.t-info');
    const ranks = [];
    const tournaments = [];
    for (let i = 0; i < rankHandles.length; i++) {
        const rank = await page.evaluate(el => el.querySelector('span').textContent.trim().split(' ')[0], rankHandles[i]);
        ranks.push(Number(rank));
        const tournament = await page.evaluate(el => el.parentElement.parentElement.querySelector('a').textContent.trim(), nameHandles[i]);
        tournaments.push(tournament);
    }
    const records = [];
    for (let i = 0; i < names.length - 1; i += 2) {
        const player1 = names[i];
        const player2 = names[i + 1];
        const rank1 = ranks[i];
        const rank2 = ranks[i + 1];
        let record = '';
        if (rank1 > 0 && rank2 > 0 && Math.abs(rank1 - rank2) >= delta) {
            record = `${player1};${rank1};${player2};${rank2};${Math.abs(rank1 - rank2)};${tournaments[i]}`;
            records.push(record);
        }
    }
    return records;
}


(async () => {
    const start = hrtime.bigint();
    const browser = await puppeteer.launch({ headless: true });
    const header = `Player;Rank;Player;Rank;Delta;Tournament\n`;
    let writer = fs.createWriteStream('../../data/tennis.csv', { encoding: 'utf8' });
    writer.write(header);
    const records = await getData(path, browser);
    for (const record of records) {
        console.log(record);
        writer.write(record + '\n');
    }
    await browser.close();
})();