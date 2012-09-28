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

  socket.on('take_screenshot', function(data){
    var canvasImg = document.getElementById("paper")
    imagedata = canvasImg.toDataURL();
    console.log("sending screenshot")
    socket.emit('screenshot', imagedata)
  })


  socket.on('joinedCallback', function (assignedID, drawnLines){
    myID = assignedID;
    if (drawnLines && drawnLines.length > 0){
      for (var i = 0; i < drawnLines.length; i++){
        if (drawnLines[i] != null && drawnLines[i].length > 0 ){
          drawPastLines(drawnLines[i]);
        }
      }
    }
    document.getElementById("page_loader").style.display = 'none';
    console.log("your id is " + assignedID)
  })

  socket.on('moving', function (data) {

    if(! (data.id in clients)){
      // a new user has come online. create a cursor for them
      //cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
    }

    // Move the mouse pointer
    /*cursors[data.id].css({
      'left' : data.x,
      'top' : data.y
    });*/

    // Is the user drawing?
    if(data.drawing && clients[data.id]){

      // Draw a line on the canvas. clients[data.id] holds
      // the previous position of this user's mouse pointer

      drawLine({"x":clients[data.id].prevx, "y":clients[data.id].prevy}, clients[data.id].x, clients[data.id].y, data.x, data.y);
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
        'prevx' : twoprev.x,
        'prevy' : twoprev.y,
        'drawing': drawing,
        'id': myID 
      });
      lastEmit = $.now();
    }


    // Draw a line for the current user's movement, as it is
    // not received in the socket.on('moving') event above

    if(drawing){
      drawLine(twoprev, prev.x, prev.y, e.pageX, e.pageY);
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

      drawLine(twoprev, prev.x, prev.y, e.pageX, e.pageY);
      twoprev.x = prev.x
      twoprev.y = prev.y

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

        //cursors[ident].remove();
        delete clients[ident];
        //delete cursors[ident];
      }
    }

  },10000);

  // get a base64 every 60 seconds

  function drawLine(twoprev, fromx, fromy, tox, toy){
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    if (twoprev){
      var midPoint = {
        "x": (fromx + tox)/2,
        "y": (fromy + toy)/2,
      }
      var midm = (toy - fromy.toFixed(4))/(tox - fromx.toFixed(4))
      if (midm != Infinity || midm != -Infinity){
        perpMidM = (1/midm) * -1;
        perpMidB = perpMidM * midPoint.x - midPoint.y
        var arbx = midPoint.x+1;
        var arby = perpMidM * arbx + perpMidM;

        var arbPoint = {
          "x":arbx,
          "y":arby,
        }

        var iPoint = intersectLineLine(twoprev, {"x":fromx, "y":fromy}, midPoint, arbPoint)
        if (iPoint != "straight"){
          drawMidX = (midPoint.x + iPoint.x)/2
          drawMidY = (midPoint.y + iPoint.y)/2

          ctx.quadraticCurveTo(drawMidX, drawMidY, tox, toy)
        } else {
          ctx.lineTo(tox, toy)
        }
      } else {
        ctx.lineTo(tox, toy)
      }

    } else {
      ctx.lineTo(tox, toy);
    }
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

function intersectLineLine (a1, a2, b1, b2) {
    var result;
    var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
    var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
    var u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
    
    /*if (ua_t > 10){
      console.log("new set")
      console.log(b1.x + " " + b1.y + "; " + b1.x + " " + b1.y);
      console.log(a2.x + " " + a1.x)
    }*/

    if (u_b != 0 && u_b != NaN && u_b != Infinity && u_b != -Infinity && ua_t != -Infinity && ua_t != Infinity&& ub_t != -Infinity && ub_t != Infinity) {

        var ua = ua_t / u_b;
        var ub = ub_t / u_b;
        if (Math.abs(ua) > 3 || Math.abs(ub) > 3){
          //console.log(a1.x +" "+ a1.y + " " + ua_t + " / " + u_b)
          result="straight"
        } else {
        if(ua && ub){
        //if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            result = {
              "x":a1.x + ua * (a2.x - a1.x),
              "y":a1.y + ua * (a2.y - a1.y),
            }
        } else {
            result = "straight"
        } }
    } else {
        if (ua_t == 0 || ub_t == 0) {
            result = "straight"
        } else {
            result = "straight"
        }
    }
    return result;
};




});
