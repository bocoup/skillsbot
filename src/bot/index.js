import {createSlackBot, createCommand, createConversation, createArgsAdjuster} from 'chatter';
import {RtmClient, WebClient, MemoryDataStore} from '@slack/client';
import mixinBotHelpers from './helpers';

// Sub-commands.
// import findCommand from './commands/find';
// import {forCommand, meCommand} from './commands/for';
// import listCommand from './commands/list';
import scalesCommand from './commands/scales';
// import statsCommand from './commands/stats';
// import updateCommand from './commands/update';

export default function createBot(token) {

  const bot = createSlackBot({
    name: 'Expertise Test Bot',
    verbose: true,
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
    createMessageHandler(id, {channel}) {
      // Give command a name in public channels.
      const name = channel.is_im ? null : 'expertise';
      // Helper method to format the given command name.
      const getCommand = cmd => name ? `${name} ${cmd}` : cmd;

      const expertiseCommand = createCommand({
        isParent: true,
        name,
        description: 'Show your expertise.',
      }, [
        // findCommand,
        // forCommand,
        // meCommand,
        // listCommand,
        scalesCommand,
        // statsCommand,
        // updateCommand,
      ]);

      return createConversation([
        createArgsAdjuster(
          {
            // Inject token and getCommand helper function into all commands'
            // meta object (2nd argument).
            adjustArgs(message, meta) {
              return [message, Object.assign(meta, {token, getCommand})];
            },
          },
          expertiseCommand
        ),
      ]);
    },
  });

  mixinBotHelpers(bot);

  return bot;

}
