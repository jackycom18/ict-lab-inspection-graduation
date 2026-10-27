import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.mjs';
import { createStore } from './store.mjs';


const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
// DATA_FILE keeps demo records outside source-controlled application logic.
const DATA_FILE = process.env.LAB_DATA_FILE || path.resolve(CURRENT_DIR, '..', 'data', 'lab-db.json');
// PORT defaults to 3000 to match the documented local workflow.
const PORT = Number(process.env.PORT || 3000);

const store = createStore(DATA_FILE);
const server = createApp(store);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Lab inspection system: http://127.0.0.1:${PORT}`);
});
