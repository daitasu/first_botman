var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var crypto = require("crypto");
const async = require('async');
//const bot = require('../lib/lineBot');
const router = express.Router();


router.post('/', function(req, res) {
    async.waterfall([
            function(callback) {
                // リクエストがLINE Platformから送られてきたか確認する
                if (!validate_signature(req.headers['x-line-signature'], req.body)) {
                    return;
                }
                // テキストが送られてきた場合のみ返事をする
                if ((req.body['events'][0]['type'] !== 'message') || (req.body['events'][0]['message']['type'] !== 'text')) {
                    return;
                }
                // 「ヘルプ」という単語がテキストに含まれている場合のみ返事をする

                // 「ほめて」という単語がテキストに含まれている場合のみ返事をする
                if (req.body['events'][0]['message']['text'].indexOf('ほめて') === -1) {
                    if (req.body['events'][0]['message']['text'].indexOf('ヘルプ') !== -1 ) {
                        console.log('Heyhey');
                        callback('ヘルプ');
                    }
                    return;
                }

                // 1対1のチャットの場合は相手のユーザ名で返事をする
                // グループチャットの場合はユーザ名が分からないので、「お主ら」で返事をする
                if (req.body['events'][0]['source']['type'] === 'user') {
                    // ユーザIDでLINEのプロファイルを検索して、ユーザ名を取得する
                    var user_id = req.body['events'][0]['source']['userId'];
                    var get_profile_options = {
                        url: 'https://api.line.me/v2/bot/profile/' + user_id,
                        proxy: process.env.FIXIE_URL,
                        json: true,
                        headers: {
                            'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}'
                        }
                    };
                    request.get(get_profile_options, function(error, response, body) {
                        if (!error && response.statusCode === 200) {
                            callback(body['displayName']);
                        }
                    });
                } else if ('room' === req.body['events'][0]['source']['type']) {
                    callback('諸君');
                } else if ('group' === req.body['events'][0]['source']['type']) {
                    callback('お主ら');
                }

            },
        ],
        function(displayName) {
            console.log('check');
            display = displayName + '!\nよっっ！日本の宝!!';
            if(displayName === 'ヘルプ'){
                display = 'お呼びですか?\n「ほめて」と言われたら褒めます。\n'+
                    '今はただの褒め上手ですが、そのうち色々覚えていきますよ！';
            }

            //ヘッダーを定義
            var headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
            };

            // 送信データ作成
            var data = {
                'replyToken': req.body['events'][0]['replyToken'],
                "messages": [{
                    "type": "text",
                    "text": display
                }]
            };

            //オプションを定義
            var options = {
                url: 'https://api.line.me/v2/bot/message/reply',
                proxy: process.env.FIXIE_URL,
                headers: headers,
                json: true,
                body: data
            };

            request.post(options, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log(body);
                } else {
                    console.log('error: ' + JSON.stringify(response));
                }
            });
        }
    );
});

// 署名検証
function validate_signature(signature, body) {
    return signature === crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(new Buffer(JSON.stringify(body), 'utf8')).digest('base64');
}

module.exports = router;