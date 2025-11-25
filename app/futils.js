const puppeteer = require('puppeteer');
const paths = require('./fpaths');
const { hrtime } = require('node:process');
const fs = require('fs');
const checkGames = require('./utils');

const numberOfGames = 10;
const topQ = 3;
const bottomD = {
    12: 2,
    16: 3,
    20: 4,
};

async function fgetLeaders(path) {
    // console.log(path);
    const leaders = [];
    const bottoms = [];
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(path);
    await page.setViewport({ width: 1080, height: 1024 });
    const leaderHandles = await page.$$('#tournament-table a.tableCellParticipant__name');
    // console.log(leaderHandles.length);
    // console.log(leaderHandles[0]);
    for (let i = 0; i < 3; i++) {
        try {
            const leaderName = await page.evaluate(el =>
                el.textContent.trim(), leaderHandles[i]);
            leaders.push(leaderName);
        } catch (err) {
            console.log(err.message);
        }
    }
    for (let i = leaderHandles.length - 4; i < leaderHandles.length; i++) {
        try {
            const bottomName = await page.evaluate(el =>
                el.textContent.trim(), leaderHandles[i]);
            bottoms.push(bottomName);
        } catch (err) {
            console.log(err.message);
        }
    }
    await browser.close();
    return { 'leaders': leaders, 'bottoms': bottoms };
}


async function getNames(handles, page) {
    const names = [];
    for (let i = 0; i < numberOfGames; i++) {
        try {
            const teamName = await page.evaluate(el =>
                el.querySelector('span').textContent.trim(), handles[i]
            );
            // console.log(teamName);
            names.push(teamName);
            // console.log(teamName);
            // fixtures.push({ 'home': homeTeam, 'away': awayTeam, 'date': date, 'score': score });
        } catch (err) {
            // console.log(err);
            // console.log('FIXTURES');
            // break;
        }
    }
    return names;
}

async function getDates(handles, page) {
    const dates = [];
    for (let i = 0; i < numberOfGames; i++) {
        try {
            const date = await page.evaluate(el =>
                el.textContent.trim(), handles[i]
            );

            dates.push(date);
            // console.log(teamName);
            // fixtures.push({ 'home': homeTeam, 'away': awayTeam, 'date': date, 'score': score });
        } catch (err) {
            // console.log(err);
            // console.log('FIXTURES');
            // break;
        }
    }
    return dates;
}


async function fgetFixtures(path) {
    const fixtures = [];
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(path);
    await page.setViewport({ width: 1080, height: 1024 });
    let fixtureHandles = await page.$$('div.wcl-participant_bctDY.event__homeParticipant');
    // console.log(fixtureHandles.length);
    // console.log(fixtureHandles[0]);

    const homeTeams = await getNames(fixtureHandles, page);
    fixtureHandles = await page.$$('div.wcl-participant_bctDY.event__awayParticipant');
    const awayTeams = await getNames(fixtureHandles, page);
    fixtureHandles = await page.$$('#live-table .event__time');
    const dates = await getDates(fixtureHandles, page);
    for (let i = 0; i < numberOfGames; i++) {
        const fixture = { 'home': homeTeams[i], 'away': awayTeams[i], 'date': dates[i] };
        fixtures.push(fixture);
    }
    await browser.close();
    return fixtures;
}



(async () => {
    const start = hrtime.bigint();
    let writer = fs.createWriteStream('../data/games.csv', { encoding: 'utf8' });
    for (const league of Object.keys(paths)) {
        console.log(paths[league]['name']);
        const results = await fgetLeaders(paths[league]['table']);
        const fixtures = await fgetFixtures(paths[league]['fixtures']);
        // console.log(results);
        // if (league === 'National League') {
        //     console.log(fixtures);
        // }
        const games = checkGames(fixtures, results, paths[league]['name'], paths[league]['country']);
        for (const game of games) {
            let tableRow = game['date'] + ';' + game['home'] + ';' + game['away'] + ';' + game['league'] + ';' + game['country'] + '\n';
            writer.write(tableRow);
        }
    }
    const end = hrtime.bigint();
    console.log(`process took ${(end - start) / BigInt(60 * 10 ** 9)} minutes`);
})();