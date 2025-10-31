const puppeteer = require('puppeteer');
const paths = require('./paths');
const { hrtime } = require('node:process');

async function getLeaders(path) {
    const leaders = [];
    const bottoms = [];
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(path);
    await page.setViewport({ width: 1080, height: 1024 });
    const leaderHandles = await page.$$('table.stat-table tr');
    // console.log(leaderHandles.length);
    // console.log(leaderHandles[0]);
    for (let i = 1; i < 5; i++) {
        try {
            const leaderName = await page.evaluate(el =>
                el.querySelectorAll('td')[1].querySelector('a').textContent.trim(), leaderHandles[i]);
            leaders.push(leaderName);
        } catch (err) {
            console.log(err.message);
        }
    }
    for (let i = leaderHandles.length - 4; i < leaderHandles.length; i++) {
        try {
            const bottomName = await page.evaluate(el =>
                el.querySelectorAll('td')[1].querySelector('a').textContent.trim(), leaderHandles[i]);
            bottoms.push(bottomName);
        } catch (err) {
            console.log(err.message);
        }
    }
    await browser.close();
    return { 'leaders': leaders, 'bottoms': bottoms };
}

async function getFixtures(path) {
    const fixtures = [];
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(path);
    await page.setViewport({ width: 1080, height: 1024 });
    const fixtureHandles = await page.$$('table.stat-table tr');
    // console.log(fixtureHandles.length);
    // console.log(fixtureHandles[0]);
    for (let i = 1; i < fixtureHandles.length; i++) {
        try {
            const homeTeam = await page.evaluate(el =>
                el.querySelectorAll('td')[1].querySelector('a').textContent.trim(), fixtureHandles[i]
            );
            const awayTeam = await page.evaluate(el =>
                el.querySelectorAll('td')[3].querySelector('a').textContent.trim(), fixtureHandles[i]
            );
            const date = await page.evaluate(el =>
                el.querySelectorAll('td')[0].querySelector('a').textContent.trim(), fixtureHandles[i]
            );
            const score = await page.evaluate(el =>
                el.querySelectorAll('td')[2].querySelector('a').textContent.trim(), fixtureHandles[i]
            );
            fixtures.push({ 'home': homeTeam, 'away': awayTeam, 'date': date, 'score': score });
        } catch (err) {
            // console.log(err);
            // console.log('FIXTURES');
            // break;
        }
    }
    await browser.close();
    return fixtures.filter(fixture => fixture['score'] === '- : -');
}


function checkGames(fixtures, teams) {
    const games = [];
    for (const fixture of fixtures) {
        if ((teams['leaders'].includes(fixture['home']) && teams['bottoms'].includes(fixture['away'])) ||
            (teams['bottoms'].includes(fixture['home']) && teams['leaders'].includes(fixture['away']))) {
            console.log(fixture)
            games.push(fixture);
        }
    }
    if (games.length === 0) {
        console.log('NO GAMES');
    }
    return games;
}


(async () => {
    const start = hrtime.bigint();
    for (const league of Object.keys(paths)) {
        console.log(paths[league]['name']);
        const results = await getLeaders(paths[league]['table']);
        const fixtures = await getFixtures(paths[league]['fixtures']);
        // console.log(results);
        // if (league === 'National League') {
        //     console.log(fixtures);
        // }
        checkGames(fixtures, results);
    }
    const end = hrtime.bigint();
    console.log(`process took ${(end - start) / BigInt(10 ** 9)} seconds`);
})();


module.exports = { getLeaders }