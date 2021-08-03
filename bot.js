// File management and integrity npm packages variables
const md5 = require('md5');
const lineReader = require('line-reader');
var fs = require('fs');
require('dotenv/config')

// Twitter API npm package variables
var Twit = require('twit');
var twconfig = {
  consumer_key: process.env.TWT_CONSUMER_KEY,
  consumer_secret: process.env.TWT_CONSUMER_SECRET,
  access_token: process.env.TWT_ACCESS_TOKEN,
  access_token_secret: process.env.TWT_ACCESS_TOKEN_SECRET  
  }
var T = new Twit(twconfig);

// Spotify API npm package variables
const token = fs.readFileSync("./Updating Files/token.txt");
var SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();
spotifyApi.setAccessToken(token);

var off;

//Function to get my profile data
function getMyData() {
  (async () => {
    const me = await spotifyApi.getMe();

    getUserPlaylists(me.body.id);
  })().catch(e => {
    console.error(e);
  });
}

//Gets the user's playlists
async function getUserPlaylists(userName) {
  const data = await spotifyApi.getUserPlaylists(userName)
  var offstr = fs.readFileSync("./Updating Files/songNumber.txt", {encoding:'utf8'});    //Gets the offset as a string in the format: #->
  off = offstr.split("->");                                             //Splits the offset string so that only the number remains
  off = parseInt(off[0]);                                               //Converts the stringified number to an int

  for (let playlist of data.body.items) {
    //Used only the ID of the playlist I want
    if(playlist.id == "7hlATgxBGfmTCYWBQ2HKkJ"){     
     getPlaylistTracks(playlist.id, playlist.name);
    }
  }
}

 //Gets the songs in a playlist
async function getPlaylistTracks(playlistId, playlistName) {

  const data = await spotifyApi.getPlaylistTracks(playlistId, {
    offset: off - 1,
    limit: 100,
  })

  let tracks = [];
  let i = off;
  for (let track_obj of data.body.items) {
    const track = track_obj.track
    tracks.push(track);
    var song = "-> | " + track.name + " - " + track.artists[0].name;
    songNum = fs.readFileSync("./Updating Files/songNumber.txt", {encoding: "utf8"});
    fs.readFile("./Updating Files/Song of The Day 2021.txt", function (err, data) {
      if (err) throw err;
      //If the document does not contains the number in the format #-> then it adds the song to the document
      //In the case it does contain the number in that format it simply jumps to the next song and repeats the previous step 
      if(!data.includes(songNum)){
        fs.writeFileSync("./Updating Files/" + playlistName +'.txt', i + song + "\n", {
          encoding: "utf8", 
          flag: "a+",
        });
        i++;
      } else {
        i++;
    }
    });
      return tracks;
  }
} 

getMyData();
setInterval(getMyData, 1000*60)


//The file where the playlist will be updated
const playlistFile = "./Updating Files/Song of The Day 2021.txt";
console.log(`Watching for file changes on ${playlistFile}`);

//Implementing fs.watch to trigger the fetchSong function
let md5Previous = null;
let fsWait = false;
fs.watch(playlistFile, (event, filename) => {
  if (filename) {
    if (fsWait) return;
    fsWait = setTimeout(() => {
      fsWait = false;
    }, 100);
    const md5Current = md5(fs.readFileSync(playlistFile));
    if (md5Current === md5Previous) {
      return;
    }
    md5Previous = md5Current;
    console.log(`${filename} file Changed`);
    fetchSong();
  }
});

const songFile = "./Updating Files/tweetingSong.txt";
console.log(`Watching for file changes on ${songFile}`);

//Implementing fs.watch to trigger the tweetSong function
let songMD5Prev = null;
let songWait = false;
fs.watch(songFile, (event, filename) => {
  if (filename) {
    if (songWait) return;
    songWait = setTimeout(() => {
      songWait = false;
    }, 100);
    const md5Current = md5(fs.readFileSync(playlistFile));
    if (md5Current === songMD5Prev) {
      return;
    }
    songMD5Prev = md5Current;
    console.log(`${filename} file Changed`);
    tweetSong();
  }
});

// This function takes from the documents the username and the tweetID to which it will reply and
// replies to it
function tweetSong(){
    const userName = fs.readFileSync("./Updating Files/userName.txt", {encoding: "utf8"});
    const tweetID = fs.readFileSync("./Updating Files/tweetID.txt", {encoding: "utf8"});
    var songComplete = fs.readFileSync("./Updating Files/tweetingSong.txt", {encoding:'utf8'}) //Reads the complete info of the song in the format: #-> | song - artist
    var songArray = songComplete.split("| ");                                 //Divides the string into an array with two elements: #-> and song - artist
    var songID = songArray[0];                                                //Assigns the first part of the array of strings as the songID
    var songNum = songID.split("->")                                          //Divides the songID so only the number remains
    songNum = songNum[0];                                                     //Assigns the first part of the array to songNum
    var songInfo = songArray[1];                                              //Stores the second part of the songArray as the info of the song
    T.post('statuses/update', 
    { in_reply_to_status_id: tweetID , 
        status: "@" +  userName + " " + "Canción " + `${songNum}/365:\n` + songInfo 
    }, (err, data, response) => {
        fs.writeFileSync("./Updating Files/tweetID.txt", data.id_str, {encoding: "utf8"});
        fs.writeFileSync("./Updating Files/userName.txt", data.user.screen_name, {encoding: "utf8"});
        iSongNum = parseInt(songID);                                          //Converts the songID string into an int
        iSongNum++;                                                           //Increments the song number by 1
        var searchKey = iSongNum + '->';                                      //Merges back the number and the -> elements to create the search key
        fs.writeFileSync("./Updating Files/songNumber.txt", searchKey, {encoding: "utf8"});    //Stores in the file the search key that will be used to pull the next song
      })   
}

function fetchSong(){
  var songNumber = fs.readFileSync("./Updating Files/songNumber.txt", {encoding: "utf8"});
  lineReader.eachLine("./Updating Files/Song of The Day 2021.txt", function(line) {
          if(line.includes(`${songNumber}`)){
              fs.writeFileSync("./Updating Files/tweetingSong.txt", line);
              console.log("Song in queue: " + line);
              return false;
          }
      });
  }