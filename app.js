var express = require('express');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
var fs = require('fs');
var session = require('express-session');
var bkdf2Password = require("pbkdf2-password");
//var bkdf2Password = require(__dirname+"/include/pbkdf2-pass");
var mysql = require('mysql');
var hasher = bkdf2Password();
var app = express();
var cors = require('cors');

var AWS = require('aws-sdk');
AWS.config.loadFromPath(__dirname+'/include/awskey.json');

app.use(busboy()); 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
	secret:'1ih8f0891hfioqwehf89p1hfp2',
	resave: false,
	saveUninitialized: true
}));

app.set('view engine', 'jade');
app.set('views', __dirname+'/views');
app.locals.pretty = true;

var dbinfo = require(__dirname+'/include/db.json');
var pwinfo = require(__dirname+'/include/pass.json');

var connection = mysql.createConnection({
	  "host"     : dbinfo.host,
	  "user"     : dbinfo.user,
	  "password" : dbinfo.password,
	  "port"     : dbinfo.port,
	  "database" : dbinfo.database
});

app.get('/', function(req, res){
	connection.query('select * from notice order by date desc', function(err, rows){
		if(err) 
	        console.error(JSON.stringify(err, null, 2));
		else{
			res.render('view_list',{notices:rows});
		}
	});
});

app.get(['/login','/login/:cmd/:id'], function(req, res){
	if(req.params.id){
		res.render('view_login',{cmd:req.params.cmd,id:req.params.id});
	}else
		res.render('view_login');
});

app.post('/login', function(req, res){
	var param = {
		salt:pwinfo.salt,
		hash:pwinfo.hash,
		digest:pwinfo.digest
	}
	if(req.body.id==="manager"){
		hasher({password:req.body.pw,salt:param.salt}, function(err, pass, salt, hash){
			if(hash === param.hash){
				req.session.uid='manager';
				req.session.save(function(){
					if(req.body.cmd==1)
						res.redirect('/mod/'+req.body.nid);
					else if(req.body.cmd==2)
						res.redirect('/del/'+req.body.nid);
					else
						res.redirect('/reg');
				});
			}else
				res.send('<script>alert("아이디 및 비밀번호를 확인해주세요");location.href="/login";</script>');
		});
	}else{
		res.send('<script>alert("아이디 및 비밀번호를 확인해주세요");location.href="/login";</script>');
	}

});

app.get('/id/:id', function(req, res){
	var id = req.params.id;
	connection.query('select * from notice where id = '+id, function(err, rows){
		if(err) 
	        console.error(JSON.stringify(err, null, 2));
		else{
			if(rows.length==0)
				res.send('<script>alert("해당 공지가 없습니다.");location.href="/";</script>');
			else
				res.render('view_notice',{notice:rows[0]});
		}
	});
});


app.post("/reg", function(req, res){
	if(req.session.uid !=="manager"){
		return res.redirect('/login');
	}

	var date = new Date();

	var params = {
		title:req.body.title,
		body:req.body.bodytxt,
		date:date.valueOf()
	}

	connection.query('insert into notice set ?', params, function(err, result){
		if(err){
			console.error(err);
			res.send(err);
		}
			if(result.affectedRows == 1)
				res.send('<script>alert("등록되었습니다.");location.href="/";</script>');
			else
				res.send('<script>alert("에러 발생 지속될 경우 개발팀에게 문의하세요");history.go(-1);</script>');
	});


});

app.get('/notice', cors(), function(req,res){
	connection.query('select * from notice order by date desc', function(err, rows){
		if(err) 
	        console.error(JSON.stringify(err, null, 2));
		else{
			res.json(rows);
		}
	});
});

app.get('/notice/:id', cors(), function(req,res){
	var id = req.params.id;
	connection.query('select * from notice where id = '+id, function(err, rows){
		if(err) 
	        console.error(JSON.stringify(err, null, 2));
		else{
				res.json(rows[0]);
		}
	});
});

app.get('/reg', function(req, res){
	if(req.session.uid !=="manager"){
		return res.redirect('/login');
	}
	res.render('view_add');
});

app.get('/reg1', function(req, res){
	fs.readFile('./views/view_add1.html', function(error, data){
		if(error){
			res.send(error);
		}else{
			res.writeHead(200, {'Contetn-Type':'text/html'}); // Head Type 설정
			res.end(data);
		}
	});
});

app.post('/reg1', function(req, res){
	var fstream;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
    	console.log(filename);
    	fstream = fs.createWriteStream(__dirname+'/files/'+filename);
    	file.pipe(fstream);
    	fstream.on('close',function(){
		res.json({location:'image.png'});

    	})
    });


});

app.post("/uploadImg", function(req, res){
	console.log('upladImg in');
	var fstream;

 	req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
   	// 파일을 풀어서 정리하기
// 		}
// /*    	console.log(filename);
//     	fstream = fs.createWriteStream(__dirname+'/files/'+filename);
//     	file.pipe(fstream);
//     	fstream.on('close',function(){
// 		res.json({location:'image.png'});
// 		})
// */
     	fstream = fs.createWriteStream(__dirname+'/files/'+filename);
     	file.pipe(fstream);
// 		console.log(typeof(file));
    	fstream.on('close',function(){
    		fs.readFile(__dirname+'/files/'+filename, function(err,data){
    			if(err)
    				res.send("error");    			
    			else{
    				var date = new Date();

    				var ext = filename.split('.');
    				console.log(ext.length);
    				var name = 'notice/notice'+date.valueOf()+'.'+ext[ext.length-1];

    				var params = {
	           			Bucket: 'ngo-app',
			            Key: name,
			            Body: data,
			            ACL:'public-read'
			        };
					var s3 = new AWS.S3();
					s3.putObject(params, function(perr, pres){
						if(perr){
							console.log(perr);
						}else{
							console.log("upload Successful");
							res.json({location:'https://s3.ap-northeast-2.amazonaws.com/ngo-app/'+name});
						}
			    	})
    			}
    		});    		
		})
     });
//     console.log('fin');
})

app.get('/upload', function(req, res){
	fs.readFile(__dirname+'/files/mceclip0.jpg',function(err, data){
		var params = {
            Bucket: 'ngo-app',
            Key: 'test1.jpg',
            Body: data
        };
		var s3 = new AWS.S3();
		s3.putObject(params, function(perr, pres){
			if(perr){
				console.log(perr);
			}else{
				console.log("upload Successful");
				res.json({location:'image.png'});
			}
    	})
	});

})

app.get('/mod/:id', function(req, res){
	if(req.session.uid !=="manager"){
		return res.redirect('/login/1/'+req.params.id);
	}

	var id = req.params.id;
	connection.query('select * from notice where id = '+id, function(err, rows){
		if(err) 
	        console.error(JSON.stringify(err, null, 2));
		else{
			if(rows.length==0)
				res.send('<script>alert("해당 공지가 없습니다.");location.href="/";</script>');
			else{
				res.render('view_add',{notice:rows[0]});
			}
		}
	});
});

app.post("/mod/:id", function(req, res){
	if(req.session.uid !=="manager"){
		return res.redirect('/login/1/'+req.params.id);
	}

	var date = new Date();

	var params = {
		title:req.body.title,
		body:req.body.bodytxt,
		date:date.valueOf()
	}

	connection.query('update notice set ? where id = '+req.params.id, params, function(err, result){
		if(err){
			console.error(err);
			res.send(err);
		}
			if(result.affectedRows == 1)
				res.send('<script>alert("수정되었습니다.");location.href="/id/'+req.params.id+'";</script>');
			else
				res.send('<script>alert("에러 발생 지속될 경우 개발팀에게 문의하세요");history.go(-1);</script>');
	});


});

app.get('/del/:id', function(req,res){
	if(req.session.uid !=="manager"){
		return res.redirect('/login/2/'+req.params.id);
	}

	var params = {
		'id' : req.params.id
	}
	connection.query('delete from notice where ?', params, function(err, result){
		if(err){
			console.error(err);
			res.send(err);
		}
		res.send('<script>alert("삭제되었습니다.");location.href="/";</script>');
	})
});

app.listen(3000, function(){
	console.log("Connected 3000 port!!");

	connection.connect(function(err) {
	    if (err) {
	        console.error('mysql connection error');
	        console.error(err);
	    }else
	    	console.log("mysql connected");
	});

});

function to2Digit(num){
	if(num<10)
		return "0"+num;
	else
		return num;
}

