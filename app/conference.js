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
    return teams;
}

async function getFixtures(path, browser) {
    const page = await browser.newPage();
    await page.goto(path, { timeout: navigationTimeout });
    await page.setViewport({ width: 1080, height: 1024 });
    const fixtureHandles = await page.$$('.event__match--withRowLink');
    const fixtures = [];
    for (let i = 0; i < fixtureHandles.length; i++) {
        const date = await page.evaluate(el => el.querySelector('.event__time').textContent.trim(), fixtureHandles[i]);
        const home = await page.evaluate(el => el.querySelector('.wcl-participant_bctDY.event__homeParticipant span').textContent.trim(), fixtureHandles[i]);
        const away = await page.evaluate(el => el.querySelector('.wcl-participant_bctDY.event__awayParticipant span').textContent.trim(), fixtureHandles[i]);
        const record = { 'date': date, 'home': home, 'away': away };
        fixtures.push(record);
    }
    return fixtures;
}


(async () => {
    const browser = await puppeteer.launch({ headless: true });
    // await getTeams(paths['J1']['table'], 10, browser);
    console.log(await getFixtures(paths['J1']['fixtures'], browser));
    await browser.close();
})();