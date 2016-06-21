<!DOCTYPE html>
<html>
<head>
  <script src='https://cdn.tinymce.com/4/tinymce.min.js'></script>
  <script src="https:////ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js"></script>
  <link rel="stylesheet", href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css", integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7", crossorigin="anonymous"></linnk>
  <script>
  tinymce.init({
    selector: '#mytextarea',
    height:500,
    plugins:"paste",
	menubar:"edit",
	toolbar:"paste",
	paste_data_images: true,
	images_upload_url: '/uploadImg',
	images_upload_credentials: true
  });
  </script>
</head>

<body>
		<div style="margin:auto;width:90%">
			<h4 id="title" style="margin-top:50px;text-align:center"></h4> #{notice.title}
			<div id="body" style="border:solid 1px #c8c8c8;padding:20px;min-height:300px"></div> notice.body
			<div id="date" style="margin-top:15px;margin-right:15px;text-align:right"></div> 작성 날짜 : #{ new Date(notice.date)}
			<div style="margin-top:15px;margin-right:15px;text-align:right">
				<button class="btn btn-default" type="button" onclick="list()">목록</button>
				<button id="modbtn" class="btn btn-default" type="button" onclick="mod(#{notice.id})">수정</button>
				<button id="delbtn" class="btn btn-default" type="button" onclick="del(#{notice.id})">삭제</button>
			</div>
		</div>
	<script type="text/javascript">
		$("#title").text({notice.title});
		function del(num){
			if(confirm('삭제하시겠습니까')){
				location.href="/del/"+num;
			}
		}
		function list(){
			location.href="/"
		}
		function mod(num){
			location.href="/mod/"+num;
		}
	</script>
</html>