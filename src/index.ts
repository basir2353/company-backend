import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Gemivora CMS API listening on 0.0.0.0:${env.PORT}`);
});
