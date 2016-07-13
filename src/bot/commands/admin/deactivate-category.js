import {createCommand, createParser} from 'chatter';

export default createCommand({
  name: 'deactivate category',
  description: 'Deactivate a new skills category.',
  usage: '<category name>',
}, createParser(({args}) => {
  return 'deactivate category command coming soon';
}));
