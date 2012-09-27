// Including libraries

var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	static = require('node-static'); // for serving files

// This will make all the files in the current folder
// accessible from the web
var fileServer = new static.Server('./');
	
// This is the port for our web server.
// you will need to go to http://localhost:8080 to see it
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
  io.set('log level', 1);
});

var currentID = 1;
var userIDs= new Array()
var currentLine = []
var drawnLines = []

// Delete this row if you want to see debug messages

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {

  socket.on('joining', function(){

    userIDs.push(currentID)
    console.log("user # " + currentID + " joined")
    currentLine.push([])
    console.log(currentLine)

    console.log(drawnLines)
    socket.emit('joinedCallback', currentID, drawnLines)
    currentID += 1
  });
  // Start listening for mouse move events
  socket.on('mousemove', function (data) {
    console.log('moving');
    if (currentLine[data.id-1] != undefined && data.drawing == true){
      currentLine[data.id-1].push(data)
    }
    // This line sends the event (broadcasts it)
    // to everyone except the originating client.
    socket.broadcast.emit('moving', data);
  });
  socket.on('endDrawing', function(data){
    if (currentLine!=[] || currentLine!= null){
      drawnLines.push(currentLine[data-1])
    }
    console.log("ending drawing")
    console.log(drawnLines)
    currentLine[data-1] = []
    socket.broadcast.emit('moving', data);
  })
});
