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