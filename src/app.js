import express from 'express';
import slack from 'slack';
import config from '../config';
import {query} from './services/db';
import botRunner from './services/bot-runner';
import path from 'path';
import swig from 'swig';

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

// set views and assets
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/public'));

app.set('view cache', false);
swig.setDefaults({cache: false});

app.use('/assets', express.static(path.join(__dirname, '/public/assets')));
app.use('/css', express.static(path.join(__dirname, '/public/css')));

// Show the slack button for this app and an optional message.
app.get('/', (req, res) => {
  let {message} = req.query;
  const {error} = req.query;
  if (error) {
    res.status(400);
    message = `Error: ${error}`;
  }
  const header = message ? `${message}` : '';
  let headerClass = '';
  if (message) {
    headerClass = (error) ? 'error' : 'success';
  }

  // send html landing page
  res.render('index', {
    header,
    headerClass,
    client_id: config.tokens.client_id,
  });
});

app.get('/privacypolicy', (req, res) => {
  // send html privacy policy page
  res.render('privacy');
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
