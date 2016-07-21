// 创建websocket服务器
var server = require('http').createServer();
var io = require('socket.io')(server);

var users = {};
var rooms ={};

// socket就是客户端与服务端的通道
io.on('connection', function(socket){
  socket.join("public");
   
   // 自定义事件
   

  socket.on('user.online', function( user ){
      user.room = 'public';
      users[user.id] = user; //保存用户信息

      //通知所有用户状态信息
      io.sockets.emit('user.online',getUsers());
      //广播房间创建成功消息
      io.sockets.in('public').emit('room.change',getRooms());
  });

  socket.on('chat.send',function( chat ){
      var user = users[socket.id.replace("/#","")];
      socket.to(user.room).emit("chat.newchat",chat);
  });

  socket.on('room.createroom',function( roomname ){
    if( rooms[roomname] ){
        socket.emit("room.exist");
        return;
    }
    var user =  users[socket.id.replace("/#","")];
    rooms[roomname] = { roomname : roomname,player1:user,player2:null };
    
    //切换房间
    socket.leave(user.room);
    socket.join(roomname);
    //用户状态切换
    user.room = roomname;
    user.status = 2;

    //广播房间创建成功消息
    io.sockets.in('public').emit('room.change',getRooms());

    //通知创建者房间创建成功
    socket.emit("room.createOK",rooms[roomname]);
    //通知所有用户状态信息
    io.sockets.emit('user.online',getUsers());
  });

  //加入房间
  socket.on("room.join",function( roomname ){
      if( rooms[roomname].player2 ){
          socket.emit("room.joinFailed");
          return;
      }
    
      var user =  users[socket.id.replace("/#","")];
      socket.leave(user.room);
      socket.join(roomname);
      user.status = 2;
      user.room = roomname;

      rooms[roomname].player2 = user;
      //通知自己
      socket.emit("room.joinOK",rooms[roomname]);
      //通知房主
      socket.in(roomname).emit('room.createOK',rooms[roomname]);
      //通知所有用户状态信息
      io.sockets.emit('user.online',getUsers());

  })

  // 游戏开始指令
  socket.on("game.start",function(){
      var user = users[socket.id.replace("/#","")];
      var room = rooms[user.room];

      if( room.player1 && room.player2 ){
          
          // 向房主发送游戏开始指令
          socket.emit("game.start",1); // 1代表先手，白子

          // 向player2发送游戏开始指令
          socket.in(user.room).emit("game.start",2); // 2代表后手，黑子

          room.player1.status = 3;
          room.player2.status = 3;

         //通知所有用户状态信息
         io.sockets.emit('user.online',getUsers());
      }
     
  })

  

  //游戏数据交换指令
  socket.on("game.changedata",function( data ){
       var user = users[socket.id.replace("/#","")];
       socket.in( user.room ).emit("game.changedata",data);
  })

  //游戏结束指令
  socket.on("game.over",function(){
      //找到玩家
      var user = users[socket.id.replace("/#","")];
      var room = rooms[user.room];

      var winner = user.id == room.player1.id ? room.player1 : room.player2;
      var loser  = user.id == room.player2.id ? room.player1 : room.player2;

      //更改状态
      winner.win += 1;
      winner.total += 1;
      winner.status = 2;
      loser.total += 1;
      loser.status = 2;

      //返回游戏结束指令
      socket.emit("game.over",winner);
      socket.in(user.room).emit("game.over",loser);

      //向两位玩家发送一条信息
      io.sockets.in(user.room).emit("chat.newchat",{
          nickname : "系统消息",
          msg : winner.nickname + "&nbsp" + "赢了,666"
       
      });

      //通知所有用户状态信息
      io.sockets.emit('user.online',getUsers());
  })


      //退出房间
      socket.on("room.leave",function(){ 
        var user = users[socket.id.replace("/#","")];
        var room = rooms[user.room];

        if( user.id == room.player1.id ){ //房主
            delete rooms[user.room];
            if( room.player2 ){
                room.player2.status = 1;
                room.player2.room = 'public';

                //找到对方的socket，进入public
                var so = io.sockets.sockets["/#" + room.player2.id];
                so.leave(user.room);
                so.join('public');
            }
        }else{                     //加入者
            room.player2 = null;
            socket.in(user.room).emit("room.createOK",room);
        }

        //自己退出房间，刷新用户列表
        socket.leave(user.room);
        socket.join('public');
        user.status = 1;
        user.room = 'public';


        io.sockets.in('public').emit("room.change",getRooms());
        //通知所有用户状态信息
        io.sockets.emit('user.online',getUsers());


  });
  
  socket.on('disconnect', function(){
       var user = users[socket.id.replace("/#","")];
       
       if( user.status == 3 ){
           var room = rooms[user.room];
           if( user.id == room.player1.id ){
               delete rooms[user.room];
               room.player2.status = 1;
               room.player2.room = 'public';
               room.player2.win += 1;
               room.player2.total += 1;

               //找到对方的socket，进入public
               var so = io.sockets.sockets["/#" + room.player2.id];
               so.leave(user.room);
               so.join('public');

               so.emit("game.over",room.player2);
               so.emit("chat.newchat",{
                   nickname : "系统消息",
                   msg : "您的对手被网络打败了"
               });

               io.sockets.in('public').emit("room.change",getRooms());


           }else{
               room.player1.status = 2;
               room.player1.win += 1;
               room.player1.total += 1;
               

               room.player2 = null;
               socket.in(user.room).emit("game.over",room.player1);
               socket.in(user.room).emit("room.createOK",room);
               socket.in(user.room).emit("chat.newchat",{
                    nickname : "系统消息",
                    msg : "您的对手被网络打败了"
            });
               

           }
       }

       if ( user.status == 2 ){
           var room = rooms[user.room];
           if( user.id == room.player1.id ){
               delete rooms[user.room];
               if( room.player2 ){
                   room.player2.status = 1;
                   room.player2.room = 'public';
                   //找到对方的socket，进入public
                   var so = io.sockets.sockets["/#" + room.player2.id];
                   so.leave(user.room);
                   so.join('public');
               }
               io.sockets.in('public').emit("room.change",getRooms());
           }else{
               room.player2 = null;
               socket.in(user.room).emit("createOK",room);
           }
       }

      //删除自己，通知所有人
      delete users[socket.id.replace("/#","")];
      io.sockets.emit('user.online',getUsers());
  });
});

function getUsers(){
    var arr = [];
    for(var key in users){
      arr.push(users[key]);
    }
    return arr;
}

function getRooms(){
    var arr = [];
    for(var key in rooms){
        arr.push(rooms[key]);
    }
    return arr;
}

// 开启服务器
server.listen(3000);
console.log("服务器开启成功！");