# My Fullstack App

This project is a fullstack application that allows users to fetch and display DNI information using an external API. It consists of a backend built with Node.js and Express, and a frontend built with HTML, CSS, and JavaScript.

## Frontend

The frontend is located in the `frontend` directory. It communicates with the backend to retrieve DNI information.

### Setup Instructions

1. Navigate to the `frontend` directory:
   ```
   cd frontend
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Start the frontend application:
   ```
   npm start
   ```

4. Open your browser and go to `http://localhost:3000` to view the application.

### File Structure

- `src/index.html`: The main HTML file for the frontend application.
- `src/app.js`: JavaScript code for handling user interactions and making requests to the backend.
- `src/styles/style.css`: CSS styles for the frontend application.

### Usage

- Enter a DNI number in the input field and submit the form to fetch the corresponding DNI information.
- The application will display the retrieved information on the page.

## Backend

For backend setup instructions, refer to the `backend/README.md` file.