import {db} from './db';
import sql from '../sql';

// Update slack_user table to ensure all team userdata is current.
function syncSlackUsers(token, users) {
  return db.task(function() {
    return db.tx(tx => tx.batch(users.map(user => {
      // Don't sync bots.
      if (user.is_bot || user.id === 'USLACKBOT') {
        return null;
      }
      return db.none(sql.userInsertUpdate, {
        token,
        userId: user.id,
        isActive: !user.deleted,
        meta: user,
      });
    })));
  });
}

export function initSlackUserSync(token, rtmClient) {
  // Get all user data when the bot connects.
  rtmClient.on('authenticated', () => {
    const {users} = rtmClient.dataStore;
    syncSlackUsers(token, Object.keys(users).map(id => users[id]));
  });

  // Handle user data changes while connected.
  rtmClient.on('user_change', ({user}) => {
    syncSlackUsers(token, [user]);
  });
}
