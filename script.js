/**
 * 이 파일은 미니톡 오목 플러그인의 일부입니다. (https://www.minitalk.io)
 *
 * 박스에 오목대국을 추가합니다.
 * 
 * @file /plugins/omok/script.js
 * @author Arzz (arzz@arzz.com)
 * @license MIT License
 * @version 1.0.0
 * @modified 2021. 2. 5.
 */
if (Minitalk === undefined) return;

/**
 * 오목대전 객체를 정의한다.
 */
me.timelimit = 300; // 대국시간(초)
me.timecount = 3; // 초읽기 기회
me.game = {
	minitalk:null,
	step:0,
	data:null,
	timer:null,
	timerCount:0,
	timerCallback:null,
	/**
	 * 대국자정보를 저장한다.
	 */
	status:{
		index:0,
		turn:"black", // 흑돌이 먼저 시작한다.
		stones:null,
		black:{user:null,data:null,timer:me.timelimit,timecount:me.timecount,timecounting:false,connected:false}, // 흑돌 대국상태
		white:{user:null,data:null,timer:me.timelimit,timecount:me.timecount,timecounting:false,connected:false} // 백돌 대국상태
	},
	/**
	 * 대국을 초기화한다.
	 */
	init:function(minitalk) {
		/**
		 * 클래스 내부에서 사용하기 위해 미니톡 객체를 저장한다.
		 */
		me.game.minitalk = minitalk;
		
		/**
		 * 전적을 가져온다
		 */
		me.game.data = minitalk.storage("@omok") ? minitalk.storage("@omok") : {win:0,lose:0};
		
		/**
		 * 오목판에 기물이 놓이는 좌표를 추가한다.
		 */
		var $omok = $("div[data-role=omok]");
		var $board = $("div[data-role=panel] > div[data-role=board]",$omok);
		for (var x=0;x<=18;x++) {
			for (var y=0;y<=18;y++) {
				var $point = $("<div>").attr("data-role","position").attr("data-x",x).attr("data-y",y);
				$board.append($point);
			}
		}
		
		/**
		 * 게임버튼을 추가한다.
		 */
		var $gamebuttons = $("div[data-role=gamebuttons]",$omok);
		$gamebuttons.append($("<button>").attr("data-action","pass").html("한수쉬기"));
		$gamebuttons.append($("<button>").attr("data-action","draw").html("기권하기"));
		$gamebuttons.append($("<button>").attr("data-action","reset").html("전적리셋"));
		$gamebuttons.append($("<button>").attr("data-action","close").html("게임종료"));
		
		$("button",$gamebuttons).on("click",function() {
			var action = $(this).attr("data-action");
			
			if (action == "pass") {
				if (me.game.team == null || me.game.step != 10) {
					me.game.printConfirm("안내","지금은 대국중이 아닙니다.",[{
						text:"확인",
						blackdler:function() {
							me.game.playSound("button");
							me.game.closeConfirm();
						}
					}]);
					return;
				}
				
				if (me.game.status.turn != me.game.team) {
					me.game.printConfirm("안내","나의 턴이 아닙니다.",[{
						text:"확인",
						blackdler:function() {
							me.game.playSound("button");
							me.game.closeConfirm();
						}
					}]);
					return;
				}
				
				me.game.printAlert("turn","한수를 쉽니다.");
				me.game.playSound("pass");
				me.game.endTurn();
			}
			
			if (action == "draw") {
				if (me.game.team == null || me.game.step != 10) {
					me.game.printConfirm("안내","지금은 대국중이 아닙니다.",[{
						text:"확인",
						blackdler:function() {
							me.game.playSound("button");
							me.game.closeConfirm();
						}
					}]);
					return;
				}
				
				if (me.game.status.turn != me.game.team) {
					me.game.printConfirm("안내","나의 턴이 아닙니다.",[{
						text:"확인",
						blackdler:function() {
							me.game.playSound("button");
							me.game.closeConfirm();
						}
					}]);
					return;
				}
				
				me.game.printConfirm("안내","기권하시겠습니까?",[{
					text:"확인",
					blackdler:function() {
						me.game.playSound("button");
						minitalk.socket.sendProtocol("draw",me.game.team);
						me.game.winner(me.game.team == "black" ? "white" : "black");
						me.game.closeConfirm();
					}
				},{
					text:"취소",
					blackdler:function() {
						me.game.playSound("button");
						me.game.closeConfirm();
					}
				}]);
			}
			
			if (action == "reset") {
				me.game.printConfirm("안내","대국관전을 종료하시겠습니까?",[{
					text:"확인",
					blackdler:function() {
						self.close();
					}
				},{
					text:"취소",
					blackdler:function() {
						me.game.playSound("button");
						me.game.closeConfirm();
					}
				}]);
			}
			
			if (action == "close") {
				if (me.game.team == null) {
					me.game.printConfirm("안내","게임전적을 리셋하시겠습니까?",[{
						text:"확인",
						blackdler:function() {
							me.game.playSound("button");
							me.game.data.win = 0;
							me.game.data.lose = 0;
							
							minitalk.storage("@omok",me.game.data);
							
							me.game.printConfirm("안내","전적을 초기화하였습니다.",[{
								text:"확인",
								blackdler:function() {
									me.game.playSound("button");
									me.game.closeConfirm();
								}
							}]);
						}
					},{
						text:"취소",
						blackdler:function() {
							me.game.playSound("button");
							me.game.closeConfirm();
						}
					}]);
				} else {
					me.game.printConfirm("안내","대국을 종료하시겠습니까?" + (me.game.step == 10 ? "<br>게임 종료시 기권처리됩니다." : ""),[{
						text:"확인",
						blackdler:function() {
							if (me.game.step == 10) {
								minitalk.socket.sendProtocol("draw",me.game.team);
								me.game.winner(me.game.team == "black" ? "white" : "black",true);
							} else {
								self.close();
							}
						}
					},{
						text:"취소",
						blackdler:function() {
							me.game.playSound("button");
							me.game.closeConfirm();
						}
					}]);
				}
			}
		});
		
		/**
		 * 대국시작여부 프로토콜을 추가한다.
		 */
		minitalk.socket.setProtocol("invite",function(minitalk,data,to,from) {
			me.game.playSound("match");
			me.game.printMessage("대국초대",from.nickname + "님이 오목대국을 신청하였습니다.<br>대국초대를 수락하시겠습니까?",[{
				text:"수락하기",
				blackdler:function() {
					me.game.playSound("button");
					minitalk.socket.sendProtocol("accept",me.game.data,from.nickname);
					me.game.closeMessage();
				}
			},{
				text:"관전하기",
				blackdler:function() {
					me.game.playSound("button");
					me.game.closeMessage();
					minitalk.ui.sendMessage("저는 관전만 하겠습니다.");
				}
			}]);
		});
		
		/**
		 * 대국수락 프로토콜을 추가한다.
		 */
		minitalk.socket.setProtocol("accept",function(minitalk,data,to,from) {
			/**
			 * 내가 방장인 경우에만 처리한다.
			 */
			if (minitalk.socket.uuid == minitalk.box.connection.uuid) {
				// 아직 상대가 정해지지 않은 경우
				if (me.game.step == 0 || me.game.step == 20) {
					me.game.status = {
						index:0,
						turn:"black", // 흑돌이 먼저 시작한다.
						stones:null,
						black:{user:null,data:null,timer:me.timelimit,timecount:me.timecount,timecounting:false,connected:false}, // 흑돌 대국상태
						white:{user:null,data:null,timer:me.timelimit,timecount:me.timecount,timecounting:false,connected:false} // 백돌 대국상태
					};
					
					me.game.step = 10;
					
					// 나의 팀을 정한다.
					me.game.team = me.game.getTeam(data);
					
					// 나의 정보를 저장한다.
					me.game.status[me.game.team].user = minitalk.user.me;
					me.game.status[me.game.team].data = me.game.data;
					
					// 상대방의 정보를 저장한다.
					me.game.status[me.game.team == "black" ? "white" : "black"].user = from;
					me.game.status[me.game.team == "black" ? "white" : "black"].data = data;
					
					me.game.status.black.connected = true;
					me.game.status.white.connected = true;
					
					// 대국시작가능여부를 확인한다.
					me.game.isReady();
				} else {
					minitalk.socket.sendProtocol("reject",null,from.nickname);
				}
				
				// 대국진행 상태를 전송한다.
				minitalk.socket.sendProtocol("status",{step:me.game.step,status:me.game.status});
			}
		});
		
		/**
		 * 대국수락 거절 프로토콜을 추가한다.
		 */
		minitalk.socket.setProtocol("reject",function(minitalk) {
			me.game.printMessage("안내","이미 다른 대국자가 결정되어 대국수락이 거절되었습니다.");
		});
		
		/**
		 * 대국시작 프로토콜을 추가한다.
		 */
		minitalk.socket.setProtocol("start",function(minitalk,data,to,from) {
			// 방장이 보낸 메시지인 경우에만 처리한다.
			if (from.uuid == minitalk.box.connection.uuid) {
				me.game.step = data.step;
				me.game.status = data.status;
				me.game.startGame();
			}
		});
		
		/**
		 * 턴넘김을 처리한다.
		 */
		minitalk.socket.setProtocol("turn",function(minitalk,data,to,from) {
			// 내가 방장이고, 상대방이 보낸 메시지가 맞을 경우
			if (minitalk.socket.uuid == minitalk.box.connection.uuid) {
				// 상대방의 팀을 구한다.
				var team = me.game.team == "black" ? "white" : "black";
				if (me.game.status[team].user.uuid == from.uuid) {
					me.game.status.turn = me.game.team;
					minitalk.socket.sendProtocol("status",{step:me.game.step,status:me.game.status});
					
					me.game.updateStatus();
				}
			}
		});
		
		/**
		 * 기권을 처리한다.
		 */
		minitalk.socket.setProtocol("draw",function(minitalk,data,to,from) {
			// 대국자가 보낸 것이 맞는 경우
			if (me.game.status[data].user.uuid == from.uuid) {
				me.game.winner(data == "black" ? "white" : "black");
			}
		});
		
		/**
		 * 타이머 프로토콜을 추가한다.
		 */
		minitalk.socket.setProtocol("timer",function(minitalk,data,to,from) {
			// 대국자가 보낸 것이 맞는 경우
			if (me.game.status[data.team].user.uuid == from.uuid) {
				me.game.status[data.team].timer = data.timer;
				me.game.status[data.team].timecount = data.timecount;
				me.game.status[data.team].timecounting = data.timecounting;
				me.game.updateTimers();
			}
		});
		
		/**
		 * 대국진행상태 프로토콜을 추가한다.
		 */
		minitalk.socket.setProtocol("status",function(minitalk,data,to,from) {
			// 대국상태를 저장한다.
			me.game.status = data.status;
			me.game.step = data.step;
			
			// 내가 대국자인지 확인한다.
			if (data.status.black.user.uuid == minitalk.socket.uuid) {
				me.game.team = "black";
			} else if (data.status.white.user.uuid == minitalk.socket.uuid) {
				me.game.team = "white";
			}
			
			// 내가 대국자인경우
			if (me.game.team != null) {
				if (me.game.step == 10) {
					me.game.updateStatus();
				}
			} else {
				if (me.game.step < 10) {
					
				}
				
				me.game.updateStatus();
			}
		});
		
		/**
		 * 돌을 놓는다.
		 */
		minitalk.socket.setProtocol("put",function(minitalk,data,to,from) {
			me.game.putStone(data.stone,data.position);
		});
		
		/**
		 * 미니톡 서버에 접속했을 때 이벤트를 추가한다.
		 */
		minitalk.on("connect",function(minitalk) {
			/**
			 * 내가 방장인 경우 (항상 방장이 대국을 시작한다.)
			 */
			if (minitalk.socket.uuid == minitalk.box.connection.uuid) {
				switch (me.game.step) {
					// 상대를 기다리는중
					case 0 :
						me.game.printMessage("대국대기중","대국자의 대국참여를 기다리는중입니다.");
						break;
				}
			}
		});
		
		/**
		 * 유저가 참여하였을 경우
		 */
		minitalk.on("join",function(minitalk,user) {
			/**
			 * 내가 방장인 경우 (항상 방장이 데이터를 전송한다.)
			 */
			if (minitalk.socket.uuid == minitalk.box.connection.uuid) {
				/**
				 * 대국상대가 정해지지 않은 경우, 대국시작여부를 물어본다.
				 */
				if (me.game.step == 0) {
					minitalk.socket.sendProtocol("invite",null,user.nickname);
				} else if (me.game.step == 5) {
					// 대국자가 다시 접속한 경우, 대국을 재개한다.
					if (me.game.status.black.user.uuid == user.uuid || me.game.status.white.user.uuid == user.uuid) {
						me.game.resumeGame();
					}
					
					// 대국진행 상태를 전송한다.
					minitalk.socket.sendProtocol("status",{step:me.game.step,status:me.game.status});
				} else if (me.game.step == 20) {
					// 이전 대국자가 종료한 경우
					var enemy = me.game.team == "black" ? "white" : "black";
					if (me.game.status[enemy].connected == false) {
						minitalk.socket.sendProtocol("invite",null,user.nickname);
					}
				} else {
					// 대국진행 상태를 전송한다.
					minitalk.socket.sendProtocol("status",{step:me.game.step,status:me.game.status},user.nickname);
				}
				
				return;
			}
			
			/**
			 * 대국을 일시중단상태이고, 아직 대국이 진행중이라면, 대국자가 대국상태를 전송한다.
			 */
			if (me.game.step == 5) {
				// 대국자가 다시 접속한 경우, 대국을 재개한다.
				if (me.game.status.black.user.uuid == user.uuid || me.game.status.white.user.uuid == user.uuid) {
					if (me.game.status.black.user.uuid == user.uuid) {
						me.game.status.black.connected = true;
					} else {
						me.game.status.white.connected = true;
					}
					me.game.resumeGame();
				}
				
				if (me.game.team != null) {
					// 대국진행 상태를 전송한다.
					minitalk.socket.sendProtocol("status",{step:me.game.step,status:me.game.status});
				}
			}
		});
		
		/**
		 * 유저가 나갔을 경우
		 */
		minitalk.on("leave",function(minitalk,user) {
			// 대국자가 나갔는지 확인한다.
			if (me.game.status.black.user.uuid == user.uuid || me.game.status.white.user.uuid == user.uuid) {
				if (me.game.status.black.user.uuid == user.uuid) {
					me.game.status.black.connected = false;
				} else {
					me.game.status.white.connected = false;
				}
				
				// 모두 대국을 종료했다면, 대국종료를 한다.
				if (me.game.status.black.connected == false && me.game.status.white.connected == false) {
					me.game.endGame();
				} else if (me.game.step < 20) {
					me.game.pauseGame();
				} else if (me.game.step == 20) {
					// 방장이 나갔다면, 게임을 종료한다.
					if (minitalk.box.connection.uuid == user.uuid) {
						me.game.endGame();
					} else {
						me.game.restartGame();
					}
				}
			}
		});
	},
	/**
	 * 타이머를 시작한다.
	 *
	 * @param int count 타임을 셀 카운트
	 * @param function callback
	 */
	startTimer:function(count,callback) {
		if (me.game.timer != null) {
			clearInterval(me.game.timer);
		}
		
		me.game.timerCount = count;
		me.game.timerCallback = callback;
		me.game.timer = setInterval(function() {
			var count = --me.game.timerCount;
			
			if (count >= 0) {
				me.game.timerCallback(count);
			} else {
				if (me.game.timer != null) {
					clearInterval(me.game.timer);
				}
			}
		},1000);
	},
	/**
	 * 타이머를 중지한다.
	 */
	stopTimer:function() {
		if (me.game.timer != null) {
			clearInterval(me.game.timer);
			me.game.timer = null;
		}
	},
	/**
	 * 나의 팀을 가져온다.
	 *
	 * @param object data 상대방 데이터
	 */
	getTeam:function(data) {
		// 상대방 전적이 없다면, 방장이 한나라가 된다.
		if (data.win + data.lose == 0) return "black";
		
		// 내가 전적이 없다면 초나라가 된다.
		if (me.game.data.win + me.game.data.lose == 0) return "white";
		
		// 나의 승률이 높다면, 한나라가 된다.
		if ((data.win / (data.win + data.lose)) < (me.game.data.win / (me.game.data.win + me.game.data.lose))) return "black";
		else return "white";
	},
	/**
	 * 초를 분:초 로 변환한다.
	 */
	getTime:function(second) {
		var m = Math.floor(second / 60);
		var s = second % 60;
		return (m == 0 ? "0" : m) + ":" + (s < 10 ? "0" + s : s);
	},
	/**
	 * 알림메시지를 띄운다. (턴전환, 초읽기, 장군 등 알림)
	 */
	printAlert:function(type,message) {
		var $omok = $("div[data-role=omok]");
		var $panel = $("div[data-role=panel]",$omok);
		
		if ($("div[data-role=alert][data-type=" + type + "]",$panel).length == 1) {
			clearTimeout($("div[data-role=alert][data-type=" + type + "]",$panel).data("timer"));
			$("div[data-role=alert][data-type=" + type + "]",$panel).stop();
			$("div[data-role=alert][data-type=" + type + "]",$panel).remove();
		}
		
		var $alert = $("<div>").attr("data-role","alert").attr("data-type",type);
		var $box = $("<div>").attr("data-role","box");
		
		if (message) {
			$box.html(message);
		}
		
		var timeout = setTimeout(function() {
			var $omok = $("div[data-role=omok]");
			var $panel = $("div[data-role=panel]",$omok);
			var $alert = $("div[data-role=alert]",$panel);
			
			$alert.animate({right:"100%"},"fast",function() {
				$alert.remove();
			});
		},3000);
		
		$alert.append($box);
		$panel.append($alert);
	},
	/**
	 * 메시지를 띄운다.
	 *
	 * @param string title 제목
	 * @param string message 메시지
	 * @param object[] button 버튼
	 */
	printMessage:function(title,message,buttons) {
		var $omok = $("div[data-role=omok]");
		var $panel = $("div[data-role=panel]",$omok);
		
		me.game.closeMessage();
		
		var $message = $("<div>").attr("data-role","message");
		var $box = $("<div>").attr("data-role","box");
		$message.append($("<div>").append($box));
		
		var $title = $("<h4>").html(title);
		$box.append($title);
		
		var $content = $("<p>").html(message);
		$box.append($content);
		
		var buttons = buttons ? buttons : [];
		if (buttons.length > 0) {
			var $buttons = $("<div>").attr("data-role","buttons");
			for (var i=0, loop=buttons.length;i<loop;i++) {
				var $button = $("<button>").attr("type","button").html(buttons[i].text);
				$button.on("click",buttons[i].blackdler);
				$buttons.append($button);
			}
			
			$box.append($buttons);
		}
		
		$panel.append($message);
	},
	/**
	 * 메시지를 닫는다.
	 */
	closeMessage:function() {
		var $omok = $("div[data-role=omok]");
		var $panel = $("div[data-role=panel]",$omok);
		if ($("div[data-role=message]",$panel).length == 1) {
			$("div[data-role=message]",$panel).remove();
		}
	},
	/**
	 * 메시지를 띄운다.
	 *
	 * @param string title 제목
	 * @param string message 메시지
	 * @param object[] button 버튼
	 */
	printConfirm:function(title,message,buttons) {
		var $omok = $("div[data-role=omok]");
		
		me.game.closeConfirm();
		
		var $confirm = $("<div>").attr("data-role","confirm");
		var $box = $("<div>").attr("data-role","box");
		$confirm.append($("<div>").append($box));
		
		var $title = $("<h4>").html(title);
		$box.append($title);
		
		var $content = $("<p>").html(message);
		$box.append($content);
		
		var buttons = buttons ? buttons : [];
		if (buttons.length > 0) {
			var $buttons = $("<div>").attr("data-role","buttons");
			for (var i=0, loop=buttons.length;i<loop;i++) {
				var $button = $("<button>").attr("type","button").html(buttons[i].text);
				$button.on("click",buttons[i].blackdler);
				$buttons.append($button);
			}
			
			$box.append($buttons);
		}
		
		$omok.append($confirm);
	},
	/**
	 * 메시지를 닫는다.
	 */
	closeConfirm:function() {
		var $omok = $("div[data-role=omok]");
		if ($("div[data-role=confirm]",$omok).length == 1) {
			$("div[data-role=confirm]",$omok).remove();
		}
	},
	/**
	 * 대국시작준비가 되었는지 확인한다.
	 */
	isReady:function() {
		var minitalk = me.game.minitalk;
		
		// 방장이 아닌 경우
		if (minitalk.box.connection.uuid != minitalk.socket.uuid) return;
		
		if (me.game.status.black.user != null && me.game.status.white.user != null) {
			// 기물 좌표값을 초기화한다.
			me.game.initStones();
			
			// 대국시작 프로토콜을 전송한다.
			minitalk.socket.sendProtocol("start",{step:me.game.step,status:me.game.status});
			
			// 대국을 시작한다.
			me.game.startGame();
		}
	},
	/**
	 * 기물 좌표값을 초기화한다.
	 */
	initStones:function() {
		// 기물 좌표값을 초기화한다. (stones[x][y])
		me.game.status.stones = [];
		for (var x=0;x<=18;x++) {
			me.game.status.stones[x] = [];
			for (var y=0;y<=18;y++) {
				me.game.status.stones[x][y] = null;
			}
		}
	},
	/**
	 * 대국을 시작한다.
	 */
	startGame:function() {
		var minitalk = me.game.minitalk;
		
		// 시작음을 출력한다.
		me.game.playSound("start");
		
		// 메시지창을 닫는다.
		me.game.closeMessage();
		
		// 상태를 업데이트한다.
		me.game.updateStatus();
	},
	/**
	 * 대국을 중단한다.
	 */
	pauseGame:function() {
		// 대국단계를 조절한다.
		me.game.step = 5;
		
		// 대국자가 아니라면
		if (me.game.team == null) {
			me.game.printMessage("대국자 재접속 대기중...","대국자 중 한명이 종료하여, 재참여를 기다리거나 대국승패판정을 기다리고 있습니다.");
			return;
		}
		
		// 대국자라면
		if (me.game.team != null) {
			// 나의 턴이라면, 타이머를 중단한다.
			if (me.game.status.turn == me.game.team) {
				me.game.stopTimer();
			}
			
			me.game.startTimer(60,function(count) {
				me.game.printMessage("재접속 대기중...","상대 대국자가 대국을 종료하였습니다.<br><b>" + count + "</b>초 이내에 상대방이 재접속하지 않는 경우 대국에서 승리하게 됩니다.");
				
				if (count == 0) {
					me.game.winner(me.game.team);
				}
			});
		}
	},
	/**
	 * 대국을 재개한다.
	 */
	resumeGame:function() {
		// 접속상태를 갱신한다.
		me.game.status.black.connected = true;
		me.game.status.white.connected = true;
		
		// 대국단계를 조절한다.
		me.game.step = 10;
		
		// 초읽기중이었다면, 시간을 조절한다.
		if (me.game.status[me.game.status.turn].timecounting == true) {
			me.game.status[me.game.status.turn].timer = 60;
			me.game.updateTimers();
		}
		
		me.game.closeMessage();
		
		// 대국 대국자라면
		if (me.game.team != null) {
			me.game.stopTimer();
			me.game.updateTurn();
		}
	},
	/**
	 * 대국을 종료한다.
	 */
	endGame:function() {
		me.game.printMessage("대국종료","대국자가 모두 채널을 떠났거나, 대국재시작을 하지 않았으므로, 이 채널에서 대국은 더이상 진행되지 않습니다.",[{
			text:"나가기",
			blackdler:function() {
				self.close();
			}
		}]);
	},
	/**
	 * 게임을 재시작한다.
	 */
	restartGame:function() {
		var minitalk = me.game.minitalk;
		
		// 방장이 아닌경우 재시작하지 않는다.
		if (minitalk.box.connection.uuid != minitalk.socket.uuid) return;
		
		// 대국자가 접속중인 경우
		var enemy = me.game.team == "black" ? "white" : "black";
		if (me.game.status[enemy].connected == true) {
			me.game.printMessage("재대국신청중","상대방의 재대국의사를 기다리고 있습니다.<br>잠시만 기다려주십시오.");
			minitalk.socket.sendProtocol("invite",null,me.game.status[enemy].user.nickname);
		} else {
			me.game.printMessage("재대국신청중","현재 채널에 접속중인 유저에게 게임참여 의사를 물어보고 있습니다.<br>잠시만 기다려주십시오.");
			minitalk.socket.sendProtocol("invite",null);
		}
	},
	/**
	 * 대국자 정보를 업데이트한다.
	 */
	updatePlayers:function() {
		var $omok = $("div[data-role=omok]");
		var $player = $("div[data-role=player]",$omok);
		
		var $black = $("div.black > label",$player);
		if ($("b",$black).length == 0) {
			$black.append($("<b>").html(me.game.status.black.user.nickname));
		} else {
			$("b",$black).html(me.game.status.black.user.nickname);
		}
		if ($("i",$black).length == 0) {
			$black.append($("<i>").html(me.game.status.black.data.win + "승 " + me.game.status.black.data.lose + "패"));
		} else {
			$("i",$black).html(me.game.status.black.data.win + "승 " + me.game.status.black.data.lose + "패");
		}
		
		var $white = $("div.white > label",$player);
		if ($("b",$white).length == 0) {
			$white.append($("<b>").html(me.game.status.white.user.nickname));
		} else {
			$("b",$white).html(me.game.status.white.user.nickname);
		}
		if ($("i",$white).length == 0) {
			$white.append($("<i>").html(me.game.status.white.data.win + "승 " + me.game.status.white.data.lose + "패"));
		} else {
			$("i",$white).html(me.game.status.white.data.win + "승 " + me.game.status.white.data.lose + "패");
		}
	},
	/**
	 * 대국상태를 갱신한다.
	 */
	updateStatus:function() {
		// 내가 대국중이라면, 나의 팀을 아래에 배치하거나, 대국중이 아닌 경우 초나라를 아래쪽에 배치한다.
		var $omok = $("div[data-role=omok]");
		var $board = $("div[data-role=panel] > div[data-role=board]",$omok);
		$board.removeClass("black").removeClass("white").addClass(me.game.team === "black" ? "black" : "white");
		
		me.game.closeMessage();
		
		// 대국자를 업데이트 한다.
		me.game.updatePlayers();
		
		if (me.game.step == 5) {
			me.game.pauseGame();
			return;
		} else if (me.game.step < 10) {
			if (me.game.team == null) {
				me.game.printMessage("대국시작 대기중...","아직 대국이 시작되지 않았습니다.<br>대국이 시작되면 관전할 수 있습니다.");
			}
			return;
		} else if (me.game.step == 20) {
			if (me.game.team == null) {
				me.game.printMessage("대국종료","대국이 종료되어, 재대국 여부를 결정하고 있습니다.<br>대국이 시작되면 관전할 수 있습니다.");
			}
			return;
		}
		
		// 타이머를 업데이트 한다.
		me.game.updateTimers();
		
		// 기물배치를 업데이트한다.
		me.game.updateStones();
		
		// 턴을 업데이트 한다.
		me.game.updateTurn();
	},
	/**
	 * 타이머를 업데이트한다.
	 */
	updateTimers:function() {
		var $omok = $("div[data-role=omok]");
		var $timer = $("div[data-role=timer]",$omok);
		
		var $black = $("div.black",$timer);
		if ($("b",$black).length == 0) {
			$black.append($("<b>").html(me.game.status.black.timecount));
		} else {
			$("b",$black).html(me.game.status.black.timecount);
		}
		if ($("small",$black).length == 0) {
			$black.append($("<small>").html(me.game.getTime(me.game.status.black.timer)));
		} else {
			$("small",$black).html(me.game.getTime(me.game.status.black.timer));
		}
		
		var $white = $("div.white",$timer);
		if ($("b",$white).length == 0) {
			$white.append($("<b>").html(me.game.status.white.timecount));
		} else {
			$("b",$white).html(me.game.status.white.timecount);
		}
		if ($("small",$white).length == 0) {
			$white.append($("<small>").html(me.game.getTime(me.game.status.white.timer)));
		} else {
			$("small",$white).html(me.game.getTime(me.game.status.white.timer));
		}
		
		if (me.game.status.turn == "black") {
			if (me.game.status.white.timecounting == true) {
				$("small",$white).html(me.game.getTime(60));
			}
			
			var remain = me.game.status.black.timer;
		} else {
			if (me.game.status.black.timecounting == true) {
				$("small",$black).html(me.game.getTime(60));
			}
			
			var remain = me.game.status.white.timer;
		}
		
		if (remain <= 60) {
			var $pin = $("div.clock > i",$timer);
			var rotate = 60 - remain;
			$pin.css("transform","rotate("+rotate * 6+"deg)");
			
			if (remain <= 10) {
				me.game.playSound("count");
			}
			
			if (remain == 0) {
				var remaincount = me.game.status[me.game.status.turn].timecounting == false ? me.game.status[me.game.status.turn].timecount : me.game.status[me.game.status.turn].timecount - 1;
				if (remaincount == 0) {
					me.game.winner(me.game.status.turn == "black" ? "white" : "black");
					return;
				}
				
				// 초읽기 시작 알림
				me.game.playSound("pass");
				
				if (remaincount == 1) {
					me.game.printAlert("lastcounting","마지막 초읽기 시작");
				} else {
					me.game.printAlert("timecounting","초읽기 시작 (<b>" + remaincount + "<b>회 남음)");
				}
			}
		}
	},
	/**
	 * 턴을 업데이트한다.
	 */
	updateTurn:function(message) {
		var message = message !== false;
		
		var $omok = $("div[data-role=omok]");
		var $board = $("div[data-role=panel] > div[data-role=board]",$omok);
		var $selectables = $("button[data-role=selectable]",$board);
		
		var $player = $("div[data-role=player]",$omok);
		
		$("> div",$player).removeClass("on");
		$("> div." + me.game.status.turn,$player).addClass("on");
		
		$selectables.enable();
		
		// 나의 턴이라면, 나의 턴임을 알린다.
		if (me.game.status.turn == me.game.team) {
			// 삼삼이 되는 위치를 막는다.
			for (var i=0, loop=$selectables.length;i<loop;i++) {
				var position = {x:parseInt($selectables.eq(i).attr("data-x"),10),y:parseInt($selectables.eq(i).attr("data-y"),10)};
				if (me.game.checkLine(me.game.status.turn,position) == true) {
					$selectables.eq(i).disable();
				}
			}
			
			if (message == true) me.game.printAlert("turn","나의 턴입니다.");
			
			// 타이머를 시작한다.
			if (me.game.status[me.game.team].timecounting == true) {
				var remain = 60;
			} else {
				var remain = me.game.status[me.game.team].timer;
			}
			
			me.game.startTimer(remain,function(count) {
				me.game.status[me.game.team].timer = count;
				me.game.updateTimers();
				
				me.game.minitalk.socket.sendProtocol("timer",{
					team:me.game.team,
					timer:me.game.status[me.game.team].timer,
					timecount:me.game.status[me.game.team].timecount,
					timecounting:me.game.status[me.game.team].timecounting
				});
				
				if (count == 0) {
					if (me.game.status[me.game.team].timecounting == true) {
						me.game.status[me.game.team].timecount--;
						if (me.game.status[me.game.team].timecount > 0) {
							me.game.updateTurn(false);
						}
					} else {
						me.game.status[me.game.team].timecounting = true;
						me.game.updateTurn(false);
					}
				}
			});
			
			me.game.setDisabled(false);
		} else {
			me.game.setDisabled(true);
		}
	},
	/**
	 * 기물배치를 업데이트한다.
	 *
	 * @param object move
	 */
	updateStones:function() {
		var $omok = $("div[data-role=omok]");
		var $board = $("div[data-role=panel] > div[data-role=board]",$omok);
		
		var stones = me.game.status.stones;
		for (var x=0;x<=18;x++) {
			for (var y=0;y<=18;y++) {
				var $position = $("div[data-role=position][data-x=" + x + "][data-y=" + y + "]",$board);
				var stone = stones[x][y];
				if (stone == null) {
					$("button[data-role=stone]",$position).remove();
					
					var $selectable = $("button[data-role=selectable]",$position);
					if ($selectable.length == 0) {
						var $selectable = $("<button>").attr("type","button").attr("data-role","selectable").attr("data-x",x).attr("data-y",y);
						$selectable.on("click",function() {
							me.game.selectPosition(parseInt($(this).attr("data-x"),10),parseInt($(this).attr("data-y"),10));
						});
						$position.append($selectable);
					}
				} else {
					$("button[data-role=selectable]",$position).remove();
					
					var $stone = $("button[data-role=stone]",$position);
					if ($stone.length == 0 || $stone.data("stone").team != stone.team) {
						$("button[data-role=stone]",$position).remove();
						var $stone = $("<button>").attr("type","button").attr("data-role","stone").attr("data-team",stone.team).data("stone",stone);
						$position.append($stone);
					}
				}
			}
		}
	},
	/**
	 * 돌을 놓을 위치를 선택한다.
	 */
	selectPosition:function(x,y) {
		if (me.game.team != me.game.status.turn) return;
		
		var minitalk = me.game.minitalk;
		
		var stone = {index:me.game.status.index,team:me.game.team};
		var position = {x:x,y:y};
		
		// 돌을 실제로 놓는다.
		me.game.putStone(stone,position);
		
		// 돌을 놓았음을 서버에 전송한다.
		minitalk.socket.sendProtocol("put",{stone:stone,position:position});
		
		// 턴을 종료한다.
		me.game.endTurn();
	},
	/**
	 * 돌을 놓는다.
	 */
	putStone:function(stone,position) {
		var $omok = $("div[data-role=omok]");
		var $board = $("div[data-role=panel] > div[data-role=board]",$omok);
		var $stones = $("button[data-role=stone]",$board);
		$stones.removeClass("latest");
		
		me.game.status.stones[position.x][position.y] = stone;
		me.game.updateStones();
		
		var $nStone = $("div[data-role=position][data-x=" + position.x + "][data-y=" + position.y + "] > button[data-role=stone]",$board);
		$nStone.addClass("latest");
		
		me.game.status.index = stone.index + 1;
		
		me.game.playSound("stone");
		
		// 오목인지 확인한다.
		if (me.game.checkLine(stone.team,position) == true) {
			me.game.winner(stone.team);
		}
	},
	/**
	 * 턴을 종료한다.
	 */
	endTurn:function() {
		var minitalk = me.game.minitalk;
		
		// 내 턴이면
		if (me.game.status.turn == me.game.team) {
			me.game.status.turn = me.game.team == "black" ? "white" : "black";
		} else {
			return;
		}
		
		var $omok = $("div[data-role=omok]");
		var $board = $("div[data-role=panel] > div[data-role=board]",$omok);
		var $stones = $("button[data-role=stone]",$board);
		
		$("button[data-role=movable]",$board).remove();
		$stones.removeClass("selected");
		
		$("button[data-role=movable]",$board).remove();
		
		// 타이머를 중지한다.
		me.game.stopTimer();
		
		// 내가 방장이면
		if (minitalk.box.connection.uuid == minitalk.socket.uuid) {
			minitalk.socket.sendProtocol("status",{step:me.game.step,status:me.game.status});
			me.game.updateStatus();
		} else {
			minitalk.socket.sendProtocol("turn",null);
		}
	},
	/**
	 * 라인좌표를 가져온다.
	 *
	 * @param object position 초기좌표 {x:x,y:y}
	 * @param string dirs 이동방향 (l : 좌, r : 우, u : 상, d : 하)
	 * @return object position
	 */
	getLinePosition:function(position,dirs) {
		for (var i=0, loop=dirs.length;i<loop;i++) {
			var dir = dirs[i];
			
			switch (dir) {
				case "u" :
					position = {x:position.x,y:position.y-1};
					break;
					
				case "d" :
					position = {x:position.x,y:position.y+1};
					break;
					
				case "l" :
					position = {x:position.x-1,y:position.y};
					break;
					
				case "r" :
					position = {x:position.x+1,y:position.y};
					break;
			}
		}
		
		return position;
	},
	/**
	 * 라인별 돌의 갯수를 가져온다.
	 *
	 * @param string team 라인을 가져올 팀
	 * @param object position 초기좌표 {x:x,y:y}
	 * @param string line 라인 (v : 세로, h : 가로, dl : 대각선(/), dr : 대각선(\)
	 */
	getLineCount:function(team,position,line) {
		var stone = me.game.status.stones[position.x][position.y];
		// 빈자리인경우, 삼삼이 되는지 확인한다.
		if (stone == null) {
			var is33mode = true;
			var count = 0;
		} else {
			var is33mode = false;
			var count = 1;
		}
		
		var isEmpty = 0;
		
		if (line == "v") {
			// 위
			var check = me.game.getLinePosition(position,"u");
			while (check.x >= 0 && check.x <= 18 && check.y >= 0 && check.y <= 18) {
				var checked = me.game.status.stones[check.x][check.y];
				if (checked == null || checked.team != team) {
					if (is33mode == true) {
						if (checked == null) isEmpty++; // 자리가 비어있는지 확인한다.
					}
					break;
				}
				
				count++;
				
				check = me.game.getLinePosition(check,"u");
			}
			
			// 아래
			var check = me.game.getLinePosition(position,"d");
			while (check.x >= 0 && check.x <= 18 && check.y >= 0 && check.y <= 18) {
				var checked = me.game.status.stones[check.x][check.y];
				if (checked == null || checked.team != team) {
					if (is33mode == true) {
						if (checked == null) isEmpty++; // 자리가 비어있는지 확인한다.
					}
					break;
				}
				
				count++;
				
				check = me.game.getLinePosition(check,"d");
			}
		}
		
		if (line == "h") {
			// 좌
			var check = me.game.getLinePosition(position,"l");
			while (check.x >= 0 && check.x <= 18 && check.y >= 0 && check.y <= 18) {
				var checked = me.game.status.stones[check.x][check.y];
				if (checked == null || checked.team != team) {
					if (is33mode == true) {
						if (checked == null) isEmpty++; // 자리가 비어있는지 확인한다.
					}
					break;
				}
				
				count++;
				
				check = me.game.getLinePosition(check,"l");
			}
			
			// 우
			var check = me.game.getLinePosition(position,"r");
			while (check.x >= 0 && check.x <= 18 && check.y >= 0 && check.y <= 18) {
				var checked = me.game.status.stones[check.x][check.y];
				if (checked == null || checked.team != team) {
					if (is33mode == true) {
						if (checked == null) isEmpty++; // 자리가 비어있는지 확인한다.
					}
					break;
				}
				
				count++;
				
				check = me.game.getLinePosition(check,"r");
			}
		}
		
		if (line == "dl") {
			// 우상
			var check = me.game.getLinePosition(position,"ru");
			while (check.x >= 0 && check.x <= 18 && check.y >= 0 && check.y <= 18) {
				var checked = me.game.status.stones[check.x][check.y];
				if (checked == null || checked.team != team) {
					if (is33mode == true) {
						if (checked == null) isEmpty++; // 자리가 비어있는지 확인한다.
					}
					break;
				}
				
				count++;
				
				check = me.game.getLinePosition(check,"ru");
			}
			
			// 좌하
			var check = me.game.getLinePosition(position,"ld");
			while (check.x >= 0 && check.x <= 18 && check.y >= 0 && check.y <= 18) {
				var checked = me.game.status.stones[check.x][check.y];
				if (checked == null || checked.team != team) {
					if (is33mode == true) {
						if (checked == null) isEmpty++; // 자리가 비어있는지 확인한다.
					}
					break;
				}
				
				count++;
				
				check = me.game.getLinePosition(check,"ld");
			}
		}
		
		if (line == "dr") {
			// 좌상
			var check = me.game.getLinePosition(position,"lu");
			while (check.x >= 0 && check.x <= 18 && check.y >= 0 && check.y <= 18) {
				var checked = me.game.status.stones[check.x][check.y];
				if (checked == null || checked.team != team) {
					if (is33mode == true) {
						if (checked == null) isEmpty++; // 자리가 비어있는지 확인한다.
					}
					break;
				}
				
				count++;
				
				check = me.game.getLinePosition(check,"lu");
			}
			
			// 우하
			var check = me.game.getLinePosition(position,"rd");
			while (check.x >= 0 && check.x <= 18 && check.y >= 0 && check.y <= 18) {
				var checked = me.game.status.stones[check.x][check.y];
				if (checked == null || checked.team != team) {
					if (is33mode == true) {
						if (checked == null) isEmpty++; // 자리가 비어있는지 확인한다.
					}
					break;
				}
				
				count++;
				
				check = me.game.getLinePosition(check,"rd");
			}
		}
		
		if (is33mode == true && isEmpty == 2) count++;
		
		return count;
	},
	/**
	 * 라인을 체크한다.
	 */
	checkLine:function(team,position) {
		var stone = me.game.status.stones[position.x][position.y];
		// 빈자리인경우, 삼삼이 되는지 확인한다.
		if (stone == null) {
			var is33mode = true;
		} else {
			var is33mode = false;
			if (stone.team != team) return false;
		}
		
		// 세로 (v)
		var v = me.game.getLineCount(team,position,"v");
		if (is33mode == false && v == 5) return true;
		
		// 가로 (h)
		var h = me.game.getLineCount(team,position,"h");
		if (is33mode == false && h == 5) return true;
		
		// 대각선 (/)
		var dl = me.game.getLineCount(team,position,"dl");
		if (is33mode == false && dl == 5) return true;
		
		// 대각선 (\)
		var dr = me.game.getLineCount(team,position,"dr");
		if (is33mode == false && dr == 5) return true;
		
		if (is33mode == false) {
			return false;
		} else {
			// 삼삼이인지 확인한다.
			var count = 0;
			if (v == 3) count++;
			if (h == 3) count++;
			if (dl == 3) count++;
			if (dr == 3) count++;
			
			if (count >= 2) return true;
			else return false;
		}
	},
	/**
	 * 승리여부를 결정한다.
	 *
	 * @param string winner
	 */
	winner:function(winner,is_close) {
		var is_close = is_close === true;
		var minitalk = me.game.minitalk;
		
		me.game.stopTimer();
		
		if (me.game.team == null) {
			var message = me.game.status[winner].user.nickname + "님(" + (winner == "black" ? "한나라" : "초나라") + ")이 대국에서 승리하였습니다.";
		} else {
			// 승리하였을 경우
			if (me.game.team == winner) {
				me.game.playSound("win");
				
				// 전적을 기록한다.
				me.game.data.win = me.game.data.win + 1;
				minitalk.storage("@omok",me.game.data);
				
				var message = "대국에서 승리하셨습니다.";
			} else {
				me.game.playSound("lose");
				
				// 전적을 기록한다.
				me.game.data.lose = me.game.data.lose + 1;
				minitalk.storage("@omok",me.game.data);
				
				var message = "대국에서 패배하셨습니다.";
			}
		}
		
		// 재대국이 가능한 경우
		if (is_close == true) {
			me.game.printMessage("대국종료",message + "<br>5초후 자동으로 게임이 종료됩니다.",[{
				text:"지금종료",
				blackdler:function() {
					self.close();
				}
			}]);
			setTimeout(function() { self.close(); },5000);
		} else if (me.game.step == 10) {
			if (me.game.team == null) {
				message+= "<br>재대국 여부를 결정하고 있습니다. 잠시만 기다려주십시오.";
				me.game.printMessage("대국종료",message,[{
					text:"관전종료",
					blackdler:function() {
						self.close();
					}
				}]);
			} else {
				// 방장인 경우
				if (minitalk.box.connection.uuid == minitalk.socket.uuid) {
					message+= "<br>상대방과 재대국을 하시겠습니까?";
					me.game.printMessage("대국종료",message,[{
						text:"재대국하기",
						blackdler:function() {
							me.game.restartGame();
						}
					},{
						text:"대국종료",
						blackdler:function() {
							self.close();
						}
					}]);
				} else {
					message+= "<br>상대방과 재대국 하시겠습니까?";
					me.game.printMessage("대국종료",message,[{
						text:"재대국하기",
						blackdler:function() {
							me.game.printMessage("대기중","상대방의 재대국의사를 기다리고 있습니다.<br>잠시만 기다려주십시오.");
						}
					},{
						text:"게임종료",
						blackdler:function() {
							self.close();
						}
					}]);
				}
			}
		} else {
			message+= "<br>대국자중 한명이 대국을 종료하여 더이상 대국을 진행할 수 없습니다.";
			
			me.game.printMessage("대국종료",message,[{
				text:"대국종료",
				blackdler:function() {
					self.close();
				}
			}]);
		}
		
		me.game.step = 20;
	},
	/**
	 * 오목판을 비활성화여부를 설정한다.
	 *
	 * @param boolean disabled 비활성화여부
	 */
	setDisabled:function(disabled) {
		var $omok = $("div[data-role=omok]");
		var $panel = $("div[data-role=panel]",$omok);
		var $disabled = $("div[data-role=disabled]",$panel);
		
		if (disabled == true) $disabled.show();
		else $disabled.hide();
	},
	/**
	 * 효과음을 재생한다.
	 *
	 * @param string type 효과음타입
	 */
	playSound:function(type) {
		var $audio = $("audio[data-type="+type+"]");
		if ($audio.length == 0) return;
		
		var audio = $audio.get(0);
		audio.pause();
		audio.currentTime = 0;
		audio.muted = false;
		var promise = audio.play();
		if (promise !== undefined) {
			promise.then(function() {
			}).catch(function(e) {
			});
		}
	}
};

Minitalk.on("init",function(minitalk) {
	/**
	 * 박스가 아닌경우, 박스타입에 오목대전을 추가한다.
	 */
	if (minitalk.box.isBox() == false) {
		var html = [
			'<div data-role="omok">',
				/**
				 * 오목판
				 */
				'<div data-role="panel"><div data-role="board"></div><div data-role="disabled"></div></div>',
				
				/**
				 * 채팅영역시작
				 */
				'<div data-role="frame">',
			
				/**
				 * 위젯헤더
				 */
				'<header>',
					'<h1>connecting...</h1>', // 위젯타이틀
					'<label data-role="count"></label>', // 접속자수
					'<div data-role="tabs"></div>', // 헤더메뉴 (v6)
				'</header>',
				
				/**
				 * 타이머
				 */
				'<div data-role="timer">',
					'<div class="black"></div>',
					'<div class="clock"><i></i></div>',
					'<div class="white"></div>',
				'</div>',
				
				/**
				 * 대전자
				 */
				'<div data-role="player">',
					'<div class="black"><label></label></div>',
					'<div class="white"><label></label></div>',
				'</div>',
			
				/**
				 * 탭바 (v7)
				 */
				'<aside></aside>',
				
				/**
				 * 메인영역
				 */
				'<main></main>',
				
				/**
				 * 위젯푸터
				 */
				'<footer></footer>',
				
				/**
				 * 대국액션버튼
				 */
				'<div data-role="gamebuttons"></div>',
				
				/**
				 * 채팅영역종료
				 */
				'</div>',
				
				/**
				 * 효과음
				 */
				'<audio data-type="button"><source src="' + Minitalk.getPluginUrl("omok") + '/sounds/button.mp3" type="audio/mpeg"></audio>',
				'<audio data-type="count"><source src="' + Minitalk.getPluginUrl("omok") + '/sounds/count.mp3" type="audio/mpeg"></audio>',
				'<audio data-type="lose"><source src="' + Minitalk.getPluginUrl("omok") + '/sounds/lose.mp3" type="audio/mpeg"></audio>',
				'<audio data-type="match"><source src="' + Minitalk.getPluginUrl("omok") + '/sounds/match.mp3" type="audio/mpeg"></audio>',
				'<audio data-type="pass"><source src="' + Minitalk.getPluginUrl("omok") + '/sounds/pass.mp3" type="audio/mpeg"></audio>',
				'<audio data-type="start"><source src="' + Minitalk.getPluginUrl("omok") + '/sounds/start.mp3" type="audio/mpeg"></audio>',
				'<audio data-type="stone"><source src="' + Minitalk.getPluginUrl("omok") + '/sounds/stone.mp3" type="audio/mpeg"></audio>',
				'<audio data-type="win"><source src="' + Minitalk.getPluginUrl("omok") + '/sounds/win.mp3" type="audio/mpeg"></audio>',
			'</div>'
		];
		
		html = html.join("");
		minitalk.box.addType("omok",me.getText("text/title"),1120,770,html);
	}
	
	/**
	 * 박스이고, 오목대전박스인 경우 오목대전을 초기화한다.
	 */
	if (minitalk.box.isBox() === true && minitalk.box.getType() == "omok") {
		// 박스 종료모드가 방장종료인 경우, 전체 유저 접속종료로 변경한다. (방장이 대국에서 도망가는 경우를 막기 위함)
		minitalk.box.connection.closemode = "all";
		me.game.init(minitalk);
	}
});