// Including libraries

var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
  url = require('url'),
	static = require('node-static'), // for serving files
  fs = require('fs'); //for writing to files
  Mustache = require('./public/assets/js/mustache');

// This will make all the files in the current folder
// accessible from the web

var fileServer = new static.Server('./public');
var files = {"all":[ ]};


//set up actions?
var screens_template = "Files <ul>{{#all}}<li><a href='{{url}}'>{{name}}</a></li>{{/all}}</ul>";

var currentID = 1;
var userIDs= new Array()
var currentLine = []
var drawnLines = []

// This is the port for our web server.
// you will need to go to http://localhost:8080 to see it
var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});


// If the URL of the socket server is opened in a browser
function handler (request, response) {
  request.addListener('end', function () {
    if (request.url == "/screens/"){
      displayScreens(request, response)
    } else if (request.url == "/clean-screen/"){
      console.log('cleared screens')
      currentID = 1;
      userIDs= new Array()
      currentLine = []
      drawnLines = []
      socket.emit('force_refresh')
    } else if (request.url == "/clean-files/"){
      currentID = 1;
      userIDs= new Array()
      currentLine = []
      drawnLines = []
      deleteScreens(request, response)
    }
      fileServer.serve(request, response);
    });
}

function deleteScreens (request, response) {
  fs.readdir("./public/screenshots/", function(err, screen_files){
    files = {"all":[]}
    if (screen_files != undefined){
      screen_files.sort().forEach(function(file){
        var path = "./public/screenshots/"+file;
        console.log("deleting file " + path)
        fs.unlink(path)
      })
    }
  })
}


function displayScreens (request, response) {
  fs.readdir("./public/screenshots/", function (err, screen_files){
    files = {"all":[ ]};
    if (screen_files != undefined){
      screen_files.sort().forEach(function(file){
        files['all'].push({url:"/screenshots/"+file, name:file})
      })
      response.writeHead(200, {'Content-Type': 'text/html'});
      template=screens_template.toString();// read below note why this is needed
      response.write(Mustache.to_html(template, files));
      response.end()
    }
  })



}

io.configure(function () {
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
  io.set('log level', 1);
});


// Delete this row if you want to see debug messages

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {

  setInterval(function(){
    socket.emit('take_screenshot')
  }, 60000);

  setInterval(function(){
    //just keeping everyone up to date yo. 
    socket.emit('force_refresh')
  }, 3600000);

  socket.on('screenshot', function(imagedata){
    //console.log(imagedata.image)
    if (imagedata.image != undefined) {
      console.log(imagedata.date);
      var base64Data = imagedata.image.replace(/^data:image\/png;base64,/,""),
      dataBuffer = new Buffer(base64Data, 'base64');
      //uncomment this line to enable writing of files
      fs.writeFile("./public/screenshots/screenshot_" + imagedata.date + ".png", dataBuffer, function(err){});
      //console.log("./public/screenshots/screenshot_" + imagedata.date + ".png")
    }
    //var image = imagedata.image
  })

  socket.on('joining', function(){

    userIDs.push(currentID)
    console.log("user # " + currentID + " joined")
    currentLine.push([])
    socket.emit('joinedCallback', currentID, drawnLines)
    currentID += 1
  });

  // Start listening for mouse move events
  socket.on('mousemove', function (data) {
    if (currentLine[data.id-1] != undefined && data.drawing == true){
      currentLine[data.id-1].push(data)
    }
    // This line sends the event (broadcasts it)
    // to everyone except the originating client.
    socket.broadcast.emit('moving', data);
  });

  socket.on('startDrawing', function(data){
    socket.broadcast.emit('startLine', data);
  })
  socket.on('endDrawing', function(data){
    if (currentLine!=[] || currentLine!= null){
      drawnLines.push(currentLine[data-1])
    }
    currentLine[data-1] = []
    socket.broadcast.emit('endLine', data);
  })
});
