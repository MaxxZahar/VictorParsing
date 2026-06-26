const puppeteer = require('puppeteer');
const paths = require('./cpaths');
const { hrtime } = require('node:process');
const fs = require('fs');

const numberOfGames = 30;
const topQ = 3;
const bottomQ = 3;
const navigationTimeout = 180000;
const baseDelay = 30000;
const delayInterval = 3000;

function filterFixtures(teams, fixtures) {
    const filteredFixtures = [];
    const tops = [teams[0], teams[1], teams[2]].map(el => el['name']);
    const bottoms = [teams.at(-1), teams.at(-2), teams.at(-3)].map(el => el['name']);
    for (const fixture of fixtures) {
        if ((fixture['home'] === teams[0]['name'] && bottoms.includes(fixture['away'])) ||
            (fixture['away'] === teams[0]['name'] && bottoms.includes(fixture['home'])) ||
            (fixture['home'] === teams.at(-1)['name'] && tops.includes(fixture['away'])) ||
            (fixture['away'] === teams.at(-1)['name'] && tops.includes(fixture['home']))) {
            filteredFixtures.push(fixture);
        }
    }
    return filteredFixtures;
}

function writeData(fFixtures, league, stream) {
    for (const fixture of fFixtures[0]) {
        const str = `${fixture['date']};${fixture['home']};${fixture['away']};${fFixtures[1]};${league['name']};${league['country']};${league['numberOfTeams']};${league['sport']}\n`;
        stream.write(str);
    }
}

async function getTeams(path, browser) {
    const randomDelay = Math.floor(Math.random() * delayInterval) + baseDelay;
    await new Promise(r => setTimeout(r, randomDelay));
    const teams = [];
    const page = await browser.newPage();
    await page.goto(path, { timeout: navigationTimeout });
    await page.setViewport({ width: 1080, height: 1024 });
    await page.waitForSelector('#tournamentPage a.tableCellParticipant__name', { visible: true });
    const teamHandles = await page.$$('#tournamentPage a.tableCellParticipant__name');
    const pointHandles = await page.$$('#tournamentPage span.table__cell--points');
    const gamesHandles = await page.$$('#tournamentPage .ui-table__row');
    for (let i = 0; i < teamHandles.length; i++) {
        const team = await page.evaluate(el => el.textContent.trim(), teamHandles[i]);
        const points = await page.evaluate(el => el.textContent.trim(), pointHandles[i]);
        const gamesPlayed = await page.evaluate(el => el.querySelectorAll('.table__cell--value')[0].textContent.trim(), gamesHandles[i]);
        const record = { 'name': team, 'points': Number(points), 'gp': Number(gamesPlayed) };
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

async function getFilteredFixtures(browser, league) {
    const teams = await getTeams(league['table'], browser);
    console.log(teams);
    const numberOfTeams = teams.length;
    const fixtures = await getFixtures(league['fixtures'], browser);
    return [filterFixtures(teams, fixtures), teams[0]['gp']];
}


(async () => {
    const start = hrtime.bigint();
    const browser = await puppeteer.launch({ headless: true });
    const stream = fs.createWriteStream('../data/games.csv', { encoding: 'utf8' });
    const header = `Date;Home;Away;Games played;League;Country;Teams;Sport\n`;
    stream.write(header);
    const quantity = Object.keys(paths).length;
    let counter = 0;
    console.log(`Quantity: ${quantity}`);
    for (const league in paths) {
        counter++;
        console.log(`${counter} | ${quantity}\t${paths[league]["name"]}`);
        try {
            writeData(await getFilteredFixtures(browser, paths[league]), paths[league], stream);
        } catch (err) {
            console.log(`${paths[league]['name']} : FATAL ERROR`);
            const now = new Date();
            fs.writeFileSync('../data/log.txt', `${now.toString()}: ${err.message}: ${paths[league]['name']}\n`, { flag: 'a+' });
        }
    }
    stream.end();
    await browser.close();
    const end = hrtime.bigint();
    console.log(`Process took ${(end - start) / BigInt(60 * 10 ** 9)} minutes`);
})();