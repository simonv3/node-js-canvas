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
  ctx = canvas[0].getContext('2d'),
  instructions = $('#instructions');

  // Generate an unique ID
  var id = Math.round($.now()*Math.random());

  // A flag for drawing activity
  var drawing = false;

  var clients = {};
  var cursors = {};

  var socket = io.connect(url);

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
    console.log(prev.x)
  });

  var lastEmit = $.now();

  doc.on('mousemove',function(e){
    if($.now() - lastEmit > 30){
      socket.emit('mousemove',{
        'x': e.pageX,
        'y': e.pageY,
        'drawing': drawing,
        'id': id
      });
      lastEmit = $.now();
    }

    // Draw a line for the current user's movement, as it is
    // not received in the socket.on('moving') event above

    if(drawing){

      drawLine(prev.x, prev.y, e.pageX, e.pageY);

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
        'id': id
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
    ctx.strokeStyle = "#333";
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    
  }

});
