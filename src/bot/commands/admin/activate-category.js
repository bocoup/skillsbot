import {createCommand, createParser} from 'chatter';

export default createCommand({
  name: 'activate category',
  description: 'Activate a new skills category.',
  usage: '<category name>',
}, createParser(({args}) => {
  return 'activate category command coming soon';
}));
