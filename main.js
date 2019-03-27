var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var express = require('express');
var app = express();

let index = 1;

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

var sort_by = function (field, reverse, primer) {

    var key = primer ?
        function (x) { return primer(x[field]) } :
        function (x) { return x[field] };
    reverse = !reverse ? 1 : -1;

    return function (a, b) {
        a = key(a);
        b = key(b);
        return reverse * ((a > b) ? 1 : -1);
    }
}

app.get('/', function (req, res) {

    let category = req.query.category;
    let page_nr = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    let lower_limit = (page_nr - 1) * limit;
    let upper_limit = lower_limit + limit + 1;
    let categoryNr = [];

    if (category) {

        let catergoryArray = category.split(",");
        console.log(catergoryArray);
        MongoClient.connect(url, function (err, client) {
            if (err) throw err;
            const db = client.db('movieDB');
            let arrayPromise = [];
            catergoryArray.forEach(function (element) {
                arrayPromise.push(
                    new Promise((resolve, reject) => {
                        db.collection("genres").find({ name: element.toString() }).toArray(function (err, result) {
                            if (err) throw err;
                            categoryNr.push(result[0].id);
                            resolve(result[0].id);
                        });
                    })
                );
            })

            Promise.all(arrayPromise).then(function (values) {

                console.log(values);
                MongoClient.connect(url, function (err, db) {
                    var dbo = db.db("movieDB");
                    dbo.collection("movies").find({ genre_ids: { $all: values } }).toArray(function (er, result) {
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

            var dbo = db.db("movieDB");
            dbo.collection("movies").find({ id: { $gt: lower_limit, $lt: upper_limit } }).toArray(function (er, result) {
                if (err) throw err;
                result.sort(sort_by('id', false, parseInt));
                res.json(result);
                db.close();
            });
        });
    }
})

app.listen(3000);
