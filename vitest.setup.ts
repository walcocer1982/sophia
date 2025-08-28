import { config } from 'dotenv';
import fs from 'fs';

// Cargar .env.local si existe; si no, .env
if (fs.existsSync('.env.local')) {
  config({ path: '.env.local' });
} else {
  config();
}


