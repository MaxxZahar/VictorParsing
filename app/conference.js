const puppeteer = require('puppeteer');
const paths = require('./cpaths');
const { hrtime } = require('node:process');
const fs = require('fs');

const numberOfGames = 20;
const topQ = 3;
const navigationTimeout = 180000;
const baseDelay = 30000;
const delayInterval = 3000;

async function getTeams(path, number, browser) {
    const randomDelay = Math.floor(Math.random() * delayInterval) + baseDelay;
    await new Promise(r => setTimeout(r, randomDelay));
    const teams = [];
    const page = await browser.newPage();
    await page.goto(path, { timeout: navigationTimeout });
    await page.setViewport({ width: 1080, height: 1024 });
    await page.waitForSelector('#tournamentPage a.tableCellParticipant__name', { visible: true });
    const teamHandles = await page.$$('#tournamentPage a.tableCellParticipant__name');
    const pointHandles = await page.$$('#tournamentPage span.table__cell--points');
    for (let i = 0; i < teamHandles.length; i++) {
        const team = await page.evaluate(el => el.textContent.trim(), teamHandles[i]);
        const points = await page.evaluate(el => el.textContent.trim(), pointHandles[i]);
        const record = { 'name': team, 'points': Number(points) };
        teams.push(record);
    }
    teams.sort((a, b) => b['points'] - a['points']);
    console.log(teams);
}


(async () => {
    const browser = await puppeteer.launch({ headless: true });
    await getTeams(paths['J1']['table'], 10, browser);
    await browser.close();
})();