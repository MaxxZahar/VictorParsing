const puppeteer = require('puppeteer');
const paths = require('./fpaths');
// for dev test
// const paths = require('./tpaths');
const { hrtime } = require('node:process');
const fs = require('fs');
const checkGames = require('./utils');

const numberOfGames = 10;
const topQ = 3;
const navigationTimeout = 120000;
const bottomD = {
    12: 2,
    16: 3,
    20: 4,
};

async function fgetLeaders(path, number, browser) {
    // console.log(path);
    let bottomQ;
    if (number < 12) {
        bottomQ = 2;
    } else if (number < 16) {
        bottomQ = 3;
    } else if (number < 20) {
        bottomQ = 4;
    } else {
        bottomQ = 5;
    }
    const leaders = [];
    const bottoms = [];
    // const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // page.setDefaultNavigationTimeout(navigationTimeout);
    await page.goto(path, { timeout: navigationTimeout });
    await page.setViewport({ width: 1080, height: 1024 });
    const leaderHandles = await page.$$('#tournament-table a.tableCellParticipant__name');
    // console.log(leaderHandles.length);
    // console.log(leaderHandles[0]);
    for (let i = 0; i < topQ; i++) {
        try {
            const leaderName = await page.evaluate(el =>
                el.textContent.trim(), leaderHandles[i]);
            leaders.push({ 'name': leaderName, 'position': i + 1 });
        } catch (err) {
            console.log(err.message);
        }
    }
    for (let i = leaderHandles.length - bottomQ; i < leaderHandles.length; i++) {
        try {
            const bottomName = await page.evaluate(el =>
                el.textContent.trim(), leaderHandles[i]);
            bottoms.push({ 'name': bottomName, 'position': i + 1 });
        } catch (err) {
            console.log(err.message);
        }
    }
    const legHandle = await page.$('#tournament-table .ui-table__row');
    const leg = await page.evaluate(el => el.querySelector('.table__cell.table__cell--value').textContent.trim(), legHandle);
    // await browser.close();
    await page.close();
    return { 'leaders': leaders, 'bottoms': bottoms, 'leg': leg };
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


async function fgetFixtures(path, browser) {
    const fixtures = [];
    // const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(path, { timeout: navigationTimeout });
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
    // await browser.close();
    await page.close();
    return fixtures;
}



(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const start = hrtime.bigint();
    const header = `Date;Home;Away;Games played;League;Country;Teams;Sport\n`;
    let writer = fs.createWriteStream('../data/games.csv', { encoding: 'utf8' });
    writer.write(header);
    for (const league of Object.keys(paths)) {
        console.log(paths[league]['name']);
        try {
            const results = await fgetLeaders(paths[league]['table'], paths[league]['numberOfTeams'], browser);
            const fixtures = await fgetFixtures(paths[league]['fixtures'], browser);
            // console.log(results);
            // if (league === 'National League') {
            //     console.log(fixtures);
            // }
            const games = checkGames(fixtures, results, paths[league]);
            for (const game of games) {
                const leaderHome = results['leaders'].filter(leader => leader['name'] === game['home']);
                const leaderAway = results['leaders'].filter(leader => leader['name'] === game['away']);
                const bottomHome = results['bottoms'].filter(bottom => bottom['name'] === game['home']);
                const bottomAway = results['bottoms'].filter(bottom => bottom['name'] === game['away']);
                if (leaderHome.length === 1) {
                    game['home'] += ` (${leaderHome[0]['position']})`;
                    game['away'] += ` (${bottomAway[0]['position']})`;
                } else {
                    game['home'] += ` (${bottomHome[0]['position']})`;
                    game['away'] += ` (${leaderAway[0]['position']})`;
                }
                let tableRow = game['date'].slice(0, 5) + ';' + game['home'] + ';' + game['away'] + ';' + game['leg'] + ';' + game['league'] + ';' + game['country'] + ';' + game['numberOfTeams'] + ';' + game['sport'] + '\n';
                writer.write(tableRow);
            }
        } catch (err) {
            console.log(`${paths[league]['name']} : FATAL ERROR`);
            fs.writeFileSync('../data/log.txt', `${err.message}\n`, { flag: 'a+' });
        }
    }
    const end = hrtime.bigint();
    console.log(`process took ${(end - start) / BigInt(60 * 10 ** 9)} minutes`);
    await browser.close();
})();