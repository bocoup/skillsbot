import Promise from 'bluebird';
import pgPromise from 'pg-promise';
import pgMonitor from 'pg-monitor';
import {createCommand} from 'chatter';
import config from '../../../config';
import {db} from '../../services/db';

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

const q = {
  getTeamId: `
    SELECT id FROM slack_team WHERE slack_id = 'T025GMFDP' AND is_active = true
  `,
  getCategories: `
    SELECT id, name FROM expertise_area;
  `,
  insertCategories: `
    INSERT INTO expertise_category (
      id,
      slack_team_id,
      name
    ) VALUES ($[id], $[teamId], $[name])
  `,
  getExpertises: `
    SELECT
      id,
      expertise_area_id AS expertise_category_id,
      name,
      description
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
  getSrcUsers: `
    SELECT
      id,
      slack AS name
    FROM employee
    WHERE slack IS NOT NULL
    ORDER BY id
  `,
  getDestUsers: `
    SELECT
      id,
      slack_id
    FROM slack_user
    WHERE slack_team_id = $[teamId]
    ORDER BY id
  `,
  insertUsers: `
    INSERT INTO slack_user (
      id,
      slack_id,
      slack_team_id,
      is_active,
      meta
    ) VALUES ($[id], $[slackId], $[teamId], $[isActive], $[meta])
  `,
  getExpertiseLog: `
    SELECT
      expertise_id,
      employee_id,
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
      $[userId],
      $[experience_scale_id],
      $[interest_scale_id],
      $[reason],
      $[created_at],
      $[updated_at]
    );
  `,
  fixAndCleanup: `
    SELECT SETVAL('slack_user_id_seq', (SELECT MAX(id) FROM slack_user));
    SELECT SETVAL('expertise_id_seq', (SELECT MAX(id) FROM expertise));
    SELECT SETVAL('expertise_category_id_seq', (SELECT MAX(id) FROM expertise_category));
  `,
};

const getBatches = length => arr => {
  let i = 0;
  const result = [];
  while (i < arr.length) {
    result.push(arr.slice(i, i + length));
    i += length;
  }
  return result;
};

export default createCommand({
  name: 'bocoup-import',
  description: 'Import Bocoup database.',
}, (message, {bot}) => {
  return db.task(function() {
    // Bocoup employee name-id mappings.
    const slackIdToOldUserId = {};
    const oldUserIdToNewUserId = {};
    const updateUserMapPart1 = users => users.forEach(user => {
      const slackUser = bot.getUser(user.name);
      slackIdToOldUserId[slackUser.id] = user.id;
    });
    const updateUserMapPart2 = users => users.forEach(user => {
      oldUserIdToNewUserId[slackIdToOldUserId[user.slack_id]] = user.id;
    });
    // Adjust expertise log records to have the new slack_user id.
    const adjustExpertiseLog = records => records.map(record => {
      record.userId = oldUserIdToNewUserId[record.employee_id];
      return record;
    });

    // Make the fkey slack_team id available everywhere.
    let teamId;
    const setTeamId = id => {
      teamId = id;
    };
    const addTeamIdToRows = rows => rows.map(row => {
      row.teamId = teamId;
      return row;
    });

    // Select from source database.
    const getSrcQuery = (query, method = 'query') => (...args) => src[method](query, ...args);
    // Select from destination database.
    const getDestQuery = (query, method = 'query') => (...args) => db[method](query, ...args);

    // Word pluralization helper.
    const p = (base, pluralSuffix, num) => base.replace(/_/, num) + (num !== 1 ? pluralSuffix : '');

    // Insert into destination database.
    const getInsertQuery = insertQuery => inputRecords => {
      const batchSize = 100;
      let batchCount;
      let i = 0;
      return Promise.resolve(inputRecords)
      .tap(r => {
        batchCount = Math.ceil(r.length / batchSize);
        console.log(`Inserting ${p('_ record', 's', r.length)} in ${p('_ batch', 'es', batchCount)}...`);
      })
      .then(addTeamIdToRows)
      .then(getBatches(batchSize)).mapSeries(records => {
        i++;
        console.log(`Processing batch ${i}/${batchCount}`);
        return db.tx(tx => tx.batch(records.map(record => tx.none(insertQuery, record))));
      });
    };

    // Get and store current bot slack_item id.
    return getDestQuery(q.getTeamId, 'one')().get('id').then(setTeamId)
    // Migrate expertise categories.
    .then(getSrcQuery(q.getCategories)).then(getInsertQuery(q.insertCategories))
    // Migrate expertises.
    .then(getSrcQuery(q.getExpertises)).then(getInsertQuery(q.insertExpertises))
    // Create a oldId-newId mapping for existing Bocoupers.
    .then(getSrcQuery(q.getSrcUsers)).then(updateUserMapPart1)
    .then(() => getDestQuery(q.getDestUsers)({teamId})).then(updateUserMapPart2)
    // Migrate expertise log, translating old user ids to their new values.
    .then(getSrcQuery(q.getExpertiseLog)).then(adjustExpertiseLog).then(getInsertQuery(q.insertExpertiseLog))
    // Ensure indices increment from the proper value.
    .then(getDestQuery(q.fixAndCleanup));
  })
  .then(() => {
    console.log('Import done!');
    return 'Import done!';
  })
  .catch(error => {
    console.log(error.stack);
    return `Error: \`${error.message}\``;
  });
});
