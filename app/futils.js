const puppeteer = require('puppeteer');
const paths = require('./fpaths');
// for dev test
// const paths = require('./tpaths');
const { hrtime } = require('node:process');
const fs = require('fs');
const checkGames = require('./utils');

const numberOfGames = 20;
const topQ = 3;
const navigationTimeout = 180000;
const baseDelay = 30000;
const delayInterval = 3000;
const containers = {
    // 'Football': {
    //     'home': 'div.wcl-participant_bctDY.event__homeParticipant',
    //     'away': 'div.wcl-participant_bctDY.event__awayParticipant'
    // },
    // 'Ice Hockey': {
    //     'home': 'div.event__participant.event__participant--home',
    //     'away': 'div.event__participant.event__participant--away'
    // },
    // 'Basketball': {
    //     'home': 'div.event__participant.event__participant--home',
    //     'away': 'div.event__participant.event__participant--away'
    // },
    'Home': ['div.wcl-participant_bctDY.event__homeParticipant',
        'div.event__participant.event__participant--home'
    ],
    'Away': ['div.wcl-participant_bctDY.event__awayParticipant',
        'div.event__participant.event__participant--away'
    ]
}

async function fgetLeaders(path, number, browser) {
    // console.log(path);
    const randomDelay = Math.floor(Math.random() * delayInterval) + baseDelay;
    await new Promise(r => setTimeout(r, randomDelay));
    let bottomQ;
    if (number < 12) {
        bottomQ = 2;
    } else if (number < 16) {
        bottomQ = 3;
    } else {
        bottomQ = 4;
    }
    const leaders = [];
    const bottoms = [];
    // const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // page.setDefaultNavigationTimeout(navigationTimeout);
    await page.goto(path, { timeout: navigationTimeout });
    await page.setViewport({ width: 1080, height: 1024 });
    await page.waitForSelector('#tournamentPage a.tableCellParticipant__name', { visible: true })
    //const leaderHandles = await page.$$('#tournament-table a.tableCellParticipant__name');
    const leaderHandles = await page.$$('#tournamentPage a.tableCellParticipant__name')
    console.log(leaderHandles.length);
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
    const legHandle = await page.$('#tournamentPage .ui-table__row');
    const leg = await page.evaluate(el => el.querySelector('.table__cell.table__cell--value').textContent.trim(), legHandle);
    // await browser.close();
    await page.close();
    return { 'leaders': leaders, 'bottoms': bottoms, 'leg': leg };
}


async function getFixturesHandles(page, place) {
    for (const container of containers[place]) {
        const candidates = await page.$$(container);
        if (candidates && candidates.length > 0) return candidates;
    }
}

async function getNames(handles, page, sport) {
    console.log(sport);
    const names = [];
    for (let i = 0; i < numberOfGames; i++) {
        try {
            const teamName = await page.evaluate(el => {
                if (el.querySelector('span')) {
                    return el.querySelector('span').textContent.trim()
                } else {
                    return el.textContent.trim()
                }
            }, handles[i]);
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


async function fgetFixtures(path, browser, sport) {
    const fixtures = [];
    // const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(path, { timeout: navigationTimeout });
    await page.setViewport({ width: 1080, height: 1024 });
    // let fixtureHandles = await page.$$(containers[sport]['home']);
    let fixtureHandles = await getFixturesHandles(page, 'Home');
    if (fixtureHandles) console.log(fixtureHandles.length);
    // console.log(fixtureHandles[0]);

    const homeTeams = await getNames(fixtureHandles, page, sport);
    //fixtureHandles = await page.$$(containers[sport]['away']);
    fixtureHandles = await getFixturesHandles(page, 'Away');
    const awayTeams = await getNames(fixtureHandles, page, sport);
    fixtureHandles = await page.$$('#tournamentPage .event__time');
    const dates = await getDates(fixtureHandles, page);
    for (let i = 0; i < numberOfGames; i++) {
        const fixture = { 'home': homeTeams[i], 'away': awayTeams[i], 'date': dates[i] };
        fixtures.push(fixture);
    }
    // await browser.close();
    await page.close();
    return fixtures;
}

function newCheck(leadPosition, botPosition, numberOfTeams) {
    if (leadPosition !== 1 && botPosition !== numberOfTeams) return false;
    if (botPosition === numberOfTeams && numberOfTeams <= 12 && leadPosition > 2) return false;
    if (botPosition === numberOfTeams && numberOfTeams <= 15 && leadPosition > 3) return false;
    return true;
}



(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const start = hrtime.bigint();
    const header = `Date;Home;Away;Games played;League;Country;Teams;Sport\n`;
    let writer = fs.createWriteStream('../data/games.csv', { encoding: 'utf8' });
    writer.write(header);
    const quantity = Object.keys(paths).length;
    console.log(`Quantity: ${quantity}`);
    for (const league of Object.keys(paths)) {
        console.log(paths[league]['name']);
        paths[league]['table'] = paths[league]['table'].replace('/#', '');
        try {
            const results = await fgetLeaders(paths[league]['table'], paths[league]['numberOfTeams'], browser);
            console.log(results);
            const fixtures = await fgetFixtures(paths[league]['fixtures'], browser, paths[league]['sport']);

            console.log(fixtures);
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
                    if (!newCheck(leaderHome[0]['position'], bottomAway[0]['position'], game['numberOfTeams'])) {
                        continue;
                    }
                    game['home'] += ` (${leaderHome[0]['position']})`;
                    game['away'] += ` (${bottomAway[0]['position']})`;
                } else {
                    if (!newCheck(leaderAway[0]['position'], bottomHome[0]['position'], game['numberOfTeams'])) {
                        continue;
                    }
                    game['home'] += ` (${bottomHome[0]['position']})`;
                    game['away'] += ` (${leaderAway[0]['position']})`;
                }
                let tableRow = game['date'].slice(0, 5) + ';' + game['home'] + ';' + game['away'] + ';' + game['leg'] + ';' + game['league'] + ';' + game['country'] + ';' + game['numberOfTeams'] + ';' + game['sport'] + '\n';
                writer.write(tableRow);
            }
        } catch (err) {
            console.log(`${paths[league]['name']} : FATAL ERROR`);
            const now = new Date();
            fs.writeFileSync('../data/log.txt', `${now.toString()}: ${err.message}: ${paths[league]['name']}\n`, { flag: 'a+' });
        }
    }
    const end = hrtime.bigint();
    console.log(`process took ${(end - start) / BigInt(60 * 10 ** 9)} minutes`);
    await browser.close();
})();