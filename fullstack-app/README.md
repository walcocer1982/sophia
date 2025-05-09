# Fullstack Application

This project is a fullstack application that integrates a backend service for fetching DNI information from an external API and a frontend application for user interaction.

## Project Structure

```
fullstack-app
├── backend
│   ├── src
│   │   ├── app.ts          # Entry point for the backend application
│   │   ├── controllers     # Contains controllers for handling requests
│   │   │   └── index.ts    # Exports the DNI controller
│   │   ├── routes          # Contains route definitions
│   │   │   └── index.ts    # Sets up routes for the backend
│   │   └── types           # Type definitions for the application
│   │       └── index.ts    # Exports request and response types
│   ├── package.json        # Backend dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration for the backend
│   └── README.md           # Documentation for the backend
├── frontend
│   ├── src
│   │   ├── App.tsx         # Main component for the frontend application
│   │   ├── components       # Contains React components
│   │   │   └── index.tsx    # Exports the DNI form component
│   │   ├── services        # Contains service functions for API calls
│   │   │   └── api.ts      # Function to fetch DNI information from the backend
│   │   └── types           # Type definitions for the frontend
│   │       └── index.ts    # Exports form data and result types
│   ├── package.json        # Frontend dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration for the frontend
│   └── README.md           # Documentation for the frontend
└── README.md               # Overall documentation for the fullstack application
```

## Getting Started

### Prerequisites

- Node.js
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd fullstack-app
   ```

2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd ../frontend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm start
   ```

2. Start the frontend application:
   ```
   cd frontend
   npm start
   ```

### Usage

- Access the frontend application at `http://localhost:3000`.
- Use the form to input a DNI number and retrieve information from the backend.

## API Integration

The backend integrates with the external DNI API using the following endpoint:

```
curl -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" https://api.apis.net.pe/v2/reniec/dni?numero=<DNI_NUMBER>
```

Replace `<DNI_NUMBER>` with the actual DNI number you want to query.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.