import express from 'express';
import slack from 'slack';
import config from '../config';
import {query} from './services/db';
import botRunner from './services/bot-runner';

// ==========
// Web server
// ==========

const app = express();

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
      <a href="https://slack.com/oauth/authorize?scope=bot&client_id=${config.tokens.client_id}">
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

// Start the web server.
app.listen(config.app.port, config.app.host);
console.log(`Server running on ${config.app.host}:${config.app.port}.`);

// Start the bot runner that manages starting/stopping bots.
botRunner.start();
