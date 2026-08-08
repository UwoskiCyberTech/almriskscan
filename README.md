# Direct Wallet Withdrawal App

## Overview
This app lets you withdraw crypto directly from a connected wallet to any recipient address without a payment gateway or third-party payment API.

## Project Structure
The project is organized into several directories:

- **apps/web**: Contains the frontend application built with React and Next.js.
  - **src/app**: Main application logic, including routing and state management.
  - **src/components**: Reusable React components for the UI.
  - **src/features**: Feature-specific logic for wallet connections and transaction handling.
  - **src/hooks**: Custom React hooks for state management and side effects.
  - **src/lib**: Utility functions for blockchain interactions.
  - **src/pages**: Main pages of the application.
  - **src/styles**: Tailwind CSS styles and custom styles.

- **apps/server**: Contains the backend application built with Express.
  - **src/api**: API routes for server-side logic.
  - **src/config**: Configuration files for environment variables and settings.
  - **src/controllers**: Controllers for handling requests.
  - **src/middleware**: Middleware functions for validation and error handling.
  - **src/models**: Data models for transactions and user data.
  - **src/services**: Service classes for wallet interactions and transaction handling.
  - **src/workers**: Background workers for processing tasks.
  - **src/utils**: Utility functions for various tasks.

- **packages/shared**: Shared code and types for both web and server applications.
- **packages/contracts**: Smart contract code necessary for the application.

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- Docker (for containerized deployment)

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd web3-payment-app
   ```

2. Install dependencies for the web application:
   ```
   cd apps/web
   npm install
   ```

3. Install dependencies for the server application:
   ```
   cd ../server
   npm install
   ```

4. Set up environment variables:
   - Copy the `.env.example` file to `.env` and fill in the required values.

### Running the Application
- To run the web application:
  ```
  cd apps/web
  npm run dev
  ```

- To run the server application:
  ```
  cd apps/server
  npm run dev
  ```

### Docker Deployment
To run the application using Docker, execute:
```
docker-compose up
```

## Usage
- Connect your wallet using the wallet modal in the web application.
- Enter a recipient address and amount to withdraw funds directly.
- Track the transaction on the network explorer after submission.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.