$(function(){

  // This demo depends on the canvas element
  if(!('getContext' in document.createElement('canvas'))){
    alert('Sorry, it looks like your browser does not support canvas!');
    return false;
  }

  // The URL of your web server (the port is set in app.js)
  var url = 'http://localhost:5000/';

  var doc = $(document),
  win = $(window),
  canvas = $('#paper'),
  ctx = canvas[0].getContext('2d'),
  instructions = $('#instructions');

  brush = new Image();
  brush.src = 'assets/img/brush10.png';

  // Generate an unique ID
  var id = Math.round($.now()*Math.random());

  // A flag for drawing activity
  var drawing = false;

  var clients = {};
  var cursors = {};

  var socket = io.connect(url);

  socket.on('joined', function (drawnLines){
    for (var i = 0; i < drawnLines.length; i++){
      for (var j = 0; j < drawnLines[i].length; j++){
        if (j > 0){
          previousPoint = drawnLines[i][j-1]
          currentPoint = drawnLines[i][j]
          drawLine(previousPoint.x, previousPoint.y, currentPoint.x, currentPoint.y)
        }
      }
    }
  })
  socket.on('moving', function (data) {

    if(! (data.id in clients)){
      // a new user has come online. create a cursor for them
      cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
    }

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

  doc.bind('mouseup mouseleave',function(){
    drawing = false;
    socket.emit('mouseup', {});
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

  // Remove inactive clients after 10 seconds of inactivity
  setInterval(function(){

    for(ident in clients){
      if($.now() - clients[ident].updated > 10000){

        // Last update was more than 10 seconds ago. 
        // This user has probably closed the page
				
				delete clients[ident];
			}
		}
		
	},10000);

  function drawLine(fromx, fromy, tox, toy){
    var halfBrushW = brush.width/2;
    var halfBrushH = brush.height/2;

  var start = { x:fromx, y:fromy };
  var end = { x:tox, y:toy };

  var distance = parseInt( Trig.distanceBetween2Points( start, end ) );
  var angle = Trig.angleBetween2Points( start, end );

  var x,y;

  for ( var z=0; (z<=distance || z==0); z++ ) {
    x = start.x + (Math.sin(angle) * z) - halfBrushW;
    y = start.y + (Math.cos(angle) * z) - halfBrushH;
    ctx.drawImage(brush, x, y);
  }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(fromx, fromy);
    ctx.lineWidth = 10;
    //ctx.quadraticCurveTo(fromx + (tox - fromx)/20,fromy + (toy - fromy)/20, tox, toy);
    ctx.stroke();
	}

});

var Trig = {
    distanceBetween2Points: function ( point1, point2 ) {
 
        var dx = point2.x - point1.x;
        var dy = point2.y - point1.y;
        return Math.sqrt( Math.pow( dx, 2 ) + Math.pow( dy, 2 ) );
    },
 
    angleBetween2Points: function ( point1, point2 ) {
 
        var dx = point2.x - point1.x;
        var dy = point2.y - point1.y;
        return Math.atan2( dx, dy );
    }
}

