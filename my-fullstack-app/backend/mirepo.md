---
repository:
  name: my-fullstack-app-backend
  owner: unknown
  url: ""
generated:
  timestamp: 2025-01-11T02:35:22.448Z
  tool: FlatRepo
statistics:
  totalFiles: 6
  totalLines: 134
  languages:
    markdown: 1
    json: 1
    javascript: 4
  fileTypes:
    .md: 1
    .json: 1
    .js: 4
---

===  README.md
```markdown
# Backend API for DNI Information

This is the backend part of the fullstack application that interacts with the RENIEC API to fetch DNI information.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Technologies Used](#technologies-used)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd my-fullstack-app/backend
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Usage

To start the backend server, run:
```
npm start
```
The server will run on `http://localhost:3000`.

## API Endpoints

### Get DNI Information
- **Endpoint:** `/api/dni`
- **Method:** `GET`
- **Headers:**
  - `Authorization: Bearer <YOUR_API_TOKEN>`
- **Query Parameters:**
  - `numero`: The DNI number to fetch information for.

**Example Request:**
```
curl -H 'Accept: application/json' -H "Authorization: Bearer YOUR_API_TOKEN" http://localhost:3000/api/dni?numero=46027897
```

## Technologies Used

- Node.js
- Express
- Axios

This backend is designed to work seamlessly with the frontend application, providing necessary endpoints to fetch and display DNI information.
```
=== EOF: README.md

===  package.json
```json
{
  "name": "my-fullstack-app-backend",
  "version": "1.0.0",
  "description": "Backend for the fullstack application to fetch DNI information.",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "axios": "^0.21.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.7"
  },
  "author": "",
  "license": "ISC"
}
```
=== EOF: package.json

===  src\app.js
```javascript
const express = require('express');
const app = express();
const dniRoutes = require('./routes/dniRoutes');

app.use(express.json());
app.use('/api/dni', dniRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```
=== EOF: src\app.js

===  src\services\dniService.js
```javascript
const axios = require('axios');

class DniService {
    constructor() {
        this.apiUrl = 'https://api.apis.net.pe/v2/reniec/dni';
        this.token = 'apis-token-12599.Pn7NDHV3WJ2mpsY6TRzvJcXPKZHQw1Hw';
    }

    async fetchDni(numero) {
        try {
            const response = await axios.get(`${this.apiUrl}?numero=${numero}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching DNI:', error);
            throw error;
        }
    }
}

export default DniService;
```
=== EOF: src\services\dniService.js

===  src\routes\dniRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const dniController = require('../controllers/dniController');

router.get('/:numero', dniController.getDniInfo);

module.exports = router;
```
=== EOF: src\routes\dniRoutes.js

===  src\controllers\dniController.js
```javascript
class DniController {
    constructor(dniService) {
        this.dniService = dniService;
    }

    async getDni(req, res) {
        const { numero } = req.params;
        try {
            const dniData = await this.dniService.fetchDni(numero);
            res.json(dniData);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching DNI data' });
        }
    }
}

module.exports = DniController;
```
=== EOF: src\controllers\dniController.js

