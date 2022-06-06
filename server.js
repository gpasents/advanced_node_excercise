'use strict';
require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const routes = require('./routes');
const auth = require('./auth');
const passportSocketIo = require("passport.socketio");
const MongoStore = require("connect-mongo")(session);
const cookieParser = require("cookie-parser");


const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const URI = process.env["MONGO_URI"];
const store = new MongoStore({ url: URI });



app.set('view engine','pug');
fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//middleware goes here
app.use(session({
  secret: process.env["SESSION_SECRET"],
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));
app.use(passport.initialize());
app.use(passport.session());


// configure passport auth for socket io
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);


myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  routes(app,myDataBase);
  auth(app,myDataBase);
  //listen for connections to the db
  let currentUsers = 0;
  io.on('connection', (socket) => {
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });
    console.log('User '+ socket.request.user.username + " has logged in");

    socket.on('chat message', (message) => {
      io.emit('chat message', { name: socket.request.user.name, message });
    });
    //handle disconnects
    socket.on("disconnect",()=>{
    --currentUsers;
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: false
    });
    console.log('A user has disconnected');
    });
    
  });
  // Be sure to add this...
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

//succ auth function for socket
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

//unsucc auth function for socket 
function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
