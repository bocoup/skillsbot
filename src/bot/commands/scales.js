import {createCommand} from 'chatter';
import {one} from '../../services/db';

export default createCommand({
  name: 'scales',
  description: 'List interest and experience scales.',
}, () => {
  return one.scales().then(({interest, experience}) => {
    const list = arr => arr.map(([ranking, description]) => `> *${ranking}.* ${description}`);
    return [
      '*Interest:*',
      list(interest),
      '*Experience:*',
      list(experience),
    ];
  });
});
