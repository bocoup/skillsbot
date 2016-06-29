import {createCommand} from 'chatter';
import {db} from '../../services/db';

export default createCommand({
  name: 'fix-db',
  description: 'Fix Bocoup database after initial import / app integration re-add.',
}, (message, {bot}) => {
  return db.task(function() {
    return Promise.resolve()
    // Set users and categories to the correct slack team id
    .then(() => db.one("SELECT id FROM slack_team WHERE slack_id = 'T025GMFDP' AND is_active = true").get('id'))
    .then(teamId => {
      return db.tx(tx => tx.batch([
        tx.none('UPDATE slack_user SET slack_team_id = ${teamId}', {teamId}),
        tx.none('UPDATE expertise_category SET slack_team_id = ${teamId}', {teamId}),
      ]));
    })
    // Set slack user ids
    .then(() => db.one('SELECT ARRAY_AGG(name) as users from slack_user').get('users'))
    .then(users => {
      const insertQuery = 'UPDATE slack_user SET slack_id = ${userId} WHERE name = ${name}';
      return db.tx(tx => tx.batch(users.map(name => {
        const userId = bot.getUser(name).id;
        return db.none(insertQuery, {name, userId});
      })));
    });
  })
  .then(() => 'done')
  .catch(err => `Error: \`${err.message}\``);
});
