$(function(){

  // This demo depends on the canvas element
  if(!('getContext' in document.createElement('canvas'))){
    alert('Sorry, it looks like your browser does not support canvas!');
    return false;
  }

  // The URL of your web server (the port is set in app.js)
  var url = document.url;


  var doc = $(document),
  win = $(window),
  canvas = $('#paper'),
  ctx = canvas[0].getContext('2d')
  ctx.strokeStyle = "#888";
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  instructions = $('#instructions');

  // Generate an unique ID
  var myID;

  // A flag for drawing activity
  var drawing = false;

  var clients = {};
  var cursors = {};

  var socket = io.connect(url);
  socket.emit('joining');
  socket.on('joinedCallback', function (assignedID, drawnLines){
    myID = assignedID;
    console.log(drawnLines)
    if (drawnLines && drawnLines.length > 0){
      for (var i = 0; i < drawnLines.length; i++){
        if (drawnLines[i].length > 0 ){
          drawPastLines(drawnLines[i]);
        }
      }
    }
    console.log("your id is " + assignedID)
  })


  socket.on('moving', function (data) {

    if(! (data.id in clients)){
      // a new user has come online. create a cursor for them
      cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
    }

    // Move the mouse pointer
    cursors[data.id].css({
      'left' : data.x,
      'top' : data.y
    });

    // Is the user drawing?
    if(data.drawing && clients[data.id]){

      // Draw a line on the canvas. clients[data.id] holds
      // the previous position of this user's mouse pointer

      drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y);
    }

    // Saving the current client state
    clients[data.id] = data;
    clients[data.id].updated = $.now();
  });

  var prev = {};
  var twoprev = {}

  canvas.on('mousedown',function(e){

    e.preventDefault();
    drawing = true;

    prev.x = e.pageX;
    prev.y = e.pageY;
  });

  canvas.on('touchstart',function(e){

    e.preventDefault();
    drawing = true;
    prev.x = e.originalEvent.touches[0].pageX;
    prev.y = e.originalEvent.touches[0].pageY;
  });


  doc.bind('mouseup mouseleave touchcancel touchend',function(){
    drawing = false;
    socket.emit('endDrawing',
        myID
      );
  });

  //what about mouseleave?

  var lastEmit = $.now();

  doc.on('mousemove',function(e){
    if($.now() - lastEmit > 30){
      socket.emit('mousemove',{
        'x': e.pageX,
        'y': e.pageY,
        'drawing': drawing,
        'id': myID 
      });
      lastEmit = $.now();
    }


    // Draw a line for the current user's movement, as it is
    // not received in the socket.on('moving') event above

    if(drawing){
      drawLine(prev.x, prev.y, e.pageX, e.pageY);
      twoprev.x = prev.x
      twoprev.y = prev.y
      prev.x = e.pageX;
      prev.y = e.pageY;
    }
  });

  doc.on('touchmove',function(e){
    if($.now() - lastEmit > 30){
      socket.emit('mousemove',{
        'x': e.originalEvent.touches[0].pageX,
        'y': e.originalEvent.touches[0].pageY,
        'drawing': drawing,
        'id': myID 
      });
      lastEmit = $.now();
    }

    // Draw a line for the current user's movement, as it is
    // not received in the socket.on('moving') event above

    if(drawing){

      drawLine(prev.x, prev.y, e.pageX, e.pageY);

      prev.x = e.originalEvent.touches[0].pageX;
      prev.y = e.originalEvent.touches[0].pageY;
    }
  });


  // Remove inactive clients after 10 seconds of inactivity
  setInterval(function(){

    for(ident in clients){
      if($.now() - clients[ident].updated > 10000){

        // Last update was more than 10 seconds ago. 
        // This user has probably closed the page

        cursors[ident].remove();
        delete clients[ident];
        delete cursors[ident];
      }
    }

  },10000);

  function drawLine(fromx, fromy, tox, toy){
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.closePath();
  }

  function drawPastLines(points){
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length == 2 ){
      ctx.lineTo(points[1].x,points[1].y)
    } else if (points.length == 1){
    } else {

      for (i = 1; i < points.length - 2; i ++)
      {
        var xc = (points[i].x + points[i + 1].x) / 2;
        var yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.quadraticCurveTo(points[i].x, points[i].y, points[i+1].x,points[i+1].y);
    }
    ctx.stroke()
    ctx.closePath()
  }

});
