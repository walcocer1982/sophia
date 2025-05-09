# Backend API for DNI Retrieval

This backend application serves as an API for retrieving DNI (National Identity Document) information using an external API. It is built with TypeScript and Express.

## Project Structure

- `src/app.ts`: Entry point of the application. Initializes the Express app and sets up middleware and routes.
- `src/controllers/index.ts`: Contains the `DniController` class which handles requests to the external DNI API.
- `src/routes/index.ts`: Defines the routes for the application, specifically the `/dni` endpoint.
- `src/types/index.ts`: Contains TypeScript interfaces for request and response structures.

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd fullstack-app/backend
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Run the application**:
   ```
   npm start
   ```

## API Endpoint

- **GET /dni**: Retrieves DNI information.
  - **Query Parameters**:
    - `numero`: The DNI number to be queried.
  - **Headers**:
    - `Authorization`: Bearer token for API access.

## Dependencies

- `express`: Web framework for Node.js.
- `axios`: Promise-based HTTP client for the browser and Node.js.
- `typescript`: TypeScript language support.

## License

This project is licensed under the MIT License.