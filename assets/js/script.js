// Code with help from Simon Sarris http://jsfiddle.net/NWBV4/10/

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


    var othersCanvas = document.createElement('canvas');
    var othersContext = othersCanvas.getContext('2d');
    othersContext.lineWidth = 2;
    othersContext.lineJoin = 'round';
    context.lineCap = 'round';
    othersCanvas.width = width;
    othersCanvas.height = height;


    //set up storage for you and others
    this.points = []
    this.others = []

    //tell the socket you are joining, and register your id

    socket.emit("joining")

    socket.on('joinedCallback', function(assignedID, userIDs, drawnLines){
      console.log('you joined, your ID is: '+ assignedID)
      document.getElementById("page_loader").style.display = 'none';
      tool.myID = assignedID
      for (var i=0 ; i < userIDs.length ; i++){
        tool.others.push([])
      }
      for (var i=0; i < drawnLines.length ; i++){
        drawPoints(context, drawnLines[i])
        //memCtx.clearRect(0, 0, width, height);
        //memCtx.drawImage(canvas, 0, 0);
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

    // the function that starts the drawing
    function startPath(ev){
      var initX = ev.pageX
      var initY = ev.pageY

      //if the type of the event is touchstart, look for touches
      if (ev.type === "touchstart"){
        initX= ev.touches[0].pageX
        initY = ev.touches[0].pageY
      }
      tool.points.push({
            x: initX,
            y: initY
        });
        tool.started = true;
        socket.emit('mousedown', {
              'x': initX,
              'y': initY,
              'userID': tool.myID,
              'started':tool.started,
        })
    }


    //treat touchstart and mousedown the same
    this.touchstart = function(ev){ startPath(ev) };

    this.mousedown = function(ev) { startPath(ev) };

    //when we receive a moving message
    socket.on('othersMoving', function(data){
      //context.clearRect(0, 0, width, height);
      //context.drawImage(memCanvas, 0, 0);
      tool.others[data.id].push({
        x: data.x,
        y: data.y,
        lineID:tool.others[data.id][0].lineID
      })
      drawPoints(context, tool.others[data.id])
    })

    function movingPath(ev){
        if (tool.started) {
          //capture currentX and Y
          var currentX = ev.pageX
          var currentY = ev.pageY
          if (ev.type === "touchmove"){
            currentX = ev.touches[0].pageX
            currentY = ev.touches[0].pageY
          }
          if($.now() - lastEmit > 10){
            socket.emit('mousemove', {
              'x': currentX,
              'y': currentY,
              'userID': tool.myID,
            })
            lastEmit = $.now()
          }

            //context.clearRect(0, 0, width, height);
            // put back the saved content
            //context.drawImage(memCanvas, 0, 0);
            tool.points.push({
                x: currentX,
                y: currentY,
            });
            drawPoints(context, tool.points);
        }
    }

    //treat touchmove and mousemove the same
    this.touchmove = function(ev) { movingPath(ev) }

    this.mousemove = function(ev) { movingPath(ev) };

    socket.on("othersStoppedDrawing", function(data){
        //memCtx.clearRect(0,0, width, height);
        //memCtx.drawImage(canvas, 0, 0);
        tool.others[data] = [];
    })

    function endPath(ev){
        if (tool.started) {
            tool.started = false;
            // When the pen is done, save the resulting context
            // to the in-memory canvas
            //memCtx.clearRect(0, 0, width, height);
            //memCtx.drawImage(canvas, 0, 0);
            tool.points = [];
            socket.emit('mouseup', tool.myID)
        }


    }

    this.touchend = function(ev) { endPath(ev) };

    this.mouseup = function(ev) { endPath(ev) };



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
    /*if (points.length < 6) {
        var b = points[0];
        ctx.beginPath(), ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0), ctx.closePath(), ctx.fill();
        return
    }*/
    ctx.beginPath() 
    
    //get the slope of a the previous segment.
    if (points.length > 3){
      
      var i = points.length-3

      //find the midpoint of the current line. 
      var midx = (points[i+2].x+points[i+1].x)/2;
      var midy = (points[i+2].y+points[i+1].y)/2;
      var midPoint = {
        "x":midx,
        "y":midy,
      }
      var midm = (points[i+2].y - points[i+1].y).toFixed(4)/(points[i+2].x - points[i+1].x).toFixed(4)
      if (midm != Infinity || midm != -Infinity){
        perpMidM = (1/midm) * -1;
        perpMidB = perpMidM * midx - midy;
        //find arbitrary other point
        var arbx = midx+1;
        var arby = perpMidM * arbx + perpMidB;

        var arbPoint = {
          "x":arbx,
          "y":arby,
        }
      var iPoint = intersectLineLine(points[i], points[i+1], midPoint, arbPoint)
      var c = points.length-1
      ctx.moveTo(points[c-1].x, points[c-1].y)

      if (iPoint != "straight"){

        drawMidX = (midx + iPoint.x)/2
        drawMidY = (midy + iPoint.y)/2

        /*ctx.fillStyle = "red";
        ctx.lineWidth = 0;
        ctx.beginPath();
        ctx.arc(iPoint.x, iPoint.y, 2, 0, Math.PI*2, true); 
        ctx.closePath();
        ctx.fill();*/
        ctx.moveTo(points[c-1].x, points[c-1].y)



        ctx.quadraticCurveTo(drawMidX, drawMidY, points[c].x, points[c].y)
      } else {
        ctx.lineTo(points[c].x,points[c].y)
      }
      ctx.stroke()
      }
      


      /*var i = points.length-3
  
      var m = (points[i+1].y - points[i].y).toFixed(4)/(points[i+1].x - points[i].x).toFixed(4)
      if (m && m != Infinity && m != -Infinity){
        // in case of a slope, find the equation of the line
        var b = m*points[i].x - points[i].y

        // in case of a slope, find the midpoint between the two current points
        var midx = (points[i+2].x+points[i+1].x)/2,
        var midy = (points[i+2].y+points[i+1].y)/2,
        var midm = (points[i+2].y - points[i+1].y).toFixed(4)/(points[i+2].x - points[i+1].x).toFixed(4)
        if (midm != Infinity || midm != -Infinity){
          perpMidM = (1/midm) * -1;
          perpMidB = perpMidM * midx - midy;

        }//handle the infinity case
        console.log(m.toFixed(4));
      } else {
        console.log("straight line case")
      }*/
    }
    //ctx.moveTo(points[0].x, points[0].y);

    /*for (i = 1; i < points.length - 2; i++) {
        var c = (points[i].x + points[i + 1].x) / 2,
            d = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, c, d)
    }*/
    //if the length of 
    //ctx.moveTo(points[i].x, points[i].y);
    //ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y), ctx.stroke()
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
          console.log(a1.x +" "+ a1.y + " " + ua_t + " / " + u_b)
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
      console.log("going in")
        if (ua_t == 0 || ub_t == 0) {
            result = "straight"
        } else {
            result = "straight"
        }
    }
    return result;
};


setTimeout(function() {
    // Bind canvas to listeners
    var canvas = document.getElementById('paper');
    canvas.width = $(window).width()
    canvas.height = $(window).height()-46
    PEN = new Pen(canvas);


    canvas.addEventListener('mousedown', ev_canvas, false);
    canvas.addEventListener('mouseout', ev_canvas, false);
    canvas.addEventListener('touchstart', ev_canvas, false)
    canvas.addEventListener('mousemove', ev_canvas, false);
    canvas.addEventListener('touchmove', ev_canvas, false);
    canvas.addEventListener('mouseup', ev_canvas, false);
    canvas.addEventListener('touchend', ev_canvas, false);

}, 500);

