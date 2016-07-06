import createBot from '../bot';
import BotRunner from '../util/bot-runner';
import {query} from './db';
import {initSlackUserSync} from './sync-slack';

// Start and stop bots as-necessary, automatically deactivating any bots that
// become inactive.
const botRunner = new BotRunner({
  // Create and start a new bot via token.
  createBot(token) {
    const bot = createBot(token);
    // Logging in ensures the rtm client has been created.
    bot.login();
    // If the rtm client disconnects because of account_inactive, the team
    // integration has been terminated.
    bot.slack.rtmClient.on('disconnect', (_, code) => {
      if (code === 'account_inactive' || code === 'invalid_auth') {
        query.teamDeactivate({token});
      }
    });
    // Ensure slack_user table stays synchronized with Slack.
    initSlackUserSync(token, bot.slack.rtmClient);
    return bot;
  },
  destroyBot(bot) {
    // TODO: figure out how to actually free up the SlackBot instance memory
  },
  // Get arrays of tokens for active and inactive integrations.
  getIntegrations() {
    return query.teams().then(teams => {
      const active = teams.filter(t => t.is_active).map(t => t.token);
      const inactive = teams.filter(t => !t.is_active).map(t => t.token);
      return {active, inactive};
    });
  },
});

export default botRunner;
