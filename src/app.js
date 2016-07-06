import express from 'express';
import bodyParser from 'body-parser';
import slack from 'slack';
import config from '../config';
import {query} from './services/db';
import botRunner from './services/bot-runner';

// ==========
// Web server
// ==========

const app = express();
app.use(bodyParser.urlencoded({extended: true}));

function redirectSuccess(res, message) {
  res.redirect(`/?message=${encodeURIComponent(message)}`);
}

function redirectError(res, message) {
  console.error('Error', message);
  res.redirect(`/?error=${encodeURIComponent(message)}`);
}

// Show the slack button for this app and an optional message.
app.get('/', (req, res) => {
  let {message} = req.query;
  const {error} = req.query;
  if (error) {
    res.status(400);
    message = `Error: ${error}`;
  }
  const header = message ? `<p>${message}</p>` : '';
  res.send(`
    ${header}
    <p>
      <a href="https://slack.com/oauth/authorize?scope=commands,bot&client_id=${config.tokens.client_id}">
        <img
        alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png"
        srcset="
          https://platform.slack-edge.com/img/add_to_slack.png 1x,
          https://platform.slack-edge.com/img/add_to_slack@2x.png 2x
        "/>
      </a>
    </p>
  `);
});

// Add a team integration.
app.get('/authorize', (req, res) => {
  const {error, code} = req.query;
  if (error) {
    return redirectError(res, error);
  }
  else if (!code) {
    return redirectError(res, 'Invalid or missing code');
  }
  // slack api request opts
  const options = Object.assign({code}, config.tokens);
  // get and send the api token
  slack.oauth.access(options, (err, payload) => {
    if (err) {
      return redirectError(res, err.message);
    }
    const token = payload.bot.bot_access_token;
    const teamId = payload.team_id;
    query.teamActivateInsertUpdate({payload, token, teamId})
    .then(() => {
      redirectSuccess(res, 'Integration successful');
    })
    .catch(er => {
      redirectError(res, er.message);
    });
  });
});

// Slack might do a GET to /command to verify that HTTPS is supported.
// https://api.slack.com/slash-commands#ssl
app.get('/command', (req, res) => res.sendStatus(200));

// Handle POST for command, which right now is just /skills
app.post('/command', (req, res) => {
  const {
    token,
    channel_id: channelId,
    team_id: teamId,
    user_name: userName,
    user_id: userId,
    text,
  } = req.body;
  // Fail if token doesn't match.
  if (token !== config.tokens.verification) {
    return res.status(404).send(`Error: incorrect verification token.`);
  }
  // Get the proper bot from the cache.
  const bot = botRunner.findBot(b => b.slack.rtmClient.activeTeamId === teamId);
  if (!bot) {
    return res.status(404).send(`Error: bot not found.`);
  }
  const {dataStore, activeUserId} = bot.slack.rtmClient;
  const botUser = dataStore.getUserById(activeUserId);
  // Get a DM "channel" id specific to the user in question.
  const {id: dmId} = dataStore.getDMByName(userName) || {};
  if (!dmId) {
    return res.status(404).send(`Error: direct message with <@${userId}> not found.`);
  }
  // Fool the bot into thinking the slash command text was really a direct
  // message from the user.
  bot.onMessage({
    type: 'message',
    channel: dmId,
    user: userId,
    text,
  });
  // Show the actual command text if the slash command was used in the DM.
  if (dmId === channelId) {
    res.send(`Running query "${botUser.name} ${text}"`);
  }
  // Otherwise, show a call to action in the channel instructing the user to
  // check out the DM.
  else {
    res.send(`Response will be in direct message with <@${activeUserId}>.`);
  }
});

// Start the web server.
app.listen(config.app.port, config.app.host);
console.log(`Server running on ${config.app.host}:${config.app.port}.`);

// Start the bot runner that manages starting/stopping bots.
botRunner.start();
