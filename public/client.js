let GameID = null;
let PlayerRole = null;

const clientServer = new WebSocket(`wss://${window.location.host}`);

clientServer.onopen = () => { };

var board = Chessboard("board", {
    draggable: true,
    dropOffBoard: "snapback",
    onDrop: onDrop,
    position: "start",
});

async function DecryptMsg(msg) {
    try {
        const data = JSON.parse(msg.data);

        if (data.randomNum !== undefined) {
            GameID = data.randomNum;
        } else if (data.PlayerRole !== undefined) {
            PlayerRole = data.PlayerRole;
            board.orientation(PlayerRole);
        }
        if (data.Notice !== undefined) {
            let Notice_Board = document.getElementById("noticeBox");
            Notice_Board.innerHTML = data.Notice;
            Notice_Board.style.display = "flex";

            if (data.Notice=="Check"){
                setTimeout(() => {
                    Notice_Board.style.display = "None";
                }, 3000);
            }

            if (data.Notice == "Player Found") {
                Notice_Board.style.display = "none";
            }
            else if (data.Notice == "Eliminate") {
                Notice_Board.style.display = "none";
                if (data.eliminate_piece.color == "w") {
                    if (PlayerRole == "white") {
                        document.getElementById("Black_eliminate").innerHTML += `<img class="Eliminate_img" src="https://chessbeast.onrender.com/img/chesspieces/wikipedia/w${data.eliminate_piece.type.toUpperCase()}.png" alt="">`;
                    }
                    else {
                        document.getElementById("White_eliminate").innerHTML += `<img class="Eliminate_img" src="https://chessbeast.onrender.com/img/chesspieces/wikipedia/w${data.eliminate_piece.type.toUpperCase()}.png" alt="">`;
                    }
                } else {
                    if (PlayerRole == "white") {
                        document.getElementById("White_eliminate").innerHTML += `<img class="Eliminate_img" src="https://chessbeast.onrender.com/img/chesspieces/wikipedia/b${data.eliminate_piece.type.toUpperCase()}.png" alt="">`;
                    }
                    else {
                        document.getElementById("Black_eliminate").innerHTML += `<img class="Eliminate_img" src="https://chessbeast.onrender.com/img/chesspieces/wikipedia/b${data.eliminate_piece.type.toUpperCase()}.png" alt="">`;
                    }

                }
            }
            
            if(data.Notice=="Check Mate You Lose"){
                let Notice_Board = document.getElementById("noticeBox");
                Notice_Board.innerHTML = `checkMate ${Responses.Win} win the game `;
                Notice_Board.style.display = "flex";
                setTimeout(() => {
                    location.reload(true);
                }, 7000);
            }

            if (data.Notice == "Your opponent disconnected.") {
                Notice_Board.style.display = "Your opponent disconnected.";
                setTimeout(() => {
                    location.reload(true);
                }, 5000);
            }
        }
    } catch (error) {
        console.warn("Message is not JSON:", msg.data);
        return msg.data;
    }

    try {
        let Binary_msg = await msg.data.arrayBuffer();
        let decodeText = new TextDecoder("utf-8").decode(Binary_msg);
        return decodeText;
    } catch (error) {
        return msg.data;
    }
}


clientServer.onmessage = async (msg) => {
    let board_fen = await DecryptMsg(msg);
    try {
        board.position(board_fen);
    } catch (error) {
    }
};


clientServer.onclose = () => {
};



function onDrop(source, target, piece, newPos, oldPos, orientation) {
    let previousBoardState = board.fen();
    axios
        .post("/Check_move", {
            source,
            target,
            piece,
            orientation,
            GameID,
            PlayerRole,
        })
        .then((Response) => {
            let Responses = Response.data;


            if (!Responses.valid_Move) {
                board.position(previousBoardState);
            } else if (Responses.Check_Mate) {
                clientServer.send(board.fen());
                clientServer.send({Notice:"Check Mate You Lose "})
                board.position("start");
                let Notice_Board = document.getElementById("noticeBox");
                Notice_Board.innerHTML = `checkMate ${Responses.Win} win the game `;
                Notice_Board.style.display = "flex";
                setTimeout(() => {
                    Notice_Board.style.display = "None";
                }, 7000);
            } else if (Responses.Check) {
                clientServer.send(board.fen());
                clientServer.send(JSON.stringify({Notice:"Check"}))
             
            } else if (Responses.eliminate_piece !== undefined) {
           
                clientServer.send(JSON.stringify({ eliminate_piece: Responses.eliminate_piece, Notice: "Eliminate" }))
                if (Responses.eliminate_piece.color == "w") {
                    if (PlayerRole == "white") {
                        document.getElementById("Black_eliminate").innerHTML += `<img class="Eliminate_img" src="https://chessbeast.onrender.com/img/chesspieces/wikipedia/w${Responses.eliminate_piece.type.toUpperCase()}.png" alt="">`;
                    }
                    else {
                        document.getElementById("White_eliminate").innerHTML += `<img class="Eliminate_img" src="https://chessbeast.onrender.com/img/chesspieces/wikipedia/w${Responses.eliminate_piece.type.toUpperCase()}.png" alt="">`;
                    }
                } else {
                    if (PlayerRole == "white") {
                        document.getElementById("White_eliminate").innerHTML += `<img class="Eliminate_img" src="https://chessbeast.onrender.com/img/chesspieces/wikipedia/b${Responses.eliminate_piece.type.toUpperCase()}.png" alt="">`;
                    }
                    else {
                        document.getElementById("Black_eliminate").innerHTML += `<img class="Eliminate_img" src="https://chessbeast.onrender.com/img/chesspieces/wikipedia/b${Responses.eliminate_piece.type.toUpperCase()}.png" alt="">`;
                    }

                }
                clientServer.send(board.fen());
            } else {
                clientServer.send(board.fen());


            }


            if (Responses.Notice !== undefined) {
                let Notice_Board = document.getElementById("noticeBox");
                Notice_Board.innerHTML = Responses.Notice;
                Notice_Board.style.display = "flex";
                setTimeout(() => {
                    Notice_Board.style.display = "None";
                }, 4000);
            }
        });
}
