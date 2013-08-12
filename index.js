var request = require('request');
var endpoint = 'https://translate.yandex.net/api/v1.5/tr.json';
var defaultOpts = {key: 'invalid'};

var objExtend = function (target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
};

var jsonRequest = function (url, params, cb) {
    var handler = function (err, res) {
        if (err)
            return cb(err);
        var obj;
        try {
            obj = JSON.parse(res.body);
        } catch (e) {
            cb(e);
        }
        cb(null, obj);
    };
    if (params.get === true) {
        // params for GET method (avoided qs because of wrong behavior of qs.stringify for yandex)
        var getParams = '';
        if (params.form) {
            getParams += '?';
            Object.keys(params.form).forEach(function (key) {
                if (params.form[key].forEach) {
                    params.form[key].forEach(function (val) {
                        getParams += key + '=' + encodeURIComponent(val).replace(/&/g, '%26') + '&';
                    });
                } else {
                    getParams += key + '=' + encodeURIComponent(params.form[key]).replace(/&/g, '%26') + '&';
                }

            });
        }
        request.get(url + getParams, handler);
    } else {
        var r = request.post(url, {}, handler);
        // use &text=TEXT1&text=TEXT2 indead of qs.strinifiys &text[0]=TEXT1&text[1]=TEXT2
        var _form = r.form();
        Object.keys(params.form).forEach(function (key) {
            var val = params.form[key];
            if (val.forEach) {
                val.forEach(function (arrVal) {
                    _form.append(key, arrVal);
                });
            } else {
                _form.append(key, val);
            }
        });
    }
};

var translate = function (text, opts, cb) {
    var topts = typeof opts;
    if (topts == 'function' || topts == 'undefined') {
        if (topts == 'function')
            cb = opts;
        opts = {
            to: 'en',
            format: 'text'
        };
    }
    opts = objExtend(defaultOpts, opts);
    if (!opts.to)
        opts.to = 'en';
    if (!opts.format)
        opts.format = 'text';
    jsonRequest(endpoint + '/translate', {
        form: {
            text: text,
            format: opts.format,
            key: opts.key,
            lang: opts.from ? opts.from + '-' + opts.to : opts.to
        }
    }, cb);
};

var getLanguages = function (cb) {
    jsonRequest(endpoint + '/getLangs', { get: true }, cb);
};

var detect = function (text, opts, cb) {
    var topts = typeof opts;
    if (topts == 'function' || topts == 'undefined') {
        if (topts == 'function')
            cb = opts;
        opts = {
            format: 'text'
        };
    }
    opts = objExtend(defaultOpts, opts);
    if (!opts.format)
        opts.format = 'text';
    jsonRequest(endpoint + '/detect', {
        form: {
            key: opts.key,
            text: text,
            format: opts.format
        }
    }, cb);
};

var defaults = function (opts) {
    defaultOpts = opts;
};


module.exports = translate;
module.exports.translate = translate; // make translate 'default' exported function
module.exports.detect = detect;
module.exports.getLangs = getLanguages;
module.exports.defaults = defaults;

// simple inline test
if (require.main === module) {
    translate(['Zwölf Boxkämpfer jagen Eva quer über den großen Sylter Deich', 'Mein Name ist &asdf'], function (err, res) {
        console.assert(err === null, "Got transport level errors");
        console.assert(res.code === 200, "Non 200 HTTP code");
        console.assert(res.lang === "de-en", "Language autodetected incorrectly");
        console.log(res.text.join());
    });
}
