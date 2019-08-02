var express = require('express');
var router = express.Router();
var conn = require('../connect');
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var config = require('../config');
var async = require("async");
const uuidv1 = require('uuid/v1');
const bcrypt = require('bcrypt');
const saltRounds = 10;

/* GET home page. */
router.post('/mssql', async function(req, res, next) {
  let token = req.body.token;
  let account = req.body.account;
  let password = req.body.password;
  let tokencontinue = 1;
  let accountcontinue = 1;
  //console.log(`get a token use req for ${token}`)
 
  var connection = new Connection(config);
  checktoken = new Request(`select * from authtoken where token='${token}' `,function(err, rowCount){
      //console.log("token start")
      //console.log(`match ${rowCount} data from sql`);
      if (err) {
        tokencontinue=0;
        console.log(err);
        res.status(400).json({status:"bad request",data:{msg:err}});
      }
      else if(!rowCount){
        tokencontinue=0;
        //console.log("error checktoken")
        res.status(400).json({status:"bad request",data:{msg:'you can not use this token to build account'}});
     }
  })

  checktoken.on('requestCompleted',function(){
    //console.log("complete token")
    if(!tokencontinue){
       return;
    }
    checkaccount = new Request(`select * from user_info where account='${account}'`,function(err,rowCount){
      //console.log("checkaccount start");
      if(err){
        accountcontinue = 0;
        console.log(err);
        res.status(400).json({status:"bad request",data:{msg:err}});
      }
      else if(rowCount){
        accountcontinue = 0;
        //console.log("error checkacount")
        res.status(400).json({status:"bad request",data:{msg:'duplicate account !'}});
      }
    })
    checkaccount.on('requestCompleted',async function(){
      if(!accountcontinue){
         return ;
      }
      //console.log("check account complete");
      crypt_word = bcrypt.hashSync(password, saltRounds);
      //res.status(200).json({status:"OK",data:{msg:'you can use this account to create account!'}});
        createaccount = new Request(`insert into user_info (uuid,account,password,token) values 
        ('${uuidv1()}','${account}','${crypt_word}','${token}')`,function(err,rowCount){
            //console.log("create account start");
            if(err){
                console.log(err);
                res.status(400).json({status:"bad request",data:{msg:err}});
            }
        })
        createaccount.on('requestCompleted',function(){
            //console.log("create account finish");
            res.status(200).json({status:"OK",data:{msg:"create user successfully"}});
        })
        connection.execSql(createaccount);
    })
    connection.execSql(checkaccount);
  })

  connection.on('connect', function(err) {
      if(err){
          console.log(err)
          res.status(400).json({status:"bad request",data:{msg:err}});
      }else{
          connection.execSql(checktoken);
      }
  });
});

router.get('/',async function(req,res,next){
    var connection = new Connection(config);
    var data_arr = []
    getUser = new Request(`select * from user_info`,function(err){
      if(err){
        //console.log(err);
        res.status(400).json({status:"bad request",data:{msg:err}});
      }
    })

    getUser.on('row', function(columns) {
      let tjson = {};
      columns.forEach(function(column) {
        tjson[column['metadata']['colName']] = column['value'];
      });
      data_arr.push(tjson);
    });
    getUser.on('doneInProc', function (rowCount, more, rows) {  
      ////console.log('doneInProc: '+ rowCount + ' row(s) returned');
      res.send(data_arr);
    });   

    connection.on('connect',function(err){
      if(err){
       //console.log(err);
      }
      else{
       connection.execSql(getUser);
      }
   })
})

module.exports = router;
