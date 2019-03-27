var getJSON = require('get-json');
var MongoClient = require('mongoDb').MongoClient;
var url = "mongodb://localhost:27017/";
let i = 1;
let index = 0;

MongoClient.connect(url, function (err, db) {
    var dbo = db.db('movieDB');
    dbo.dropCollection("movies", function (err, delOK) {
        if (delOK) console.log("Collection movies deleted");
        db.close();
    });
    dbo.dropCollection("genres", function (err, delOK) {
        if (delOK) console.log("Collection genres deleted");
        db.close();
    });
});

function getPage() {
    return new Promise(resolve => {
        getJSON('https://api.themoviedb.org/3/discover/movie?api_key=9e72f98ad9d5c68503cf7a2b857f2b8e&language=en-US&page=' + i, function (error, response) {
            response.results.map(result => (result.id = index++));
            MongoClient.connect(url, function (err, db) {
                if (err) throw err;
                var dbo = db.db('movieDB');
                dbo.collection('movies').insertMany(response.results, function (err, res) {
                    if (err) throw err;
                    console.log("page inserted");
                    db.close();
                    resolve(i);
                });
            });
        });
    })
}

async function asyncCall() {
    //cannot call page greater than 1000 from the api 
    if (i < 1001) {
        var result = await getPage();
        console.log(result);
        i++;
        asyncCall();
    } else {
        console.log("Initialization completed");
    }
}

asyncCall();

getJSON('https://api.themoviedb.org/3/genre/movie/list?api_key=9e72f98ad9d5c68503cf7a2b857f2b8e&language=en-US', function (error, response) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db('movieDB');
        dbo.collection('genres').insertMany(response.genres, function (err, res) {
            if (err) throw err;
            console.log("Genres inserted");
            db.close();
        });
    });
})


