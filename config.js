'use strict';

require('dotenv').config();

module.exports = {
  isProduction: process.env.NODE_ENV === 'production',
  runJobs: process.env.RUN_JOBS,
  bocoupTeamId: 'T025GMFDP',
  app: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || '8000',
  },
  tokens: {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    verification: process.env.SLACK_VERIFICATION_TOKEN,
  },
  db: {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGNAME,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },
};
