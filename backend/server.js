import 'dotenv/config'; // Load environment variables from .env file
import http from 'http'; // Node.js HTTP module
import app from './app.js'; // Import Express app (assumed to be in app.js)
import { Server } from 'socket.io'; // Socket.IO for real-time communication
import jwt from 'jsonwebtoken'; // JSON Web Token for authentication
import mongoose from 'mongoose'; // MongoDB ORM
import projectModel from './models/project.model.js'; // Project MongoDB model
import { generateResult } from './services/ai.service.js'; // Import AI service function

const port = process.env.PORT || 3000; // Server port from env or default to 3000

// Create HTTP server with Express app
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (adjust in production for security)
  },
});

// Middleware for Socket.IO authentication
io.use(async (socket, next) => {
  try {
    // Extract token from handshake (auth token or Authorization header)
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
    const projectId = socket.handshake.query.projectId;

    // Validate projectId as a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new Error('Invalid projectId'));
    }

    // Fetch project from database
    socket.project = await projectModel.findById(projectId);

    if (!socket.project) {
      return next(new Error('Project not found'));
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.user = decoded; // Attach decoded user info to socket
    next(); // Proceed to connection
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(error); // Pass error to Socket.IO
  }
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  socket.roomId = socket.project._id.toString(); // Set room ID based on project ID
  console.log(`User connected: ${socket.user.email} to project ${socket.roomId}`);

  // Join the project room
  socket.join(socket.roomId);

  // Handle incoming project messages
  socket.on('project-message', async (data) => {
    const message = data.message;

    // Broadcast message to all clients in the room (including sender)
    io.to(socket.roomId).emit('project-message', {
      ...data,
      timestamp: data.timestamp || Date.now(), // Ensure timestamp is included
    });

    // Check if message is directed to AI
    if (message.includes('@ai')) {
      try {
        const prompt = message.replace('@ai', '').trim(); // Extract prompt

        // Generate AI response
        const result = await generateResult(prompt);

        // Send AI response to all clients in the room
        io.to(socket.roomId).emit('project-message', {
          message: JSON.stringify(result),
          sender: { _id: 'ai', email: 'AI' },
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error generating AI response in socket:', error.message);
        io.to(socket.roomId).emit('project-message', {
          message: JSON.stringify({ text: 'Error: Unable to process AI request' }),
          sender: { _id: 'ai', email: 'AI' },
          timestamp: Date.now(),
        });
      }
    }
  });

  // Handle message deletion
  socket.on('delete-message', (data) => {
    const { timestamp, projectId, sender } = data;

    // Validate sender matches the socket user (optional security check)
    if (sender._id !== socket.user._id) {
      console.log(`Unauthorized delete attempt by ${socket.user.email} for message ${timestamp}`);
      return;
    }

    // Broadcast delete event to all clients in the room
    io.to(socket.roomId).emit('delete-message', {
      timestamp,
      projectId,
      sender,
    });
    console.log(`Message ${timestamp} deleted by ${socket.user.email} in project ${socket.roomId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.email} from project ${socket.roomId}`);
    socket.leave(socket.roomId);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});