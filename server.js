import express, { json } from "express";
import ejs from "ejs";
import { Chess } from "chess.js";
import pkg from "ip";
import { WebSocketServer } from "ws";

const app = express();
const port = 8000;
const { address } = pkg;


const clients = [];

app.use(express.static("public"));
app.use(express.json());

app.set("view engine", "ejs");
app.get("/", function (req, res) {
  res.render("index");
});

app.post("/Check_move", function (req, res) {
  let move_old = req.body.source;
  let move_new = req.body.target;
  let GameID = req.body.GameID;
  let chessID = clients.find((c) => c.randomNum === GameID);
  let chess = chessID.chess;
  let PlayerRole = chessID.PlayerRole;


  if (PlayerRole[0] !== chess.turn()) {
    let Notice = "Invalid Move";
    res.json({
      Check_Mate: false,
      Turn: chess.turn(),
      Check: false,
      valid_Move: false,
      Win: null,
      Notice: Notice,
    });
  } else {
    try {
      let eliminate_piece = chess.get(move_new);
      chess.move({ from: move_old, to: move_new });
      if (chess.isCheckmate()) {
        let win = chess.turn() === "w" ? "Black win " : "White Win";
        chess.reset();
        res.json({
          Check_Mate: true,
          Turn: chess.turn(),
          Check: false,
          valid_Move: true,
          Win: win,
          eliminate_piece: eliminate_piece,
        });
      } else if (chess.isCheck()) {
        res.json({
          Check_Mate: false,
          Turn: chess.turn(),
          Check: true,
          valid_Move: true,
          Win: null,
          eliminate_piece: eliminate_piece,
        });
      } else {
        res.json({
          Check_Mate: false,
          Turn: chess.turn(),
          Check: false,
          valid_Move: true,
          Win: null,
          eliminate_piece: eliminate_piece,
        });
      }
    } catch (error) {
      let Notice = "Invalid Move>>>";
      res.json({
        Check_Mate: false,
        Turn: chess.turn(),
        Check: false,
        valid_Move: false,
        Win: null,
        Notice: Notice,
      });
    }
  }
});

const server = app.listen(port, () => {
  console.log(`Server running on ${ address()}:${port}`);
});

// WebSocket server

const socketServer = new WebSocketServer({ server });

socketServer.on("connection", (client, req) => {
  const randomNum = Math.floor((Math.random() + (Date.now() % 1000)) % 101);

  client.send(JSON.stringify({ randomNum: randomNum }));

  const waitingClient = clients.find((c) => c.isWait);
  if (waitingClient !== undefined) {
    waitingClient.isWait = false;
    waitingClient.Opponent = client;
    clients.push({
      Player: client,
      PlayerRole: "black",
      Opponent: waitingClient.Player,
      chess: waitingClient.chess,
      isWait: false,
      randomNum: randomNum,
    });
    client.send(JSON.stringify({ PlayerRole: "black" }));
    waitingClient.Player.send(JSON.stringify({ Notice: "Player Found" }));
  } else {
    const chess = new Chess();
    let Notice = "Finding Player Please Wait........";
    clients.push({
      Player: client,
      PlayerRole: "white",
      Opponent: null,
      chess: chess,
      isWait: true,
      randomNum: randomNum,
    });
    client.send(JSON.stringify({ PlayerRole: "white", Notice: Notice }));
  }

  client.on("message", (msg) => {
    
    let Player = clients.find((c) => c.Player === client);
  
    if (Player.Opponent) {
      try {
        Player.Opponent.send(JSON.parse(msg));
      } catch (error) {
        Player.Opponent.send(msg.toString());
      }
    

    }
  });

  client.on("close", () => {
    const index = clients.findIndex((c) => c.Player === client);
    const playerData = clients[index];
    try {
      playerData.Opponent.send(
        JSON.stringify({ Notice: "Your opponent disconnected." }),
      );
    } catch (error) { }
    clients.splice(index, 1);
    client.removeAllListeners();
  });
 
});
