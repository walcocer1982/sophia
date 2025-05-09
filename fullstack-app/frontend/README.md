# Frontend Documentation

## Overview
This frontend application is built using React and TypeScript. It interacts with the backend service to fetch and display information related to DNI (National Identity Document) numbers.

## Project Structure
- `src/`: Contains all the source code for the frontend application.
  - `App.tsx`: The main component that initializes the application.
  - `components/`: Contains reusable components.
    - `index.tsx`: Exports the `DniForm` component for user input and displaying results.
  - `services/`: Contains service functions for API calls.
    - `api.ts`: Exports the `fetchDni` function to interact with the backend API.
  - `types/`: Contains TypeScript interfaces for type safety.
    - `index.ts`: Exports interfaces for form data and API response.

## Installation
To install the necessary dependencies, run the following command in the `frontend` directory:

```
npm install
```

## Running the Application
To start the development server, use the following command:

```
npm start
```

The application will be available at `http://localhost:3000`.

## Usage
1. Enter a DNI number in the input field.
2. Submit the form to fetch the corresponding DNI information from the backend.
3. The results will be displayed on the same page.

## Dependencies
- `react`: A JavaScript library for building user interfaces.
- `axios`: A promise-based HTTP client for making requests.
- `typescript`: A superset of JavaScript that adds static types.

## Contributing
Feel free to submit issues or pull requests for improvements or bug fixes.