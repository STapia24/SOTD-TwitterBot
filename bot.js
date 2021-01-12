// File management and integrity npm packages
const md5 = require('md5');
const lineReader = require('line-reader');
var fs = require('fs');

// Twitter API npm package variables
var Twit = require('twit');
var twconfig = require('./twCredentials');
var T = new Twit(twconfig);

// Spotify API npm package
const token = fs.readFileSync('token.txt');
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
  var offstr = fs.readFileSync("songNumber.txt", {encoding:'utf8'});    //Gets the offset as a string in the format: #->
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
    songNum = fs.readFileSync("songNumber.txt", {encoding: "utf8"});
    fs.readFile("Song of The Day 2021.txt", function (err, data) {
      if (err) throw err;
      //If the document does not contains the number in the format #-> then it adds the song to the document
      //In the case it does contain the number in that format it simply jumps to the next song and repeats the previous step 
      if(!data.includes(songNum)){
        fs.writeFileSync(playlistName +'.txt', i + song + "\n", {
          encoding: "utf8", 
          flag: "a+",
        });
        console.log(i + song);
        i++;
      } else {
        console.log(i + song);
        i++;
    }
    });
      return tracks;
  }
} 

getMyData();
setInterval(getMyData, 1000*60)


//The file where the playlist will be updated
const playlistFile = 'Song of The Day 2021.txt';
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

const songFile = 'tweetingSong.txt';
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
    const userName = fs.readFileSync("userName.txt", {encoding: "utf8"});
    const tweetID = fs.readFileSync("tweetID.txt", {encoding: "utf8"});
    var songComplete = fs.readFileSync('tweetingSong.txt', {encoding:'utf8'})
    var songArray = songComplete.split("| ");
    var songID = songArray[0];
    var songNum = songID.split("->") 
    songNum = songNum[0];
    var songInfo = songArray[1];
    T.post('statuses/update', 
    { in_reply_to_status_id: tweetID , 
        status: "@" +  userName + " " + "Canción " + `${songNum}/365:\n` + songInfo 
    }, (err, data, response) => {
//        console.log(data);
        fs.writeFileSync("tweetID.txt", data.id_str, {encoding: "utf8"});
        fs.writeFileSync("userName.txt", data.user.screen_name, {encoding: "utf8"});
        iSongNum = parseInt(songID);
        iSongNum++;
        var searchKey = iSongNum + '->'; 
        fs.writeFileSync("songNumber.txt", searchKey, {encoding: "utf8"});
      })   
}

function fetchSong(){
  var songNumber = fs.readFileSync("songNumber.txt", {encoding: "utf8"});
  lineReader.eachLine('Song of The Day 2021.txt', function(line) {
          if(line.includes(`${songNumber}`)){
              fs.writeFileSync('tweetingSong.txt', line);
              console.log("Song in queue: " + line);
              return false;
          }
      });
  }