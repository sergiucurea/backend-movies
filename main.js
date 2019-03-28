let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017/";
let express = require('express');
let app = express();

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

let sort_by = function (field, reverse, primer) {
    let key = primer ?
        function (x) { return primer(x[field]) } :
        function (x) { return x[field] };
    reverse = !reverse ? 1 : -1;
    return function (a, b) {
        a = key(a);
        b = key(b);
        return reverse * ((a > b) ? 1 : -1);
    }
}

app.get('/search', function (req, res) {
    let searchArray = req.query.query;
    let page_nr = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    let lower_limit = (page_nr - 1) * limit;
    let upper_limit = lower_limit + limit;
    MongoClient.connect(url, function (err, db) {
        let dbo = db.db("movieDB");
        dbo.collection("movies")
            .createIndex({
                title: "text"
            });
        dbo.collection("movies")
            .find({
                $text: {
                    $search: searchArray
                }
            })
            .project({
                score: {
                    $meta: "textScore"
                }
            })
            .sort({
                score: {
                    $meta: "textScore"
                }
            })
            .toArray(function (er, result) {
                if (err) throw err;
                res.json(result.slice(lower_limit, upper_limit));
                db.close();
            });
    });
})

app.get('/movie/:id', function (req, res) {
    let idParameter = parseInt(req.params.id);
    MongoClient.connect(url, function (err, db) {
        let dbo = db.db("movieDB");
        dbo.collection("movies")
            .createIndex({ 
                title: "text" 
            });
        dbo.collection("movies")
            .find({ 
                id: idParameter 
            })
            .toArray(function (er, result) {
            if (err) throw err;
            res.json(result);
            db.close();
            });
    });
})

app.get('/', function (req, res) {
    let category = req.query.category;
    let page_nr = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    let lower_limit = (page_nr - 1) * limit;
    let upper_limit = lower_limit + limit + 1;
    let categoryNr = [];
    if (category) {
        let catergoryArray = category.split(",");
        MongoClient.connect(url, function (err, client) {
            if (err) throw err;
            let db = client.db('movieDB');
            let arrayPromise = [];
            catergoryArray.forEach(function (element) {
                arrayPromise.push(
                    new Promise((resolve, reject) => {
                        db.collection("genres")
                            .find({
                                name: element.toString() 
                                })
                            .toArray(function (err, result) {
                                if (err) throw err;
                                categoryNr.push(result[0].id);
                                resolve(result[0].id);
                            });
                        })
                );
            })
            Promise.all(arrayPromise).then(function (values) {
                MongoClient.connect(url, function (err, db) {
                    let dbo = db.db("movieDB");
                    dbo.collection("movies")
                        .find({ 
                            genre_ids: {
                                 $all: values 
                                } 
                        })
                        .toArray(function (er, result) {
                            if (err) throw err;
                            result.sort(sort_by('id', false, parseInt));
                            res.json(result.slice(lower_limit, upper_limit));
                            db.close();
                        });
                });
            })
        })
    } else {
        MongoClient.connect(url, function (err, db) {
            let dbo = db.db("movieDB");
            dbo.collection("movies")
                .find({ 
                    id: { 
                        $gt: lower_limit, 
                        $lt: upper_limit 
                    } 
                })
                .toArray(function (er, result) {
                    if (err) throw err;
                    result.sort(sort_by('id', false, parseInt));
                    res.json(result);
                    db.close();
                });
        });
    }
})

app.listen(4000);
