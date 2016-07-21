var pen = null;
var flag = 1; // true白，false黑
var offset = 0;
var data = [];
var status = "run"; //run表示下棋，wait表示等待

// 游戏开始
function gameInit( id,_flag ){
	var html = '<canvas id="five" width="600px" height="600px"></canvas>'
	if( id ){
		$("#" + id).append().html(html);
	}else{
		$('body').append().html(html);
	}
	
	// 画横线
	pen = $("#five").get(0).getContext("2d");
	for( i=0;i<16;i++){
		pen.beginPath();
		if ( i==3||i==12 ){
			pen.lineWidth = 3;
		}else if( i==0||i==15 ){
			pen.lineWidth = 10;
		}else{
			pen.lineWidth = 1;
		}
		pen.moveTo(0,i*40);
		pen.lineTo(600,i*40);
		pen.stroke();
		pen.closePath();
	}
	
	// 画竖线
	for( i=0;i<16;i++){
		pen.beginPath();
		if ( i==3||i==12 ){
			pen.lineWidth = 3;
		}else if( i==0||i==15 ){
			pen.lineWidth = 10;
		}else{
			pen.lineWidth = 1;
		}
		pen.moveTo(i*40,0);
		pen.lineTo(i*40,600);
		pen.stroke();
		pen.closePath();
	}
	
		pen.beginPath();
		pen.arc(120,120,5,0,2*Math.PI);
		pen.fillStyle = "black";
		pen.fill();
		
		pen.beginPath();
		pen.arc(480,120,5,0,2*Math.PI);
		pen.fillStyle = "black";
		pen.fill();
		
		pen.beginPath();
		pen.arc(120,480,5,0,2*Math.PI);
		pen.fillStyle = "black";
		pen.fill();
		
		pen.beginPath();
		pen.arc(480,480,5,0,2*Math.PI);
		pen.fillStyle = "black";
		pen.fill();
		
	
	// 初始化数组
	for(var i = 0;i < 15;i++){
		var temp = [];
		for(var j = 0;j < 15;j++){
			temp.push(-1);
		}
		data.push(temp);
	}
	
	// 棋子
	offset = $("#five").offset();
	
	if( _flag == 1){  //先手执白
		flag = 1;     //白子
		status = "run";
		showChat({
			nickname : "系统提示",
			msg : "系统分配，先手执白"
		},true);
	}else{
		flag = 2;    //黑子
		status = "wait";
		showChat({
			nickname : "系统提示",
			msg : "系统分配，先手执白"
		},true);
	}
	
	$("#five").mousedown(function( event ){
		//等待状态，不画
		if( status == "wait" ){
			return;
		}
		
		var x = event.clientX - offset.left;
		var y = event.clientY - offset.top;
		
		var col = Math.floor(x/40);
		var row = Math.floor(y/40);
		
		// 如果已存在，不画
		if( data[row][col] != -1){
			return;
		}
		data[row][col] = flag;
		pen.beginPath();
		
		pen.arc(col*40+20, row*40+20, 15, 0, 2*Math.PI);
		
		var gradient = pen.createRadialGradient(col*40+23, row*40+17 , 13 , col*40+23, row*40+17, 0 );
		if( flag == 1 ){
//			pen.fillStyle = "white";
			gradient.addColorStop(0,"gainsboro");
			gradient.addColorStop(1,"white");
			
		}else{
//			pen.fillStyle = "black";
			gradient.addColorStop(0,"black");
			gradient.addColorStop(1,"#2c2c2c");
			
		}
		
		pen.fillStyle = gradient;
		pen.fill();
		pen.closePath();
		
		// 交换信息
		socket.emit("game.changedata",{
			row : row,
			col : col,
			flag : flag
		});
		status = "wait";
		if( gameOver( col,row,flag ) ){ //游戏结束
			socket.emit("game.over");
		};
	
		
	});
}

function drawFive( col,row,flag ){
		data[row][col] = flag;
		pen.beginPath();
		
		pen.arc(col*40+20, row*40+20, 15, 0, 2*Math.PI);
		
		var gradient = pen.createRadialGradient(col*40+23, row*40+17 , 13 , col*40+23, row*40+17, 0 );
		if( flag == 1 ){
//			pen.fillStyle = "white";
			gradient.addColorStop(0,"gainsboro");
			gradient.addColorStop(1,"white");
			
		}else{
//			pen.fillStyle = "black";
			gradient.addColorStop(0,"black");
			gradient.addColorStop(1,"#2c2c2c");
			
		}
		
		pen.fillStyle = gradient;
		pen.fill();
		pen.closePath();
		
		
}

function gameOver( col,row,flag ){
	
	//上下
	var count = 1;
	for( var i = row - 1;i >= 0;i--){
		if( data[i][col] == flag ){
			count++;
		}else{
			break;
		}
	}
	for( var i = row + 1;i < 15;i++){
		if( data[i][col] == flag){
			count++;
		}else{
			break;
		}
	}
	if( count >= 5 ){
		return true;
	}
	
	
	//左右
	count = 1;
	for( var i = col - 1;i >= 0;i--){
		if( data[row][i] == flag ){
			count++;
		}else{
			break;
		}
	}
	for( var i = col + 1;i < 15;i++){
		if( data[row][i] == flag){
			count++;
		}else{
			break;
		}
	}
	if( count >= 5 ){
		return true;
	}
	
	//左上右下
	count = 1;
	for( var i = row - 1,j = col - 1;i >= 0 && j >= 0; i--, j-- ){
		if(data[i][j] == flag){
			count++;
		}else{
			break;
		}
	}
	
	for( var i = row + 1,j = col + 1;i < 15 && j < 15; i++, j++ ){
		if(data[i][j] == flag){
			count++;
		}else{
			break;
		}
	}
	
	if( count >= 5 ){
		return true;
	}
	
	
	//右上左下
	count = 1;
	for( var i = row - 1,j = col + 1;i >=0 && j <15; i--, j++){
		if(data[i][j] == flag){
			count++;
		}else{
			break;
		}
	}
	
	for( var i = row + 1,j = col - 1;i < 15 && j >= 0; i++, j-- ){
		if(data[i][j] == flag){
			count++;
		}else{
			break;
		}
	}
	
	if( count >= 5 ){
		return true;
	}
	
	return false;
}
