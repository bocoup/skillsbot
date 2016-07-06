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

// Word pluralization helper.
const p = (base, pluralSuffix, num) => base.replace(/_/, num) + (num !== 1 ? pluralSuffix : '');

// Bulk insertion helper.
const getInserter = (table, columns) => records => {
  console.log(`Inserting ${p('_ record', 's', records.length)}...`);
  return db.none(pgp.helpers.insert(records, columns, table));
};
// Select from source database.
const getSrcQuery = queryStr => (...args) => src.query(queryStr, ...args);
// Select from destination database.
const getDestQuery = queryStr => (...args) => db.query(queryStr, ...args);


const q = {
  // Misc.
  getTeamId: () => db.one(`
    SELECT id FROM slack_team WHERE slack_id = 'T025GMFDP' AND is_active = true
  `).get('id'),
  fixAndCleanup: getDestQuery(`
    SELECT SETVAL('expertise_id_seq', (SELECT MAX(id) FROM expertise));
    SELECT SETVAL('expertise_category_id_seq', (SELECT MAX(id) FROM expertise_category));
  `),
  // Categories.
  getCategories: getSrcQuery(`
    SELECT
      id,
      name
    FROM expertise_area;
  `),
  insertCategories: getInserter('expertise_category', [
    'id',
    'slack_team_id',
    'name',
  ]),
  // Expertises.
  getExpertises: getSrcQuery(`
    SELECT
      id,
      expertise_area_id AS expertise_category_id,
      name,
      description
    FROM expertise
  `),
  insertExpertises: getInserter('expertise', [
    'id',
    'expertise_category_id',
    'name',
    'description',
  ]),
  // Users.
  getSrcUsers: getSrcQuery(`
    SELECT
      id,
      slack AS name
    FROM employee
    WHERE slack IS NOT NULL
    ORDER BY id
  `),
  getDestUsers: getDestQuery(`
    SELECT
      id,
      slack_id
    FROM slack_user
    ORDER BY id
  `),
  // Expertise log.
  getExpertiseLog: getSrcQuery(`
    SELECT
      expertise_id,
      employee_id,
      experience_rating AS experience_scale_id,
      interest_rating AS interest_scale_id,
      notes AS reason,
      created_at,
      updated_at
    FROM employee_expertise
  `),
  insertExpertiseLog: getInserter('expertise_slack_user_log', [
    'expertise_id',
    'slack_user_id',
    'experience_scale_id',
    'interest_scale_id',
    'reason',
    'created_at',
    'updated_at',
  ]),
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
    const addSlackUserIdToRows = records => records.map(record => {
      record.slack_user_id = oldUserIdToNewUserId[record.employee_id];
      return record;
    });

    // Make the fkey slack_team id available everywhere.
    let teamId;
    const setTeamId = id => {
      teamId = id;
    };
    const addTeamIdToRows = rows => rows.map(row => {
      row.slack_team_id = teamId;
      return row;
    });

    // Get and store current bot slack_item id.
    return q.getTeamId().then(setTeamId)
    // Migrate expertise categories.
    .then(q.getCategories).then(addTeamIdToRows).then(q.insertCategories)
    // Migrate expertises.
    .then(q.getExpertises).then(q.insertExpertises)
    // Create a oldId-newId mapping for existing users.
    .then(q.getSrcUsers).then(updateUserMapPart1)
    .then(q.getDestUsers).then(updateUserMapPart2)
    // Migrate expertise log, translating old user ids to their new values.
    .then(q.getExpertiseLog).then(addSlackUserIdToRows).then(q.insertExpertiseLog)
    // Ensure indices increment from the proper value.
    .then(q.fixAndCleanup);
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
