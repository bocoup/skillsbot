// =============================
// Start and stop bots as needed
// =============================

const nop = () => {};

export default class BotRunner {

  constructor({
    createBot,
    destroyBot = nop,
    getIntegrations,
    pollDelay = 1000,
  }) {
    this.bots = {};
    this.createBot = createBot;
    this.destroyBot = destroyBot;
    this.getIntegrations = getIntegrations;
    this.pollDelay = pollDelay;
  }

  // Start a bot if it's not already running.
  startBot(token) {
    if (!this.bots[token]) {
      console.log('BotRunner START', token);
      this.bots[token] = this.createBot(token);
    }
  }

  // Stop a bot if it's running.
  stopBot(token) {
    if (this.bots[token]) {
      console.log('BotRunner STOP', token);
      this.destroyBot(this.bots[token]);
      delete this.bots[token];
    }
  }

  startOrStopBots() {
    this.getIntegrations().then(({active = [], inactive = []}) => {
      active.forEach(token => this.startBot(token));
      inactive.forEach(token => this.stopBot(token));
    });
  }

  start() {
    setInterval(() => this.startOrStopBots(), this.pollDelay);
  }

}
