var express = require('express');
var router = express.Router();
var conn = require('../connect');
var moment = require('moment');
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var config = require('../config');
const uuidv1 = require('uuid/v1');


router.get('/mssql', function(req, res, next) {
    var connection = new Connection(config);
    let sql_str = `select * from authtoken`;
    var data_arr = [];
    request = new Request(sql_str,function(err, rowCount){
        if (err) {
          console.log(err);
          res.status(400).json({status:"bad request",data:{err_msg:err}})
        } 
    })
    request.on('row', function(columns) {
        let tjson = {};
        columns.forEach(function(column) {
          tjson[column['metadata']['colName']] = column['value'];
        });
        data_arr.push(tjson);
    });
    request.on('doneInProc', function (rowCount, more, rows) {  
      //console.log('doneInProc: '+ rowCount + ' row(s) returned');
      res.status(200).json({status:'OK',data:{valid_token:data_arr}});
    }); 
    connection.on('connect', function(err) {
        if(err){
            console.log(err)
        }else{
            //console.log('connected to mssql .')
            connection.execSql(request);
        }
    });
  });
/* Get data from mssql*/
router.post('/mssql', function(req, res, next) {
  let auth = req.body.id;
  let uuid = uuidv1();
  var connection = new Connection(config);
  let sql_str = `insert into authtoken (auth,token,us_use) values ('${auth}','${uuid}','0')`;

  request = new Request(sql_str,function(err, rowCount){
      if (err) {
        console.log(err);
        res.status(400).json({status:"bad request",data:{err_msg:err}})
      } 
  })
  request.on('doneInProc', function (rowCount, more, rows) {  
    //console.log('doneInProc: '+ rowCount + ' row(s) returned');
    res.status(200).json({status:'OK',data:{valid_token:uuid,auth:auth}});
  });   
  connection.on('connect', function(err) {
      if(err){
          console.log(err)
      }else{
          //console.log('connected to mssql .')
          connection.execSql(request);
      }
  });
});

module.exports = router;
