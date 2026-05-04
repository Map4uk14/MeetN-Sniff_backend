# MeetN-Sniff Backend

A Node.js/Express backend application for the MeetN-Sniff platform with MongoDB database integration, JWT authentication, and RESTful APIs.

## Prerequisites

- Node.js (v14 or higher)
- npm
- MongoDB (local or cloud instance)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Map4uk14/MeetN-Sniff_backend.git
cd MeetN-Sniff_backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your environment variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

## Running the Project

### Development
```bash
npm run dev
```
The server will start with hot reload using Nodemon.

### Production
```bash
npm start
```

## Project Structure
 
```
MeetN-Sniff_backend/
├── package.json
├── .env
├── .env.example
├── .gitignore
```
 
## Technologies Used 
 
- **Express.js** - Web framework for Node.js
- **MongoDB & Mongoose** - Database and ODM
- **JWT (jsonwebtoken)** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-Origin Resource Sharing
- **Axios** - HTTP client
- **dotenv** - Environment variable management
- **Nodemon** - Development server with auto-reload

## API Documentation
 
[Add API endpoints documentation here]
 
## Contributing 
 
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

ISC License - see LICENSE file for details

## Support 

For issues and questions, please open an issue on [GitHub Issues](https://github.com/Map4uk14/MeetN-Sniff_backend/issues)
