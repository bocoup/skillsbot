// 1. Get project secrets with:
//    npm run get-secrets
// 2. Modify DB_NAME in .env if you're using a dev/test database
// 3. Add bocoup db credentials with:
//    ssh nest.bocoup.com 'cat /mnt/secrets/bocoup-db-production' | sed 's/^/BOCOUP_/' >> .env
// 4. Run this script (and wait a while, ~5 min in my testing) with:
//    ./node_modules/.bin/babel-node src/copy-bocoup-db.js

import Promise from 'bluebird';
import pgPromise from 'pg-promise';
import pgMonitor from 'pg-monitor';
import config from '../config';

const options = {
  promiseLib: Promise,
};

pgMonitor.attach(options);
pgMonitor.setTheme('matrix');

const pgp = pgPromise(options);

const src = pgp({
  host: config.db.host,
  port: config.db.port,
  database: process.env.BOCOUP_DB_NAME,
  user: process.env.BOCOUP_DB_USER,
  password: process.env.BOCOUP_DB_PASSWORD,
});

const dest = pgp(config.db);

const q = {
  insertTeams: `
    INSERT INTO slack_team (
      id,
      token,
      slack_id,
      is_active,
      oauth_payload
    ) VALUES ($[id],$[token],$[slack_id],$[is_active],$[oauth_payload])
  `,
  getUsers: `
    SELECT id, slack AS name, 1 AS slack_team_id, \'???\' AS slack_id
    FROM employee
    WHERE slack IS NOT null ORDER BY id
  `,
  insertUsers: `
    INSERT INTO slack_user (
      id,
      slack_team_id,
      slack_id,
      name
    ) VALUES ($[id],$[slack_team_id],$[slack_id],$[name])
  `,
  getCategories: `
    SELECT id, 1 AS slack_team_id, name
    FROM expertise_area
  `,
  insertCategories: `
    INSERT INTO expertise_category (
      id,
      slack_team_id,
      name
    ) VALUES ($[id],$[slack_team_id],$[name])
  `,
  getExpertises: `
    SELECT id, expertise_area_id AS expertise_category_id, name, description
    FROM expertise
  `,
  insertExpertises: `
    INSERT INTO expertise (
      id,
      expertise_category_id,
      name,
      description
    ) VALUES ($[id],$[expertise_category_id],$[name],$[description])
  `,
  getExpertiseLog: `
    SELECT
      expertise_id,
      employee_id AS slack_user_id,
      experience_rating AS experience_scale_id,
      interest_rating AS interest_scale_id,
      notes AS reason,
      created_at,
      updated_at
    FROM employee_expertise
  `,
  insertExpertiseLog: `
    INSERT INTO expertise_slack_user_log (
      expertise_id,
      slack_user_id,
      experience_scale_id,
      interest_scale_id,
      reason,
      created_at,
      updated_at
    ) VALUES (
      $[expertise_id],
      $[slack_user_id],
      $[experience_scale_id],
      $[interest_scale_id],
      $[reason],
      $[created_at],
      $[updated_at]
    );
  `,
};

function getBatches(arr, length) {
  let i = 0;
  const result = [];
  while (i < arr.length) {
    result.push(arr.slice(i, i + length));
    i += length;
  }
  return result;
}

dest.task(function() {
  const teams = [{
    id: 1,
    token: process.env.BOCOUP_TOKEN,
    slack_id: process.env.BOCOUP_SLACK_ID,
    is_active: true,
    oauth_payload: {},
  }];

  return Promise.mapSeries([
    [teams, q.insertTeams],
    [q.getUsers, q.insertUsers],
    [q.getCategories, q.insertCategories],
    [q.getExpertises, q.insertExpertises],
    [q.getExpertiseLog, q.insertExpertiseLog],
  ], ([selectQuery, insertQuery]) => {
    const srcRecords = typeof selectQuery === 'string' ? src.query(selectQuery) : selectQuery;
    return Promise.resolve(srcRecords)
    .then(records => getBatches(records, 100))
    .mapSeries(records => {
      return dest.tx(tx => tx.batch(records.map(record => tx.none(insertQuery, record))));
    });
  });
})
.then(() => {
  console.log('done');
})
.catch(error => {
  console.log(error);
})
.finally(process.exit);
