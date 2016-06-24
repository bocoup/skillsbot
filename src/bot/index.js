import {createSlackBot} from 'chatter';
import {RtmClient, WebClient, MemoryDataStore} from '@slack/client';
import mixinBotHelpers from './helpers';

export default function createBot(token) {

  const bot = createSlackBot({
    name: 'Expertise Test Bot',
    getSlack() {
      return {
        rtmClient: new RtmClient(token, {
          dataStore: new MemoryDataStore(),
          autoReconnect: true,
          logLevel: 'error',
        }),
        webClient: new WebClient(token),
      };
    },
    createMessageHandler() {
      return message => `You said "${message}".`;
    },
  });

  mixinBotHelpers(bot);

  return bot;

}
