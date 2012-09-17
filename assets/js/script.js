//code with help from Simon Sarris http://jsfiddle.net/NWBV4/10/

function Pen(canvas) {

    // The URL of your web server (the port is set in app.js)
    var url = document.url;

    //keeping track of how many clients there are
    var cursors = {};

    //setting up the websocket
    var socket = io.connect(url);
    var lastEmit = $.now();

    this.myID = 0;

    var tool = this;
    var context = canvas.getContext('2d');
    this.started = false;
    var move_count = 0;
    context.lineWidth = 2;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    var lastx = 0;
    var lasty = 0;
    var width = canvas.width;
    var height =canvas.height;
    // create an in-memory canvas
    var memCanvas = document.createElement('canvas');
    memCanvas.width = width
    memCanvas.height = height
    var memCtx = memCanvas.getContext('2d');
    this.points = []
    this.others = []

    //tell the socket you are joining, and register your id

    socket.emit("joining")

    socket.on('joinedCallback', function(assignedID, userIDs, drawnLines){
      console.log('you joined, your ID is: '+ assignedID)
      tool.myID = assignedID
      for (var i=0 ; i < userIDs.length ; i++){
        tool.others.push([])
      }
      for (var i=0; i < drawnLines.length ; i++){
        drawPoints(context, drawnLines[i])
        memCtx.clearRect(0, 0, width, height);
        
        memCtx.drawImage(canvas, 0, 0);
        
      }
    })
    socket.on('otherUserJoined', function(userIDs){
      console.log('new user joined')
      tool.others = []
      for (i=0 ; i < userIDs.length ; i++){
        tool.others.push([])
      }
    })


    socket.on('othersStartDrawing', function(data, currentLineID){
      tool.others[data.id] = []
      tool.others[data.id].push({
        x: data.x,
        y: data.y,
        lineID: currentLineID
      })
    })

    this.mousedown = function(ev) {
        tool.points.push({
            x: ev._x,
            y: ev._y
        });
        tool.started = true;
        socket.emit('mousedown', {
              'x': ev.pageX,
              'y': ev.pageY,
              'userID': tool.myID,
              'started':tool.started,
        })
    };
    //when we receive a moving message
    socket.on('othersMoving', function(data){
      context.clearRect(0, 0, width, height);
      context.drawImage(memCanvas, 0, 0);
      //console.log(tool.others[data.id][0].lineID)
      tool.others[data.id].push({
        x: data.x,
        y: data.y,
        lineID:tool.others[data.id][0].lineID
      })
      drawPoints(context, tool.others[data.id])
    })

    this.mousemove = function(ev) {
        if (tool.started) {

          if($.now() - lastEmit > 10){
            socket.emit('mousemove', {
              'x': ev.pageX,
              'y': ev.pageY,
              'userID': tool.myID,
            })
            lastEmit = $.now()
          }

            context.clearRect(0, 0, width, height);
            // put back the saved content
            context.drawImage(memCanvas, 0, 0);
            tool.points.push({
                x: ev._x,
                y: ev._y
            });
            drawPoints(context, tool.points);
        }
    };

    socket.on("othersStoppedDrawing", function(data){
        memCtx.clearRect(0,0, width, height);
        memCtx.drawImage(canvas, 0, 0);
        tool.others[data] = [];
    })

    this.mouseup = function(ev) {
        if (tool.started) {
            tool.started = false;
            // When the pen is done, save the resulting context
            // to the in-memory canvas
            memCtx.clearRect(0, 0, width, height);
            memCtx.drawImage(canvas, 0, 0);
            tool.points = [];
            socket.emit('mouseup', tool.myID)
        }

    };

    


}

// The general-purpose event handler. This function determines the mouse position relative to the canvas element.

function ev_canvas(ev) {
    if (false) {
        ev._x = ev.touches[0].clientX;
        ev._y = ev.touches[0].clientY; // CH: Is there a better way to do this?
    }
    else if (ev.layerX || ev.layerX == 0) { // Firefox
        ev._x = ev.layerX;
        ev._y = ev.layerY;
    }
    else if (ev.offsetX || ev.offsetX == 0) { // Opera
        ev._x = ev.offsetX;
        ev._y = ev.offsetY;
    }

    ev._x = ev._x + 0.5;
    //ev._y = ev._y + 0.5;
    // Call appropriate event handler
    var func = PEN[ev.type];
    if (func) {
        func(ev);
    }
}

function drawPoints(ctx, points) {
    if (points.length < 6) {
        var b = points[0];
        ctx.beginPath(), ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0), ctx.closePath(), ctx.fill();
        return
    }
    ctx.beginPath(), ctx.moveTo(points[0].x, points[0].y);
    for (i = 1; i < points.length - 2; i++) {
        var c = (points[i].x + points[i + 1].x) / 2,
            d = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, c, d)
    }
    ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y), ctx.stroke()
}

setTimeout(function() {
    // Bind canvas to listeners
    var canvas = document.getElementById('paper');
    canvas.width = $(window).width()
    canvas.height = $(window).height()-46
    PEN = new Pen(canvas);


    canvas.addEventListener('mousedown', ev_canvas, false);
    canvas.addEventListener('mousemove', ev_canvas, false);
    canvas.addEventListener('mouseup', ev_canvas, false);
}, 500);

