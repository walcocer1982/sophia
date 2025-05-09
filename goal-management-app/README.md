# Goal Management App

## Overview
This is a personal goal management application built with Node.js and Express.js. It allows users to manage their goals, tasks, and routines efficiently. The application uses MongoDB Atlas for data storage and is designed for personal use without complex authentication.

## Features
- **User Management**: Basic user identification with name, unique email, and creation date.
- **Goal Management**: Create, read, update, and delete goals with attributes like title, description, type, status, and optional dates.
- **Task Management**: Manage tasks associated with goals, including title, description, priority, status, and due dates.
- **Routine Management**: Create and manage routines with frequency, specific days, scheduled time, and status.

## Technologies Used
- Node.js
- Express.js
- MongoDB Atlas (free tier)
- Mongoose
- dotenv

## Project Structure
```
goal-management-app
├── src
│   ├── controllers
│   ├── models
│   ├── routes
│   ├── app.js
│   └── config
├── package.json
├── .env
├── README.md
└── tests
```

## Setup Instructions

1. **Clone the Repository**
   ```
   git clone <repository-url>
   cd goal-management-app
   ```

2. **Install Dependencies**
   ```
   npm install
   ```

3. **Configure Environment Variables**
   - Create a `.env` file in the root directory.
   - Add your MongoDB connection string:
     ```
     MONGODB_URI=<your_mongodb_connection_string>
     ```

4. **Run the Application**
   ```
   npm start
   ```

5. **Access the API**
   - The application will run on `http://localhost:3000`.

## API Endpoints
- **Goals**
  - `POST /goals`: Create a new goal
  - `GET /goals`: Retrieve all goals
  - `PUT /goals/:id`: Update a goal
  - `DELETE /goals/:id`: Delete a goal

- **Tasks**
  - `POST /tasks`: Create a new task
  - `GET /tasks`: Retrieve all tasks
  - `PUT /tasks/:id`: Update a task
  - `DELETE /tasks/:id`: Delete a task

- **Routines**
  - `POST /routines`: Create a new routine
  - `GET /routines`: Retrieve all routines
  - `PUT /routines/:id`: Update a routine
  - `DELETE /routines/:id`: Delete a routine

## Testing
- Use Postman or cURL to test the API endpoints.
- Tests for goals, tasks, and routines are located in the `tests` directory.

## License
This project is open-source and available for personal use.