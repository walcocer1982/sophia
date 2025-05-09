# My Fullstack App

This project is a fullstack application that provides an interface to fetch DNI information using an external API. It consists of a backend built with Node.js and Express, and a frontend built with HTML, CSS, and JavaScript.

## Project Structure

```
my-fullstack-app
├── backend
│   ├── src
│   │   ├── app.js                # Entry point for the backend application
│   │   ├── controllers
│   │   │   └── dniController.js   # Handles requests for DNI information
│   │   ├── routes
│   │   │   └── dniRoutes.js       # Sets up routes for DNI-related endpoints
│   │   └── services
│   │       └── dniService.js      # Interacts with the external API
│   ├── package.json               # Backend dependencies and scripts
│   └── README.md                  # Documentation for the backend
├── frontend
│   ├── src
│   │   ├── index.html             # Main HTML file for the frontend
│   │   ├── app.js                 # JavaScript code for the frontend
│   │   └── styles
│   │       └── style.css          # CSS styles for the frontend
│   ├── package.json               # Frontend dependencies and scripts
│   └── README.md                  # Documentation for the frontend
└── README.md                      # Overview of the entire project
```

## Getting Started

### Prerequisites

- Node.js
- npm (Node Package Manager)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd my-fullstack-app
   ```

2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm start
   ```

2. Open a new terminal and start the frontend:
   ```
   cd frontend
   npm start
   ```

3. Access the application in your browser at `http://localhost:3000`.

## API Usage

The backend interacts with an external API to fetch DNI information. The endpoint used is:
```
GET https://api.apis.net.pe/v2/reniec/dni?numero={dni_number}
```
Make sure to replace `{dni_number}` with the actual DNI number you want to query.

## Contributing

Feel free to submit issues or pull requests for any improvements or bug fixes.