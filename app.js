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


var drawingCounter = 0
var drawnLines = new Array()
var currentLine = new Array()

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {
  socket.emit('joined', drawnLines)
  socket.broadcast.emit('other')
  // A mouseup means the user stopped drawing. 
  socket.on('mouseup', function(data){
    // if drawingCounter is greater than 0, a line was drawn
    if (drawingCounter > 0){
      drawingCounter = 0
      drawnLines.push(currentLine)
      currentLine = new Array()
    }
  })
  // Start listening for mouse move events
  socket.on('mousemove', function (data) {
      console.log(data)
    
    if (data.drawing == true){
      drawingCounter += 1
      currentLine.push({"x":data.x,"y":data.y})
    }
    //console.log(data);
    //add to database
    // This line sends the event (broadcasts it)
    // to everyone except the originating client.
    socket.broadcast.emit('moving', data);
  });
  socket.on('testing', function(data){
    console.log('test-data')
    console.log(data)
  })
});
