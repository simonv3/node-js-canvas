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
    this.color = "#333";
    this.size = 1;
    var move_count = 0;
    context.strokeStyle = "#333";
    context.lineWidth = 1;
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
      if (drawnLines.length > 0){
        for (var i = 0; i < drawnLines.length; i++){
          drawPastLines(context, drawnLines[i])

        //memCtx.clearRect(0, 0, width, height);
        //memCtx.drawImage(canvas, 0, 0);
        }
      }
      console.log("drawing color: " + tool.color);
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
        lineID: currentLineID,
        color:data.color,
        size:data.size,
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
            y: initY,
            size:tool.size,
            color:tool.color,
        });
        tool.started = true;
        socket.emit('mousedown', {
              'x': initX,
              'y': initY,
              'userID': tool.myID,
              'started':tool.started,
              'color':tool.color,
              'size':tool.size,
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
        lineID:tool.others[data.id][0].lineID,
        color:data.color,
        size:tool.size,
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
              'x': currentX + 0.5,
              'y': currentY,
              'userID': tool.myID,
              'color':tool.color,
              'size':tool.size,
            })
            lastEmit = $.now()
          }

            //context.clearRect(0, 0, width, height);
            // put back the saved content
            //context.drawImage(memCanvas, 0, 0);
          console.log("tool size " + tool.size);
            tool.points.push({
                x: currentX,
                y: currentY,
                color:tool.color,
                size:tool.size,
            });
            drawPoints(context, tool.points);
        }
    }

    //treat touchmove and mousemove the same
    //this.touchmove = function(ev) { movingPath(ev) }

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

    //treat touchend and mouseup as the same
    //this.touchend = function(ev) { endPath(ev) };

    this.mouseup = function(ev) { endPath(ev) };

    this.changecolor = function(color){
      context.strokeStyle=color;
      tool.color = color;
    }

    this.setsize = function(size){
      console.log("setting size")
      context.strokeWidth=size;
      tool.size = size;
    }


}

// The general-purpose event handler. This function determines the mouse position relative to the canvas element.

function ev_canvas(ev) {
    /*if (false) {
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
    ev._y = ev._y + 0.5;*/
    var func;
    if (ev.type === "touchstart"){
      func = PEN['mousedown']
    } else if (ev.type === "touchmove"){
      func = PEN['mousemove']
    } else if (ev.type === "touchend"){
      func = PEN['mouseup']
    } else {
      func = PEN[ev.type]
    }
    // Call appropriate event handler
    if (func) {
        func(ev);
    }
}

function drawPastLines(ctx, points){
  // move to the first point
  ctx.beginPath()
  ctx.strokeStyle = points[0].color;
  ctx.lineWidth = points[0].size;
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

  // curve through the last two points
}

function drawPoints(ctx, points) {
    /*if (points.length < 6) {
        var b = points[0];
        ctx.beginPath(), ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0), ctx.closePath(), ctx.fill();
        return
    }*/
  ctx.beginPath()
  ctx.strokeStyle = points[0].color
  ctx.lineWidth = points[0].size
  console.log(points[0])
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
    ctx.closePath()

  }

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
    $("#colors li").click( function(){
      if (this.id =="erase"){
        var sizefunc = PEN['setsize']
        sizefunc(40)
        var func = PEN['changecolor']
        
        func($(this).css("color"))
        
      } else {
        var func = PEN['changecolor']
        var sizefunc = PEN['setsize']
        sizefunc(1)
        
        func($(this).css("color"))
      }


    })

}, 500);

