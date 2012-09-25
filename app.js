// Including libraries
var app = require('http').createServer(handler),
  io = require('socket.io').listen(app),
  static = require('node-static'); // for serving files

// This will make all the files in the current folder
// accessible from the web
var fileServer = new static.Server('./');

// This is the port for our web server.
// you will need to go to http://localhost:5000 to see it
var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});


// If the URL of the socket server is opened in a browser
function handler (request, response) {

  request.addListener('end', function () {
        fileServer.serve(request, response);
    });
}

io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});



// Delete this row if you want to see debug messages
io.set('log level', 1);

var currentID = 1;
var lineID = 0
var drawnLines = []

// A buffer for the user's Currently drawn line

var currentLine = []
var userIDs= new Array()

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {

  socket.on('joining', function(){
    userIDs.push(currentID)
    console.log("user id " + currentID + " joined")

    //add a currentLine for the user
    currentLine.push([])
    //tell everyone that someone joined
    socket.broadcast.emit('otherUserJoined', userIDs)

    //tell the user about everything else
    socket.emit('joinedCallback', currentID, userIDs, drawnLines)
    currentID += 1


  })

  // A mousedown means a user started drawing.
  socket.on('mousedown', function(data){
    //we're drawing a new line, find the user's current line
    currentLine[data.userID-1].push(data)
    //pass the data along to clients
    socket.broadcast.emit("othersStartDrawing", data)
  })

  // A mouseup means the user stopped drawing. 
  socket.on('mouseup', function(data){
    //console.log(currentLine[data-1])
    
    //the user stopped drawing a line, push it to the drawnlines
    drawnLines.push(currentLine[data-1])
    //clear the current line buffer for the current user
    currentLine[data-1] = []
    //pass the data along
    socket.broadcast.emit("othersStoppedDrawing", data)
  })

  // Start listening for mouse move events
  socket.on('mousemove', function (data) {
      //push the data to the current line
    currentLine[data.userID-1].push({
      "x":data.x,
      "y":data.y,
      "color":data.color,
      "size":data.size,
    })

    //console.log(data);
    //add to database
    // This line sends the event (broadcasts it)
    // to everyone except the originating client.
    socket.broadcast.emit('othersMoving', data);
  });
  socket.on('testing', function(data){
    console.log('test-data')
    console.log(data)
  })

  //set the user ID for the next user


});
