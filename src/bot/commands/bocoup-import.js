import Promise from 'bluebird';
import pgPromise from 'pg-promise';
import pgMonitor from 'pg-monitor';
import {createMatcher} from 'chatter';
import config from '../../../config';
import {db} from '../../services/db';

const {bocoupTeamId} = config;

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
  checkIfCanImport: () => db.one(`
    SELECT GREATEST (
      0,
      (SELECT COUNT(*) FROM skill LIMIT 1),
      (SELECT COUNT(*) FROM skill_category LIMIT 1)
    )
  `).get('greatest').then(r => r === '0'),
  getTeamId: () => db.one(`
    SELECT id FROM slack_team WHERE slack_id = $[bocoupTeamId] AND is_active = true
  `, {bocoupTeamId}).get('id'),
  fixAndCleanup: getDestQuery(`
    SELECT SETVAL('skill_id_seq', (SELECT MAX(id) FROM skill));
    SELECT SETVAL('skill_category_id_seq', (SELECT MAX(id) FROM skill_category));
  `),
  // Categories.
  getCategories: getSrcQuery(`
    SELECT
      id,
      name
    FROM expertise_area;
  `),
  insertCategories: getInserter('skill_category', [
    'id',
    'slack_team_id',
    'name',
  ]),
  // Expertises -> skills.
  getExpertises: getSrcQuery(`
    SELECT
      id,
      expertise_area_id AS skill_category_id,
      name,
      description
    FROM expertise
  `),
  insertSkills: getInserter('skill', [
    'id',
    'skill_category_id',
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
  // Skill log.
  getExpertiseLog: getSrcQuery(`
    SELECT
      expertise_id AS skill_id,
      employee_id,
      experience_rating AS experience_scale_id,
      interest_rating AS interest_scale_id,
      notes AS reason,
      created_at,
      updated_at
    FROM employee_expertise
  `),
  insertSkillLog: getInserter('skill_slack_user_log', [
    'skill_id',
    'slack_user_id',
    'experience_scale_id',
    'interest_scale_id',
    'reason',
    'created_at',
    'updated_at',
  ]),
};

export default createMatcher({
  match: 'bocoup-import',
}, (message, {bot}) => {
  const importData = () => db.task(function() {
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
    // Adjust skill log records to have the new slack_user id.
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
    // Migrate skill categories.
    .then(q.getCategories).then(addTeamIdToRows).then(q.insertCategories)
    // Migrate skills.
    .then(q.getExpertises).then(q.insertSkills)
    // Create a oldId-newId mapping for existing users.
    .then(q.getSrcUsers).then(updateUserMapPart1)
    .then(q.getDestUsers).then(updateUserMapPart2)
    // Migrate skill log, translating old user ids to their new values.
    .then(q.getExpertiseLog).then(addSlackUserIdToRows).then(q.insertSkillLog)
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
  // Check to see if an import can be done safely.
  return q.checkIfCanImport()
  .then(canImport => {
    if (!canImport) {
      return 'The Bocoup expertise database import must be run on a fresh database with no skills or categories.';
    }
    return importData();
  });
});
