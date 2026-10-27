import 'dotenv/config';
import { env } from './env';
import { createApp } from './app';

// 0.0.0.0 so phones on the same Wi-Fi (Expo Go) can reach the API
createApp().listen(env.PORT, '0.0.0.0', () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
