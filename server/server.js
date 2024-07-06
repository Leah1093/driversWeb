import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { sendRatingEmail } from './mailer.js';
import 'dotenv/config';
import { query } from '../server/service/query.js'
import { QueryItem } from "../server/service/queryItem.js";

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

async function updateRidePrice(updatedRequest) {
  const queryItem = new QueryItem();
  const updateQuery = queryItem.updateItemQuery("rides", "price = ?, status = ?");
  const values = [updatedRequest.price, 2, updatedRequest.id];
  const result = await query(updateQuery, values)
  return
}

async function driverAccepted(requestId) {
  const queryItem = new QueryItem();
  const updateQuery = queryItem.updateItemQuery("rides", "status = ?, driverId = ?");
  const values = [3, requestId.driverId, requestId.request];
  const result = await query(updateQuery, values)

  return
}

async function newRideRequest(request,socketId) {
  const queryItem = new QueryItem();
  let t;
  let tt;
  request.requestType === 'package' ? (t = "packageSize", tt = request.packageSize) : (t = "passengers", tt = request.passengers)
  const postQuery = queryItem.postItemQuery("rides", "?,?, ?, ?, ?, ?, ?,?,?,?", `(price, costumerId, status, pickupLocation, destination, ${t},isRated,date,time,socketId)`);
  let values = [
    null,
    request.costumerId,
    1,
    request.from,
    request.to,
    tt,
    0,
    request.date,
    request.time,
    socketId
  ];
  const result = await query(postQuery, values)

  return result.insertId
}

io.on('connection', (socket) => {
  socket.on('newRideRequest', async (request) => {
    const result = await newRideRequest(request,socket.id )
    request.id = result
    io.emit('rideRequestForSecretary', { ...request, socketId: socket.id });
  });


  socket.on('priceUpdated', async (updatedRequest) => {
    updateRidePrice(updatedRequest)
    io.emit('rideRequestForDrivers', updatedRequest);
  });

  socket.on('driverAccepted', async (requestId) => {
    console.log("hi driver")
    console.log(requestId.socketId)
    driverAccepted(requestId)
    io.to(requestId.socketId).emit('driverFound', { driverId: requestId.driverId });
    console.log(requestId)
    console.log(requestId.request)
    io.emit('rideRequestClosed', requestId.request);
    sendRatingEmail(requestId.costumerEmail, { costumerId: requestId.costumerId, driverId: requestId.driverId, rideId: requestId.request });
  });



  socket.on('requestChat', (data) => {
    io.emit('chatRequestForSecretary', data);
  });

  socket.on('respondToChatRequest', (data) => {
    io.to(data.customerSocketId).emit('chatRequestResponse', data);
  });

  socket.on('sendMessage', (message) => {
    io.to(message.recipientId).emit('receiveMessage', message);
    socket.emit('receiveMessage', message);
  });

});

server.listen(process.env.PORT, () => {
  console.log(`The server is running on port: ${process.env.PORT}`);
});